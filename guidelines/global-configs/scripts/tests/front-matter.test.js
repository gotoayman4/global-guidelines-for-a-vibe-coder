/**
 * tests/front-matter.test.js — the quoted-scalar contract of the corpus's one front-matter reader.
 *
 * WHY THIS FILE EXISTS. `lib/front-matter.js` docblock names the failure it was written to prevent —
 * "one accepts a quoted scalar the other returns with the quotes still attached, and the difference
 * surfaces as a table cell nobody can explain" — and nothing asserted it. The defect it did NOT
 * anticipate: a YAML double-quoted scalar carries escaped quotes (`\"`), and stripping the outer
 * quotes leaves the backslashes inside. A skill whose `description` quotes its own trigger words
 * therefore reaches every generated table with `\"…\"` in it — measured in GAMS's `AGENTS.md`
 * `## Skills` block, delivered by the sync, in a row no project can edit.
 *
 * BEHAVIOURAL ONLY. Inputs to outputs, no inspection of the parser's internals: `scalarValue` is
 * deliberately not exported, so the contract is what `parseFrontMatter` returns.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');

const { parseFrontMatter, meta } = require('../lib/front-matter.js');

/** A front-matter block around one `key: value` line. */
const doc = (line) => `---\nname: demo\n${line}\nmetadata:\n  status: Advisory\n---\n\n# Body\n`;

test('an unquoted scalar passes through', () => {
  assert.equal(parseFrontMatter(doc('description: plain text')).description, 'plain text');
});

test('a single-quoted scalar loses its quotes', () => {
  assert.equal(parseFrontMatter(doc("description: 'quoted text'")).description, 'quoted text');
});

test('a double-quoted scalar loses its quotes', () => {
  assert.equal(parseFrontMatter(doc('description: "quoted text"')).description, 'quoted text');
});

test('REVERSAL PROOF: escaped quotes inside a double-quoted scalar are UNESCAPED', () => {
  // The shape the Agent Skills front-matter actually carries: Triggers on "x", "y".
  const fm = parseFrontMatter(doc('description: ' + '"Activate when X. Triggers on \\"popup\\", \\"window\\"."'));
  assert.equal(
    fm.description,
    'Activate when X. Triggers on "popup", "window".',
    'a generated table cell must not carry backslashes the author never wrote'
  );
});

test('REVERSAL PROOF: an escaped backslash becomes one backslash', () => {
  assert.equal(parseFrontMatter(doc('description: "C:\\\\temp"')).description, 'C:\\temp');
});

test('an escape the parser does not claim stays literal — narrow scope, never a guess', () => {
  // YAML double-quoted scalars have a larger escape set. This corpus uses none of it, and a parser
  // that invents meaning for `\t` would be worse than one that reports the author's own bytes.
  assert.equal(parseFrontMatter(doc('description: "tab\\there"')).description, 'tab\\there');
});

test('an inline sequence is still a list, quoted or not', () => {
  assert.deepEqual(parseFrontMatter(doc('tags: [a, b]')).tags, ['a', 'b']);
});

test('meta() reads the nested metadata map and falls back to the top level', () => {
  const fm = parseFrontMatter(doc('description: "d"'));
  assert.equal(meta(fm, 'status'), 'Advisory', 'under metadata:');
  assert.equal(meta(fm, 'description'), 'd', 'at the top level');
  assert.equal(meta(fm, 'nope'), undefined, 'and nothing invented');
});
