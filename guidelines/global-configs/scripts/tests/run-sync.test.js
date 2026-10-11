const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { runSync } = require('../lib/run-sync.js');

const NODE = process.execPath;
/** Run a snippet of JS in a child and capture it. */
const nodeEval = (code, args = [], options = {}) =>
  runSync(NODE, ['-e', code, ...args], options);

test('captures stdout and reports a clean exit', () => {
  const r = nodeEval('process.stdout.write("hello")');
  assert.equal(r.error, null);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, 'hello');
  assert.equal(r.stderr, '');
});

test('keeps stderr separate from stdout', () => {
  const r = nodeEval('process.stdout.write("OUT"); process.stderr.write("ERR")');
  assert.equal(r.stdout, 'OUT');
  assert.equal(r.stderr, 'ERR');
});

test('reports a non-zero exit without throwing', () => {
  const r = nodeEval('process.stderr.write("boom"); process.exit(7)');
  assert.equal(r.error, null, 'a failed child is a result, not an error');
  assert.equal(r.status, 7);
  assert.equal(r.stderr, 'boom');
});

test('sets error only when the executable cannot be started (non-vacuity)', () => {
  const missing = path.join(os.tmpdir(), `definitely-not-a-binary-${process.pid}`);
  const r = runSync(missing, []);
  assert.notEqual(r.error, null, 'a missing binary must be distinguishable from a non-zero exit');
  assert.equal(r.status, null);
});

test('honours the cwd option', () => {
  const r = nodeEval('process.stdout.write(process.cwd())', [], { cwd: os.tmpdir() });
  assert.equal(r.status, 0);
  // macOS reports /private/var vs /var for the same directory.
  assert.equal(r.stdout.replace(/^\/private/, ''), os.tmpdir().replace(/^\/private/, ''));
});

test('passes the argument vector verbatim, including spaces and quotes', () => {
  const tricky = 'a b "c" d';
  const r = nodeEval('process.stdout.write(process.argv[1])', [tricky]);
  assert.equal(r.stdout, tricky);
});

test('captures output far larger than a pipe buffer, without truncation or deadlock', () => {
  // This is the regression probe for the pipe-free design: a synchronous pipe capture
  // that reads only after the child exits deadlocks once the child fills the pipe
  // (~64 KB on Windows). 256 KB proves the output lands in a file and is read whole.
  const size = 256 * 1024;
  const r = nodeEval(`process.stdout.write("x".repeat(${size}))`);
  assert.equal(r.error, null);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.length, size, 'output must be captured in full');
});

test('is re-entrant: repeated calls do not leak temp state', () => {
  for (let i = 0; i < 5; i++) {
    const r = nodeEval(`process.stdout.write("run-${i}")`);
    assert.equal(r.stdout, `run-${i}`);
  }
});
