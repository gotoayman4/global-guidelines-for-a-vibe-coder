#!/usr/bin/env node

/**
 * check-fleet-staleness.js — Is the REGISTERED FLEET behind the source of truth? (Report-only.)
 *
 * INTENT: every central commit makes all seven mirrors stale BY CONSTRUCTION, and nothing said so.
 * The failure this closes is measured, not hypothetical: a mirror sat 19 days old while the
 * registry reported every project `synced`, and the fix that followed (`check-sync-drift.js`,
 * content hashes, a registry that can only be written by the sync) DETECTS the state but does not
 * ANNOUNCE it — the verdict only appears when a human decides to run the drift check, which is
 * exactly the remembering that failed the first time. This script is the announcement: it runs in
 * `npm run validate`, the command every central change is already pushed through, and prints how
 * much of the fleet the change just made stale.
 *
 * WHY REPORT-ONLY AND NOT A GATE. The comparison is the SOURCE against the RECORDED hashes, and a
 * central commit always changes the source — so on the commit that adds a rule, the fleet is
 * behind and a failing gate would block the very commit that documents the rule. A staleness gate
 * on the source side is a gate that fails once and is then bypassed forever; the report is the
 * honest instrument. The GATE lives in `sync:drift`, which compares delivered copies against the
 * source and fails — running it is the remedy this report names.
 *
 * WHY THE REGISTRY AND NOT THE FILESYSTEM. The recorded hash says what was DELIVERED (`sync-all.js`
 * writes it only after a verified mirror), so the answer needs no access to the projects: it is
 * computable on a machine that has only this repository — which is what makes it safe to run in
 * validate, where a disconnected drive or a missing checkout must not fail the corpus gate.
 * `sync:drift` remains the filesystem verdict; this is the fleet's phone that says it is wanted.
 *
 * Usage:
 *   node check-fleet-staleness.js           # report; exit 0 ALWAYS
 *
 * Exit codes: 0, unconditionally — a report is not a gate (see WHY REPORT-ONLY).
 *
 * @tier standard+ — a fleet report run from the central repo; it reads `sync-projects.json` and
 *   the source tree, both of which live here.
 *
 * Source: global-configs/scripts/check-fleet-staleness.js
 */

const fs = require('fs');
const path = require('path');
const { hashTree, skillsMirror } = require('./check-sync-drift.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SOURCE = process.env.SYNC_DRIFT_SOURCE || path.join(REPO_ROOT, 'guidelines');
const REGISTRY = process.env.SYNC_DRIFT_REGISTRY || path.join(REPO_ROOT, 'sync-projects.json');

function readRegistry() {
  if (!fs.existsSync(REGISTRY)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * One project's staleness, per artifact. `current` = the recorded hash equals the source hash now;
 * `behind` = it does not (the ordinary state after any central edit); `never recorded` = the sync
 * has not stamped this project yet.
 */
function staleness(project, source, skills) {
  const verdict = (recorded, current) => {
    if (!recorded) return 'never recorded';
    return recorded === current ? 'current' : 'behind';
  };
  return {
    name: project.name || project.path,
    guidelines: verdict(project.contentHash, source.hash),
    skills: skills ? verdict(project.skillsHash, skills.hash) : 'not declared',
    lastSynced: project.lastSynced || null,
  };
}

function report() {
  const source = hashTree(SOURCE);
  const skills = skillsMirror(SOURCE);
  const projects = readRegistry();

  console.log('── Fleet staleness (recorded delivery vs current source — report only) ──');
  if (!projects) {
    console.log(`   registry unreadable or absent: ${REGISTRY}`);
    console.log('   (a repo without a fleet to report on is not drift)');
    return;
  }

  const rows = projects.map((p) => staleness(p, source, skills));
  for (const row of rows) {
    const when = row.lastSynced ? ` · last synced ${row.lastSynced}` : '';
    console.log(`   ${row.name}: guidelines ${row.guidelines}, skills ${row.skills}${when}`);
  }

  const behind = rows.filter((r) => r.guidelines === 'behind' || r.skills === 'behind').length;
  const neverRecorded = rows.filter((r) => r.guidelines === 'never recorded').length;
  if (rows.length === 0) {
    console.log('   no registered projects.');
    return;
  }
  if (behind === 0 && neverRecorded === 0) {
    console.log(`   ✅ all ${rows.length} registered project(s) match the current source.`);
  } else {
    console.log(`   ⏰ ${behind + neverRecorded} of ${rows.length} project(s) are behind or unrecorded — this central change is not yet delivered.`);
    console.log('      → run `npm run sync:all` to deliver it, then `npm run sync:drift` for the filesystem verdict.');
  }
}

function main() {
  report();
  // Exit 0 unconditionally: the WHY REPORT-ONLY paragraph is the reason. The gate is sync:drift.
  process.exit(0);
}

if (require.main === module) main();

module.exports = { staleness, readRegistry };
