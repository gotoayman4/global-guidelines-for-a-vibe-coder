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
 * TWO SUBJECTS, ONE QUESTION. The mirror answers "does the project HAVE the current rules?"; the
 * controls pass answers "does it RUN them?" A mirror in sync whose guard files are never invoked
 * is the failure the first check cannot see: the file arrives, the tier is declared, and nothing
 * reads either. The required set is declared in `sync-manifest.json` §guards rather than derived
 * from the guards' own `@tier`, because a tier says WHEN a guard runs, not WHERE it is meaningful.
 * It is matched by FILE and not by script name — the doctrine maps each step to the project's own
 * names, so requiring a name would impose a convention this check has no business imposing.
 *
 * Usage:
 *   node check-sync-drift.js                 # report every project in sync-projects.json
 *   node check-sync-drift.js --record <path> # record the current source hash for one project
 *   node check-sync-drift.js --quiet         # exit code only
 *
 * Exit codes: 0 = every mirror matches the source; 1 = at least one drift or missing mirror;
 *             2 = corpus error (no source tree, unreadable registry).
 *
 * @tier standard+ — a parity guard between a project's mirror and this source of truth; it runs
 *   from the central repo, which a `vibe` slice in a project cannot do.
 *
 * Source: global-configs/scripts/check-sync-drift.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
// Overridable so the CLI's exit-code contract can be exercised against a fixture instead of
// the live fleet. The first version of that test asserted the live fleet's state, so it passed
// only while the fleet was broken and failed the moment `sync:all` fixed it (2026-10-11).
const SOURCE = process.env.SYNC_DRIFT_SOURCE || path.join(REPO_ROOT, 'guidelines');
const REGISTRY = process.env.SYNC_DRIFT_REGISTRY || path.join(REPO_ROOT, 'sync-projects.json');
const MIRROR_NAME = '_guidelines';
// Overridable for the same reason as SOURCE: a test must drive the controls check with a fixture,
// never with the live manifest.
const MANIFEST = process.env.SYNC_DRIFT_MANIFEST || path.join(REPO_ROOT, 'guidelines', 'global-configs', 'sync-manifest.json');

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
      return { name, path: project.path, state: 'no-mirror', recorded, lastSynced: project.lastSynced };
    }
    const theirs = hashTree(mirror);
    return {
      name,
      path: project.path,
      state: theirs.hash === source.hash ? 'sync' : 'drift',
      mirrorHash: theirs.hash,
      mirrorFiles: theirs.count,
      recorded,
      lastSynced: project.lastSynced,
    };
  });
}

/**
 * The guard files a project must expose, read from the manifest that declares them. Null when the
 * manifest is absent or declares none — a repo that has not adopted the tier control is not drift,
 * it is a repo that has not adopted the tier control.
 */
function requiredGuards(manifestPath = MANIFEST) {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const required = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))?.guards?.required;
    return Array.isArray(required) && required.length > 0 ? required : null;
  } catch {
    return null;
  }
}

/**
 * Does this project expose a script for every required guard?
 *
 * BY FILE, NOT BY SCRIPT NAME. The doctrine has each project map a step to its own script names,
 * so requiring a name would impose a convention this guard has no business imposing; requiring the
 * FILE is the contract. A project with no `package.json` is not a Node project and cannot expose
 * npm scripts at all — reported, never failed, because the alternative is failing correct work.
 *
 * @returns {{state: 'wired'|'unwired'|'unreadable'|'not-a-node-project', missing: string[]}}
 */
function controlsOf(projectPath, required) {
  const pkg = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkg)) return { state: 'not-a-node-project', missing: [] };
  let scripts;
  try {
    scripts = JSON.parse(fs.readFileSync(pkg, 'utf8')).scripts || {};
  } catch {
    return { state: 'unreadable', missing: required.slice() };
  }
  const commands = Object.values(scripts).join('\n');
  const missing = required.filter((file) => !commands.includes(file));
  return { state: missing.length === 0 ? 'wired' : 'unwired', missing };
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

  const required = requiredGuards();

  if (!quiet) {
    console.log('═══════════════════════════════════════════');
    console.log('  Sync Drift — mirror vs source of truth');
    console.log(`  source: ${source.hash.slice(0, 12)} · ${source.count} files`);
    console.log(`  controls: ${required ? `${required.length} guard file(s) every project must wire` : 'not declared'}`);
    console.log('═══════════════════════════════════════════\n');
  }

  // A Set, not a counter: a project can fail both the mirror check and the controls check, and it
  // is still ONE project not running the current rules.
  const drifted = new Set();
  for (const row of compareProjects(SOURCE, source, projects)) {
    if (row.state === 'no-mirror') {
      drifted.add(row.name);
      if (!quiet) console.log(`  ❌ ${row.name}: no ${MIRROR_NAME}/ mirror — the project has no rules at all`);
      continue;
    }
    if (row.state === 'sync') {
      if (!quiet) console.log(`  ✅ ${row.name}: in sync (${row.mirrorFiles} files)`);
    } else {
      drifted.add(row.name);
      if (!quiet) {
        console.log(`  ❌ ${row.name}: DRIFT — mirror ${row.mirrorHash.slice(0, 12)} (${row.mirrorFiles} files) ≠ source ${source.hash.slice(0, 12)} (${source.count} files)`);
        console.log(`       recorded: ${row.recorded}${row.lastSynced ? ` · lastSynced: ${row.lastSynced}` : ''}`);
        // The mirror is local: sync-guidelines.ps1 writes `_guidelines/` AND adds it to the
        // project's .gitignore, so a refresh needs no commit. Saying "re-commit the project"
        // sent the operator looking for a change that does not exist in git.
        console.log('       → run `npm run sync:all` to refresh the mirror (`_guidelines/` is gitignored — nothing to commit)');
      }
    }

    // Controls travel with the mirror — but a guard file nobody runs is not a control. A mirror
    // that is in sync and a guard that is never invoked is exactly the gap this pass exists for:
    // the file arrives, the tier is declared, and nothing ever reads either.
    if (!required) continue;
    const controls = controlsOf(row.path, required);
    if (controls.state === 'unwired') {
      drifted.add(row.name);
      if (!quiet) {
        console.log(`  ❌ ${row.name}: mirror is current but ${controls.missing.length} guard(s) are not wired — ${controls.missing.join(', ')}`);
        console.log('       → add an npm script that runs each file (`sync-manifest.json` §guards declares the set)');
      }
    } else if (controls.state === 'unreadable') {
      drifted.add(row.name);
      if (!quiet) console.log(`  ❌ ${row.name}: package.json is unreadable — the required guards cannot be verified`);
    } else if (controls.state === 'not-a-node-project') {
      if (!quiet) console.log(`  ℹ️  ${row.name}: no package.json — npm-script controls do not apply`);
    } else if (!quiet && row.state === 'sync') {
      console.log(`       ✅ all ${required.length} required guard(s) wired`);
    }
  }

  if (drifted.size > 0) {
    if (!quiet) console.log(`\n❌ ${drifted.size} of ${projects.length} project(s) are not running the current rules.\n`);
    process.exit(1);
  }
  if (!quiet) console.log(`\n✅ all ${projects.length} project(s) run the current rules.\n`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { hashTree, compareProjects, requiredGuards, controlsOf, MIRROR_NAME };
