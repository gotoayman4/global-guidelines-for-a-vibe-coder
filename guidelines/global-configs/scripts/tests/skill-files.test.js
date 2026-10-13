const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { SKILL_FILE, SKILL_EXT, listSkills, skillName, isSkillPath } = require('../lib/skill-files.js');

/**
 * A skills directory built from a spec, so a test can express both layouts and the files that must
 * be ignored. `standard` writes `<name>/SKILL.md`, `legacy` writes `<name>.skill.md`, and `stray`
 * writes an arbitrary relative path verbatim — the INDEX.md and a `references/` file that must never
 * be mistaken for a skill.
 */
function skillsDir({ standard = [], legacy = [], stray = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-files-'));
  for (const name of standard) {
    fs.mkdirSync(path.join(dir, name));
    fs.writeFileSync(path.join(dir, name, SKILL_FILE), `---\nname: ${name}\ndescription: d\n---\n`);
  }
  for (const name of legacy) {
    fs.writeFileSync(path.join(dir, `${name}${SKILL_EXT}`), `---\nname: ${name}\ndescription: d\n---\n`);
  }
  for (const [rel, body] of Object.entries(stray)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return dir;
}

test('listSkills reads the Agent Skills standard layout and reports name, file and abs', () => {
  const dir = skillsDir({ standard: ['beta', 'alpha'] });
  const rows = listSkills(dir);
  assert.deepEqual(rows.map((r) => r.name), ['alpha', 'beta'], 'sorted by name');
  assert.deepEqual(rows.map((r) => r.file), ['alpha/SKILL.md', 'beta/SKILL.md']);
  assert.ok(rows.every((r) => r.abs === path.join(dir, r.file)), 'abs is the resolvable path');
});

test('listSkills reads the legacy flat layout — the transition is tolerated, not supported', () => {
  const dir = skillsDir({ legacy: ['alpha'] });
  const rows = listSkills(dir);
  assert.deepEqual(rows.map((r) => r.name), ['alpha']);
  assert.deepEqual(rows.map((r) => r.file), ['alpha.skill.md']);
});

test('listSkills merges both layouts without double-counting a name', () => {
  // A half-migrated directory is the real intermediate state: `alpha/` written, `beta.skill.md` not
  // yet re-synced. Both must be visible; neither name may appear twice.
  const dir = skillsDir({ standard: ['alpha'], legacy: ['beta'] });
  const rows = listSkills(dir);
  assert.deepEqual(rows.map((r) => r.name), ['alpha', 'beta']);
  assert.equal(new Set(rows.map((r) => r.name)).size, rows.length, 'no duplicated name');
});

test('listSkills ignores a directory with no SKILL.md, a stray .md, and a nested reference', () => {
  // The defects this closes: `INDEX.md` at the skills root, a `notaskill/` directory that is not a
  // skill, and a skill's own `references/*.md` — none of which is a loadable skill.
  const dir = skillsDir({
    standard: ['alpha'],
    stray: {
      'INDEX.md': '# index\n',
      'notaskill/notes.md': 'no SKILL.md here\n',
      'alpha/references/guard-snippet.md': 'bundled, not a skill\n',
    },
  });
  assert.deepEqual(listSkills(dir).map((r) => r.file), ['alpha/SKILL.md']);
});

test('listSkills returns an empty list for a directory that does not exist', () => {
  // A missing skills tree is "nothing to read", never a throw — the callers decide whether that is
  // vacuous. Asserted because a throw here would surface as a crash in every reader at once.
  assert.deepEqual(listSkills(path.join(os.tmpdir(), 'definitely-absent-skills-dir-xyz')), []);
});

test('skillName derives the name from both layouts', () => {
  assert.equal(skillName(path.join('x', 'alpha', SKILL_FILE)), 'alpha');
  assert.equal(skillName(path.join('x', `beta${SKILL_EXT}`)), 'beta');
  assert.equal(skillName(path.join('x', 'other.md')), 'other.md', 'an unknown shape is reported as-is, not guessed');
});

test('isSkillPath accepts only the two skill shapes', () => {
  assert.equal(isSkillPath(SKILL_FILE), true, 'a bare SKILL.md (the skills root itself)');
  assert.equal(isSkillPath('alpha/SKILL.md'), true);
  assert.equal(isSkillPath('alpha.skill.md'), true);
  assert.equal(isSkillPath('INDEX.md'), false, 'the generated index is not a skill');
  assert.equal(isSkillPath('alpha/references/x.md'), false, 'a bundled reference is not a skill');
  assert.equal(isSkillPath('alpha/README.md'), false);
});
