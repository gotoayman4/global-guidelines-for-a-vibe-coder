#!/usr/bin/env node

/**
 * sync-all.js — Batch-sync every project listed in sync-projects.json.
 *
 * INTENT: one non-interactive entry point for the fleet (D191). The GUI
 * (sync-manager.ps1) remains for interactive use; this script is what
 * `npm run sync:all` and D192's fleet re-sync call.
 *
 * CONSTRAINT: never invents projects — only entries already in
 * sync-projects.json. A missing path or a failed PowerShell run marks that
 * project failed and continues; the process exits 1 if ANY project failed so
 * a caller cannot mistake a partial fleet for a green one.
 *
 * DECISION: lastSynced is updated only after sync-guidelines.ps1 exits 0 for
 * that project — a timestamp on a failed sync is a lie the freshness report
 * would then trust. The CONTENT HASH is recorded in the same step, because a
 * date says when someone tried and a hash says what they actually delivered
 * (check-sync-drift.js). A date without a hash is how a project ran 19-day-old
 * rules while the registry reported it `synced`.
 *
 * CAVEAT: sync-guidelines.ps1 writes global tool configs under the user
 * profile as well as the project mirror; concurrent runs are not supported.
 *
 * Usage:
 *   npm run sync:all
 *   node guidelines/global-configs/scripts/sync-all.js [--dry-run]
 *
 * Source: global-configs/scripts/sync-all.js
 */

const { runSync } = require('./lib/run-sync.js');
const { hashTree } = require('./check-sync-drift.js');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const PROJECTS_PATH = path.join(REPO_ROOT, 'sync-projects.json');
const SOURCE = path.join(REPO_ROOT, 'guidelines');
const SYNC_PS1 = path.join(__dirname, 'sync-guidelines.ps1');
const dryRun = process.argv.includes('--dry-run');

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function loadProjectsFromFile(projectsPath) {
  if (!fs.existsSync(projectsPath)) {
    throw new Error(`sync:all cannot read ${projectsPath}`);
  }

  let projects;
  try {
    projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
  } catch (err) {
    throw new Error(`sync:all: sync-projects.json is not valid JSON: ${err.message}`);
  }

  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('sync:all: sync-projects.json has no projects');
  }

  return projects;
}

function syncProject(project, options = {}) {
  const {
    sourceRoot = SOURCE,
    syncScript = SYNC_PS1,
    run = runSync,
    now = stamp(),
    dryRunFlag = false,
  } = options;

  const name = project.name || project.path;
  const projectPath = project.path;

  if (!projectPath) {
    console.error(`  FAIL ${name}: entry has no path`);
    return { ok: false, failed: 1, project: { ...project, status: 'failed' } };
  }

  if (!fs.existsSync(projectPath)) {
    console.error(`  FAIL ${name}: path missing (${projectPath})`);
    return { ok: false, failed: 1, project: { ...project, status: 'failed' } };
  }

  if (dryRunFlag) {
    console.log(`  OK   ${name}: would sync → ${projectPath}`);
    return { ok: true, failed: 0, project: { ...project, status: 'synced' } };
  }

  const result = run(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      syncScript,
      '-ProjectPath',
      projectPath,
    ],
    { windowsHide: true },
  );

  if (result.status === 0) {
    const source = hashTree(sourceRoot);
    const mirrorPath = path.join(projectPath, '_guidelines');
    const delivered = fs.existsSync(mirrorPath) ? hashTree(mirrorPath) : null;

    if (delivered && delivered.hash === source.hash) {
      project.status = 'synced';
      project.lastSynced = now;
      project.contentHash = source.hash;
      project.hashFiles = source.count;
      console.log(`  OK   ${name}`);
      return { ok: true, failed: 0, project };
    }

    project.status = 'failed';
    project.lastSynced = project.lastSynced || null;
    console.error(`  FAIL ${name}: sync exited 0 but the mirror does not match the source — verify manually`);
    return { ok: false, failed: 1, project };
  }

  project.status = 'failed';
  const tail = (result.stderr || result.stdout || '').trim().split('\n').slice(-3).join(' | ');
  console.error(`  FAIL ${name} (exit ${result.status}): ${tail}`);
  return { ok: false, failed: 1, project };
}

function runBatchSync(projects, options = {}) {
  const {
    sourceRoot = SOURCE,
    syncScript = SYNC_PS1,
    projectRegistry = PROJECTS_PATH,
    dryRunFlag = false,
    run = runSync,
  } = options;

  const now = stamp();
  let failed = 0;

  const list = Array.isArray(projects) ? projects : loadProjectsFromFile(projectRegistry);

  for (const project of list) {
    const outcome = syncProject(project, {
      sourceRoot,
      syncScript,
      run,
      now,
      dryRunFlag,
    });
    failed += outcome.failed;
  }

  if (!dryRunFlag) {
    fs.writeFileSync(projectRegistry, `${JSON.stringify(list, null, 4)}\n`, 'utf8');
  }

  return { failed, projects: list };
}

function main() {
  if (!fs.existsSync(SYNC_PS1)) {
    console.error(`sync:all cannot find ${SYNC_PS1}`);
    process.exit(1);
  }

  let projects;
  try {
    projects = loadProjectsFromFile(PROJECTS_PATH);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  console.log(`sync:all — ${projects.length} project(s)${dryRun ? ' [dry-run]' : ''}`);
  const result = runBatchSync(projects, {
    sourceRoot: SOURCE,
    syncScript: SYNC_PS1,
    projectRegistry: PROJECTS_PATH,
    dryRunFlag: dryRun,
  });

  if (result.failed > 0) {
    console.error(`sync:all DONE with ${result.failed} failure(s)`);
    process.exit(1);
  }
  console.log(dryRun ? 'sync:all dry-run complete' : 'sync:all complete — all projects synced');
}

if (require.main === module) {
  main();
}

module.exports = {
  REPO_ROOT,
  PROJECTS_PATH,
  SOURCE,
  SYNC_PS1,
  loadProjectsFromFile,
  syncProject,
  runBatchSync,
  main,
  stamp,
};
