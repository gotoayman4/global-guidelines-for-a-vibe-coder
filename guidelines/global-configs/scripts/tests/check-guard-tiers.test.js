const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');
const { analyse, expand, readTier, leadingDocblock, render, resolveGate, TIERS, SCRIPTS } = require('../check-guard-tiers.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/check-guard-tiers.js');

/**
 * A fixture repo in the shape the guard expects: a `package.json` at the root and guards under
 * `guidelines/global-configs/scripts/`. `guards` maps a filename to the tier its docblock
 * declares, or `null` for a guard that declares none.
 */
function fixture({ guards = {}, scripts = {}, hook = null, layout = 'central' }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tiers-'));
  const scriptsDir = layout === 'mirror'
    ? path.join(dir, '_guidelines', 'global-configs', 'scripts')
    : path.join(dir, 'guidelines', 'global-configs', 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts }, null, 2));
  if (hook !== null) {
    fs.mkdirSync(path.join(dir, '.husky'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.husky', 'pre-push'), hook);
  }
  for (const [name, tier] of Object.entries(guards)) {
    const decl = tier === null ? '' : `\n * @tier ${tier}\n`;
    fs.writeFileSync(
      path.join(scriptsDir, name),
      `#!/usr/bin/env node\n\n/**\n * ${name} — a fixture guard.\n${decl} *\n * Source: global-configs/scripts/${name}\n */\n`,
    );
  }
  return dir;
}

/** Analyse a fixture with the same (scriptsDir, repo) split the CLI resolves. */
function inspect(dir, layout = 'central') {
  const scriptsDir = layout === 'mirror'
    ? path.join(dir, '_guidelines', 'global-configs', 'scripts')
    : path.join(dir, 'guidelines', 'global-configs', 'scripts');
  return analyse(scriptsDir, dir);
}

/** A runner script that invokes one guard file. */
const runner = (name) => `node guidelines/global-configs/scripts/${name}`;

// ─── The live repo ───────────────────────────────────────────────────────────

test('the repo classifies every guard and the tiers hold', () => {
  const report = analyse();
  assert.deepEqual(report.problems, [], JSON.stringify(report.problems));
  assert.ok(report.guards.length >= 9, 'the guard set is discovered, not empty');
  assert.equal(report.gate, 'npm run validate');
  assert.equal(report.gateKind, 'npm');
});

test('every guard declares a tier — the reader is not vacuous', () => {
  const report = analyse();
  const undeclared = report.guards.filter((guard) => guard.tier === null).map((guard) => guard.file);
  assert.deepEqual(undeclared, [], 'a guard with no `@tier` cannot be placed in a chain');
  for (const guard of report.guards) assert.ok(TIERS.includes(guard.tier), `${guard.file}: ${guard.tier}`);
});

test('every `always` guard is reached by the gate', () => {
  // `always` means every push, in every mode. A gate that skips one contradicts the tier it was
  // given, which is the failure the guard exists for.
  const report = analyse();
  const always = report.guards.filter((guard) => guard.tier === 'always').map((guard) => guard.file);
  assert.ok(always.length > 0, 'the repo must declare at least one `always` guard');
  for (const file of always) {
    assert.ok(report.reachedByGate.includes(file), `${file} is \`always\` but the gate never reaches it`);
  }
});

// ─── Reversal proofs: each assertion fails when the pathology is fed to it ────

test('REVERSAL PROOF: a guard with no @tier fails, naming the file', () => {
  const dir = fixture({
    guards: { 'check-alpha.js': 'always', 'check-beta.js': null },
    scripts: { validate: runner('check-alpha.js'), 'check-alpha': runner('check-alpha.js'), 'check-beta': runner('check-beta.js') },
  });
  const report = inspect(dir);
  assert.equal(report.problems.length, 1, JSON.stringify(report.problems));
  assert.match(report.problems[0], /check-beta\.js/);
  assert.match(report.problems[0], /@tier/);
});

test('REVERSAL PROOF: an `always` guard the gate never reaches fails', () => {
  const dir = fixture({
    guards: { 'check-alpha.js': 'always' },
    // The gate runs, but not this guard: `always` is a promise the gate has to keep.
    scripts: { validate: 'echo nothing', 'check-alpha': runner('check-alpha.js') },
  });
  const report = inspect(dir);
  assert.equal(report.problems.length, 1, JSON.stringify(report.problems));
  assert.match(report.problems[0], /check-alpha\.js/);
  assert.match(report.problems[0], /always/);
});

test('REVERSAL PROOF: a `ship` guard in the `vibe` chain fails', () => {
  const dir = fixture({
    guards: { 'check-e2e.js': 'ship', 'check-alpha.js': 'always' },
    scripts: {
      validate: runner('check-alpha.js'),
      'gate:fast': runner('check-e2e.js'),
      'check-alpha': runner('check-alpha.js'),
      'check-e2e': runner('check-e2e.js'),
    },
  });
  const report = inspect(dir);
  assert.match(report.problems.join('\n'), /check-e2e\.js: declares `ship` but `npm run gate:fast`/);
});

test('REVERSAL PROOF: a guard no npm script runs is an orphan', () => {
  const dir = fixture({
    guards: { 'check-orphan.js': 'standard+', 'check-alpha.js': 'always' },
    scripts: { validate: runner('check-alpha.js'), 'check-alpha': runner('check-alpha.js') },
  });
  const report = inspect(dir);
  assert.match(report.problems.join('\n'), /check-orphan\.js: declares `standard\+` but no npm script runs it/);
});

// ─── The softened assertion, pinned so nobody "fixes" it into a failure ───────

test('a `standard+` guard the gate does not reach is ADVISORY, never fatal', () => {
  // Six real guards are milestone- or fleet-scoped by design. A guard that failed them would fail
  // correct work, and a guard that fails correct work gets deleted — so this is reported, not failed.
  const dir = fixture({
    guards: { 'check-milestone.js': 'standard+' },
    scripts: { validate: 'echo nothing', 'check-milestone': runner('check-milestone.js') },
  });
  const report = inspect(dir);
  assert.deepEqual(report.problems, []);
  assert.match(report.advisories.join('\n'), /check-milestone\.js/);
});

test('the repo reports its milestone-scoped guards rather than hiding them', () => {
  const report = analyse();
  const named = report.advisories.filter((line) => line.includes('.js: `standard+`'));
  assert.ok(named.length > 0, 'the unreached standard+ guards must be named');
  for (const line of named) assert.match(line, /by design/);
});

// ─── Non-vacuity of the reader ───────────────────────────────────────────────

test('a `@tier` in code, not in the docblock, does not count', () => {
  const dir = fixture({ guards: { 'check-alpha.js': 'always' }, scripts: { validate: runner('check-alpha.js'), 'check-alpha': runner('check-alpha.js') } });
  const file = path.join(dir, 'guidelines', 'global-configs', 'scripts', 'check-alpha.js');
  fs.writeFileSync(file, '#!/usr/bin/env node\n\n/**\n * check-alpha.js — declares nothing.\n */\nconst NOTE = "@tier ship";\n');
  assert.equal(readTier(file), null, 'the declaration must be the docblock, not a string in the body');
});

test('the shebang is tolerated and a missing docblock reads as undeclared', () => {
  assert.match(leadingDocblock('#!/usr/bin/env node\n\n/**\n * @tier ship\n */\n'), /@tier ship/);
  assert.equal(leadingDocblock('const x = 1;\n'), '');
});

test('an unknown tier value reads as undeclared, never as a silent default', () => {
  const dir = fixture({
    guards: { 'check-alpha.js': 'turbo' },
    scripts: { validate: runner('check-alpha.js'), 'check-alpha': runner('check-alpha.js') },
  });
  const report = inspect(dir);
  assert.equal(report.guards[0].tier, null);
  assert.match(report.problems.join('\n'), /no `@tier`/);
});

test('an empty guard directory is a data error, not a pass', () => {
  const dir = fixture({ guards: {}, scripts: { validate: 'echo nothing' } });
  assert.match(inspect(dir).problems.join('\n'), /no `check-\*\.js` guards found/);
});

test('a missing package.json is a data error', () => {
  const dir = fixture({ guards: { 'check-alpha.js': 'always' }, scripts: {} });
  fs.rmSync(path.join(dir, 'package.json'));
  assert.match(inspect(dir).problems.join('\n'), /package\.json/);
});

test('a chain is followed transitively, not one level deep', () => {
  // The gate calls a sub-script that calls the guard. A one-level read would miss it and report a
  // guard as unreached that the gate does in fact run.
  const names = expand({ validate: 'npm run gate:full', 'gate:full': 'npm run check-alpha', 'check-alpha': 'node x.js' }, 'validate');
  assert.deepEqual([...names].sort(), ['check-alpha', 'gate:full', 'validate']);
});

// ─── A project's chain is its hook, and the assertion softens there ───────────

test('with no npm-script gate the hook is the chain, and it is read for `npm run` refs', () => {
  const dir = fixture({
    guards: { 'check-alpha.js': 'always' },
    scripts: { 'check-alpha': runner('check-alpha.js') },
    hook: '#!/bin/sh\nnpm run check-alpha\n',
  });
  const report = inspect(dir);
  assert.equal(report.gateKind, 'hook');
  assert.equal(report.gate, '.husky/pre-push');
  assert.ok(report.reachedByGate.includes('check-alpha.js'), 'the hook does run it');
  assert.deepEqual(report.problems, []);
});

test('an `always` guard the HOOK misses is ADVISORY, never fatal', () => {
  // §Tier B has the hook branch on the declared mode, so its membership is a mode decision this
  // guard cannot evaluate — and guessing wrong would fail a correct project.
  const dir = fixture({
    guards: { 'check-alpha.js': 'always' },
    scripts: { 'check-alpha': runner('check-alpha.js') },
    hook: '#!/bin/sh\nnpm run lint\n',
  });
  const report = inspect(dir);
  assert.deepEqual(report.problems, []);
  assert.match(report.advisories.join('\n'), /check-alpha\.js: declares `always`/);
});

test('an npm-script gate wins over the hook, and there the `always` promise is fatal', () => {
  // The same guard, the same miss — fatal here, advisory above. That split is the design.
  const dir = fixture({
    guards: { 'check-alpha.js': 'always' },
    scripts: { validate: 'echo nothing', 'check-alpha': runner('check-alpha.js') },
    hook: '#!/bin/sh\nnpm run check-alpha\n',
  });
  const report = inspect(dir);
  assert.equal(report.gateKind, 'npm');
  assert.equal(report.gate, 'npm run validate');
  assert.equal(report.problems.length, 1, JSON.stringify(report.problems));
  assert.match(report.problems[0], /check-alpha\.js: declares `always`/);
});

test('resolveGate falls back to null when there is neither a gate script nor a hook', () => {
  const dir = fixture({ guards: { 'check-alpha.js': 'always' }, scripts: { 'check-alpha': runner('check-alpha.js') } });
  const report = inspect(dir);
  assert.equal(report.gate, null);
  assert.equal(report.gateKind, null);
  assert.deepEqual(report.problems, [], 'no chain is not a violation — it is reported');
});

// ─── What a hook actually says it runs: `run_step`, a named file, and the derivation ───

test('a `run_step` ref is a step, not only `npm run`', () => {
  // The scaffold writes `run_step` so a MISSING script fails the push. A parser that reads only
  // `npm run` reports a correctly wired hook as running nothing — and then every `always` guard in
  // every scaffolded project reads as unreached.
  const dir = fixture({
    guards: { 'check-alpha.js': 'always' },
    scripts: { 'check-alpha': runner('check-alpha.js') },
    hook: '#!/bin/sh\nrun_step check-alpha\n',
  });
  const report = inspect(dir);
  assert.ok(report.reachedByGate.includes('check-alpha.js'), JSON.stringify(report.reachedByGate));
  assert.deepEqual(report.problems, []);
});

test('a hook that names a guard file reaches that guard', () => {
  // Invoking the script by path is a step too; there is no npm-script name to match.
  const dir = fixture({
    guards: { 'check-alpha.js': 'always' },
    scripts: { 'check-alpha': runner('check-alpha.js') },
    hook: '#!/bin/sh\nnode "_guidelines/global-configs/scripts/check-alpha.js" --strict\n',
    layout: 'mirror',
  });
  const report = inspect(dir, 'mirror');
  assert.ok(report.reachedByGate.includes('check-alpha.js'), JSON.stringify(report.reachedByGate));
});

test('a hook that runs the DERIVATION reaches every `always` guard by construction', () => {
  // `--run-always` asks this guard for the tier and runs what comes back, so the set is decided by
  // the guards' own docblocks and never appears as a name in the hook. A reader that needs a name
  // tells a wired project its gate is empty — the false headline this exists to stop.
  const dir = fixture({
    guards: { 'check-alpha.js': 'always', 'check-beta.js': 'always' },
    scripts: { 'guard:alpha': runner('check-alpha.js') },
    hook: '#!/bin/sh\nnode "_guidelines/global-configs/scripts/check-guard-tiers.js" --root . --run-always\nrun_step guard:alpha\n',
    layout: 'mirror',
  });
  const report = inspect(dir, 'mirror');
  assert.equal(report.derivesAlways, true);
  assert.ok(report.reachedByGate.includes('check-beta.js'), 'reached by the derivation, not by a name');
  assert.doesNotMatch(report.advisories.join('\n'), /check-beta\.js: declares `always`/);
  assert.deepEqual(report.problems, []);
});

test('REVERSAL PROOF: running the reporter without `--run-always` does not claim the tier', () => {
  // Reporting the always set is not running it. A hook that calls this guard for its table must not
  // be read as a gate, or the guard certifies a chain that executes nothing.
  const dir = fixture({
    guards: { 'check-alpha.js': 'always', 'check-beta.js': 'always' },
    scripts: { 'guard:alpha': runner('check-alpha.js'), 'guard:beta': runner('check-beta.js') },
    hook: '#!/bin/sh\nnode "_guidelines/global-configs/scripts/check-guard-tiers.js" --root .\n',
    layout: 'mirror',
  });
  const report = inspect(dir, 'mirror');
  assert.equal(report.derivesAlways, false);
  assert.deepEqual(report.reachedByGate, [], 'the reporter is named; neither guard is');
  const misses = report.advisories.filter((line) => /declares `always` but/.test(line));
  assert.equal(misses.length, 2, JSON.stringify(report.advisories));
  assert.deepEqual(report.problems, [], 'against a hook the `always` promise stays advisory');
  assert.equal(resolveGate(path.join(dir, 'nowhere'), {}).derivesAlways, false);
});

test('the report tells a missing `gate:fast` from one that wires no guard', () => {
  // Both render as "0 guard(s) wired". One is a project that never defined the chain; the other has
  // the chain and simply keeps no guard in it. Printing the same word for both hides which to act on.
  const absent = render(inspect(fixture({ guards: { 'check-alpha.js': 'standard+' }, scripts: { 'check-alpha': runner('check-alpha.js') }, layout: 'mirror' }), 'mirror'));
  assert.match(absent, /npm run gate:fast \(absent\)/);

  const dir = fixture({
    guards: { 'check-alpha.js': 'standard+' },
    scripts: { 'gate:fast': 'npm run lint', lint: 'echo', 'check-alpha': runner('check-alpha.js') },
    layout: 'mirror',
  });
  const report = inspect(dir, 'mirror');
  assert.ok(report.scripts['gate:fast'], 'the chain exists here');
  assert.equal(report.reachedByVibe.length, 0);
  assert.match(render(report), /npm run gate:fast — nothing wired into it/);
});

// ─── A project's mirror carries every guard; it wires a subset ───────────────
test('isMirror tells the repo that owns the guards from the one that mirrors them', () => {
  const central = fixture({ guards: { 'check-a.js': 'standard+' } });
  const mirrored = fixture({ guards: { 'check-a.js': 'standard+' }, layout: 'mirror' });
  assert.equal(inspect(central).mirror, false);
  assert.equal(inspect(mirrored, 'mirror').mirror, true);
});

test('in the repo that OWNS the guards an unwired guard is fatal', () => {
  // The central repo ships every guard and must be able to invoke each one; a guard with no script
  // is a control that exists only in a directory listing.
  const dir = fixture({
    guards: { 'check-orphan.js': 'standard+' },
    scripts: { validate: 'echo nothing' },
  });
  const report = inspect(dir);
  assert.match(report.problems.join('\n'), /check-orphan\.js: declares `standard\+` but no npm script runs it/);
});

test('in a MIRROR an unwired guard is ADVISORY — the subset is the project\'s choice', () => {
  // The GAMS shape: `_guidelines/` carries all ten guards, and the project wires the four that are
  // meaningful to it. Failing the other six would fail a correct project — the project-side check is
  // `check-sync-drift.js` §controls, which verifies the DECLARED set instead of guessing.
  const dir = fixture({
    guards: { 'check-fleet-only.js': 'standard+', 'check-alpha.js': 'standard+' },
    scripts: { 'check-alpha': runner('check-alpha.js') },
    layout: 'mirror',
  });
  const report = inspect(dir, 'mirror');
  assert.deepEqual(report.problems, [], JSON.stringify(report.problems));
  assert.match(report.advisories.join('\n'), /check-fleet-only\.js: `standard\+`, and no npm script here runs it/);
});

// ─── CLI contract ────────────────────────────────────────────────────────────

test('the CLI exits 0 on the real repo and 1 on a root with no package.json', () => {
  const clean = runSync(process.execPath, [SCRIPT], { cwd: REPO_ROOT });
  assert.equal(clean.status, 0, clean.stdout);

  // `--root` relocates only where `package.json` and the hook are read; the guards stay
  // mirror-relative. A root with no package.json has no chain to derive — a data error, not a pass.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tiers-root-'));
  const broken = runSync(process.execPath, [SCRIPT, '--root', dir], { cwd: REPO_ROOT });
  assert.equal(broken.status, 1);
  assert.match(broken.stdout, /package\.json/);
});

test('the guard set is mirror-relative: a project root supplies only package.json', () => {
  // The GAMS shape — the guards live in the mirror, the package.json is the project's own. Resolving
  // the guards FROM the root would find nothing and report a data error instead of a real answer.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tiers-project-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { validate: 'echo nothing' } }));
  const report = analyse(SCRIPTS, dir);
  assert.ok(report.guards.length >= 9, 'the real guard set is read, not the empty root');
  assert.equal(report.gate, 'npm run validate');
});

test('a positional root is accepted, so a project can wire it the way it wires the others', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tiers-positional-'));
  const result = runSync(process.execPath, [SCRIPT, dir], { cwd: REPO_ROOT });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /package\.json/);
});

test('the CLI rejects an unknown flag with a usage error', () => {
  const result = runSync(process.execPath, [SCRIPT, '--nope'], { cwd: REPO_ROOT });
  assert.equal(result.status, 2);
});
