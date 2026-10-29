const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/new-project.js');
const { injectMode, mergeGateScripts, prePushHook, parseArgs } = require('../new-project.js');

const STARTERS = path.join(REPO_ROOT, 'guidelines/global-configs/templates');

function makeProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'new-project-'));
  return root;
}

function run(args, cwd) {
  return runSync(process.execPath, [SCRIPT, ...args], { cwd: cwd || REPO_ROOT });
}

test('injectMode inserts a Speed Mode section once and is idempotent', () => {
  const world = fs.readFileSync(path.join(STARTERS, 'WORLD.starter.md'), 'utf8');
  const once = injectMode(world, 'vibe');
  assert.match(once, /## Speed Mode/);
  assert.match(once, /\*\*mode:\*\* `vibe`/);
  assert.match(once, /initialized as `vibe` by new-project\.js/);
  assert.ok(once.indexOf('## Speed Mode') < once.indexOf('## What This Project Is'));

  const twice = injectMode(once, 'guarded');
  const occurrences = twice.match(/## Speed Mode/g) || [];
  assert.equal(occurrences.length, 1, 'must not insert a second Speed Mode block');
});

test('injectMode records the init on the Set line and never scaffolds a transition log (D428)', () => {
  const world = fs.readFileSync(path.join(STARTERS, 'WORLD.starter.md'), 'utf8');
  const once = injectMode(world, 'vibe');
  assert.doesNotMatch(once, /Transition log/, 'a boot file carries no history — commits record mode changes');
  assert.match(once, /\*\*Set:\*\* \d{4}-\d{2}-\d{2} — initialized as/, 'the Set line is the one dated record');
  assert.match(once, /\*\*Escalation:\*\* [^]*release override/, 'a release exit escalates via the override');

  const twice = injectMode(once, 'guarded');
  assert.match(twice, /\*\*mode:\*\* `guarded`/, 'a re-inject follows the mode argument');
  assert.match(twice, /initialized as `vibe` by new-project\.js/, 'the init record is never rewritten');
});

test('injectMode records mode changes in commits when seeding missing mode guidance', () => {
  for (const world of [
    '## What This Project Is\nA project.\n',
    '## Speed Mode\n- **mode:** `standard`\n\n## What This Project Is\nA project.\n',
  ]) {
    const seeded = injectMode(world, 'vibe');
    assert.match(seeded, /Record the reason in the commit message/);
    assert.doesNotMatch(seeded, /docs\/changelog/);
  }
});

test('mergeGateScripts adds the fast gate and the audit wrapper, and includes changed tests when a test script exists', () => {
  const { pkg: empty, changed, warnings } = mergeGateScripts({ name: 'x', scripts: { test: 'vitest' } });
  assert.equal(changed, true);
  assert.deepEqual(warnings, [], 'a project with a test script gets no warning');
  assert.match(empty.scripts['gate:fast'], /npm test -- --run --changed/);
  assert.equal(empty.scripts['gate:receipt'], 'node scripts/gate-receipt.js', 'the receipt is a real, seeded wrapper — never an echo');
  assert.equal(empty.scripts['audit:gate'], 'node scripts/audit-gate.js', 'the audit runs through a wrapper');
  for (const name of ['guard:tiers', 'guard:mode', 'guard:ship', 'docs:census']) {
    assert.match(empty.scripts[name], /^node _guidelines\/global-configs\/scripts\/check-[\w-]+\.js \.$/, `${name} wires a mirror guard`);
  }

  const { pkg: untested, warnings: untestedWarnings } = mergeGateScripts({ name: 'x', scripts: {} });
  assert.ok(untested.scripts['gate:fast']);
  assert.doesNotMatch(untested.scripts['gate:fast'], /npm test/);
  assert.equal(untestedWarnings.length, 1, 'a fast gate with no test runner says so');
  assert.match(untestedWarnings[0], /verifies no behavior/);

  const { changed: again } = mergeGateScripts(empty);
  assert.equal(again, false, 'existing gate scripts are not overwritten');
});

test('mergeGateScripts names the test script the project actually has', () => {
  // A project whose only lane is `test:unit` got `npm test`, which resolves to npm's placeholder
  // (`Error: no test specified`) and fails a project that does have tests.
  const { pkg } = mergeGateScripts({ name: 'x', scripts: { 'test:unit': 'vitest' } });
  assert.match(pkg.scripts['gate:fast'], /npm run test:unit -- --run --changed/);
  assert.doesNotMatch(pkg.scripts['gate:fast'], /npm test/);
});

test('prePushHook reads the mode through the shipped reader and fails safe', () => {
  const hook = prePushHook();
  assert.match(hook, /read-mode\.js/, 'the mode is read by the shipped reader');
  assert.doesNotMatch(hook, /grep -Eo/, 'a grep in the hook is a second reader of WORLD.md, and it drifts');
  assert.match(hook, /MODE=standard/, 'an unreadable mode falls back to the full chain');
  assert.match(hook, /gate:fast/, 'the vibe branch runs the fast gate');
  assert.match(hook, /run_step build/, 'the guarded branch runs the build');
  const guardedGuard = hook.indexOf('if [ "$MODE" = "guarded" ]');
  assert.ok(
    guardedGuard > 0 && guardedGuard < hook.indexOf('run_step build'),
    'the build sits behind the guarded condition, not in every non-vibe mode',
  );
});

test('the hook escalates a release through an override, never a WORLD.md edit (D428)', () => {
  const hook = prePushHook();
  assert.match(hook, /GS_RELEASE_GATE/, 'the one-push override trigger');
  assert.match(hook, /\.release-override/, 'the durable override marker');
  // The lift must run BEFORE anything branches on $MODE, or the override buys nothing.
  const lift = hook.indexOf('GS_RELEASE_GATE');
  const alwaysTier = hook.indexOf('check-guard-tiers.js');
  const branch = hook.indexOf('run_step gate:fast');
  assert.ok(lift > 0 && lift < alwaysTier && lift < branch, 'the lift applies before any branch reads MODE');
});

test('the hook runs the audit wrapper and the clean-tree check in every mode', () => {
  const hook = prePushHook();
  assert.match(hook, /run_step audit:gate/);
  assert.match(hook, /git diff --quiet HEAD/, 'the clean-tree check is decided on content');
  // The audit and the clean-tree check sit OUTSIDE the mode branch: `vibe` defers the full
  // suite, never the security or the honesty checks. Branch bodies are indented in this
  // scaffold; these two steps are not, and both follow the branch's last step.
  const branch = hook.indexOf('if [ "$MODE" = "vibe" ]');
  assert.ok(branch > 0, 'the mode branch exists');
  const auditLine = hook.split('\n').find((line) => line.trim() === 'run_step audit:gate');
  assert.ok(auditLine && !/^\s/.test(auditLine), 'the audit is not indented into a branch');
  assert.ok(hook.indexOf('run_step audit:gate') > hook.indexOf('run_step build'), 'the audit runs after the mode branch');
  assert.ok(hook.indexOf('git diff --quiet HEAD') > hook.indexOf('run_step audit:gate'), 'the clean-tree check runs last');
});

test('the hook derives the always tier instead of asking for it in a comment', () => {
  const hook = prePushHook();
  assert.match(hook, /check-guard-tiers\.js" --root \. --run-always/, 'the tier is derived, not listed');
  assert.doesNotMatch(hook, /always-tier guards here/, 'the old skeleton asked the reader to wire the tier by hand');
});

test('a required script the project does not have FAILS the hook — never skipped as green', () => {
  const hook = prePushHook();
  assert.match(hook, /pre-push FAIL: required script/, 'a missing required script is a failure');
  assert.match(hook, /run_step audit:gate/, 'the audit wrapper is required too');
  assert.doesNotMatch(hook, /npm run lint && npm run type-check/, 'a chained pipeline dies on the first missing script');
});

test('the hook states an order it actually runs', () => {
  const hook = prePushHook();
  assert.match(hook, /# Order: mode → always-tier → gate → audit → ship receipt \(release push only\) → clean-tree/);
  const order = ['read-mode.js', '--run-always', 'gate:fast', 'audit:gate', 'guard:ship', 'git diff --quiet HEAD'];
  let at = -1;
  for (const token of order) {
    const next = hook.indexOf(token, at + 1);
    assert.ok(next > at, `the hook runs ${token} in the order it claims`);
    at = next;
  }
});

test('the scaffold seeds the audit wrapper, its helper and the allowlist', () => {
  const project = makeProject();
  fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }, null, 2));

  const result = run([project, '--mode', 'vibe'], REPO_ROOT);
  assert.equal(result.status, 0);
  assert.ok(fs.existsSync(path.join(project, 'scripts/audit-gate.js')), 'the hook\'s audit step must resolve');
  assert.ok(fs.existsSync(path.join(project, 'scripts/lib/run-sync.js')), 'the seeded wrapper needs its capture helper');
  assert.ok(fs.existsSync(path.join(project, 'scripts/audit-allowlist.json')), 'the wrapper reads the accepted-risk list');
  assert.ok(fs.existsSync(path.join(project, 'scripts/gate-receipt.js')), 'the ship boundary needs a working receipt wrapper');
  const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['audit:gate'], 'node scripts/audit-gate.js');
  assert.equal(pkg.scripts['gate:receipt'], 'node scripts/gate-receipt.js');
  assert.match(result.stdout, /verifies no behavior/, 'the scaffold warns when the fast gate has no test runner');
});

test('parseArgs defaults mode to vibe and validates mode values', () => {
  const a = parseArgs(['./proj']);
  assert.equal(a.mode, 'vibe');
  assert.equal(a.projectPath, './proj');
  const b = parseArgs(['./proj', '--mode', 'guarded']);
  assert.equal(b.mode, 'guarded');
  assert.throws(() => parseArgs(['./proj', '--mode', 'yolo']), /invalid mode/);
  assert.throws(() => parseArgs([]), /projectPath/);
});

test('CLI --dry-run writes nothing', () => {
  const project = makeProject();
  fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }, null, 2));
  const result = run([project, '--mode', 'standard', '--dry-run'], REPO_ROOT);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /dry run/);
  assert.equal(fs.existsSync(path.join(project, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(project, 'WORLD.md')), false);
  assert.equal(fs.existsSync(path.join(project, 'README.md')), false);
});

test('CLI scaffolds create-if-missing files and never overwrites', () => {
  const project = makeProject();
  fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }, null, 2));

  const first = run([project, '--mode', 'vibe'], REPO_ROOT);
  assert.equal(first.status, 0);
  assert.ok(fs.existsSync(path.join(project, 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(project, 'README.md')), 'README.md is part of the mandated doc set');
  const world = fs.readFileSync(path.join(project, 'WORLD.md'), 'utf8');
  assert.match(world, /## Speed Mode/);
  assert.match(world, /`vibe`/);

  const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['gate:fast']);

  // Plant a sentinel, re-run: must not overwrite
  fs.writeFileSync(path.join(project, 'AGENTS.md'), '# SENTINEL\n');
  fs.writeFileSync(path.join(project, 'WORLD.md'), '# SENTINEL WORLD\n');
  fs.writeFileSync(path.join(project, 'README.md'), '# SENTINEL README\n');
  const second = run([project], REPO_ROOT);
  assert.equal(second.status, 0);
  assert.equal(fs.readFileSync(path.join(project, 'AGENTS.md'), 'utf8'), '# SENTINEL\n');
  assert.equal(fs.readFileSync(path.join(project, 'WORLD.md'), 'utf8'), '# SENTINEL WORLD\n');
  assert.equal(fs.readFileSync(path.join(project, 'README.md'), 'utf8'), '# SENTINEL README\n');
  assert.match(second.stdout, /exists — skipped/);
});

test('CLI rejects missing project path', () => {
  const missing = path.join(os.tmpdir(), 'no-such-project-xyz');
  const result = run([missing], REPO_ROOT);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not exist/);
});

/**
 * A project the hook can actually run: a git repository with one commit, so the clean-tree check
 * has a HEAD to compare against.
 */
function makeHookRepo(scripts, extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-repo-'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'hook-demo', scripts }, null, 2));
  fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n');
  for (const [name, content] of Object.entries(extra)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content, 'utf8');
  }
  runSync('git', ['init', '-q'], { cwd: root });
  runSync('git', ['config', 'user.email', 'hook@example.com'], { cwd: root });
  runSync('git', ['config', 'user.name', 'Hook Test'], { cwd: root });
  // The hook is committed with everything else: a file the fixture leaves untracked would be
  // caught by the clean-tree check, and that is the check's job, not this fixture's.
  fs.mkdirSync(path.join(root, '.husky'), { recursive: true });
  fs.writeFileSync(path.join(root, '.husky/pre-push'), prePushHook(), 'utf8');
  runSync('git', ['add', '-A'], { cwd: root });
  runSync('git', ['commit', '-q', '-m', 'init'], { cwd: root });
  // The markers land in the ignored directory: a step that writes into the tree would make the
  // clean-tree check fire, and that is the check's job, not this fixture's.
  fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true });
  return root;
}

/**
 * The POSIX shell the hook runs under. `sh` is rarely on a Windows PATH, but Git for Windows ships
 * one beside `git` — so a Windows maintainer who can push can also run these tests. Silently
 * skipping the six tests that prove the gate ladder would leave `npm run validate` green without
 * them, so a missing shell is a failure when GS_REQUIRE_SH or CI is set.
 */
function findSh() {
  const candidates = ['sh'];
  const exec = runSync('git', ['--exec-path']);
  if (exec.status === 0) {
    const gitRoot = path.resolve(exec.stdout.trim(), '..', '..', '..');
    candidates.push(path.join(gitRoot, 'bin', 'sh.exe'), path.join(gitRoot, 'usr', 'bin', 'sh.exe'));
  }
  return candidates.find((candidate) => runSync(candidate, ['--version']).status === 0) || null;
}

const SH_PATH = findSh();
const hasSh = SH_PATH !== null;
if (!hasSh) {
  const message = 'no POSIX sh found (PATH or Git for Windows) — the pre-push hook execution tests are SKIPPED';
  if (process.env.GS_REQUIRE_SH || process.env.CI) throw new Error(message);
  console.warn(`⚠️  ${message}; set GS_REQUIRE_SH=1 to make this fatal`);
}

/**
 * A script that records that it ran. It is a FILE, not an inline `node -e`, because the hook
 * passes `-- --run` to the test script — and `node -e "…" --run` would have node parse `--run` as
 * its own flag instead of handing it to the script.
 */
const MARKER = [
  "import { writeFileSync, mkdirSync } from 'node:fs';",
  "mkdirSync('node_modules', { recursive: true });",
  "writeFileSync(`node_modules/${process.argv[2]}.marker`, '1');",
  '',
].join('\n');

test('a project with no scripts at all FAILS — a gate that runs nothing is not a gate', { skip: hasSh ? false : 'no sh on PATH' }, () => {
  const root = makeHookRepo({});
  const result = runSync(SH_PATH, ['.husky/pre-push'], { cwd: root });
  assert.notEqual(result.status, 0, 'a missing required script must fail the push');
  assert.match(result.stdout, /mode=standard/);
  assert.match(result.stderr, /required script lint is missing/);
});

test('the hook fails a step that exists and fails', { skip: hasSh ? false : 'no sh on PATH' }, () => {
  const root = makeHookRepo({ lint: 'node -e "process.exit(3)"' });
  const result = runSync(SH_PATH, ['.husky/pre-push'], { cwd: root });
  assert.notEqual(result.status, 0, 'a failing step must fail the push');
});

test('a missing audit wrapper fails the hook in every mode', { skip: hasSh ? false : 'no sh on PATH' }, () => {
  for (const mode of ['vibe', 'standard', 'guarded']) {
    const root = makeHookRepo(
      {
        'gate:fast': 'node marker.mjs fast',
        lint: 'node marker.mjs lint',
        'type-check': 'node marker.mjs type',
        test: 'node marker.mjs test',
        build: 'node marker.mjs build',
      },
      { 'scripts/read-mode.js': `process.stdout.write('${mode}');\n`, 'marker.mjs': MARKER },
    );
    const result = runSync(SH_PATH, ['.husky/pre-push'], { cwd: root });
    assert.notEqual(result.status, 0, `${mode} must not pass without an audit`);
    assert.match(result.stderr, /required script audit:gate is missing/);
  }
});

test('the hook runs the fast gate in vibe and not the full pipeline', { skip: hasSh ? false : 'no sh on PATH' }, () => {
  // The reader is the vendored path the hook looks for; the corpus reader has its own test.
  const reader = 'console.log(process.env.HOOK_TEST_MODE || "standard");\n';
  const root = makeHookRepo(
    {
      'gate:fast': 'node marker.mjs fast',
      'audit:gate': 'node marker.mjs audit',
      lint: 'node marker.mjs lint',
      test: 'node marker.mjs test',
    },
    { 'scripts/read-mode.js': reader, 'marker.mjs': MARKER },
  );
  const result = runSync(SH_PATH, ['.husky/pre-push'], { cwd: root, env: { ...process.env, HOOK_TEST_MODE: 'vibe' } });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /mode=vibe/);
  assert.ok(fs.existsSync(path.join(root, 'node_modules/fast.marker')), 'the vibe branch runs gate:fast');
  assert.ok(fs.existsSync(path.join(root, 'node_modules/audit.marker')), 'the audit still runs in vibe');
  assert.ok(!fs.existsSync(path.join(root, 'node_modules/lint.marker')), 'the vibe branch must not run the full pipeline');
  assert.ok(!fs.existsSync(path.join(root, 'node_modules/test.marker')), 'the vibe branch must not run the suite');
});

test('the hook runs lint, type-check and the full suite in standard — and defers the build', { skip: hasSh ? false : 'no sh on PATH' }, () => {
  const root = makeHookRepo(
    {
      lint: 'node marker.mjs lint',
      'type-check': 'node marker.mjs type',
      test: 'node marker.mjs test',
      build: 'node marker.mjs build',
      'audit:gate': 'node marker.mjs audit',
    },
    { 'scripts/read-mode.js': 'console.log("standard");\n', 'marker.mjs': MARKER },
  );
  const result = runSync(SH_PATH, ['.husky/pre-push'], { cwd: root });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  for (const marker of ['lint', 'type', 'test', 'audit']) {
    assert.ok(fs.existsSync(path.join(root, `node_modules/${marker}.marker`)), `the standard gate runs ${marker}`);
  }
  // The build waits for the ship boundary: every release builds, and deploys what it built.
  assert.ok(!fs.existsSync(path.join(root, 'node_modules/build.marker')), 'standard defers the build to the ship boundary');
});

test('the hook adds the build in guarded', { skip: hasSh ? false : 'no sh on PATH' }, () => {
  const root = makeHookRepo(
    {
      lint: 'node marker.mjs lint',
      'type-check': 'node marker.mjs type',
      test: 'node marker.mjs test',
      build: 'node marker.mjs build',
      'audit:gate': 'node marker.mjs audit',
    },
    { 'scripts/read-mode.js': 'console.log("guarded");\n', 'marker.mjs': MARKER },
  );
  const result = runSync(SH_PATH, ['.husky/pre-push'], { cwd: root });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  for (const marker of ['lint', 'type', 'test', 'build', 'audit']) {
    assert.ok(fs.existsSync(path.join(root, `node_modules/${marker}.marker`)), `the guarded gate runs ${marker}`);
  }
});

/** A release-ready fixture: every chain script records that it ran; `guard:ship` records its args. */
function releaseRepo(mode) {
  return makeHookRepo(
    {
      lint: 'node marker.mjs lint',
      'type-check': 'node marker.mjs type',
      test: 'node marker.mjs test',
      build: 'node marker.mjs build',
      'audit:gate': 'node marker.mjs audit',
      'gate:fast': 'node marker.mjs fast',
      'guard:ship': 'node ship.mjs',
    },
    {
      'scripts/read-mode.js': `console.log("${mode}");\n`,
      'marker.mjs': MARKER,
      'ship.mjs': "import { writeFileSync, mkdirSync } from 'node:fs';\nmkdirSync('node_modules', { recursive: true });\nwriteFileSync('node_modules/ship.args', process.argv.slice(2).join(' '));\n",
      '_guidelines/global-configs/scripts/check-ship-receipt.js': '// present so the hook can find the synced guard\n',
    },
  );
}

const marked = (root, name) => fs.existsSync(path.join(root, `node_modules/${name}`));

test('a pilot override lifts vibe to the standard chain and checks the receipt for a pilot', { skip: hasSh ? false : 'no sh on PATH' }, () => {
  const root = releaseRepo('vibe');
  const result = runSync(SH_PATH, ['.husky/pre-push'], { cwd: root, env: { ...process.env, GS_RELEASE_GATE: 'pilot' } });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /pilot release override active/);
  assert.ok(marked(root, 'lint.marker') && marked(root, 'test.marker'), 'a pilot push runs the standard chain');
  assert.ok(!marked(root, 'build.marker'), 'the pilot push still defers the build — the receipt owes it');
  assert.ok(!marked(root, 'fast.marker'), 'the fast gate is replaced, not added');
  assert.equal(fs.readFileSync(path.join(root, 'node_modules/ship.args'), 'utf8'), '--class pilot');
});

test('a production override runs the guarded chain and demands a production receipt', { skip: hasSh ? false : 'no sh on PATH' }, () => {
  for (const declared of ['vibe', 'standard']) {
    const root = releaseRepo(declared);
    const result = runSync(SH_PATH, ['.husky/pre-push'], { cwd: root, env: { ...process.env, GS_RELEASE_GATE: 'production' } });
    assert.equal(result.status, 0, `${declared}: ${result.stdout}\n${result.stderr}`);
    assert.ok(marked(root, 'build.marker'), `${declared}: a production push runs the build`);
    assert.equal(fs.readFileSync(path.join(root, 'node_modules/ship.args'), 'utf8'), '--class production');
  }
});

test('the release marker file carries the class, and GS_RELEASE_GATE=1 is a pilot', { skip: hasSh ? false : 'no sh on PATH' }, () => {
  const legacy = releaseRepo('standard');
  const first = runSync(SH_PATH, ['.husky/pre-push'], { cwd: legacy, env: { ...process.env, GS_RELEASE_GATE: '1' } });
  assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);
  assert.equal(fs.readFileSync(path.join(legacy, 'node_modules/ship.args'), 'utf8'), '--class pilot');

  const root = releaseRepo('standard');
  fs.writeFileSync(path.join(root, '.release-override'), 'production\n');
  runSync('git', ['add', '-A'], { cwd: root });
  runSync('git', ['commit', '-q', '-m', 'marker'], { cwd: root });
  const result = runSync(SH_PATH, ['.husky/pre-push'], { cwd: root });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.ok(marked(root, 'build.marker'), 'the marker names the class');
  assert.equal(fs.readFileSync(path.join(root, 'node_modules/ship.args'), 'utf8'), '--class production');
});

test('an ordinary push never asks for a receipt, and a release push without the synced guard FAILS', { skip: hasSh ? false : 'no sh on PATH' }, () => {
  const plain = releaseRepo('standard');
  const ordinary = runSync(SH_PATH, ['.husky/pre-push'], { cwd: plain });
  assert.equal(ordinary.status, 0, `${ordinary.stdout}\n${ordinary.stderr}`);
  assert.ok(!marked(plain, 'ship.args'), 'only a release push owes a receipt');

  const unsynced = makeHookRepo(
    { lint: 'node marker.mjs lint', 'type-check': 'node marker.mjs type', test: 'node marker.mjs test', 'audit:gate': 'node marker.mjs audit' },
    { 'scripts/read-mode.js': 'console.log("standard");\n', 'marker.mjs': MARKER },
  );
  const result = runSync(SH_PATH, ['.husky/pre-push'], { cwd: unsynced, env: { ...process.env, GS_RELEASE_GATE: 'pilot' } });
  assert.notEqual(result.status, 0, 'a release push cannot skip the receipt check by not syncing');
  assert.match(result.stderr, /needs _guidelines\/ synced/);
});
