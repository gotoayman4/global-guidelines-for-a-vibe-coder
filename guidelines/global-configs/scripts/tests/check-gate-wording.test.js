const assert = require('node:assert/strict');
const { test } = require('node:test');

const { scan, collect, RETIRED, CANONICAL } = require('../check-gate-wording.js');

const CLEAN = [
  {
    file: '01-workflow-methodology/speed-tiered-workflow.md',
    content: '## The Gate Scales With the Mode\n\n| **Gate** — per push | **`gate:fast`** + the `always` guard tier | the full pipeline |\n',
  },
  {
    file: '03-git-and-ci/local-ci-strategy.md',
    content:
      '| Mode | Per push |\n| `vibe` | `gate:fast` + the `always` guard tier |\n| the pre-push hook | **the declared mode\'s gate** (§Which Gate Runs) |\n' +
      'npm run gate:fast                  # lint + type-check + changed tests\n',
  },
  {
    file: '03-git-and-ci/ci-cd-philosophy.md',
    content:
      '| Push scope | Runs |\n| `vibe` per push | LINT → TYPE CHECK → changed tests (`gate:fast`), plus every `always`-tier guard |\n',
  },
];

test('a clean corpus passes and nothing is vacuous', () => {
  const { violations, vacuous } = scan(CLEAN);
  assert.deepEqual(violations, []);
  assert.deepEqual(vacuous, []);
});

test('every retired phrasing is caught, and each names its correction', () => {
  const FIXTURES = {
    'never-replaced': 'Once, before the push — never replaced by `gate:fast`',
    'mandatory-full-pipeline': 'a mandatory pre-push gate for the full pipeline',
    'setup-runs-full': '- [ ] pre-push hook runs full pipeline (lint → type-check → test → build)',
    'full-pre-push-gate': 'full pre-push gate + critical-flow verification',
    'full-minimum-pipeline': '| **B — Pre-push gate** | Before every push | The full Minimum Pipeline |',
    'vibe-full-suite-hook': 'npm run gate:fast && npm run test -- --run',
    'vibe-full-test-row': '| `vibe` per push | LINT → TYPE CHECK → TEST, plus every `always`-tier guard |',
  };
  // Every retired rule must have a fixture, or the coverage claim is itself vacuous.
  assert.deepEqual(
    RETIRED.map((r) => r.id).sort(),
    Object.keys(FIXTURES).sort(),
    'each retired rule needs a fixture',
  );

  for (const [id, line] of Object.entries(FIXTURES)) {
    const docs = CLEAN.map((d) => ({ ...d }));
    docs[1].content += `\n${line}\n`;
    const { violations } = scan(docs);
    assert.equal(violations.length, 1, `expected "${id}" to fail on: ${line}`);
    assert.match(violations[0], /retired gate wording/);
    assert.ok(violations[0].includes('— '), `${id} must state why the phrasing is wrong`);
  }
});

test('the exact defects this guard was written for are caught verbatim', () => {
  const cases = [
    'the pre-push hook | the full pipeline | minutes | Once, before the push — never replaced by `gate:fast`',
    'a mandatory pre-push gate for the full pipeline.',
    '- [ ] pre-push hook runs full pipeline (lint → type-check → test → build)',
    'full pre-push gate + critical-flow verification',
    '| **B — Pre-push gate** | Before every push | The full Minimum Pipeline (see `ci-cd-philosophy.md`) |',
    'npm run gate:fast && npm run test -- --run',
    '| `vibe` per push | LINT → TYPE CHECK → TEST, plus every `always`-tier guard |',
  ];
  for (const line of cases) {
    const docs = CLEAN.map((d) => ({ ...d }));
    docs[1].content += `\n${line}\n`;
    const { violations } = scan(docs);
    assert.equal(violations.length, 1, `expected a violation for: ${line}`);
  }
});

test('a link to the owner does NOT trip the guard — only the claim does', () => {
  const docs = CLEAN.map((d) => ({ ...d }));
  docs[1].content +=
    '\nThe per-push gate is the declared mode’s gate; the full pipeline is the ship boundary — see `speed-tiered-workflow.md` §The Gate Scales With the Mode.\n';
  const { violations } = scan(docs);
  assert.deepEqual(violations, []);
});

test('a missing canonical statement is vacuous, never a silent pass', () => {
  const docs = CLEAN.map((d) => ({ ...d }));
  // Keep the pre-push row and the vibe hook so only the §Which Gate Runs row goes missing.
  docs[1].content =
    "| the pre-push hook | **the declared mode's gate** (§Which Gate Runs) |\n" +
    'npm run gate:fast                  # lint + type-check + changed tests\n';
  const { vacuous } = scan(docs);
  assert.equal(vacuous.length, 1);
  assert.match(vacuous[0], /which-gate-runs-row/);
});

test('a missing canonical file is vacuous', () => {
  const { vacuous } = scan([CLEAN[0]]);
  assert.ok(vacuous.some((v) => /local-ci-strategy\.md is absent/.test(v)));
});

test('the repo’s own guidelines satisfy the guard', () => {
  const docs = collect();
  assert.ok(docs.length > 50, `corpus must be non-empty (got ${docs.length})`);
  const { violations, vacuous } = scan(docs);
  assert.deepEqual(violations, [], 'no retired gate wording may remain in guidelines/');
  assert.deepEqual(vacuous, [], 'every canonical statement must be present');
});

test('reversal proof: injecting the retired wording into the REAL corpus fails it', () => {
  const docs = collect();
  assert.deepEqual(scan(docs).violations, [], 'precondition: the real corpus is clean');
  docs.find((d) => d.file === '03-git-and-ci/local-ci-strategy.md').content +=
    '\n| the pre-push hook | the full pipeline | minutes | Once, before the push — never replaced by `gate:fast` |\n';
  const { violations } = scan(docs);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /local-ci-strategy\.md/);
});

test('reversal proof: a vibe hook that runs the full suite fails', () => {
  const docs = collect();
  assert.deepEqual(scan(docs).violations, [], 'precondition: the real corpus is clean');
  docs.find((d) => d.file === '03-git-and-ci/local-ci-strategy.md').content +=
    '\nnpm run gate:fast && npm run test -- --run\n';
  const { violations } = scan(docs);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /local-ci-strategy\.md/);
  assert.match(violations[0], /ship-boundary step/);
});

test('the guard’s own constants are non-vacuous', () => {
  assert.ok(RETIRED.length >= 6, 'at least six retired phrasings are declared');
  assert.ok(CANONICAL.length >= 5, 'at least five canonical statements are asserted');
  for (const rule of RETIRED) assert.ok(rule.re instanceof RegExp && rule.why, `${rule.id} needs a RegExp and a why`);
});
