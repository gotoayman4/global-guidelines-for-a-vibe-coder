#!/usr/bin/env node

/**
 * bump-freshness.js — Machine-bump freshness headers on steering docs.
 *
 * Freshness header format (documentation-strategy.md):
 *   **Last Updated:** YYYY-MM-DD | **Commit:** short SHA | **Change:** one line
 *
 * Guideline files carry NO freshness field — their `Last Updated` answer comes from
 * `git log`, and `render-index.js` derives everything else from front-matter. This
 * script therefore only touches steering docs (WORLD.md, docs/AI_ARCHITECTURE.md).
 *
 * Usage:
 *   node bump-freshness.js [file ...]           # explicit files (steering docs)
 *   node bump-freshness.js --steering           # default steering set in cwd
 *   node bump-freshness.js --steering --message "short change note"
 *   node bump-freshness.js --check --steering   # exit 1 if any header older than today (report mode)
 *
 * Never transcribes machine output — it only edits the header line itself.
 * Exit codes: 0 = bumped/ok, 1 = --check found stale headers, 2 = usage/file error.
 *
 * Source: global-configs/scripts/bump-freshness.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Only the docs that carry a freshness header (documentation-strategy.md §Freshness Header).
// AGENTS.md and README.md deliberately have none — they change on a trigger and git dates them.
const STEERING_DEFAULT = [
  'WORLD.md',
  'docs/AI_ARCHITECTURE.md',
];

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error('Usage: node bump-freshness.js [--steering] [files...] [--message "<note>"] [--check]');
  process.exit(2);
}

function shortSha(cwd) {
  try {
    return execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'nosha';
  }
}

function bumpHeader(content, date, sha, message) {
  const fullRe = /\*\*Last Updated:\*\*\s*\d{4}-\d{2}-\d{2}\s*\|\s*\*\*Commit:\*\*\s*\S+\s*\|\s*\*\*Change:\*\*[^\n]*/;
  const fullLine = `**Last Updated:** ${date} | **Commit:** ${sha} | **Change:** ${message}`;
  if (fullRe.test(content)) {
    return { content: content.replace(fullRe, fullLine), changed: true };
  }
  const plainRe = /\*\*Last Updated:\*\*\s*\d{4}-\d{2}-\d{2}/;
  if (plainRe.test(content)) {
    return { content: content.replace(plainRe, `**Last Updated:** ${date}`), changed: true };
  }
  return { content, changed: false };
}

function isStale(content, date) {
  const m = content.match(/\*\*Last Updated:\*\*\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) return true;
  return m[1] !== date;
}

function main() {
  const argv = process.argv.slice(2);
  let mode = null;
  let message = 'chore: freshness bump';
  let check = false;
  const files = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--steering') {
      if (mode) usage('--steering specified twice');
      mode = a;
    } else if (a === '--check') {
      check = true;
    } else if (a === '--message') {
      message = argv[++i];
      if (!message) usage('--message requires a value');
    } else if (a.startsWith('--')) {
      usage(`unknown option: ${a}`);
    } else {
      files.push(a);
    }
  }

  const cwd = process.cwd();
  const date = new Date().toISOString().split('T')[0];
  const sha = shortSha(cwd);

  let targets = files;
  if (!targets.length) {
    if (mode === '--steering') targets = STEERING_DEFAULT;
    else usage('pass file paths or --steering');
  }

  const absTargets = targets.map((f) => path.resolve(cwd, f));
  for (const abs of absTargets) {
    if (!fs.existsSync(abs)) usage(`file not found: ${abs}`);
  }

  if (check) {
    let stale = 0;
    for (let i = 0; i < absTargets.length; i++) {
      const content = fs.readFileSync(absTargets[i], 'utf8');
      if (isStale(content, date)) {
        stale++;
        console.log(`⚠️  stale: ${targets[i]}`);
      }
    }
    if (stale > 0) {
      console.log(`\n${stale} header(s) not dated ${date}. Run without --check to bump.`);
      process.exit(1);
    }
    console.log(`✅ all ${absTargets.length} headers dated ${date}`);
    process.exit(0);
  }

  let bumped = 0;
  let missing = 0;
  for (let i = 0; i < absTargets.length; i++) {
    const content = fs.readFileSync(absTargets[i], 'utf8');
    const result = bumpHeader(content, date, sha, message);
    if (result.changed) {
      fs.writeFileSync(absTargets[i], result.content, 'utf8');
      bumped++;
      console.log(`✅ bumped ${targets[i]}`);
    } else {
      missing++;
      console.log(`⚠️  no freshness header in ${targets[i]} — add one manually`);
    }
  }
  console.log(`\n${bumped} bumped, ${missing} without header.`);
  process.exit(missing > 0 && absTargets.length === 1 && missing === absTargets.length ? 0 : 0);
}

if (require.main === module) main();

module.exports = { bumpHeader, isStale };
