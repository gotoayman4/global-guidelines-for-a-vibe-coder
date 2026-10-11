#!/usr/bin/env node

/**
 * new-guideline.js — Scaffold a guideline file and register it in MASTER_INDEX.md.
 *
 * Kills the manual ceremony (create file → front-matter → cross-reference footer → index row).
 * The scaffold carries the two things every guideline must declare — YAML front-matter
 * (`status` / `scope` / `tags`) and a `## Cross-References` footer — and then re-renders
 * MASTER_INDEX.md from the corpus instead of hand-inserting a row. Existing guards
 * (check-index, check-links, check-index-drift, audit) still validate the result.
 *
 * Usage:
 *   node new-guideline.js <category-dir> <slug> ["Title — Subtitle"]
 *   node new-guideline.js 01-workflow-methodology my-topic "My Topic — Short Purpose"
 *   node new-guideline.js 01-workflow-methodology my-topic --dry-run
 *
 * <category-dir>: one of 00-ai-fundamentals … 08-governance (or a nested path under guidelines/)
 * <slug>: kebab-case file name without .md
 *
 * Exit codes: 0 = created (or dry-run printed), 1 = validation/existence error, 2 = usage.
 *
 * Source: global-configs/scripts/new-guideline.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INDEX_PATH = path.join(REPO_ROOT, '_index', 'MASTER_INDEX.md');
const dryRun = process.argv.includes('--dry-run');

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error('Usage: node new-guideline.js <category-dir> <slug> ["Title — Subtitle"] [--dry-run]');
  console.error('Example: node new-guideline.js 01-workflow-methodology my-topic "My Topic — Short Purpose"');
  process.exit(2);
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

/** Front-matter tags: the slug's leading words, capped, plus a generic marker. */
function tagsFor(slug) {
  const words = slug.split('-').slice(0, 3);
  return [...words, 'guideline'];
}

function buildContent(title, category, slug) {
  return [
    '---',
    'status: "Normative"',
    'scope: "Global"',
    `tags: [${tagsFor(slug).join(', ')}]`,
    '---',
    '',
    `# ${title}`,
    '',
    '---',
    '',
    `Purpose: [State what this guideline governs and when to load it — one paragraph, category \`${category}\`.]`,
    '',
    '## Directives',
    '',
    '1. [First binding directive — MUST/SHOULD per RFC 2119.]',
    '2. [Second directive.]',
    '',
    '## Anti-Patterns',
    '',
    '| Anti-Pattern | Fix |',
    '|---|---|',
    '| [Bad habit] | [Correct behavior] |',
    '',
    '## Cross-References',
    '',
    '- **Depends on:** `development-workflow.md`',
    '- **See also:** `_index/MASTER_INDEX.md`',
    '',
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run');
  if (args.length < 2) usage();
  const [category, slug, titleArg] = args;

  if (!/^\d{2}-[a-z0-9-]+$/.test(category) && !/^\d{2}-[a-z0-9-]+\/[a-z0-9-]+/.test(category)) {
    usage(`category must look like 01-workflow-methodology (got: ${category})`);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    usage(`slug must be kebab-case (got: ${slug})`);
  }
  if (!fs.existsSync(INDEX_PATH)) fail(`MASTER_INDEX.md not found at ${INDEX_PATH}`);

  const dirPath = path.join(REPO_ROOT, category);
  const filePath = path.join(dirPath, `${slug}.md`);
  if (fs.existsSync(filePath)) fail(`file already exists: ${path.relative(REPO_ROOT, filePath)}`);

  const title = titleArg || `${slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} — TODO purpose`;
  const content = buildContent(title, category, slug);

  if (dryRun) {
    console.log('── dry run — would write file ──');
    console.log(path.relative(REPO_ROOT, filePath));
    console.log(content);
    console.log('── dry run — would re-render _index/MASTER_INDEX.md ──');
    process.exit(0);
  }

  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ created ${path.relative(REPO_ROOT, filePath)}`);

  // Register by regenerating the index from the corpus — never by hand-inserting a row.
  const { collect, renderIndex } = require('./render-index.js');
  const rendered = renderIndex(fs.readFileSync(INDEX_PATH, 'utf8'), collect());
  fs.writeFileSync(INDEX_PATH, rendered, 'utf8');
  console.log('✅ registered in _index/MASTER_INDEX.md (rendered)');

  console.log('Next steps:');
  console.log('  1. Replace the [bracketed] placeholders with real directives and add domain tags');
  console.log('  2. Add a matching fragment rule if the rule belongs in the constitution');
  console.log('  3. npm run render:starters (if fragment changed) && npm run validate');
}

if (require.main === module) main();

module.exports = { buildContent, tagsFor };
