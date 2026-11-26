#!/usr/bin/env node

/**
 * sync-global-skills.js — Deliver the STACK-AGNOSTIC skills to the machine-global skill stores.
 *
 * INTENT: the per-project mirror (`_skills/`) reaches an agent only through the project's
 * `## Skills` inventory, in a directory no native loader scans, and only after a sync has run.
 * The stack-agnostic skills — the ones that name no technology and therefore cannot contradict
 * any project's constitution (`code-review`, `security-audit`, `architect`, `implementation-plan`,
 * …) — do not need that gating at all. They belong where every tool on the machine looks without
 * being told: the user-level Agent Skills directories. This is the second half of the delivery
 * model the fleet review of 2026-10-31 called for: generic skills go to the TOOLS once per
 * machine; stack-scoped skills stay per-project, where the filter that knows the stack applies.
 *
 * THE SELECTION IS NOT RE-IMPLEMENTED HERE. `globalPoolSkills` in `lib/plan-skills.js` — the one
 * home for skill fit — decides; this script owns delivery, exactly as `Sync-Skills` owns delivery
 * for the per-project mirror. The rule is: a skill whose scope resolves to ZERO technology tokens
 * is copied; anything with even one token stays per-project.
 *
 * THE CENTRAL REPO IS THE SOURCE OF TRUTH (owner decision, 2026-10-31). Every target is
 * MARKER-SCOPED (`lib/skill-stores.js`): only the names this sync delivers are written, claimed
 * or pruned. A foreign skill with a DIFFERENT name is never touched. A foreign skill with the
 * SAME name is replaced with the corpus bytes and reported — a same-named downstream copy is
 * either this corpus's skill gone stale or a name the corpus now owns. A store with skills but
 * no marker is refused until the run carries the owner's recorded decision (`--adopt`, or the
 * manifest's `adoptForeignStores`): adoption claims only the delivered names.
 *
 * THE TARGETS COME FROM THE MANIFEST (`sync-manifest.json` §skills.globalPool) — a second
 * hand-kept list here would be a second home for the same decision. `GLOBAL_SKILLS_TARGETS`
 * overrides for tests; `GLOBAL_SKILLS_SOURCE` overrides the corpus root the same way.
 *
 * OPT-IN BY RUN, VISIBLE BY CHECK. The machine-global step is the same opt-in tier as the rest of
 * step 2 of the sync (`--with-global-configs`): it is identical for every project and is the one
 * step a restricted host cannot complete. `check-sync-drift.js` verifies an INSTALLED pool
 * against the same selection and reports an ABSENT one as information — absence is a choice,
 * staleness is a defect.
 *
 * Usage:
 *   node sync-global-skills.js                # print what would change, per store (dry run)
 *   node sync-global-skills.js --apply        # write
 *   node sync-global-skills.js --adopt        # with --apply: deliver into an unmarked store —
 *                                             # claim only the names we deliver; same-named
 *                                             # foreign skills are replaced (source of truth),
 *                                             # differently named foreign skills keep their bytes
 *   node sync-global-skills.js --check        # exit 1 if a change is due
 *   node sync-global-skills.js --quiet        # one line per store
 *
 * Exit codes: 0 = written / unchanged / nothing due; 1 = `--check` found a change due;
 *             2 = usage or configuration error.
 *
 * Source: global-configs/scripts/sync-global-skills.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { globalPoolSkills } = require('./lib/plan-skills.js');
const { materialiseStore, pruneRetiredStore } = require('./lib/skill-stores.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const MANIFEST = process.env.SYNC_DRIFT_MANIFEST
  || path.join(process.env.GUIDELINES_REPO_ROOT || REPO_ROOT, 'guidelines', 'global-configs', 'sync-manifest.json');
const DEFAULT_SOURCE = path.join(process.env.GUIDELINES_REPO_ROOT || REPO_ROOT, 'guidelines', 'global-configs', 'skills');
const SOURCE = process.env.GLOBAL_SKILLS_SOURCE || process.env.PLAN_SKILLS_DIR || DEFAULT_SOURCE;

const USAGE = 'Usage: node sync-global-skills.js [--apply] [--check] [--quiet]';

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error(USAGE);
  process.exit(2);
}

/** `~` in a manifest target is the user profile — the manifest stays machine-readable, not
 *  machine-SPECIFIC, so no absolute home path is ever written into the repo. */
function expandTarget(target) {
  if (target === '~') return os.homedir();
  if (target.startsWith('~/') || target.startsWith('~\\')) return path.join(os.homedir(), target.slice(2));
  return path.resolve(target);
}

function globalTargets() {
  if (process.env.GLOBAL_SKILLS_TARGETS) {
    try {
      const parsed = JSON.parse(process.env.GLOBAL_SKILLS_TARGETS);
      if (!Array.isArray(parsed) || parsed.some((t) => typeof t !== 'string')) throw new Error('not a string array');
      return parsed;
    } catch (err) {
      usage(`GLOBAL_SKILLS_TARGETS is not a JSON string array: ${err.message}`);
    }
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch (err) {
    usage(`cannot read ${MANIFEST}: ${err.message}`);
  }
  const pool = manifest?.skills?.globalPool;
  if (!pool || !Array.isArray(pool.targets) || pool.targets.length === 0) return [];
  if (pool.filter && pool.filter !== 'stack-agnostic') {
    usage(`sync-manifest.json §skills.globalPool.filter must be "stack-agnostic" (found "${pool.filter}")`);
  }
  return pool.targets;
}

function globalRetiredTargets() {
  if (process.env.GLOBAL_SKILLS_TARGETS) return [];
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const retired = manifest?.skills?.globalPool?.retiredTargets;
    return Array.isArray(retired) ? retired : [];
  } catch {
    return [];
  }
}

/** The manifest's `adoptForeignStores` default for the pool — the recorded owner decision that a
 *  store holding unmarked skills may be coexisted with. `--adopt` overrides per run. */
function globalPoolAdoptDefault() {
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    return manifest?.skills?.globalPool?.adoptForeignStores === true;
  } catch {
    return false;
  }
}

/** The planned skills for one store: the pool selection, as `{name, entry}` pairs. */
function plannedFor(poolPlan) {
  return poolPlan.copy.map((row) => {
    const isStandard = row.file.endsWith('/SKILL.md');
    const entry = isStandard
      ? path.join(poolPlan.skillsDir, row.file)
      : path.join(poolPlan.skillsDir, row.file); // a legacy flat file is its own entry
    return { name: row.name, entry };
  });
}

function main() {
  const argv = process.argv.slice(2);
  const known = ['--apply', '--check', '--quiet', '--adopt'];
  const unknown = argv.filter((a) => a.startsWith('--') && !known.includes(a));
  if (unknown.length) usage(`unknown flag ${unknown[0]}`);
  if (argv.includes('--apply') && argv.includes('--check')) usage('--apply and --check are mutually exclusive');
  const apply = argv.includes('--apply');
  const check = argv.includes('--check');
  const quiet = argv.includes('--quiet');
  const adopt = argv.includes('--adopt') || globalPoolAdoptDefault();

  if (!fs.existsSync(SOURCE)) usage(`skills source not found: ${SOURCE}`);
  const poolPlan = globalPoolSkills(SOURCE);
  const planned = plannedFor(poolPlan);
  const targets = globalTargets();

  if (!quiet) {
    console.log(`═══════════════════════════════════════════════`);
    console.log(`  Global skill pool — ${planned.length} stack-agnostic of ${planned.length + poolPlan.skip.length} skill(s)`);
    console.log(`  source:   ${poolPlan.skillsDir}`);
    console.log(`  mode:     ${apply ? 'APPLY' : check ? 'CHECK' : 'dry run (pass --apply to write)'}`);
    console.log(`═══════════════════════════════════════════════`);
    if (poolPlan.copy.some((row) => row.unknownTokens)) {
      console.log('  ⚠️  unresolvable appliesTo values — a typo here makes a skill universal:');
      for (const row of poolPlan.copy) {
        if (row.unknownTokens) console.log(`     ${row.file}: ${row.unknownTokens.join(', ')}`);
      }
    }
  }

  let changeDue = false;

  for (const target of targets) {
    const storeDir = expandTarget(target);
    // The label is the manifest's own spelling (`~/.agents/skills`) — the machine-readable form
    // the operator read when they configured the target, not a re-derivation of it.
    const label = target;
    const result = materialiseStore(storeDir, planned, { dryRun: !apply, sourceRoot: poolPlan.skillsDir, adopt });

    if (result.refused) {
      // Refused, not failed: the store is somebody else's work, and failing the run for work we
      // correctly declined to touch would teach the operator to ignore the run.
      if (!quiet) {
        console.log(`  ⚠️  ${label}: ${result.refused.reason} (${result.refused.foreign.join(', ')}) — left alone`);
      }
      continue;
    }

    const changed = result.copied.length > 0 || result.removed.length > 0 || result.marker === 'written';
    changeDue = changeDue || changed;

    if (quiet) {
      console.log(`  ${label}: ${changed ? `${result.copied.length} written, ${result.removed.length} pruned` : 'up to date'}${result.overridden.length ? `, ${result.overridden.length} same-named replaced` : ''}`);
      continue;
    }
    console.log(`  ${apply ? '✅' : changed ? '•' : '✅'} ${label}: ${changed ? `${result.copied.length} written, ${result.unchanged.length} unchanged, ${result.removed.length} pruned` : 'up to date'}`);
    if (result.overridden.length) {
      console.log(`     ⚠️  same-named foreign skill(s) replaced with the source copy — the central repo is the source of truth: ${result.overridden.join(', ')}`);
    }
    for (const file of result.copied.slice(0, 6)) console.log(`     wrote  ${file}`);
    if (result.copied.length > 6) console.log(`     … and ${result.copied.length - 6} more`);
    for (const file of result.removed) console.log(`     pruned ${file}`);
  }

  for (const target of globalRetiredTargets()) {
    const retired = pruneRetiredStore(expandTarget(target), { dryRun: !apply });
    if (retired.removed.length > 0) {
      changeDue = true;
      if (!quiet) console.log(`  • ${target}: ${apply ? 'pruned' : 'would prune'} ${retired.removed.length} retired skill(s)`);
    }
  }

  if (check && changeDue) {
    console.error('❌ a global skill store is out of date — run `node sync-global-skills.js --apply` (or the sync with --with-global-configs)');
    process.exit(1);
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { expandTarget, globalTargets, plannedFor };
