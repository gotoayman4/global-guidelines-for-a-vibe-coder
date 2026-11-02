const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { generate, loadModules, GLOBS } = require('../generate-path-rules.js');

function project(capabilities) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pathrules-'));
  if (capabilities) {
    fs.writeFileSync(path.join(dir, 'WORLD.md'), `## Capabilities\n\n- **capabilities:** \`${capabilities}\`\n`);
  }
  return dir;
}

test('every gated fragment has globs, and every glob entry maps to a gated fragment', () => {
  const mods = loadModules();
  assert.deepEqual(mods.map((m) => m.file).sort(), Object.keys(GLOBS).sort());
});

test('a CLI project (capabilities none) gets no path rule files', () => {
  const dir = project('none');
  generate(dir, { apply: true });
  assert.equal(fs.existsSync(path.join(dir, '.claude')), false);
});

test('an api-only project gets api and the api-gated modules in all three native formats', () => {
  const dir = project('api');
  generate(dir, { apply: true });
  const claude = fs.readFileSync(path.join(dir, '.claude/rules/api.md'), 'utf8');
  assert.match(claude, /^---\npaths:\n/);
  assert.match(claude, /generated:path-rules/);
  assert.doesNotMatch(claude, /→ Source:/);
  assert.match(fs.readFileSync(path.join(dir, '.cursor/rules/api.mdc'), 'utf8'), /globs: .*\*\*\/api\/\*\*/);
  assert.match(fs.readFileSync(path.join(dir, '.github/instructions/api.instructions.md'), 'utf8'), /applyTo: ".*api/);
  assert.equal(fs.existsSync(path.join(dir, '.claude/rules/rtl-arabic.md')), false);
});

test('undeclared capabilities generate every module', () => {
  const dir = project(null);
  generate(dir, { apply: true });
  assert.equal(fs.readdirSync(path.join(dir, '.claude/rules')).length, Object.keys(GLOBS).length);
});

test('dry run writes nothing; a second apply is a no-op', () => {
  const dir = project('api');
  generate(dir);
  assert.equal(fs.existsSync(path.join(dir, '.claude')), false);
  generate(dir, { apply: true });
  assert.ok(generate(dir, { apply: true }).every((a) => a.status === 'up to date'));
});

test('a hand-written rule file is never overwritten or pruned', () => {
  const dir = project('api');
  fs.mkdirSync(path.join(dir, '.claude/rules'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude/rules/api.md'), 'mine\n');
  fs.writeFileSync(path.join(dir, '.claude/rules/custom.md'), 'also mine\n');
  generate(dir, { apply: true });
  assert.equal(fs.readFileSync(path.join(dir, '.claude/rules/api.md'), 'utf8'), 'mine\n');
  assert.equal(fs.readFileSync(path.join(dir, '.claude/rules/custom.md'), 'utf8'), 'also mine\n');
});

test('dropping a capability prunes only the generated files that no longer apply', () => {
  const dir = project('api, web-ui');
  generate(dir, { apply: true });
  assert.ok(fs.existsSync(path.join(dir, '.claude/rules/frontend-architecture.md')));
  fs.writeFileSync(path.join(dir, 'WORLD.md'), '## Capabilities\n\n- **capabilities:** `api`\n');
  generate(dir, { apply: true });
  assert.equal(fs.existsSync(path.join(dir, '.claude/rules/frontend-architecture.md')), false);
  assert.ok(fs.existsSync(path.join(dir, '.claude/rules/api.md')));
});
