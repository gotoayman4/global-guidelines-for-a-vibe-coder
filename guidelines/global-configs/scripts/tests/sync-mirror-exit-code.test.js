const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const REPO = path.resolve(__dirname, '../../../../');
const SCRIPTS = path.join(REPO, 'guidelines/global-configs/scripts');

const MODULE = path.join(SCRIPTS, 'GuidelineSync.psm1');
const CLI = path.join(SCRIPTS, 'sync-guidelines.ps1');
// The GUI is a second entry point to the same outputs, so it is scanned too — a guard that watched
// only the CLI would have called the mirror clean while the GUI ran its own copy of the step.
const GUI = path.join(REPO, 'sync-manager.ps1');
const MANIFEST = path.join(REPO, 'guidelines/global-configs/sync-manifest.json');
const DRIFT = path.join(SCRIPTS, 'check-sync-drift.js');

const read = (file) => fs.readFileSync(file, 'utf8');

/**
 * THE INVARIANT: every code path that mirrors `_guidelines/` must READ the robocopy exit code.
 *
 * WHY IT EXISTS. Robocopy signals through its exit code and nothing else — 0–7 mean success (files
 * copied, skipped, or extras present), 8 and above mean a real failure (copy error, access denied).
 * A partial copy writes nothing to stderr and does not trip `$ErrorActionPreference = "Stop"`, so an
 * unchecked `Start-Process ... -PassThru` is a failed mirror that reports success.
 *
 * The defect this guard was written for, measured 2026-10-13: `Sync-MirrorDirectory` discarded the
 * process object into `$null` and `sync-guidelines.ps1` then printed a green
 * `Complete: N files mirrored` over whatever had landed — a count of files, presented as evidence of
 * a copy nobody had checked. The GUI had ALREADY been fixed for exactly this (filed as B7 in
 * `IMPLEMENTATION_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-13.md`), which is the whole lesson: a fix
 * applied to one of two writers leaves the other one lying, and the un-fixed one here is the path
 * `sync-all.js` drives for all seven fleet projects.
 *
 * The scan is STATIC — it reads the PowerShell as text. That is deliberate: these scripts write into
 * seven live project directories and open a WinForms window, so a test cannot execute them. The
 * shapes asserted below are the ones the defect took, so a regression has to reproduce a shape this
 * file already names.
 */

/** The body of `function Sync-MirrorDirectory { ... }`, to the next top-level `function`. */
function mirrorFunction(text) {
  const start = text.indexOf('function Sync-MirrorDirectory');
  if (start === -1) return null;
  const rest = text.slice(start + 1);
  const next = rest.search(/\nfunction\s/);
  return next === -1 ? rest : rest.slice(0, next);
}

/** The mirror step in the CLI — from the module call to the `.gitignore` step that follows it. */
function mirrorStep(text) {
  const start = text.indexOf('$mirrorOk = $true');
  if (start === -1) return null;
  const end = text.indexOf('# Add this script\'s project-local paths');
  return text.slice(start, end === -1 ? start + 4000 : end);
}

/** The summary block at the end of the CLI, where the exit code is decided. */
function summaryBlock(text) {
  const start = text.indexOf('=== Sync FAILED ===');
  return start === -1 ? null : text.slice(Math.max(0, start - 900), start + 900);
}

/**
 * The defect shape: a `-PassThru` process whose result is thrown away. Robocopy's exit code lives on
 * that object, so `$null = ... -PassThru` is precisely "I started robocopy and did not find out what
 * it did".
 *
 * @returns {string[]} one line per discard found
 */
function discardedExitCodes(text) {
  return (text.match(/\$null\s*=\s*Start-Process[^\r\n]*-PassThru/g) || []).map((h) => h.trim());
}

/** Does this text compare a robocopy exit code against the 0–7 success boundary? */
const comparesExitCode = (text) => /ExitCode\s+-gt\s+7/.test(text) || /ExitCode\s+-le\s+7/.test(text);

test('the module keeps the robocopy process object instead of discarding it', () => {
  const body = mirrorFunction(read(MODULE));
  assert.ok(body, 'Sync-MirrorDirectory is gone — the CLI and GUI both mirror through it');
  assert.deepEqual(discardedExitCodes(body), [], 'Sync-MirrorDirectory discards the robocopy exit code');
  assert.ok(comparesExitCode(body), 'Sync-MirrorDirectory never tests the robocopy exit code against 7');
});

test('the module reports the outcome, so a caller can act on it', () => {
  const body = mirrorFunction(read(MODULE));
  assert.match(body, /Success\s*=/, 'Sync-MirrorDirectory returns no Success flag');
  assert.match(body, /ExitCode\s*=/, 'Sync-MirrorDirectory returns no ExitCode');
});

test('the module still returns a result on a dry run, so callers need no special case', () => {
  const body = mirrorFunction(read(MODULE));
  const dry = body.slice(body.indexOf('[DRY-RUN] robocopy'));
  assert.match(dry, /return\s+\[pscustomobject\]/, 'the dry-run path returns nothing for a caller to read');
});

test('the CLI acts on the mirror outcome instead of assuming success', () => {
  const text = read(CLI);
  assert.match(text, /Sync-MirrorDirectory\s+-sourceDir/, 'the CLI no longer calls the shared mirror function');
  assert.match(text, /\$mirrorOk\s*=\s*\$false/, 'the CLI never records a failed mirror');
});

test('the CLI inline fallback applies the same exit-code contract as the module', () => {
  // The fallback runs when the module is absent. It used to call `robocopy @args` bare, which returns
  // the exit code only to the caller's `$LASTEXITCODE` — never read, so a failed mirror was silent.
  const step = mirrorStep(read(CLI));
  assert.ok(step, 'the CLI mirror step is gone');
  assert.deepEqual(discardedExitCodes(step), [], 'the CLI fallback discards the robocopy exit code');
  assert.ok(comparesExitCode(step), 'the CLI fallback never tests the robocopy exit code');
});

test('THE REGRESSION: the green summary is unreachable when the mirror failed', () => {
  // The exact defect: `Complete: N files mirrored` printed unconditionally, counting whatever landed.
  const text = read(CLI);
  const complete = text.indexOf('Complete: $((Get-ChildItem');
  assert.notEqual(complete, -1, 'the mirrored-file summary is gone');
  const guard = text.lastIndexOf('elseif ($mirrorOk)', complete);
  assert.notEqual(guard, -1, 'the mirrored-file summary is not guarded by the mirror outcome');
});

test('THE REGRESSION: a failed mirror exits non-zero', () => {
  // `sync-all.js` reads the exit code to decide whether to stamp `lastSynced`, and a manual CLI run
  // has no hash check behind it — so this exit code is the only signal a caller gets.
  const summary = summaryBlock(read(CLI));
  assert.ok(summary, 'the CLI summary block is gone');
  assert.match(summary, /exit\s+1/, 'a failed mirror does not exit non-zero');
});

test('the mirror outcome is initialised, so -GlobalOnly is not a false failure', () => {
  // `-GlobalOnly` skips the mirror step entirely. An unassigned `$mirrorOk` is `$null`, and
  // `-not $null` is `$true` — so without this initialisation a deliberate skip reads as a failure.
  const text = read(CLI);
  const init = text.indexOf('$mirrorOk = $true');
  const branch = text.indexOf('if (-not $GlobalOnly)');
  assert.notEqual(init, -1, '$mirrorOk is never initialised');
  assert.ok(init < branch, '$mirrorOk is initialised after the branch that skips the mirror');
});

test('BOTH entry points mirror through the shared function, so they cannot diverge', () => {
  // The GUI ran its own robocopy with the same /MIR flags but without the stale-`.github` prune.
  // `/XD` stops robocopy deleting an excluded directory, so a GUI-only sync could leave a
  // `_guidelines/.github/` the source no longer has — permanent drift that no report can explain.
  // The manifest header says both writers must produce identical project outputs; one implementation
  // is the only thing that keeps that true.
  for (const [name, file] of [['sync-guidelines.ps1', CLI], ['sync-manager.ps1', GUI]]) {
    const text = read(file);
    assert.match(text, /Sync-MirrorDirectory\s+-sourceDir/, `${name} does not mirror through Sync-MirrorDirectory`);
  }
});

test('the shared function is the only implementation that prunes a stale .github', () => {
  // The prune is the behaviour that made one implementation necessary. If it moves or is dropped,
  // both entry points silently lose the ability to converge a mirror that once picked one up.
  assert.match(mirrorFunction(read(MODULE)), /Pruned stale \$name from mirror/, 'the module no longer prunes a stale .github');
});

test('the GUI reports a failed mirror rather than logging success', () => {
  const text = read(GUI);
  const call = text.indexOf('Sync-MirrorDirectory -sourceDir');
  assert.notEqual(call, -1, 'the GUI mirror call is gone');
  const block = text.slice(call, call + 700);
  assert.match(block, /Success\s*-eq\s*\$false/, 'the GUI ignores the mirror result');
  assert.match(block, /return\s+"error"/, 'the GUI does not surface a failed mirror to the caller');
});

test('the mirror destination is declared once, and every consumer uses that name', () => {
  // The manifest used to carry `include`/`exclude` lists nothing read. `destination` is the field
  // that survives — so it must be a FACT the code agrees with, not a comment that happens to be
  // right. Three consumers build or compare the path, and all three are checked against it here.
  const destination = JSON.parse(read(MANIFEST)).mirror.destination;
  assert.equal(destination, '_guidelines', 'the declared mirror destination changed');

  for (const [name, file] of [['sync-guidelines.ps1', CLI], ['sync-manager.ps1', GUI]]) {
    const pattern = new RegExp(`Join-Path \\$(?:projectRoot|projectPath) "${destination}"`);
    assert.match(read(file), pattern, `${name} does not build the declared mirror path`);
  }
  assert.match(read(DRIFT), new RegExp(`MIRROR_NAME = '${destination}'`), 'check-sync-drift.js does not compare the declared path');
});

test('the check is not vacuous — it finds the code it judges', () => {
  const module = mirrorFunction(read(MODULE));
  const step = mirrorStep(read(CLI));
  // If either extraction stops matching, the assertions above would pass over nothing at all.
  assert.ok(module.length > 800, `mirrorFunction read ${module.length} chars`);
  assert.ok(step.length > 400, `mirrorStep read ${step.length} chars`);
  assert.ok(/Start-Process/.test(module), 'the module no longer starts robocopy');
  assert.ok(/Start-Process/.test(step), 'the fallback no longer starts robocopy');
});

test('REVERSAL PROOF: re-discarding the exit code is named', () => {
  const body = mirrorFunction(read(MODULE));
  assert.deepEqual(discardedExitCodes(body), [], 'clean to begin with');

  // The exact regression: back to `$null = Start-Process ... -PassThru`.
  const mutated = body.replace(/^\s*\$proc\s*=\s*Start-Process/m, '    $null = Start-Process');
  assert.notEqual(mutated, body, 'the mutation must actually reintroduce the discard');

  const hits = discardedExitCodes(mutated);
  assert.equal(hits.length, 1, hits.join('; '));
  assert.match(hits[0], /^\$null = Start-Process/);
});

test('REVERSAL PROOF: an unguarded summary is named', () => {
  const text = read(CLI);
  // The regression: the summary loses its guard and prints regardless of the outcome.
  const mutated = text.replace('} elseif ($mirrorOk) {', '} else {');
  assert.notEqual(mutated, text, 'the mutation must actually remove the guard');

  const complete = mutated.indexOf('Complete: $((Get-ChildItem');
  const guard = mutated.lastIndexOf('elseif ($mirrorOk)', complete);
  assert.equal(guard, -1, 'the mutation left the guard in place');
});
