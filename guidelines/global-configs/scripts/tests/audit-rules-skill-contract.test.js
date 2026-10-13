const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const GUIDELINES = path.resolve(__dirname, '../../..');
const { findSkillFiles, skillContract, SKILL_CONTRACT } = require('../audit-rules.js');
const { parseFrontMatter } = require('../lib/front-matter.js');

/** The front-matter of a shipped skill, read the way the audit reads it. */
const frontMatterOf = (rel) => parseFrontMatter(fs.readFileSync(path.join(GUIDELINES, rel), 'utf8'));

test('findSkillFiles derives the corpus from disk, never from a hand-typed list', () => {
  // THE DEFECT THIS REMOVES. The list was 18 literal paths; the directory held 20. Adding
  // `firebase-firestore-practices` and `firestore-cost-optimization` grew the corpus and left the
  // list behind, so two skills were never audited for dangling guideline references while the
  // report said the skills had been checked.
  const files = findSkillFiles();
  assert.ok(files.length >= 20, `expected the whole corpus, got ${files.length}`);
  assert.ok(files.includes('global-configs/skills/firebase-firestore-practices/SKILL.md'), 'the two the list had missed');
  assert.ok(files.includes('global-configs/skills/firestore-cost-optimization/SKILL.md'));
  assert.ok(files.every((f) => f.endsWith('/SKILL.md')), 'the Agent Skills standard layout — and a generated INDEX.md at the skills root is not a skill');
  assert.deepEqual(files, files.slice().sort(), 'a stable order, so the report does not churn');
});

test('skillContract names every required key that is missing', () => {
  assert.deepEqual(skillContract(null), SKILL_CONTRACT, 'no front-matter declares nothing');
  assert.deepEqual(skillContract({ name: 'a', description: 'b' }), []);
  assert.deepEqual(skillContract({ name: 'a' }), ['description']);
  assert.deepEqual(skillContract({ description: 'b' }), ['name']);
});

test('a blank value is missing, not satisfied', () => {
  // `description:` with nothing after it activates nothing, so treating it as satisfied is how a
  // skill ends up permanently unloadable while every check reports green.
  assert.deepEqual(skillContract({ name: 'a', description: '' }), ['description']);
  assert.deepEqual(skillContract({ name: 'a', description: '   ' }), ['description']);
  assert.deepEqual(skillContract({ name: '  ', description: 'b' }), ['name']);
});

test('every shipped skill satisfies the contract', () => {
  const offenders = findSkillFiles()
    .map((rel) => ({ rel, missing: skillContract(frontMatterOf(rel)) }))
    .filter((entry) => entry.missing.length > 0);
  assert.deepEqual(offenders, [], `unloadable skills: ${JSON.stringify(offenders)}`);
});

test('REVERSAL PROOF: the exact regression — a skill with no name and no description', () => {
  // `mui-design-system` (then `mui-design-system.skill.md`) shipped with `status`, `scope` and
  // `tags` and nothing else, so no loader could ever surface it and no index could render its
  // trigger. The mutation below is that file's original front-matter, verbatim.
  const regression = '---\nstatus: "Advisory"\nscope: "Global (Task-Type Skill)"\ntags: [skill, mui, design-system, shared-components]\n---\n';
  assert.deepEqual(skillContract(parseFrontMatter(regression)), ['name', 'description']);
});

test('the corpus read is not vacuous — the front-matter parser finds the keys it is asked for', () => {
  // If the parser stopped matching, the contract would pass over an empty object forever.
  const fm = frontMatterOf('global-configs/skills/code-review/SKILL.md');
  assert.ok(fm, 'the front-matter block was found');
  assert.equal(typeof fm.name, 'string');
  assert.ok(fm.description.length > 10, 'a trigger, not a placeholder');
});
