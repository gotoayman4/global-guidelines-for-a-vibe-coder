const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');

// collect() resolves template paths against the guidelines/ root (the script's REPO_ROOT).
const GUIDELINES_ROOT = path.resolve(__dirname, '../../..');
const { census, collect, MANDATED_DOCS } = require('../check-doc-census.js');

const CLEAN = [
  { file: 'AGENTS.md', content: '# AGENTS\n\n### Stack (Pin exact versions — do NOT use ranges)\n\n### Build & Validation Commands\n\n### Forbidden Patterns Quick Scan\n' },
  { file: 'WORLD.md', content: '# WORLD\n\n## What This Project Is\n' },
  { file: 'README.md', content: '# README\n\nThe command list lives in AGENTS.md §Build & Validation Commands.\n' },
  { file: 'docs/AI_ARCHITECTURE.md', content: '# AI_ARCHITECTURE\n\n## How to Change Safely\n' },
];

test('a clean corpus has one home per fact', () => {
  const { violations, vacuous } = census(CLEAN);
  assert.deepEqual(violations, []);
  assert.deepEqual(vacuous, []);
});

test('a cross-reference is a link, not a copy — it does not trip the census', () => {
  const docs = CLEAN.map((d) => ({ ...d }));
  // README mentions the block by name and section, but has no heading of its own.
  assert.match(docs.find((d) => d.file === 'README.md').content, /§Build & Validation Commands/);
  const { violations } = census(docs);
  assert.equal(violations.filter((v) => v.includes('commands-block')).length, 0);
});

test('a duplicated fact FAILS the census', () => {
  const docs = CLEAN.map((d) => ({ ...d }));
  docs.find((d) => d.file === 'README.md').content += '\n### Stack (Pin exact versions — do NOT use ranges)\n';
  const { violations } = census(docs);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /stack-table/);
  assert.match(violations[0], /README\.md/);
});

test('a fact missing from its own home is reported as vacuous, never a silent pass', () => {
  const docs = CLEAN
    .filter((d) => d.file !== 'docs/AI_ARCHITECTURE.md')
    .concat({ file: 'docs/AI_ARCHITECTURE.md', content: '# AI_ARCHITECTURE\n\n## Subsystems\n' });
  const { vacuous } = census(docs);
  assert.equal(vacuous.length, 1);
  assert.match(vacuous[0], /how-to-change-safely/);
});

test('the repo\'s own templates satisfy the census', () => {
  const { docs, missing } = collect(GUIDELINES_ROOT, true);
  assert.deepEqual(missing, [], 'every mandated template must exist');
  assert.equal(docs.length, MANDATED_DOCS.length, 'every mandated doc is present');
  const { violations, vacuous } = census(docs);
  assert.deepEqual(violations, []);
  assert.deepEqual(vacuous, []);
});
