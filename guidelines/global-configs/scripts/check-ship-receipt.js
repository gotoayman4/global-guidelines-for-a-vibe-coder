#!/usr/bin/env node

/**
 * check-ship-receipt.js — a release push owes a passing receipt for the code it ships.
 *
 * INTENT. The modes defer the build (`standard`) and the suite (`vibe`) to the ship boundary. A
 * boundary that only exists in prose is not a boundary: nothing stopped a release from going out
 * without the full pipeline ever having run. This guard is the executable half. On a release push
 * the pre-push hook calls it, and it passes only when the newest `docs/gate-receipts/*.md`
 *   - says PASS, and names a release class at least as deep as the one being shipped
 *     (a `production` receipt satisfies a `pilot` push; a `pilot` receipt does not satisfy
 *     `production`);
 *   - describes the code being pushed: its commit is HEAD, or everything changed since then lives
 *     under `docs/gate-receipts/` (committing the receipt itself moves HEAD, and that must not
 *     invalidate it). A receipt measured on an older commit says nothing about newer code.
 *
 * NOT APPLICABLE. A repository whose `package.json` declares no `gate:receipt` script owes none —
 * this repo among them — and says so instead of failing. The scaffold wires the script, so a
 * scaffolded project is never silently outside the check.
 *
 * WHAT IT DOES NOT PROVE: that the receipt was produced honestly. It reads a file; the file is the
 * wrapper's output (`gate-receipt.js`), and a hand-written receipt defeats it.
 *
 * Usage:
 *   node check-ship-receipt.js [<projectRoot>] [--class pilot|production] [--json]
 *
 * Exit codes: 0 = a valid receipt (or not applicable); 1 = missing or stale; 2 = usage error.
 *
 * @tier ship — runs at the ship boundary in every mode; a per-push `vibe` loop never owes a receipt.
 *
 * Source: global-configs/scripts/check-ship-receipt.js
 */

const fs = require('fs');
const path = require('path');
const { runSync } = require('./lib/run-sync.js');
const { parseReceipt, CLASSES, RECEIPT_DIR } = require('./gate-receipt.js');

const DEPTH = { pilot: 1, production: 2 };
const RECEIPT_REL = RECEIPT_DIR.replace(/\\/g, '/');

function git(root, args) {
  const result = runSync('git', args, { cwd: root });
  return result.status === 0 ? result.stdout : null;
}

/** The newest receipt file (the stamp sorts lexicographically), or null. */
function latestReceipt(root) {
  const dir = path.join(root, RECEIPT_DIR);
  if (!fs.existsSync(dir)) return null;
  const names = fs.readdirSync(dir).filter((name) => name.endsWith('.md')).sort();
  return names.length ? path.join(dir, names[names.length - 1]) : null;
}

/** Files that differ from the receipt's commit — committed, unstaged or untracked. */
function changedSince(root, commit) {
  const tracked = git(root, ['diff', '--name-only', commit]);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard']);
  if (tracked === null || untracked === null) return null;
  return `${tracked}\n${untracked}`.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

/**
 * @returns {{state: 'ok'|'not-applicable'|'fail', reason: string|null, receipt: string|null}}
 */
function examine(root, requiredClass = 'pilot') {
  let scripts = null;
  try {
    scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {};
  } catch {
    scripts = null;
  }
  if (!scripts || !scripts['gate:receipt']) {
    return { state: 'not-applicable', reason: 'no `gate:receipt` script — this repository owes no receipt', receipt: null };
  }

  const fix = `run \`npm run gate:receipt -- --class ${requiredClass}\`, commit the receipt, then push`;
  const file = latestReceipt(root);
  if (!file) return { state: 'fail', reason: `no receipt under ${RECEIPT_REL}/ — ${fix}`, receipt: null };

  const rel = path.relative(root, file).replace(/\\/g, '/');
  const receipt = parseReceipt(fs.readFileSync(file, 'utf8'));
  if (receipt.verdict !== 'PASS') return { state: 'fail', reason: `${rel} is ${receipt.verdict || 'unreadable'}, not PASS — ${fix}`, receipt: rel };
  if (!CLASSES.includes(receipt.class)) return { state: 'fail', reason: `${rel} names no release class — ${fix}`, receipt: rel };
  if (DEPTH[receipt.class] < DEPTH[requiredClass]) {
    return { state: 'fail', reason: `${rel} is a ${receipt.class} receipt; this push ships ${requiredClass} — ${fix}`, receipt: rel };
  }

  const head = (git(root, ['rev-parse', 'HEAD']) || '').trim();
  if (!receipt.commit || !head) return { state: 'fail', reason: `${rel} or HEAD has no readable commit — ${fix}`, receipt: rel };
  if (receipt.commit !== head) {
    const changed = changedSince(root, receipt.commit);
    if (changed === null) return { state: 'fail', reason: `${rel} names a commit this checkout does not have — ${fix}`, receipt: rel };
    const stale = changed.filter((name) => !name.startsWith(`${RECEIPT_REL}/`));
    if (stale.length) {
      return { state: 'fail', reason: `${rel} describes ${receipt.commit.slice(0, 9)}, but ${stale.length} file(s) changed since (first: ${stale[0]}) — ${fix}`, receipt: rel };
    }
  }
  return { state: 'ok', reason: null, receipt: rel };
}

function main() {
  const argv = process.argv.slice(2);
  let root = null;
  let requiredClass = 'pilot';
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') json = true;
    else if (argv[i] === '--class') requiredClass = argv[(i += 1)];
    else if (argv[i].startsWith('-')) {
      console.error(`❌ unknown flag ${argv[i]}`);
      process.exit(2);
    } else if (root) {
      console.error(`❌ unexpected argument ${argv[i]}`);
      process.exit(2);
    } else root = argv[i];
  }
  if (!CLASSES.includes(requiredClass)) {
    console.error('Usage: node check-ship-receipt.js [<projectRoot>] [--class pilot|production] [--json]');
    process.exit(2);
  }

  const result = examine(path.resolve(root || process.cwd()), requiredClass);
  if (json) console.log(JSON.stringify(result, null, 2));
  else if (result.state === 'ok') console.log(`✅ ship receipt ${result.receipt} covers this push (${requiredClass})`);
  else if (result.state === 'not-applicable') console.log(`ℹ️  ${result.reason}`);
  else console.error(`❌ ship receipt: ${result.reason}`);
  process.exit(result.state === 'fail' ? 1 : 0);
}

if (require.main === module) main();

module.exports = { examine, latestReceipt, changedSince };
