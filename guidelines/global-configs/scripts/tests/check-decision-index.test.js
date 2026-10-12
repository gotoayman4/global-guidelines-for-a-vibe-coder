const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/check-decision-index.js');
const { check, adrFiles, loggedDecisions } = require('../check-decision-index.js');

const INDEX = '| ADR | Decision | Depth | Status |\n|---|---|---|---|\n';

/** A project with `docs/adr/` holding the given files, index and log. */
function makeProject({ files = ['001-first.md', '003-third.md'], index = INDEX + '| [001](001-first.md) | one (D1) | Lite | Accepted |\n| [003](003-third.md) | three (D3) | Lite | Accepted |\n', log = '# PRD\n\n| ID | Decision | Rationale |\n|---|---|---|\n| D1 | one | why one |\n| D3 | three | why three |\n' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dec-index-'));
  if (files !== null) {
    fs.mkdirSync(path.join(dir, 'docs/adr'), { recursive: true });
    for (const f of files) fs.writeFileSync(path.join(dir, 'docs/adr', f), `# ${f}\n`, 'utf8');
  }
  if (index !== null) fs.writeFileSync(path.join(dir, 'docs/adr/README.md'), index, 'utf8');
  if (log !== null) fs.writeFileSync(path.join(dir, 'docs/PRD.md'), log, 'utf8');
  return dir;
}

const run = (args) => runSync(process.execPath, [SCRIPT, ...args], { cwd: REPO_ROOT });

test('a consistent corpus passes', () => {
  const { violations, warnings } = check({
    files: ['001-first.md', '003-third.md'],
    index: INDEX + '| [001](001-first.md) | one (D1) |\n| [003](003-third.md) | three (D3) |\n',
    logged: new Set([1, 3]),
  });
  assert.deepEqual(violations, []);
  assert.deepEqual(warnings, []);
});

test('an ADR file with no index row is a violation — a reader cannot find it', () => {
  const { violations } = check({
    files: ['001-first.md', '003-third.md'],
    index: INDEX + '| [001](001-first.md) | one (D1) |\n',
    logged: new Set([1, 3]),
  });
  assert.equal(violations.length, 1);
  assert.match(violations[0], /003-third\.md has no row/);
});

test('an index row pointing at a missing file is a violation', () => {
  const { violations } = check({
    files: ['001-first.md'],
    index: INDEX + '| [001](001-first.md) | one (D1) |\n| [003](003-gone.md) | three (D3) |\n',
    logged: new Set([1, 3]),
  });
  assert.equal(violations.length, 1);
  assert.match(violations[0], /003-gone\.md, which does not exist/);
});

test('the same ADR listed twice is a violation', () => {
  const { violations } = check({
    files: ['001-first.md'],
    index: INDEX + '| [001](001-first.md) | one (D1) |\n| [001](001-first.md) | one again (D1) |\n',
    logged: new Set([1]),
  });
  assert.equal(violations.length, 1);
  assert.match(violations[0], /lists 001-first\.md twice/);
});

test('an ADR whose decision is not yet in the log is a WARNING, never a violation', () => {
  const { violations, warnings } = check({
    files: ['001-first.md', '003-third.md'],
    index: INDEX + '| [001](001-first.md) | one (D1) |\n| [003](003-third.md) | three (D3) |\n',
    logged: new Set([1]),
  });
  assert.deepEqual(violations, [], 'work in flight must not fail the gate');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /records D3/);
});

test('a numbering gap is legitimate and is never reported', () => {
  // 002 is absent on purpose: the project records why a number was skipped.
  const { violations, warnings } = check({
    files: ['001-first.md', '003-third.md'],
    index: INDEX + '| [001](001-first.md) | one (D1) |\n| [003](003-third.md) | three (D3) |\n',
    logged: new Set([1, 3]),
  });
  assert.deepEqual(violations, []);
  assert.deepEqual(warnings, []);
});

test('a missing index with ADR files present is a violation', () => {
  const { violations } = check({ files: ['001-first.md'], index: null, logged: new Set([1]) });
  assert.equal(violations.length, 1);
  assert.match(violations[0], /README\.md is missing/);
});

test('an index row with an anchor still resolves its file', () => {
  const { violations } = check({
    files: ['001-first.md'],
    index: INDEX + '| [001](001-first.md#status) | one (D1) |\n',
    logged: new Set([1]),
  });
  assert.deepEqual(violations, []);
});

// --- CLI behaviour --------------------------------------------------------------------------

test('CLI: a consistent project exits 0', () => {
  const result = run([makeProject()]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /2 ADR file\(s\), each with exactly one index row/);
});

test('CLI: --strict turns a warning into a failure', () => {
  const dir = makeProject({ log: '# PRD\n\n| ID | Decision | Rationale |\n|---|---|---|\n| D1 | one | why one |\n' });
  assert.equal(run([dir]).status, 0, 'the warning alone is not fatal');
  assert.equal(run([dir, '--strict']).status, 1, 'under --strict it is');
});

test('CLI: a project with no docs/adr is not applicable, not an error', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dec-index-none-'));
  const result = run([dir]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /not applicable/);
});

test('CLI: an empty docs/adr is a corpus error, never a silent pass', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dec-index-empty-'));
  fs.mkdirSync(path.join(dir, 'docs/adr'), { recursive: true });
  const result = run([dir]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /corpus is empty/);
});

test('CLI: a missing project path is a usage error', () => {
  const result = run([path.join(os.tmpdir(), 'dec-index-does-not-exist-xyz')]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /does not exist/);
});

test('CLI: --json emits machine-readable output', () => {
  const result = run([makeProject(), '--json']);
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.files, 2);
  assert.deepEqual(parsed.violations, []);
});

test('reversal proof: deleting one index row makes the REAL checker fail', () => {
  const dir = makeProject();
  const clean = run([dir]);
  assert.equal(clean.status, 0, 'precondition: the fixture is consistent');

  const indexAbs = path.join(dir, 'docs/adr/README.md');
  fs.writeFileSync(indexAbs, fs.readFileSync(indexAbs, 'utf8').replace(/^\| \[003\].*\n/m, ''), 'utf8');
  const broken = run([dir]);
  assert.equal(broken.status, 1);
  assert.match(broken.stdout, /003-third\.md has no row/);
});

test('adrFiles and loggedDecisions read the real filesystem, not a cache', () => {
  const dir = makeProject();
  assert.deepEqual(adrFiles(dir), ['001-first.md', '003-third.md']);
  assert.deepEqual([...loggedDecisions(dir)].sort(), [1, 3]);
  assert.equal(adrFiles(fs.mkdtempSync(path.join(os.tmpdir(), 'dec-index-none2-'))), null, 'absent dir → null');
});
