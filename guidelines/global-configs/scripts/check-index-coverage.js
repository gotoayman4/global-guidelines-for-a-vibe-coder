#!/usr/bin/env node

/**
 * check-index-coverage.js — Validates that MASTER_INDEX.md covers all files on disk.
 *
 * Usage:
 *   node global-configs/scripts/check-index-coverage.js
 *
 * Exit code: 0 = full coverage, 1 = files missing from index
 *
 * Source: global-configs/scripts/check-index-coverage.js
 * Last Updated: 2026-06-13
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INDEX_PATH = path.join(REPO_ROOT, '_index', 'MASTER_INDEX.md');
const SKIP_DIRS = ['.git', 'node_modules'];
const SKIP_FILES = ['README.md', 'package.json', 'sync-projects.json'];
const SKIP_PATTERNS = [
  /^REPO_AUDIT_REPORT_\d{4}-\d{2}-\d{2}\.md$/,
  /^IMPLEMENTATION_AUDIT_AND_ENHANCEMENT_PLAN_\d{4}-\d{2}-\d{2}\.md$/,
  /^check-(index-coverage|links)\.js$/,
];
const ROOT_INDEXED_FILES = ['sync-manager.ps1'];
const GLOBAL_CONFIG_ROOT_FILES = ['sync-manifest.json'];

function isSkipDir(name) {
  return SKIP_DIRS.includes(name) || name.startsWith('.');
}

function isSixDir(name) {
  return /^\d{2}-/.test(name);
}

function findGuidelineFiles(dirPath) {
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (!isSkipDir(entry.name) && isSixDir(entry.name)) {
        files.push(...findGuidelineFiles(full));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.js') || entry.name.endsWith('.ps1') || entry.name.endsWith('.psm1') || entry.name.endsWith('.json'))) {
      if (!isSkipFile(entry.name)) files.push(full);
    }
  }
  return files;
}

function isSkipFile(name) {
  if (SKIP_FILES.includes(name)) return true;
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  return false;
}

function findGlobalConfigFiles() {
  const files = [];
  const configDir = path.join(REPO_ROOT, 'global-configs');
  // Subdirectories: skills, templates, scripts
  const dirs = ['skills', 'templates', 'scripts'];
  for (const dir of dirs) {
    const dirPath = path.join(configDir, dir);
    if (!fs.existsSync(dirPath)) continue;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && !isSkipFile(entry.name)) {
        files.push(path.join(dirPath, entry.name));
      }
    }
  }
  // Root-level global-config files (e.g. sync-manifest.json)
  const rootEntries = fs.readdirSync(configDir, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.isFile() && GLOBAL_CONFIG_ROOT_FILES.includes(entry.name)) {
      files.push(path.join(configDir, entry.name));
    }
  }
  return files;
}

function findRootIndexedFiles() {
  const files = [];
  for (const name of ROOT_INDEXED_FILES) {
    const full = path.join(REPO_ROOT, name);
    if (fs.existsSync(full)) files.push(full);
  }
  return files;
}

function findIndexFiles() {
  const files = [];
  const indexPath = path.join(REPO_ROOT, '_index');
  if (!fs.existsSync(indexPath)) return files;
  const entries = fs.readdirSync(indexPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'MASTER_INDEX.md') {
      files.push(path.join(indexPath, entry.name));
    }
  }
  return files;
}

function extractIndexedFiles(indexContent, indexPath) {
  const files = new Set();
  const indexRelDir = path.relative(REPO_ROOT, path.dirname(indexPath)).replace(/\\/g, '/');
  // Capture the full link content including optional ../
  const regex = /\]\(((?:\.\.\/)?[^)]+(?:\.md|\.js|\.ps1|\.psm1|\.json|\.jsonc|\.template|\.mdc\.template))\)/g;
  let match;
  while ((match = regex.exec(indexContent)) !== null) {
    let ref = match[1].replace(/\\/g, '/');
    if (ref.startsWith('../')) {
      ref = ref.slice(3);
    } else {
      ref = indexRelDir + '/' + ref;
    }
    files.add(ref);
  }
  return files;
}

function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  MASTER_INDEX.md Coverage Check');
  console.log(`  ${new Date().toISOString().split('T')[0]}`);
  console.log('═══════════════════════════════════════════\n');

  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`❌ MASTER_INDEX.md not found at ${INDEX_PATH}`);
    process.exit(1);
  }

  const indexContent = fs.readFileSync(INDEX_PATH, 'utf8');
  const indexedFiles = extractIndexedFiles(indexContent, INDEX_PATH);

  const guidelineFiles = findGuidelineFiles(REPO_ROOT);
  const globalFiles = findGlobalConfigFiles();
  const rootFiles = findRootIndexedFiles();
  const indexFiles = findIndexFiles();
  const allFiles = [...guidelineFiles, ...globalFiles, ...rootFiles, ...indexFiles];

  console.log(`📖 Found ${allFiles.length} files on disk`);
  console.log(`📖 ${indexedFiles.size} files indexed in MASTER_INDEX.md\n`);

  let missing = [];
  for (const file of allFiles) {
    const relPath = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
    if (!indexedFiles.has(relPath)) {
      missing.push(relPath);
    }
  }

  missing.sort();
  if (missing.length === 0) {
    console.log('✅ All files covered in MASTER_INDEX.md');
  } else {
    console.log(`⚠️  ${missing.length} files not found in MASTER_INDEX.md:\n`);
    for (const f of missing) {
      console.log(`   - ${f}`);
    }
    console.log();
  }

  console.log('═══════════════════════════════════════════\n');
  if (missing.length > 0) process.exit(1);
}

main();
