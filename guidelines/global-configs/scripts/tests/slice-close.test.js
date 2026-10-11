const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/slice-close.js');
const { quarterFile, nextDecision, deriveMode, updateFreshness, wrap } = require('../slice-close.js');

const today = () => new Date().toISOString().split('T')[0];

/** A minimal project: a constitution carrying decisions, and a WORLD.md declaring a mode. */
function makeProject({ agents = '# AGENTS\n\nSee D7 for the last decision.\n', world = '# WORLD\n\n- **mode:** `vibe`\n' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice-close-'));
  if (agents !== null) fs.writeFileSync(path.join(dir, 'AGENTS.md'), agents, 'utf8');
  if (world !== null) fs.writeFileSync(path.join(dir, 'WORLD.md'), world, 'utf8');
  return dir;
}

function run(args, cwd = REPO_ROOT) {
  return runSync(process.execPath, [SCRIPT, ...args], { cwd });
}

test('quarterFile maps a date to its calendar quarter', () => {
  assert.equal(quarterFile('2026-01-15'), 'docs/changelog/2026-Q1.md');
  assert.equal(quarterFile('2026-03-31'), 'docs/changelog/2026-Q1.md');
  assert.equal(quarterFile('2026-04-01'), 'docs/changelog/2026-Q2.md');
  assert.equal(quarterFile('2026-10-11'), 'docs/changelog/2026-Q4.md');
  assert.equal(quarterFile('2026-12-31'), 'docs/changelog/2026-Q4.md');
});

test('nextDecision is max(existing) + 1, not a counter', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD4 and D19 and D7 — out of order on purpose.\n' });
  assert.equal(nextDecision(dir, []), 20, 'the highest number wins, not the last written');
});

test('nextDecision returns 1 for a project with no decisions yet', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nNo decisions here.\n' });
  assert.equal(nextDecision(dir, []), 1);
});

test('nextDecision also reads decisions already in the archive', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD3.\n' });
  assert.equal(nextDecision(dir, [{ rel: 'docs/changelog/2026-Q4.md', content: '### x — D41 · later\n' }]), 42);
});

test('deriveMode reads WORLD.md and defaults to standard when silent', () => {
  assert.equal(deriveMode(makeProject({ world: '# WORLD\n\n- **mode:** `guarded`\n' })), 'guarded');
  assert.equal(deriveMode(makeProject({ world: '# WORLD\n\nNo mode declared.\n' })), 'standard');
  assert.equal(deriveMode(makeProject({ world: null })), 'standard');
});

test('updateFreshness rewrites the line in place and leaves the rest alone', () => {
  const content = '# WORLD\n\n**Last Updated:** 2020-01-01 | **Commit:** aaa | **Change:** old\n\nBody stays.\n';
  const { content: after, changed } = updateFreshness(content, '2026-10-11', 'bbb', 'new note');
  assert.equal(changed, true);
  assert.match(after, /\*\*Last Updated:\*\* 2026-10-11 \| \*\*Commit:\*\* bbb \| \*\*Change:\*\* new note/);
  assert.ok(!after.includes('old'));
  assert.match(after, /Body stays\./);
});

test('updateFreshness reports unchanged when the doc has no freshness line', () => {
  const content = '# WORLD\n\nNo marker.\n';
  const { content: after, changed } = updateFreshness(content, '2026-10-11', 'bbb', 'note');
  assert.equal(changed, false);
  assert.equal(after, content, 'a missing marker is never added silently');
});

test('wrap keeps every word and never exceeds the width', () => {
  const text = Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ');
  const lines = wrap(text, 400).split('\n');
  assert.ok(lines.length > 1, 'a 700-char bullet is wrapped');
  for (const l of lines) assert.ok(l.length <= 400, `line over 400 chars: ${l.length}`);
  assert.equal(lines.join(' '), text, 'wrapping is byte-preserving at word boundaries');
});

test('CLI closes a slice: writes the quarter archive and derives the decision number', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD7 is the last one.\n' });
  const result = run([dir, '--title', 'the first slice', '--sha', 'abc1234', '--doc', 'AGENTS.md', '--receipt', 'docs/gate-receipts/x.md']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /D8 \(derived/);

  const archive = path.join(dir, quarterFile(today()));
  assert.ok(fs.existsSync(archive), 'the quarter archive is created');
  const body = fs.readFileSync(archive, 'utf8');
  assert.match(body, new RegExp(`### ${today()} — D8 · the first slice`));
  assert.match(body, /\*\*Mode:\*\* vibe/, 'the mode comes from WORLD.md when not given');
  assert.match(body, /\*\*Commit:\*\* `abc1234`/);
  assert.match(body, /\*\*Doc:\*\* `AGENTS\.md`/);
  assert.match(body, /\*\*Receipt:\*\* `docs\/gate-receipts\/x\.md`/);
  assert.match(body, /- \*\*Mode:/, 'the entry is a bullet, one line per fact');
});

test('CLI derives the NEXT number on a second run — the archive is read back, not a counter incremented', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD7 is the last one.\n' });
  const first = run([dir, '--title', 'first', '--sha', 'aaa']);
  assert.equal(first.status, 0);
  assert.match(first.stdout, /D8 \(derived/);

  const second = run([dir, '--title', 'second', '--sha', 'bbb']);
  assert.equal(second.status, 0);
  assert.match(second.stdout, /D9 \(derived/, 'run 1 wrote D8 into the archive; run 2 must see it and return D9');

  const body = fs.readFileSync(path.join(dir, quarterFile(today())), 'utf8');
  assert.match(body, /· first/);
  assert.match(body, /· second/, 'entries append — the archive is never rewritten');
});

test('CLI updates the freshness line when the doc carries one, and only then', () => {
  const dir = makeProject({
    world: '# WORLD\n\n- **mode:** `standard`\n\n**Last Updated:** 2020-01-01 | **Commit:** aaa | **Change:** old\n',
  });
  run([dir, '--title', 'freshness moves', '--sha', 'ccc']);
  const world = fs.readFileSync(path.join(dir, 'WORLD.md'), 'utf8');
  assert.match(world, new RegExp(`\\*\\*Last Updated:\\*\\* ${today()} \\| \\*\\*Commit:\\*\\* ccc`));
  assert.match(world, /\*\*Change:\*\* freshness moves/);
});

test('CLI --dry-run reports the plan and writes nothing', () => {
  const dir = makeProject();
  const before = fs.readdirSync(dir).sort();
  const result = run([dir, '--title', 'planned', '--dry-run']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /dry-run: nothing written/);
  assert.deepEqual(fs.readdirSync(dir).sort(), before, 'no archive, no rewrite');
});

test('CLI rejects a missing --title with a usage error', () => {
  const result = run([makeProject()]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--title is required/);
});

test('CLI refuses an empty corpus rather than reporting success over nothing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice-close-empty-'));
  const result = run([dir, '--title', 'nothing here']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /not a project/);
});

test('CLI rejects an unknown mode', () => {
  const result = run([makeProject(), '--title', 'x', '--mode', 'turbo']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--mode must be vibe \| standard \| guarded/);
});
