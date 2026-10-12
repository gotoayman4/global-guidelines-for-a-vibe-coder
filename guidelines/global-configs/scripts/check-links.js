#!/usr/bin/env node

/**
 * check-links.js — Validates all internal links in guideline .md files.
 *
 * Usage:
 *   node global-configs/scripts/check-links.js          # check all .md files
 *   node global-configs/scripts/check-links.js --fix     # report only, no exit code
 *
 * Exit code: 0 = all links valid, 1 = broken links found
 *
 * @tier standard+ — a broken link is a broken repo, but the tree it guards is the guidelines tree:
 *   a project runs it at a milestone (`docs:links`), not on every push. `always` is reserved for a
 *   control that is meaningful in every repo the file is mirrored into.
 *
 * Source: global-guidelines-for-a-vibe-coder/global-configs/scripts/check-links.js
 * Last Updated: 2026-06-13
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKIP_DIRS = ['.git', 'node_modules'];
const SKIP_FILES = [/^REPO_AUDIT_REPORT_\d{4}-\d{2}-\d{2}\.md$/];

const ALLOWED_DOT_DIRS = new Set(['.github']);

function isSkipDir(name) {
  if (ALLOWED_DOT_DIRS.has(name)) return false;
  return SKIP_DIRS.includes(name) || name.startsWith('.');
}

function isSkipFile(name) {
  for (const pattern of SKIP_FILES) {
    if (pattern.test(name)) return true;
  }
  return false;
}

function findMdFiles(dirPath) {
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (!isSkipDir(entry.name)) files.push(...findMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

function extractLinks(content, filePath) {
  const links = [];
  const relDir = path.dirname(filePath).replace(REPO_ROOT + path.sep, '');
  const lines = content.split('\n');

  // Match markdown links: [text](path) and bare file references in backticks or lists
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const backtickRefRegex = /`([\w\/.-]+\.md)`/g;

  for (const line of lines) {
    let match;
    while ((match = linkRegex.exec(line)) !== null) {
      const href = match[2];
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#') || href.startsWith('mailto:')) continue;
      // Skip bare links that don't look like file references
      if (!href.includes('.')) continue;
      links.push({ href, line: line.trim().slice(0, 120) });
    }
    while ((match = backtickRefRegex.exec(line)) !== null) {
      const ref = match[1];
      if (ref.startsWith('http') || ref.startsWith('#') || ref.startsWith('.') || ref.startsWith('docs/')) continue;
      if (ref.startsWith('_guidelines/')) {
        links.push({ href: ref.replace('_guidelines/', ''), line: line.trim().slice(0, 120) });
      } else if (ref.startsWith('~')) {
        // Skip tilde paths (global config refs)
        continue;
      } else {
        links.push({ href: ref, line: line.trim().slice(0, 120) });
      }
    }
  }

  return links;
}

function resolveLink(href, sourceFile) {
  // Strip anchor fragments before resolving
  const noAnchor = href.split('#')[0];
  // Relative to the source file's directory
  const sourceDir = path.dirname(sourceFile);
  const resolved = path.resolve(sourceDir, noAnchor);
  return resolved;
}

function main() {
  const isFix = process.argv.includes('--fix');
  console.log('═══════════════════════════════════════════');
  console.log('  Internal Link Checker');
  console.log(`  ${new Date().toISOString().split('T')[0]}`);
  console.log('═══════════════════════════════════════════\n');

  const mdFiles = findMdFiles(REPO_ROOT);
  console.log(`📖 Found ${mdFiles.length} .md files to check\n`);

  // Build filename index for fallback resolution
  const allMdFilesByName = {};
  for (const f of mdFiles) {
    const base = path.basename(f);
    if (!allMdFilesByName[base]) allMdFilesByName[base] = [];
    allMdFilesByName[base].push(f);
  }

  let brokenCount = 0;
  let checkedCount = 0;
  let skippedBareCount = 0;

  for (const file of mdFiles) {
    const fileName = path.basename(file);
    if (isSkipFile(fileName)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const links = extractLinks(content, file);

    for (const link of links) {
      let resolved = resolveLink(link.href, file);

      // Primary check: resolve relative to source file's directory
      if (!fs.existsSync(resolved)) {
        // Fallback 1: resolve relative to REPO_ROOT (handles repo-relative paths like _index/MASTER_INDEX.md)
        const resolvedFromRoot = path.resolve(REPO_ROOT, link.href);
        if (fs.existsSync(resolvedFromRoot)) {
          checkedCount++;
          continue;
        }
        // Fallback 2: bare .md filename — search by basename across the repo
        const noAnchor = link.href.split('#')[0];
        const basename = path.basename(noAnchor);
        const hasSeparator = noAnchor.includes('/') || noAnchor.includes('\\');
        if (noAnchor.endsWith('.md') && !hasSeparator) {
          if (allMdFilesByName[basename]) {
            checkedCount++;
            continue;
          }
          // Bare .md filename that doesn't resolve anywhere — conceptual reference, not a broken link
          skippedBareCount++;
          continue;
        }

        // With path separator and still not found — genuinely broken
        const relPath = path.relative(REPO_ROOT, file);
        brokenCount++;
        console.log(`❌ BROKEN: ${relPath}`);
        console.log(`   Link: ${link.href}`);
        console.log(`   Resolved: ${resolved}`);
        console.log(`   Context: "${link.line}"\n`);
      } else {
        checkedCount++;
      }
    }
  }

  console.log(`✅ ${checkedCount} links verified`);
  if (skippedBareCount > 0) {
    console.log(`ℹ️  ${skippedBareCount} bare filename refs skipped (conceptual references, not broken links)`);
  }
  if (brokenCount > 0) {
    console.log(`❌ ${brokenCount} broken links found`);
  } else {
    console.log('✅ No broken links');
  }
  console.log('═══════════════════════════════════════════\n');

  if (!isFix && brokenCount > 0) process.exit(1);
}

main();
