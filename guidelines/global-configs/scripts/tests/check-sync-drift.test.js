const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/check-sync-drift.js');
const { hashTree, compareProjects, compareSkills, skillsMirror, requiredGuards, controlsOf } = require('../check-sync-drift.js');

/** Build a source tree and N mirrors, so the comparison has something real to read. */
function fixture(mirrorMode) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-drift-'));
  const source = path.join(root, 'guidelines');
  fs.mkdirSync(path.join(source, '01-workflow-methodology'), { recursive: true });
  fs.writeFileSync(path.join(source, '01-workflow-methodology', 'a.md'), '# A\n\nBody.\n');
  fs.writeFileSync(path.join(source, 'README.md'), '# Index\n');

  const project = path.join(root, 'project');
  const mirror = path.join(project, '_guidelines');
  fs.mkdirSync(path.join(mirror, '01-workflow-methodology'), { recursive: true });
  fs.writeFileSync(path.join(mirror, '01-workflow-methodology', 'a.md'), '# A\n\nBody.\n');
  fs.writeFileSync(path.join(mirror, 'README.md'), '# Index\n');

  if (mirrorMode === 'edited') {
    fs.writeFileSync(path.join(mirror, '01-workflow-methodology', 'a.md'), '# A\n\nBody CHANGED.\n');
  } else if (mirrorMode === 'missing') {
    fs.rmSync(mirror, { recursive: true, force: true });
  } else if (mirrorMode === 'extra') {
    fs.writeFileSync(path.join(mirror, 'stale.md'), '# Left behind\n');
  }
  return { root, source, project };
}

test('hashTree is content-addressed: identical trees hash identically', () => {
  const a = fixture('ok');
  const b = fixture('ok');
  assert.equal(hashTree(a.source).hash, hashTree(b.source).hash, 'same content, same hash — no path or time dependence');
  assert.equal(hashTree(a.source).count, 2);
});

test('hashTree normalises line endings so a CRLF checkout is not drift', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-eol-'));
  const lf = path.join(root, 'lf');
  const crlf = path.join(root, 'crlf');
  fs.mkdirSync(lf);
  fs.mkdirSync(crlf);
  fs.writeFileSync(path.join(lf, 'x.md'), '# A\nline two\n');
  fs.writeFileSync(path.join(crlf, 'x.md'), '# A\r\nline two\r\n');
  assert.equal(hashTree(lf).hash, hashTree(crlf).hash);
});

test('hashTree changes when one byte of content changes', () => {
  const ok = fixture('ok');
  const edited = fixture('edited');
  assert.notEqual(hashTree(ok.source).hash, hashTree(edited.project).hash);
});

test('hashTree is path-sensitive: a renamed file is drift, not a no-op', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-rename-'));
  const a = path.join(root, 'a');
  const b = path.join(root, 'b');
  fs.mkdirSync(a);
  fs.mkdirSync(b);
  fs.writeFileSync(path.join(a, 'one.md'), '# Same body\n');
  fs.writeFileSync(path.join(b, 'two.md'), '# Same body\n');
  assert.notEqual(hashTree(a).hash, hashTree(b).hash, 'the path is part of the hash');
});

test('compareProjects reports in-sync, drift, and no-mirror separately', () => {
  const ok = fixture('ok');
  const source = hashTree(ok.source);
  const rows = compareProjects(ok.source, source, [{ name: 'p', path: ok.project }]);
  assert.equal(rows[0].state, 'sync');
  assert.equal(rows[0].recorded, 'never recorded');
});

test('compareProjects flags an edited mirror as drift — the reversal proof', () => {
  const ok = fixture('ok');
  const edited = fixture('edited');
  const rows = compareProjects(ok.source, hashTree(ok.source), [{ name: 'p', path: edited.project }]);
  assert.equal(rows[0].state, 'drift', 'one changed line in the mirror MUST be reported as drift');
  assert.notEqual(rows[0].mirrorHash, hashTree(ok.source).hash);
});

test('compareProjects flags a file left behind in the mirror as drift', () => {
  const ok = fixture('ok');
  const extra = fixture('extra');
  const rows = compareProjects(ok.source, hashTree(ok.source), [{ name: 'p', path: extra.project }]);
  assert.equal(rows[0].state, 'drift', 'an extra file in the mirror is a stale file, not a match');
  assert.equal(rows[0].mirrorFiles, 3);
});

test('compareProjects reports a project with no mirror at all', () => {
  const ok = fixture('ok');
  const missing = fixture('missing');
  const rows = compareProjects(ok.source, hashTree(ok.source), [{ name: 'p', path: missing.project }]);
  assert.equal(rows[0].state, 'no-mirror');
});

test('CLI exits 1 on a drifted fleet and 0 on a synced one', () => {
  // Hermetic: the CLI is pointed at a fixture source + registry via env, never at the live
  // fleet. The first version of this test asserted the live fleet's state ("the finding, not a
  // test bug"), so it passed only while the fleet was broken and failed the moment `sync:all`
  // fixed it. A test whose green depends on the world being wrong is not a test.
  const run = (mirrorMode) => {
    const f = fixture(mirrorMode);
    const registry = path.join(f.root, 'sync-projects.json');
    fs.writeFileSync(registry, JSON.stringify([{ name: 'p', path: f.project }]));
    return runSync(process.execPath, [SCRIPT, '--quiet'], {
      cwd: REPO_ROOT,
      env: { ...process.env, SYNC_DRIFT_SOURCE: f.source, SYNC_DRIFT_REGISTRY: registry },
    });
  };

  assert.equal(run('ok').status, 0, 'a mirror that matches the source is not drift');
  assert.equal(run('edited').status, 1, 'an edited mirror is drift');
  assert.equal(run('extra').status, 1, 'a file left behind in the mirror is drift');
});

test('CLI exits 2 when the registry is unreadable rather than reporting success', () => {
  const result = runSync(process.execPath, [SCRIPT, '--record'], { cwd: REPO_ROOT });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--record requires a project path/);
});

// ─── The skills copy: the artifact that instructs the agent, not the one it consults ─────

const SKILL_BODY = '---\nname: a\ndescription: Activate for a\n---\n';
/** A generated file that lives in the skills directory and that the sync deliberately never copies. */
const NOT_A_SKILL = '# generated index — the sync copies SKILL.md files only, never this\n';

/**
 * A source tree that carries skills, a project whose `_guidelines/` mirror is current, and a
 * `_skills/` directory in the given state. Built so the two verdicts can be told apart: a project
 * can have a current mirror and a stale skills copy, which is the case this pass was added for.
 *
 * BOTH SIDES USE THE STANDARD LAYOUT (`<name>/SKILL.md`), because that is what the sync writes and
 * what the plan expects. A fixture on the legacy flat layout would exercise a shape the fleet no
 * longer produces, and would make the plan-based comparison look like it disagrees with the sync.
 */
function skillsFixture(skillsMode) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-skills-'));
  const source = path.join(root, 'guidelines');
  const sourceSkills = path.join(source, 'global-configs', 'skills');
  fs.mkdirSync(path.join(sourceSkills, 'a'), { recursive: true });
  fs.writeFileSync(path.join(sourceSkills, 'a', 'SKILL.md'), SKILL_BODY);
  fs.writeFileSync(path.join(sourceSkills, 'INDEX.md'), NOT_A_SKILL);

  const project = path.join(root, 'project');
  const mirrorSkills = path.join(project, '_guidelines', 'global-configs', 'skills');
  fs.mkdirSync(path.join(mirrorSkills, 'a'), { recursive: true });
  fs.writeFileSync(path.join(mirrorSkills, 'a', 'SKILL.md'), SKILL_BODY);
  fs.writeFileSync(path.join(mirrorSkills, 'INDEX.md'), NOT_A_SKILL);

  if (skillsMode !== 'missing') {
    const skills = path.join(project, '_skills');
    fs.mkdirSync(path.join(skills, 'a'), { recursive: true });
    fs.writeFileSync(
      path.join(skills, 'a', 'SKILL.md'),
      skillsMode === 'edited' ? SKILL_BODY.replace('Activate for a', 'Activate for something else') : SKILL_BODY
    );
    if (skillsMode === 'extra') {
      fs.mkdirSync(path.join(skills, 'stale'), { recursive: true });
      fs.writeFileSync(path.join(skills, 'stale', 'SKILL.md'), '---\nname: stale\n---\n');
    }
  }

  const manifest = path.join(root, 'sync-manifest.json');
  fs.writeFileSync(manifest, JSON.stringify({
    skills: { source: 'global-configs/skills/*/SKILL.md', target: '_skills' },
  }, null, 2));
  return { root, source, project, manifest };
}

test('hashTree with a glob keeps only the files the sync actually copies', () => {
  const f = skillsFixture('ok');
  const dir = path.join(f.source, 'global-configs', 'skills');
  assert.equal(hashTree(dir).count, 2, 'the directory holds the skill and the generated index');
  assert.equal(hashTree(dir, 'SKILL.md').count, 1, 'only SKILL.md travels to a project');
});

test('skillsMirror derives the target, the source and the glob from the manifest', () => {
  const f = skillsFixture('ok');
  const mirror = skillsMirror(f.source, f.manifest);
  assert.equal(mirror.target, '_skills');
  assert.equal(mirror.glob, 'SKILL.md');
  assert.equal(mirror.count, 1, 'INDEX.md is excluded — counting it would report permanent drift');
});

test('skillsMirror is null when nothing declares skills, or the source has none', () => {
  const f = skillsFixture('ok');
  assert.equal(skillsMirror(f.source, path.join(f.root, 'absent.json')), null, 'no manifest, nothing declared');
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-bare-'));
  assert.equal(skillsMirror(bare, f.manifest), null, 'a repo with no skills tree is not drift');
});

test('skillsMirror derives the directory from a manifest whose glob is a DIRECTORY segment', () => {
  // THE BUG THIS CLOSES. With `skills/*/SKILL.md` the glob star sits in the DIRECTORY segment, and
  // `path.dirname` left it in place — so the source resolved to a literal `skills/*` that exists
  // nowhere, `skillsMirror` returned null, and the entire `_skills/` comparison went silently
  // vacuous for the fleet while the header read "not declared by the manifest". The legacy fixture
  // above never caught it because `*.skill.md` keeps the star in the BASENAME.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-skills-std-'));
  const source = path.join(root, 'guidelines');
  const dir = path.join(source, 'global-configs', 'skills');
  for (const name of ['alpha', 'beta']) {
    fs.mkdirSync(path.join(dir, name), { recursive: true });
    fs.writeFileSync(path.join(dir, name, 'SKILL.md'), SKILL_BODY);
  }
  fs.writeFileSync(path.join(dir, 'INDEX.md'), NOT_A_SKILL);
  const manifest = path.join(root, 'sync-manifest.json');
  fs.writeFileSync(manifest, JSON.stringify({
    skills: { source: 'global-configs/skills/*/SKILL.md', target: '_skills' },
  }));

  const mirror = skillsMirror(source, manifest);
  assert.ok(mirror, 'the standard layout MUST resolve — null here means the control is vacuous');
  assert.equal(mirror.glob, 'SKILL.md');
  assert.equal(mirror.count, 2, 'both SKILL.md files, and not the INDEX.md beside them');
});

test('compareSkills separates sync, drift and a missing directory', () => {
  const ok = skillsFixture('ok');
  assert.equal(compareSkills(ok.project, skillsMirror(ok.source, ok.manifest)).state, 'sync');

  const edited = skillsFixture('edited');
  assert.equal(compareSkills(edited.project, skillsMirror(edited.source, edited.manifest)).state, 'drift');

  const missing = skillsFixture('missing');
  assert.equal(compareSkills(missing.project, skillsMirror(missing.source, missing.manifest)).state, 'no-mirror');

  assert.equal(compareSkills(ok.project, null), null, 'no declaration, no verdict');
});

test('compareSkills compares against the PLAN, not the whole source corpus — the false-drift fix', () => {
  // THE BUG THIS CLOSES. `_skills/` is a FILTERED mirror: the sync writes only the skills that fit
  // the project's stack (12–16 of 20 on the fleet). Comparing its hash to the source's whole-corpus
  // hash reported every project as drifted the moment the filter was applied — while every one of
  // them was correct. The verdict must come from `plan-skills.js`, the one home for the decision.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-skills-filter-'));
  const source = path.join(root, 'guidelines');
  const sourceSkills = path.join(source, 'global-configs', 'skills');
  const AGNOSTIC = '---\nname: always\ndescription: Applies to every project\n---\n';
  const MUI_SKILL = '---\nname: mui-skill\ndescription: For MUI projects\nmetadata:\n  appliesTo: mui\n---\n';
  for (const [name, body] of [['always', AGNOSTIC], ['mui-skill', MUI_SKILL]]) {
    fs.mkdirSync(path.join(sourceSkills, name), { recursive: true });
    fs.writeFileSync(path.join(sourceSkills, name, 'SKILL.md'), body);
  }

  const project = path.join(root, 'project');
  // A Tailwind project: the mui skill does not overlap its stack, so the plan skips it.
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, 'AGENTS.md'), '# p\n\n### Stack\n\n| Tech | Version |\n| --- | --- |\n| Tailwind | 3 |\n');
  fs.mkdirSync(path.join(project, '_skills', 'always'), { recursive: true });
  fs.writeFileSync(path.join(project, '_skills', 'always', 'SKILL.md'), AGNOSTIC);

  const manifest = path.join(root, 'sync-manifest.json');
  fs.writeFileSync(manifest, JSON.stringify({ skills: { source: 'global-configs/skills/*/SKILL.md', target: '_skills' } }));

  const verdict = compareSkills(project, skillsMirror(source, manifest));
  assert.equal(verdict.expectedFiles, 1, 'the plan selects one of the two source skills for this project');
  assert.equal(verdict.mirrorFiles, 1);
  assert.equal(verdict.state, 'sync', 'one of two source skills, matching the plan, is NOT drift');

  // And a planned skill the project does not carry IS drift.
  fs.rmSync(path.join(project, '_skills', 'always'), { recursive: true });
  const missing = compareSkills(project, skillsMirror(source, manifest));
  assert.equal(missing.state, 'drift');
  assert.deepEqual(missing.missing, ['always/SKILL.md']);
});

test('a legacy flat copy in _skills/ is drift — the standard layout is what the sync writes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-skills-legacy-'));
  const source = path.join(root, 'guidelines');
  const sourceSkills = path.join(source, 'global-configs', 'skills');
  fs.mkdirSync(path.join(sourceSkills, 'a'), { recursive: true });
  fs.writeFileSync(path.join(sourceSkills, 'a', 'SKILL.md'), SKILL_BODY);

  const project = path.join(root, 'project');
  fs.mkdirSync(path.join(project, '_skills'), { recursive: true });
  fs.writeFileSync(path.join(project, '_skills', 'a.skill.md'), SKILL_BODY); // the pre-migration shape

  const manifest = path.join(root, 'sync-manifest.json');
  fs.writeFileSync(manifest, JSON.stringify({ skills: { source: 'global-configs/skills/*/SKILL.md', target: '_skills' } }));

  const verdict = compareSkills(project, skillsMirror(source, manifest));
  assert.equal(verdict.state, 'drift', 'a flat file a conformant loader never reads is not the delivered skill');
  assert.deepEqual(verdict.missing, ['a/SKILL.md']);
  assert.deepEqual(verdict.extra, ['a.skill.md']);
});

test('REVERSAL PROOF: a current mirror with a stale skills copy is drift', () => {
  // THE HOLE THIS PASS CLOSES. Before 2026-10-12 the hash covered `_guidelines/` alone, so this
  // project reported "in sync" while the skills its agent was told to load were out of date.
  const f = skillsFixture('edited');
  const rows = compareProjects(f.source, hashTree(f.source), [{ name: 'p', path: f.project }], skillsMirror(f.source, f.manifest));
  assert.equal(rows[0].state, 'sync', 'the guidelines mirror really is current');
  assert.equal(rows[0].skills.state, 'drift', 'and the stale skills copy is caught anyway');
});

test('CLI exits 1 for a stale, missing or left-behind skills copy', () => {
  const run = (skillsMode) => {
    const f = skillsFixture(skillsMode);
    const registry = path.join(f.root, 'sync-projects.json');
    fs.writeFileSync(registry, JSON.stringify([{ name: 'p', path: f.project }]));
    return runSync(process.execPath, [SCRIPT, '--quiet'], {
      cwd: REPO_ROOT,
      env: { ...process.env, SYNC_DRIFT_SOURCE: f.source, SYNC_DRIFT_REGISTRY: registry, SYNC_DRIFT_MANIFEST: f.manifest },
    });
  };
  assert.equal(run('ok').status, 0, 'both artifacts current');
  assert.equal(run('edited').status, 1, 'a skill edited centrally is not the skill the project loads');
  assert.equal(run('missing').status, 1, 'a missing _skills/ means the AGENTS.md pointer resolves to nothing');
  assert.equal(run('extra').status, 1, 'a skill left behind is a stale skill, not a match');
});

// ─── Controls: the mirror answers "has it", this answers "does it run it" ─────

/** A manifest that declares the guard files a project must expose. */
function manifest(root, required) {
  const file = path.join(root, 'sync-manifest.json');
  fs.writeFileSync(file, JSON.stringify({ guards: { required } }, null, 2));
  return file;
}

test('requiredGuards reads the declared set, and is null when none is declared', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-controls-'));
  assert.equal(requiredGuards(path.join(root, 'absent.json')), null, 'a missing manifest declares nothing');
  fs.writeFileSync(path.join(root, 'empty.json'), JSON.stringify({ guards: {} }));
  assert.equal(requiredGuards(path.join(root, 'empty.json')), null);
  fs.writeFileSync(path.join(root, 'none.json'), JSON.stringify({ guards: { required: [] } }));
  assert.equal(requiredGuards(path.join(root, 'none.json')), null, 'an empty set is not a set');
  assert.deepEqual(requiredGuards(manifest(root, ['a.js', 'b.js'])), ['a.js', 'b.js']);
});

test('REVERSAL PROOF: a current mirror whose guard is not wired is unwired', () => {
  // The mirror is in sync and the guard file is present — and nothing ever runs it. That is the
  // gap the mirror hash cannot see, and the reason this pass exists.
  const ok = fixture('ok');
  fs.writeFileSync(path.join(ok.project, 'package.json'), JSON.stringify({
    scripts: { 'guard:breadth': 'node _guidelines/global-configs/scripts/check-doc-breadth.js .' },
  }, null, 2));
  const controls = controlsOf(ok.project, ['check-doc-breadth.js', 'check-guard-tiers.js']);
  assert.equal(controls.state, 'unwired');
  assert.deepEqual(controls.missing, ['check-guard-tiers.js']);
});

test('the control is matched by file, not by script name', () => {
  // The doctrine maps each step to the project's own script names, so a name-agnostic match is the
  // only one that does not impose a convention.
  const ok = fixture('ok');
  fs.writeFileSync(path.join(ok.project, 'package.json'), JSON.stringify({
    scripts: { 'lint:guards': 'node _guidelines/global-configs/scripts/check-doc-breadth.js .' },
  }, null, 2));
  assert.equal(controlsOf(ok.project, ['check-doc-breadth.js']).state, 'wired');
});

test('a project with no package.json is reported, never failed', () => {
  // Not every project is a Node project; one that is cannot expose npm scripts at all.
  const ok = fixture('ok');
  const controls = controlsOf(ok.project, ['check-doc-breadth.js']);
  assert.equal(controls.state, 'not-a-node-project');
  assert.deepEqual(controls.missing, []);
});

test('an unreadable package.json fails rather than passing silently', () => {
  const ok = fixture('ok');
  fs.writeFileSync(path.join(ok.project, 'package.json'), '{ this is not json');
  assert.equal(controlsOf(ok.project, ['check-doc-breadth.js']).state, 'unreadable');
});

test('CLI exits 1 when the mirror is current but a required guard is unwired', () => {
  const f = fixture('ok');
  const registry = path.join(f.root, 'sync-projects.json');
  fs.writeFileSync(registry, JSON.stringify([{ name: 'p', path: f.project }]));
  const declared = manifest(f.root, ['check-doc-breadth.js']);
  const run = () => runSync(process.execPath, [SCRIPT, '--quiet'], {
    cwd: REPO_ROOT,
    env: { ...process.env, SYNC_DRIFT_SOURCE: f.source, SYNC_DRIFT_REGISTRY: registry, SYNC_DRIFT_MANIFEST: declared },
  });

  fs.writeFileSync(path.join(f.project, 'package.json'), JSON.stringify({ scripts: { lint: 'eslint .' } }, null, 2));
  assert.equal(run().status, 1, 'in sync, but the guard is never run');

  fs.writeFileSync(path.join(f.project, 'package.json'), JSON.stringify({
    scripts: { 'guard:breadth': 'node _guidelines/global-configs/scripts/check-doc-breadth.js .' },
  }, null, 2));
  assert.equal(run().status, 0, 'wired — the mirror is current and the guard runs');
});
