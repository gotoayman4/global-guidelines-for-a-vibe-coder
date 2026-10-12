#!/usr/bin/env node

/**
 * slice-close.js — One command closes a slice: the record, the freshness line, the receipt pointer,
 * and (with `--adr`) the decision's three derived sites.
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
 * DECISION: `--adr` writes the decision's THREE derived sites — the ADR file's header block, the
 * row in `docs/adr/README.md`'s index, and the row in the decisions log — because all three restate
 * facts the repository already knows (the number, the date, the title). Measured: a project
 * recorded 50 decisions and hand-typed two index rows for each. The ADR's *reasoning* stays
 * authored: it arrives as `--why` and is never invented here. A full-depth ADR is authored by the
 * agent and passed with `--adr-file`, which makes this script add the rows without touching the file.
 *
 * Non-vacuity: the derived number is read back from the file it was just written to, so a second
 * run in the same project MUST return n+1. A corpus with no documents at all is a usage error,
 * never a silent pass.
 *
 * Usage:
 *   node slice-close.js [projectRoot] --title "<one line>" [--mode vibe|standard|guarded]
 *                       [--doc <file>] [--receipt <path>] [--decision <n>] [--sha <sha>] [--dry-run]
 *                       [--adr [--why "<one paragraph>"] [--adr-file <name>] [--adr-depth lite|full]]
 *
 * Exit codes: 0 = written (or --dry-run reported it), 2 = usage error.
 *
 * Source: global-configs/scripts/slice-close.js
 */

const fs = require('fs');
const path = require('path');
const { runSync } = require('./lib/run-sync.js');

/** Documents a decision number may appear in. Read-only; nothing is written back to them. */
const DECISION_SOURCES = ['AGENTS.md', 'WORLD.md', 'docs/PRD.md', 'docs/DECISIONS.md', 'docs/ROADMAP.md'];

/** Steering docs that carry a freshness line, if the project uses one. */
const FRESHNESS_DOCS = ['WORLD.md', 'docs/AI_ARCHITECTURE.md'];

/** The ADR index, and the header that identifies its table. */
const ADR_INDEX = 'docs/adr/README.md';
const ADR_INDEX_HEADER = /^\|\s*ADR\s*\|\s*Decision\s*\|/m;

/** Candidate homes of the decisions log, in preference order. */
const DECISION_LOG_CANDIDATES = ['docs/PRD.md', 'docs/DECISIONS.md'];
// `m` matters: this regex is tested against a whole document as well as line by line, and without
// it `^` only ever matches offset 0 — so a table that is not the first line reads as absent.
const DECISION_LOG_HEADER = /^\|\s*ID\s*\|\s*Decision\s*\|\s*Rationale\s*\|/m;

/** The only line this script will rewrite in a steering doc. Anything else is left alone. */
const FRESHNESS_RE = /^\*\*(?:Last Updated|Freshness):\*\*[^\n]*/m;

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error(
    'Usage: node slice-close.js [projectRoot] --title "<one line>" [--mode vibe|standard|guarded]\n' +
      '                            [--doc <file>] [--receipt <path>] [--decision <n>] [--sha <sha>] [--dry-run]\n' +
      '                            [--adr [--why "<one paragraph>"] [--adr-file <name>] [--adr-depth lite|full]]\n' +
      '                            [--duration <minutes> — intent → first running slice]',
  );
  process.exit(2);
}

function parseArgs(argv) {
  const opts = {
    title: null,
    mode: null,
    doc: null,
    receipt: null,
    decision: null,
    sha: null,
    dryRun: false,
    root: null,
    adr: false,
    why: null,
    adrFile: null,
    adrDepth: 'lite',
    duration: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--title') opts.title = argv[++i];
    else if (a === '--mode') opts.mode = argv[++i];
    else if (a === '--doc') opts.doc = argv[++i];
    else if (a === '--receipt') opts.receipt = argv[++i];
    else if (a === '--decision') opts.decision = argv[++i];
    else if (a === '--sha') opts.sha = argv[++i];
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--adr') opts.adr = true;
    else if (a === '--why') opts.why = argv[++i];
    else if (a === '--adr-file') opts.adrFile = argv[++i];
    else if (a === '--adr-depth') opts.adrDepth = argv[++i];
    else if (a === '--duration') opts.duration = argv[++i];
    else if (a.startsWith('--')) usage(`unknown option: ${a}`);
    else if (opts.root === null) opts.root = a;
    else usage(`unexpected argument: ${a}`);
  }
  return opts;
}

/** `Add a Retry to the login form` → `add-a-retry-to-the-login-form`, capped so the name stays readable. */
function slugify(title, max = 48) {
  const slug = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  return cut.slice(0, cut.lastIndexOf('-') > 0 ? cut.lastIndexOf('-') : max).replace(/-+$/, '');
}

/** `45` → `045`. The ADR file name and the decision number are one scheme, not two. */
function adrNumber(decision) {
  return String(decision).padStart(3, '0');
}

/**
 * Append `row` to the end of the first markdown table whose header line matches `headerRe`.
 * Returns the new content, or `null` when no such table exists — the caller reports that rather
 * than creating a table the project did not choose to have.
 */
function appendTableRow(content, headerRe, row) {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => headerRe.test(l));
  if (start === -1) return null;
  let end = start + 1;
  if (end < lines.length && /^\|[\s:|-]+\|$/.test(lines[end].trim())) end += 1;
  while (end < lines.length && lines[end].trim().startsWith('|')) end += 1;
  lines.splice(end, 0, row);
  return lines.join('\n');
}

/** The lite ADR: header fields derived, body authored (it arrives as `--why`). */
function buildLiteAdr({ number, title, date, decision, why }) {
  return (
    `# ADR ${number}: ${title}\n\n` +
    `## Status: Accepted (${date}) · **Depth:** lite · **Decision:** D${decision}\n\n` +
    `## Context / Decision\n\n${why}\n`
  );
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
  if (opts.adr && !opts.why) {
    usage('--adr requires --why — the reasoning is authored, never invented, and a row without it is a placeholder');
  }
  if (!['lite', 'full'].includes(opts.adrDepth)) usage(`--adr-depth must be lite | full (got "${opts.adrDepth}")`);
  if (opts.duration !== null && (!Number.isFinite(Number(opts.duration)) || Number(opts.duration) < 0)) {
    usage(`--duration must be a non-negative number of minutes (got "${opts.duration}")`);
  }

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
  // `speed-tiered-workflow.md` §Absolute Rules 5 mandates the measurement; this is where it lands.
  if (opts.duration !== null) facts.push(`**Intent→slice:** ${Number(opts.duration)}m`);
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

  // `--adr`: the decision's three derived sites. The ADR body is `--why`, authored by the caller;
  // everything else (number, date, title, depth) is a fact the repository already knows.
  const adrNotes = [];
  if (opts.adr) {
    const number = adrNumber(decision);
    const rel = opts.adrFile ? `docs/adr/${opts.adrFile}` : `docs/adr/${number}-${slugify(opts.title)}.md`;
    const depth = opts.adrDepth === 'full' ? 'Full' : 'Lite';

    if (fs.existsSync(path.join(root, rel))) {
      // A hand-authored (usually full-depth) ADR is never overwritten — the rows are added, the file is not.
      adrNotes.push(`${rel} exists — left untouched; only the index rows are written`);
    } else {
      writes.push({ rel, content: buildLiteAdr({ number, title: opts.title, date, decision, why: opts.why }) });
    }

    const indexAbs = path.join(root, ADR_INDEX);
    if (!fs.existsSync(indexAbs)) {
      adrNotes.push(`${ADR_INDEX} is absent — no ADR-index row written`);
    } else {
      const row = `| [${number}](${path.basename(rel)}) | ${opts.title} (D${decision}) | ${depth} | Accepted (${date}) |`;
      const next = appendTableRow(fs.readFileSync(indexAbs, 'utf8'), ADR_INDEX_HEADER, row);
      if (next === null) adrNotes.push(`${ADR_INDEX} has no "| ADR | Decision |" table — no index row written`);
      else writes.push({ rel: ADR_INDEX, content: next });
    }

    // The decisions log is the first candidate that actually CARRIES the table — not merely the
    // first that exists, or a `docs/PRD.md` reduced to a pointer heading would swallow the row.
    const log = DECISION_LOG_CANDIDATES.map((rel) => {
      const abs = path.join(root, rel);
      return fs.existsSync(abs) ? { rel, content: fs.readFileSync(abs, 'utf8') } : null;
    }).find((c) => c && DECISION_LOG_HEADER.test(c.content));

    if (!log) {
      adrNotes.push('no decisions log carrying an "| ID | Decision | Rationale |" table was found — no log row written');
    } else {
      const row = `| D${decision} | ${opts.title} | ${opts.why} |`;
      writes.push({ rel: log.rel, content: appendTableRow(log.content, DECISION_LOG_HEADER, row) });
    }
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
  for (const n of adrNotes) console.log(`  ⚠️  ${n}`);

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

module.exports = {
  quarterFile,
  nextDecision,
  deriveMode,
  updateFreshness,
  wrap,
  slugify,
  adrNumber,
  appendTableRow,
  buildLiteAdr,
  ADR_INDEX,
  DECISION_LOG_CANDIDATES,
};
