const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { runSync } = require('../lib/run-sync.js');
const { scoreScenario, scoreAll, loadScenarios } = require('../score-compliance.js');

const SCENARIOS = path.join(__dirname, '..', '..', 'evals', 'scenarios.json');
const SCRIPT = path.join(__dirname, '..', 'score-compliance.js');

test('every shipped scenario is well-formed with unique ids and compilable patterns', () => {
  const list = loadScenarios(SCENARIOS);
  assert.ok(list.length >= 10);
  assert.equal(new Set(list.map((s) => s.id)).size, list.length);
  for (const s of list) {
    assert.ok(s.rule && s.prompt && s.checks.length, s.id);
    for (const c of s.checks) {
      assert.ok(['output', 'diff', 'commands'].includes(c.target), `${s.id}: target`);
      assert.ok((c.forbid || c.require || []).length, `${s.id}: empty check`);
      for (const p of [...(c.forbid || []), ...(c.require || [])]) new RegExp(p, 'im');
    }
  }
});

test('a violating and a compliant run score fail and pass on the same scenario', () => {
  const s = loadScenarios(SCENARIOS).find((x) => x.id === 'destructive-git');
  assert.equal(scoreScenario(s, { commands: 'git reset --hard HEAD' }).status, 'fail');
  assert.equal(scoreScenario(s, { commands: 'git stash push -u' }).status, 'pass');
});

test('require checks fail when evidence is missing; no recorded result is skipped, not failed', () => {
  const s = loadScenarios(SCENARIOS).find((x) => x.id === 'report-without-evidence');
  assert.equal(scoreScenario(s, { commands: 'git diff', output: 'done' }).status, 'fail');
  assert.equal(scoreScenario(s, { commands: 'npm test', output: 'tests pass: 12/12' }).status, 'pass');
  assert.equal(scoreScenario(s, undefined).status, 'skipped');
});

test('physical-direction scenario catches a left/right CSS property and accepts logical ones', () => {
  const s = loadScenarios(SCENARIOS).find((x) => x.id === 'physical-direction');
  assert.equal(scoreScenario(s, { diff: '.side { margin-left: 8px; }' }).status, 'fail');
  assert.equal(scoreScenario(s, { diff: '.side { margin-inline-start: 8px; inset-inline-start: 0; }' }).status, 'pass');
});

test('scoreAll computes the rate over scored scenarios only', () => {
  const list = loadScenarios(SCENARIOS);
  const out = scoreAll(list, { 'destructive-git': { commands: 'git stash' }, 'no-verify': { commands: 'git commit --no-verify' } });
  assert.deepEqual([out.scored, out.passed, out.rate], [2, 1, 0.5]);
});

test('CLI exits 1 on a failing run, 0 on a clean one, 2 on a missing file', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-'));
  const bad = path.join(dir, 'bad.json');
  const good = path.join(dir, 'good.json');
  fs.writeFileSync(bad, JSON.stringify({ 'destructive-git': { commands: 'git clean -fd' } }));
  fs.writeFileSync(good, JSON.stringify({ 'destructive-git': { commands: 'git stash' } }));
  assert.equal(runSync(process.execPath, [SCRIPT, bad]).status, 1);
  assert.equal(runSync(process.execPath, [SCRIPT, good]).status, 0);
  assert.equal(runSync(process.execPath, [SCRIPT, path.join(dir, 'nope.json')]).status, 2);
});
