#!/usr/bin/env node

/**
 * sync-project-adapters.js — Generate a project's NATIVE skill stores from its `_skills/` mirror.
 *
 * INTENT: `_skills/` is the mirror of record, and the `## Skills` inventory is the trigger
 * surface — but no native Agent Skills loader scans `_skills/`. A loader (Claude Code in
 * `.claude/skills/`, Codex/Cursor/Zed/Copilot/Gemini in `.agents/skills/`) progressive-discloses
 * skills it finds in ITS OWN directories; this project's skills were invisible to that whole
 * discovery path. The fleet review of 2026-10-31 called this the delivery topology's main gap.
 *
 * WHAT AN ADAPTER IS — and what it must never be. The adapter is a GENERATED store, built from
 * `_skills/` and marked as generated (`lib/skill-stores.js`): the drift guard already recognises
 * a `.*-skill-sync.json` marker as "a generated adapter follows upstream", and compares its
 * content file by file. What the guard forbids — and what this script therefore never does — is a
 * HAND-maintained copy: a skill copied into a native store by hand shadows `_skills/` and cannot
 * follow upstream.
 *
 * THE ADAPTER IS THE STACK-SCOPED SUBSET. The stack-agnostic skills arrive through the
 * machine-global pool (`sync-global-skills.js`) — delivering them here too would list the same
 * skill twice in tools that merge both stores (Codex), spend catalog budget twice (Zed caps the
 * catalog; Codex caps its context), and in Claude Code the personal copy would shadow the project
 * one outright. Scope tokens come from the plan rows the selector already produced, so no second
 * scope rule is implemented here.
 *
 * THE SOURCE IS `_skills/`, NOT THE CENTRAL CORPUS. The project's mirror is what `compareSkills`
 * verifies byte-for-byte; an adapter built from it is correct exactly when the project's delivery
 * is correct, and the existing `generatedAdapter` verification resolves the marker's `source` to
 * the mirror. Building from the corpus instead would create a third artifact whose freshness is
 * nobody's checked business.
 *
 * A FOREIGN STORE IS REFUSED, NOT ADOPTED. A native directory that already holds skills without
 * our marker (a project that wrote its own skills — alsael1's `.agents/skills` is the recorded
 * case) is left untouched and reported: writing over it would be a destructive act taken on an
 * inference. The refusal is a warning, not a failure — declining to destroy work is not an error;
 * the drift guard reports the competing store either way.
 *
 * Usage:
 *   node sync-project-adapters.js <projectRoot>            # print what would change (dry run)
 *   node sync-project-adapters.js <projectRoot> --apply    # write
 *   node sync-project-adapters.js <projectRoot> --adopt    # with --apply: coexist with an
 *                                                          # unmarked native store — claim only
 *                                                          # the names we deliver, never overwrite
 *   node sync-project-adapters.js <projectRoot> --check    # exit 1 if a change is due
 *   node sync-project-adapters.js <projectRoot> --quiet    # one line per store
 *
 * Exit codes: 0 = written / unchanged / nothing to do; 1 = `--check` found a change due;
 *             2 = usage error.
 *
 * Source: global-configs/scripts/sync-project-adapters.js
 */

const fs = require('fs');
const path = require('path');
const { planSkills } = require('./lib/plan-skills.js');
const { materialiseStore } = require('./lib/skill-stores.js');
const { SKILL_FILE } = require('./lib/skill-files.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const MANIFEST = process.env.SYNC_DRIFT_MANIFEST
  || path.join(process.env.GUIDELINES_REPO_ROOT || REPO_ROOT, 'guidelines', 'global-configs', 'sync-manifest.json');
const MIRROR = '_skills';

const USAGE = 'Usage: node sync-project-adapters.js <projectRoot> [--apply] [--check] [--quiet]';

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error(USAGE);
  process.exit(2);
}

/** The manifest's adapter targets (project-relative), and the source skills directory it declares.
 *  `adoptForeignStores` is the recorded owner decision that a project-native store holding
 *  unmarked skills may be coexisted with instead of refused. */
function adapterConfig() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch (err) {
    usage(`cannot read ${MANIFEST}: ${err.message}`);
  }
  const skills = manifest?.skills || {};
  const targets = Array.isArray(skills.nativeAdapters?.targets) ? skills.nativeAdapters.targets : [];
  return {
    targets,
    sourceDecl: skills.source || 'global-configs/skills/*/SKILL.md',
    adoptDefault: skills.nativeAdapters?.adoptForeignStores === true,
  };
}

/** The skills source directory, resolved the same way `plan-skills.js` resolves it. The manifest
 *  declares the source as `global-configs/skills/` + a star directory + `SKILL.md` — the FILE glob
 *  is dropped first (`dirname`), then any star segment in what remains (the same two steps
 *  `skillsMirror` applies; stripping the star alone leaves `SKILL.md` behind and resolves to a
 *  file that is not a directory). */
function sourceSkillsDir(sourceDecl) {
  if (process.env.PLAN_SKILLS_DIR) return process.env.PLAN_SKILLS_DIR;
  const rel = String(sourceDecl).replace(/\\/g, '/');
  const dir = path.posix.dirname(rel);
  const relDir = dir.split('/').filter((seg) => !seg.includes('*')).join('/');
  return path.join(process.env.GUIDELINES_REPO_ROOT || REPO_ROOT, 'guidelines', relDir);
}

function main() {
  const argv = process.argv.slice(2);
  const known = ['--apply', '--check', '--quiet'];
  const unknown = argv.filter((a) => a.startsWith('--') && !known.includes(a));
  if (unknown.length) usage(`unknown flag ${unknown[0]}`);
  if (argv.includes('--apply') && argv.includes('--check')) usage('--apply and --check are mutually exclusive');
  const positional = argv.filter((a) => !a.startsWith('--'));
  if (positional.length !== 1) usage('exactly one project root is required');
  const projectRoot = path.resolve(positional[0]);
  const apply = argv.includes('--apply');
  const check = argv.includes('--check');
  const quiet = argv.includes('--quiet');
  const { targets, sourceDecl, adoptDefault } = adapterConfig();
  const adopt = argv.includes('--adopt') || adoptDefault;
  const mirrorDir = path.join(projectRoot, MIRROR);

  // No mirror, no adapter: the mirror is what the adapter is generated FROM, and `compareSkills`
  // is what verifies it. Adapting a mirror that does not exist would manufacture a store with no
  // verified source — the same reason the injector exits 0 with nothing to index.
  if (!fs.existsSync(mirrorDir)) {
    if (!quiet) console.log(`  ${path.basename(projectRoot)}: no ${MIRROR}/ — run the project sync first; nothing to adapt`);
    process.exit(0);
  }

  const plan = planSkills(projectRoot, sourceSkillsDir(sourceDecl));
  // The stack-scoped subset: rows whose scope names at least one technology. The agnostic rows
  // are the machine-global pool's business (see the docblock — twice-delivered skills cost
  // catalog budget and get shadowed).
  const scoped = plan.copy.filter((row) => row.scope.length > 0);
  const planned = scoped
    .map((row) => ({ name: row.name, entry: path.join(mirrorDir, row.name, SKILL_FILE) }))
    .filter((p) => fs.existsSync(p.entry));

  if (!quiet) {
    console.log(`═══════════════════════════════════════════════`);
    console.log(`  Native adapters — ${planned.length} stack-scoped of ${plan.copy.length} delivered skill(s)`);
    console.log(`  source:   ${mirrorDir}`);
    console.log(`  mode:     ${apply ? 'APPLY' : check ? 'CHECK' : 'dry run (pass --apply to write)'}`);
    console.log(`═══════════════════════════════════════════════`);
  }

  let changeDue = false;
  for (const target of targets) {
    const storeDir = path.join(projectRoot, target);
    const result = materialiseStore(storeDir, planned, { dryRun: !apply, sourceRoot: mirrorDir, adopt });

    if (result.refused) {
      if (!quiet) {
        console.log(`  ⚠️  ${target}: ${result.refused.reason} (${result.refused.foreign.join(', ')}) — left alone; resolve it by hand if the store should be adopted`);
      }
      continue;
    }

    const changed = result.copied.length > 0 || result.removed.length > 0 || result.marker === 'written';
    changeDue = changeDue || changed;

    if (quiet) {
      console.log(`  ${target}: ${changed ? `${result.copied.length} written, ${result.removed.length} pruned` : 'up to date'}${result.collisions.length ? `, ${result.collisions.length} foreign collision(s) skipped` : ''}`);
      continue;
    }
    console.log(`  ${changed ? '•' : '✅'} ${target}: ${changed ? `${result.copied.length} written, ${result.unchanged.length} unchanged, ${result.removed.length} pruned` : 'up to date'}`);
    if (result.collisions.length) {
      console.log(`     ⚠️  foreign skill(s) with the same name — skipped, never overwritten: ${result.collisions.join(', ')}`);
    }
    for (const file of result.copied.slice(0, 6)) console.log(`     wrote  ${file}`);
    if (result.copied.length > 6) console.log(`     … and ${result.copied.length - 6} more`);
    for (const file of result.removed) console.log(`     pruned ${file}`);
  }

  if (check && changeDue) {
    console.error('❌ a native skill adapter is out of date — run `node sync-project-adapters.js <projectRoot> --apply` (or the project sync)');
    process.exit(1);
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { adapterConfig, sourceSkillsDir };
