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
 * would then trust.
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
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const PROJECTS_PATH = path.join(REPO_ROOT, 'sync-projects.json');
const SYNC_PS1 = path.join(__dirname, 'sync-guidelines.ps1');
const dryRun = process.argv.includes('--dry-run');

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function main() {
  if (!fs.existsSync(PROJECTS_PATH)) {
    console.error(`sync:all cannot read ${PROJECTS_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(SYNC_PS1)) {
    console.error(`sync:all cannot find ${SYNC_PS1}`);
    process.exit(1);
  }

  let projects;
  try {
    projects = JSON.parse(fs.readFileSync(PROJECTS_PATH, 'utf8'));
  } catch (err) {
    console.error(`sync:all: sync-projects.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(projects) || projects.length === 0) {
    console.error('sync:all: sync-projects.json has no projects');
    process.exit(1);
  }

  console.log(`sync:all — ${projects.length} project(s)${dryRun ? ' [dry-run]' : ''}`);
  let failed = 0;
  const now = stamp();

  for (const project of projects) {
    const name = project.name || project.path;
    const projectPath = project.path;
    if (!projectPath) {
      console.error(`  FAIL ${name}: entry has no path`);
      failed += 1;
      continue;
    }
    if (!fs.existsSync(projectPath)) {
      console.error(`  FAIL ${name}: path missing (${projectPath})`);
      failed += 1;
      continue;
    }
    if (dryRun) {
      console.log(`  OK   ${name}: would sync → ${projectPath}`);
      continue;
    }

    const result = runSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        SYNC_PS1,
        '-ProjectPath',
        projectPath,
      ],
      { windowsHide: true },
    );

    if (result.status === 0) {
      project.status = 'synced';
      project.lastSynced = now;
      console.log(`  OK   ${name}`);
    } else {
      failed += 1;
      project.status = 'failed';
      const tail = (result.stderr || result.stdout || '').trim().split('\n').slice(-3).join(' | ');
      console.error(`  FAIL ${name} (exit ${result.status}): ${tail}`);
    }
  }

  if (!dryRun) {
    fs.writeFileSync(PROJECTS_PATH, `${JSON.stringify(projects, null, 4)}\n`, 'utf8');
  }

  if (failed > 0) {
    console.error(`sync:all DONE with ${failed} failure(s)`);
    process.exit(1);
  }
  console.log(dryRun ? 'sync:all dry-run complete' : 'sync:all complete — all projects synced');
}

main();
