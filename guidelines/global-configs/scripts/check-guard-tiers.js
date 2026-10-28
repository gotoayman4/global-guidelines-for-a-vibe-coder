#!/usr/bin/env node

/**
 * check-guard-tiers.js — every guard declares when it must run, and the set is derived.
 *
 * INTENT: `local-ci-strategy.md` §Guard Tiers gives each guard a tier — `always`, `standard+`,
 * `ship` — and states the mechanism: *derive the set from the guards themselves*, because "a list
 * kept by hand in the hook is a list that goes stale, and it fails in the direction nobody
 * notices." The doctrine named the control and nothing implemented it. Measured on 2026-10-12:
 * 9 `check-*.js` guards, 1 declared a tier, and only 3 were reachable from `npm run validate`.
 * Six had an npm script and ran in no chain — not because anyone decided that, but because
 * membership was a hand decision, and a hand decision is invisible when it is never made.
 *
 * DECISION: a guard's own `@tier` docblock is the source of truth, and this guard reads it rather
 * than a list. Three failures follow, and all three are structural rather than stylistic:
 *   - no `@tier` — an unclassified guard is one nobody can place in a chain;
 *   - `always` but the gate never reaches it — `always` means every push, so a gate that skips it
 *     contradicts the tier the guard was given;
 *   - `ship` but the `vibe` chain reaches it — the fastest mode must not pay the ship boundary.
 * A guard file no npm script runs at all is also a failure: a control nobody can invoke is a
 * control that exists only in a directory listing.
 *
 * THE ASSERTION THIS GUARD SOFTENED, AND WHY. The proposal said `npm run validate` must EQUAL the
 * `always` + `standard+` set. Measured, it does not, and it should not: three guards are milestone-
 * or fleet-scoped by design (`check-docs-freshness`, `check-project-freshness` and
 * `check-sync-drift` — the last two read the fleet registry). Forcing them into the
 * gate would make the gate depend on state it does not own. The enforceable form is therefore:
 * every `always` guard IS in the gate, and every `standard+` guard the gate does not reach is
 * REPORTED — named, so that its absence is a decision rather than an accident. That report is
 * advisory and never fatal, which is what the repo's advisory-vs-fatal rule requires: a guard that
 * fails correct work gets deleted.
 *
 * TWO ASSERTIONS SOFTEN IN A MIRROR, AND WHY. A project's `_guidelines/` carries EVERY guard this
 * repo ships, including the ones scoped to the central repo (`check-index-coverage` guards the
 * guidelines index) or to the fleet (`check-sync-drift`, `check-project-freshness` read the
 * registry). A project wires the subset that is meaningful to it, so in a mirror: an unwired guard
 * is reported rather than failed, and the `always`-in-gate promise is advisory because the hook
 * branches on the declared mode. The project-side enforcement is `check-sync-drift.js` §controls,
 * which verifies the set `sync-manifest.json` §guards DECLARES — a tier says when a guard runs, not
 * where it is meaningful, so a tier cannot answer "which guards must this project wire".
 *
 * CAVEAT: this governs `check-*.js` — the guards. The generators that also gate
 * (`render-index.js --check`, `render-agents-starter.js --check`) and the rule auditor
 * (`audit-rules.js`) carry no `@tier` and are deliberately out of scope: they derive an artifact
 * rather than assert a property, and a derived artifact already fails loudly when it drifts.
 * The guard is also silent about *which* files a `standard+` guard protects — it reads tiers, not
 * subjects, and a tier is a statement about when a control runs, not about what it covers.
 *
 * WHAT THIS DOES NOT PROVE: execution. The set is derived from npm scripts and the hook's
 * `npm run` references. A wired guard can still be skipped by a condition, short-circuited with
 * `|| true`, or never run because the chain itself was not invoked. Execution evidence is a gate
 * receipt (`docs/gate-receipts/`); this guard proves classification and wiring, not that any
 * command ran.
 *
 * Usage:
 *   node check-guard-tiers.js [projectRoot] [--json]
 *
 * `projectRoot` (or `--root <path>`) only locates `package.json` and `.husky/pre-push`. The guard
 * set is always read from this file's own directory, so the same invocation works centrally and
 * from a project's `_guidelines/` mirror.
 *
 * Exit codes: 0 = every guard is classified and the tiers hold; 1 = an undeclared tier, or — in the
 *             repo that owns the guards — an unwired guard, an `always` guard the gate never reaches,
 *             or a `ship` guard in the `vibe` loop; 2 = usage error. In a `_guidelines/` mirror the
 *             last three are reported rather than failed, for the reason in the mirror paragraph above.
 *
 * @tier always — a structural invariant of the guard set itself: cheap, and every push in every
 *   mode must know that its controls are classified.
 *
 * Source: global-configs/scripts/check-guard-tiers.js
 */

const fs = require('fs');
const path = require('path');
const { npmSync } = require('./lib/run-sync.js');

/** The three tiers, exactly as `local-ci-strategy.md` §Guard Tiers names them. */
const TIERS = ['always', 'standard+', 'ship'];

/** A guard's declaration, read from its own file-level docblock. Backticks are optional. */
const DECL = /@tier\s+`?(always|standard\+|ship)`?/;

/** A guard is a `check-*.js` beside this file. */
const GUARD_RE = /^check-.*\.js$/;

/** The guards sit beside this file, in `scripts/` — not in a `lib/` beside them. */
const SCRIPTS = __dirname;

/** scripts → global-configs → guidelines → the repo root, centrally and downstream alike. */
const REPO = path.join(__dirname, '..', '..', '..');

/** The gate, in preference order — the repo's own full pipeline. */
const GATE_CANDIDATES = ['validate', 'gate'];

/** The `vibe` per-push chain, whose set is `gate:fast` plus the `always` tier. */
const VIBE_CHAIN = 'gate:fast';

/**
 * A project's chain when it declares no npm-script gate. `local-ci-strategy.md` §Tier B makes the
 * pre-push hook the chain and has it BRANCH ON THE MODE, so its membership is a mode decision this
 * guard cannot evaluate — see the fatal-vs-advisory split in `analyse`.
 */
const HOOK = path.join('.husky', 'pre-push');

/**
 * The npm scripts that run the `always` tier — the set a per-push gate owes, derived.
 *
 * A guard is reached by an npm script that names its file; a script is reached by that
 * guard when the guard's tier is `always`. The result is the executable form of the tier:
 * the gate does not carry a list, it asks for the list and runs what it gets back.
 *
 * A script that runs this guard WITH `--run-always` is excluded: it IS the derivation, so
 * running it would re-enter the derivation and recurse forever.
 *
 * @param {object} report the `analyse` result
 * @returns {string[]} distinct npm script names, in the order the guards were discovered
 */
function alwaysRunners(report) {
  const names = new Set();
  const scripts = report.scripts || {};
  for (const guard of report.guards) {
    if (guard.tier !== 'always') continue;
    for (const runner of guard.runners || []) {
      if (String(scripts[runner] || '').includes('--run-always')) continue;
      names.add(runner);
    }
  }
  return [...names];
}

/**
 * Run the derived `always` set. The first failure stops the run and is the verdict.
 *
 * The derivation is the point: a list kept by hand in the hook goes stale, and it fails in
 * the direction nobody notices. A set derived from the guards' own `@tier` docblocks cannot
 * go stale, and a guard that adds itself to the tier is in the gate the next push.
 *
 * The runners are npm SCRIPT NAMES, not guard files: a project wires a guard under its own
 * script name (`guard:mode`, `guard:tiers`), and the tier says WHICH guards must run, never
 * how a project chose to invoke them.
 *
 * @param {object} report the `analyse` result
 * @param {string} repo  where `package.json` lives
 * @returns {{ok: boolean, ran: Array<{name: string, status: number|null, stderr: string}>}}
 */
function runAlways(report, repo) {
  const ran = [];
  for (const name of alwaysRunners(report)) {
    const result = npmSync(['run', name], { cwd: repo });
    ran.push({ name, status: result.status, stderr: result.stderr });
    if (result.status !== 0) return { ok: false, ran };
  }
  return { ok: true, ran };
}

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error('Usage: node check-guard-tiers.js [--root <repoRoot>] [--json] [--print-always] [--run-always]');
  process.exit(2);
}

/**
 * The leading block comment only, so a `@tier` mentioned in code or in a later comment cannot
 * be mistaken for the declaration. A guard whose docblock is not the first thing in the file is
 * reported as undeclared — which is the safe reading, since the declaration is meant to be the
 * first thing a reader (or this guard) meets.
 */
function leadingDocblock(text) {
  // A shebang (`#!/usr/bin/env node`) is the one thing allowed before the docblock — every guard
  // in this repo has one, so a reader that requires the comment to be the very first bytes reads
  // every guard as undeclared.
  const match = text.match(/^(?:#![^\n]*\n)?\s*\/\*\*([\s\S]*?)\*\//);
  return match ? match[1] : '';
}

/** The tier a guard declares, or null when it declares none. */
function readTier(file) {
  if (!fs.existsSync(file)) return null;
  const decl = leadingDocblock(fs.readFileSync(file, 'utf8')).match(DECL);
  return decl ? decl[1] : null;
}

/** Every `check-*.js` guard beside this file, with the tier it declares. */
function discoverGuards(scriptsDir = SCRIPTS) {
  if (!fs.existsSync(scriptsDir)) return [];
  return fs
    .readdirSync(scriptsDir)
    .filter((name) => GUARD_RE.test(name))
    .sort()
    .map((name) => ({ file: name, tier: readTier(path.join(scriptsDir, name)) }));
}

/** The repo's npm scripts, or null when there is no readable package.json. */
function readScripts(repo = REPO) {
  const pkg = path.join(repo, 'package.json');
  if (!fs.existsSync(pkg)) return null;
  try {
    return JSON.parse(fs.readFileSync(pkg, 'utf8')).scripts || {};
  } catch {
    return null;
  }
}

/** The script names a chain reaches, following `npm run <name>` references transitively. */
function expand(scripts, name, seen = new Set()) {
  if (!name || seen.has(name) || !scripts[name]) return seen;
  seen.add(name);
  for (const match of scripts[name].matchAll(/npm run ([A-Za-z0-9:_-]+)/g)) expand(scripts, match[1], seen);
  return seen;
}

/** The npm scripts whose command runs this guard file. */
function runnersOf(scripts, file) {
  return Object.keys(scripts).filter((name) => scripts[name].includes(file));
}

/**
 * Is this guard directory a project's MIRROR (`_guidelines/`) rather than the repo that owns it?
 *
 * The distinction decides whether an unwired guard is a defect. The central repo ships every guard
 * and must be able to invoke each one — an orphan there is a control that exists only in a
 * directory listing. A project's mirror carries ALL of them, including the ones scoped to the
 * central repo or the fleet, and the project wires the subset that is meaningful to it; calling
 * that an orphan would fail correct work. The project-side check is `check-sync-drift.js` §controls,
 * which verifies the declared `guards.required` set instead of guessing from a tier.
 */
function isMirror(scriptsDir) {
  return path.resolve(scriptsDir).split(path.sep).includes('_guidelines');
}

/**
 * The chain, and whether it is an npm script or the hook.
 *
 * An npm-script gate (`validate`, then `gate`) is ONE unambiguous chain — the central repo has one
 * and every step in it is meant to run. A hook is not: §Tier B has it branch on the declared mode,
 * so the set it runs depends on a value this guard would have to read from `WORLD.md` to judge.
 * That distinction is why the `always` assertion is fatal for the first and advisory for the second.
 *
 * A hook reaches a step three ways, and reading only the first makes every scaffolded project report
 * zero guards wired: `npm run <script>`, the `run_step <script>` helper the scaffold writes (which
 * exists precisely so a missing script fails rather than silently passing), and a guard invoked by
 * file — `node …/check-guard-tiers.js --root . --run-always`. The last is the DERIVATION: it asks
 * this guard for the `always` set and runs what comes back, so its membership is decided by the
 * guards' own docblocks and is never visible as a name in the hook. A reader that only saw literal
 * script names would tell a correctly wired project that its `always` guards are unreached.
 */
function resolveGate(repo, scripts) {
  const named = scripts && GATE_CANDIDATES.find((candidate) => scripts[candidate]);
  if (named) return { label: `npm run ${named}`, names: expand(scripts, named), files: new Set(), derivesAlways: false, npm: true };

  const hook = path.join(repo, HOOK);
  if (fs.existsSync(hook)) {
    const text = fs.readFileSync(hook, 'utf8');
    const names = new Set([...text.matchAll(/(?:npm run|run_step)\s+([A-Za-z0-9:_-]+)/g)].map((match) => match[1]));
    const files = new Set([...text.matchAll(/check-[A-Za-z0-9._-]+\.js/g)].map((match) => match[0]));
    const derivesAlways = files.has('check-guard-tiers.js') && text.includes('--run-always');
    return { label: HOOK.replace(/\\/g, '/'), names, files, derivesAlways, npm: false };
  }
  return { label: null, names: new Set(), files: new Set(), derivesAlways: false, npm: false };
}

/**
 * Judge the guard set. Pure over its inputs, so a test can drive it with a fixture instead of
 * the live repo (the lesson `check-sync-drift.js` records: a test that asserts live state passes
 * only while that state is broken).
 *
 * @returns {{guards: object[], gate: string|null, vibe: string, reachedByGate: string[],
 *            reachedByVibe: string[], problems: string[], advisories: string[]}}
 */
function analyse(scriptsDir = SCRIPTS, repo = REPO) {
  const guards = discoverGuards(scriptsDir);
  const scripts = readScripts(repo);
  const mirror = isMirror(scriptsDir);
  const report = {
    scriptsDir,
    repo,
    mirror,
    scripts,
    guards,
    gate: null,
    vibe: VIBE_CHAIN,
    reachedByGate: [],
    reachedByVibe: [],
    problems: [],
    advisories: [],
  };

  // Non-vacuity: an empty guard set proves nothing, so it is a data error, never a pass.
  if (guards.length === 0) {
    report.problems.push(`no \`check-*.js\` guards found under ${scriptsDir} — nothing to classify`);
    return report;
  }
  if (!scripts) {
    report.problems.push(`no readable package.json at ${repo} — there is no chain to derive`);
    return report;
  }

  const gate = resolveGate(repo, scripts);
  report.gate = gate.label;
  report.gateKind = gate.npm ? 'npm' : gate.label ? 'hook' : null;
  report.derivesAlways = gate.derivesAlways;
  const vibeNames = scripts[VIBE_CHAIN] ? expand(scripts, VIBE_CHAIN) : new Set();

  for (const guard of guards) {
    const runners = runnersOf(scripts, guard.file);
    guard.runners = runners;

    if (guard.tier === null) {
      report.problems.push(`${guard.file}: no \`@tier\` in its file-level docblock — an unclassified guard cannot be placed in a chain`);
      continue;
    }
    if (runners.length === 0) {
      // Fatal where the guards and the scripts are the same repo's; advisory in a mirror, where the
      // guard set is central and the wiring is a deliberate subset (see `isMirror`).
      if (mirror) {
        report.advisories.push(`${guard.file}: \`${guard.tier}\`, and no npm script here runs it — expected for a guard scoped to the central repo or the fleet`);
      } else {
        report.problems.push(`${guard.file}: declares \`${guard.tier}\` but no npm script runs it — a control nobody can invoke`);
      }
    }

    guard.inGate = runners.some((name) => gate.names.has(name)) || gate.files.has(guard.file) || (guard.tier === 'always' && gate.derivesAlways);
    guard.inVibe = runners.some((name) => vibeNames.has(name));
    if (guard.inGate) report.reachedByGate.push(guard.file);
    if (guard.inVibe) report.reachedByVibe.push(guard.file);

    if (guard.tier === 'always' && !guard.inGate) {
      const where = gate.label ? `\`${gate.label}\`` : 'no declared gate';
      const line = `${guard.file}: declares \`always\` but ${where} never reaches it — \`always\` means every push, in every mode`;
      // Fatal against an npm-script gate: that is one unambiguous chain, and the central repo has
      // one. Advisory against a hook: §Tier B has the hook branch on the declared mode, so whether
      // an `always` guard runs is a mode decision this guard cannot evaluate without reading
      // `WORLD.md` — and guessing wrong would fail a correct project.
      if (gate.npm) report.problems.push(line);
      else report.advisories.push(line);
    }
    if (guard.tier === 'ship' && guard.inVibe) {
      report.problems.push(`${guard.file}: declares \`ship\` but \`npm run ${VIBE_CHAIN}\` reaches it — a ship guard must not run in the \`vibe\` loop`);
    }
    if (guard.tier === 'standard+' && !guard.inGate && runners.length > 0) {
      // Only when a script DOES run it: a guard with no runner already has its own line, and two
      // advisories saying the same thing about one guard is how a report stops being read.
      const where = gate.label ? `\`${gate.label}\`` : 'any declared gate';
      report.advisories.push(`${guard.file}: \`standard+\`, not reached by ${where} — a milestone/ship obligation by design; keep it deliberate`);
    }
  }

  if (!guards.some((guard) => guard.tier === 'ship')) {
    report.advisories.push('no guard declares `ship` — the ship boundary is exercised by the projects that mirror these rules, not by this repo');
  }

  return report;
}

function render(report) {
  const lines = [];
  lines.push('═══════════════════════════════════════════');
  lines.push('  Guard Tiers — every guard declares when it runs');
  lines.push('═══════════════════════════════════════════');
  lines.push('');

  if (report.guards.length === 0) {
    lines.push(`  ❌ ${report.problems.join('\n     ')}`);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`  guards:  ${report.guards.length}`);
  const gateNote = report.gateKind === 'hook' ? (report.derivesAlways ? ' (mode-branched; `always` tier derived)' : ' (mode-branched)') : '';
  lines.push(`  gate:    ${report.gate || '(none declared)'}${gateNote}  →  ${report.reachedByGate.length} guard(s) wired`);
  // "(absent)" means the chain does not exist. An existing `gate:fast` that wires no guard is a
  // different fact, and printing the same word for both hides which one a reader should act on.
  const vibeNote = report.reachedByVibe.length ? '' : report.scripts && report.scripts[report.vibe] ? ' — nothing wired into it' : ' (absent)';
  lines.push(`  vibe:    npm run ${report.vibe}${vibeNote}  →  ${report.reachedByVibe.length} guard(s) wired`);
  lines.push('  execution: NOT VERIFIED — this check reads npm scripts and the hook, not a gate receipt');
  lines.push('');

  for (const tier of TIERS) {
    const set = report.guards.filter((guard) => guard.tier === tier);
    const names = set.map((guard) => guard.file.replace(/^check-/, '').replace(/\.js$/, '')).join(', ');
    lines.push(`  ${tier.padEnd(10)} ${String(set.length).padStart(2)}  ${names || '—'}`);
  }
  lines.push('');

  for (const advisory of report.advisories) lines.push(`  ℹ️  ${advisory}`);
  if (report.advisories.length > 0) lines.push('');

  for (const problem of report.problems) lines.push(`  ❌ ${problem}`);
  if (report.problems.length === 0) {
    lines.push('  ✅ every guard declares a tier, and no `ship` guard is wired into the `vibe` loop');
    // The scope of what was actually proved, named — the three cases are not the same claim.
    if (report.mirror) lines.push('     (a mirror: the guards a project wires are a subset of these — `npm run sync:drift` checks the declared set)');
    else if (report.gateKind === 'hook') lines.push('     (the chain is a mode-branched hook, so the `always` promise above is reported, not failed)');
    else lines.push('     (and every `always` guard is wired into the gate)');
  }
  lines.push('');
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  let json = false;
  let root = null;
  let printAlways = false;
  let runAlwaysFlag = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') json = true;
    else if (arg === '--print-always') printAlways = true;
    else if (arg === '--run-always') runAlwaysFlag = true;
    else if (arg === '--root') {
      root = argv[i + 1];
      if (!root) usage('--root needs a path');
      i += 1;
    } else if (arg.startsWith('-')) usage(`unknown flag ${arg}`);
    else if (root) usage(`unexpected argument ${arg}`);
    else root = arg;
  }

  // The guards are ALWAYS resolved from this file's own directory, never from the root: the
  // mirror root is `<project>/_guidelines`, so a root-relative path would look for
  // `<project>/guidelines/global-configs/scripts` and find nothing — the exact defect
  // `lib/context-caps.js` documents. The root only says where `package.json` and the hook are.
  const repo = root ? path.resolve(root) : REPO;

  const report = analyse(SCRIPTS, repo);

  // `--print-always` and `--run-always` answer the only question the tier exists to answer:
  // which npm scripts must a per-push gate owe? The answer is derived here, so the hook asks the
  // guard instead of carrying a list that goes stale.
  if (printAlways || runAlwaysFlag) {
    const names = alwaysRunners(report);
    if (printAlways) {
      if (json) console.log(JSON.stringify({ alwaysRunners: names }, null, 2));
      else for (const name of names) console.log(name);
    }
    if (runAlwaysFlag) {
      const result = runAlways(report, repo);
      if (json) console.log(JSON.stringify({ alwaysRunners: names, ran: result.ran }, null, 2));
      else {
        for (const entry of result.ran) {
          console.log(`${entry.status === 0 ? '✅' : '❌'} npm run ${entry.name}`);
          if (entry.status !== 0 && entry.stderr.trim()) console.error(entry.stderr.trim());
        }
      }
      process.exit(result.ok ? 0 : 1);
    }
    process.exit(0);
  }

  console.log(json ? JSON.stringify(report, null, 2) : render(report));
  process.exit(report.problems.length > 0 ? 1 : 0);
}

if (require.main === module) main();

module.exports = { analyse, render, discoverGuards, readTier, readScripts, expand, runnersOf, resolveGate, isMirror, leadingDocblock, alwaysRunners, runAlways, TIERS, SCRIPTS, REPO };
