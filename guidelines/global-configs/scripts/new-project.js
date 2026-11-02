#!/usr/bin/env node

/**
 * new-project.js — One-command project bootstrap from the single-source starters.
 *
 * Expands AGENTS.starter.md, WORLD.starter.md, and README.starter.md into a target project root,
 * injects the speed-mode declaration, merges the gate scripts into package.json, seeds the
 * dependency-audit wrapper the gate calls, and writes a pre-push hook that reads the declared mode
 * through the SHIPPED reader and runs, in order: the derived always tier, the mode's gate, the
 * audit wrapper and the clean-tree check. Husky install is printed as a next step (no network
 * installs from this script).
 *
 * Usage:
 *   node new-project.js <projectPath> [--mode vibe|standard|guarded] [--name <pkg>]
 *   node new-project.js <projectPath> --dry-run
 *
 * Create-if-missing semantics (like sync-manager): never overwrites an existing
 * AGENTS.md or WORLD.md — reports and skips instead.
 *
 * Exit codes: 0 = scaffolded (or dry-run), 1 = path/error, 2 = usage.
 *
 * Source: global-configs/scripts/new-project.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const STARTERS = path.join(REPO_ROOT, 'global-configs', 'templates');
const SCRIPTS = path.join(REPO_ROOT, 'global-configs', 'scripts');
const { stripSourceCitations } = require('./inject-constitution-block.js');
const dryRun = process.argv.includes('--dry-run');

/**
 * The files the scaffold seeds into a project so the hook's steps always RESOLVE.
 *
 * The audit wrapper is the dependency gate the hook calls in every mode, and it is seeded rather
 * than referenced through the mirror on purpose: the mirror is gitignored, so a project that has
 * not synced yet would carry an `audit:gate` script pointing at a file that does not exist — the
 * same "Missing script" hard-fail, one level up. The wrapper's capture helper travels with it, so
 * the seeded copy is self-contained.
 */
const SEEDED = [
  {
    src: path.join(SCRIPTS, 'audit-gate.js'),
    dest: path.join('scripts', 'audit-gate.js'),
    what: 'the dependency-audit wrapper the pre-push hook calls',
  },
  {
    src: path.join(SCRIPTS, 'lib', 'run-sync.js'),
    dest: path.join('scripts', 'lib', 'run-sync.js'),
    what: 'the capture helper the wrapper needs (no pipes — see its docblock)',
  },
  {
    src: path.join(SCRIPTS, 'gate-receipt.js'),
    dest: path.join('scripts', 'gate-receipt.js'),
    what: 'the ship-boundary wrapper that runs the full chain and writes the receipt',
  },
];

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error('Usage: node new-project.js <projectPath> [--mode vibe|standard|guarded] [--name <pkg>] [--dry-run]');
  process.exit(2);
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { projectPath: null, mode: 'vibe', name: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') continue;
    if (a === '--mode') {
      args.mode = argv[++i];
      if (!['vibe', 'standard', 'guarded'].includes(args.mode)) {
        throw new Error(`invalid mode: ${args.mode}`);
      }
    } else if (a === '--name') {
      args.name = argv[++i];
      if (!args.name) throw new Error('--name requires a value');
    } else if (a.startsWith('--')) {
      throw new Error(`unknown option: ${a}`);
    } else {
      rest.push(a);
    }
  }
  if (rest.length !== 1) throw new Error('expected exactly one <projectPath> argument');
  args.projectPath = rest[0];
  return args;
}

function injectMode(worldContent, mode) {
  const date = new Date().toISOString().split('T')[0];
  const marker = '## What This Project Is';
  const modeLine = `- **mode:** \`${mode}\` — \`vibe | standard | guarded\` per \`_guidelines/01-workflow-methodology/speed-tiered-workflow.md\``;
  // Mode history belongs in commits, not in a boot file read every session.
  const setLine = `- **Set:** ${date} — initialized as \`${mode}\` by new-project.js; revisit at every milestone. A release does not change it: the mode is a loop-speed setting, not a lifecycle stage.`;
  const escalationLine = '- **Escalation:** a release/milestone exit runs the full chain on a **release override** the gate reads (`GS_RELEASE_GATE=pilot|production` or the gitignored `.release-override`) and needs a passing `gate:receipt` for the code it ships; the **release class** — `pilot` (live testing, demo, beta) or `production` (final launch) — is recorded in the receipt and the release tag or commit message; this file changes only when the steady state changes. Record the reason in the commit message — no separate transition log.';

  if (worldContent.includes('## Speed Mode')) {
    let next = worldContent.replace(/^[ \t]*- \*\*mode:\*\*.*$/m, modeLine);
    const setRe = /^[ \t]*- \*\*Set:\*\*.*$/m;
    const setMatch = setRe.exec(next);
    if (setMatch) {
      // An ALREADY-INITIALIZED Set line keeps its record (idempotent re-inject); only the
      // starter's [FILL] placeholder is replaced. The test is on the MATCHED LINE, never on
      // the whole document — the starter carries [FILL] markers far below Speed Mode.
      if (setMatch[0].includes('[FILL')) next = next.replace(setRe, setLine);
    } else {
      next = next.replace(modeLine, `${modeLine}\n${setLine}`);
    }
    if (!next.includes('**Escalation:**')) {
      const anchor = setRe.exec(next);
      if (anchor) next = next.replace(anchor[0], `${anchor[0]}\n${escalationLine}`);
    }
    return next;
  }

  if (!worldContent.includes(marker)) return worldContent;
  const block = [
    '## Speed Mode',
    '',
    modeLine,
    setLine,
    escalationLine,
    '',
    '',
    marker,
  ].join('\n');
  return worldContent.replace(marker, block);
}

function mergeGateScripts(pkg) {
  const scripts = pkg.scripts || {};
  const warnings = [];
  const fast = ['npm run lint', 'npm run type-check'];
  // The fast lane names the script the project actually has: a project with only `test:unit`
  // would otherwise get `npm test -- --run --changed`, which resolves to npm's placeholder and
  // exits non-zero on a project that has tests. `--run` and `--changed` are Vitest flags.
  if (scripts.test) fast.push('npm test -- --run --changed');
  else if (scripts['test:unit']) fast.push('npm run test:unit -- --run --changed');
  else warnings.push('no `test` or `test:unit` script — `gate:fast` runs lint and type-check only, so the vibe gate verifies no behavior until a test runner is wired (`--run`/`--changed` assume Vitest)');
  const mirror = '_guidelines/global-configs/scripts';
  const additions = {
    'gate:fast': fast.join(' && '),
    // The dependency audit runs through a wrapper, never a bare `npm audit`: a bare audit that
    // cannot reach the registry reports nothing and exits 0 — a silent pass. The wrapper is seeded
    // into `scripts/` below, so this script always resolves.
    'audit:gate': 'node scripts/audit-gate.js',
    // The ship boundary: a real receipt, seeded like the audit wrapper, never an echo placeholder.
    'gate:receipt': 'node scripts/gate-receipt.js',
    // The always tier is derived from the mirror's guards, but a guard only runs when an npm script
    // names it — so the scaffold wires the fleet's names. They resolve once the mirror is synced
    // (the hook says so and fails safe until then); `guard:ship` runs only on a release push.
    'guard:tiers': `node ${mirror}/check-guard-tiers.js .`,
    'guard:mode': `node ${mirror}/check-mode-conformance.js .`,
    'guard:ship': `node ${mirror}/check-ship-receipt.js .`,
    'docs:census': `node ${mirror}/check-doc-census.js .`,
  };
  let changed = false;
  pkg.scripts = scripts;
  for (const [k, v] of Object.entries(additions)) {
    if (!pkg.scripts[k]) {
      pkg.scripts[k] = v;
      changed = true;
    }
  }
  return { pkg, changed, warnings };
}

/**
 * The pre-push hook the scaffold writes.
 *
 * It implements the constitution's gate rule (AGENTS.starter.md, "Pre-Commit + Pre-Push Gates"):
 * the DECLARED MODE picks the gate (vibe: `gate:fast`; standard: lint + type-check + the full
 * suite; guarded: that chain + the build), and EVERY branch adds the always tier, the
 * dependency-audit wrapper and the clean-tree check. Four things the previous skeleton got wrong,
 * each measured:
 *
 *   - It read the mode with a `grep` in the hook. A grep here is a SECOND reader of `WORLD.md`, and
 *     a second reader is a second opinion that drifts — it matched `- **Transition mode:**` and
 *     read a `vibe` out of a sentence about something else. The mode is read by the SHIPPED
 *     reader now, and an unreadable mode FAILS SAFE to the full chain: an unreadable mode must
 *     never buy the fast path.
 *   - It ran the full pipeline with `&& npm test -- --run && npm run build`, so a project without
 *     a `test` or a `build` script either died on "Missing script" or learned to skip the gate. A
 *     required script that is missing now FAILS the push with a message, exactly like one that runs
 *     and fails: an unexecuted check must never read as green.
 *   - It carried a comment where the always tier should have been ("Add this project's always-tier
 *     guards here"). The tier is now DERIVED from the guards' own `@tier` docblocks, so a guard
 *     that declares itself `always` is in this gate without anybody editing this file.
 *   - It ran neither the audit wrapper nor the clean-tree check, though the constitution names
 *     both in every mode.
 */
function prePushHook() {
  return [
    '#!/bin/sh',
    '# Pre-push gate — the declared mode decides how much runs (`local-ci-strategy.md` §Tier B).',
    '#',
    '# Order: mode → always-tier → gate → audit → ship receipt (release push only) → clean-tree',
    '#',
    '# Five rules that are easy to get wrong here:',
    '#   · The mode is READ BY THE SHIPPED READER, never by a grep in this file: a grep here is a',
    '#     second reader of WORLD.md, and a second reader is a second opinion that drifts. The',
    '#     reader is `_guidelines/global-configs/scripts/read-mode.js` (the synced mirror), or a',
    '#     vendored `scripts/read-mode.js`. If neither is there — or the declaration is not',
    '#     legible — the gate FAILS SAFE to the full chain: an unreadable mode must never buy the',
    '#     fast path.',
    '#   · A release or milestone exit escalates through the OVERRIDE below (GS_RELEASE_GATE=pilot |',
    '#     production | 1, or a `.release-override` file holding the class) — never by editing',
    '#     WORLD.md and editing it back. The declared mode changes only when the steady state',
    '#     changes; the release CLASS (pilot vs production) is recorded in the release tag or',
    '#     commit, not in WORLD.md. A release push also owes a passing receipt (see below).',
    '#   · The gate depth follows the mode: vibe runs gate:fast; standard runs lint → type-check',
    '#     → the full suite and defers the BUILD to the ship boundary (every release builds, and',
    '#     deploys what it built); guarded adds the build and the path-aware extras per push.',
    '#   · The always tier is DERIVED from the guards\' own `@tier` docblocks, not listed here: a',
    '#     list kept by hand in a hook goes stale, and it fails in the direction nobody notices.',
    '#   · A missing required script fails the push, just like a script that runs and fails.',
    '#   · The audit and the clean-tree check run in EVERY mode: `vibe` defers the full suite,',
    '#     never the security or the honesty checks.',
    '#',
    '# `--no-verify` is forbidden in every mode. A required npm script that cannot run must fail,',
    '# never pass. The one honest exception is the always tier before the first sync: with no',
    '# `_guidelines/` there are no guard tiers to derive, and the hook says so out loud rather',
    '# than inventing a pass it did not earn.',
    '',
    'set -e',
    '',
    'cd "$(git rev-parse --show-toplevel)" || exit 1',
    '',
    'MODE=standard',
    'for reader in "_guidelines/global-configs/scripts/read-mode.js" "scripts/read-mode.js"; do',
    '  if [ -f "$reader" ]; then',
    '    MODE=$(node "$reader" 2>/dev/null) || MODE=""',
    '    [ -n "$MODE" ] || MODE=standard',
    '    break',
    '  fi',
    'done',
    'echo "pre-push gate: mode=$MODE"',
    '',
    '# Release override: a release or milestone exit escalates WITHOUT editing WORLD.md — set',
    '# GS_RELEASE_GATE for one push (`pilot`, `production`, or `1` for pilot), or leave a',
    '# `.release-override` file at the repo root holding the class for the release week (gitignore',
    '# it). The lift is one-way: a `pilot` push lifts vibe to standard; a `production` push runs at',
    '# guarded depth. A declared mode that is already deeper is untouched — it never makes a gate',
    '# cheaper. The ship boundary itself is the receipt: a release push must carry a passing',
    '# `gate:receipt` for the code it ships (checked below).',
    'RELEASE_CLASS=""',
    'case "${GS_RELEASE_GATE:-}" in',
    '  production) RELEASE_CLASS=production ;;',
    '  pilot|1) RELEASE_CLASS=pilot ;;',
    'esac',
    'if [ -z "$RELEASE_CLASS" ] && [ -f .release-override ]; then',
    '  RELEASE_CLASS=pilot',
    '  if grep -qi production .release-override; then RELEASE_CLASS=production; fi',
    'fi',
    'if [ "$RELEASE_CLASS" = "production" ]; then',
    '  MODE=guarded',
    '  echo "pre-push gate: production release override active — running the guarded chain"',
    'elif [ "$RELEASE_CLASS" = "pilot" ] && [ "$MODE" = "vibe" ]; then',
    '  MODE=standard',
    '  echo "pre-push gate: pilot release override active — running the standard chain"',
    'fi',
    '',
    '# A missing required script must not turn an unexecuted check into a green gate.',
    'has_script() {',
    '  node -e "const s=(require(\'./package.json\').scripts)||{};process.exit(s[process.argv[1]]?0:1)" "$1" 2>/dev/null',
    '}',
    'run_step() {',
    '  step_script="$1"',
    '  shift',
    '  if ! has_script "$step_script"; then',
    '    echo "pre-push FAIL: required script \"$step_script\" is missing from package.json — wire it before pushing" >&2',
    '    exit 1',
    '  fi',
    '  npm run "$step_script" "$@"',
    '}',
    '',
    '# The always tier runs in EVERY mode. The set is derived by the guard that owns the tiers, so',
    '# a guard that declares itself `always` reaches this gate without anybody editing this file.',
    'if [ -f "_guidelines/global-configs/scripts/check-guard-tiers.js" ]; then',
    '  node "_guidelines/global-configs/scripts/check-guard-tiers.js" --root . --run-always',
    'else',
    '  echo "  (skipped the always tier — _guidelines/ is not synced, so no tier can be derived)"',
    'fi',
    '',
    'if [ "$MODE" = "vibe" ]; then',
    '  # The fast loop: lint + type-check + the tests the diff touches. The full suite is a',
    '  # ship-boundary step, not a per-push one.',
    '  run_step gate:fast',
    'else',
    '  # lint + type-check + the full suite. The BUILD waits for the ship boundary in `standard`:',
    '  # every release builds, and deploys what it built, so a break surfaces before a user sees',
    '  # it. `guarded` keeps the build per push — a broken artifact must be found before the',
    '  # merge lands, not at the next release.',
    '  run_step lint',
    '  run_step type-check',
    '  run_step test -- --run',
    '  if [ "$MODE" = "guarded" ]; then',
    '    run_step build',
    '  fi',
    'fi',
    '',
    '# The dependency audit, through the project\'s own wrapper. A bare `npm audit` that cannot',
    '# reach the registry reports nothing and exits 0 — a silent pass.',
    'run_step audit:gate',
    '',
    '# A release push owes the ship boundary: a passing receipt, at least as deep as the class being',
    '# shipped, for exactly this code. The modes defer the build and the suite to this point — a',
    '# boundary nobody checks is a comment. The guard comes from the synced mirror.',
    'if [ -n "$RELEASE_CLASS" ]; then',
    '  if [ ! -f "_guidelines/global-configs/scripts/check-ship-receipt.js" ]; then',
    '    echo "pre-push FAIL: a release push needs _guidelines/ synced so the ship receipt can be checked" >&2',
    '    exit 1',
    '  fi',
    '  run_step guard:ship -- --class "$RELEASE_CLASS"',
    'fi',
    '',
    '# Clean-tree: decided on CONTENT, never on git\'s stat cache. A stat-based check reports files',
    '# as modified whose worktree blob is identical to the index, and blocks a genuinely clean push.',
    'if ! git diff --quiet HEAD || [ -n "$(git ls-files --others --exclude-standard)" ]; then',
    '  echo "pre-push FAIL: working tree is dirty after the gate (staged, unstaged, or untracked)" >&2',
    '  git diff --name-status HEAD >&2',
    '  git ls-files --others --exclude-standard >&2',
    '  exit 1',
    'fi',
    '',
    'exit 0',
    '',
  ].join('\n');
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    usage(err.message);
  }
  const projectPath = path.resolve(process.cwd(), args.projectPath);
  if (!fs.existsSync(projectPath)) fail(`project path does not exist: ${projectPath}`);

  const agentsSrc = path.join(STARTERS, 'AGENTS.starter.md');
  const worldSrc = path.join(STARTERS, 'WORLD.starter.md');
  const readmeSrc = path.join(STARTERS, 'README.starter.md');
  if (!fs.existsSync(agentsSrc) || !fs.existsSync(worldSrc) || !fs.existsSync(readmeSrc)) {
    fail('starter templates missing (AGENTS.starter.md, WORLD.starter.md, README.starter.md)');
  }

  const agentsDest = path.join(projectPath, 'AGENTS.md');
  const worldDest = path.join(projectPath, 'WORLD.md');
  const readmeDest = path.join(projectPath, 'README.md');
  const pkgDest = path.join(projectPath, 'package.json');
  const hooksDir = path.join(projectPath, '.husky');
  const hookDest = path.join(hooksDir, 'pre-push');

  const actions = [];
  const warnings = [];
  if (fs.existsSync(agentsDest)) {
    actions.push({ file: 'AGENTS.md', status: 'exists — skipped (create-if-missing)' });
  } else {
    const cleanAgents = stripSourceCitations(fs.readFileSync(agentsSrc, 'utf8'));
    actions.push({ file: 'AGENTS.md', status: 'would write', write: () => fs.writeFileSync(agentsDest, cleanAgents, 'utf8') });
  }

  if (fs.existsSync(worldDest)) {
    actions.push({ file: 'WORLD.md', status: 'exists — skipped (create-if-missing)' });
  } else {
    const worldContent = injectMode(fs.readFileSync(worldSrc, 'utf8'), args.mode);
    actions.push({ file: 'WORLD.md', status: `would write (mode=${args.mode})`, write: () => fs.writeFileSync(worldDest, worldContent, 'utf8') });
  }

  if (fs.existsSync(readmeDest)) {
    actions.push({ file: 'README.md', status: 'exists — skipped (create-if-missing)' });
  } else {
    actions.push({ file: 'README.md', status: 'would write', write: () => fs.copyFileSync(readmeSrc, readmeDest) });
  }

  if (fs.existsSync(pkgDest)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgDest, 'utf8'));
      if (args.name) pkg.name = args.name;
      const { pkg: merged, changed, warnings: gateWarnings } = mergeGateScripts(pkg);
      warnings.push(...gateWarnings);
      if (changed) {
        actions.push({
          file: 'package.json',
          status: 'would write (merge the gate, receipt and guard scripts)',
          write: () => fs.writeFileSync(pkgDest, `${JSON.stringify(merged, null, 2)}\n`, 'utf8'),
        });
      } else {
        actions.push({ file: 'package.json', status: 'gate scripts already present — skipped' });
      }
    } catch {
      actions.push({ file: 'package.json', status: 'unparseable — skipped' });
    }
  } else {
    actions.push({ file: 'package.json', status: 'absent — skipped (create your app first)' });
  }

  if (fs.existsSync(hookDest)) {
    actions.push({ file: '.husky/pre-push', status: 'exists — skipped' });
  } else {
    actions.push({
      file: '.husky/pre-push',
      status: 'would write skeleton',
      write: () => {
        fs.mkdirSync(hooksDir, { recursive: true });
        fs.writeFileSync(hookDest, prePushHook(), 'utf8');
      },
    });
  }

  for (const seeded of SEEDED) {
    const dest = path.join(projectPath, seeded.dest);
    if (fs.existsSync(dest)) {
      actions.push({ file: seeded.dest, status: 'exists — skipped (the project owns it)' });
      continue;
    }
    if (!fs.existsSync(seeded.src)) {
      actions.push({ file: seeded.dest, status: 'source missing — skipped' });
      continue;
    }
    actions.push({
      file: seeded.dest,
      status: `would write (${seeded.what})`,
      write: () => {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(seeded.src, dest);
      },
    });
  }

  const allowlistDest = path.join(projectPath, 'scripts', 'audit-allowlist.json');
  if (fs.existsSync(allowlistDest)) {
    actions.push({ file: 'scripts/audit-allowlist.json', status: 'exists — skipped (the project owns it)' });
  } else {
    actions.push({
      file: 'scripts/audit-allowlist.json',
      status: 'would write (the accepted-risk list the audit wrapper reads)',
      write: () => {
        fs.mkdirSync(path.dirname(allowlistDest), { recursive: true });
        fs.writeFileSync(
          allowlistDest,
          `${JSON.stringify(
            {
              _comment:
                'Accepted dependency risks, keyed by advisory URL (GHSA-…). Every entry needs a "why" and a "reviewBy" date: an entry whose review date has passed AND whose advisory is still reported fails the gate.',
            },
            null,
            2,
          )}\n`,
          'utf8',
        );
      },
    });
  }

  if (dryRun) {
    console.log('── dry run — no files written ──');
    for (const a of actions) console.log(`  ${a.file}: ${a.status}`);
    for (const w of warnings) console.log(`  ⚠️  ${w}`);
    process.exit(0);
  }

  for (const a of actions) {
    if (a.write) a.write();
    console.log(`✅ ${a.file}: ${a.status.replace('would write', 'written')}`);
  }
  for (const w of warnings) console.log(`⚠️  ${w}`);

  console.log('\nNext steps:');
  console.log('  1. Search [FILL] in AGENTS.md — fill the stack table + project mandates (the only home for rules)');
  console.log('  2. Complete WORLD.md sections (mode already set to ' + args.mode + ')');
  console.log('  3. Complete README.md — what this is, structure tree, quick start');
  console.log('  4. npx husky init   # install hooks; the generated pre-push reads the declared mode through');
  console.log('     the shipped reader and runs the always tier, the mode\'s gate, the audit and the clean-tree check');
  console.log('  5. Release boundary: `npm run gate:receipt -- --class pilot|production` runs lint → type-check → suite →');
  console.log('     build → audit (+ test:e2e for production) and writes docs/gate-receipts/<UTC-stamp>.md; commit it, then push with');
  console.log('     GS_RELEASE_GATE=pilot|production — the hook checks the receipt (local-ci-strategy.md §Gate Receipts).');
  console.log('     Add your own `test:e2e` before a production release; a missing script fails the receipt.');
  console.log('  6. pwsh -File <central-repo>\\guidelines\\global-configs\\scripts\\sync-guidelines.ps1 -ProjectPath .  # mirror _guidelines/');
  console.log('     (until then the hook cannot read the mode through the shipped reader and cannot derive the always tier —');
  console.log('     it fails safe to the full chain and says so)');
  console.log('  7. git config core.hooksPath .husky   # if not using husky default');
  console.log('  8. Record every accepted dependency risk in scripts/audit-allowlist.json — with a why and a review-by date');
  console.log('\n  Docs set: AGENTS.md + WORLD.md + README.md (+ docs/AI_ARCHITECTURE.md on demand).');
  console.log('  There is no AI_CONTEXT.md or ARCHITECTURE_INDEX.md — one home per fact (07-documentation/documentation-strategy.md).');
}

if (require.main === module) main();

module.exports = { injectMode, mergeGateScripts, prePushHook, parseArgs, SEEDED };
