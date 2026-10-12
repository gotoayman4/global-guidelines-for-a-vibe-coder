#!/usr/bin/env node

/**
 * check-project-freshness.js — Reports how far each synced project's AGENTS.md
 * has drifted from the current central constitution.
 *
 * Project AGENTS.md files are user-owned (sync mode is create-if-missing), so
 * drift there is expected and legitimate (filled [FILL]s, removed non-applicable
 * rules). This script is an informational report, not a gate: it lists, per
 * project, sections and named rules from the current AGENTS.starter.md that are
 * missing from the project's copy, plus sync age from sync-projects.json.
 *
 * Usage:
 *   npm run status:projects
 *
 * Exit code: always 0 (report-only).
 *
 * @tier standard+ — a fleet report; it reads `sync-projects.json`, which the central gate does not
 *   own, and it is report-only (exit code always 0).
 *
 * Source: global-configs/scripts/check-project-freshness.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const TEMPLATE_PATH = path.join(REPO_ROOT, 'guidelines', 'global-configs', 'templates', 'AGENTS.starter.md');
const PROJECTS_PATH = path.join(REPO_ROOT, 'sync-projects.json');

function readLines(p) {
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').split('\n');
}

// Section headings ("## X") and named rules. Rules appear as "- **Title.**"
// bullets (current starter format — same format audit-rules.js parses) or as
// "### Title" headings (older project constitutions). Maintenance bullets are
// not rules.
function extract(contentLines) {
  const sections = new Set();
  const rules = new Set();
  let inMaintenance = false;
  for (const line of contentLines) {
    const section = line.match(/^## (.+?)\s*$/);
    if (section) {
      inMaintenance = false;
      sections.add(section[1].replace(/\s*\(.*\)\s*$/, '').trim());
      continue;
    }
    if (/^### Maintenance\s*$/.test(line)) {
      inMaintenance = true;
      continue;
    }
    const heading = line.match(/^### (.+?)\s*$/);
    if (heading && !inMaintenance) {
      rules.add(heading[1].trim());
      continue;
    }
    const rule = line.match(/^- \*\*(.+?)[.*—]/);
    if (rule && !inMaintenance) rules.add(rule[1].trim());
  }
  return { sections, rules };
}

const template = extract(readLines(TEMPLATE_PATH));
let projects;
try {
  projects = JSON.parse(fs.readFileSync(PROJECTS_PATH, 'utf8'));
} catch (err) {
  console.error(`Cannot read sync-projects.json: ${err.message}`);
  process.exit(0);
}

const now = Date.now();
let anyMissing = false;

for (const project of projects) {
  const agentsPath = path.join(project.path, 'AGENTS.md');
  const ageDays = project.lastSynced
    ? Math.floor((now - new Date(project.lastSynced.replace(' ', 'T'))) / 86400000)
    : null;
  console.log(`\n=== ${project.name} (synced ${ageDays === null ? 'never' : ageDays + 'd ago'}) ===`);

  if (!fs.existsSync(agentsPath)) {
    console.log('  ❌ AGENTS.md missing — run sync-manager to create it');
    anyMissing = true;
    continue;
  }

  const projectState = extract(readLines(agentsPath));
  const missingSections = [...template.sections].filter((s) => !projectState.sections.has(s));
  const missingRules = [...template.rules].filter((r) => !projectState.rules.has(r));

  if (missingSections.length) {
    anyMissing = true;
    console.log(`  Sections absent from project AGENTS.md (${missingSections.length}):`);
    for (const s of missingSections) console.log(`    - ${s}`);
  }
  if (missingRules.length) {
    anyMissing = true;
    console.log(`  Rules absent from project AGENTS.md (${missingRules.length} of ${template.rules.size}):`);
    for (const r of missingRules) console.log(`    - ${r}`);
  }
  if (!missingSections.length && !missingRules.length) {
    console.log('  ✅ covers all current sections and rules');
  }
}

console.log(`\nReport-only check: ${anyMissing ? 'some projects are behind — review before relying on their AGENTS.md' : 'all projects up to date'}.`);
console.log('To refresh a project, run sync-manager.ps1 (GUI) — it will not overwrite project-owned AGENTS.md files.');
process.exit(0);
