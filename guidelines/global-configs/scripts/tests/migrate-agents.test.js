const assert = require('node:assert/strict');
const { test } = require('node:test');
const { migrate } = require('../migrate-agents-to-managed.js');
const { readCanonicalCore } = require('../inject-constitution-block.js');

const LEGACY = [
  '# Rules', '',
  '## Security (Always Load)', '',
  '- **SQL Injection Prevention.** Old wording.',
  '  → Source: `x.md`',
  '- **Project Secret Rule — project amendment.** Keep this one.', '',
  '## Skills', '', 'skills here', '',
  '## Performance (Load for Performance-Sensitive Features)', '',
  '- **Profile Before Optimizing.** Old.',
  '  → Source: `y.md`',
  '- **Budget — project amendment.** Mine.', '',
  '## Reference & Project Setup', '', '### Stack', '- **Runtime.** Node 22 pinned.', '',
].join('\n');

test('adopts the managed region, drops duplicate tail sections and preserves project rules', () => {
  const r = migrate(LEGACY, readCanonicalCore(undefined, { capabilities: null }));
  assert.equal(r.status, 'migrated');
  assert.match(r.content, /BEGIN generated:constitution-core/);
  assert.equal((r.content.match(/^## Performance/gm) || []).length, 1, 'one Performance section remains');
  assert.match(r.content, /## Project Amendments[\s\S]*Project Secret Rule — project amendment[\s\S]*## Reference & Project Setup/);
  assert.match(r.content, /Budget — project amendment/);
  assert.doesNotMatch(r.content, /Old wording/);
  assert.match(r.content, /Node 22 pinned/, 'project-owned setup is untouched');
  assert.equal(r.amendments, 2);
});

test('an already-managed file is left alone and migration is idempotent', () => {
  const core = readCanonicalCore(undefined, { capabilities: null });
  const once = migrate(LEGACY, core).content;
  const again = migrate(once, core);
  assert.equal(again.status, 'already managed');
  assert.equal(again.content, once);
});

test('CRLF line endings are preserved', () => {
  const r = migrate(LEGACY.replace(/\n/g, '\r\n'), readCanonicalCore(undefined, { capabilities: null }));
  assert.equal(r.content.includes('\r\n'), true);
  assert.equal(/[^\r]\n/.test(r.content), false);
});
