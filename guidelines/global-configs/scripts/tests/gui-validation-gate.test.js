const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const REPO = path.resolve(__dirname, '../../../../');
const GUI = path.join(REPO, 'sync-manager.ps1');
const PKG = path.join(REPO, 'package.json');

const read = (file) => fs.readFileSync(file, 'utf8');

/**
 * THE INVARIANT: the GUI's validation action must run the SAME gate as everything else.
 *
 * WHY IT EXISTS. The "Run All Checks" button ran three scripts of its own choosing — rules audit,
 * links, index coverage — and labelled the outcome `✅ All checks`. The real gate, as `package.json`
 * §scripts defines it, also runs check-drift, check-index-drift, check-skills-drift, docs:census,
 * guard:tiers and the whole test suite. So the button reported a green "all" over six controls and
 * the entire suite it had never run, and an operator reading it had no reason to look further.
 *
 * The deeper problem is not the missing steps but the SECOND DEFINITION of the gate. Any hand-picked
 * subset drifts from `package.json` the moment a step is added there, and it drifts silently in the
 * direction of a greener report. One definition, invoked from both places, is the only fix that
 * holds. `AGENTS.md` §Commands is the documentation home; `package.json` §scripts is the executable
 * one; the pre-push hook and this button both call it.
 */

/** The body of a `.Add_Click({ ... })` handler for a named control. */
function clickHandler(text, control) {
  const start = text.indexOf(`${control}.Add_Click({`);
  if (start === -1) return null;
  const end = text.indexOf('})', start);
  return end === -1 ? null : text.slice(start, end);
}

/** The body of `function <name>(...) { ... }`, to the next top-level `function` or comment banner. */
function functionBody(text, name) {
  const start = text.indexOf(`function ${name}(`);
  if (start === -1) return null;
  const rest = text.slice(start + 1);
  const next = rest.search(/\n(?:function\s|#\s*=)/);
  return next === -1 ? rest : rest.slice(0, next);
}

/** Every `Run-NodeScript <path>` call in a block — the shape the hand-picked handler took. */
const nodeScriptCalls = (text) => text.match(/Run-NodeScript\s+\$/g) || [];

test('the GUI defines one gate runner that invokes the real npm gate', () => {
  const body = functionBody(read(GUI), 'Run-NpmGate');
  assert.ok(body, 'Run-NpmGate is gone — the GUI is back to a hand-picked subset of the gate');
  assert.match(body, /npm run validate/, 'Run-NpmGate does not run `npm run validate`');
});

test('the gate runner reports the command it actually ran, not "All checks"', () => {
  const body = functionBody(read(GUI), 'Run-NpmGate');
  assert.match(body, /\$resultLabel\.Text/, 'the gate runner writes no result');
  assert.doesNotMatch(body, /All checks/, 'the gate runner still labels its result "All checks"');
});

test('THE REGRESSION: the validation button runs the gate, not a hand-picked subset', () => {
  const handler = clickHandler(read(GUI), '$btnValidateAll');
  assert.ok(handler, '$btnValidateAll.Add_Click is gone');
  assert.match(handler, /Run-NpmGate/, 'the validation button does not run the gate');
  assert.deepEqual(nodeScriptCalls(handler), [], 'the validation button still hand-picks individual scripts');
});

test('the subset the button used to run is exactly the gap it claimed to cover', () => {
  // Non-vacuity with a purpose: the three scripts it used to run are still real gate steps, so a
  // future "optimisation" that reinstates them would look reasonable. This names the gap explicitly.
  const gate = JSON.parse(read(PKG)).scripts.validate;
  for (const step of ['check-links', 'check-index', 'audit']) {
    assert.ok(gate.includes(`run ${step}`), `package.json validate no longer runs ${step}`);
  }
  assert.ok(gate.includes('test:scripts'), 'package.json validate no longer runs the test suite');
  // The three the button ran are a strict subset of the nine the gate runs.
  const steps = gate.split('&&').map((s) => s.trim());
  assert.ok(steps.length >= 9, `expected the full gate to have 9+ steps, got ${steps.length}`);
});

test('the check is not vacuous — it finds the code it judges', () => {
  const text = read(GUI);
  assert.ok(text.length > 20000, `sync-manager.ps1 read as ${text.length} chars`);
  assert.ok(functionBody(text, 'Run-NpmGate').length > 400, 'the gate runner body read as empty');
  assert.ok(clickHandler(text, '$btnValidateAll').length > 40, 'the button handler read as empty');
});

test('REVERSAL PROOF: a hand-picked handler is named', () => {
  const text = read(GUI);
  const handler = clickHandler(text, '$btnValidateAll');
  assert.deepEqual(nodeScriptCalls(handler), [], 'clean to begin with');

  // The exact regression: someone reinstates the three-script handler.
  const mutated = text.replace(
    handler,
    '$btnValidateAll.Add_Click({\n    Run-NodeScript $auditScript $logBox $validationStatusLabel $null\n})\n',
  );
  assert.notEqual(mutated, text, 'the mutation must actually change the handler');
  const after = clickHandler(mutated, '$btnValidateAll');
  assert.equal(nodeScriptCalls(after).length, 1, 'the mutation did not reintroduce a hand-picked script');
  assert.doesNotMatch(after, /Run-NpmGate/, 'the mutation left the gate call in place');
});
