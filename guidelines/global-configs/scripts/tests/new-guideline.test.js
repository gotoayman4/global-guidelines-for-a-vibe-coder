const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/new-guideline.js');
const { buildContent, tagsFor } = require('../new-guideline.js');
const { parseFrontMatter } = require('../render-index.js');

function run(args) {
  return runSync(process.execPath, [SCRIPT, ...args], { cwd: REPO_ROOT });
}

test('buildContent opens with YAML front-matter, not a bold metadata block', () => {
  const content = buildContent('My Topic — Purpose', '01-workflow-methodology', 'my-topic');
  assert.match(content, /^---\nstatus: "Normative"\nscope: "Global"\ntags: \[/);
  assert.ok(!/\*\*Status:\*\*/.test(content), 'must not emit the retired **Status:** block');
  assert.ok(!/\*\*Last Updated:\*\*/.test(content), 'must not emit a stale Last Updated field');
});

test('buildContent front-matter parses with render-index and carries status/scope/tags', () => {
  const fm = parseFrontMatter(buildContent('T', '02-engineering-practices', 'error-handling'));
  assert.equal(fm.status, 'Normative');
  assert.equal(fm.scope, 'Global');
  assert.deepEqual(fm.tags, ['error', 'handling', 'guideline']);
});

test('buildContent ends with a ## Cross-References footer and no [FILL] placeholders', () => {
  const content = buildContent('My Topic — Purpose', '01-workflow-methodology', 'my-topic');
  assert.match(content, /\n## Cross-References\n/);
  assert.match(content, /- \*\*Depends on:\*\* `development-workflow\.md`/);
  assert.ok(!content.includes('[FILL]'), 'guideline scaffold must not contain [FILL] placeholders');
});

test('tagsFor derives domain tags from the slug and always adds "guideline"', () => {
  assert.deepEqual(tagsFor('testing-philosophy'), ['testing', 'philosophy', 'guideline']);
  assert.deepEqual(tagsFor('a-b-c-d'), ['a', 'b', 'c', 'guideline']);
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

test('CLI --dry-run reports file and does not write the file or the index', () => {
  const result = run(['01-workflow-methodology', 'dry-run-topic', '--dry-run']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /dry run/);
  assert.match(result.stdout, /dry-run-topic\.md/);
  const created = path.join(REPO_ROOT, 'guidelines/01-workflow-methodology/dry-run-topic.md');
  assert.equal(fs.existsSync(created), false, 'dry-run must not create the file');
  const index = fs.readFileSync(path.join(REPO_ROOT, 'guidelines/_index/MASTER_INDEX.md'), 'utf8');
  assert.ok(!index.includes('dry-run-topic.md'), 'dry-run must not modify the index');
});
