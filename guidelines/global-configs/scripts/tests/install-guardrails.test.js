const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { installGuardrails, mergeClaudeSettings } = require('../install-guardrails.js');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'guardrails-'));
}

test('fresh project gets the Claude guard hook and a pre-commit secret scan', () => {
  const dir = tmp();
  installGuardrails(dir);
  const s = JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8'));
  assert.equal(s.hooks.PreToolUse[0].matcher, 'Bash');
  assert.match(s.hooks.PreToolUse[0].hooks[0].command, /guard-command\.js/);
  assert.match(fs.readFileSync(path.join(dir, '.husky', 'pre-commit'), 'utf8'), /scan-secrets\.js/);
});

test('install is idempotent and preserves existing settings', () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, '.claude'));
  fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), JSON.stringify({ permissions: { allow: ['Bash(ls)'] } }));
  installGuardrails(dir);
  const after1 = fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8');
  const second = installGuardrails(dir);
  assert.equal(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8'), after1);
  assert.match(second[0].status, /already present/);
  assert.deepEqual(JSON.parse(after1).permissions.allow, ['Bash(ls)']);
});

test('an existing pre-commit hook and unparseable settings are never modified', () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, '.husky'));
  fs.mkdirSync(path.join(dir, '.claude'));
  fs.writeFileSync(path.join(dir, '.husky', 'pre-commit'), 'npm test\n');
  fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), '{ nope');
  installGuardrails(dir);
  assert.equal(fs.readFileSync(path.join(dir, '.husky', 'pre-commit'), 'utf8'), 'npm test\n');
  assert.equal(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8'), '{ nope');
});

test('dry run writes nothing', () => {
  const dir = tmp();
  installGuardrails(dir, { dryRun: true });
  assert.equal(fs.existsSync(path.join(dir, '.claude')), false);
  assert.equal(fs.existsSync(path.join(dir, '.husky')), false);
});

test('mergeClaudeSettings keeps other PreToolUse hooks', () => {
  const { settings, changed } = mergeClaudeSettings({ hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [] }] } });
  assert.equal(changed, true);
  assert.equal(settings.hooks.PreToolUse.length, 2);
});
