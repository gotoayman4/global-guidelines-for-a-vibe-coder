const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/new-guideline.js');
const { buildContent, buildIndexRow, findSectionAnchor } = require('../new-guideline.js');

function makeIndexFixture() {
  return [
    '# Master Index',
    '',
    '## Index by Category',
    '',
    '### 01 — Workflow Methodology',
    '',
    '| File | Status | Scope | Tokens (Full) | Tags |',
    '|---|---|---|---|---|',
    '| [existing.md](../01-workflow-methodology/existing.md) | Normative | Global | ~800 | `#x` |',
    '',
    '### 02 — Engineering Practices',
    '',
    '| File | Status | Scope | Tokens (Full) | Tags |',
    '|---|---|---|---|---|',
    '| [other.md](../02-engineering-practices/other.md) | Normative | Global | ~800 | `#y` |',
    '',
  ].join('\n');
}

function run(args) {
  return childProcess.spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
}

test('buildContent produces frontmatter, directives, anti-patterns, cross-references', () => {
  const content = buildContent('My Topic — Purpose', '01-workflow-methodology');
  assert.match(content, /^# My Topic — Purpose/);
  assert.match(content, /\*\*Status:\*\* Normative/);
  assert.match(content, /\*\*Last Updated:\*\* \d{4}-\d{2}-\d{2}/);
  assert.match(content, /## Directives/);
  assert.match(content, /## Anti-Patterns/);
  assert.match(content, /## Cross-References/);
  assert.ok(!content.includes('[FILL]'), 'guideline scaffold must not contain [FILL] placeholders');
});

test('buildIndexRow links the file under its category', () => {
  const row = buildIndexRow('my-topic', '01-workflow-methodology');
  assert.match(row, /\[my-topic\.md\]\(\.\.\/01-workflow-methodology\/my-topic\.md\)/);
  assert.match(row, /\| Normative \|/);
});

test('findSectionAnchor locates the last row of the matching category only', () => {
  const index = makeIndexFixture();
  const anchor01 = findSectionAnchor(index, '01-workflow-methodology');
  assert.ok(anchor01 !== null);
  const before = index.slice(0, anchor01);
  const after = index.slice(anchor01);
  assert.match(before, /existing\.md/);
  assert.match(after, /### 02 — Engineering Practices/);
  assert.ok(!after.includes('existing.md'));

  const anchor02 = findSectionAnchor(index, '02-engineering-practices');
  assert.ok(anchor02 > anchor01);
});

test('findSectionAnchor returns null for unknown category', () => {
  assert.equal(findSectionAnchor(makeIndexFixture(), '99-does-not-exist'), null);
});

test('CLI rejects bad slug with usage exit 2', () => {
  const result = run(['01-workflow-methodology', 'Bad_Slug']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /kebab-case/);
});

test('CLI rejects missing args with usage exit 2', () => {
  const result = run([]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
});

test('CLI --dry-run reports file and index row without writing', () => {
  const result = run(['01-workflow-methodology', 'dry-run-topic', '--dry-run']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /dry run/);
  assert.match(result.stdout, /dry-run-topic\.md/);
  const created = path.join(REPO_ROOT, 'guidelines/01-workflow-methodology/dry-run-topic.md');
  assert.equal(fs.existsSync(created), false, 'dry-run must not create the file');
  const index = fs.readFileSync(path.join(REPO_ROOT, 'guidelines/_index/MASTER_INDEX.md'), 'utf8');
  assert.ok(!index.includes('dry-run-topic.md'), 'dry-run must not modify the index');
});
