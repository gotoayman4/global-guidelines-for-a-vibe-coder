#!/usr/bin/env node

/**
 * gate-receipt.js — run the ship-boundary chain and write the evidence, never an echo.
 *
 * WHY THIS EXISTS. Every mode defers something to the ship boundary — `vibe` the suite, `standard`
 * the build — on the promise that the boundary runs the full pipeline before a user sees the
 * release. A promise nobody can check is a comment: until now the receipt that proves it was a
 * script each project had to invent, and an echo-only placeholder is not evidence. This wrapper is
 * the seeded, working one, so the boundary the modes lean on exists in every scaffolded project.
 *
 * WHAT IT RUNS, in order, stopping at the first failure: lint, type-check, the full suite, the
 * build, the dependency audit wrapper — plus the end-to-end suite (`test:e2e`) for a `production`
 * release or when `--e2e` is given. A step whose npm script does not exist FAILS, and says so: an
 * unexecuted check must never read as green. It runs the project's own scripts, so it asserts
 * nothing about a check the project never wired.
 *
 * WHAT IT REFUSES. A dirty tree: a receipt must describe one commit, and a result measured on
 * uncommitted edits describes nothing a reader can check out.
 *
 * WHAT IT DOES NOT PROVE. The critical-flow checks (login, payments, persistence — LTR and RTL)
 * and rollback readiness are not something a wrapper can run for a project; the receipt says so in
 * its last line rather than implying coverage. The release class is recorded here, never in WORLD.md.
 *
 * Usage:
 *   node scripts/gate-receipt.js --class pilot|production [--e2e] [--chain <npm-script>]
 *
 * `--chain` runs a project-owned ship script (`gate:ship`) as the whole pipeline instead of the
 * default five steps — for a project whose boundary already has a bespoke command.
 *
 * Output: docs/gate-receipts/<UTC-stamp>.md. Exit codes: 0 = verdict PASS; 1 = FAIL (the receipt
 * is still written, so the failure is on record); 2 = usage error.
 *
 * Source: global-configs/scripts/gate-receipt.js
 */

const fs = require('fs');
const path = require('path');
const { runSync, npmSync } = require('./lib/run-sync.js');

const CLASSES = ['pilot', 'production'];
const RECEIPT_DIR = path.join('docs', 'gate-receipts');

/**
 * The chain the boundary owes. `test:e2e` joins it for a production release or an explicit `--e2e`.
 *
 * `chain` names a project-owned script that IS the ship pipeline (`gate:ship`, `verify` + build +
 * audit, a packaged smoke…). A project that already has one keeps it: the receipt then records that
 * single step, and nothing is implied beyond it — in particular `production` no longer adds
 * `test:e2e` by itself, because the project's chain owns what its boundary contains.
 */
function buildSteps(releaseClass, e2e, chain = null) {
  const steps = chain
    ? [{ name: chain, script: chain, args: ['run', chain] }]
    : [
        { name: 'lint', script: 'lint', args: ['run', 'lint'] },
        { name: 'type-check', script: 'type-check', args: ['run', 'type-check'] },
        { name: 'test', script: 'test', args: ['run', 'test', '--', '--run'] },
        { name: 'build', script: 'build', args: ['run', 'build'] },
        { name: 'audit', script: 'audit:gate', args: ['run', 'audit:gate'] },
      ];
  if (e2e || (!chain && releaseClass === 'production')) steps.push({ name: 'e2e', script: 'test:e2e', args: ['run', 'test:e2e'] });
  return steps;
}

function stamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function git(root, args) {
  const result = runSync('git', args, { cwd: root });
  return result.status === 0 ? result.stdout.trim() : null;
}

function readScripts(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {};
  } catch {
    return null;
  }
}

/** The receipt as markdown. `parseReceipt` reads the same four header lines back. */
function renderReceipt({ when, releaseClass, commit, branch, verdict, results }) {
  const lines = [
    `# Gate Receipt — ${stamp(when)}`,
    '',
    `- **Class:** ${releaseClass}`,
    `- **Commit:** ${commit}`,
    `- **Branch:** ${branch}`,
    '- **Tree:** clean',
    `- **Verdict:** ${verdict}`,
    '',
    '| Step | Command | Result | Seconds |',
    '|---|---|---|---|',
  ];
  for (const step of results) {
    lines.push(`| ${step.name} | \`${step.command}\` | ${step.result} | ${step.seconds} |`);
  }
  lines.push(
    '',
    'cached: none',
    '',
    'Not run by this wrapper — cite your own evidence: the critical-flow checks (LTR and RTL) on the',
    'flows this release exposes, and rollback readiness for a `production` release.',
    '',
  );
  return lines.join('\n');
}

/** Read a receipt's header back: `{class, commit, verdict, tree}` — each null when absent. */
function parseReceipt(text) {
  const field = (label) => {
    const match = new RegExp(`^- \\*\\*${label}:\\*\\* (.+)$`, 'm').exec(text);
    return match ? match[1].trim() : null;
  };
  return { class: field('Class'), commit: field('Commit'), verdict: field('Verdict'), tree: field('Tree') };
}

/**
 * Run the chain in `root` and write the receipt.
 *
 * @returns {{ok: boolean, file: string|null, reason: string|null, verdict: string|null}}
 */
function run({ root, releaseClass, e2e = false, chain = null, now = new Date() }) {
  const commit = git(root, ['rev-parse', 'HEAD']);
  if (!commit) return { ok: false, file: null, reason: 'not a git repository with a commit — a receipt must describe one', verdict: null };
  if (git(root, ['status', '--porcelain']) !== '') {
    return { ok: false, file: null, reason: 'the working tree is dirty — commit or stash first; a receipt must describe one commit', verdict: null };
  }
  const scripts = readScripts(root);
  if (!scripts) return { ok: false, file: null, reason: 'no readable package.json — there is no chain to run', verdict: null };

  const results = [];
  let failed = false;
  for (const step of buildSteps(releaseClass, e2e, chain)) {
    const command = `npm ${step.args.join(' ')}`;
    if (failed) {
      results.push({ name: step.name, command, result: 'not run', seconds: '—' });
      continue;
    }
    if (!scripts[step.script]) {
      results.push({ name: step.name, command, result: `FAIL (script "${step.script}" is missing)`, seconds: '—' });
      failed = true;
      continue;
    }
    const started = Date.now();
    const outcome = npmSync(step.args, { cwd: root });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const ok = outcome.status === 0;
    results.push({ name: step.name, command, result: ok ? 'PASS (exit 0)' : `FAIL (exit ${outcome.status})`, seconds });
    if (!ok) {
      failed = true;
      const tail = `${outcome.stdout}\n${outcome.stderr}`.trim().split(/\r?\n/).slice(-15).join('\n');
      if (tail) console.error(tail);
    }
  }

  const verdict = failed ? 'FAIL' : 'PASS';
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown';
  const dir = path.join(root, RECEIPT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${stamp(now)}.md`);
  fs.writeFileSync(file, renderReceipt({ when: now, releaseClass, commit, branch, verdict, results }), 'utf8');
  return { ok: !failed, file, reason: null, verdict };
}

function main() {
  const argv = process.argv.slice(2);
  let releaseClass = null;
  let e2e = false;
  let chain = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--class') releaseClass = argv[(i += 1)];
    else if (argv[i] === '--e2e') e2e = true;
    else if (argv[i] === '--chain') chain = argv[(i += 1)];
    else {
      console.error(`❌ unknown argument ${argv[i]}`);
      process.exit(2);
    }
  }
  if (!CLASSES.includes(releaseClass) || chain === undefined || (chain !== null && !chain)) {
    console.error('Usage: node gate-receipt.js --class pilot|production [--e2e] [--chain <npm-script>]');
    process.exit(2);
  }
  const result = run({ root: process.cwd(), releaseClass, e2e, chain });
  if (result.reason) {
    console.error(`❌ ${result.reason}`);
    process.exit(1);
  }
  const shown = path.relative(process.cwd(), result.file).replace(/\\/g, '/');
  console.log(`${result.ok ? '✅' : '❌'} gate receipt ${result.verdict}: ${shown}`);
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) main();

module.exports = { run, buildSteps, renderReceipt, parseReceipt, stamp, CLASSES, RECEIPT_DIR };
