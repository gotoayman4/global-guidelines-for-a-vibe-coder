#!/usr/bin/env node

/**
 * new-guideline.js — Scaffold a guideline file and register it in MASTER_INDEX.md.
 *
 * Kills the manual ceremony (create file → frontmatter → See-also stub → index row).
 * Existing guards (check-index, check-links, audit) still validate the result.
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

function today() {
  return new Date().toISOString().split('T')[0];
}

function buildContent(title, category) {
  return [
    `# ${title}`,
    '',
    '**Status:** Normative',
    '**Scope:** Global',
    '**Token Tier:** Full (~800 tokens)',
    `**Last Updated:** ${today()}`,
    '**Cross-References:** `development-workflow.md`',
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

function findSectionAnchor(indexContent, category) {
  // Sections are "### NN — Display Name"; rows link as ../NN-dir/….
  // Prefer the section whose table already contains rows for this category.
  const headingRe = /^###\s+.*$/gm;
  const headings = [...indexContent.matchAll(headingRe)];
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index;
    const end = i + 1 < headings.length ? headings[i + 1].index : indexContent.length;
    const section = indexContent.slice(start, end);
    if (section.includes(`](../${category}/`)) {
      return anchorAtLastRow(section, start);
    }
  }
  // Fallback: match heading by category numeric prefix, e.g. 01-workflow-methodology → ### 01 —
  const num = category.split('/')[0].slice(0, 2);
  const prefixRe = new RegExp(`^###\\s+${num}\\b`, 'm');
  const match = prefixRe.exec(indexContent);
  if (!match) return null;
  const start = match.index;
  const rest = indexContent.slice(start + match[0].length);
  const nextHeading = /^#{2,3}\s+/m.exec(rest);
  const end = nextHeading ? start + match[0].length + nextHeading.index : indexContent.length;
  return anchorAtLastRow(indexContent.slice(start, end), start);
}

function anchorAtLastRow(section, offset) {
  const rows = [...section.matchAll(/^﻿?\|.*\|$/gm)];
  if (rows.length === 0) return null;
  const lastRow = rows[rows.length - 1];
  return offset + lastRow.index + lastRow[0].length;
}

function buildIndexRow(slug, category) {
  const title = slug
    .split('-')
    .map((w) => (w === 'md' ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
  // Display title: keep kebab but capitalize first letter of each word for label
  const label = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  void title;
  return `\n| [${slug}.md](../${category}/${slug}.md) | Normative | Global | ~800 | \`#${slug.split('-')[0]}\` \`#guideline\` |`;
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
  const content = buildContent(title, category);

  const indexContent = fs.readFileSync(INDEX_PATH, 'utf8');
  if (indexContent.includes(`](../${category}/${slug}.md)`)) {
    fail(`MASTER_INDEX.md already lists ${category}/${slug}.md`);
  }
  const anchor = findSectionAnchor(indexContent, category);
  if (anchor === null) {
    fail(`no indexed section found in MASTER_INDEX.md for "${category}" — add the category heading first`);
  }

  const row = buildIndexRow(slug, category);
  const newIndex = indexContent.slice(0, anchor) + row + indexContent.slice(anchor);

  if (dryRun) {
    console.log('── dry run — would write file ──');
    console.log(path.relative(REPO_ROOT, filePath));
    console.log(content);
    console.log('── dry run — would insert into MASTER_INDEX.md ──');
    console.log(row.trim());
    process.exit(0);
  }

  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  fs.writeFileSync(INDEX_PATH, newIndex, 'utf8');

  console.log(`✅ created ${path.relative(REPO_ROOT, filePath)}`);
  console.log(`✅ registered row in _index/MASTER_INDEX.md`);
  console.log('Next steps:');
  console.log('  1. Replace [TODO] placeholders with real directives');
  console.log('  2. Add a matching fragment rule if the rule belongs in the constitution');
  console.log('  3. npm run render:starters (if fragment changed) && npm run validate');
}

if (require.main === module) main();

module.exports = { buildContent, buildIndexRow, findSectionAnchor };
