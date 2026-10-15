#!/usr/bin/env node

/**
 * check-links.js — Validates all internal links in guideline .md files.
 *
 * TWO DEFECT CLASSES, BECAUSE THEY HAVE DIFFERENT OWNERS.
 *   1. BROKEN — the target does not exist anywhere the checker can find it. The file's author fixes it.
 *   2. MIRROR ESCAPE — a relative link inside the mirrored subtree resolves OUTSIDE that subtree. The
 *      target usually exists (in this repo), so class 1 never sees it; but this file is delivered to a
 *      project as `_guidelines/`, where the same `../../` lands in the project's own root or above it.
 *      A project cannot fix it and its own link check goes permanently red on content it may not edit —
 *      measured twice: `_index/MASTER_INDEX.md` → repo-root `sync-manager.ps1` (recorded 2026-10-11) and
 *      the emulator skill → `docs/repo-meta/skill-design-patterns.md` (added 2026-10-12, unnoticed until
 *      a project's count went from one known red to two). A link that survives being mirrored is written
 *      as a name plus its central location; only a link that resolves inside the mirror is written as a
 *      path. `documentation-strategy.md` §Delivery states the rule; this is the instrument.
 *
 * Usage:
 *   node global-configs/scripts/check-links.js          # check the mirrored subtree this script lives in
 *   node global-configs/scripts/check-links.js --fix    # report only, no exit code
 *
 * THE PATH ARGUMENT IS DELIBERATELY IGNORED, and the scanned root is printed so a caller can see it
 * rather than infer it. Measured 2026-10-15 against all seven registered projects: honouring a project
 * root as the scanned tree reports 430–625 "broken links" per repo (GAMS 504, `gs-coordinator-helper`
 * 599, `property-management-app` 570). Those are not 500 link-rot defects — the two fallback resolvers
 * below (path-from-scan-root, then bare-basename index) are conventions OF THIS CORPUS, and applied to
 * a project's own `docs/`, `AGENTS.md` and `.github/instructions/` they mis-resolve almost everything.
 * Widening the scan is therefore not a switch this script can flip honestly; a project that wants its
 * own doc set link-checked needs a checker whose resolution rules are the project's. Claiming
 * `docs:links` covers "the doc set" from a project root is the false statement this note replaces.
 *
 * Exit code: 0 = all links valid and none escaping, 1 = broken links or mirror escapes found
 *
 * @tier standard+ — a broken link is a broken repo, but the tree it guards is the guidelines tree:
 *   a project runs it at a milestone (`docs:links`), not on every push. `always` is reserved for a
 *   control that is meaningful in every repo the file is mirrored into.
 *
 * Source: global-guidelines-for-a-vibe-coder/global-configs/scripts/check-links.js
 * Last Updated: 2026-10-15
 */

const fs = require('fs');
const path = require('path');

// The scanned tree is the mirrored subtree this script lives in — always. `CHECK_LINKS_MIRROR` re-anchors
// it for a hermetic test fixture; it is not how a project widens its own check (see the header for the
// measurement that decided this).
const MIRROR_ROOT = path.resolve(process.env.CHECK_LINKS_MIRROR || path.join(__dirname, '..', '..'));
const REPO_ROOT = MIRROR_ROOT;
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

/**
 * Does this link belong to the mirrored subtree, and does it leave it?
 *
 * Only a relative path with a separator can escape: an in-file anchor, a URL, an absolute path and a
 * bare filename (which every resolver here may satisfy from anywhere) are not this defect class.
 *
 * @param {string} href raw link target
 * @param {string} sourceFile absolute path of the file carrying the link
 * @param {string} [root] the mirror root to test against
 * @returns {{escaping: boolean, resolved: string|null}}
 */
function escapingLink(href, sourceFile, root = MIRROR_ROOT) {
  const noAnchor = String(href).split('#')[0];
  if (noAnchor === '' || /^(https?:|mailto:|file:)/i.test(noAnchor)) return { escaping: false, resolved: null };
  if (path.isAbsolute(noAnchor) || /^[A-Za-z]:[\\/]/.test(noAnchor)) return { escaping: false, resolved: null };
  if (!noAnchor.includes('/') && !noAnchor.includes('\\')) return { escaping: false, resolved: null };
  const resolved = path.resolve(path.dirname(sourceFile), noAnchor);
  const inside = resolved === root || resolved.startsWith(root + path.sep);
  return { escaping: !inside, resolved };
}

function main() {
  const isFix = process.argv.includes('--fix');
  console.log('═══════════════════════════════════════════');
  console.log('  Internal Link Checker');
  console.log(`  ${new Date().toISOString().split('T')[0]}`);
  console.log('═══════════════════════════════════════════\n');
  // Stated, not assumed: the scope is the tree this script lives in, whatever a caller passed as an
  // argument. A project that reads "No broken links" must be able to see WHICH tree that covers.
  console.log(`🔍 Scanned root (the mirrored subtree): ${MIRROR_ROOT}\n`);

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
  let escapeCount = 0;
  let mirrorLinkCount = 0;
  let checkedCount = 0;
  let skippedBareCount = 0;

  for (const file of mdFiles) {
    const fileName = path.basename(file);
    if (isSkipFile(fileName)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const links = extractLinks(content, file);

    for (const link of links) {
      // Class 2 is tested FIRST, and independently of existence: an escaping link whose target exists
      // (in this repo) is exactly the case class 1 cannot see — both recorded instances resolved fine
      // centrally, which is why they were invisible until a project's link check turned red. Every
      // scanned file lives inside the mirror by construction (the scanned root IS the mirror), so the
      // rule needs no "is this file mirrored?" test — that is the point of anchoring the scan to it.
      mirrorLinkCount++;
      const esc = escapingLink(link.href, file);
      if (esc.escaping) {
        escapeCount++;
        console.log(`🚫 MIRROR ESCAPE: ${path.relative(MIRROR_ROOT, file)}`);
        console.log(`   Link: ${link.href}`);
        console.log(`   Resolves outside the mirrored subtree to: ${esc.resolved}`);
        console.log(`   Context: "${link.line}"\n`);
        continue;
      }

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
  // Non-vacuity, printed always: an escape check that inspected no link is an escape check that passed
  // for nothing, and a reader cannot tell the two apart from a green line.
  console.log(`🔎 ${mirrorLinkCount} link(s) inside the mirrored subtree judged against it (${escapeCount} escaping)`);
  if (skippedBareCount > 0) {
    console.log(`ℹ️  ${skippedBareCount} bare filename refs skipped (conceptual references, not broken links)`);
  }
  if (brokenCount > 0) {
    console.log(`❌ ${brokenCount} broken links found`);
  } else {
    console.log('✅ No broken links');
  }
  if (escapeCount > 0) {
    console.log(
      `🚫 ${escapeCount} link(s) escape the mirrored subtree — a defect of THIS repo's content, not of the` +
        ' project that mirrors it. Write the name and its central location, not a path.'
    );
  }
  console.log('═══════════════════════════════════════════\n');

  if (!isFix && brokenCount + escapeCount > 0) process.exit(1);
}

module.exports = { escapingLink, findMdFiles, extractLinks, MIRROR_ROOT };

if (require.main === module) main();
