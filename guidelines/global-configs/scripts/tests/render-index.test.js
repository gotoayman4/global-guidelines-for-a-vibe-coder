const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const GUIDELINES_ROOT = path.resolve(__dirname, '../../..');
const INDEX_PATH = path.join(GUIDELINES_ROOT, '_index', 'MASTER_INDEX.md');
const {
  collect, parseFrontMatter, parseCrossRefs, tokensOf, renderIndex, replaceRegion, BEGIN, END,
} = require('../render-index.js');

const readIndex = () => fs.readFileSync(INDEX_PATH, 'utf8');
const region = (doc, id) => doc.split(BEGIN(id))[1].split(END)[0];

test('parseFrontMatter reads scalars and inline tag sequences', () => {
  const fm = parseFrontMatter('---\nstatus: "Advisory"\nscope: "Stack (React)"\ntags: [react, hooks]\n---\n\n# T\n');
  assert.deepEqual(fm, { status: 'Advisory', scope: 'Stack (React)', tags: ['react', 'hooks'] });
});

test('parseFrontMatter returns null when there is no front-matter', () => {
  assert.equal(parseFrontMatter('# Title\n\nbody\n'), null);
});

test('parseCrossRefs reads typed bullets', () => {
  const edges = parseCrossRefs('## Cross-References\n\n- **Depends on:** `a.md`, `b.md`\n- **Applied by:** `c.md`\n');
  assert.deepEqual(edges, [
    { rel: 'depends on', names: ['a.md', 'b.md'] },
    { rel: 'applied by', names: ['c.md'] },
  ]);
});

test('parseCrossRefs falls back to a flat backticked list as "see also"', () => {
  const edges = parseCrossRefs('## Cross-References\n\n`speed-tiered-workflow.md` · `testing-patterns.md`\n');
  assert.deepEqual(edges, [{ rel: 'see also', names: ['speed-tiered-workflow.md', 'testing-patterns.md'] }]);
});

test('tokensOf uses the repo-wide chars/4 convention', () => {
  assert.equal(tokensOf('a'.repeat(400)), 100);
  assert.equal(tokensOf('a'.repeat(401)), 101);
});

test('collect finds all nine categories with a non-empty corpus (non-vacuity)', () => {
  const model = collect();
  assert.equal(model.categories.length, 9, 'all nine domain directories must be present');
  const files = model.categories.reduce((n, c) => n + c.entries.length, 0);
  assert.ok(files >= 60, `expected >=60 category files, got ${files}`);
  assert.equal(model.skills.length, 21, 'all twenty-one skills must be present');
  for (const c of model.categories) {
    assert.ok(c.entries.length > 0, `category ${c.dir} is empty`);
    for (const e of c.entries) {
      assert.ok(e.fm && e.fm.status && e.fm.scope, `${c.dir} entry lacks status/scope front-matter`);
    }
  }
});

test('replaceRegion returns null when the marker is absent (non-vacuity)', () => {
  assert.equal(replaceRegion('# no markers here\n', 'GENERATED:index-tables', 'x'), null);
});

test('rendered regions are non-empty and cover the corpus (non-vacuity)', () => {
  const rendered = renderIndex(readIndex(), collect());

  const tables = region(rendered, 'GENERATED:index-tables');
  assert.match(tables, /### 00 — AI Fundamentals/);
  assert.match(tables, /### 08 — Governance/);
  assert.ok((tables.match(/^\| \[/gm) || []).length >= 60, 'category tables must list every guideline file');

  const skills = region(rendered, 'GENERATED:index-skills');
  assert.equal((skills.match(/\/SKILL\.md\)/g) || []).length, 21, 'every skill must be listed');

  const graph = region(rendered, 'GENERATED:index-graph');
  assert.match(graph, /### 08-governance/);
  assert.ok(!graph.includes('no cross-references') || graph.includes('→'), 'graph must carry edges');
});

test('renderIndex is idempotent on the committed index (already in sync)', () => {
  const once = renderIndex(readIndex(), collect());
  const twice = renderIndex(once, collect());
  assert.equal(twice, once, 'a second render must not change the file');
});

test('a hand-edit inside a marker is detected and normalised away (drift probe)', () => {
  const onDisk = readIndex();
  const canonical = renderIndex(onDisk, collect());
  const mutated = onDisk.replace(
    BEGIN('GENERATED:index-tables'),
    `${BEGIN('GENERATED:index-tables')}\n| [bogus.md](../00-ai-fundamentals/bogus.md) | Normative | Global | ~1 | \`#bogus\` |`,
  );
  assert.notEqual(mutated, canonical, 'the mutation must actually differ from canonical output');
  assert.equal(renderIndex(mutated, collect()), canonical, 'renderIndex must revert any hand-edit inside a marker');
});
