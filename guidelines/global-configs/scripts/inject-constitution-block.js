#!/usr/bin/env node

/**
 * inject-constitution-block.js — Refresh the managed `generated:constitution-core` region in a
 * downstream project's `AGENTS.md` without touching project-owned setup or `[FILL]` sections.
 *
 * INTENT: `AGENTS.md` is installed `create-if-missing` so a sync never clobbers a project's filled
 * `### Stack` table, `### Forbidden Patterns`, `### Project-Specific Mandates`, or build commands.
 * But `create-if-missing` on the whole file also meant that upstream improvements to Security,
 * Testing, Git, Architecture, RTL, or AI Collaboration never reached existing projects.
 *
 * DECISION: split `AGENTS.starter.md` into managed and project-owned zones using the same
 * marker-delimited architecture as `inject-skills-block.js` and `patch-tool-configs.js`:
 *
 *   1. `<!-- BEGIN generated:constitution-core ... -->` ... `<!-- END generated:constitution-core -->`
 *      wraps the baseline sections (`## Speed Mode` through `## Performance`). When a project's
 *      `AGENTS.md` carries these markers, the sync refreshes the region in place and leaves
 *      everything outside the markers (`## Skills` and `## Reference & Project Setup`) untouched.
 *   2. Provenance citations (`  → Source: ...`) live in `fragments/*.md` and `AGENTS.starter.md`
 *      so `npm run audit` can verify every extracted rule against its source guideline in the
 *      central repo. Downstream coding agents do not run `audit-rules.js` and pay for every line in
 *      their context window on every session — so `stripSourceCitations` removes `→ Source:` lines
 *      when writing the managed block into a downstream project (saving ~250 tokens per session).
 *   3. An unmarked `AGENTS.md` (hand-maintained or pre-marker) is left alone (`kept`) by default:
 *      the sync never overwrites a project constitution that has not opted into the managed markers.
 *      Passing `--adopt` migrates an unmarked `AGENTS.md` that carries standard section headings by
 *      wrapping its core sections in the managed markers while preserving `## Skills` and
 *      `## Reference & Project Setup`.
 *
 * IDEMPOTENT & FORMATTER-SAFE: compares normalized text so Prettier whitespace/line-wrapping in a
 * downstream project's pre-commit hook does not cause sync churn or dirty-tree failures.
 *
 * Usage:
 *   node inject-constitution-block.js <projectRoot> [--check] [--quiet] [--adopt] [--keep-sources]
 *
 * Exit codes: 0 = up to date, kept (unmanaged), or written;
 *             1 = `--check` found a managed block that needs refreshing;
 *             2 = usage error.
 *
 * Source: global-configs/scripts/inject-constitution-block.js
 */

const fs = require('fs');
const path = require('path');

const AGENTS = 'AGENTS.md';
const STARTER = path.resolve(__dirname, '..', 'templates', 'AGENTS.starter.md');

const BEGIN = '<!-- BEGIN generated:constitution-core — written by sync-guidelines.ps1, do not edit inside -->';
const END = '<!-- END generated:constitution-core -->';

/** Remove `  → Source: ...` provenance lines from downstream constitution text. */
function stripSourceCitations(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n?[ \t]*→[ \t]*(?:Source|Guideline):[^\n]*(?=\n|$)/g, '')
    .replace(/^\n+/, '');
}

/** Find the `[start, end)` span of the managed constitution core markers, or null if absent/incomplete. */
function markedSpan(doc) {
  const lf = String(doc || '').replace(/\r\n/g, '\n');
  const start = lf.indexOf(BEGIN);
  if (start === -1) return null;
  const end = lf.indexOf(END, start);
  if (end === -1) return null;
  return { start, end: end + END.length };
}

/** Extract the canonical `generated:constitution-core` region (markers included) from `AGENTS.starter.md`. */
function readCanonicalCore(starterPath = STARTER, { stripSources = true } = {}) {
  if (!fs.existsSync(starterPath)) {
    throw new Error(`starter template not found: ${starterPath}`);
  }
  const raw = fs.readFileSync(starterPath, 'utf8').replace(/\r\n/g, '\n');
  const span = markedSpan(raw);
  if (!span) {
    throw new Error(`starter template carries no ${BEGIN} ... ${END} region: ${starterPath}`);
  }
  const block = raw.slice(span.start, span.end);
  return stripSources ? stripSourceCitations(block) : block;
}

/** Normalize whitespace and blank lines so markdown formatters (Prettier) do not trigger false churn. */
function normalizeRegion(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n');
}

/**
 * Apply the canonical core region to a downstream `AGENTS.md` document.
 *
 * @param {string} doc
 * @param {string} coreRegion the marked canonical core region (including BEGIN and END)
 * @param {{adopt?: boolean}} [options]
 * @returns {{content: string, action: 'refreshed'|'adopted'|'unchanged'|'kept'}}
 */
function applyConstitutionBlock(doc, coreRegion, { adopt = false } = {}) {
  const eol = doc.includes('\r\n') ? '\r\n' : '\n';
  const lf = doc.replace(/\r\n/g, '\n');
  const cleanCore = coreRegion.replace(/\r\n/g, '\n').trim();

  const span = markedSpan(lf);
  if (span) {
    const current = lf.slice(span.start, span.end);
    if (current === cleanCore || normalizeRegion(current) === normalizeRegion(cleanCore)) {
      return { content: doc, action: 'unchanged' };
    }
    const next = `${lf.slice(0, span.start)}${cleanCore}${lf.slice(span.end)}`;
    return { content: next.replace(/\n/g, eol), action: 'refreshed' };
  }

  if (!adopt) {
    return { content: doc, action: 'kept' };
  }

  // `--adopt`: locate the first core heading (`## Speed Mode` or `## Security`) and the boundary
  // where project-owned or skills sections start (`## Skills` or `## Reference & Project Setup`).
  const startMatch = /^## (?:Speed Mode|Security)\b/m.exec(lf);
  const endMatch = /^## (?:Skills|Reference & Project Setup)\b/m.exec(lf);
  if (!startMatch || !endMatch || endMatch.index <= startMatch.index) {
    return { content: doc, action: 'kept' };
  }

  const head = lf.slice(0, startMatch.index).replace(/\n+$/, '');
  const tail = lf.slice(endMatch.index);
  const next = `${head}\n\n${cleanCore}\n\n${tail}`;
  return { content: next.replace(/\n/g, eol), action: 'adopted' };
}

function main() {
  const argv = process.argv.slice(2);
  const flags = argv.filter((a) => a.startsWith('--'));
  const known = ['--check', '--quiet', '--adopt', '--keep-sources'];
  const unknown = flags.filter((f) => !known.includes(f));
  if (unknown.length) {
    console.error(`❌ unknown flag ${unknown[0]}`);
    console.error('Usage: node inject-constitution-block.js <projectRoot> [--check] [--quiet] [--adopt] [--keep-sources]');
    process.exit(2);
  }

  const checkOnly = flags.includes('--check');
  const quiet = flags.includes('--quiet');
  const adopt = flags.includes('--adopt');
  const stripSources = !flags.includes('--keep-sources');

  const projectRoot = argv.find((a) => !a.startsWith('--'));
  if (!projectRoot) {
    console.error('❌ a project root is required');
    console.error('Usage: node inject-constitution-block.js <projectRoot> [--check] [--quiet] [--adopt] [--keep-sources]');
    process.exit(2);
  }

  const agentsPath = path.join(projectRoot, AGENTS);
  const name = path.basename(path.resolve(projectRoot));
  if (!fs.existsSync(agentsPath)) {
    if (!quiet) console.log(`  ${name}: no ${AGENTS} — nothing to refresh`);
    process.exit(0);
  }

  const coreRegion = readCanonicalCore(STARTER, { stripSources });
  const before = fs.readFileSync(agentsPath, 'utf8');
  const { content, action } = applyConstitutionBlock(before, coreRegion, { adopt });

  if (checkOnly) {
    if (action === 'refreshed' || action === 'adopted') {
      console.error(`❌ ${name}: constitution-core block needs ${action} — run the sync`);
      process.exit(1);
    }
    if (!quiet) {
      const note = action === 'kept' ? 'hand-maintained (no constitution-core markers — left alone)' : 'constitution-core block up to date';
      console.log(`  ✅ ${name}: ${note}`);
    }
    process.exit(0);
  }

  if (action === 'refreshed' || action === 'adopted') {
    fs.writeFileSync(agentsPath, content, 'utf8');
  }

  if (!quiet) {
    const label = {
      refreshed: 'refreshed constitution-core block',
      adopted: 'adopted managed constitution-core block',
      unchanged: 'constitution-core block up to date',
      kept: 'left hand-maintained AGENTS.md core alone (pass --adopt to migrate)',
    }[action];
    console.log(`  ${action === 'kept' ? 'ℹ️' : '✅'} ${name}: ${label}`);
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = {
  applyConstitutionBlock,
  markedSpan,
  normalizeRegion,
  readCanonicalCore,
  stripSourceCitations,
  BEGIN,
  END,
  STARTER,
};
