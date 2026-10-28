#!/usr/bin/env node

/**
 * sync-all.js — Batch-sync every project listed in sync-projects.json.
 *
 * INTENT: one non-interactive entry point for the fleet. The GUI
 * (sync-manager.ps1) remains for interactive use; this script is what
 * `npm run sync:all` calls, and what a fleet re-sync invokes.
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
 * THE `status` FIELD WAS RENAMED TO `lastSyncOutcome` (2026-10-19). It recorded how the last sync
 * attempt ended, and the name said something stronger than that: a reader scanning
 * `sync-projects.json` saw `"status": "synced"` on every project while the mirrors had drifted from
 * the source and `npm run sync:drift` was failing seven of seven. A field whose name reads like a
 * current-state claim but holds a historical one is a claim the registry cannot keep. The new name
 * says what it holds — the outcome of the last attempt — and the CURRENT state is the verdict
 * `npm run sync:drift` prints, never the registry. The recorded hashes still say what content was
 * delivered, and when.
 *
 * A DRY RUN RUNS THE REAL PREFLIGHT. `--dry-run` used to return before PowerShell, so it reported
 * "would sync" for every registered project without executing the one check that can block a sync —
 * a project command still naming a retired script. `sync-guidelines.ps1 -DryRun` runs the same
 * source-backed preflight and writes nothing, so the preview now predicts the run instead of
 * describing an intention. `SYNC_ALL_REGISTRY` points the CLI at another registry; the test suite
 * uses it so no test asserts the live fleet's state.
 *
 * CAVEAT: sync-guidelines.ps1 can also write global tool configs under the user profile
 * (opencode/Qoder/Windsurf/Cursor/VS Code). That step is OPT-IN here:
 * `--with-global-configs` (or `SYNC_WITH_GLOBAL_CONFIGS=1`). It is the same content for every
 * project on the machine — writing it seven times per fleet sync is redundant — and it is the one
 * step a sandboxed host cannot complete, which used to fail every project in the batch. The
 * project-side sync (`-SourceOnly`) is what `check-sync-drift.js` verifies, so it is the default.
 *
 * Usage:
 *   npm run sync:all
 *   node guidelines/global-configs/scripts/sync-all.js [--dry-run] [--with-global-configs]
 *
 * Source: global-configs/scripts/sync-all.js
 */

const { runSync } = require('./lib/run-sync.js');
const { hashTree, skillsMirror } = require('./check-sync-drift.js');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const PROJECTS_PATH = process.env.SYNC_ALL_REGISTRY || path.join(REPO_ROOT, 'sync-projects.json');
const SOURCE = path.join(REPO_ROOT, 'guidelines');
const SYNC_PS1 = path.join(__dirname, 'sync-guidelines.ps1');
const dryRun = process.argv.includes('--dry-run');
// Machine-global configs are opt-in: they are identical for every project, are skipped on
// restricted hosts, and are not what the drift checker verifies. See the docblock.
const withGlobalConfigs =
  process.argv.includes('--with-global-configs') ||
  process.env.SYNC_WITH_GLOBAL_CONFIGS === '1';

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
    withGlobalConfigs = false,
    skills = skillsMirror(sourceRoot),
  } = options;

  const name = project.name || project.path;
  const projectPath = project.path;

  if (!projectPath) {
    console.error(`  FAIL ${name}: entry has no path`);
    return { ok: false, failed: 1, project: { ...project, lastSyncOutcome: 'failed' } };
  }

  if (!fs.existsSync(projectPath)) {
    console.error(`  FAIL ${name}: path missing (${projectPath})`);
    return { ok: false, failed: 1, project: { ...project, lastSyncOutcome: 'failed' } };
  }

  const args = [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    syncScript,
    '-ProjectPath',
    projectPath,
  ];
  // Default to the project-side sync. The machine-global step (user profile configs) is identical
  // for every project, cannot complete on a restricted host, and is not what the drift checker
  // verifies — so it runs only when the caller explicitly asks for it.
  if (!withGlobalConfigs) args.push('-SourceOnly');
  // A preview must exercise the mirror preflight; returning before PowerShell reported "would sync"
  // for projects whose own commands name a deleted source script.
  if (dryRunFlag) args.push('-DryRun');

  const result = run('powershell.exe', args, { windowsHide: true });

  if (result.status !== 0) {
    project.lastSyncOutcome = 'failed';
    // A PowerShell terminating error carries the reason on stderr while stdout ends with ordinary
    // progress lines; prefer stderr so the failure, not the last thing printed, is what is shown.
    const detail = result.stderr.trim() ? result.stderr : result.stdout;
    const tail = detail.trim().split('\n').slice(-6).join(' | ');
    console.error(`  FAIL ${name} (exit ${result.status}): ${tail}`);
    return { ok: false, failed: 1, project };
  }

  if (dryRunFlag) {
    console.log(`  OK   ${name}: preflight passed (dry run wrote nothing)`);
    return { ok: true, failed: 0, project };
  }

  const source = hashTree(sourceRoot);
  const mirrorPath = path.join(projectPath, '_guidelines');
  const delivered = fs.existsSync(mirrorPath) ? hashTree(mirrorPath) : null;

  if (delivered && delivered.hash === source.hash) {
    project.lastSyncOutcome = 'synced';
    project.lastSynced = now;
    project.contentHash = source.hash;
    project.hashFiles = source.count;
    // The skills corpus is a second delivered artifact. Recording only the guidelines hash let
    // the registry keep asserting the previous corpus after a sync that replaced it — a stale
    // record is the same defect the date-versus-hash rule exists for (check-sync-drift.js).
    if (skills) {
      project.skillsHash = skills.hash;
      project.skillsFiles = skills.count;
    }
    console.log(`  OK   ${name}`);
    return { ok: true, failed: 0, project };
  }

  project.lastSyncOutcome = 'failed';
  project.lastSynced = project.lastSynced || null;
  console.error(`  FAIL ${name}: sync exited 0 but the mirror does not match the source — verify manually`);
  return { ok: false, failed: 1, project };
}

function runBatchSync(projects, options = {}) {
  const {
    sourceRoot = SOURCE,
    syncScript = SYNC_PS1,
    projectRegistry = PROJECTS_PATH,
    dryRunFlag = false,
    withGlobalConfigs = false,
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
      withGlobalConfigs,
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
  // Printed in dry-run too: the dry run is what an operator reads before committing to a mode.
  console.log(
    `mode: project-side only (mirror + starters + skills)${withGlobalConfigs ? ' + machine-global configs' : ' — pass --with-global-configs for the user-profile tool configs'}`
  );
  const result = runBatchSync(projects, {
    sourceRoot: SOURCE,
    syncScript: SYNC_PS1,
    projectRegistry: PROJECTS_PATH,
    dryRunFlag: dryRun,
    withGlobalConfigs,
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
