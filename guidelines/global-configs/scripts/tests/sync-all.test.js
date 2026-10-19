const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { syncProject, loadProjectsFromFile } = require('../sync-all.js');
const { runSync } = require('../lib/run-sync.js');

const SYNC_ALL = path.join(__dirname, '..', 'sync-all.js');

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

test('syncProject records the delivered skills corpus alongside the guidelines hash', () => {
  const { sourceRoot, projectPath } = buildFixture({ mirrorState: 'match' });
  const project = { name: 'demo', path: projectPath };
  const skills = { hash: 'a'.repeat(64), count: 21 };

  syncProject(project, {
    sourceRoot,
    syncScript: 'C:/temp/sync-guidelines.ps1',
    skills,
    run: () => ({ status: 0, stdout: '', stderr: '' }),
    dryRunFlag: false,
  });

  assert.equal(project.skillsHash, skills.hash);
  assert.equal(project.skillsFiles, skills.count);
});

test('syncProject leaves the recorded skills hash untouched when the sync fails', () => {
  const { sourceRoot, projectPath } = buildFixture({ mirrorState: 'mismatch' });
  const project = { name: 'demo', path: projectPath, skillsHash: 'previous', skillsFiles: 20 };

  syncProject(project, {
    sourceRoot,
    syncScript: 'C:/temp/sync-guidelines.ps1',
    skills: { hash: 'a'.repeat(64), count: 21 },
    run: () => ({ status: 0, stdout: '', stderr: '' }),
    dryRunFlag: false,
  });

  assert.equal(project.lastSyncOutcome, 'failed');
  assert.equal(project.skillsHash, 'previous');
  assert.equal(project.skillsFiles, 20);
});

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
  assert.equal(project.lastSyncOutcome, 'failed');
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

// --- machine-global opt-in (2026-10-13) -----------------------------------------------
// `npm run sync:all` used to spawn sync-guidelines.ps1 WITHOUT -SourceOnly, so the step that
// writes the user's machine-global tool configs ran for all seven projects. That step cannot
// complete on a restricted host — measured: every fleet sync died on an access-denied
// Remove-Item in the opencode block — and it is not what check-sync-drift.js verifies. The
// default is now the project-side sync; machine-global configs are opt-in.

test('syncProject defaults to the project-side sync by passing -SourceOnly', () => {
  const { sourceRoot, projectPath } = buildFixture({ mirrorState: 'match' });
  let args;
  syncProject({ name: 'demo', path: projectPath }, {
    sourceRoot,
    syncScript: 'C:/temp/sync-guidelines.ps1',
    run: (...captured) => {
      args = captured[1];
      return { status: 0, stdout: '', stderr: '' };
    },
    dryRunFlag: false,
  });
  assert.ok(args.includes('-SourceOnly'), `expected -SourceOnly in the spawned arguments, got: ${args.join(' ')}`);
});

test('syncProject omits -SourceOnly only when machine-global configs are requested', () => {
  const { sourceRoot, projectPath } = buildFixture({ mirrorState: 'match' });
  let args;
  syncProject({ name: 'demo', path: projectPath }, {
    sourceRoot,
    syncScript: 'C:/temp/sync-guidelines.ps1',
    withGlobalConfigs: true,
    run: (...captured) => {
      args = captured[1];
      return { status: 0, stdout: '', stderr: '' };
    },
    dryRunFlag: false,
  });
  assert.ok(!args.includes('-SourceOnly'), `expected no -SourceOnly when opted in, got: ${args.join(' ')}`);
});

test('the CLI banner states which mode a run uses', () => {
  // The banner is the only place a caller learns the default changed, so it is part of the
  // contract. A dry run spawns no PowerShell, so this is safe and read-only.
  const defaults = runSync(process.execPath, [SYNC_ALL, '--dry-run']);
  assert.equal(defaults.status, 0, `dry-run exited ${defaults.status}: ${defaults.stderr}`);
  assert.match(defaults.stdout, /project-side only/);
  assert.match(defaults.stdout, /--with-global-configs/);

  const optedIn = runSync(process.execPath, [SYNC_ALL, '--dry-run', '--with-global-configs']);
  assert.equal(optedIn.status, 0, `dry-run exited ${optedIn.status}: ${optedIn.stderr}`);
  assert.match(optedIn.stdout, /machine-global configs/);
  assert.doesNotMatch(optedIn.stdout, /pass --with-global-configs/);
});
