const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/bump-freshness.js');
const { bumpHeader, isStale } = require('../bump-freshness.js');

function makeFile(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-freshness-'));
  const file = path.join(dir, 'doc.md');
  fs.writeFileSync(file, contents, 'utf8');
  return file;
}

function run(args, cwd = REPO_ROOT) {
  return runSync(process.execPath, [SCRIPT, ...args], { cwd });
}

const today = () => new Date().toISOString().split('T')[0];

test('bumpHeader replaces a full freshness header in place', () => {
  const content = '# Doc\n\n**Last Updated:** 2026-01-01 | **Commit:** abc1234 | **Change:** old note\n\nBody.\n';
  const result = bumpHeader(content, '2026-09-22', 'def5678', 'new note');
  assert.equal(result.changed, true);
  assert.match(result.content, /\*\*Last Updated:\*\* 2026-09-22 \| \*\*Commit:\*\* def5678 \| \*\*Change:\*\* new note/);
  assert.ok(!result.content.includes('old note'));
  assert.match(result.content, /Body\./);
});

test('bumpHeader upgrades a plain Last Updated line', () => {
  const content = '# Guideline\n\n**Last Updated:** 2026-01-01\n\nText.\n';
  const result = bumpHeader(content, '2026-09-22', 'sha', 'note');
  assert.equal(result.changed, true);
  assert.match(result.content, /\*\*Last Updated:\*\* 2026-09-22/);
  assert.ok(!result.content.includes('Commit:'), 'plain line stays plain when no full header existed');
});

test('bumpHeader reports unchanged when no header exists', () => {
  const content = '# Nothing here\n';
  const result = bumpHeader(content, '2026-09-22', 'sha', 'note');
  assert.equal(result.changed, false);
  assert.equal(result.content, content);
});

test('isStale compares header date to reference date', () => {
  assert.equal(isStale('# x\n\n**Last Updated:** 2026-09-22\n', '2026-09-22'), false);
  assert.equal(isStale('# x\n\n**Last Updated:** 2020-01-01\n', '2026-09-22'), true);
  assert.equal(isStale('# x\n', '2026-09-22'), true);
});

test('CLI bumps an explicit file and rewrites the header', () => {
  const file = makeFile('# Steering\n\n**Last Updated:** 2026-01-01 | **Commit:** aaa | **Change:** old\n');
  const result = run([file, '--message', 'test bump']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /bumped/);
  const after = fs.readFileSync(file, 'utf8');
  assert.match(after, new RegExp(`\\*\\*Last Updated:\\*\\* ${today()}`));
  assert.match(after, /\*\*Change:\*\* test bump/);
});

test('CLI --check exits 1 on stale header and 0 after bump', () => {
  const file = makeFile('# Steering\n\n**Last Updated:** 2026-01-01 | **Commit:** aaa | **Change:** old\n');
  const stale = run([file, '--check']);
  assert.equal(stale.status, 1);
  assert.match(stale.stdout, /stale/);

  run([file, '--message', 'fresh']);
  const fresh = run([file, '--check']);
  assert.equal(fresh.status, 0);
});

test('CLI rejects missing file with usage exit 2', () => {
  const result = run([path.join(os.tmpdir(), 'definitely-missing-freshness.md')]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /not found/);
});
