#!/usr/bin/env node

/**
 * measure-boot-budget.js — How many tokens does a session pay just to start work?
 *
 * INTENT: Report the reading cost of a project's mandated steering chain: per-file
 * characters, estimated tokens (chars/4), line count, longest paragraph, longest
 * table row, and how much of each file is dated history rather than instruction.
 * Optionally fail on a budget (--max-tokens, or --cap-from-mode to derive it from the
 * mode `WORLD.md` declares), a per-file history share (--history-warn + --strict), or
 * missing files in an authoritative chain (--files + --strict).
 *
 * The chain and the menu are reported separately, and only the chain is budgeted. The
 * chain is what the doctrine marks `every session`; the menu is everything else the
 * project carries, which a session opens by choice. Adding the two together and calling
 * the sum "what a session pays" overstates the cost by whatever the project's spec
 * weighs — measured once at 65K for a project whose actual session read was 14K — and a
 * budget nothing can meet is a budget nobody wires. Report-only mode remains the default
 * because the menu is genuinely optional.
 *
 * Long paragraphs and long table rows are reported as ADVISORIES: readability, not
 * correctness. They appear in every mode, including `--strict`, but they never set the
 * exit code. The thresholds are `*_WARN` constants and a 500-character paragraph does not
 * break a build; a gate that fails a milestone exit over one is a gate people delete.
 *
 * CONSTRAINT: This is a measurement instrument, not a gate. Without --strict it
 * reports threshold and missing-file findings without failing; malformed options
 * and an entirely missing corpus still return a data/usage error.
 *
 * DECISION: tokens are chars/4 because that is the estimate used by
 * render-agents-starter.js for the constitution's own token budget; using a second
 * formula here would make the two numbers disagree without either being wrong.
 *
 * CAVEAT: the history heuristic is textual and covers dated rows, dated entry
 * headings with their bodies, named change-log sections, and repeated-entry
 * ledgers (three or more matching entries inside one section). A document that
 * keeps history in a different shape still under-reports; this instrument exists
 * to find the large change logs that consume a boot chain, not to audit prose.
 *
 * CAVEAT: the "longest line" number is split deliberately, because one number
 * merges two defects with opposite fixes. A long PARAGRAPH is a formatting accident
 * — a hard newline inside it costs nothing and makes it skimmable. A long TABLE ROW
 * cannot be wrapped without breaking the table, so the instrument must not report it
 * as "unwrappable" and stop there: the finding is that the cell is holding prose, and
 * the fix is to move the prose out of the table.
 *
 * Usage:
 *   node measure-boot-budget.js [projectRoot] [--files a.md,b.md] [--json]
 *   node measure-boot-budget.js . --max-tokens 40000 --history-warn 25 --strict
 *
 * Source: global-configs/scripts/measure-boot-budget.js
 * Last Updated: 2026-09-22
 */

const fs = require('fs');
const path = require('path');
const { deriveMode } = require('./lib/project-mode.js');

const VALUE_FLAGS = new Set(['files', 'max-tokens', 'history-warn']);
const BOOLEAN_FLAGS = new Set(['json', 'strict', 'cap-from-mode']);

/**
 * The default reading set: the documents the doctrine tells a session to read, plus the
 * on-demand documents a project of this shape carries.
 *
 * `load` is the doctrine's own word for it. `documentation-strategy.md` §The Mandated Doc
 * Set marks each document `every session` or `on demand`, and only the `every session`
 * rows are the boot chain — the chain a mode's context budget is about. The `on-demand`
 * rows are a menu: reported, because a bloated spec is worth seeing, but NOT charged to
 * the mode's budget, because a budget that also covers the documents you read by choice
 * measures a library rather than a session.
 *
 * OWNER: the chain's membership and the per-mode cap it is measured against live in
 * `01-workflow-methodology/speed-tiered-workflow.md` §The Context Budget, which delegates
 * the load policy to `07-documentation/documentation-strategy.md` §The Mandated Doc Set.
 * A project with its own documents passes `--files`, which replaces this list and treats
 * every path as chain — the flag declares a floor, and a floor is what gets budgeted.
 *
 * CAVEAT: the load class decides what absence means. An `always` file is the chain — it must
 * exist and it is charged to the mode budget. A `required` file is a member of the mandated doc
 * set that is read for orientation rather than every session — it must exist, but it is not
 * charged (`documentation-strategy.md` §The Mandated Doc Set: an absent README is a doc set that
 * lost a member, not a note). An `on-demand` file is menu — optional, because a project may
 * legitimately not carry every menu document, which is the reason report-only is the default.
 * Failing a build because a project has no `DEVTOOLS.md` would teach people to delete the check.
 */
const DEFAULT_FILES = [
  { rel: 'AGENTS.md', load: 'always' },
  { rel: 'WORLD.md', load: 'always' },
  { rel: 'README.md', load: 'required' },
  { rel: 'DEVTOOLS.md', load: 'on-demand' },
  { rel: 'docs/PRD.md', load: 'on-demand' },
  { rel: 'docs/ROADMAP.md', load: 'on-demand' },
  { rel: 'docs/AI_ARCHITECTURE.md', load: 'on-demand' },
  { rel: 'docs/DATA_POLICY.md', load: 'on-demand' },
  { rel: 'docs/RUNBOOKS.md', load: 'on-demand' },
  { rel: 'docs/adr/README.md', load: 'on-demand' },
  { rel: 'docs/STATE_TRANSITION_MATRIX.md', load: 'on-demand' },
  { rel: 'docs/DECISIONS.md', load: 'on-demand' },
];

/**
 * The declared per-mode reading caps, read from the file that owns them. Returns nulls when
 * the owner file is absent (a standalone project without the `_guidelines/` mirror).
 */
const { contextCaps } = require('./lib/context-caps.js');

/** A paragraph this long cannot be skimmed; wrap it at word boundaries. */
const PARA_WARN = 500;
/** A table row this long is unreadable in every renderer, and cannot be wrapped. */
const ROW_WARN = 800;
/** Rows past this length are counted for reference even when not flagged. */
const ROW_NOTED = 400;
/** Codex CLI default `project_doc_max_bytes` (32 KiB) across the root AGENTS.md chain. */
const CODEX_BYTES_WARN = 32768;
/** Non-pointer prose threshold in CLAUDE.md alongside AGENTS.md (causes double-load with @AGENTS.md). */
const CLAUDE_EXTRA_BYTES_WARN = 1500;

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

function usage() {
  return [
    'Usage: node measure-boot-budget.js [projectRoot] [--files a.md,b.md] [--json] [--strict]',
    '       node measure-boot-budget.js . --max-tokens 40000 --history-warn 25 --strict',
    '       node measure-boot-budget.js . --cap-from-mode --strict',
  ].join('\n');
}

function parsePositiveInteger(raw, flagName) {
  const value = Number(raw);
  if (String(raw).trim() === '' || !Number.isSafeInteger(value) || value <= 0) {
    throw new UsageError(`--${flagName} must be a positive integer; received "${raw}"`);
  }
  return value;
}

function parsePercentage(raw, flagName) {
  const value = Number(raw);
  if (String(raw).trim() === '' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new UsageError(`--${flagName} must be a number from 0 to 100; received "${raw}"`);
  }
  return value;
}

function parseArgs(argv) {
  let rootArg = null;
  const values = {};
  const flags = new Set();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      if (BOOLEAN_FLAGS.has(name)) {
        flags.add(name);
        continue;
      }
      if (!VALUE_FLAGS.has(name)) {
        throw new UsageError(`unknown option "${arg}"`);
      }
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new UsageError(`--${name} requires a value`);
      }
      values[name] = value;
      i += 1;
      continue;
    }

    if (rootArg !== null) {
      throw new UsageError(`unexpected positional argument "${arg}"`);
    }
    rootArg = arg;
  }

  const files = values.files === undefined
    ? DEFAULT_FILES
    : values.files.split(',').map((file) => ({ rel: file.trim(), load: 'always' })).filter((f) => f.rel);
  if (files.length === 0) {
    throw new UsageError('--files requires at least one non-empty path');
  }

  const capFromMode = flags.has('cap-from-mode');
  let maxTokens = values['max-tokens'] === undefined
    ? null
    : parsePositiveInteger(values['max-tokens'], 'max-tokens');
  if (capFromMode) {
    if (maxTokens !== null) {
      throw new UsageError('--cap-from-mode and --max-tokens are mutually exclusive — the cap has one source');
    }
    const mode = deriveMode(path.resolve(rootArg || process.cwd()));
    const cap = contextCaps()[mode];
    if (!cap) {
      throw new UsageError(
        `--cap-from-mode could not resolve the ${mode} cap — is the _guidelines/ mirror present?`,
      );
    }
    maxTokens = cap;
  }

  return {
    root: path.resolve(rootArg || process.cwd()),
    files,
    maxTokens,
    capFromMode,
    historyWarn: values['history-warn'] === undefined
      ? 25
      : parsePercentage(values['history-warn'], 'history-warn'),
    json: flags.has('json'),
    strict: flags.has('strict'),
  };
}

/** A dated change-log row, bold date, or other single-line dated marker. */
const DATED_LINE = /^\s*(?:\|\s*)?(?:#{1,6}\s+)?\*{0,2}\s*\d{4}-\d{2}-\d{2}\b/;
/** A dated Markdown heading whose following body belongs to that entry. */
const DATED_HEADING = /^(#{1,6})\s+(?:\*{0,2}\s*)?\d{4}-\d{2}-\d{2}\b/;
/** A heading that announces the section as a change log. Deliberately narrow: a
 *  guideline titled "...history..." is prose about history, not history itself. */
const HISTORY_HEADING = /^(#{2,6})\s+.*(change log|changelog|revision history|update log)/i;
const HEADING = /^(#{1,6})\s+/;
/** One entry of a running ledger: `**Change (previous):** …`, `**Update 2026-09-22:** …`.
 *  Deliberately keyed on the ENTRY PREFIX rather than the section name — a
 *  one-line `**Freshness:**` header is instruction, and matching it by heading name
 *  would flag every document that correctly dates itself. Only repetition is proof. */
const LEDGER_ENTRY = /^\s*\*\*(?:change|update|revision|entry)(?:\s*\([^)]*\))?\s*[:—]/i;
/** Entries at or above which a section is a ledger rather than a dated header. */
const LEDGER_MIN = 3;

function headingAt(lines, index) {
  const match = lines[index].match(HEADING);
  return match ? { level: match[1].length } : null;
}

function nextHeadingAtOrAbove(lines, start, level) {
  for (let i = start + 1; i < lines.length; i += 1) {
    const heading = headingAt(lines, i);
    if (heading && heading.level <= level) return i;
  }
  return lines.length;
}

/** Add a half-open line range to a list for later de-duplication. */
function addRange(ranges, start, end) {
  if (start < end) ranges.push({ start, end });
}

/**
 * Return history ranges rather than counting matching lines independently.
 * Range union is important: a dated entry can contain a repeated ledger and a
 * named change-log section can contain dated entries without double-counting.
 */
function historyRanges(lines) {
  const ranges = [];

  lines.forEach((line, index) => {
    const datedHeading = line.match(DATED_HEADING);
    if (datedHeading) {
      const level = datedHeading[1].length;
      let end = index + 1;
      for (let i = index + 1; i < lines.length; i += 1) {
        const heading = headingAt(lines, i);
        if (heading && (heading.level <= level || DATED_HEADING.test(lines[i]))) {
          end = i;
          break;
        }
        end = i + 1;
      }
      addRange(ranges, index, end);
    } else if (DATED_LINE.test(line)) {
      addRange(ranges, index, index + 1);
    }

    const historyHeading = line.match(HISTORY_HEADING);
    if (historyHeading) {
      addRange(ranges, index, nextHeadingAtOrAbove(lines, index, historyHeading[1].length));
    }
  });

  /**
   * Group repeated ledger entries by their nearest containing heading. Entries
   * in separate sections must not make one another look like a ledger.
   */
  const groups = new Map();
  let nearestHeading = -1;
  lines.forEach((line, index) => {
    if (headingAt(lines, index)) nearestHeading = index;
    if (!LEDGER_ENTRY.test(line)) return;
    const group = groups.get(nearestHeading) || [];
    group.push(index);
    groups.set(nearestHeading, group);
  });

  for (const [sectionStart, entries] of groups) {
    if (entries.length < LEDGER_MIN) continue;
    const sectionLevel = sectionStart === -1 ? 1 : headingAt(lines, sectionStart).level;
    const end = sectionStart === -1
      ? lines.length
      : nextHeadingAtOrAbove(lines, sectionStart, sectionLevel);
    addRange(ranges, entries[0], end);
  }

  const merged = ranges
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .reduce((result, range) => {
      const previous = result[result.length - 1];
      if (previous && range.start <= previous.end) {
        previous.end = Math.max(previous.end, range.end);
      } else {
        result.push({ ...range });
      }
      return result;
    }, []);
  const qualifyingLedgerEntries = [...groups.values()]
    .filter((entries) => entries.length >= LEDGER_MIN)
    .reduce((count, entries) => count + entries.length, 0);
  return { ranges: merged, ledgerEntries: qualifyingLedgerEntries };
}

function measure(root, rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return { rel, missing: true };
  const text = fs.readFileSync(abs, 'utf8');
  const lines = text.split('\n');
  const history = historyRanges(lines);
  const historyLineIndexes = new Set();
  for (const range of history.ranges) {
    for (let i = range.start; i < range.end; i += 1) historyLineIndexes.add(i);
  }
  const historyChars = [...historyLineIndexes]
    .reduce((sum, i) => sum + lines[i].length + (i < lines.length - 1 ? 1 : 0), 0);
  const chars = text.length;
  const bytes = Buffer.byteLength(text, 'utf8');
  const isRow = (l) => /^\|/.test(l);
  const prose = lines.filter((l) => !isRow(l));
  const tableRows = lines.filter(isRow);
  return {
    rel,
    chars,
    bytes,
    tokens: Math.ceil(chars / 4),
    lines: lines.length,
    longestPara: prose.reduce((m, l) => Math.max(m, l.length), 0),
    longestRow: tableRows.reduce((m, l) => Math.max(m, l.length), 0),
    rowsOverNoted: tableRows.filter((l) => l.length > ROW_NOTED).length,
    historyChars,
    historyPct: chars ? Math.round((historyChars / chars) * 100) : 0,
    ledgerEntries: history.ledgerEntries,
    archivePointers: (text.match(/docs\/changelog\/[\w.-]+\.md|docs\/gate-receipts\/[\w.-]+\.md/g) || []).length,
  };
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof UsageError)) throw error;
  console.error(`✗ ${error.message}`);
  console.error(usage());
  process.exit(2);
}

const rows = options.files.map((file) => ({ ...measure(options.root, file.rel), load: file.load }));
const missing = rows.filter((row) => row.missing);
const missingChain = missing.filter((row) => row.load === 'always');
const missingRequired = missing.filter((row) => row.load === 'required');
const missingMenu = missing.filter((row) => row.load === 'on-demand');
const present = rows.filter((row) => !row.missing);
const chain = present.filter((row) => row.load === 'always');
const menu = present.filter((row) => row.load === 'on-demand');
const total = chain.reduce((s, r) => s + r.tokens, 0);
const menuTotal = menu.reduce((s, r) => s + r.tokens, 0);

const problems = [];
const advisories = [];
// A missing chain file is a failure; a missing required file is a doc-set failure; a missing
// menu file is a note (see DEFAULT_FILES).
for (const row of missingChain) {
  problems.push(`${row.rel}: file not found under ${options.root}`);
}
for (const row of missingRequired) {
  problems.push(`${row.rel}: file not found under ${options.root} — a mandated doc-set member is missing (documentation-strategy.md §The Mandated Doc Set)`);
}
if (options.maxTokens !== null && total > options.maxTokens) {
  problems.push(`chain ~${total} tokens > budget ${options.maxTokens}`);
}
for (const r of present) {
  if (r.historyPct > options.historyWarn) {
    const why = r.ledgerEntries >= LEDGER_MIN ? `incl. a ${r.ledgerEntries}-entry ledger` : 'dated rows/headings';
    problems.push(`${r.rel}: ${r.historyPct}% dated history (${why}) > ${options.historyWarn}%`);
  }
  // Readability, not correctness — the constants are named `*_WARN` and the docblock lists
  // only budget/history/missing as fatal. A 500-character paragraph does not break a build,
  // and a check that fails a milestone exit over one is a check people delete.
  if (r.longestPara > PARA_WARN) {
    advisories.push(`${r.rel}: paragraph of ${r.longestPara} chars > ${PARA_WARN} — wrap it, a hard newline costs nothing`);
  }
  if (r.longestRow > ROW_WARN) {
    advisories.push(
      `${r.rel}: table row of ${r.longestRow} chars > ${ROW_WARN} — a row cannot be wrapped, so the prose does not belong in a table cell`,
    );
  }
  if (r.rel === 'AGENTS.md' && r.bytes > CODEX_BYTES_WARN) {
    advisories.push(
      `AGENTS.md: ${r.bytes} UTF-8 bytes > ${CODEX_BYTES_WARN} (32 KiB Codex CLI project_doc_max_bytes default) — trim project detail to docs/AI_ARCHITECTURE.md or gate via WORLD.md capabilities`,
    );
  }
}

const agentsPresent = present.find((r) => r.rel === 'AGENTS.md');
const claudePath = path.join(options.root, 'CLAUDE.md');
if (agentsPresent && fs.existsSync(claudePath)) {
  const claudeText = fs.readFileSync(claudePath, 'utf8');
  const stripped = claudeText
    .replace(/<!-- BEGIN generated:project-entrypoint[\s\S]*?<!-- END generated:project-entrypoint -->/g, '')
    .replace(/^#\s+CLAUDE\.md[^\n]*\n?/i, '')
    .trim();
  const extraBytes = Buffer.byteLength(stripped, 'utf8');
  if (extraBytes > CLAUDE_EXTRA_BYTES_WARN) {
    advisories.push(
      `CLAUDE.md: ${extraBytes} UTF-8 bytes of legacy/custom prose outside the pointer block alongside AGENTS.md — Claude Code loads both when CLAUDE.md imports @AGENTS.md; deduplicate into AGENTS.md`,
    );
  }
}

if (options.json) {
  console.log(JSON.stringify({
    root: options.root,
    totalTokens: total,
    onDemandTokens: menuTotal,
    maxTokens: options.maxTokens,
    mode: options.capFromMode ? deriveMode(options.root) : null,
    missingCount: missingChain.length,
    missingFiles: missingChain.map((row) => row.rel),
    missingRequiredFiles: missingRequired.map((row) => row.rel),
    missingMenuFiles: missingMenu.map((row) => row.rel),
    files: rows.filter((row) => row.load === 'always'),
    required: rows.filter((row) => row.load === 'required'),
    onDemand: rows.filter((row) => row.load === 'on-demand'),
    problems,
    advisories,
  }, null, 2));
} else {
  console.log('═══════════════════════════════════════════');
  console.log(`  Boot Reading Budget — ${options.root}`);
  console.log(`  ${new Date().toISOString().split('T')[0]}`);
  console.log('═══════════════════════════════════════════\n');

  const printTable = (group) => {
    console.log(
      'file'.padEnd(30) + 'tokens'.padStart(9) + 'chars'.padStart(10) + 'lines'.padStart(7) +
      'paraMax'.padStart(9) + 'rowMax'.padStart(8) + 'rows>400'.padStart(10) +
      'historyChars'.padStart(13) + 'history%'.padStart(10) + 'pointers'.padStart(10),
    );
    for (const r of group) {
      if (r.missing) { console.log(r.rel.padEnd(30) + '  — (not present)'); continue; }
      console.log(
        r.rel.padEnd(30) + String(r.tokens).padStart(9) + String(r.chars).padStart(10) +
        String(r.lines).padStart(7) + String(r.longestPara).padStart(9) + String(r.longestRow).padStart(8) +
        String(r.rowsOverNoted).padStart(10) + String(r.historyChars).padStart(13) + String(r.historyPct).padStart(10) +
        String(r.archivePointers).padStart(10),
      );
    }
  };

  console.log('  BOOT CHAIN — read every session, charged to the mode budget\n');
  printTable(rows.filter((r) => r.load === 'always'));
  console.log(`\n  chain total: ~${total} tokens read before the first edit`);
  const caps = contextCaps();
  if (caps.vibe) {
    console.log(`  mode caps (speed-tiered-workflow.md): vibe ${caps.vibe} · standard ${caps.standard} · guarded ${caps.guarded}`);
    if (options.maxTokens === null) {
      const verdict = total > caps.vibe ? `OVER the vibe cap (${caps.vibe})` : `within the vibe cap (${caps.vibe})`;
      console.log(`  → ${verdict} — report only, no budget given`);
    } else {
      const mode = options.capFromMode ? deriveMode(options.root) : null;
      const label = mode ? `the ${mode} cap` : 'the given budget';
      const verdict = total > options.maxTokens
        ? `OVER ${label} (${options.maxTokens})`
        : `within ${label} (${options.maxTokens})`;
      console.log(`  → ${verdict}`);
    }
  }

  if (menu.length > 0 || rows.some((r) => r.load === 'on-demand')) {
    console.log('\n  ON-DEMAND MENU — read by choice, NOT charged to the mode budget\n');
    printTable(rows.filter((r) => r.load === 'on-demand'));
    console.log(`\n  menu total: ~${menuTotal} tokens across ${menu.length} document(s) — a ratchet (rule 4), not a budget`);
  }

  const requiredPresent = rows.filter((r) => r.load === 'required' && !r.missing);
  if (requiredPresent.length > 0) {
    console.log(`\n  MANDATED, NOT CHAINED — must exist, not charged to the budget\n`);
    printTable(requiredPresent);
  }

  console.log(`\n  missing chain files: ${missingChain.length}${missingChain.length ? ` (${missingChain.map((row) => row.rel).join(', ')})` : ''}`);
  if (missingRequired.length) {
    console.log(`  missing required files: ${missingRequired.length} (${missingRequired.map((row) => row.rel).join(', ')}) — a mandated doc-set member is missing, not a note`);
  }
  if (missingMenu.length) {
    console.log(`  absent menu files: ${missingMenu.length} (${missingMenu.map((row) => row.rel).join(', ')}) — a note, not a failure`);
  }
  if (problems.length === 0) {
    console.log('  ✅ nothing over threshold' + (options.maxTokens === null ? ' (no --max-tokens given, report only)' : ''));
  } else {
    console.log(`\n  ${options.strict ? '❌' : '⚠️'} ${problems.length} finding(s)${options.strict ? ':' : ' (report only):'}`);
    for (const p of problems) console.log(`     - ${p}`);
  }
  if (advisories.length) {
    console.log(`\n  ℹ️  ${advisories.length} readability note(s) — never fatal, fix opportunistically:`);
    for (const a of advisories) console.log(`     - ${a}`);
  }
  console.log('  fixes: 01-workflow-methodology/workflow-friction-audit.md (the audit),');
  console.log('         07-documentation/documentation-strategy.md (history → dated archives),');
  console.log('         00-ai-fundamentals/context-management-strategy.md (reading budget)');
  console.log();
}

if (present.length === 0) process.exit(2);
process.exit(options.strict && problems.length > 0 ? 1 : 0);
