#!/usr/bin/env node

/**
 * check-doc-breadth.js — a work slice may not write more steering files than its mode allows.
 *
 * INTENT: `documentation-strategy.md` §Trigger Table declares that the breadth of a steering
 * update scales with the mode — `vibe` writes 1 file, `standard` 2, `guarded` the full set — and
 * §Record vs Ritual says the ritual "defers to the milestone". Neither was enforced, so the
 * doctrine's own anti-pattern shipped: *a `vibe` slice writing five steering files*. A mode that
 * binds nothing is decoration, and the failure it hides is a slice that spends its budget
 * re-stating facts in five places instead of shipping the change.
 *
 * THE MEASUREMENT THAT SET THE RULE, AND THE ONE THAT CORRECTED IT. Across the reference
 * project's 29 commits, the distribution of steering files touched per commit is bimodal: every
 * commit that changes product source touches **0 or 1** (max 1), and every commit touching 2-4 is
 * a docs/ritual commit. So the pathology is not "many steering files" — a milestone legitimately
 * writes the full set. It is "many steering files *on a code slice*". That is what this guard
 * fails, and it is why a naive per-commit cap would have failed a third of real, healthy history.
 *
 * That measurement counted the CANONICAL homes only — the four files the trigger table names. A
 * project can write `docs/PRD.md`, `docs/ROADMAP.md` and `docs/ACCEPTANCE.md` on every slice and
 * the canonical count reads 1, because none of those is one of the four. Re-measured on 2026-10-23
 * over the reference project's last 80 commits: the canonical count read 0–3 on a code slice
 * (so the "max 1" claim was already stale), while the real markdown surface read 0–10. The
 * doctrine's own anti-pattern is "a `vibe` slice writing five steering files"; the canonical
 * count could not see five of them. The counted set is therefore the UNION of the table's
 * canonical homes and the project's own markdown surface (`lib/doc-breadth.js` §steeringWrites).
 *
 * DECISION: a commit is judged only when it changes product source. A commit with no source
 * change is a ritual commit and is exempt — its whole job is the steering set. The exemption is
 * deliberate leniency: a file list cannot tell "wired a script" from "changed the product", and a
 * guard that fails correct work gets deleted, so where the two readings disagree this one stays
 * silent. Measured cost of the leniency: zero false failures on the reference history.
 *
 * CAVEAT: this is a count, not a judgement of relevance. It cannot know whether the one file a
 * `vibe` slice wrote was the right one; it only fails the slice that wrote more than the mode
 * allows. A slice that legitimately holds several triggers must split or defer, not widen the
 * mode — and `guarded` states no number, so it is unbounded here by design.
 *
 * Usage:
 *   node check-doc-breadth.js [projectRoot] [--commit <ref>] [--json]
 *
 * Exit codes: 0 = within breadth (or nothing judgeable); 1 = a work slice exceeded its breadth;
 *             2 = usage error.
 *
 * @tier standard+ — a contract guard, not a security control. It belongs on a `standard`/`guarded`
 *   push and at a milestone exit, never in the `vibe` between-edit loop (`local-ci-strategy.md`
 *   §Guard Tiers). The declaration is machine-read: `check-guard-tiers.js` derives the gate set
 *   from the guards' own docblocks, so this line is the control rather than a note about one.
 *
 * Source: global-configs/scripts/check-doc-breadth.js
 */

const path = require('path');
const { runSync } = require('./lib/run-sync.js');
const { readMode, MODES } = require('./lib/project-mode.js');
const { docBreadth, steeringWrites, RECORD } = require('./lib/doc-breadth.js');

/** Trees that are never a project's own product: its docs, and its mirrored guidelines. */
const NOT_PRODUCT = [/(^|\/)docs\//, /(^|\/)_guidelines\//, /(^|\/)guidelines\//, /(^|\/)\.workbuddy-ai\//, /(^|\/)node_modules\//];

/** A programming-language extension. Config-only files are deliberately absent — see DECISION. */
const SOURCE_EXT = /\.(m?[jt]sx?|c[jt]s|py|rb|go|rs|java|kt|kts|scala|php|cs|swift|dart|ex|exs|lua|pl|r|jl|sql|sh|bash|zsh|ps1|psm1|bat|cmd|vue|svelte|astro|tf|proto|graphql|gql|rules)$/i;

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error('Usage: node check-doc-breadth.js [projectRoot] [--commit <ref>] [--json]');
  process.exit(2);
}

/** Is this changed file part of the project's own product (not docs, not the mirror)? */
function isSource(file) {
  return SOURCE_EXT.test(file) && !NOT_PRODUCT.some((re) => re.test(file));
}

function gitLines(root, args) {
  const result = runSync('git', args, { cwd: root });
  if (result.status !== 0) return null;
  return result.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

/**
 * Judge one commit against the breadth its declared mode allows.
 *
 * @param {string} root  Project root.
 * @param {string} [ref] Commit to judge. Defaults to HEAD.
 * @returns {object} report — never throws; a reason it could not judge is in `vacuous`.
 */
function examine(root, ref = 'HEAD') {
  const table = docBreadth();
  const base = { ref, mode: null, breadth: null, subject: '', changed: 0, steering: [], source: [], record: [], exempt: null, violation: false };

  if (!table.ok) {
    return { ...base, vacuous: `the trigger table could not be read (${path.relative(root, table.owner) || table.owner}) — no breadth to enforce` };
  }

  const answer = readMode(root);
  // A declaration of a value that is not a mode is REPORTED with the value it named. Reading
  // it as "no declaration" would flatten `turbo` into `standard` and leave the operator
  // with a project that silently changed tier and a message that says nothing was declared.
  if (answer.value && !MODES.includes(answer.value)) {
    return { ...base, vacuous: answer.reason };
  }
  const mode = answer.mode || 'standard';
  if (!MODES.includes(mode)) {
    return { ...base, vacuous: `\`WORLD.md\` declares mode \`${mode}\`, which is not one of ${MODES.join(' / ')}` };
  }

  const files = gitLines(root, ['show', '--name-only', '--pretty=format:', ref]);
  if (files === null) {
    return { ...base, mode, vacuous: `\`git show ${ref}\` returned nothing — not a repository, or no such commit` };
  }
  const subject = (gitLines(root, ['log', '-1', '--format=%s', ref]) || [''])[0];

  const steering = steeringWrites(files, table.steering);
  const source = files.filter(isSource);
  const record = files.filter((f) => RECORD.some((re) => re.test(f)));

  const report = { ...base, mode, breadth: table.caps[mode], subject, changed: files.length, steering, source, record };

  // A ritual commit: no product source changed, so the full steering set is its job, not a cost.
  if (source.length === 0) return { ...report, exempt: 'no product source changed — a ritual commit' };

  // `guarded` states no number: the full set is the point, so there is nothing to exceed.
  if (report.breadth === null) return { ...report, exempt: `the \`${mode}\` mode writes the full set — unbounded by design` };

  return { ...report, violation: steering.length > report.breadth };
}

function render(report) {
  const lines = [];
  lines.push('═══════════════════════════════════════════');
  lines.push('  Doc Breadth Guard — the mode binds the write');
  lines.push('═══════════════════════════════════════════');
  lines.push('');

  if (report.vacuous) {
    lines.push(`  ℹ️  nothing to judge: ${report.vacuous}`);
    lines.push('     Reported, never failed — a project without the mirror is not a violation.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`  commit:  ${report.ref}  ${report.subject.slice(0, 72)}`);
  lines.push(`  mode:    ${report.mode}  →  breadth ${report.breadth === null ? 'unbounded (the full set)' : `${report.breadth} steering file(s)`}`);
  lines.push(`  changed: ${report.changed} file(s) — ${report.steering.length} steering, ${report.source.length} source, ${report.record.length} record`);
  lines.push('');

  if (report.exempt) {
    lines.push(`  ✅ exempt — ${report.exempt}`);
    lines.push('');
    return lines.join('\n');
  }

  if (!report.violation) {
    lines.push(`  ✅ within breadth — ${report.steering.length} of ${report.breadth} allowed`);
    for (const file of report.steering) lines.push(`     ${file}`);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`  ❌ a work slice wrote ${report.steering.length} steering files; the \`${report.mode}\` mode allows ${report.breadth}`);
  lines.push('');
  for (const file of report.steering) lines.push(`     ${file}`);
  lines.push('');
  lines.push('     The ritual defers to the milestone (documentation-strategy.md §Record vs Ritual).');
  lines.push('     Split the slice, or defer the extra writes to the milestone — do not widen the mode');
  lines.push('     to fit the slice, and do not restate a fact in a second file to reach the count.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  let root = process.cwd();
  let ref = 'HEAD';
  let json = false;
  let rootSet = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') json = true;
    else if (arg === '--commit') {
      ref = argv[i + 1];
      if (!ref) usage('--commit needs a ref');
      i += 1;
    } else if (arg.startsWith('-')) usage(`unknown flag ${arg}`);
    else if (rootSet) usage(`unexpected argument ${arg}`);
    else {
      root = path.resolve(arg);
      rootSet = true;
    }
  }

  const report = examine(root, ref);
  console.log(json ? JSON.stringify(report, null, 2) : render(report));
  process.exit(report.violation ? 1 : 0);
}

if (require.main === module) main();

module.exports = { examine, render, isSource, NOT_PRODUCT, SOURCE_EXT, RECORD };
