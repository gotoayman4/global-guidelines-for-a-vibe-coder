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
  { installed: 'DEVTOOLS.md', template: 'DEVTOOLS.starter.md' },
  { installed: '.github/copilot-instructions.md', template: 'copilot-instructions.starter.md' },
];

/**
 * A canonical fact, its heading anchor, and the ONE file allowed to hold it.
 * `re` is matched against each document's text; the `m` flag makes `^` line-anchored.
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
];

/**
 * Pure census over an explicit corpus.
 * @param {Array<{file: string, content: string}>} docs
 * @returns {{violations: string[], vacuous: string[]}}
 */
function census(docs) {
  const violations = [];
  const vacuous = [];
  for (const fact of CANONICAL_FACTS) {
    const holders = docs.filter((d) => fact.re.test(d.content)).map((d) => d.file);
    if (!holders.includes(fact.home)) {
      vacuous.push(`${fact.id}: ${fact.home} does not contain ${fact.what} — this fact is unguarded`);
      continue;
    }
    for (const stray of holders.filter((f) => f !== fact.home)) {
      violations.push(`${fact.id}: ${fact.what} also appears in ${stray} — its one home is ${fact.home}`);
    }
  }
  return { violations, vacuous };
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

  const { violations, vacuous } = census(docs);

  for (const v of violations) console.log(`   ❌ ${v}`);
  for (const v of vacuous) console.log(`   ⚠️  ${v}`);
  if (violations.length === 0 && vacuous.length === 0) {
    console.log(`✅ ${CANONICAL_FACTS.length} canonical facts, each in exactly one of ${docs.length} docs`);
  }
  if (missing.length > 0) console.log(`\n   (absent, skipped: ${missing.join(', ')})`);
  console.log();

  process.exit(violations.length > 0 || vacuous.length > 0 ? 1 : 0);
}

if (require.main === module) main();

module.exports = { census, collect, CANONICAL_FACTS, MANDATED_DOCS };
