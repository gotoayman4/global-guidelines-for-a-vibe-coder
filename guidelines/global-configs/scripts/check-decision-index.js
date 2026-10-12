#!/usr/bin/env node

/**
 * check-decision-index.js — the ADR set, its index, and the decisions log agree.
 *
 * INTENT: A decision is recorded in three places — the ADR file, the row in
 * `docs/adr/README.md`, and the row in the decisions log. Two of those three are pure
 * restatements of the first, and they were typed by hand: a project recorded 50 decisions and
 * hand-wrote 100 index rows (`GAMS_WORKFLOW_SPEED_ANALYSIS_2026-10-12.md` §2.4). `slice:close --adr`
 * now writes them; this guard is what proves it did, and what catches the hand-edit that follows.
 *
 * CONSTRAINT: It checks CONSISTENCY, never formatting. A row may be reworded freely; what it may
 * not do is point at a file that does not exist, or leave an ADR file unlisted. Numbering gaps are
 * legitimate and are not reported — the project records why a number was skipped, and a guard that
 * demanded contiguity would force a lie.
 *
 * DECISION: The decisions-log check is a WARNING by default and a failure under `--strict`. An ADR
 * whose decision is not yet in the log is usually work in flight; an ADR file missing from the
 * index is always a defect, because the index is how a reader finds it at all.
 *
 * Non-vacuity: a `docs/adr/` directory with neither ADR files nor index rows is a corpus error,
 * never a silent pass. A project with no `docs/adr/` at all is legitimately not applicable.
 *
 * Usage:
 *   node check-decision-index.js [projectRoot] [--strict] [--json]
 *
 * Exit codes: 0 = consistent (or warnings only); 1 = a violation (or a warning under --strict);
 *             2 = corpus error.
 *
 * @tier standard+ — a contract over the decision record, which is written at a milestone; the
 *   record never scales with the slice (`documentation-strategy.md` §Record vs Ritual).
 *
 * Source: global-configs/scripts/check-decision-index.js
 */

const fs = require('fs');
const path = require('path');

const ADR_DIR = 'docs/adr';
const ADR_INDEX = 'docs/adr/README.md';
const INDEX_HEADER = /^\|\s*ADR\s*\|\s*Decision\s*\|/m;
const DECISION_LOG_CANDIDATES = ['docs/PRD.md', 'docs/DECISIONS.md'];
const LOG_ROW = /^\|\s*D(\d{1,4})\s*\|/gm;
/** `[007](007-slug.md)` or `[007](007-slug.md#anchor)` — the link target, not the label. */
const INDEX_ROW = /^\|\s*\[(\d{1,4})\]\(([^)#]+)(?:#[^)]*)?\)/gm;

function adrFiles(root) {
  const dir = path.join(root, ADR_DIR);
  if (!fs.existsSync(dir)) return null;
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .sort();
}

/** Numbers of the decisions present in the project's log, across every candidate that carries one. */
function loggedDecisions(root) {
  const found = new Set();
  for (const rel of DECISION_LOG_CANDIDATES) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    for (const m of fs.readFileSync(abs, 'utf8').matchAll(LOG_ROW)) found.add(Number(m[1]));
  }
  return found;
}

/**
 * Pure check over an explicit corpus.
 * @param {{files: string[], index: string|null, logged: Set<number>}} corpus
 * @returns {{violations: string[], warnings: string[]}}
 */
function check({ files, index, logged }) {
  const violations = [];
  const warnings = [];

  if (index === null) {
    if (files.length > 0) violations.push(`${ADR_INDEX} is missing — ${files.length} ADR file(s) have no index at all`);
    return { violations, warnings };
  }

  const rows = [...index.matchAll(INDEX_ROW)].map((m) => ({ number: m[1], target: m[2].trim() }));
  const listed = new Set(rows.map((r) => r.target));

  for (const f of files) {
    if (!listed.has(f)) violations.push(`${ADR_DIR}/${f} has no row in ${ADR_INDEX} — a reader cannot find it`);
  }
  for (const r of rows) {
    if (!files.includes(r.target)) violations.push(`${ADR_INDEX} row [${r.number}] points at ${r.target}, which does not exist`);
  }
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.target)) violations.push(`${ADR_INDEX} lists ${r.target} twice — one ADR, one row`);
    seen.add(r.target);
  }

  for (const f of files) {
    const m = f.match(/^(\d+)/);
    const n = m ? Number(m[1]) : NaN;
    if (Number.isFinite(n) && !logged.has(n)) {
      warnings.push(`ADR ${f} records D${n}, which has no row in the decisions log`);
    }
  }

  return { violations, warnings };
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const strict = args.includes('--strict');
  const rootArg = args.find((a) => !a.startsWith('--'));
  const root = path.resolve(rootArg || process.cwd());

  if (!fs.existsSync(root)) {
    console.error(`✗ project path does not exist: ${root}`);
    process.exit(2);
  }

  const files = adrFiles(root);
  if (files === null) {
    console.log(`ℹ no ${ADR_DIR}/ — this project keeps no ADRs (not applicable)`);
    process.exit(0);
  }

  const indexAbs = path.join(root, ADR_INDEX);
  const index = fs.existsSync(indexAbs) ? fs.readFileSync(indexAbs, 'utf8') : null;

  // Non-vacuity: an ADR directory with nothing in it is a mistake, not a pass.
  if (files.length === 0 && !(index && INDEX_HEADER.test(index))) {
    console.error(`✗ ${ADR_DIR}/ exists but holds neither ADR files nor an index table — corpus is empty`);
    process.exit(2);
  }

  const { violations, warnings } = check({ files, index, logged: loggedDecisions(root) });

  if (json) {
    console.log(JSON.stringify({ root, files: files.length, violations, warnings }, null, 2));
  } else {
    console.log('═══════════════════════════════════════════');
    console.log('  Decision Index — ADR set, index and log agree');
    console.log(`  ${root}`);
    console.log('═══════════════════════════════════════════\n');
    for (const v of violations) console.log(`   ❌ ${v}`);
    for (const w of warnings) console.log(`   ⚠️  ${w}`);
    if (violations.length === 0 && warnings.length === 0) {
      console.log(`✅ ${files.length} ADR file(s), each with exactly one index row and one log row`);
    }
    console.log();
  }

  process.exit(violations.length > 0 || (strict && warnings.length > 0) ? 1 : 0);
}

if (require.main === module) main();

module.exports = { check, adrFiles, loggedDecisions, ADR_INDEX, ADR_DIR };
