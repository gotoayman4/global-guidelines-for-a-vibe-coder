const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');
const { docBreadth } = require('../lib/doc-breadth.js');
const { examine, isSource, SOURCE_EXT } = require('../check-doc-breadth.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/check-doc-breadth.js');

/** The four files `documentation-strategy.md` §Trigger Table names as its targets. */
const STEERING = ['AGENTS.md', 'README.md', 'WORLD.md', 'docs/AI_ARCHITECTURE.md'];

/**
 * Fresh content per steering file.
 *
 * A fixture that writes the same bytes the seed already holds produces NO change, so git leaves
 * the file out of the commit and the guard correctly counts zero steering writes. That is how a
 * first draft of this file passed and failed for the wrong reasons.
 */
const WRITE = {
  'AGENTS.md': '# Agents\n\nupdated\n',
  'README.md': '# Readme\n\nupdated\n',
  'docs/AI_ARCHITECTURE.md': '# Arch\n\nupdated\n',
};

/**
 * `WORLD.md` carries the mode declaration, which `deriveMode` reads from the working tree.
 * A fixture that overwrites it with plain prose silently demotes the project to `standard`, so
 * the test then measures a breadth of 2 while believing it is measuring 1.
 */
const world = (mode) => ({ 'WORLD.md': `# World\n\n- **mode:** \`${mode}\`\n\nupdated\n` });

function git(dir, args) {
  // `--no-verify` and an explicit gpgsign=false: a fixture commit must not depend on the
  // machine's hooks or signing config, or the suite fails for reasons the guard does not own.
  const result = runSync('git', ['-c', 'commit.gpgsign=false', ...args], { cwd: dir });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}

function cli(dir, ...args) {
  return runSync(process.execPath, [SCRIPT, dir, ...args], { cwd: REPO_ROOT });
}

/** A project with the mandated steering files and a declared mode. */
function project(mode = 'vibe') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'breadth-'));
  fs.writeFileSync(path.join(dir, 'WORLD.md'), `# World\n\n- **mode:** \`${mode}\`\n`);
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Agents\n');
  fs.writeFileSync(path.join(dir, 'README.md'), '# Readme\n');
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs', 'AI_ARCHITECTURE.md'), '# Arch\n');
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Test']);
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '--no-verify', '-m', 'chore: seed']);
  return dir;
}

/** Commit a set of files and return the new SHA. */
function commit(dir, files, message) {
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '--no-verify', '-m', message]);
  return git(dir, ['rev-parse', 'HEAD']).trim();
}

test('the breadth is read from the table that owns it, not typed here', () => {
  const { caps, steering, ok } = docBreadth();
  assert.equal(ok, true);
  assert.equal(caps.vibe, 1);
  assert.equal(caps.standard, 2);
  // `guarded` states no number because the mode writes the full set — null is the fact, not a gap.
  assert.equal(caps.guarded, null);
  assert.deepEqual(steering, STEERING);
});

test('the breadth follows the table — a reversal proof against a rewritten owner', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'breadth-table-'));
  const owner = path.join(dir, 'documentation-strategy.md');
  fs.writeFileSync(owner, [
    '# Strategy',
    '',
    '## Trigger Table (When Steering MUST Change)',
    '',
    '| Trigger | vibe — 3 writes | standard — 5 writes | guarded |',
    '|---|---|---|---|',
    '| New dependency | `AGENTS.md` §Stack | + note | + an ADR |',
    '| New endpoint | `docs/AI_ARCHITECTURE.md` | + contract | + an ADR |',
    '',
  ].join('\n'));

  const { caps, steering, ok } = docBreadth(owner);
  assert.equal(ok, true);
  assert.equal(caps.vibe, 3, 'a rewritten table must move the guard, not be ignored');
  assert.equal(caps.standard, 5);
  assert.deepEqual(steering, ['AGENTS.md', 'docs/AI_ARCHITECTURE.md']);
});

test('an unreadable or malformed table is vacuous, never a silent pass', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'breadth-bad-'));
  const missing = docBreadth(path.join(dir, 'nope.md'));
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.steering, []);

  // A section with no header row: the numbers are absent, so `ok` must be false rather than
  // defaulting to a cap nobody declared.
  const owner = path.join(dir, 'documentation-strategy.md');
  fs.writeFileSync(owner, '# Strategy\n\n## Trigger Table\n\nNo table here.\n');
  assert.equal(docBreadth(owner).ok, false);
});

test('a work slice inside its breadth passes', () => {
  const dir = project('vibe');
  const sha = commit(dir, { 'src/a.ts': 'export const a = 1;\n', 'AGENTS.md': WRITE['AGENTS.md'] }, 'feat: add a');
  const report = examine(dir, sha);
  assert.equal(report.violation, false);
  assert.equal(report.mode, 'vibe');
  assert.equal(report.breadth, 1);
  assert.deepEqual(report.steering, ['AGENTS.md']);
  assert.deepEqual(report.source, ['src/a.ts']);
});

test('THE REVERSAL PROOF: a vibe work slice writing two steering files fails', () => {
  // The doctrine's own anti-pattern (documentation-strategy.md §Anti-Patterns): breadth scales
  // with the mode. Two steering writes on a `vibe` code slice is the failure the guard exists for.
  const dir = project('vibe');
  const sha = commit(dir, {
    'src/a.ts': 'export const a = 1;\n',
    'AGENTS.md': WRITE['AGENTS.md'],
    'README.md': WRITE['README.md'],
  }, 'feat: add a');

  const report = examine(dir, sha);
  assert.equal(report.violation, true, 'two steering writes exceed the vibe breadth of one');
  assert.equal(report.steering.length, 2);
  assert.equal(report.source.length, 1);
});

test('THE ORIGINAL PATHOLOGY: the 15-27-file fan-out fails', () => {
  // What the reform measured: a feature slice that wrote the whole steering set. Four steering
  // files on a code slice, in a mode whose breadth is one.
  const dir = project('vibe');
  const sha = commit(dir, { 'src/a.ts': 'export const a = 1;\n', ...WRITE, ...world('vibe') }, 'feat: add a and rewrite the steering set');

  const report = examine(dir, sha);
  assert.equal(report.violation, true);
  assert.equal(report.steering.length, 4, 'the whole set was written');
  assert.equal(report.breadth, 1);
  assert.equal(report.mode, 'vibe', 'the fixture must not clobber its own mode declaration');
});

test('a ritual commit is exempt — the measurement that set the rule', () => {
  // In the reference project every commit touching 2-4 steering files was a docs/ritual commit,
  // and a naive per-commit cap would have failed a third of healthy history. A commit with no
  // product source change is doing the ritual, which is the whole job.
  const dir = project('vibe');
  const sha = commit(dir, { ...WRITE, ...world('vibe'), 'docs/adr/001-thing.md': '# ADR 1\n' }, 'docs: the milestone writes the full steering set');

  const report = examine(dir, sha);
  assert.equal(report.violation, false);
  assert.match(report.exempt, /no product source/);
  assert.equal(report.steering.length, 4, 'the exemption is about the slice, not the count');
  assert.equal(report.record.length, 1);
});

test('standard allows two, and fails the third', () => {
  const dir = project('standard');
  const two = commit(dir, {
    'src/a.ts': 'export const a = 1;\n',
    'AGENTS.md': WRITE['AGENTS.md'],
    'README.md': WRITE['README.md'],
  }, 'feat: add a');
  assert.equal(examine(dir, two).violation, false, 'two of two allowed');

  const three = commit(dir, {
    'src/b.ts': 'export const b = 1;\n',
    'AGENTS.md': '# Agents\n\nupdated again\n',
    'README.md': '# Readme\n\nupdated again\n',
    ...world('standard'),
  }, 'feat: add b');
  assert.equal(examine(dir, three).violation, true, 'the third steering write exceeds standard');
});

test('guarded is unbounded — the mode that writes the full set', () => {
  const dir = project('guarded');
  const sha = commit(dir, { 'src/a.ts': 'export const a = 1;\n', ...WRITE, ...world('guarded') }, 'feat: add a');
  const report = examine(dir, sha);
  assert.equal(report.violation, false);
  assert.equal(report.breadth, null);
  assert.equal(report.mode, 'guarded');
  assert.match(report.exempt, /full set/);
});

test('source is judged by extension and excludes docs, the mirror and the scratch dir', () => {
  assert.equal(isSource('src/a.ts'), true);
  assert.equal(isSource('functions/src/index.ts'), true);
  assert.equal(isSource('firebase/firestore.rules'), true);
  // A file list cannot tell "wired a script" from "changed the product" — the guard stays silent.
  assert.equal(isSource('package.json'), false);
  assert.equal(isSource('AGENTS.md'), false);
  assert.equal(isSource('_guidelines/global-configs/scripts/x.js'), false);
  assert.equal(isSource('.workbuddy-ai/memory/2026-10-12.md'), false);
  // Non-vacuity: the extension list must actually discriminate, or every commit reads as ritual.
  assert.ok(SOURCE_EXT.test('.ts'));
  assert.ok(!SOURCE_EXT.test('.md'));
});

test('an undeclared mode falls back to standard, and an unknown one is vacuous', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'breadth-nomode-'));
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Agents\n');
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Test']);
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '--no-verify', '-m', 'feat: a']);
  assert.equal(examine(dir).mode, 'standard', 'silence must not grant the loosest mode');

  fs.writeFileSync(path.join(dir, 'WORLD.md'), '# World\n\n- **mode:** `turbo`\n');
  const unknown = examine(dir);
  assert.match(unknown.vacuous, /turbo/);
  assert.equal(unknown.violation, false);
});

test('a directory that is not a repository is vacuous, not a failure', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'breadth-nogit-'));
  const report = examine(dir);
  assert.ok(report.vacuous, 'a missing commit is reported as unjudgeable');
  assert.equal(report.violation, false);
});

test('the CLI exits 1 on a violation and 0 on a ritual commit', () => {
  const dir = project('vibe');
  const bad = commit(dir, {
    'src/a.ts': 'export const a = 1;\n',
    'AGENTS.md': WRITE['AGENTS.md'],
    'README.md': WRITE['README.md'],
  }, 'feat: add a');
  assert.equal(cli(dir, '--commit', bad).status, 1, 'the violation is a failing exit');

  const ritual = commit(dir, { 'docs/PRD.md': '# PRD\n' }, 'docs: note');
  assert.equal(cli(dir, '--commit', ritual).status, 0, 'a ritual commit is not a failure');

  // `--commit` really selects the ref: the same repository fails on one and passes on the other.
  assert.equal(cli(dir, '--commit', bad).status, 1);
});

test('the guard is silent on the repository it ships in', () => {
  // Non-vacuity in the other direction: a guard that fires on healthy history gets deleted, so
  // the real corpus is asserted clean. The 29-commit sweep of the reference project is the
  // wider check, run when the rule was set.
  const report = examine(REPO_ROOT);
  assert.equal(report.violation, false, JSON.stringify(report.steering));
});
