const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');

// collect() resolves template paths against the guidelines/ root (the script's REPO_ROOT).
const GUIDELINES_ROOT = path.resolve(__dirname, '../../..');
const { census, collect, namesGuards, MANDATED_DOCS } = require('../check-doc-census.js');

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
  const { violations, vacuous } = census(docs, { templates: true });
  assert.deepEqual(violations, []);
  assert.deepEqual(vacuous, []);
});

// ─── The guard inventory — the fifth fact, and the only one that is a shape ───

/** A document body that names guards the way a command block does. */
const guardRow = (names) => names.map((name) => `\`npm run ${name}\``).join(', ');

test('REVERSAL PROOF: a second document enumerating the guard set FAILS the census', () => {
  // The inventory's home is the guards themselves (`npm run guard:tiers` derives it). AGENTS.md
  // may name it; a second document naming it is how a hand-kept list comes back.
  const docs = CLEAN.map((d) => ({ ...d }));
  docs.find((d) => d.file === 'AGENTS.md').content += `\n${guardRow(['guard:breadth', 'guard:tiers'])}\n`;
  docs.find((d) => d.file === 'README.md').content += `\n${guardRow(['guard:breadth', 'guard:decisions'])}\n`;
  const { violations } = census(docs);
  assert.equal(violations.length, 1, JSON.stringify(violations));
  assert.match(violations[0], /guard-inventory/);
  assert.match(violations[0], /README\.md/);
});

test('one incidental mention is not an inventory', () => {
  // The threshold is the point: a single command quoted in a sentence is prose, and failing it
  // would fail correct documentation.
  const docs = CLEAN.map((d) => ({ ...d }));
  docs.find((d) => d.file === 'AGENTS.md').content += `\nSee \`npm run guard:breadth\`.\n`;
  docs.find((d) => d.file === 'README.md').content += `\nSee \`npm run guard:breadth\`.\n`;
  const { violations } = census(docs);
  assert.equal(violations.filter((v) => v.includes('guard-inventory')).length, 0);
});

test('the inventory matcher counts distinct scripts, not occurrences', () => {
  assert.equal(namesGuards('`npm run guard:breadth` then `guard:breadth` again'), false);
  assert.equal(namesGuards('`npm run guard:breadth` and `npm run guard:tiers`'), true);
  assert.equal(namesGuards('no guards here'), false);
});

test('the guard inventory is skipped against the template corpus, and the skip is named', () => {
  // The starter ships `[FILL]`s and names no guard, so the fact cannot be non-vacuous there.
  // A silent skip would be indistinguishable from a fact nobody ever wired up.
  const { docs } = collect(GUIDELINES_ROOT, true);
  const { violations, vacuous, skipped, notes } = census(docs, { templates: true });
  assert.deepEqual(violations, []);
  assert.deepEqual(vacuous, []);
  assert.ok(skipped.some((line) => line.includes('guard-inventory')), 'the skip must be named');
  assert.deepEqual(notes, [], 'a skipped fact is not also a note');
});

test('the guard inventory absent from a project is reported, never failed', () => {
  // A project may legitimately name no guard — the commands are `[FILL]`ed or absent. Absence is
  // reported so it is visible; only a SECOND copy fails.
  const { violations, vacuous, notes } = census(CLEAN);
  assert.deepEqual(violations, []);
  assert.deepEqual(vacuous, []);
  assert.ok(notes.some((line) => line.includes('guard-inventory')), 'the absence must be named');
});
