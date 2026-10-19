const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/check-skill-activations.js');
const { ACTIVATION_LOG, readActivations, knownSkills, validateActivations, parseLine } = require('../check-skill-activations.js');

/**
 * A project with a `_skills/` directory and, optionally, an activation log.
 *
 * The fixture is built in a temp dir on purpose: a test that asserts against the live fleet
 * passes only while that fleet is broken.
 */
function project({ skills = ['code-review', 'firestore-cost-optimization'], log = null } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-activations-'));
  for (const name of skills) {
    fs.mkdirSync(path.join(root, '_skills', name), { recursive: true });
    fs.writeFileSync(
      path.join(root, '_skills', name, 'SKILL.md'),
      `---\nname: ${name}\ndescription: Use when ${name} work is needed\n---\n\n# ${name}\n`
    );
  }
  if (log !== null) {
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'skill-activations.log'), log);
  }
  return root;
}

/** Run the validator against a fixture project. */
const run = (root, ...flags) => runSync(process.execPath, [SCRIPT, root, ...flags], { cwd: REPO_ROOT });

// ─── The healthy cases ───────────────────────────────────────────────────────

test('a project with no log is healthy — "no activations recorded yet", exit 0', () => {
  const root = project();
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /no activations recorded yet/);
});

test('a well-formed log exits 0 and reports the summary', () => {
  const log = [
    '# skill activations — appended when a skill is opened',
    '',
    '2026-10-19T14:03:00Z | code-review | review the uncommitted changes',
    '2026-10-19T15:10:00Z | code-review | review the commits on main',
    '2026-10-20T09:00:00Z | firestore-cost-optimization | estimate the monthly bill',
    '',
  ].join('\n');
  const root = project({ log });

  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /3 activations/);
  assert.match(result.stdout, /2 distinct skills/);
  assert.match(result.stdout, /2026-10-20T09:00:00Z/, 'the most recent activation is reported');
  assert.match(result.stdout, /skill-activations\.log/, 'the log path is reported');
});

test('comments and blank lines are ignored, not counted as activations', () => {
  const log = [
    '# a comment',
    '',
    '   ',
    '# another comment',
    '2026-10-19T14:03:00Z | code-review | review the changes',
    '',
  ].join('\n');
  const root = project({ log });

  const { entries } = readActivations(root);
  assert.equal(entries.length, 1, 'only the activation line is an entry');
  assert.equal(entries[0].lineNumber, 5, 'and it keeps the line number a reader sees');

  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1 activation,/);
});

test('a task description containing | is parsed as one field — the remainder is the task', () => {
  const log = '2026-10-19T14:03:00Z | code-review | fix the build | then rerun the tests\n';
  const root = project({ log });

  const { entries } = readActivations(root);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].task, 'fix the build | then rerun the tests');
  assert.equal(entries[0].skill, 'code-review', 'the skill name is not polluted by the extra separator');

  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1 activation,/);
});

// ─── The failures ────────────────────────────────────────────────────────────

test('a line with too few fields is malformed — exit 1, naming the line', () => {
  const log = [
    '# skill activations',
    '2026-10-19T14:03:00Z | code-review | review the changes',
    '2026-10-19T14:04:00Z | code-review',
    '',
  ].join('\n');
  const root = project({ log });

  const result = run(root);
  assert.equal(result.status, 1, 'a malformed line fails the check');
  assert.match(result.stderr, /line 3/, 'the line number is reported');
  assert.match(result.stderr, /expected 3 fields/);
});

test('an unknown skill name is a false receipt — exit 1, naming the skill', () => {
  const log = [
    '2026-10-19T14:03:00Z | code-review | review the changes',
    '2026-10-19T14:04:00Z | firestore-cost-optimization | estimate the monthly bill',
    '',
  ].join('\n');
  const root = project({ skills: ['code-review'], log });

  const result = run(root);
  assert.equal(result.status, 1, 'a skill the project does not carry fails the check');
  assert.match(result.stderr, /line 2/);
  assert.match(result.stderr, /firestore-cost-optimization/);
});

test('an invalid timestamp is malformed — exit 1, naming the line and the value', () => {
  const log = [
    '2026-10-19T14:03:00Z | code-review | review the changes',
    'yesterday | code-review | review the changes',
    '',
  ].join('\n');
  const root = project({ log });

  const result = run(root);
  assert.equal(result.status, 1, 'a bad timestamp fails the check');
  assert.match(result.stderr, /line 2/);
  assert.match(result.stderr, /ISO-8601/);
});

test('a Date.parse-garbage timestamp is rejected, not accepted as a plausible date', () => {
  // `Date.parse('12')` is a date in 2001. A receipt that is wrong about WHEN is wrong in a way
  // nobody notices, so the shape is checked before the parse.
  const root = project({ log: '12 | code-review | review the changes\n' });
  const result = run(root);
  assert.equal(result.status, 1, 'a bare number is not a timestamp');
  assert.match(result.stderr, /ISO-8601/);
});

test('an empty task and an empty skill name are both malformed', () => {
  const noTask = project({ log: '2026-10-19T14:03:00Z | code-review |   \n' });
  const taskResult = run(noTask);
  assert.equal(taskResult.status, 1);
  assert.match(taskResult.stderr, /task description is empty/);

  const noSkill = project({ log: '2026-10-19T14:03:00Z |  | review the changes\n' });
  const skillResult = run(noSkill);
  assert.equal(skillResult.status, 1);
  assert.match(skillResult.stderr, /skill name is empty/);
});

// ─── The exported functions, consumed without shelling out ───────────────────

test('readActivations reports a missing log rather than throwing', () => {
  const root = project();
  const result = readActivations(root);
  assert.equal(result.exists, false);
  assert.deepEqual(result.entries, []);
  assert.match(result.path, /skill-activations\.log$/);
});

test('knownSkills returns what the project was delivered, not the central corpus', () => {
  const root = project({ skills: ['code-review'] });
  const known = knownSkills(root);
  assert.ok(known instanceof Set);
  assert.deepEqual([...known].sort(), ['code-review']);
  assert.ok(!known.has('firestore-cost-optimization'), 'a skill the project does not carry is unknown');
});

test('validateActivations returns the errors with their line numbers', () => {
  const root = project({
    skills: ['code-review'],
    log: '2026-10-19T14:03:00Z | code-review | review\n2026-10-19T14:04:00Z | unknown-skill | review\n',
  });
  const { entries } = readActivations(root);
  const report = validateActivations(root, entries);
  assert.equal(report.errors.length, 1);
  assert.equal(report.errors[0].lineNumber, 2);
  assert.match(report.errors[0].reason, /unknown skill "unknown-skill"/);
  assert.equal(report.total, 2);
  assert.equal(report.distinctSkills, 2);
  assert.equal(report.lastActivatedAt, '2026-10-19T14:04:00Z');
});

test('parseLine keeps the line number and the reason a line was rejected', () => {
  const good = parseLine('2026-10-19T14:03:00Z | code-review | review the changes', 7);
  assert.equal(good.malformed, false);
  assert.equal(good.lineNumber, 7);
  assert.equal(good.timestamp, '2026-10-19T14:03:00Z');
  assert.equal(good.skill, 'code-review');
  assert.equal(good.task, 'review the changes');

  const bad = parseLine('2026-10-19T14:03:00Z | code-review', 9);
  assert.equal(bad.malformed, true);
  assert.equal(bad.lineNumber, 9);
  assert.match(bad.reason, /expected 3 fields/);
});

// ─── The CLI contract ───────────────────────────────────────────────────────

test('the CLI rejects an unknown flag', () => {
  assert.equal(runSync(process.execPath, [SCRIPT, '--nope'], { cwd: REPO_ROOT }).status, 2);
});

test('with no project root the CLI checks the working directory', () => {
  // The project root DEFAULTS TO THE CWD: a guard is run from the project it guards, so requiring
  // the path would only add a way to point the check at the wrong tree. The upstream repo has no
  // activation log, which is NOT an error — absence is "no activations recorded yet".
  const result = runSync(process.execPath, [SCRIPT], { cwd: REPO_ROOT });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /no activations recorded yet/);
});

test('--quiet keeps the exit code and drops the summary', () => {
  const root = project({ log: '2026-10-19T14:03:00Z | code-review | review the changes\n' });
  const result = run(root, '--quiet');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '', 'no summary is printed');
});
