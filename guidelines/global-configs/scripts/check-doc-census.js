#!/usr/bin/env node

/**
 * check-doc-census.js — One home per fact, enforced.
 *
 * INTENT: Fail the gate when a canonical fact — the stack table, the build/validation
 * command block, the forbidden-pattern list, the "How to Change Safely" table — appears
 * in more than one of the mandated project documents. The whole point of the doc set
 * (07-documentation/documentation-strategy.md §The Mandated Doc Set) is that each fact
 * has exactly one home; this guard is what stops a "helpful" second copy from returning.
 *
 * CONSTRAINT: Markers are HEADING-ANCHORED (`### Stack`, not the phrase "Stack"). A
 * cross-reference such as README's "…lives in AGENTS.md §Build & Validation Commands"
 * is a link, not a copy, and must NOT trip the census. Matching the phrase would punish
 * exactly the linking behaviour the doctrine asks for.
 *
 * DECISION: The corpus is the starter templates in the central repo, or the installed
 * docs when a project path is given. Both are checked against the same fact table, so a
 * downstream project is held to the same rule as the templates it was built from.
 *
 * SCOPE — the MANDATED set, not every file a tool loads. The set is AGENTS.md + WORLD.md +
 * README.md, plus docs/AI_ARCHITECTURE.md when the project carries it. Tool configs
 * (DEVTOOLS.md, .github/copilot-instructions.md) are tool-specific mirrors of rules whose home is
 * AGENTS.md; a rule repeated there for another loader is not a second home, and failing it would
 * fail a correct project. An absent on-demand document is reported as skipped, never as vacuous.
 *
 * TWO KINDS OF FACT. Most facts are a heading (`re`). `guard-inventory` is a SHAPE (`match`):
 * two or more distinct `guard:*` scripts named in one document, which is an inventory rather than
 * an incidental mention. Its one home is AGENTS.md, and the reason it exists is that the guard set
 * already has a home — the guards themselves, derived by `npm run guard:tiers` — so a second
 * document enumerating it is how a hand-kept list comes back.
 *
 * TWO ESCAPE HATCHES, both reported rather than silent. `templates: 'skip'` marks a fact the
 * template corpus cannot carry (the starter ships `[FILL]`s and names no guard). `vacuous: 'warn'`
 * marks a fact whose absence is legitimate in a real project too. Both print and neither fails —
 * a census that failed a correct project would be deleted, which is the one outcome worse than an
 * unguarded fact.
 *
 * Non-vacuity: a fact whose designated home does not actually contain it is reported as
 * vacuous — a marker that appears nowhere proves nothing. The test suite additionally
 * proves a deliberately duplicated fixture FAILS.
 *
 * Usage:
 *   node check-doc-census.js                 # central repo: scan the starter templates
 *   node check-doc-census.js <projectRoot>   # scan an installed project's docs
 *
 * Exit codes: 0 = one home per fact; 1 = a duplicated or vacuous fact; 2 = corpus error.
 *
 * @tier standard+ — a documentation contract. It governs the doc set rather than the code, so a
 *   `vibe` slice must not pay for it; it belongs at a milestone exit.
 *
 * Source: global-configs/scripts/check-doc-census.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATES = path.join(REPO_ROOT, 'global-configs', 'templates');

/**
 * The mandated project doc set. `installed` is where sync/new-project puts the file;
 * `template` is the central source. Both are compared by the same fact table.
 */
const MANDATED_DOCS = [
  { installed: 'AGENTS.md', template: 'AGENTS.starter.md' },
  { installed: 'WORLD.md', template: 'WORLD.starter.md' },
  { installed: 'README.md', template: 'README.starter.md' },
  { installed: 'docs/AI_ARCHITECTURE.md', template: 'AI_ARCHITECTURE.starter.md' },
];

/**
 * A guard script named in prose, as `npm run guard:tiers` or `` `guard:tiers` ``. Counting
 * DISTINCT names is what separates a list from an incidental mention: one command quoted inside a
 * sentence is prose, two or more is an inventory.
 */
const GUARD_SCRIPT = /(?:npm run |`)(guard:[a-z][a-z-]*)`?/g;

/** Does this document enumerate the guard set (two or more distinct `guard:*` scripts)? */
function namesGuards(content) {
  return new Set([...content.matchAll(GUARD_SCRIPT)].map((match) => match[1])).size >= 2;
}

/**
 * A canonical fact, its heading anchor, and the ONE file allowed to hold it.
 * `re` is matched against each document's text; the `m` flag makes `^` line-anchored.
 * `match` overrides `re` when a fact is not a heading but a shape (see `guard-inventory`).
 * `templates: 'skip'` marks a fact the template corpus cannot carry; `vacuous: 'warn'` marks one
 * whose absence is legitimate — both are reported, never failed.
 */
const CANONICAL_FACTS = [
  {
    id: 'stack-table',
    what: 'the stack table',
    re: /^#{2,3}\s+Stack\b/m,
    home: 'AGENTS.md',
  },
  {
    id: 'commands-block',
    what: 'the build/validation command block',
    re: /^#{2,3}\s+Build & Validation Commands/m,
    home: 'AGENTS.md',
  },
  {
    id: 'forbidden-patterns',
    what: 'the forbidden-pattern list',
    re: /^#{2,3}\s+Forbidden Patterns/m,
    home: 'AGENTS.md',
  },
  {
    id: 'how-to-change-safely',
    what: 'the "How to Change Safely" table',
    re: /^#{2,3}\s+How to Change Safely/m,
    home: 'docs/AI_ARCHITECTURE.md',
  },
  {
    // The inventory's real home is the guards themselves — `npm run guard:tiers` derives it from
    // their `@tier` docblocks. AGENTS.md is the one document allowed to NAME it, and the reason
    // this fact exists is that a second naming doc is how a hand-kept list comes back.
    id: 'guard-inventory',
    what: 'the guard inventory (the `guard:*` script set)',
    match: namesGuards,
    home: 'AGENTS.md',
    // The starter template ships `[FILL]` placeholders and names no guard, so this fact cannot be
    // non-vacuous there; a project that names none is not wrong either (the commands may be
    // `[FILL]`ed or absent). Absence is therefore reported, and only a SECOND copy fails.
    templates: 'skip',
    vacuous: 'warn',
  },
];

/**
 * Pure census over an explicit corpus.
 * @param {Array<{file: string, content: string}>} docs
 * @param {{templates?: boolean, missing?: string[]}} [opts] `templates` marks the central starter-template corpus;
 *   `missing` names mandated docs absent from the corpus (an on-demand doc is skipped, not failed).
 * @returns {{violations: string[], vacuous: string[], notes: string[], skipped: string[]}}
 */
function census(docs, opts = {}) {
  const violations = [];
  const vacuous = [];
  const notes = [];
  const skipped = [];
  const absent = new Set(opts.missing || []);
  for (const fact of CANONICAL_FACTS) {
    if (opts.templates && fact.templates === 'skip') {
      skipped.push(`${fact.id}: not enforced against the starter templates — ${fact.what} has no home in a template that ships [FILL]s`);
      continue;
    }
    const hit = fact.match || ((content) => fact.re.test(content));
    const holders = docs.filter((d) => hit(d.content)).map((d) => d.file);
    if (!holders.includes(fact.home)) {
      if (absent.has(fact.home)) {
        skipped.push(`${fact.id}: ${fact.home} is absent — this fact is not enforced in this corpus`);
        continue;
      }
      const line = `${fact.id}: ${fact.home} does not contain ${fact.what} — this fact is unguarded`;
      // A fact whose absence is legitimate is reported, never failed: the alternative is a guard
      // that fails a correct project, and a guard that fails correct work gets deleted.
      if (fact.vacuous === 'warn') notes.push(line);
      else vacuous.push(line);
      continue;
    }
    for (const stray of holders.filter((f) => f !== fact.home)) {
      violations.push(`${fact.id}: ${fact.what} also appears in ${stray} — its one home is ${fact.home}`);
    }
  }
  return { violations, vacuous, notes, skipped };
}

function collect(root, useTemplates) {
  const docs = [];
  const missing = [];
  for (const entry of MANDATED_DOCS) {
    const rel = useTemplates ? path.join('global-configs', 'templates', entry.template) : entry.installed;
    const label = useTemplates ? entry.template : entry.installed;
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      missing.push(label);
      continue;
    }
    docs.push({ file: entry.installed, content: fs.readFileSync(abs, 'utf8') });
  }
  return { docs, missing };
}

function main() {
  const arg = process.argv[2];
  const projectRoot = arg ? path.resolve(arg) : REPO_ROOT;
  const useTemplates = !arg;

  if (arg && !fs.existsSync(projectRoot)) {
    console.error(`✗ project path does not exist: ${projectRoot}`);
    process.exit(2);
  }

  console.log('═══════════════════════════════════════════');
  console.log('  Doc Census — one home per fact');
  console.log(`  ${useTemplates ? 'central templates' : projectRoot}`);
  console.log('═══════════════════════════════════════════\n');

  const { docs, missing } = collect(projectRoot, useTemplates);

  // Non-vacuity: an empty corpus is a data error, never a silent pass.
  if (docs.length === 0) {
    console.error(`✗ no mandated docs found under ${projectRoot} — corpus is empty`);
    process.exit(2);
  }
  // In the central repo every template must exist; in a project, optional docs may be absent.
  if (useTemplates && missing.length > 0) {
    console.error(`✗ mandated templates missing: ${missing.join(', ')}`);
    process.exit(2);
  }

  const { violations, vacuous, notes, skipped } = census(docs, { templates: useTemplates, missing });

  for (const v of violations) console.log(`   ❌ ${v}`);
  for (const v of vacuous) console.log(`   ⚠️  ${v}`);
  for (const n of notes) console.log(`   ℹ️  ${n}`);
  for (const s of skipped) console.log(`   ⏭️  ${s}`);
  if (violations.length === 0 && vacuous.length === 0) {
    const enforced = CANONICAL_FACTS.length - skipped.length;
    console.log(`✅ ${enforced} canonical facts, each in exactly one of ${docs.length} docs`);
  }
  if (missing.length > 0) console.log(`\n   (absent, skipped: ${missing.join(', ')})`);
  console.log();

  process.exit(violations.length > 0 || vacuous.length > 0 ? 1 : 0);
}

if (require.main === module) main();

module.exports = { census, collect, namesGuards, CANONICAL_FACTS, MANDATED_DOCS };
