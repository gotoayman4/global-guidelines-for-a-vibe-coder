const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

// collect() resolves template paths against the guidelines/ root (the script's REPO_ROOT).
const GUIDELINES_ROOT = path.resolve(__dirname, '../../..');
const SCRIPT = path.join(GUIDELINES_ROOT, 'global-configs/scripts/check-doc-census.js');
const { census, collect, namesGuards, docSetShape, MANDATED_DOCS } = require('../check-doc-census.js');

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

test('an absent on-demand doc is skipped, not failed as a vacuous fact', () => {
  // docs/AI_ARCHITECTURE.md is part of the set only when the project carries it. A project that
  // does not have one must not fail the census for the document it never wrote.
  const docs = CLEAN.filter((d) => d.file !== 'docs/AI_ARCHITECTURE.md');
  const { violations, vacuous, skipped } = census(docs, { missing: ['docs/AI_ARCHITECTURE.md'] });
  assert.deepEqual(violations, []);
  assert.deepEqual(vacuous, []);
  assert.ok(skipped.some((line) => line.includes('how-to-change-safely')), 'the skip must be named');
});

test('the census corpus is the mandated doc set — tool configs are mirrors, not homes', () => {
  const files = MANDATED_DOCS.map((d) => d.installed);
  assert.deepEqual(files, ['AGENTS.md', 'WORLD.md', 'README.md', 'docs/AI_ARCHITECTURE.md']);
  assert.ok(!files.includes('DEVTOOLS.md'));
  assert.ok(!files.includes('.github/copilot-instructions.md'));
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
  docs.find((d) => d.file === 'AGENTS.md').content += `\n${guardRow(['guard:mode', 'guard:tiers'])}\n`;
  docs.find((d) => d.file === 'README.md').content += `\n${guardRow(['guard:mode', 'guard:tiers'])}\n`;
  const { violations } = census(docs);
  assert.equal(violations.length, 1, JSON.stringify(violations));
  assert.match(violations[0], /guard-inventory/);
  assert.match(violations[0], /README\.md/);
});

test('one incidental mention is not an inventory', () => {
  // The threshold is the point: a single command quoted in a sentence is prose, and failing it
  // would fail correct documentation.
  const docs = CLEAN.map((d) => ({ ...d }));
  docs.find((d) => d.file === 'AGENTS.md').content += `\nSee \`npm run guard:mode\`.\n`;
  docs.find((d) => d.file === 'README.md').content += `\nSee \`npm run guard:mode\`.\n`;
  const { violations } = census(docs);
  assert.equal(violations.filter((v) => v.includes('guard-inventory')).length, 0);
});

test('the inventory matcher counts distinct scripts, not occurrences', () => {
  assert.equal(namesGuards('`npm run guard:mode` then `guard:mode` again'), false);
  assert.equal(namesGuards('`npm run guard:mode` and `npm run guard:tiers`'), true);
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

// ─── The doc set's shape — one archive per quarter, and no resurrected document ───

/**
 * A project whose mandated doc set is clean, so a shape fixture fails for the shape reason and
 * not for a missing or duplicated fact.
 */
function project(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'census-'));
  const docs = {
    'AGENTS.md': '# AGENTS\n\n### Stack\n\n### Build & Validation Commands\n\n### Forbidden Patterns\n',
    'WORLD.md': '# WORLD\n\n## What This Project Is\n',
    'README.md': '# README\n\nThe command list lives in AGENTS.md §Build & Validation Commands.\n',
    'docs/AI_ARCHITECTURE.md': '# AI_ARCHITECTURE\n\n## How to Change Safely\n',
    ...files,
  };
  for (const [rel, body] of Object.entries(docs)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return dir;
}

function cli(dir) {
  return runSync(process.execPath, [SCRIPT, dir], { cwd: GUIDELINES_ROOT });
}

test('REVERSAL PROOF: a resurrected doc FAILS the shape check', () => {
  // `docs/AI_CONTEXT.md` was deleted because it was a compressed second copy of facts README.md
  // and AGENTS.md already owned — and it was always loaded, so it taxed every session twice.
  const dir = project({ 'docs/AI_CONTEXT.md': '# AI Context\n' });
  const { violations } = docSetShape(dir);
  assert.equal(violations.length, 1, JSON.stringify(violations));
  assert.match(violations[0], /AI_CONTEXT\.md/);
  assert.match(violations[0], /resurrected/);
});

test('a resurrection is a resurrection wherever it lands', () => {
  const dir = project({ 'docs/deep/nested/ARCHITECTURE_INDEX.md': '# Index\n' });
  const { violations } = docSetShape(dir);
  assert.equal(violations.length, 1, JSON.stringify(violations));
  assert.match(violations[0], /ARCHITECTURE_INDEX\.md/);
});

test('a starter template named after a deleted doc is the same resurrection', () => {
  // The sync delivers the starter to every project, so a template carrying a deleted name ships
  // the resurrection downstream — the central repo's copy of the defect.
  const dir = project({ 'global-configs/templates/AI_CONTEXT.starter.md': '# AI Context\n' });
  const { violations } = docSetShape(dir);
  assert.equal(violations.length, 1, JSON.stringify(violations));
  assert.match(violations[0], /AI_CONTEXT/);
});

test('the sync tool\'s backup folders do not trip the resurrection rule', () => {
  // `.guidelines-backups/` holds a copy of everything that ever shipped. Failing it would report
  // every project that was ever synced, for a file the project cannot act on.
  const dir = project({ '.guidelines-backups/2026-09-06/ARCHITECTURE_INDEX.md': '# Index\n' });
  const { violations } = docSetShape(dir);
  assert.deepEqual(violations, [], JSON.stringify(violations));
});

test('REVERSAL PROOF: a per-document archive FAILS the shape check', () => {
  // One event written once per document is the "one canonical copy" violation the doctrine
  // outlaws for rules, applied to events. The archive is named for the quarter, not the document.
  const dir = project({ 'docs/changelog/prd-2026-Q4.md': '# PRD 2026 Q4\n' });
  const { violations } = docSetShape(dir);
  assert.equal(violations.length, 1, JSON.stringify(violations));
  assert.match(violations[0], /per-document archive/);
  assert.match(violations[0], /docs\/changelog\/2026-Q4\.md/, 'the merge target must be named');
});

test('a quarterly archive is the shape the doctrine asks for', () => {
  const dir = project({ 'docs/changelog/2026-Q4.md': '# 2026 Q4\n' });
  const { violations, notes } = docSetShape(dir);
  assert.deepEqual(violations, [], JSON.stringify(violations));
  assert.deepEqual(notes, [], JSON.stringify(notes));
});

test('two archives for one quarter FAIL — one archive per quarter', () => {
  const dir = project({
    'docs/changelog/2026-Q4.md': '# 2026 Q4\n',
    'docs/changelog/roadmap-2026-Q4.md': '# Roadmap 2026 Q4\n',
  });
  const { violations } = docSetShape(dir);
  assert.ok(violations.length >= 2, JSON.stringify(violations));
  assert.ok(violations.some((v) => /one archive per quarter/.test(v)), JSON.stringify(violations));
});

test('a file in the archive folder with no quarter is reported, never failed', () => {
  // An explanatory README is legitimate. A guard that fails a correct project gets deleted.
  const dir = project({ 'docs/changelog/README.md': '# How the archive works\n' });
  const { violations, notes } = docSetShape(dir);
  assert.deepEqual(violations, [], JSON.stringify(violations));
  assert.ok(notes.some((line) => /carries no quarter/.test(line)), JSON.stringify(notes));
});

test('the central repo\'s own doc set has the right shape', () => {
  // Non-vacuity: the shape check must be able to see a clean corpus, and the repo that ships the
  // templates must not carry the resurrections it deleted.
  const { violations, notes } = docSetShape(GUIDELINES_ROOT);
  assert.deepEqual(violations, [], JSON.stringify(violations));
  assert.deepEqual(notes, [], JSON.stringify(notes));
});

test('the CLI exits 1 on a shape violation and 0 on a clean project', () => {
  const bad = project({ 'docs/AI_CONTEXT.md': '# AI Context\n' });
  assert.equal(cli(bad).status, 1, 'a resurrection is a failing exit');

  const good = project({ 'docs/changelog/2026-Q4.md': '# 2026 Q4\n' });
  assert.equal(cli(good).status, 0, 'a clean project passes');
});
