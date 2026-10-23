#!/usr/bin/env node

/**
 * slice-close.js — One command closes a slice: the record, the receipt pointer, the freshness line,
 * and (with `--adr`) the decision's three derived sites.
 *
 * INTENT: The steering writes a slice owes are DERIVED facts — the date, the commit, the decision
 * number, the receipt path — and hand-typing a derived fact is how it goes stale silently
 * (documentation-strategy.md §Machine output is referenced, never transcribed). This script writes
 * them from the repository's own state, so the agent spends its prose only where prose IS the
 * product: the acceptance body and an ADR.
 *
 * CONSTRAINT: A `--receipt` path must exist before it is cited. A pointer to a file the gate never
 * wrote is a false record, and the one thing a receipt exists to prevent is a claim with no
 * artifact behind it.
 *
 * CONSTRAINT: The freshness line moves only for the doc the slice names with `--doc`. Bumping every
 * freshness doc on every slice would make the line mean "some slice closed", not "this document
 * changed" — a derived marker that lies in the same shape as one typed by hand.
 *
 * CONSTRAINT: It never invents a decision number, and it never counts its own in-flight work.
 * The next one is `max(existing) + 1`, computed from the COMMITTED tree (`git show HEAD:./<path>`,
 * which git resolves against the project root rather than the repository root) of the documents
 * that carry decisions, falling back to the file on disk only when nothing is committed for that
 * path (a brand-new archive, or a project that is not a git repository at all). Measured
 * 2026-10-23 in gs-coordinator-helper at D360: reading the working tree, the tool derived D361
 * while the repository's authoritative next-number line still said D360 — the slice's own
 * half-written record had raised the maximum, so closing the same slice twice invented a number
 * nobody had used. The same run exposed the second half: a line that DECLARES the next unclaimed
 * number is an earmark, not a record, and scanning it like a used number returns the number after
 * the one reserved. Such a line is therefore skipped by the scan and taken as the answer when it is
 * the higher of the two. The CLI report names which fact answered (`--dry-run` prints it) because a
 * derived number that cannot say where it came from is indistinguishable from a typed one.
 * A counter kept in a file races between two concurrent sessions and needs its own parity guard
 * to notice; a derived number cannot, and `--decision` is the override when a concurrent session
 * really did take it (documentation-strategy.md §Record vs Ritual).
 *
 * DECISION: One archive per quarter is the DEFAULT, not the rule — the rule is ONE primary entry
 * per slice. A single event written into four per-document changelog files is four copies of one
 * fact, the exact shape "one canonical copy per rule" outlaws, so `docs/changelog/<YYYY>-Q<n>.md`
 * carries a `**Doc:**` column instead of the project growing a file per document
 * (documentation-strategy.md §History). A project whose primary archive is named after the document
 * it serves passes `--archive docs/changelog/roadmap-2026-Q4.md`; no second archive is written,
 * because a slice recorded twice is the same four-copies defect with a different filename.
 *
 * DECISION: `--adr` writes the decision's THREE derived sites — the ADR file's header block, the
 * row in `docs/adr/README.md`'s index, and the row in the decisions log — because all three restate
 * facts the repository already knows (the number, the date, the title). Measured: a project
 * recorded 50 decisions and hand-typed two index rows for each. The ADR's *reasoning* stays
 * authored: it arrives as `--why` and is never invented here. A full-depth ADR is authored by the
 * agent and passed with `--adr-file`, which makes this script add the rows without touching the file.
 *
 * Non-vacuity: the derived number comes from the committed tree, so a run before the slice is
 * committed reports the number the tree already owes, and a run after it MUST report n+1. A corpus
 * with no documents at all is a usage error, never a silent pass. An `--archive` outside `docs/`, or
 * one that is not markdown, is the same: a record written where no guard looks is worse than none.
 *
 * Usage:
 *   node slice-close.js [projectRoot] --title "<one line>" [--mode vibe|standard|guarded]
 *                       [--doc <file>] [--receipt <path>] [--decision <n>] [--archive <rel.md>]
 *                       [--sha <sha>] [--dry-run]
 *                       [--adr [--why "<one paragraph>"] [--adr-file <name>] [--adr-depth lite|full]]
 *
 * Exit codes: 0 = written (or --dry-run reported it), 2 = usage error.
 *
 * Source: global-configs/scripts/slice-close.js
 */

const fs = require('fs');
const path = require('path');
const { runSync } = require('./lib/run-sync.js');
const { deriveMode } = require('./lib/project-mode.js');

/** Documents a decision number may appear in. Read-only; nothing is written back to them. */
const DECISION_SOURCES = ['AGENTS.md', 'WORLD.md', 'docs/PRD.md', 'docs/DECISIONS.md', 'docs/ROADMAP.md'];

/** Steering docs that carry a freshness line, if the project uses one. Only the slice's `--doc` moves. */
const FRESHNESS_DOCS = ['WORLD.md', 'docs/AI_ARCHITECTURE.md'];

/**
 * A line that DECLARES the next unclaimed number — `- Next D-number: **D360** …` is the shape this
 * repo's starters render. The number on it is a reservation, not a record, so it is excluded from
 * the used-number scan and offered as the answer instead (see the header CONSTRAINT).
 */
const NEXT_NUMBER_LINE_RE = /^\s*(?:[-*]\s*)?Next\s+(?:D-number|decision\s+number|slice\s+number)\s*:/i;
const NEXT_NUMBER_VALUE_RE = /\bD(\d{1,4})\b/i;

/** Where an `--archive` may live. A record outside these bounds is a file no guard reads. */
const ARCHIVE_PATH_RE = /^(?:\.\/)?docs\/[\w\-.\/]+\.md$/;

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
      '                            [--doc <file>] [--receipt <path>] [--decision <n>] [--archive <rel.md>]\n' +
      '                            [--sha <sha>] [--dry-run]\n' +
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
    archive: null,
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
    else if (a === '--archive') opts.archive = argv[++i];
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
 * The next decision number: `max(D<n>) + 1` over the numbers already USED in the documents that
 * carry decisions, or 1 when none exists — and never below a number a document has explicitly
 * earmarked as next. Derived, never counted, and derived from the COMMITTED tree so the record this
 * slice is writing cannot raise the number it is claiming (see the header CONSTRAINT).
 *
 * `extra` is for a document the caller has already read and knows about — the archive, which is not
 * in DECISION_SOURCES and whose path only `main()` resolves.
 */
function nextDecision(root, extra = []) {
  return nextFromDocs([...loadDecisionDocs(root), ...extra]);
}

/** The number a corpus owes: one above the highest USED number, never below a declared earmark. */
function nextFromDocs(docs) {
  let max = 0;
  for (const doc of docs) {
    for (const line of doc.content.split(/\r?\n/)) {
      // An earmark line is skipped whole, not just its number: the same line often carries a
      // sentence naming other numbers, and none of them is a record either.
      if (NEXT_NUMBER_LINE_RE.test(line)) continue;
      for (const m of line.matchAll(/\bD(\d{1,4})\b/g)) {
        const n = Number(m[1]);
        if (n > max) max = n;
      }
    }
  }
  return Math.max(max + 1, declaredNextNumber(docs));
}

/** The documents a number is derived from: this project's own, from the committed tree. */
function loadDecisionDocs(root) {
  const docs = [];
  for (const rel of DECISION_SOURCES) {
    const content = committedText(root, rel);
    if (content !== null) docs.push({ rel, content });
  }
  return docs;
}

/** The highest number a document declares to be the next unclaimed one; 0 when none does. */
function declaredNextNumber(docs) {
  let declared = 0;
  for (const doc of docs) {
    for (const line of doc.content.split(/\r?\n/)) {
      if (!NEXT_NUMBER_LINE_RE.test(line)) continue;
      const hit = line.match(NEXT_NUMBER_VALUE_RE);
      if (hit) declared = Math.max(declared, Number(hit[1]));
    }
  }
  return declared;
}

/**
 * The committed bytes at `rel`, or the working-tree file when HEAD has no such path (a document
 * created this slice), or null when neither exists. `git show` is used rather than `git ls-tree`
 * + a blob read because the answer needed is the text, and a range-limited read would need the
 * object id first. A non-zero status is not an error here — an untracked file simply has no
 * committed version.
 */
function committedText(root, rel) {
  // `HEAD:./` is git's notation for "relative to the current directory", and the cwd is the project
  // root. The bare `HEAD:<path>` form resolves from the REPOSITORY root, so a project that is a
  // subdirectory of an enclosing repo would be derived from that repo's files — a number invented
  // from somebody else's history.
  const result = runSync('git', ['show', `HEAD:./${rel}`], { cwd: root });
  if (result.status === 0) return result.stdout;
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

/** The declared mode, read from WORLD.md. Absent or silent → `standard` (speed-tiered-workflow.md). */
// Owned by `lib/project-mode.js` — this file reads the same declaration that resolves the
// context cap in `measure-boot-budget.js`, and two copies of the regex would drift.

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
  const archive = opts.archive || quarterFile(date);
  if (!ARCHIVE_PATH_RE.test(archive)) {
    usage(`--archive must name a markdown file under docs/ (got "${archive}")`);
  }
  const archiveAbs = path.join(root, archive);

  if (opts.receipt) {
    const receiptAbs = path.resolve(root, opts.receipt);
    if (!fs.existsSync(receiptAbs) || !fs.statSync(receiptAbs).isFile()) {
      usage(
        `--receipt does not name an existing file: ${opts.receipt} — run the gate first; ` +
          'a citation of a missing receipt is false evidence',
      );
    }
  }

  // Derivation reads the COMMITTED tree; the append below still reads the file on disk, because a
  // record nobody has committed is a record that exists and must not be duplicated.
  const derivationDocs = loadDecisionDocs(root);
  const archiveDoc = committedText(root, archive);
  if (archiveDoc !== null) derivationDocs.push({ rel: archive, content: archiveDoc });
  if (derivationDocs.length === 0) {
    usage(`no decision documents under ${root} — this is not a project (nothing to derive a number from)`);
  }

  const decision = opts.decision ? Number(opts.decision) : nextFromDocs(derivationDocs);
  if (!Number.isFinite(decision) || decision < 1) usage(`--decision must be a positive number`);
  // Which fact answered. The report names it because a derived number that cannot say where it came
  // from is indistinguishable from one that was typed.
  const earmark = declaredNextNumber(derivationDocs);
  const decisionSource = opts.decision
    ? 'given by --decision'
    : earmark === decision && earmark > 0
      ? "from the project's declared next-number line"
      : 'derived: max(committed used D<n>) + 1';
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
    if (opts.doc !== rel) continue;
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
  console.log(`  decision:  D${decision} (${decisionSource})`);
  console.log(`  mode:      ${mode}${opts.mode ? ' (given)' : ' (from WORLD.md)'}`);
  console.log(`  commit:    ${sha}`);
  console.log(`  archive:   ${archive}${opts.archive ? ' (given by --archive)' : ' (one per quarter)'}`);
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
  nextFromDocs,
  declaredNextNumber,
  committedText,
  loadDecisionDocs,
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
