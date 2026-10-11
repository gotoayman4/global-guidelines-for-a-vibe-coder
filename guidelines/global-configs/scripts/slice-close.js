#!/usr/bin/env node

/**
 * slice-close.js — One command closes a slice: the record, the freshness line, the receipt pointer.
 *
 * INTENT: The steering writes a slice owes are DERIVED facts — the date, the commit, the decision
 * number, the receipt path — and hand-typing a derived fact is how it goes stale silently
 * (documentation-strategy.md §Machine output is referenced, never transcribed). This script writes
 * them from the repository's own state, so the agent spends its prose only where prose IS the
 * product: the acceptance body and an ADR.
 *
 * CONSTRAINT: It never invents a decision number. The next one is `max(existing) + 1`, computed
 * from the documents that actually carry decisions. A counter kept in a file races between two
 * concurrent sessions and needs its own parity guard to notice; a derived number cannot
 * (documentation-strategy.md §Record vs Ritual).
 *
 * DECISION: One archive per quarter, not one per document. A single event written into four
 * per-document changelog files is four copies of one fact — the exact shape "one canonical copy
 * per rule" outlaws. `docs/changelog/<YYYY>-Q<n>.md` carries a `**Doc:**` column instead
 * (documentation-strategy.md §History).
 *
 * Non-vacuity: the derived number is read back from the file it was just written to, so a second
 * run in the same project MUST return n+1. A corpus with no documents at all is a usage error,
 * never a silent pass.
 *
 * Usage:
 *   node slice-close.js [projectRoot] --title "<one line>" [--mode vibe|standard|guarded]
 *                       [--doc <file>] [--receipt <path>] [--decision <n>] [--sha <sha>] [--dry-run]
 *
 * Exit codes: 0 = written (or --dry-run reported it), 2 = usage error.
 *
 * Source: global-configs/scripts/slice-close.js
 */

const fs = require('fs');
const path = require('path');
const { runSync } = require('./lib/run-sync.js');

/** Documents a decision number may appear in. Read-only; nothing is written back to them. */
const DECISION_SOURCES = ['AGENTS.md', 'WORLD.md', 'docs/PRD.md', 'docs/ROADMAP.md'];

/** Steering docs that carry a freshness line, if the project uses one. */
const FRESHNESS_DOCS = ['WORLD.md', 'docs/AI_ARCHITECTURE.md'];

/** The only line this script will rewrite in a steering doc. Anything else is left alone. */
const FRESHNESS_RE = /^\*\*(?:Last Updated|Freshness):\*\*[^\n]*/m;

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error(
    'Usage: node slice-close.js [projectRoot] --title "<one line>" [--mode vibe|standard|guarded]\n' +
      '                            [--doc <file>] [--receipt <path>] [--decision <n>] [--sha <sha>] [--dry-run]',
  );
  process.exit(2);
}

function parseArgs(argv) {
  const opts = { title: null, mode: null, doc: null, receipt: null, decision: null, sha: null, dryRun: false, root: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--title') opts.title = argv[++i];
    else if (a === '--mode') opts.mode = argv[++i];
    else if (a === '--doc') opts.doc = argv[++i];
    else if (a === '--receipt') opts.receipt = argv[++i];
    else if (a === '--decision') opts.decision = argv[++i];
    else if (a === '--sha') opts.sha = argv[++i];
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a.startsWith('--')) usage(`unknown option: ${a}`);
    else if (opts.root === null) opts.root = a;
    else usage(`unexpected argument: ${a}`);
  }
  return opts;
}

/** `2026-10-11` → `docs/changelog/2026-Q4.md`. Quarter is calendar, not fiscal. */
function quarterFile(date) {
  const [year, month] = date.split('-').map(Number);
  const q = Math.ceil(month / 3);
  return `docs/changelog/${year}-Q${q}.md`;
}

/**
 * The next decision number: `max(D<n>) + 1` across the documents that carry decisions,
 * or 1 when none exists. Derived, never counted.
 */
function nextDecision(root, docs) {
  let max = 0;
  for (const rel of DECISION_SOURCES) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    for (const m of fs.readFileSync(abs, 'utf8').matchAll(/\bD(\d{1,4})\b/g)) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  }
  for (const rel of docs) {
    for (const m of rel.content.matchAll(/\bD(\d{1,4})\b/g)) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

/** The declared mode, read from WORLD.md. Absent or silent → `standard` (speed-tiered-workflow.md). */
function deriveMode(root) {
  const abs = path.join(root, 'WORLD.md');
  if (!fs.existsSync(abs)) return 'standard';
  const m = fs.readFileSync(abs, 'utf8').match(/^[-*]\s*\*\*mode:\*\*\s*`?([a-z]+)`?/m);
  return m ? m[1] : 'standard';
}

function shortSha(root) {
  const result = runSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root });
  const sha = (result.stdout || '').trim();
  return result.status === 0 && sha ? sha : 'nogit';
}

/**
 * Rewrite the freshness line in place. Returns `{content, changed}` — a doc without the
 * line is reported, never given one, because adding a marker is a decision the project makes.
 */
function updateFreshness(content, date, sha, change) {
  if (!FRESHNESS_RE.test(content)) return { content, changed: false };
  const line = `**Last Updated:** ${date} | **Commit:** ${sha} | **Change:** ${change}`;
  return { content: content.replace(FRESHNESS_RE, line), changed: true };
}

/** Wrap a bullet at word boundaries at ≤400 chars (documentation-strategy.md §Directives 11). */
function wrap(text, width = 400) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > width) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.title) usage('--title is required — one line naming what changed');

  const root = path.resolve(opts.root || process.cwd());
  if (!fs.existsSync(root)) usage(`project root does not exist: ${root}`);

  const date = new Date().toISOString().split('T')[0];
  const archive = quarterFile(date);
  const archiveAbs = path.join(root, archive);

  const existingDocs = [];
  for (const rel of [...DECISION_SOURCES, archive]) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) existingDocs.push({ rel, content: fs.readFileSync(abs, 'utf8') });
  }
  if (existingDocs.length === 0) {
    usage(`no decision documents under ${root} — this is not a project (nothing to derive a number from)`);
  }

  const decision = opts.decision ? Number(opts.decision) : nextDecision(root, existingDocs);
  if (!Number.isFinite(decision) || decision < 1) usage(`--decision must be a positive number`);
  const sha = opts.sha || shortSha(root);
  const mode = opts.mode || deriveMode(root);
  if (!['vibe', 'standard', 'guarded'].includes(mode)) usage(`--mode must be vibe | standard | guarded (got "${mode}")`);

  const heading = `### ${date} — D${decision} · ${opts.title}`;
  const facts = [`**Mode:** ${mode}`, `**Commit:** \`${sha}\``];
  if (opts.doc) facts.push(`**Doc:** \`${opts.doc}\``);
  if (opts.receipt) facts.push(`**Receipt:** \`${opts.receipt}\``);
  const entry = `${heading}\n\n${wrap(`- ${facts.join(' · ')}`)}\n`;

  const writes = [];

  const archiveHeader = fs.existsSync(archiveAbs)
    ? ''
    : `# ${path.basename(archive, '.md')} — changelog archive\n\n` +
      'Append-only, newest last. One `### YYYY-MM-DD — D<n> · <title>` entry per slice,\n' +
      'wrapped at ≤400 characters per line. One file per quarter, not one per document.\n\n';
  const prior = fs.existsSync(archiveAbs) ? fs.readFileSync(archiveAbs, 'utf8') : '';
  writes.push({ rel: archive, content: `${prior}${prior && !prior.endsWith('\n') ? '\n' : ''}${prior ? '\n' : archiveHeader}${entry}` });

  for (const rel of FRESHNESS_DOCS) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const { content, changed } = updateFreshness(fs.readFileSync(abs, 'utf8'), date, sha, opts.title);
    if (changed) writes.push({ rel, content });
  }

  console.log('═══════════════════════════════════════════');
  console.log(`  Slice Close — ${root}`);
  console.log('═══════════════════════════════════════════\n');
  console.log(`  decision:  D${decision} (derived: max(existing) + 1)`);
  console.log(`  mode:      ${mode}${opts.mode ? ' (given)' : ' (from WORLD.md)'}`);
  console.log(`  commit:    ${sha}`);
  console.log(`  archive:   ${archive}`);
  console.log();
  for (const w of writes) console.log(`  ${opts.dryRun ? '·' : '✅'} ${w.rel}`);

  if (opts.dryRun) {
    console.log('\n  (--dry-run: nothing written)\n');
    process.exit(0);
  }

  for (const w of writes) {
    const abs = path.join(root, w.rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, w.content, 'utf8');
  }
  console.log(`\n✅ ${writes.length} file(s) written. Prose belongs in the acceptance body and the ADR; this was derived.\n`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { quarterFile, nextDecision, deriveMode, updateFreshness, wrap };
