#!/usr/bin/env node

/**
 * score-compliance.js — Score recorded agent runs against the constitution's scenarios.
 *
 * INTENT: the constitution is only worth its tokens if agents follow it, and nothing measured that. This
 * does not drive an agent (that needs a live model); it scores what one produced, so any tool can be
 * compared before/after a rule change: run each scenario's prompt, record the reply, the added diff lines
 * and the shell commands, then score. A rule edit that drops the pass rate is a regression.
 *
 * Usage:
 *   node score-compliance.js <results.json>             # score; exit 1 if any scenario fails
 *   node score-compliance.js --list                     # print scenario ids + prompts
 *   node score-compliance.js <results.json> --scenarios <file>
 *
 * results.json: { "<scenario-id>": { "output": "...", "diff": "...", "commands": "..." }, ... }
 * A scenario with no recorded result is reported as SKIPPED and does not fail the run.
 *
 * Exit codes: 0 = all scored scenarios pass; 1 = a failure; 2 = usage error.
 *
 * Source: global-configs/scripts/score-compliance.js
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_SCENARIOS = path.join(__dirname, '..', 'evals', 'scenarios.json');

function re(p) {
  return new RegExp(p, 'im');
}

/** @returns {{id: string, status: 'pass'|'fail'|'skipped', reasons: string[]}} */
function scoreScenario(scenario, result) {
  if (!result) return { id: scenario.id, status: 'skipped', reasons: [] };
  const reasons = [];
  for (const check of scenario.checks) {
    const text = String(result[check.target] || '');
    for (const p of check.forbid || []) {
      if (re(p).test(text)) reasons.push(`${check.target} matched forbidden /${p}/`);
    }
    for (const p of check.require || []) {
      if (!re(p).test(text)) reasons.push(`${check.target} lacks required /${p}/`);
    }
  }
  return { id: scenario.id, status: reasons.length ? 'fail' : 'pass', reasons };
}

function scoreAll(scenarios, results) {
  const rows = scenarios.map((s) => scoreScenario(s, results[s.id]));
  const scored = rows.filter((r) => r.status !== 'skipped');
  const passed = scored.filter((r) => r.status === 'pass').length;
  return { rows, scored: scored.length, passed, rate: scored.length ? passed / scored.length : 0 };
}

function loadScenarios(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed.scenarios)) throw new Error('scenarios file has no `scenarios` array');
  return parsed.scenarios;
}

function main() {
  const argv = process.argv.slice(2);
  const at = argv.indexOf('--scenarios');
  const scenariosFile = at !== -1 ? argv[at + 1] : DEFAULT_SCENARIOS;
  let scenarios;
  try {
    scenarios = loadScenarios(scenariosFile);
  } catch (e) {
    console.error(`❌ cannot read scenarios: ${e.message}`);
    process.exit(2);
  }
  if (argv.includes('--list')) {
    for (const s of scenarios) console.log(`${s.id}\n   rule:   ${s.rule}\n   prompt: ${s.prompt}`);
    return;
  }
  const file = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--scenarios');
  if (!file || !fs.existsSync(file)) {
    console.error('Usage: node score-compliance.js <results.json> | --list');
    process.exit(2);
  }
  let results;
  try {
    results = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`❌ results file is not valid JSON: ${e.message}`);
    process.exit(2);
  }
  const { rows, scored, passed, rate } = scoreAll(scenarios, results);
  for (const r of rows) {
    const icon = { pass: '✅', fail: '❌', skipped: '⏭️ ' }[r.status];
    console.log(`${icon} ${r.id}${r.reasons.length ? `\n     - ${r.reasons.join('\n     - ')}` : ''}`);
  }
  console.log(`\nCompliance: ${passed}/${scored} scored scenarios passed (${(rate * 100).toFixed(0)}%)`);
  process.exit(passed === scored ? 0 : 1);
}

if (require.main === module) main();

module.exports = { scoreScenario, scoreAll, loadScenarios };
