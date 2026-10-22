#!/usr/bin/env node

/**
 * check-gate-wording.js — the pre-push gate is described ONE way, and the mode decides it.
 *
 * INTENT: The speed reform made the per-push gate mode-gated (`vibe` runs `gate:fast` + the
 * `always` tier; the full pipeline is the ship boundary). It edited the fragments and the mode
 * file, but left three prose sites describing the gate as the full pipeline *unconditionally* —
 * `local-ci-strategy.md`'s own Tier-B row, `ci-cd-philosophy.md`, and `first-project-setup`.
 * A project then obeyed the more specific text, wrote an unconditional full-pipeline hook, and
 * LOCKED IT IN with its own hook-integrity guard. Measured consequence: a `vibe` repo paying a
 * `standard` gate on every push (`GAMS_WORKFLOW_SPEED_ANALYSIS_2026-10-12.md` §6).
 *
 * A second leak survived that reform: the Tier-B hook example and the CI pipeline table still
 * ran the FULL test suite on every `vibe` push. Both now name the changed-tests slice, and the
 * retired phrasings below catch the regression — the suite is a ship-boundary step.
 *
 * CONSTRAINT: the retired phrasing is matched as a REGEX over markdown prose, so a cross-
 * reference ("the mode decides — see `local-ci-strategy.md` §Which Gate Runs") is a link and
 * must not trip it. Only the claim that the gate IS the full pipeline is retired.
 *
 * DECISION: the canonical statement has two homes, and they are different questions —
 * `speed-tiered-workflow.md` owns *how much of the gate runs* (the mode matrix), and
 * `local-ci-strategy.md` owns *how the hook is built* (Tier B + §Which Gate Runs). Both are
 * asserted present, so deleting the mechanism cannot pass vacuously.
 *
 * Non-vacuity: the corpus must be non-empty, and the canonical regexes must match at least one
 * real line — a guard whose own positive assertion matches nothing proves nothing. The test
 * suite additionally proves a deliberately retired fixture FAILS.
 *
 * Usage:
 *   node check-gate-wording.js            # scan guidelines/
 *   node check-gate-wording.js --json     # machine-readable
 *
 * Exit codes: 0 = one description, mode-gated; 1 = retired wording present; 2 = corpus error.
 *
 * @tier standard+ — a wording contract over the gate descriptions; a retired phrase reappears at
 *   a milestone, not mid-slice.
 *
 * Source: global-configs/scripts/check-gate-wording.js
 */

const fs = require('fs');
const path = require('path');

// `__dirname` is `guidelines/global-configs/scripts`, so two levels up is the `guidelines/` root
// itself — the same convention `check-doc-census.js` uses for its template root.
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const GUIDELINES = REPO_ROOT;

/**
 * Retired wording — each asserts, in prose, that the pre-push gate is the full pipeline in every
 * mode. `why` is the correction, so the failure message tells the reader what to write instead.
 */
const RETIRED = [
  {
    id: 'never-replaced',
    re: /never replaced by\s*`?gate:fast`?/i,
    why: '`gate:fast` + the `always` tier IS the vibe per-push gate, not a substitute for it',
  },
  {
    id: 'mandatory-full-pipeline',
    re: /mandatory pre-push gate for the full pipeline/i,
    why: 'the mode decides how much of the pipeline a push runs',
  },
  {
    id: 'setup-runs-full',
    re: /pre-push hook runs full pipeline/i,
    why: 'the hook branches on the declared mode',
  },
  {
    id: 'full-pre-push-gate',
    re: /full pre-push gate/i,
    why: 'the full pipeline is the ship boundary, not the per-push gate',
  },
  {
    id: 'full-minimum-pipeline',
    re: /The full Minimum Pipeline/i,
    why: 'the pipeline’s construction is fixed; the mode decides the per-push scope',
  },
  {
    id: 'vibe-full-suite-hook',
    re: /gate:fast`?\s*&&\s*`?npm run test -- --run/i,
    why: '`gate:fast` already runs the changed tests; the full suite is a ship-boundary step',
  },
  {
    id: 'vibe-full-test-row',
    re: /`vibe` per push\s*\|\s*LINT → TYPE CHECK → TEST/i,
    why: 'a vibe push runs the changed tests via `gate:fast`, not the full suite',
  },
];

/**
 * The canonical statement, and the file that owns each half. Both are asserted present so a
 * deletion fails rather than passing on an empty match.
 */
const CANONICAL = [
  {
    id: 'mode-matrix-gate-row',
    file: '01-workflow-methodology/speed-tiered-workflow.md',
    re: /`gate:fast`\*\*\s*\+\s*the `always` guard tier/,
    what: 'the mode matrix’s Gate row',
  },
  {
    id: 'gate-scales-section',
    file: '01-workflow-methodology/speed-tiered-workflow.md',
    re: /## The Gate Scales With the Mode/,
    what: 'the section that sizes the gate by mode',
  },
  {
    id: 'which-gate-runs-row',
    file: '03-git-and-ci/local-ci-strategy.md',
    re: /`vibe`\s*\|\s*`gate:fast` \+ the `always` guard tier/,
    what: '§Which Gate Runs — the vibe row',
  },
  {
    id: 'pre-push-row',
    file: '03-git-and-ci/local-ci-strategy.md',
    re: /the pre-push hook\s*\|\s*\*\*the declared mode's gate\*\*/,
    what: 'the Tier A/B loop table’s pre-push row',
  },
  {
    id: 'ci-cd-vibe-row',
    file: '03-git-and-ci/ci-cd-philosophy.md',
    re: /`vibe` per push\s*\|\s*LINT → TYPE CHECK → changed tests/i,
    what: 'the pipeline table’s vibe row — changed tests only',
  },
  {
    id: 'local-ci-vibe-hook',
    file: '03-git-and-ci/local-ci-strategy.md',
    re: /npm run gate:fast\s+# lint \+ type-check \+ changed tests/,
    what: 'the Tier-B hook example — no full suite in the vibe branch',
  },
];

/** Every markdown file under `guidelines/`, repo-relative, POSIX-separated. */
function markdownFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) markdownFiles(abs, out);
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(abs);
  }
  return out;
}

/**
 * Pure scan over an explicit corpus.
 * @param {Array<{file: string, content: string}>} docs repo-relative file + its text
 * @returns {{violations: string[], vacuous: string[]}}
 */
function scan(docs) {
  const violations = [];
  const vacuous = [];

  for (const doc of docs) {
    for (const rule of RETIRED) {
      const m = doc.content.match(rule.re);
      if (m) {
        violations.push(`${doc.file}: retired gate wording "${m[0]}" — ${rule.why}`);
      }
    }
  }

  for (const fact of CANONICAL) {
    const doc = docs.find((d) => d.file === fact.file);
    if (!doc) {
      vacuous.push(`${fact.id}: ${fact.file} is absent — ${fact.what} is unguarded`);
      continue;
    }
    if (!fact.re.test(doc.content)) {
      vacuous.push(`${fact.id}: ${fact.file} no longer states ${fact.what} — the guard is vacuous`);
    }
  }

  return { violations, vacuous };
}

/** Load the corpus from disk. */
function collect(root = GUIDELINES) {
  const files = markdownFiles(root);
  return files.map((abs) => ({
    file: path.relative(root, abs).split(path.sep).join('/'),
    content: fs.readFileSync(abs, 'utf8'),
  }));
}

function main() {
  const json = process.argv.includes('--json');
  const docs = collect();

  if (docs.length === 0) {
    console.error(`✗ no markdown under ${GUIDELINES} — corpus is empty`);
    process.exit(2);
  }

  const { violations, vacuous } = scan(docs);

  if (json) {
    console.log(JSON.stringify({ files: docs.length, violations, vacuous }, null, 2));
  } else {
    console.log('═══════════════════════════════════════════');
    console.log('  Gate Wording — one description, mode-gated');
    console.log('═══════════════════════════════════════════\n');
    for (const v of violations) console.log(`   ❌ ${v}`);
    for (const v of vacuous) console.log(`   ⚠️  ${v}`);
    if (violations.length === 0 && vacuous.length === 0) {
      console.log(`✅ ${RETIRED.length} retired phrasings absent; ${CANONICAL.length} canonical statements present across ${docs.length} files`);
    }
    console.log();
  }

  process.exit(violations.length > 0 || vacuous.length > 0 ? 1 : 0);
}

if (require.main === module) main();

module.exports = { scan, collect, markdownFiles, RETIRED, CANONICAL, GUIDELINES };
