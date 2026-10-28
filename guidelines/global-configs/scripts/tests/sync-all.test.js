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

// --- dry-run exercises the real preflight (2026-10-28) --------------------------------
// `--dry-run` used to return before PowerShell, so it reported "would sync" for every project
// without running the mirror preflight. The live fleet's stale command references were therefore
// invisible until a real sync failed. The preview now spawns `sync-guidelines.ps1 -DryRun`.

const NO_POWERSHELL = (() => {
  const probe = runSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'exit 0']);
  return probe.error || probe.status !== 0 ? 'PowerShell is unavailable' : false;
})();

function registryFor(projectPath) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-all-registry-'));
  const file = path.join(root, 'sync-projects.json');
  fs.writeFileSync(file, `${JSON.stringify([{ name: 'fixture', path: projectPath }], null, 2)}\n`, 'utf8');
  return file;
}

function snapshot(root) {
  const entries = {};
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const key = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, key);
      else entries[key] = fs.readFileSync(full, 'utf8');
    }
  };
  walk(root, '');
  return entries;
}

function runDryRun(projectPath) {
  return runSync(process.execPath, [SYNC_ALL, '--dry-run'], {
    env: { ...process.env, SYNC_ALL_REGISTRY: registryFor(projectPath) },
  });
}

test('the CLI banner states which mode a run uses', { skip: NO_POWERSHELL }, () => {
  // The banner is the only place a caller learns the default changed, so it is part of the
  // contract. A fixture registry keeps this test off the live fleet.
  const { projectPath } = buildFixture({ mirrorState: 'match' });
  fs.writeFileSync(path.join(projectPath, 'package.json'), '{"name":"fixture"}\n');
  const registry = registryFor(projectPath);
  const env = { ...process.env, SYNC_ALL_REGISTRY: registry };

  const defaults = runSync(process.execPath, [SYNC_ALL, '--dry-run'], { env });
  assert.equal(defaults.status, 0, `dry-run exited ${defaults.status}: ${defaults.stderr}`);
  assert.match(defaults.stdout, /project-side only/);
  assert.match(defaults.stdout, /--with-global-configs/);

  const optedIn = runSync(process.execPath, [SYNC_ALL, '--dry-run', '--with-global-configs'], { env });
  assert.equal(optedIn.status, 0, `dry-run exited ${optedIn.status}: ${optedIn.stderr}`);
  assert.match(optedIn.stdout, /machine-global configs/);
  assert.doesNotMatch(optedIn.stdout, /pass --with-global-configs/);
});

test('a dry run fails on a command naming a retired source script and writes nothing', { skip: NO_POWERSHELL }, () => {
  const { projectPath } = buildFixture({ mirrorState: 'match' });
  fs.writeFileSync(
    path.join(projectPath, 'package.json'),
    `${JSON.stringify({ scripts: { 'guard:retired': 'node _guidelines/global-configs/scripts/slice-close.js --check' } }, null, 2)}\n`
  );
  const before = snapshot(projectPath);

  const result = runDryRun(projectPath);

  assert.equal(result.status, 1, `expected the preflight to block the dry run:\n${result.stdout}`);
  assert.match(result.stderr, /FAIL fixture/);
  assert.match(result.stderr, /slice-close\.js/);
  assert.match(result.stderr, /package\.json scripts\.guard:retired/);
  assert.deepEqual(snapshot(projectPath), before, 'a refused preview must leave the project untouched');
});

test('a clean dry run reports that the preflight passed and writes nothing', { skip: NO_POWERSHELL }, () => {
  const { projectPath } = buildFixture({ mirrorState: 'match' });
  fs.writeFileSync(path.join(projectPath, 'package.json'), '{"name":"fixture"}\n');
  const before = snapshot(projectPath);

  const result = runDryRun(projectPath);

  assert.equal(result.status, 0, `dry-run exited ${result.status}: ${result.stderr}`);
  assert.match(result.stdout, /preflight passed/);
  assert.deepEqual(snapshot(projectPath), before);
});
