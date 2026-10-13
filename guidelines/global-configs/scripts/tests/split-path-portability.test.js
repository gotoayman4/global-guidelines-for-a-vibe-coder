const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const { runSync } = require('../lib/run-sync.js');

const REPO = path.resolve(__dirname, '../../../../');
const SKILLS_DIR = path.join(REPO, 'guidelines', 'global-configs', 'skills');

/**
 * THE INVARIANT: never call `Split-Path -LiteralPath <path> -Parent` (or `-Leaf`, `-LeafBase`,
 * `-Extension`, `-Qualifier`, `-IsAbsolute`). `-LiteralPath` binds to its own parameter set,
 * which excludes the split switches, so the combination throws AmbiguousParameterSet.
 *
 * WHY IT EXISTS (measured 2026-10-13, on this repo, by breaking it).
 *
 * `sync-guidelines.ps1` extracted each skill's directory name from
 * `...\skills\<name>\SKILL.md` with:
 *
 *     $skillName = Split-Path (Split-Path -LiteralPath $file -Parent) -Leaf
 *
 * The INNER call — `Split-Path -LiteralPath $file -Parent` — throws
 * `AmbiguousParameterSet,Microsoft.PowerShell.Commands.SplitPathCommand` on every host this
 * repo runs on: Windows PowerShell 5.1 (5.1.26100, the build `sync-all.js` spawns) and
 * PowerShell 7.6 were both measured, both fail, both report the same FullyQualifiedErrorId.
 * The fatal spot is inside `[2/3] Syncing global tool configs ...`, which the fleet entry point
 * `sync-all.js` drives for all seven projects, so every project's sync aborted with exit 1 and
 * `sync-projects.json` recorded seven failures over a defect that has nothing to do with the
 * projects themselves.
 *
 * WHY IT SURVIVED REVIEW. The pattern reads as defensive PowerShell — `-LiteralPath` is the
 * "correct" spelling everywhere else (`Test-Path`, `Remove-Item`, `New-Item`, `Get-Content`),
 * where it suppresses wildcard interpretation with no downside. For `Split-Path` that spelling
 * is precisely what breaks, and no check ran the host that executes the script. The portable
 * form is the positional one: `Split-Path (Split-Path $file -Parent) -Leaf`. It costs nothing
 * here because `$file` is built by `Join-Path` over enumerated directory names plus the literal
 * "SKILL.md" — there is no wildcard to suppress.
 */

/** Every `.ps1`/`.psm1` this repo owns, discovered rather than listed. */
function powerShellFiles(dir = REPO, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip generated/vendored trees. `_guidelines/` is a byte copy of `guidelines/`, so a
      // defect here is reported once at its source rather than once per synced project.
      if (entry.name === 'node_modules' || entry.name === '_guidelines' || entry.name.startsWith('.')) continue;
      powerShellFiles(full, out);
    } else if (/\.ps(m1|1)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const SPLIT_SWITCH = '(Parent|Leaf|LeafBase|Extension|Qualifier|IsAbsolute)';

/**
 * The defect, as a list of occurrences. Comments are stripped first: the fix's own explanatory
 * comments quote the broken pattern, and a guard that flags its own documentation is worse than
 * no guard. Stripping is safe for this purpose — it can only remove text, and a broken call
 * inside a here-string is data, not code.
 */
function literalPathSplitFailures(files) {
  const failures = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.replace(/#.*$/, ''));
    lines.forEach((line, i) => {
      if (new RegExp(`Split-Path\\s+-LiteralPath\\s+[^\\r\\n]*?\\s+-${SPLIT_SWITCH}\\b`).test(line)) {
        failures.push({ file: path.relative(REPO, file), line: i + 1 });
      }
    });
  }
  return failures;
}

/** The first real `.../skills/<name>/SKILL.md` in the corpus, and its directory name. */
function firstSkill() {
  const names = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  assert.ok(names.length > 0, 'no skills found in the corpus');
  const name = names[0];
  const file = path.join(SKILLS_DIR, name, 'SKILL.md');
  assert.ok(fs.existsSync(file), `expected ${file} to exist`);
  return { file, name };
}

/**
 * Ask the REAL host (powershell.exe, the host sync-all.js spawns) to evaluate the two-step
 * split the fixed scripts use, on a real path. Returns {available, leaf, brokenError}.
 */
function probeHost(filePath) {
  const script =
    `$file = '${filePath.replace(/'/g, "''")}';` +
    // the fixed expression, as the scripts now run it
    `Split-Path (Split-Path $file -Parent) -Leaf;` +
    // the expression this guard forbids, to record whether the defect class is live here
    `try { Split-Path -LiteralPath $file -Parent } catch { 'BROKEN-FORM-FAILS: ' + $_.FullyQualifiedErrorId }`;
  const r = runSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
  if (r.error || r.status !== 0) return { available: false, leaf: null, brokenError: null };
  const out = r.stdout.trim().split(/\r?\n/).filter(Boolean);
  return {
    available: true,
    leaf: out[0] ?? null,
    brokenError: out.find((l) => l.startsWith('BROKEN-FORM-FAILS:')) ?? null,
  };
}

const hostProbe = runSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "'alive'"]);
const SKIP = hostProbe.error || hostProbe.status !== 0 ? 'powershell.exe is not available on this host' : false;

test('no PowerShell script pairs Split-Path -LiteralPath with a split switch', () => {
  const failures = literalPathSplitFailures(powerShellFiles());
  const detail = failures.map((f) => `  ${f.file}:${f.line}`).join('\n');
  assert.deepEqual(failures, [], `AmbiguousParameterSet on every host (5.1 and 7 both measured):\n${detail}`);
});

test('the guard is not vacuous — it finds the scripts it is protecting', () => {
  const files = powerShellFiles();
  assert.ok(files.length >= 4, `expected the repo's PowerShell scripts, found ${files.length}`);
});

test('REVERSAL PROOF: reintroducing the broken split is reported', () => {
  assert.deepEqual(literalPathSplitFailures(powerShellFiles()), [], 'clean to begin with');

  // The exact regression: the "-LiteralPath is the correct spelling" habit reapplied.
  const tmp = path.join(REPO, '.workbuddy-ai', 'tmp', 'broken-split.ps1');
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, '$skillName = Split-Path (Split-Path -LiteralPath $file -Parent) -Leaf\n');
  try {
    const failures = literalPathSplitFailures([tmp]);
    assert.equal(failures.length, 1, 'the mutation must be reported');
    assert.match(failures[0].file, /broken-split\.ps1$/);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

test('the fixed expression resolves a real skill path on the host that runs the scripts', { skip: SKIP }, () => {
  const { file, name } = firstSkill();
  const probe = probeHost(file);
  assert.equal(probe.available, true, 'the probe must reach a real host');
  assert.equal(probe.leaf, name, `expected the two-step split to yield "${name}", got "${probe.leaf}"`);
});

test('the forbidden form is genuinely broken on this host — or the guard is a fiction', { skip: SKIP }, () => {
  // Reports the measured fact rather than asserting it: on a future host where Microsoft repairs
  // the parameter set, the guard stays correct while this test simply notes the repair.
  const { file } = firstSkill();
  const probe = probeHost(file);
  assert.equal(probe.available, true, 'the probe must reach a real host');
  assert.match(
    probe.brokenError || '',
    /AmbiguousParameterSet/,
    `the broken form unexpectedly works on this host — re-verify why the guard exists before relaxing it`
  );
});
