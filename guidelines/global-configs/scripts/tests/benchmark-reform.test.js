const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO = path.resolve(__dirname, '../../../..');
const SCRIPT = path.join(REPO, 'guidelines/global-configs/scripts/benchmark-reform.js');
const BEFORE = 'ec55a54';

const run = (args) => runSync(process.execPath, [SCRIPT, ...args], { cwd: REPO });
const json = (args) => {
  const result = run(args);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};

const HISTORY = runSync('git', ['rev-parse', '--verify', `${BEFORE}^{commit}`], { cwd: REPO }).status === 0;
const needsHistory = { skip: HISTORY ? false : `git history for ${BEFORE} is unavailable` };

test('the benchmark reports cost, retention, and reach for every task', needsHistory, () => {
  const report = json(['--json']);

  assert.equal(report.beforeRef, BEFORE);
  assert.equal(report.tasks.length, 18);
  assert.equal(new Set(report.tasks.map((task) => task.id)).size, 18, 'task ids must be unique');
  assert.deepEqual(report.problems, []);
  assert.ok(report.boot.beforeFull > report.boot.after, 'the lean chain must be smaller than the full pre-reform chain');
  assert.ok(report.boot.after < report.boot.beforeDeclared.tokens, 'the lean chain must be smaller than even the declared pre-reform set');
  assert.equal(report.boot.savings, report.boot.beforeFull - report.boot.after);

  for (const task of report.tasks) {
    assert.ok(task.ruleBefore, `${task.id}: the catalog rule must match the before ref`);
    assert.ok(task.ruleAfter, `${task.id}: the rule must survive the reform`);
    assert.ok(task.indexedAfter, `${task.id}: the task file must stay discoverable from MASTER_INDEX.md`);
    assert.ok(task.fileAfter > 0, `${task.id}: the task file must exist`);
    if (task.skill) assert.ok(task.skill.loadable, `${task.id}: ${task.skill.name} must keep a name and description`);
  }
});

test('--check passes while every rule survives', needsHistory, () => {
  const result = run(['--check']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /every rule survived/);
});

test('an unknown argument is a usage error, not a finding', () => {
  const result = run(['--nope']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown argument/);
  assert.match(result.stderr, /Usage: node benchmark-reform\.js/);
});

test('an unresolvable before ref is a data error', () => {
  const result = run(['--before', 'definitely-not-a-ref']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /cannot resolve --before ref/);
});

test('--fleet measures registered projects without failing on an absent path', needsHistory, () => {
  const report = json(['--json', '--fleet']);
  assert.ok(report.fleet, 'the fleet section must be present');
  assert.ok(Array.isArray(report.fleet.projects), 'the fleet section must carry a project list');
  for (const project of report.fleet.projects) {
    if (project.missingProject) continue;
    assert.ok(project.chain >= project.floor, `${project.name}: the chain includes the floor`);
    assert.ok(project.files.length > 0, `${project.name}: at least AGENTS.md should be readable`);
  }
});
