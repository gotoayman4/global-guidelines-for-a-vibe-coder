const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { parseGuideline, checkControl, readScripts } = require('../audit-rules.js');

const GUIDELINES = path.resolve(__dirname, '..', '..', '..');

/** A guideline file with the front-matter this repo requires, plus an optional `control:`. */
function guideline(control) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'control-'));
  const file = path.join(dir, 'rule.md');
  fs.writeFileSync(file, [
    '---',
    'status: "Normative"',
    'scope: "Global"',
    'tags: [test]',
    ...(control === undefined ? [] : [`control: ${control}`]),
    '---',
    '',
    '# A Rule',
    '',
    'MUST do the thing.',
    '',
  ].join('\n'));
  return file;
}

/** Every `.md` under `guidelines/`, so the live corpus can be asserted clean. */
function allGuidelines(dir = GUIDELINES) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allGuidelines(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

test('the control key is read from the front-matter, quoted or bare', () => {
  assert.equal(parseGuideline(guideline('"guard:tiers"')).control, 'guard:tiers');
  assert.equal(parseGuideline(guideline('guard:tiers')).control, 'guard:tiers');
  assert.equal(parseGuideline(guideline('none')).control, 'none');
});

test('an absent control is allowed — that is the ratchet, not a failure', () => {
  // Backfilling 60-odd guidelines in one pass is a change nobody can review, so absence is counted
  // and reported rather than failed. What fails is a control that is NAMED and does not resolve.
  assert.equal(parseGuideline(guideline(undefined)).control, null);
});

test('a real guard resolves against the repo\'s own scripts', () => {
  const verdict = checkControl('guard:tiers', readScripts());
  assert.equal(verdict.ok, true);
  assert.equal(verdict.file, 'guidelines/global-configs/scripts/check-guard-tiers.js');
});

test('REVERSAL PROOF: a control naming a script that does not exist fails', () => {
  const verdict = checkControl('guard:invented', readScripts());
  assert.equal(verdict.ok, false);
  assert.match(verdict.why, /not a script in package\.json/);
});

test('REVERSAL PROOF: a control whose script runs a missing file fails', () => {
  // The script is declared, so a check that stopped at "is the name in package.json" would pass —
  // and the rule would read as enforced while pointing at a file that was deleted.
  const scripts = { 'guard:ghost': 'node guidelines/global-configs/scripts/does-not-exist.js' };
  const verdict = checkControl('guard:ghost', scripts);
  assert.equal(verdict.ok, false);
  assert.match(verdict.why, /does not exist/);
});

test('a control with no script file to verify is reported, never assumed good', () => {
  const verdict = checkControl('guard:opaque', { 'guard:opaque': 'echo nothing' });
  assert.equal(verdict.ok, false);
  assert.match(verdict.why, /no script file/);
});

test('the `npm run ` prefix is tolerated', () => {
  assert.equal(checkControl('npm run guard:tiers', readScripts()).ok, true);
});

test('no guideline in the live corpus declares a dangling control', () => {
  // Non-vacuity in the other direction: the control has to be able to fire, and the corpus has to
  // be clean. Both are asserted, so a regex that stopped matching would fail this test rather than
  // passing it silently.
  const scripts = readScripts();
  const declared = [];
  for (const file of allGuidelines()) {
    const { control } = parseGuideline(file);
    if (!control || control === 'none') continue;
    declared.push({ file: path.relative(GUIDELINES, file).replace(/\\/g, '/'), control });
  }
  assert.ok(declared.length >= 2, `expected the amended guidelines to declare a control, found ${declared.length}`);
  for (const { file, control } of declared) {
    assert.equal(checkControl(control, scripts).ok, true, `${file} declares a dangling control: ${control}`);
  }
});
