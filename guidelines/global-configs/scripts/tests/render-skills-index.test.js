const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/render-skills-index.js');
const { collect, renderBlock, replaceRegion, cell, appliesCell, MARKER } = require('../render-skills-index.js');

/**
 * A skills directory in the Agent Skills standard layout (`<name>/SKILL.md`), so the renderer reads
 * the shape the repo actually ships. `legacy: true` writes the flat `<name>.skill.md` instead, to
 * exercise the reader's tolerance for a source that has not been migrated.
 */
function fixture(skills, { legacy = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-index-'));
  const dir = path.join(root, 'skills');
  fs.mkdirSync(dir);
  for (const [name, fm] of Object.entries(skills)) {
    const body = `---\n${fm}\n---\n\n# Skill: ${name}\n`;
    if (legacy) {
      fs.writeFileSync(path.join(dir, `${name}.skill.md`), body);
    } else {
      fs.mkdirSync(path.join(dir, name));
      fs.writeFileSync(path.join(dir, name, 'SKILL.md'), body);
    }
  }
  const index = path.join(dir, 'INDEX.md');
  fs.writeFileSync(index, `# Skill Index\n\n<!-- ${MARKER} — run \`npm run render:skills\` -->\n\n<!-- /GENERATED -->\n`);
  return { root, dir, index };
}

const TWO = {
  alpha: 'name: alpha\ndescription: Activate when the user asks for alpha\nstatus: "Advisory"\nappliesTo: [react]',
  beta: 'name: beta\ndescription: Activate when the user asks for beta\nstatus: "Advisory"',
};

test('collect reads name, trigger, appliesTo and status from each skill front-matter', () => {
  const f = fixture(TWO);
  const rows = collect(f.dir);
  assert.deepEqual(rows.map((r) => r.file), ['alpha/SKILL.md', 'beta/SKILL.md'], 'sorted by name');
  assert.equal(rows[0].name, 'alpha');
  assert.equal(rows[0].trigger, 'Activate when the user asks for alpha');
  assert.deepEqual(rows[0].appliesTo, ['react']);
  assert.equal(rows[1].appliesTo, null, 'an absent appliesTo is null, never invented');
});

test('collect falls back to the filename stem when name is undeclared', () => {
  // Reporting the stem is reporting what a loader would actually register, not guessing an intent.
  const f = fixture({ gamma: 'description: Activate when the user asks for gamma\nstatus: "Advisory"' });
  assert.equal(collect(f.dir)[0].name, 'gamma');
});

test('collect reports a skill with no trigger rather than failing — the audit owns that failure', () => {
  // Two guards failing for one defect is how a report stops being read. The renderer shows the hole.
  const f = fixture({ delta: 'name: delta\nstatus: "Advisory"' });
  const rows = collect(f.dir);
  assert.equal(rows[0].trigger, null);
  assert.match(renderBlock(rows), /no trigger declared/, 'the hole is visible in the rendered table');
});

test('the generated block carries the obligation AND the inventory — they cannot separate', () => {
  // A consumer that emits the block receives the rule and the table together. If the rule lived
  // outside the markers, a project could install the table and lose the rule that gives it meaning.
  const block = renderBlock(collect(fixture(TWO).dir));
  assert.match(block, /announce it in chat as/);
  assert.match(block, /never outranks `AGENTS\.md`/);
  assert.match(block, /\| Skill \| Load when \| Applies to \| Status \|/);
  assert.match(block, /\[alpha\]\(alpha\/SKILL\.md\)/);
});

test('collect reads a legacy flat source too — the reader tolerates the pre-migration layout', () => {
  // The standard layout is what the repo ships, but a project whose `_skills/` has not been re-synced
  // still carries `<name>.skill.md`, and the index must render it rather than report an empty corpus.
  const f = fixture({ alpha: 'name: alpha\ndescription: Activate when the user asks for alpha\nstatus: "Advisory"' }, { legacy: true });
  const rows = collect(f.dir);
  assert.deepEqual(rows.map((r) => r.file), ['alpha.skill.md']);
  assert.equal(rows[0].name, 'alpha');
  assert.match(renderBlock(rows), /\[alpha\]\(alpha\.skill\.md\)/);
});

test('cell escapes a pipe so a trigger cannot break the table', () => {
  const f = fixture({ pipe: 'name: pipe\ndescription: Activate for a | b | c\nstatus: "Advisory"' });
  const block = renderBlock(collect(f.dir));
  assert.match(block, /Activate for a \\\| b \\\| c/);
  // The row must still present exactly four cells: one leading, three separators, one trailing.
  // Counted on UNESCAPED pipes — splitting on `|` would count the escaped ones and prove nothing.
  const row = block.split('\n').find((l) => l.includes('pipe/SKILL.md'));
  assert.equal((row.match(/(?<!\\)\|/g) || []).length, 5, row);
});

test('appliesCell renders a declared stack, and — when none is declared', () => {
  assert.equal(appliesCell(['mui', 'react']), '`mui` `react`');
  assert.equal(appliesCell(null), '—');
  assert.equal(appliesCell([]), '—', 'an empty list is not a declaration');
});

test('replaceRegion returns null when a marker is missing, so a deleted region fails loudly', () => {
  const f = fixture(TWO);
  assert.notEqual(replaceRegion(fs.readFileSync(f.index, 'utf8'), 'X'), null);
  assert.equal(replaceRegion('# no markers here\n', 'X'), null);
});

test('CLI --check exits 0 when in sync and 1 when the index is edited', () => {
  const f = fixture(TWO);
  const run = () => runSync(process.execPath, [SCRIPT, '--check'], {
    cwd: REPO_ROOT,
    env: { ...process.env, SKILLS_INDEX_DIR: f.dir, SKILLS_INDEX_PATH: f.index },
  });

  // The first version of this test asserted the live corpus, which passes only until someone edits
  // it. It is pointed at a fixture for the same reason the sync-drift tests are.
  const render = runSync(process.execPath, [SCRIPT], {
    cwd: REPO_ROOT,
    env: { ...process.env, SKILLS_INDEX_DIR: f.dir, SKILLS_INDEX_PATH: f.index },
  });
  assert.equal(render.status, 0, render.stderr);
  assert.equal(run().status, 0, 'freshly rendered is in sync');

  // REVERSAL PROOF: a hand-edit inside the GENERATED markers is drift.
  const doc = fs.readFileSync(f.index, 'utf8');
  fs.writeFileSync(f.index, doc.replace('Activate when the user asks for alpha', 'Activate whenever'));
  const result = run();
  assert.equal(result.status, 1, 'a hand-edited table MUST fail');
  assert.match(result.stderr, /drifted from the skills/);
});

test('CLI --emit prints the block and writes nothing', () => {
  // The sync consumes this: one renderer produces the block for both this repo and a project's
  // AGENTS.md, so the two cannot disagree.
  const f = fixture(TWO);
  const before = fs.readFileSync(f.index, 'utf8');
  const result = runSync(process.execPath, [SCRIPT, '--emit'], {
    cwd: REPO_ROOT,
    env: { ...process.env, SKILLS_INDEX_DIR: f.dir, SKILLS_INDEX_PATH: f.index },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\| Skill \| Load when \|/);
  assert.equal(fs.readFileSync(f.index, 'utf8'), before, '--emit must not touch the index');
});

test('CLI exits 1 on an empty corpus rather than reporting an empty table as success', () => {
  // Non-vacuity: a renderer over nothing proves nothing, and a green check over an empty set is the
  // failure that outlives everyone who could notice it.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-empty-'));
  const dir = path.join(root, 'skills');
  fs.mkdirSync(dir);
  const result = runSync(process.execPath, [SCRIPT], {
    cwd: REPO_ROOT,
    env: { ...process.env, SKILLS_INDEX_DIR: dir, SKILLS_INDEX_PATH: path.join(dir, 'INDEX.md') },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /corpus is empty/);
});

test('CLI exits 1 when the generated region was deleted rather than silently re-adding it', () => {
  const f = fixture(TWO);
  fs.writeFileSync(f.index, '# Skill Index\n\nno markers at all\n');
  const result = runSync(process.execPath, [SCRIPT], {
    cwd: REPO_ROOT,
    env: { ...process.env, SKILLS_INDEX_DIR: f.dir, SKILLS_INDEX_PATH: f.index },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /marker not found/);
});
