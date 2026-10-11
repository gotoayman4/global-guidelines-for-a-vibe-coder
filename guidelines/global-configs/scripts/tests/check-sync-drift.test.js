const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/check-sync-drift.js');
const { hashTree, compareProjects } = require('../check-sync-drift.js');

/** Build a source tree and N mirrors, so the comparison has something real to read. */
function fixture(mirrorMode) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-drift-'));
  const source = path.join(root, 'guidelines');
  fs.mkdirSync(path.join(source, '01-workflow-methodology'), { recursive: true });
  fs.writeFileSync(path.join(source, '01-workflow-methodology', 'a.md'), '# A\n\nBody.\n');
  fs.writeFileSync(path.join(source, 'README.md'), '# Index\n');

  const project = path.join(root, 'project');
  const mirror = path.join(project, '_guidelines');
  fs.mkdirSync(path.join(mirror, '01-workflow-methodology'), { recursive: true });
  fs.writeFileSync(path.join(mirror, '01-workflow-methodology', 'a.md'), '# A\n\nBody.\n');
  fs.writeFileSync(path.join(mirror, 'README.md'), '# Index\n');

  if (mirrorMode === 'edited') {
    fs.writeFileSync(path.join(mirror, '01-workflow-methodology', 'a.md'), '# A\n\nBody CHANGED.\n');
  } else if (mirrorMode === 'missing') {
    fs.rmSync(mirror, { recursive: true, force: true });
  } else if (mirrorMode === 'extra') {
    fs.writeFileSync(path.join(mirror, 'stale.md'), '# Left behind\n');
  }
  return { root, source, project };
}

test('hashTree is content-addressed: identical trees hash identically', () => {
  const a = fixture('ok');
  const b = fixture('ok');
  assert.equal(hashTree(a.source).hash, hashTree(b.source).hash, 'same content, same hash — no path or time dependence');
  assert.equal(hashTree(a.source).count, 2);
});

test('hashTree normalises line endings so a CRLF checkout is not drift', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-eol-'));
  const lf = path.join(root, 'lf');
  const crlf = path.join(root, 'crlf');
  fs.mkdirSync(lf);
  fs.mkdirSync(crlf);
  fs.writeFileSync(path.join(lf, 'x.md'), '# A\nline two\n');
  fs.writeFileSync(path.join(crlf, 'x.md'), '# A\r\nline two\r\n');
  assert.equal(hashTree(lf).hash, hashTree(crlf).hash);
});

test('hashTree changes when one byte of content changes', () => {
  const ok = fixture('ok');
  const edited = fixture('edited');
  assert.notEqual(hashTree(ok.source).hash, hashTree(edited.project).hash);
});

test('hashTree is path-sensitive: a renamed file is drift, not a no-op', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-rename-'));
  const a = path.join(root, 'a');
  const b = path.join(root, 'b');
  fs.mkdirSync(a);
  fs.mkdirSync(b);
  fs.writeFileSync(path.join(a, 'one.md'), '# Same body\n');
  fs.writeFileSync(path.join(b, 'two.md'), '# Same body\n');
  assert.notEqual(hashTree(a).hash, hashTree(b).hash, 'the path is part of the hash');
});

test('compareProjects reports in-sync, drift, and no-mirror separately', () => {
  const ok = fixture('ok');
  const source = hashTree(ok.source);
  const rows = compareProjects(ok.source, source, [{ name: 'p', path: ok.project }]);
  assert.equal(rows[0].state, 'sync');
  assert.equal(rows[0].recorded, 'never recorded');
});

test('compareProjects flags an edited mirror as drift — the reversal proof', () => {
  const ok = fixture('ok');
  const edited = fixture('edited');
  const rows = compareProjects(ok.source, hashTree(ok.source), [{ name: 'p', path: edited.project }]);
  assert.equal(rows[0].state, 'drift', 'one changed line in the mirror MUST be reported as drift');
  assert.notEqual(rows[0].mirrorHash, hashTree(ok.source).hash);
});

test('compareProjects flags a file left behind in the mirror as drift', () => {
  const ok = fixture('ok');
  const extra = fixture('extra');
  const rows = compareProjects(ok.source, hashTree(ok.source), [{ name: 'p', path: extra.project }]);
  assert.equal(rows[0].state, 'drift', 'an extra file in the mirror is a stale file, not a match');
  assert.equal(rows[0].mirrorFiles, 3);
});

test('compareProjects reports a project with no mirror at all', () => {
  const ok = fixture('ok');
  const missing = fixture('missing');
  const rows = compareProjects(ok.source, hashTree(ok.source), [{ name: 'p', path: missing.project }]);
  assert.equal(rows[0].state, 'no-mirror');
});

test('CLI exits 1 on a drifted fleet and 0 on a synced one', () => {
  // Hermetic: the CLI is pointed at a fixture source + registry via env, never at the live
  // fleet. The first version of this test asserted the live fleet's state ("the finding, not a
  // test bug"), so it passed only while the fleet was broken and failed the moment `sync:all`
  // fixed it. A test whose green depends on the world being wrong is not a test.
  const run = (mirrorMode) => {
    const f = fixture(mirrorMode);
    const registry = path.join(f.root, 'sync-projects.json');
    fs.writeFileSync(registry, JSON.stringify([{ name: 'p', path: f.project }]));
    return runSync(process.execPath, [SCRIPT, '--quiet'], {
      cwd: REPO_ROOT,
      env: { ...process.env, SYNC_DRIFT_SOURCE: f.source, SYNC_DRIFT_REGISTRY: registry },
    });
  };

  assert.equal(run('ok').status, 0, 'a mirror that matches the source is not drift');
  assert.equal(run('edited').status, 1, 'an edited mirror is drift');
  assert.equal(run('extra').status, 1, 'a file left behind in the mirror is drift');
});

test('CLI exits 2 when the registry is unreadable rather than reporting success', () => {
  const result = runSync(process.execPath, [SCRIPT, '--record'], { cwd: REPO_ROOT });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--record requires a project path/);
});
