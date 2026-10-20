const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');
const { examine, bootstrap, candidates, classify } = require('../check-agents-paths.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/check-agents-paths.js');

function git(dir, args) {
  // A fixture commit must not depend on the machine's hooks or signing config, or the suite fails
  // for reasons the guard does not own.
  const result = runSync('git', ['-c', 'commit.gpgsign=false', ...args], { cwd: dir });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}

function cli(dir, ...args) {
  return runSync(process.execPath, [SCRIPT, dir, ...args], { cwd: REPO_ROOT });
}

const AGENTS = (bootstrapBody, level = '##') => `# Agents\n\n${level} Session Bootstrap\n\n${bootstrapBody}\n\n${level} Next\n\nprose\n`;

/**
 * A committed project whose bootstrap is the argument.
 *
 * `before` is written and committed; `after` is written afterwards and left uncommitted — which is
 * the state the guard exists to catch, and cannot be produced by committing everything.
 */
function project(bootstrapBody, { before = {}, after = {}, level = '##' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-paths-'));
  const write = (rel, body) => {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  };
  write('AGENTS.md', AGENTS(bootstrapBody, level));
  for (const [rel, body] of Object.entries(before)) write(rel, body);
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Test']);
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '--no-verify', '-m', 'chore: seed']);
  for (const [rel, body] of Object.entries(after)) write(rel, body);
  return dir;
}

test('the section is read at any depth, and ends at the next same-or-shallower heading', () => {
  const h2 = bootstrap('# A\n\n## Session Bootstrap\n\nalpha\n\n### Deeper\n\nbeta\n\n## Next\n\ngamma\n');
  assert.equal(h2.level, 2);
  assert.match(h2.body, /alpha/);
  assert.match(h2.body, /beta/, 'a deeper heading is still inside the section');
  assert.doesNotMatch(h2.body, /gamma/, 'the next h2 ends it');

  const h3 = bootstrap('# A\n\n### Session Bootstrap\n\nalpha\n\n#### Deeper\n\nbeta\n\n### Next\n\ngamma\n');
  assert.equal(h3.level, 3);
  assert.match(h3.body, /beta/);
  assert.doesNotMatch(h3.body, /gamma/);

  assert.equal(bootstrap('# A\n\nNo bootstrap here.\n'), null);
});

test('a token is judged only when it claims to be a loadable file', () => {
  const tokens = candidates([
    'Read `AGENTS.md` and `docs/PRD.md`.',
    'Run `npm run dev:all`, `npx playwright test`, `sync-guidelines.ps1`.',
    'See `https://example.com/doc.md` or `<path/to/file>`.',
    'A directory `src/components/` and a glob `docs/*.md`.',
    'A mirrored doc `_guidelines/_index/MASTER_INDEX.md`.',
  ].join('\n'));

  assert.deepEqual(tokens, [
    'AGENTS.md',
    'docs/PRD.md',
    'src/components/',
    '_guidelines/_index/MASTER_INDEX.md',
  ]);
});

test('THE REVERSAL PROOF: an untracked rule file the bootstrap loads fails', () => {
  // This is the reference project's 2026-10-21 defect, reduced: the file exists on the disk that
  // wrote the sentence, git has never seen it, and every other guard passes. A clone is told to
  // read a file it does not have.
  const dir = project('1. Read `.qoder/rules/testing.md` — always', {
    before: { '.gitignore': '.qoder/*\n!.qoder/rules/\n!.qoder/rules/**\n' },
    after: { '.qoder/rules/testing.md': '# Testing\n' },
  });
  const report = examine(dir);
  assert.equal(report.state, 'judged');
  assert.equal(report.failure, true, 'present-but-untracked must fail');
  assert.deepEqual(report.untracked, ['.qoder/rules/testing.md']);
  assert.equal(cli(dir).status, 1, 'the CLI exits 1 on the defect');
});

test('a path that exists nowhere fails; a tracked path passes', () => {
  const dir = project('Read `docs/PRD.md` and `.qoder/rules/missing.md`', {
    before: { 'docs/PRD.md': '# PRD\n', '.qoder/rules/testing.md': '# Testing\n' },
  });
  const report = examine(dir);
  assert.equal(report.failure, true);
  assert.deepEqual(report.missing, ['.qoder/rules/missing.md']);
  assert.deepEqual(report.ok, ['docs/PRD.md']);
  assert.equal(cli(dir).status, 1);
});

test('a root file is resolved, not called ambiguous', () => {
  // `AGENTS.md` and `WORLD.md` have no directory but they are not ambiguous: they are at the root
  // and git carries them. Treating them as unresolvable made the guard warn on every healthy
  // project, which is how a guard gets deleted.
  const dir = project('Read this `AGENTS.md` first, then `WORLD.md`', { before: { 'WORLD.md': '# World\n' } });
  const report = examine(dir);
  assert.equal(report.failure, false);
  assert.deepEqual(report.ok, ['AGENTS.md', 'WORLD.md']);
  assert.deepEqual(report.bare, []);
});

test('the mirror is informational — absent means "run the sync", never a failure', () => {
  const absent = examine(project('Load `_guidelines/_index/MASTER_INDEX.md`'));
  assert.equal(absent.failure, false);
  assert.deepEqual(absent['mirror-absent'], ['_guidelines/_index/MASTER_INDEX.md']);

  const present = project('Load `_guidelines/_index/MASTER_INDEX.md`', {
    before: { '_guidelines/_index/MASTER_INDEX.md': '# Index\n' },
  });
  const resolved = examine(present);
  assert.equal(resolved.failure, false);
  assert.deepEqual(resolved.mirror, ['_guidelines/_index/MASTER_INDEX.md']);
});

test('a sentence that states the `_guidelines/` prefix once still resolves its list', () => {
  // Measured in Evaluator-v4: "load from `_guidelines/`: `ux-design-principles.md`,
  // `05-stack-guides/mui/mui-rtl-bidirectional.md`, …". The prefix is prose, the paths are relative
  // to it, and the files are present — a literal root-only reading reports a false failure.
  const dir = project('4. Load from `_guidelines/`: `05-stack-guides/mui/mui-rtl-bidirectional.md`', {
    before: { '_guidelines/05-stack-guides/mui/mui-rtl-bidirectional.md': '# RTL\n' },
  });
  const report = examine(dir);
  assert.equal(report.failure, false);
  assert.ok(report.mirror.includes('05-stack-guides/mui/mui-rtl-bidirectional.md'), 'the list item resolves under the mirror');
});

test('a bare filename is warned, never failed or guessed', () => {
  const dir = project('Load `ux-design-principles.md` before UI work', {
    before: { '_guidelines/02-engineering-practices/ux-design-principles.md': '# UX\n' },
  });
  const report = examine(dir);
  assert.equal(report.failure, false, 'a name with no directory cannot be proven broken');
  assert.deepEqual(report.bare, ['ux-design-principles.md']);
});

test('an absolute path outside the repository is warned, not failed', () => {
  const dir = project('Read `D:/WebApps/global-guidelines-for-a-vibe-coder/WORLD.md` first');
  const report = examine(dir);
  assert.equal(report.failure, false, 'a deliberate sibling-repo reference is the owner\'s call');
  assert.deepEqual(report.external, ['D:/WebApps/global-guidelines-for-a-vibe-coder/WORLD.md']);
});

test('a project without the section, or without a repository, is not a failure', () => {
  const noSection = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-paths-nosection-'));
  fs.writeFileSync(path.join(noSection, 'AGENTS.md'), '# Agents\n\n## Stack\n\n- Node\n');
  assert.equal(examine(noSection).state, 'no-bootstrap');
  assert.equal(examine(noSection).failure, false);

  const noAgents = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-paths-noagents-'));
  assert.equal(examine(noAgents).state, 'no-agents');

  const notRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-paths-nogit-'));
  fs.writeFileSync(path.join(notRepo, 'AGENTS.md'), AGENTS('Read `docs/PRD.md`'));
  const report = examine(notRepo);
  assert.equal(report.state, 'not-a-repo');
  assert.equal(report.failure, false, 'tracked-ness cannot be judged without git');
});

test('classify is a pure decision — the buckets are the control', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-paths-classify-'));
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'PRD.md'), '# PRD\n');
  fs.writeFileSync(path.join(root, 'notes.md'), '# Notes\n');
  fs.mkdirSync(path.join(root, '_guidelines'), { recursive: true });
  fs.writeFileSync(path.join(root, '_guidelines', 'shared.md'), '# Shared\n');
  const tracked = new Set(['docs/PRD.md']);

  assert.equal(classify('docs/PRD.md', root, tracked).kind, 'ok');
  assert.equal(classify('notes.md', root, tracked).kind, 'untracked');
  assert.equal(classify('_guidelines/shared.md', root, tracked).kind, 'mirror');
  assert.equal(classify('_skills/gone.md', root, tracked).kind, 'mirror-absent');
  assert.equal(classify('shared.md', root, tracked).kind, 'mirror', 'resolved under the mirror');
  assert.equal(classify('a/b.md', root, tracked).kind, 'missing');
  assert.equal(classify('C:/elsewhere/x.md', root, tracked).kind, 'external');
});

test('the guard is green on the fleet it ships for', () => {
  // Non-vacuity in the other direction: a guard that fires on healthy projects gets deleted. The
  // registry is the central repo's own fleet, and every failure here is a real broken instruction.
  const result = runSync(process.execPath, [SCRIPT, '--json'], { cwd: REPO_ROOT });
  const reports = JSON.parse(result.stdout);
  assert.ok(reports.length > 0, 'the registry must resolve to projects');
  const failed = reports.filter((r) => r.failure);
  assert.deepEqual(failed.map((r) => ({ root: r.root, missing: r.missing, untracked: r.untracked })), []);
  assert.equal(result.status, 0);
});
