const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { syncProject, loadProjectsFromFile } = require('../sync-all.js');

function buildFixture({ mirrorState = 'match' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-all-'));
  const sourceRoot = path.join(root, 'guidelines');
  fs.mkdirSync(path.join(sourceRoot, 'feature'), { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, 'feature', 'a.md'), '# A\n');

  const projectPath = path.join(root, 'Project With Spaces');
  fs.mkdirSync(projectPath, { recursive: true });

  const mirrorPath = path.join(projectPath, '_guidelines');
  fs.mkdirSync(path.join(mirrorPath, 'feature'), { recursive: true });
  fs.writeFileSync(
    path.join(mirrorPath, 'feature', 'a.md'),
    mirrorState === 'match' ? '# A\n' : '# Wrong\n'
  );

  return { root, sourceRoot, projectPath };
}

test('syncProject keeps a project failed when the delivered mirror hash differs', () => {
  const { sourceRoot, projectPath } = buildFixture({ mirrorState: 'mismatch' });
  const project = { name: 'demo', path: projectPath };

  const outcome = syncProject(project, {
    sourceRoot,
    syncScript: 'C:/temp/sync-guidelines.ps1',
    run: () => ({ status: 0, stdout: '', stderr: '' }),
    dryRunFlag: false,
  });

  assert.equal(outcome.failed, 1);
  assert.equal(project.status, 'failed');
  assert.equal(project.lastSynced, null);
});

test('syncProject passes a project path with spaces as a single argument', () => {
  const { sourceRoot, projectPath } = buildFixture({ mirrorState: 'match' });
  const project = { name: 'demo', path: projectPath };
  let captured;

  syncProject(project, {
    sourceRoot,
    syncScript: 'C:/temp/sync-guidelines.ps1',
    run: (...args) => {
      captured = args;
      return { status: 0, stdout: '', stderr: '' };
    },
    dryRunFlag: false,
  });

  assert.ok(Array.isArray(captured));
  assert.equal(captured[0], 'powershell.exe');
  assert.ok(captured[1].includes('-ProjectPath'));
  assert.ok(captured[1].includes(projectPath));
  assert.equal(captured[1][captured[1].indexOf('-ProjectPath') + 1], projectPath);
});

test('loadProjectsFromFile rejects malformed sync registry JSON', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-all-registry-'));
  const file = path.join(root, 'sync-projects.json');
  fs.writeFileSync(file, '{bad json}', 'utf8');

  assert.throws(() => loadProjectsFromFile(file), /not valid JSON/);
});
