const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/read-mode.js');
const { parseMode, readMode, deriveMode, MODES } = require('../lib/project-mode.js');

/** A project directory carrying a `WORLD.md` with the given text. */
function makeWorld(text) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-mode-'));
  fs.writeFileSync(path.join(dir, 'WORLD.md'), text, 'utf8');
  return dir;
}

/** The canonical declaration shape the reader accepts. */
const canonical = (mode) => `# WORLD\n\n## Speed Mode\n\n- **mode:** \`${mode}\` — \`vibe | standard | guarded\`\n\n## What This Project Is\n\nText.\n`;

test('the canonical declaration shape is accepted — a reader that matches nothing proves nothing', () => {
  for (const mode of MODES) {
    assert.equal(parseMode(canonical(mode)), mode);
  }
});

test('a mode line OUTSIDE §Speed Mode is not a declaration', () => {
  const text = `# WORLD\n\n- **mode:** \`vibe\`\n\n## What This Project Is\n\nText.\n`;
  assert.equal(parseMode(text), null);
  const answer = readMode(makeWorld(text));
  assert.equal(answer.declared, false);
  assert.match(answer.reason, /outside §Speed Mode/);
});

test('a mode line inside §Speed Mode but AFTER the section ends is not a declaration', () => {
  const text = `# WORLD\n\n## Speed Mode\n\n- **Set:** a date.\n\n## Notes\n\n- **mode:** \`vibe\`\n`;
  assert.equal(parseMode(text), null);
});

test('an unbackticked value is prose, not a declaration', () => {
  const text = `# WORLD\n\n## Speed Mode\n\n- **mode:** vibe is the fast track\n`;
  assert.equal(parseMode(text), null);
});

test('a `- **Transition mode:**` line is not a declaration', () => {
  const text = `# WORLD\n\n## Speed Mode\n\n- **Transition mode:** \`standard\`\n`;
  assert.equal(parseMode(text), null);
});

test('a value outside the three modes is not a declaration', () => {
  const text = `# WORLD\n\n## Speed Mode\n\n- **mode:** \`turbo\`\n`;
  assert.equal(parseMode(text), null);
});

test('deriveMode falls back to standard when nothing is declared — never to the loosest tier', () => {
  assert.equal(deriveMode(makeWorld('# WORLD\n\nNo mode here.\n')), 'standard');
  assert.equal(deriveMode(makeWorld(canonical('vibe'))), 'vibe');
});

test('readMode reports an absent WORLD.md as undeclared, with a reason', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-mode-'));
  const answer = readMode(dir);
  assert.equal(answer.declared, false);
  assert.equal(answer.mode, null);
  assert.match(answer.reason, /WORLD\.md is absent/);
});

test('the CLI prints the mode and exits 0 when one is declared', () => {
  const dir = makeWorld(canonical('guarded'));
  const result = runSync(process.execPath, [SCRIPT, dir], { cwd: REPO_ROOT });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'guarded');
});

test('the CLI exits 2 with a reason when nothing is declared — the caller must fail safe', () => {
  const dir = makeWorld('# WORLD\n\nNo mode here.\n');
  const result = runSync(process.execPath, [SCRIPT, dir], { cwd: REPO_ROOT });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /fail safe/);
});

test('the CLI reports a mode-shaped line in the wrong place, so the fix is findable', () => {
  const dir = makeWorld('# WORLD\n\n- **mode:** `vibe`\n');
  const result = runSync(process.execPath, [SCRIPT, dir], { cwd: REPO_ROOT });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /outside §Speed Mode/);
});
