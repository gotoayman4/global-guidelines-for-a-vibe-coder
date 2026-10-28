#!/usr/bin/env node

/**
 * check-mode-conformance.js — a declared mode is only a SPEED SETTING if the gate reads it.
 *
 * INTENT. The speed reform made the per-push gate mode-gated: `vibe` runs `gate:fast` plus the
 * `always` tier; `standard` runs lint + type-check + the full suite and defers the build; `guarded`
 * adds the build and the path-aware extras. The rules landed; the WIRING did not. Measured across
 * the fleet on 2026-10-23: two of seven projects declare `vibe`, and one of those two runs the
 * full pipeline on every push, because its hook never reads the mode at all. A fifth project has
 * no pre-push hook, so nothing enforces any mode there. `status:projects` reported all seven green
 * throughout, because it compares PROSE — the rules a project's `AGENTS.md` carries — and never
 * the hook that runs them. A mode nothing reads is a comment.
 *
 * WHAT THIS CHECKS, per project:
 *   - the mode declaration is one of `vibe` / `standard` / `guarded` (an unreadable value fails;
 *     an absent one is reported, because an undeclared project resolves to `standard`);
 *   - a pre-push hook exists at all — without one, no mode is enforced;
 *   - the hook BRANCHES on the declared mode, and the branch is on the MODE, not on some other
 *     condition — a docs-only fast path is a mode decision in disguise, and it is NOT accepted as
 *     one: it changes the cost of a docs push, not of the push the declared mode governs;
 *   - a `vibe` project does not run the full suite or the build: each step is evaluated by
 *     whether a `vibe` push can actually REACH it — across nested branches, `elif` chains and
 *     `!=` polarity. A build behind `if [ "$MODE" = "guarded" ]` is not charged to `vibe`; the
 *     same build moved into the vibe branch still is.
 *
 * WHY THE HOOK IS PARSED AND NOT EXECUTED. The gate's job is to decide, and this check's job is
 * to report that the gate was never wired to decide. Running seven projects' hooks would mean
 * running seven projects' test suites, which is the very cost the modes exist to avoid.
 *
 * WHAT IT DOES NOT PROVE: that any step ran. Execution evidence is a gate receipt
 * (`docs/gate-receipts/`); this check proves the WIRING, not that a command ran.
 *
 * USAGE:
 *   node check-mode-conformance.js                 # the fleet — a report, exit 0
 *   node check-mode-conformance.js <projectRoot>   # one project — exit 1 on a failure
 *   node check-mode-conformance.js --json          # machine-readable
 *
 * Exit codes: 0 = no failure (a fleet report always exits 0); 1 = a failure in the named
 *             project; 2 = usage error.
 *
 * @tier always — a mode the gate cannot read is a gate that guesses, and a guess is not a gate.
 *
 * Source: global-configs/scripts/check-mode-conformance.js
 */

const fs = require('fs');
const path = require('path');
const { readMode, MODES } = require('./lib/project-mode.js');
const { analyse, alwaysRunners } = require('./check-guard-tiers.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const PROJECTS_PATH = path.join(REPO_ROOT, 'sync-projects.json');

/** Where a project's pre-push hook can live. */
const HOOK_PATHS = [path.join('.husky', 'pre-push'), path.join('.git', 'hooks', 'pre-push')];

/**
 * The steps that make the gate the FULL pipeline — the ones `vibe` defers to the ship boundary.
 *
 * Both spellings are read: a hook that calls `npm test` directly, and the scaffold's own
 * `run_step test` wrapper. A reader that knew only the first read the scaffold's hook as carrying
 * no full pipeline at all — so a scaffolded project could move `run_step test` into its vibe
 * branch and still be reported conformant.
 */
const FULL_PIPELINE = [
  { re: /npm\s+(run\s+)?test(\s|$|--)/i, what: 'the full test suite' },
  { re: /npm\s+run\s+build(\s|$|--)/i, what: 'the build' },
  { re: /\brun_step\s+test(\s|$|--)/i, what: 'the full test suite' },
  { re: /\brun_step\s+build(\s|$|--)/i, what: 'the build' },
];

/**
 * Cut an inline comment off a line, leaving a `#` inside a quoted string alone.
 *
 * A `#` inside a string is not a comment, and a hook line like `echo "npm test -- --run"` is a
 * string, not a step. Stripping it would report a command the hook never runs.
 */
function stripInline(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

/**
 * The code of a hook: comments removed.
 *
 * A hook's header is a NORMATIVE LIST of its steps, and it names the modes in prose ("vibe
 * defers the build"). Matching that prose would report a mode branch in a hook that has none —
 * which is exactly what the fleet's mode-blind hooks do. So the comment lines go first, and only
 * what remains is read as code.
 */
function codeLines(text) {
  return text.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) return '';
    return stripInline(line).trimEnd();
  });
}

/** Three-valued mode logic — a condition we cannot evaluate is `unknown`, and never a pass. */
const NOT = { true: 'false', false: 'true', unknown: 'unknown' };

function every(values) {
  if (values.some((value) => value === 'false')) return 'false';
  return values.every((value) => value === 'true') ? 'true' : 'unknown';
}

function any(values) {
  if (values.some((value) => value === 'true')) return 'true';
  return values.every((value) => value === 'false') ? 'false' : 'unknown';
}

/** Does this `if` / `elif` condition test the MODE variable at all? */
function isModeCondition(condition) {
  return /\$\{?MODE\}?|\bmode\b/i.test(condition);
}

/**
 * What a condition's MODE part evaluates to when `MODE=<mode>`.
 *
 * Only the mode comparisons are evaluated; every other term is `unknown`, because whether it
 * holds is a runtime fact this checker does not simulate. `unknown` is never a pass: a step in an
 * unevaluable mode branch is charged to the mode under test.
 *
 * Assignments are not simulated either. The release override reassigns `MODE=standard` for one
 * push; this check answers the steady-state question — "without the override, what does a `vibe`
 * push pay?" — which is the question the mode declaration exists to answer.
 */
function evalModeCondition(condition, mode) {
  const comparison = /(?:\$\{?MODE\}?|\bmode\b)["']?\s*(?:={1,2}|!=)\s*("[^"]*"|'[^']*'|[\w.-]+)/gi;
  const results = [];
  for (const match of condition.matchAll(comparison)) {
    const value = match[1].replace(/^["']|["']$/g, '');
    const holds = match[0].includes('!=') ? mode !== value : mode === value;
    results.push(holds ? 'true' : 'false');
  }
  if (results.length === 0) return 'unknown';
  const joinsAnd = condition.includes('&&');
  const joinsOr = condition.includes('||');
  if (joinsAnd && joinsOr) return 'unknown';
  if (joinsOr) return any(results);
  if (joinsAnd) return every(results);
  return results[0];
}

/** The condition text of an `if` / `elif` line, without the keyword and the trailing `then`. */
function conditionOf(line, keyword) {
  return line
    .replace(new RegExp(`^\\s*${keyword}\\b`), '')
    .replace(/;\s*then\s*$/, '')
    .trim();
}

/**
 * Where a step sits, and whether `MODE=<mode>` can reach it.
 *
 * A frame is MODE-RELEVANT when any of its branch conditions tests the mode. A non-mode frame
 * (`if [ -f .env ]`) is not a mode decision: it does not change whether the mode reaches the
 * step, so it never blocks reachability. A mode frame that evaluates `false` does block it — and
 * that verdict comes from the WHOLE chain, not the innermost branch: the build in
 * `if vibe … else …; if guarded … fi; fi` is unreachable in vibe because the outer else is.
 */
function classify(frames, mode) {
  let modeSeen = false;
  let reachable = true;
  let definitely = false;

  for (const frame of frames) {
    if (!frame.conditions.some(isModeCondition)) continue;
    modeSeen = true;
    const values = frame.conditions.map((condition) => evalModeCondition(condition, mode));
    const truth = frame.inElse
      ? every(values.map((value) => NOT[value]))
      : every([...values.slice(0, frame.current).map((value) => NOT[value]), values[frame.current]]);
    if (truth === 'false') {
      reachable = false;
      break;
    }
    if (truth === 'true') definitely = true;
  }

  if (!modeSeen) return { runsInVibe: true, text: 'outside every mode branch — it runs in every mode' };
  if (!reachable) return { runsInVibe: false, text: 'inside the non-vibe branch' };
  return {
    runsInVibe: true,
    text: definitely
      ? 'inside the vibe branch — the fast mode pays the full cost'
      : 'inside a mode branch',
  };
}

/**
 * The hook's shape: does it branch on the mode, and would a `vibe` push run the full pipeline?
 *
 * The hook is read as a flat list of lines with an `if`-frame stack (`if` / `elif` / `else` /
 * `fi`). For every full-pipeline step each enclosing frame's branch is evaluated under
 * `MODE=vibe`, so the step is charged exactly when a vibe push can reach it.
 *
 * @param {string} text the hook's source
 * @returns {{branches: boolean, fullPipeline: Array<{line: number, what: string, where: string, runsInVibe: boolean}>}}
 */
function analyseHook(text) {
  const lines = codeLines(text);
  const frames = [];
  const fullPipeline = [];
  let branches = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    if (/^fi\b/.test(line)) {
      frames.pop();
      continue;
    }
    if (/^else\b/.test(line)) {
      const frame = frames[frames.length - 1];
      if (frame) frame.inElse = true;
      continue;
    }
    if (/^elif\b/.test(line)) {
      const condition = conditionOf(line, 'elif');
      const frame = frames[frames.length - 1];
      if (frame) {
        frame.conditions.push(condition);
        frame.current += 1;
      }
      if (isModeCondition(condition)) branches = true;
      continue;
    }
    if (/^if\b/.test(line)) {
      const condition = conditionOf(line, 'if');
      frames.push({ conditions: [condition], current: 0, inElse: false });
      if (isModeCondition(condition)) branches = true;
      continue;
    }

    for (const step of FULL_PIPELINE) {
      if (!step.re.test(lines[i])) continue;
      // A suite scoped to ANOTHER package (the desktop app's own lane) is a security step that
      // runs in every mode by design; the suite the mode governs is the project's own.
      if (/\(\s*cd\s/.test(lines[i])) break;
      const where = classify(frames, 'vibe');
      fullPipeline.push({ line: i + 1, what: step.what, where: where.text, runsInVibe: where.runsInVibe });
      break;
    }
  }

  return { branches, fullPipeline };
}

/** The project's pre-push hook, if it has one. */
function findHook(root) {
  for (const rel of HOOK_PATHS) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

/**
 * The always tier a project wires, or null when it cannot be derived.
 *
 * The set comes from the guards' own `@tier` docblocks through the same derivation the gate
 * uses, so the answer cannot be a list somebody forgot to update.
 */
function alwaysWired(root) {
  const mirrorScripts = path.join(root, '_guidelines', 'global-configs', 'scripts');
  if (!fs.existsSync(mirrorScripts)) return { wired: null, reason: 'the _guidelines/ mirror is not synced, so no tier can be derived' };
  if (!fs.existsSync(path.join(root, 'package.json'))) {
    return { wired: null, reason: 'no package.json at the project root, so the npm wiring cannot be read' };
  }
  const report = analyse(mirrorScripts, root);
  const runners = alwaysRunners(report);
  if (runners.length === 0) return { wired: false, reason: 'no always-tier guard is wired into an npm script' };
  return { wired: true, runners };
}

/**
 * Judge one project.
 *
 * @param {string} root the project root
 * @returns {{root: string, mode: string|null, declared: boolean, hook: string|null, failures: string[], advisories: string[]}}
 */
function examine(root) {
  const failures = [];
  const advisories = [];
  const answer = readMode(root);

  let mode = null;
  if (answer.value && !MODES.includes(answer.value)) {
    failures.push(`WORLD.md declares \`${answer.value}\`, which is not one of vibe / standard / guarded — ${answer.reason}`);
  } else if (!answer.declared) {
    advisories.push(`no readable mode declaration — ${answer.reason}; the gate resolves to \`standard\``);
  } else {
    mode = answer.mode;
  }

  const hook = findHook(root);
  if (!hook) {
    failures.push('no pre-push hook — nothing enforces the declared mode');
    return { root, mode, declared: answer.declared, hook: null, failures, advisories };
  }

  const analysis = analyseHook(fs.readFileSync(hook, 'utf8'));
  if (!analysis.branches) {
    const line = 'the hook runs one chain for every mode — it never reads the declared mode';
    if (mode === 'vibe') failures.push(line);
    else advisories.push(`${line}; declaring \`vibe\` would change nothing`);
  }

  if (mode === 'vibe') {
    for (const step of analysis.fullPipeline) {
      if (!step.runsInVibe) continue;
      failures.push(`${step.what} runs in a vibe push — ${step.where} (${path.basename(hook)}:${step.line})`);
    }
  }

  const tier = alwaysWired(root);
  if (tier.wired === false) advisories.push(tier.reason);
  else if (tier.wired === null) advisories.push(tier.reason);
  else advisories.push(`always-tier guards wired: ${tier.runners.join(', ')}`);

  return { root, mode, declared: answer.declared, hook, failures, advisories };
}

/** The fleet, from the registry the sync writes. */
function fleet() {
  if (!fs.existsSync(PROJECTS_PATH)) return { error: `cannot read ${PROJECTS_PATH}` };
  let projects;
  try {
    projects = JSON.parse(fs.readFileSync(PROJECTS_PATH, 'utf8'));
  } catch (err) {
    return { error: `cannot parse ${PROJECTS_PATH} — ${err.message}` };
  }
  return { projects: projects.map((p) => ({ name: p.name, root: p.path })) };
}

function renderReport(reports) {
  const lines = [];
  lines.push('═══════════════════════════════════════════');
  lines.push('  Mode Conformance — a declared mode the gate actually reads');
  lines.push('═══════════════════════════════════════════');
  for (const report of reports) {
    const name = report.name || path.basename(report.root);
    lines.push('');
    lines.push(`  ${name}`);
    lines.push(`    mode:  ${report.mode || '(none readable)'}`);
    lines.push(`    hook:  ${report.hook ? path.relative(report.root, report.hook) : '(none)'}`);
    for (const failure of report.failures) lines.push(`    ❌ ${failure}`);
    for (const advisory of report.advisories) lines.push(`    ℹ️  ${advisory}`);
    if (report.failures.length === 0 && report.advisories.length === 0) lines.push('    ✅ conforms');
  }
  lines.push('');
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const roots = argv.filter((arg) => !arg.startsWith('-'));
  if (roots.length > 1) {
    console.error('Usage: node check-mode-conformance.js [<projectRoot>] [--json]');
    process.exit(2);
  }

  let reports;
  if (roots.length === 1) {
    reports = [{ name: path.basename(path.resolve(roots[0])), root: path.resolve(roots[0]) }].map((target) =>
      Object.assign({ name: target.name }, examine(target.root)),
    );
  } else {
    const fleetResult = fleet();
    if (fleetResult.error) {
      console.error(`❌ ${fleetResult.error}`);
      process.exit(2);
    }
    reports = fleetResult.projects.map((project) => Object.assign({ name: project.name }, examine(project.root)));
  }

  const failures = reports.flatMap((report) => report.failures);

  if (json) {
    console.log(JSON.stringify({ reports, failures: failures.length }, null, 2));
  } else {
    console.log(renderReport(reports));
    console.log(
      failures.length === 0
        ? '  ✅ no project declares a mode its gate ignores'
        : `  ❌ ${failures.length} conformance failure(s) — a declared mode the gate does not read`,
    );
    console.log('');
  }

  // A single project fails the build; the fleet report never does — it exists to name the debt.
  process.exit(roots.length === 1 && failures.length > 0 ? 1 : 0);
}

if (require.main === module) main();

module.exports = { examine, analyseHook, codeLines, stripInline, findHook, alwaysWired, fleet, renderReport, FULL_PIPELINE };
