const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { parseGuideline } = require('../audit-rules.js');

const GUIDELINES = path.resolve(__dirname, '..', '..', '..');

/** A guideline file whose status is declared the modern way, the legacy way, or both. */
function guideline({ frontMatterStatus, bodyStatus } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'status-'));
  const file = path.join(dir, 'rule.md');
  fs.writeFileSync(file, [
    '---',
    ...(frontMatterStatus === undefined ? [] : [`status: "${frontMatterStatus}"`]),
    'scope: "Global"',
    'tags: [test]',
    '---',
    '',
    '# A Rule',
    '',
    ...(bodyStatus === undefined ? [] : [`**Status:** ${bodyStatus}`, '']),
    'MUST do the thing.',
    '',
  ].join('\n'));
  return file;
}

/** Every `.md` under `guidelines/`, so the live corpus can be asserted about. */
function allGuidelines(dir = GUIDELINES) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allGuidelines(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

test('status is read from the YAML front-matter — the one home for it', () => {
  assert.equal(parseGuideline(guideline({ frontMatterStatus: 'Normative' })).status, 'Normative');
  assert.equal(parseGuideline(guideline({ frontMatterStatus: 'Advisory' })).status, 'Advisory');
  assert.equal(parseGuideline(guideline({ frontMatterStatus: 'Archived' })).status, 'Archived');
});

test('a lower-case status still canonicalises, as the retired case-insensitive regex did', () => {
  assert.equal(parseGuideline(guideline({ frontMatterStatus: 'normative' })).status, 'Normative');
});

test('the retired body line is still honoured as a fallback, so a mid-migration file is not misread', () => {
  assert.equal(parseGuideline(guideline({ bodyStatus: 'Normative' })).status, 'Normative');
});

test('front-matter wins when both shapes are present', () => {
  const both = guideline({ frontMatterStatus: 'Advisory', bodyStatus: 'Normative' });
  assert.equal(parseGuideline(both).status, 'Advisory');
});

test('an undeclared status is Unknown, never a guess', () => {
  assert.equal(parseGuideline(guideline({})).status, 'Unknown');
});

test('THE REGRESSION: the live corpus resolves a real status, not Unknown', () => {
  // The defect this pins: the reader matched a body line `**Status:** Normative`, which the
  // front-matter migration removed. Every file then read 'Unknown', so the UNCOVERED NORMATIVE
  // warning, the archived-source warning, the Advisory skip and the `Coverage` figure were all
  // inert — while `npm run validate` stayed green and printed `0/0`.
  const files = allGuidelines();
  const normative = files.filter((f) => parseGuideline(f).status === 'Normative');
  assert.ok(normative.length > 0, 'the corpus declares Normative guidelines — a reader that finds none is broken');
});

test('REVERSAL PROOF: the body-line reader this replaced would find nothing in the live corpus', () => {
  // Non-vacuity, stated as the bug itself. If the retired `**Status:**` block ever comes back into
  // the corpus, this fails — and that is the point: it would mean the reader and the corpus have
  // two homes for the same fact again, which is how they drifted apart in the first place.
  const offenders = allGuidelines().filter((f) => /\*\*Status:\*\*\s*(Normative|Advisory|Archived)/i.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(
    offenders.map((f) => path.relative(GUIDELINES, f).replace(/\\/g, '/')),
    [],
    'no guideline may declare its status in a body block — the front-matter is the one home',
  );
});

test('the uncovered-normative check can actually fire', () => {
  // A control that cannot fire is indistinguishable from a corpus with nothing to report. The
  // reachability condition is: a Normative file WITH imperative lines, so the warning is reachable
  // when that file has no extracted rules.
  const reachable = allGuidelines().filter((f) => {
    const g = parseGuideline(f);
    return g.status === 'Normative' && g.imperativeLines.length > 0;
  });
  assert.ok(reachable.length > 0, 'at least one Normative guideline carries MUST/SHOULD statements');
});
