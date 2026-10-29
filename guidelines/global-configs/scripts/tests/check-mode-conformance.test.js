const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');
const { analyseHook, examine, codeLines, findHook, alwaysWired } = require('../check-mode-conformance.js');
const { analyse } = require('../check-guard-tiers.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/check-mode-conformance.js');

/**
 * A project root in the shape the guard reads: a `WORLD.md` that declares a mode and a
 * `.husky/pre-push` hook. The mirror is left absent on purpose — the always tier is then
 * "cannot be derived", which is an advisory and never changes the mode verdict.
 */
function project({ mode = 'standard', hook = null, world = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mode-conf-'));
  if (world !== null) {
    fs.writeFileSync(path.join(dir, 'WORLD.md'), world);
  } else {
    fs.writeFileSync(path.join(dir, 'WORLD.md'), `# WORLD\n\n## Speed Mode\n\n- **mode:** \`${mode}\`\n`);
  }
  if (hook !== null) {
    fs.mkdirSync(path.join(dir, '.husky'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.husky', 'pre-push'), hook);
  }
  return dir;
}

/** The full-pipeline entries a hook contains, as `what → where`. */
function pipeline(hook) {
  return analyseHook(hook).fullPipeline.map((step) => `${step.what} → ${step.where}`);
}

// ─── Reading a hook's shape ─────────────────────────────────────────────────

test('a hook that never mentions the mode has no branch', () => {
  const analysis = analyseHook('#!/bin/sh\nnpm run lint\nnpm test -- --run\n');
  assert.equal(analysis.branches, false);
});

test('a hook that branches on the mode has a branch', () => {
  const analysis = analyseHook('#!/bin/sh\nif [ "$MODE" = "vibe" ]; then\n  npm run gate:fast\nelse\n  npm test -- --run\nfi\n');
  assert.equal(analysis.branches, true);
});

test('the full suite in the non-vibe ELSE branch is not charged to the fast mode', () => {
  // The shape every correct hook has, and the one a parser that reads only the THEN side
  // misreads: the slow path is the ELSE side, so the fast mode never pays it.
  const hook = [
    '#!/bin/sh',
    'if [ "$MODE" = "vibe" ]; then',
    '  npm run test:unit',
    'else',
    '  npm test -- --run',
    'fi',
    '',
  ].join('\n');
  assert.deepEqual(pipeline(hook), ['the full test suite → inside the non-vibe branch']);
});

test('the full suite in the vibe THEN branch IS charged to the fast mode', () => {
  const hook = [
    '#!/bin/sh',
    'if [ "$MODE" = "vibe" ]; then',
    '  npm test -- --run',
    'else',
    '  npm run gate:fast',
    'fi',
    '',
  ].join('\n');
  assert.deepEqual(pipeline(hook), ['the full test suite → inside the vibe branch — the fast mode pays the full cost']);
});

test('a `!= "vibe"` condition is read backwards: its THEN side is the slow one', () => {
  const hook = [
    '#!/bin/sh',
    'if [ "$MODE" != "vibe" ]; then',
    '  npm test -- --run',
    'else',
    '  npm run gate:fast',
    'fi',
    '',
  ].join('\n');
  assert.deepEqual(pipeline(hook), ['the full test suite → inside the non-vibe branch']);
});

test('a suite that runs outside every mode branch runs in every mode', () => {
  const hook = '#!/bin/sh\nnpm test -- --run\nnpm run build\n';
  assert.deepEqual(pipeline(hook), [
    'the full test suite → outside every mode branch — it runs in every mode',
    'the build → outside every mode branch — it runs in every mode',
  ]);
});

test('the build is judged the same way as the suite', () => {
  const hook = [
    '#!/bin/sh',
    'if [ "$MODE" = "vibe" ]; then',
    '  npm run gate:fast',
    'else',
    '  npm run build',
    'fi',
    '',
  ].join('\n');
  assert.deepEqual(pipeline(hook), ['the build → inside the non-vibe branch']);
});

// ─── What the reader must NOT be fooled by ──────────────────────────────────

test('the header prose of a hook is not a branch', () => {
  // A hook's header is a normative list of its steps and it names the modes in prose. Reading
  // that prose as code would report a mode branch in a hook that has none — which is exactly
  // what the fleet's mode-blind hooks look like.
  const hook = [
    '#!/bin/sh',
    '# vibe defers the build to the ship boundary',
    '# if [ "$MODE" = "vibe" ]; then',
    'npm test -- --run',
    '',
  ].join('\n');
  const analysis = analyseHook(hook);
  assert.equal(analysis.branches, false, 'prose about a branch is not a branch');
  assert.deepEqual(pipeline(hook), ['the full test suite → outside every mode branch — it runs in every mode']);
});

test('a docs-only fast path is not a mode branch', () => {
  // It changes the cost of a docs push, not the cost of the push the declared mode governs.
  const hook = [
    '#!/bin/sh',
    'if [ "$DOCS_ONLY" = "1" ]; then',
    '  node scripts/docsGate.mjs',
    'else',
    '  npm test -- --run',
    'fi',
    '',
  ].join('\n');
  assert.equal(analyseHook(hook).branches, false);
});

test('another package\'s own suite is not the project suite', () => {
  // The desktop lane is governed by its own path trigger, not by the mode; the mode governs
  // the PROJECT's suite.
  const hook = [
    '#!/bin/sh',
    'if [ "$MODE" = "vibe" ]; then',
    '  npm run gate:fast',
    'else',
    '  npm test -- --run',
    '  (cd apps/desktop-electron && npm test) || exit 1',
    'fi',
    '',
  ].join('\n');
  assert.deepEqual(pipeline(hook), ['the full test suite → inside the non-vibe branch']);
});

test('a narrower lane is not the full suite', () => {
  // `npm run test:unit` is the fast lane the vibe mode runs; it is not the full pipeline.
  const hook = [
    '#!/bin/sh',
    'if [ "$MODE" = "vibe" ]; then',
    '  npm run test:unit',
    'else',
    '  npm test -- --run',
    'fi',
    '',
  ].join('\n');
  assert.deepEqual(pipeline(hook), ['the full test suite → inside the non-vibe branch']);
});

test('a build behind a nested guarded condition is not charged to vibe', () => {
  // The shape the scaffold writes: the build sits on the non-vibe side AND behind a guarded
  // test. A parser that reads only the innermost branch sees a `guarded` branch and, if it
  // charges anything not labelled non-vibe, bills the fast mode for a step it cannot reach.
  const hook = [
    '#!/bin/sh',
    'if [ "$MODE" = "vibe" ]; then',
    '  run_step gate:fast',
    'else',
    '  run_step lint',
    '  run_step test -- --run',
    '  if [ "$MODE" = "guarded" ]; then',
    '    run_step build',
    '  fi',
    'fi',
    '',
  ].join('\n');
  assert.deepEqual(pipeline(hook), [
    'the full test suite → inside the non-vibe branch',
    'the build → inside the non-vibe branch',
  ]);
  assert.equal(analyseHook(hook).fullPipeline[1].runsInVibe, false);
});

test('a nested guarded guard does not excuse a vibe-reachable step', () => {
  const hook = [
    '#!/bin/sh',
    'if [ "$MODE" = "vibe" ]; then',
    '  if [ "$MODE" = "guarded" ]; then',
    '    run_step build',
    '  fi',
    '  run_step test -- --run',
    'fi',
    '',
  ].join('\n');
  const analysis = analyseHook(hook);
  assert.equal(analysis.fullPipeline[0].runsInVibe, false, 'the inner guarded test makes the build unreachable in vibe');
  assert.equal(analysis.fullPipeline[1].runsInVibe, true, 'the suite still sits in the vibe branch');
});

test('an elif chain is evaluated branch by branch', () => {
  const hook = [
    '#!/bin/sh',
    'if [ "$MODE" = "vibe" ]; then',
    '  run_step gate:fast',
    'elif [ "$MODE" = "guarded" ]; then',
    '  run_step test -- --run',
    '  run_step build',
    'else',
    '  run_step test -- --run',
    'fi',
    '',
  ].join('\n');
  assert.deepEqual(pipeline(hook), [
    'the full test suite → inside the non-vibe branch',
    'the build → inside the non-vibe branch',
    'the full test suite → inside the non-vibe branch',
  ]);
});

test('a non-mode term in a compound condition is unknown, never silently dropped', () => {
  // `vibe && [ -f flag ]` is not plain `vibe`: when the flag is absent the ELSE side runs in vibe.
  // Dropping the flag made the else-branch build read as unreachable and the vibe push read as cheap.
  const hook = [
    '#!/bin/sh',
    'if [ "$MODE" = "vibe" ] && [ -f flag ]; then',
    '  run_step gate:fast',
    'else',
    '  run_step build',
    'fi',
    '',
  ].join('\n');
  const [build] = analyseHook(hook).fullPipeline;
  assert.equal(build.runsInVibe, true, 'a vibe push without the flag reaches the build');

  const orHook = [
    '#!/bin/sh',
    'if [ "$MODE" = "standard" ] || [ -f flag ]; then',
    '  run_step build',
    'fi',
    '',
  ].join('\n');
  assert.equal(analyseHook(orHook).fullPipeline[0].runsInVibe, true, 'the flag alone can reach the build in vibe');

  const decided = [
    '#!/bin/sh',
    'if [ "$MODE" = "guarded" ] && [ -f flag ]; then',
    '  run_step build',
    'fi',
    '',
  ].join('\n');
  assert.equal(analyseHook(decided).fullPipeline[0].runsInVibe, false, 'a false mode term decides an && whatever the flag says');
});

test('the scaffold spelling `run_step test` / `run_step build` is read as the full pipeline', () => {
  // The scaffold's hook wraps every step in a `run_step` helper that fails on a missing script.
  // A reader that knew only `npm test` read that hook as carrying no full pipeline at all, so a
  // scaffolded project could move `run_step test` into its vibe branch and pass.
  const hook = [
    '#!/bin/sh',
    'if [ "$MODE" = "vibe" ]; then',
    '  run_step gate:fast',
    '  run_step test -- --run',
    'else',
    '  run_step build',
    'fi',
    '',
  ].join('\n');
  assert.deepEqual(pipeline(hook), [
    'the full test suite → inside the vibe branch — the fast mode pays the full cost',
    'the build → inside the non-vibe branch',
  ]);
});

test('REVERSAL PROOF: moving `run_step test` into the vibe branch FAILS a vibe project', () => {
  const dir = project({
    mode: 'vibe',
    hook: [
      '#!/bin/sh',
      'if [ "$MODE" = "vibe" ]; then',
      '  run_step gate:fast',
      '  run_step test -- --run',
      'else',
      '  run_step test -- --run',
      '  run_step build',
      'fi',
      '',
    ].join('\n'),
  });
  const report = examine(dir);
  assert.match(report.failures.join('\n'), /the full test suite runs in a vibe push — inside the vibe branch/);
});

test('the scaffold\'s own hook conforms: its full pipeline sits in the non-vibe branch', () => {
  const { prePushHook } = require('../new-project.js');
  const hook = prePushHook();
  assert.deepEqual(pipeline(hook), [
    'the full test suite → inside the non-vibe branch',
    'the build → inside the non-vibe branch',
  ]);
  assert.deepEqual(examine(project({ mode: 'vibe', hook })).failures, []);
});

test('comments are stripped, and only the code is read', () => {
  const code = codeLines([
    '# a comment',
    'npm run lint # an inline comment',
    'echo "a # inside a string"',
    '',
  ].join('\n'));
  assert.deepEqual(code, ['', 'npm run lint', 'echo "a # inside a string"', '']);
});

// ─── Judging a project ───────────────────────────────────────────────────────

test('REVERSAL PROOF: a vibe project whose hook never reads the mode FAILS', () => {
  const dir = project({ mode: 'vibe', hook: '#!/bin/sh\nnpm run lint\nnpm test -- --run\nnpm run build\n' });
  const report = examine(dir);
  assert.ok(report.failures.length >= 2, JSON.stringify(report.failures));
  assert.match(report.failures.join('\n'), /never reads the declared mode/);
  assert.match(report.failures.join('\n'), /the full test suite runs in a vibe push/);
});

test('a vibe project whose hook branches correctly PASSES', () => {
  const dir = project({
    mode: 'vibe',
    hook: '#!/bin/sh\nif [ "$MODE" = "vibe" ]; then\n  npm run gate:fast\nelse\n  npm test -- --run\n  npm run build\nfi\n',
  });
  const report = examine(dir);
  assert.deepEqual(report.failures, [], JSON.stringify(report.failures));
  assert.equal(report.mode, 'vibe');
});

test('a standard project whose hook never reads the mode is ADVISORY, never fatal', () => {
  // Failing it would fail correct work: the standard chain is the chain, so a mode-blind hook
  // costs a standard project nothing.
  const dir = project({ mode: 'standard', hook: '#!/bin/sh\nnpm run lint\nnpm test -- --run\n' });
  const report = examine(dir);
  assert.deepEqual(report.failures, [], JSON.stringify(report.failures));
  assert.match(report.advisories.join('\n'), /never reads the declared mode/);
});

test('REVERSAL PROOF: a project with no hook FAILS — nothing enforces the mode', () => {
  const dir = project({ mode: 'standard', hook: null });
  const report = examine(dir);
  assert.match(report.failures.join('\n'), /no pre-push hook/);
});

test('a mode that is not one of the three FAILS and names the value', () => {
  const dir = project({ world: '# WORLD\n\n## Speed Mode\n\n- **mode:** `turbo`\n' });
  const report = examine(dir);
  assert.match(report.failures.join('\n'), /turbo/);
  assert.match(report.failures.join('\n'), /not one of vibe \/ standard \/ guarded/);
});

test('an undeclared mode is ADVISORY and resolves to standard', () => {
  const dir = project({ world: '# WORLD\n\n## Speed Mode\n\n- **speed:** `fast`\n', hook: '#!/bin/sh\nnpm run lint\n' });
  const report = examine(dir);
  assert.deepEqual(report.failures, [], JSON.stringify(report.failures));
  assert.match(report.advisories.join('\n'), /no readable mode declaration/);
  assert.match(report.advisories.join('\n'), /resolves to `standard`/);
});

test('the hook is found under .husky, and a project with no hook has none', () => {
  const dir = project({ hook: '#!/bin/sh\n' });
  assert.ok(findHook(dir).endsWith(path.join('.husky', 'pre-push')));
  assert.equal(findHook(fs.mkdtempSync(path.join(os.tmpdir(), 'mode-conf-none-'))), null);
});

test('the always tier is reported as underivable when the mirror is not synced', () => {
  const dir = project({ mode: 'vibe', hook: '#!/bin/sh\n' });
  const tier = alwaysWired(dir);
  assert.equal(tier.wired, null);
  assert.match(tier.reason, /mirror is not synced/);
});

// ─── CLI contract ───────────────────────────────────────────────────────────

test('the fleet report exits 0 even when it names failures', () => {
  // The fleet report exists to name the debt; it is the single-project mode that fails.
  const result = runSync(process.execPath, [SCRIPT], { cwd: REPO_ROOT });
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /Mode Conformance/);
});

test('a single project that does not conform exits 1', () => {
  const dir = project({ mode: 'vibe', hook: '#!/bin/sh\nnpm test -- --run\n' });
  const result = runSync(process.execPath, [SCRIPT, dir], { cwd: REPO_ROOT });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /never reads the declared mode/);
});

test('a single project that conforms exits 0', () => {
  const dir = project({
    mode: 'vibe',
    hook: '#!/bin/sh\nif [ "$MODE" = "vibe" ]; then\n  npm run gate:fast\nelse\n  npm test -- --run\nfi\n',
  });
  const result = runSync(process.execPath, [SCRIPT, dir], { cwd: REPO_ROOT });
  assert.equal(result.status, 0, result.stdout);
});

test('--json prints the report as JSON', () => {
  const dir = project({ mode: 'vibe', hook: '#!/bin/sh\nnpm test -- --run\n' });
  const result = runSync(process.execPath, [SCRIPT, dir, '--json'], { cwd: REPO_ROOT });
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.failures, 2, 'a mode-blind hook fails twice: the branch, and the unconditional suite');
  assert.equal(parsed.reports.length, 1);
  assert.equal(parsed.reports[0].mode, 'vibe');
});

test('the CLI rejects more than one project root with a usage error', () => {
  const result = runSync(process.execPath, [SCRIPT, 'a', 'b'], { cwd: REPO_ROOT });
  assert.equal(result.status, 2);
});

// ─── The control is wired into the gate ─────────────────────────────────────

test('the `always` tier this control declares is reached by the gate', () => {
  // `always` means every push, in every mode. A guard that declares it and the gate never
  // runs is a promise the gate contradicts — and `check-guard-tiers.js` is the control that
  // would say so.
  const report = analyse();
  assert.ok(report.reachedByGate.includes('check-mode-conformance.js'), 'the gate never reaches the mode control');
});
