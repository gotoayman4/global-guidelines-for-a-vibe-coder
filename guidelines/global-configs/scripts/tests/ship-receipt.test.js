const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');
const { run, buildSteps, parseReceipt, RECEIPT_DIR } = require('../gate-receipt.js');
const { examine } = require('../check-ship-receipt.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const GUARD = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/check-ship-receipt.js');
const WRAPPER = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/gate-receipt.js');

const OK = 'node ok.js';
const CHAIN = { lint: OK, 'type-check': OK, test: OK, build: OK, 'audit:gate': OK };

const git = (root, ...args) => runSync('git', args, { cwd: root });

/** A committed project whose chain scripts all succeed, unless `scripts` says otherwise. */
function project(scripts = CHAIN, { receiptScript = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-receipt-'));
  const all = receiptScript ? { 'gate:receipt': 'node scripts/gate-receipt.js', ...scripts } : scripts;
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'demo', scripts: all }, null, 2));
  fs.writeFileSync(path.join(root, 'ok.js'), '// a step that passes\n');
  fs.writeFileSync(path.join(root, 'fail3.js'), 'process.exit(3);\n');
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'ship@example.com');
  git(root, 'config', 'user.name', 'Ship Test');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'init');
  return root;
}

const commitAll = (root, message) => {
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', message);
};

let tick = 0;
const later = () => new Date(Date.UTC(2026, 9, 29, 12, 0, (tick += 1)));
const latest = (root) => {
  const dir = path.join(root, RECEIPT_DIR);
  return path.join(dir, fs.readdirSync(dir).sort().at(-1));
};

test('the chain is lint → type-check → suite → build → audit, and production adds the e2e suite', () => {
  assert.deepEqual(buildSteps('pilot', false).map((step) => step.name), ['lint', 'type-check', 'test', 'build', 'audit']);
  assert.deepEqual(buildSteps('pilot', true).map((step) => step.name).at(-1), 'e2e');
  assert.deepEqual(buildSteps('production', false).map((step) => step.name).at(-1), 'e2e');
});

test('a passing chain writes a receipt that names the class and the commit', () => {
  const root = project({ ...CHAIN });
  const result = run({ root, releaseClass: 'pilot', now: later() });
  assert.equal(result.ok, true, result.reason);
  const receipt = parseReceipt(fs.readFileSync(result.file, 'utf8'));
  assert.deepEqual(
    { class: receipt.class, verdict: receipt.verdict, tree: receipt.tree },
    { class: 'pilot', verdict: 'PASS', tree: 'clean' },
  );
  assert.equal(receipt.commit, git(root, 'rev-parse', 'HEAD').stdout.trim());
  assert.match(fs.readFileSync(result.file, 'utf8'), /cached: none/);
});

test('REVERSAL PROOF: a missing script FAILS the receipt and the later steps are not run', () => {
  const { build, ...withoutBuild } = CHAIN;
  const root = project(withoutBuild);
  const result = run({ root, releaseClass: 'pilot', now: later() });
  assert.equal(result.ok, false);
  const text = fs.readFileSync(result.file, 'utf8');
  assert.match(text, /\*\*Verdict:\*\* FAIL/);
  assert.match(text, /script "build" is missing/);
  assert.match(text, /\| audit \|[^|]*\| not run \|/, 'a step after the failure is reported as not run, never as green');
});

test('a failing step fails the receipt with its exit code', () => {
  const root = project({ ...CHAIN, test: 'node fail3.js' });
  const result = run({ root, releaseClass: 'pilot', now: later() });
  assert.equal(result.ok, false);
  assert.match(fs.readFileSync(result.file, 'utf8'), /FAIL \(exit 3\)/);
});

test('a dirty tree is refused and no receipt is written', () => {
  const root = project({ ...CHAIN });
  fs.writeFileSync(path.join(root, 'scratch.txt'), 'uncommitted\n');
  const result = run({ root, releaseClass: 'pilot', now: later() });
  assert.equal(result.ok, false);
  assert.match(result.reason, /dirty/);
  assert.equal(fs.existsSync(path.join(root, RECEIPT_DIR)), false);
});

test('a production receipt needs test:e2e; a pilot one does not', () => {
  const pilotRoot = project({ ...CHAIN });
  assert.equal(run({ root: pilotRoot, releaseClass: 'pilot', now: later() }).ok, true);

  const root = project({ ...CHAIN });
  const missing = run({ root, releaseClass: 'production', now: later() });
  assert.equal(missing.ok, false);
  assert.match(fs.readFileSync(missing.file, 'utf8'), /script "test:e2e" is missing/);

  const withE2e = project({ ...CHAIN, 'test:e2e': OK });
  assert.equal(run({ root: withE2e, releaseClass: 'production', now: later() }).ok, true);
});

test('a project-owned chain replaces the default pipeline and owns what production means', () => {
  assert.deepEqual(buildSteps('production', false, 'gate:ship').map((step) => step.name), ['gate:ship']);
  assert.deepEqual(buildSteps('pilot', true, 'gate:ship').map((step) => step.name), ['gate:ship', 'e2e']);

  const root = project({ 'gate:ship': OK });
  const result = run({ root, releaseClass: 'production', chain: 'gate:ship', now: later() });
  assert.equal(result.ok, true, result.reason);
  const text = fs.readFileSync(result.file, 'utf8');
  assert.match(text, /\| gate:ship \|/);
  assert.doesNotMatch(text, /\| lint \|/, 'the default steps are not run beside the project chain');

  const missing = run({ root: project({}), releaseClass: 'pilot', chain: 'gate:ship', now: later() });
  assert.equal(missing.ok, false);
  assert.match(fs.readFileSync(missing.file, 'utf8'), /script "gate:ship" is missing/);
});

test('the wrapper CLI rejects a missing or unknown class with a usage error', () => {
  const root = project({ ...CHAIN });
  assert.equal(runSync(process.execPath, [WRAPPER], { cwd: root }).status, 2);
  assert.equal(runSync(process.execPath, [WRAPPER, '--class', 'beta'], { cwd: root }).status, 2);
});

// ─── The guard: a release push owes a receipt for the code it ships ─────────────

function shipped(releaseClass = 'pilot', scripts = { ...CHAIN, 'test:e2e': OK }) {
  const root = project(scripts);
  const result = run({ root, releaseClass, now: later() });
  assert.equal(result.ok, true, result.reason);
  commitAll(root, 'receipt');
  return root;
}

test('a repository with no `gate:receipt` script owes none', () => {
  const root = project({ ...CHAIN }, { receiptScript: false });
  assert.equal(examine(root, 'pilot').state, 'not-applicable');
  assert.equal(examine(REPO_ROOT, 'pilot').state, 'not-applicable', 'this repository owes no receipt');
});

test('a committed receipt for HEAD passes — committing the receipt does not invalidate it', () => {
  const root = shipped('pilot');
  assert.equal(examine(root, 'pilot').state, 'ok');
});

test('REVERSAL PROOF: no receipt at all FAILS and says how to make one', () => {
  const root = project({ ...CHAIN });
  const verdict = examine(root, 'pilot');
  assert.equal(verdict.state, 'fail');
  assert.match(verdict.reason, /npm run gate:receipt -- --class pilot/);
});

test('REVERSAL PROOF: code changed after the receipt makes it stale', () => {
  const root = shipped('pilot');
  fs.writeFileSync(path.join(root, 'feature.js'), 'module.exports = 1;\n');
  commitAll(root, 'feature');
  const verdict = examine(root, 'pilot');
  assert.equal(verdict.state, 'fail');
  assert.match(verdict.reason, /feature\.js/);
});

test('an uncommitted source edit after the receipt is stale too', () => {
  const root = shipped('pilot');
  fs.writeFileSync(path.join(root, 'ok.js'), '// edited after the receipt\n');
  assert.equal(examine(root, 'pilot').state, 'fail');
});

test('a pilot receipt does not satisfy a production push; a production receipt satisfies a pilot one', () => {
  assert.equal(examine(shipped('pilot'), 'production').state, 'fail');
  assert.equal(examine(shipped('production'), 'pilot').state, 'ok');
  assert.equal(examine(shipped('production'), 'production').state, 'ok');
});

test('a FAIL receipt never satisfies the guard', () => {
  const root = project({ ...CHAIN, lint: 'node fail3.js' });
  run({ root, releaseClass: 'pilot', now: later() });
  commitAll(root, 'failing receipt');
  const verdict = examine(root, 'pilot');
  assert.equal(verdict.state, 'fail');
  assert.match(verdict.reason, /not PASS/);
});

test('the newest receipt decides', () => {
  const root = project({ ...CHAIN });
  run({ root, releaseClass: 'pilot', now: later() });
  commitAll(root, 'first');
  fs.writeFileSync(path.join(root, 'ok.js'), '// changed\n');
  commitAll(root, 'change');
  assert.equal(examine(root, 'pilot').state, 'fail', 'the old receipt predates the change');
  run({ root, releaseClass: 'pilot', now: later() });
  commitAll(root, 'second');
  assert.equal(examine(root, 'pilot').state, 'ok');
  assert.equal(parseReceipt(fs.readFileSync(latest(root), 'utf8')).verdict, 'PASS');
});

test('the guard CLI exits 1 on a stale receipt, 0 on a good one, 2 on a bad class', () => {
  const good = shipped('pilot');
  assert.equal(runSync(process.execPath, [GUARD, good], { cwd: REPO_ROOT }).status, 0);
  const bad = project({ ...CHAIN });
  assert.equal(runSync(process.execPath, [GUARD, bad], { cwd: REPO_ROOT }).status, 1);
  assert.equal(runSync(process.execPath, [GUARD, good, '--class', 'beta'], { cwd: REPO_ROOT }).status, 2);
});
