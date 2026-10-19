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

test('mergeGateScripts adds gate:fast only, and includes changed tests when a test script exists', () => {
  const { pkg: empty, changed } = mergeGateScripts({ name: 'x', scripts: { test: 'vitest' } });
  assert.equal(changed, true);
  assert.match(empty.scripts['gate:fast'], /npm test -- --run --changed/);
  assert.equal(empty.scripts['gate:receipt'], undefined, 'an echo-only receipt is not evidence');

  const { pkg: untested } = mergeGateScripts({ name: 'x', scripts: {} });
  assert.ok(untested.scripts['gate:fast']);
  assert.doesNotMatch(untested.scripts['gate:fast'], /npm test/);

  const { changed: again } = mergeGateScripts(empty);
  assert.equal(again, false, 'existing gate scripts are not overwritten');
});

test('prePushHook branches on WORLD.md instead of baking a mode or claiming steps it omits', () => {
  const hook = prePushHook();
  assert.match(hook, /WORLD\.md/);
  assert.match(hook, /gate:fast/);
  assert.match(hook, /npm run build/, 'the standard branch runs the full pipeline');
  assert.doesNotMatch(hook, /# Order:/, 'it must not claim an order its command does not run');
  assert.doesNotMatch(hook, /audit|clean-tree/, 'it must not name steps that are absent from the hook');
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
