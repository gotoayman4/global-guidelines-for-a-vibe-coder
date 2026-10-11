#!/usr/bin/env node

/**
 * check-sync-drift.js — Is every project actually running the current rules?
 *
 * INTENT: A mirror under `_guidelines/` is a COPY, and a copy that nothing compares drifts
 * silently. Measured on 2026-10-11: all 105 guideline files differed from the mirror in a
 * dependent project, the mirror was 19 days old, and `sync-projects.json` asserted a
 * `lastSynced` date the filesystem contradicted — while the project's own template said
 * "skip if the mirror exists". A date is a claim; a content hash is a control
 * (documentation-strategy.md §One Home Per Fact, applied to delivery).
 *
 * CONSTRAINT: the comparison is the MIRROR against the SOURCE, not the mirror against a
 * remembered number. A recorded hash that has drifted from both is reported as a stale
 * record, never as "in sync". EOL is normalised before hashing so a CRLF checkout is not
 * mistaken for a content difference.
 *
 * DECISION: this runs from the central repo, where the source of truth lives — a project
 * cannot verify itself against a source it does not have. `--record` is what the sync writes;
 * nothing else may write a hash, or the record stops meaning "this content was delivered".
 *
 * Usage:
 *   node check-sync-drift.js                 # report every project in sync-projects.json
 *   node check-sync-drift.js --record <path> # record the current source hash for one project
 *   node check-sync-drift.js --quiet         # exit code only
 *
 * Exit codes: 0 = every mirror matches the source; 1 = at least one drift or missing mirror;
 *             2 = corpus error (no source tree, unreadable registry).
 *
 * Source: global-configs/scripts/check-sync-drift.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SOURCE = path.join(REPO_ROOT, 'guidelines');
const REGISTRY = path.join(REPO_ROOT, 'sync-projects.json');
const MIRROR_NAME = '_guidelines';

/** sha256 over every file's normalised path + LF-normalised content, in sorted order. */
function hashTree(root) {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(root);
  const h = crypto.createHash('sha256');
  for (const f of files) {
    h.update(path.relative(root, f).replace(/\\/g, '/'));
    h.update('\0');
    h.update(fs.readFileSync(f).toString('utf8').replace(/\r\n/g, '\n'));
    h.update('\0');
  }
  return { hash: h.digest('hex'), count: files.length };
}

function readRegistry() {
  if (!fs.existsSync(REGISTRY)) {
    console.error(`❌ check-sync-drift cannot read ${REGISTRY}`);
    process.exit(2);
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error('not an array');
    return parsed;
  } catch (err) {
    console.error(`❌ sync-projects.json is not a project array: ${err.message}`);
    process.exit(2);
  }
}

function writeRegistry(projects) {
  fs.writeFileSync(REGISTRY, `${JSON.stringify(projects, null, 4)}\n`, 'utf8');
}

/**
 * Compare each project's mirror against the source. Pure over its inputs, so the test can
 * drive it with fixtures instead of the live fleet.
 * @returns {Array<{name: string, state: 'sync'|'drift'|'no-mirror', mirrorHash?: string, mirrorFiles?: number, recorded: string, lastSynced?: string}>}
 */
function compareProjects(sourceDir, source, projects) {
  return projects.map((project) => {
    const name = project.name || project.path;
    const mirror = path.join(project.path, MIRROR_NAME);
    const recorded = project.contentHash ? project.contentHash.slice(0, 12) : 'never recorded';
    if (!fs.existsSync(mirror)) {
      return { name, state: 'no-mirror', recorded, lastSynced: project.lastSynced };
    }
    const theirs = hashTree(mirror);
    return {
      name,
      state: theirs.hash === source.hash ? 'sync' : 'drift',
      mirrorHash: theirs.hash,
      mirrorFiles: theirs.count,
      recorded,
      lastSynced: project.lastSynced,
    };
  });
}

function main() {
  const argv = process.argv.slice(2);
  const quiet = argv.includes('--quiet');
  const recordIdx = argv.indexOf('--record');
  const recordPath = recordIdx === -1 ? null : argv[recordIdx + 1];
  if (recordIdx !== -1 && !recordPath) {
    console.error('❌ --record requires a project path');
    process.exit(2);
  }

  if (!fs.existsSync(SOURCE)) {
    console.error(`❌ source tree missing: ${SOURCE}`);
    process.exit(2);
  }
  const source = hashTree(SOURCE);
  const projects = readRegistry();

  if (recordPath) {
    const resolved = path.resolve(recordPath);
    const entry = projects.find((p) => path.resolve(p.path) === resolved);
    if (!entry) {
      console.error(`❌ --record: ${resolved} is not in sync-projects.json`);
      process.exit(2);
    }
    entry.contentHash = source.hash;
    entry.hashFiles = source.count;
    writeRegistry(projects);
    console.log(`✅ recorded source hash ${source.hash.slice(0, 12)} (${source.count} files) for ${entry.name}`);
    process.exit(0);
  }

  if (!quiet) {
    console.log('═══════════════════════════════════════════');
    console.log('  Sync Drift — mirror vs source of truth');
    console.log(`  source: ${source.hash.slice(0, 12)} · ${source.count} files`);
    console.log('═══════════════════════════════════════════\n');
  }

  let drifted = 0;
  for (const row of compareProjects(SOURCE, source, projects)) {
    if (row.state === 'no-mirror') {
      drifted += 1;
      if (!quiet) console.log(`  ❌ ${row.name}: no ${MIRROR_NAME}/ mirror — the project has no rules at all`);
      continue;
    }
    if (row.state === 'sync') {
      if (!quiet) console.log(`  ✅ ${row.name}: in sync (${row.mirrorFiles} files)`);
      continue;
    }
    drifted += 1;
    if (!quiet) {
      console.log(`  ❌ ${row.name}: DRIFT — mirror ${row.mirrorHash.slice(0, 12)} (${row.mirrorFiles} files) ≠ source ${source.hash.slice(0, 12)} (${source.count} files)`);
      console.log(`       recorded: ${row.recorded}${row.lastSynced ? ` · lastSynced: ${row.lastSynced}` : ''}`);
      console.log('       → run `npm run sync:all` (or the GUI) and re-commit the project');
    }
  }

  if (drifted > 0) {
    if (!quiet) console.log(`\n❌ ${drifted} of ${projects.length} project(s) are not running the current rules.\n`);
    process.exit(1);
  }
  if (!quiet) console.log(`\n✅ all ${projects.length} project(s) run the current rules.\n`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { hashTree, compareProjects, MIRROR_NAME };
