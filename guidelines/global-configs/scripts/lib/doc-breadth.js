#!/usr/bin/env node

/**
 * doc-breadth.js — how many steering files each mode writes, and which files count.
 *
 * INTENT: `07-documentation/documentation-strategy.md` §Trigger Table declares both facts and
 * owns both. Its header row states the breadth — `vibe — 1 write | standard — 2 writes |
 * guarded` — and its body names the file each row's write lands in. `check-doc-breadth.js`
 * needs both and owns neither, so it reads them from the table that owns them, the way
 * `lib/context-caps.js` reads the caps from the file that owns those. A second copy of either
 * fact drifts, and the drift is invisible because both copies keep looking right.
 *
 * DECISION: resolved from THIS FILE's location — `__dirname/../../..` is the mirror root, which
 * is `<central>/guidelines` centrally and `<project>/_guidelines` downstream. A path computed
 * against a repo root resolves to `<project>/guidelines`, which does not exist, and the reader
 * then returns empties in silence. That is the exact defect `lib/context-caps.js` documents, so
 * the same resolution rule is used here rather than relearned.
 *
 * CAVEAT: the two nulls mean different things and callers must not conflate them.
 *   - `caps.guarded === null` is a FACT: the guarded column states no number because that mode
 *     writes the full set, so it is unbounded by design.
 *   - an empty `steering` list, or a null `vibe`/`standard`, means the table could not be read.
 *     `ok` reports that, and a caller must report it as vacuous rather than as "no files count".
 *   - `steering` is derived from the files the table's rows name, so a project that adds a row
 *     naming a new file extends the set without touching this script. A row that names its file
 *     without backticks would be missed; the four that exist all use them.
 *
 * THE COUNTED SET IS BIGGER THAN THE TABLE, AND WHY. `steering` above is the CANONICAL set — the
 * homes the trigger table names. Counting only those made the guard blind to the failure it
 * exists for: a project can write `docs/PRD.md`, `docs/ROADMAP.md` and `docs/ACCEPTANCE.md` on
 * every slice and the count reads 1, because none of those three is one of the four. Measured
 * 2026-10-23 on the reference project's last 80 commits, the canonical count read 0–3 on a code
 * slice while the real markdown surface read 0–10. The doctrine's own anti-pattern is "a `vibe`
 * slice writing five steering files"; the canonical count could not see five of them.
 *
 * So the counted set is the UNION: the table's canonical homes plus the project's own markdown
 * surface. `steeringWrites` derives the second half from the changed files, because the surface
 * differs per project — a project keeps a PRD and a ROADMAP, another keeps neither, and neither
 * fact can be listed centrally without going stale in both.
 *
 * WHAT THE SURFACE EXCLUDES, AND WHERE EACH RULE COMES FROM. The exclusions are the categories
 * the constitution already names, so none of them is a private judgement of this script:
 *   - the RECORD (`docs/adr/`, `docs/changelog/`, `docs/DECISIONS.md`) never scales, so it is
 *     never counted (`documentation-strategy.md` §Record vs Ritual);
 *   - RUN EVIDENCE (`docs/gate-receipts/`) is written by every gate run, so counting it would
 *     count the gate rather than the slice;
 *   - DATED REPORTS are immutable records — the constitution exempts them by their date in the
 *     name — so a `YYYY-MM-DD` or `YYYY-Q<n>` anywhere in the path makes the file a record;
 *   - MACHINE OUTPUT (`*.lock.md`, `*.generated.md`) is written by a command, and prose cites it
 *     rather than transcribing it, so it is not a steering write;
 *   - the MIRROR (`_guidelines/`, `guidelines/`) and `node_modules/` are never the project's own.
 *
 * Source: global-configs/scripts/lib/doc-breadth.js
 */

const fs = require('fs');
const path = require('path');

/** The heading of the section that owns both facts. */
const SECTION_HEAD = /^Trigger Table\b/;

/**
 * Split on `## ` headings and keep the Trigger Table's chunk, so the §Record vs Ritual table
 * below it cannot leak in.
 *
 * A `([\s\S]*?)(?=\n##\s|$)` span is NOT used here: with `/m` the `$` alternative matches at the
 * end of the heading's own line, so the lazy body stops empty and every cap reads as unreadable.
 * Splitting has no such ambiguity. `###` subheadings do not split, because `##` followed by `#`
 * is not `##` followed by whitespace.
 */
function triggerTable(text) {
  return text.split(/^##\s+/m).find((chunk) => SECTION_HEAD.test(chunk)) || null;
}

/** The header row, whose cells carry the per-mode breadth. */
const HEADER = /^\|\s*Trigger\s*\|/;

/** A backticked `.md` path inside the table body — how a row names its target file. */
const TARGET = /`([A-Za-z0-9_][A-Za-z0-9_./-]*\.md)`/g;

/** `vibe` and `standard` must be readable for the guard to judge anything at all. */
const REQUIRED = ['vibe', 'standard'];

/** Three levels up from `lib/`: lib → scripts → global-configs → the mirror root. */
const OWNER = path.join(__dirname, '..', '..', '..', '07-documentation', 'documentation-strategy.md');

/**
 * The record: the decision history. It never scales, so it is never counted as a steering write.
 */
const RECORD = [/(^|\/)docs\/adr\//, /(^|\/)docs\/DECISIONS\.md$/, /(^|\/)docs\/changelog\//];

/** Run evidence: written by every gate run, so counting it would count the gate, not the slice. */
const RECEIPTS = [/(^|\/)docs\/gate-receipts\//];

/** An immutable dated report — the constitution exempts these by their date in the name. */
const DATED = /\d{4}-\d{2}-\d{2}|\d{4}-Q[1-4]/i;

/** Machine output: a command writes it, and prose cites it rather than transcribing it. */
const MACHINE = /\.(lock|generated)\.md$/i;

/** Trees that are never the project's own steering. */
const NOT_OWN = /(^|\/)(node_modules|_guidelines|guidelines)\//;

/**
 * Is this file in the project's steering SURFACE — the places a project's own fact-carrying
 * documents live?
 *
 * The surface is the project root and the root `docs/` tree. A nested `apps/x/docs/y.md` is
 * package documentation rather than project steering, and a root file that is not markdown is
 * not steering either.
 */
function inSteeringSurface(file) {
  const name = String(file).replace(/\\/g, '/');
  if (!name.endsWith('.md')) return false;
  if (NOT_OWN.test(name)) return false;
  if (name.startsWith('docs/')) return true;
  return !name.includes('/');
}

/**
 * Is this file a steering WRITE — a document a slice updated to keep a fact findable?
 *
 * @param {string} file the changed path, repo-relative
 * @returns {boolean}
 */
function isSteeringFile(file) {
  const name = String(file).replace(/\\/g, '/');
  if (!inSteeringSurface(name)) return false;
  if (RECORD.some((re) => re.test(name))) return false;
  if (RECEIPTS.some((re) => re.test(name))) return false;
  if (DATED.test(name)) return false;
  if (MACHINE.test(name)) return false;
  return true;
}

/**
 * The steering writes in a set of changed files — the union of the trigger table's canonical
 * homes and the project's own markdown surface.
 *
 * The union is explicit: a table row naming a file the surface rule would miss still counts,
 * because the table owns the canonical set and this script only widens it.
 *
 * @param {string[]} files changed paths, repo-relative
 * @param {string[]} [canonical] the canonical names, from `docBreadth()`
 * @returns {string[]}
 */
function steeringWrites(files, canonical = []) {
  const named = new Set(canonical);
  return files.filter((file) => named.has(file) || isSteeringFile(file));
}

/**
 * The trigger table's breadth and the files it writes into.
 *
 * @param {string} [owner] The file that owns both facts. Injectable so a test can prove the
 *   numbers follow the table rather than a constant baked in here.
 * @returns {{caps: {vibe: number|null, standard: number|null, guarded: number|null},
 *            steering: string[], ok: boolean, owner: string}}
 */
function docBreadth(owner = OWNER) {
  const caps = { vibe: null, standard: null, guarded: null };
  const none = { caps, steering: [], ok: false, owner };
  if (!fs.existsSync(owner)) return none;

  const body = triggerTable(fs.readFileSync(owner, 'utf8'));
  if (!body) return none;

  const header = body.split('\n').find((line) => HEADER.test(line));
  if (!header) return none;

  // Cells: ['', 'Trigger', 'vibe — 1 write', 'standard — 2 writes', 'guarded', ''].
  const cells = header.split('|').map((cell) => cell.trim());
  ['vibe', 'standard', 'guarded'].forEach((mode, index) => {
    const found = (cells[index + 2] || '').match(/(\d+)\s*writes?/i);
    caps[mode] = found ? Number(found[1]) : null;
  });

  const steering = [...new Set([...body.matchAll(TARGET)].map((match) => match[1]))].sort();

  const ok = REQUIRED.every((mode) => Number.isInteger(caps[mode])) && steering.length >= 2;
  return { caps, steering, ok, owner };
}

module.exports = { docBreadth, steeringWrites, isSteeringFile, inSteeringSurface, OWNER, RECORD, RECEIPTS, DATED, MACHINE, NOT_OWN };
