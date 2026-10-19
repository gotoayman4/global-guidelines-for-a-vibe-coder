const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/plan-skills.js');
const { planSkills, applyPlan, skillScope, fitVerdict } = require('../lib/plan-skills.js');
const { readStackProfile } = require('../lib/stack-profile.js');

/** A throwaway project directory. Every test builds its own, so none asserts live fleet state. */
function project({ agents = '', pkg = null, extra = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-skills-'));
  if (agents) fs.writeFileSync(path.join(root, 'AGENTS.md'), agents);
  if (pkg) fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
  for (const [rel, body] of Object.entries(extra)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return root;
}

/**
 * A throwaway skills directory in the Agent Skills standard layout — `<name>/SKILL.md`, the shape
 * the repo ships and the sync writes. `appliesTo`/`tags` are written verbatim so a test can be
 * malformed. `legacy: true` writes the flat `<name>.skill.md` shape instead, to exercise the
 * reader's tolerance for a source that has not been migrated.
 */
function skills(spec, { legacy = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-skills-src-'));
  for (const [name, fm] of Object.entries(spec)) {
    const body = `---\n${fm}\n---\n\n# ${name}\n`;
    if (legacy) {
      fs.writeFileSync(path.join(dir, `${name}.skill.md`), body);
    } else {
      fs.mkdirSync(path.join(dir, name));
      fs.writeFileSync(path.join(dir, name, 'SKILL.md'), body);
    }
  }
  return dir;
}

const STACK_TABLE = [
  '## Stack (Pin exact versions — do NOT use ranges)',
  '',
  '| Layer | Technology | Version |',
  '|---|---|---|',
  '| UI component library | MUI (`@mui/material`) | 9.5.0 |',
  '| Hosting | Firebase Hosting | — |',
  '',
  '## Forbidden Dependencies and Patterns',
  '',
  '- **No Tailwind, no shadcn/ui.** MUI 9 is the recorded UI foundation.',
  '- **No ORM or SQL driver.** Firestore is the only datastore.',
  '',
  '## Something Else',
  '',
  'Tailwind appears in prose here too.',
  '',
].join('\n');

test('a Stack heading containing "do NOT use ranges" is not mistaken for a forbidden list', () => {
  // The trap that inverted the whole profile on GAMS: a bare `do not` matched the standard Stack
  // heading, so the declared stack was read as BANNED — MUI, React and Electron all forbidden in the
  // project that pins them. Asserted directly because the failure is silent and total.
  const root = project({ agents: STACK_TABLE });
  const profile = readStackProfile(root);
  assert.ok(profile.stack.includes('mui'), `mui must be USED, got stack=[${profile.stack}]`);
  assert.ok(!profile.forbidden.includes('mui'), `mui must not be forbidden, got [${profile.forbidden}]`);
});

test('a technology named inside a prohibition but declared in use is reconciled out of forbidden', () => {
  // "MUI 9 is the recorded UI foundation" sits INSIDE the forbidden bullet. Reading the whole bullet
  // bans the technology the project just declared; reading only the negated first sentence does not.
  const root = project({ agents: STACK_TABLE });
  const profile = readStackProfile(root);
  assert.deepEqual(profile.forbidden, ['shadcn', 'tailwind'], 'the bans survive, the mention does not');
  assert.deepEqual(profile.forbiddenRaw.includes('mui'), false, 'mui never even reaches the raw set');
});

test('a "## 8. Skills" section is excluded from the prose rung, so a project cannot confirm itself', () => {
  // alsael1 lists its skills in AGENTS.md. Reading that list as evidence of the stack made
  // `mui-design-system.skill.md` prove MUI — a loop in which a project's inventory justified itself.
  const root = project({
    agents: ['## 8. Skills', '', '- `mui-design-system/SKILL.md` — MUI patterns', '- `tiptap-tailwind-reset/SKILL.md`', ''].join('\n'),
  });
  const profile = readStackProfile(root);
  assert.equal(profile.mode, 'unconfigured', `expected no stack signal, got [${profile.stack}]`);
  assert.deepEqual(profile.stack, []);
});

test('the prose rung reads a declaration the Stack table did not carry', () => {
  const root = project({
    agents: ['## 8. Technology Notes', '', 'Built with Firebase and Firestore.', '', '## 9. Other', '', 'nothing here', ''].join('\n'),
  });
  const profile = readStackProfile(root);
  assert.deepEqual(profile.stack, ['firebase', 'firestore']);
  assert.equal(profile.sources.agentsProse, true);
  assert.equal(profile.mode, 'configured');
});

test('a numbered forbidden section is still a forbidden section', () => {
  // alsael1 writes `## 10. Forbidden Patterns (Consolidated)`. A `^Forbidden` test missed it, which
  // silently disabled the negative signal for the one project that had no other source of truth.
  const root = project({
    agents: [
      '## 1. Overview',
      '',
      'A Firebase app.',
      '',
      '## 10. Forbidden Patterns (Consolidated)',
      '',
      '- No Tailwind, no shadcn/ui.',
      '',
    ].join('\n'),
  });
  const profile = readStackProfile(root);
  assert.deepEqual(profile.forbidden, ['shadcn', 'tailwind']);
  assert.ok(!profile.stack.includes('tailwind'), 'the banned technology must not enter the stack');
});

test('the prose rung cannot cancel a prohibition — a ban that mentions itself must survive', () => {
  // The failure this guards is self-defeating and easy to write: prose that says "we do not use
  // Tailwind" MENTIONS Tailwind, so a reconciliation run against the prose-inclusive stack puts
  // Tailwind in the stack, deletes the ban, and copies the Tailwind skill back in. Only a declared or
  // measured stack may reconcile — prose may not.
  const root = project({
    agents: [
      '## 1. Overview',
      '',
      'A Firebase app that also mentions Tailwind in passing.',
      '',
      '## 10. Forbidden Patterns (Consolidated)',
      '',
      '- No Tailwind, no shadcn/ui.',
      '',
    ].join('\n'),
  });
  const profile = readStackProfile(root);
  assert.ok(profile.forbidden.includes('tailwind'), `ban lost, forbidden=[${profile.forbidden}]`);
  assert.equal(fitVerdict({ tokens: ['tailwind'] }, profile).fit, false, 'and it still skips the skill');
});

test('the prose rung is gated: it never runs when a Stack table answered', () => {
  // Prose matching is a heuristic, so it must not be able to override a declaration.
  const root = project({ agents: `${STACK_TABLE}\n\n## Notes\n\nWe also use Electron and Zustand.\n` });
  const profile = readStackProfile(root);
  assert.equal(profile.sources.agentsProse, false, 'rung 3 must stay off when rung 1 answered');
  assert.ok(!profile.stack.includes('zustand'), 'and its tokens must not leak in');
});

test('package.json is read one workspace level down', () => {
  // GAMS's root manifest is a workspace shell; reading it alone reports "React absent" for React.
  const root = project({
    pkg: { name: 'shell', private: true },
    extra: { 'apps/web-portal/package.json': JSON.stringify({ dependencies: { react: '19.0.0', '@mui/material': '9.0.0' } }) },
  });
  const profile = readStackProfile(root);
  assert.deepEqual(profile.stack, ['mui', 'react']);
});

test('a project with no signal at all is unconfigured, and unconfigured copies everything', () => {
  // The user's rule: a pure empty folder gets all skills. Withholding them would be a guess.
  const root = project();
  const profile = readStackProfile(root);
  assert.equal(profile.mode, 'unconfigured');
  const verdict = fitVerdict({ tokens: ['mui'] }, profile);
  assert.equal(verdict.fit, true);
  assert.match(verdict.reason, /no stack signal/);
});

test('appliesTo is authoritative and overrides tags', () => {
  const scope = skillScope({ appliesTo: ['mui'], tags: ['skill', 'tailwind'] });
  assert.deepEqual(scope.tokens, ['mui'], 'the declaration wins outright');
  assert.equal(scope.declared, true);
  assert.equal(scope.basis, 'appliesTo');
});

test('an undeclared scope is inferred from tags, and says so', () => {
  const scope = skillScope({ tags: ['skill', 'docx', 'rtl', 'arabic'] });
  assert.deepEqual(scope.tokens, ['docx'], 'only vocabulary tokens survive');
  assert.equal(scope.declared, false);
  assert.equal(scope.basis, 'tags');
});

test('a skill whose tags name no technology is stack-agnostic, not unscoped', () => {
  const scope = skillScope({ tags: ['skill', 'review', 'quality'] });
  assert.deepEqual(scope.tokens, []);
  const verdict = fitVerdict(scope, readStackProfile(project({ agents: STACK_TABLE })));
  assert.equal(verdict.fit, true);
  assert.match(verdict.reason, /stack-agnostic/);
});

test('an appliesTo value the vocabulary cannot resolve is reported, never silently universal', () => {
  // A typo here would read as "no scope", making the skill universal — the one failure mode of a
  // declaration that is quietly ignored. It falls back to tags AND names the unresolvable value.
  const scope = skillScope({ appliesTo: ['mooi'], tags: ['skill', 'tailwind'] });
  assert.deepEqual(scope.unknown, ['mooi']);
  assert.deepEqual(scope.tokens, ['tailwind'], 'inference takes over');
  assert.match(scope.basis, /appliesTo unresolved/);
});

test('a forbidden technology beats a matching one — a ban is unambiguous', () => {
  const profile = readStackProfile(project({ agents: STACK_TABLE }));
  const verdict = fitVerdict({ tokens: ['tailwind'] }, profile);
  assert.equal(verdict.fit, false);
  assert.match(verdict.reason, /forbidden by this project: tailwind/);
});

test('a skill whose scope misses the stack is skipped, and the reason names the scope', () => {
  const profile = readStackProfile(project({ agents: STACK_TABLE }));
  const verdict = fitVerdict({ tokens: ['docx'] }, profile);
  assert.equal(verdict.fit, false);
  assert.match(verdict.reason, /no overlap/);
  assert.match(verdict.reason, /docx/);
});

test('planSkills splits a real corpus into copy and skip with a reason on every row', () => {
  const root = project({ agents: STACK_TABLE });
  const dir = skills({
    universal: 'name: universal\ndescription: always\ntags: [skill, review]',
    muionly: 'name: muionly\ndescription: mui\nappliesTo: [mui]',
    tailwindonly: 'name: tailwindonly\ndescription: tw\ntags: [skill, tailwind]',
    docxonly: 'name: docxonly\ndescription: docx\ntags: [skill, docx]',
  });
  const plan = planSkills(root, dir);

  assert.deepEqual(plan.copy.map((r) => r.file), ['muionly/SKILL.md', 'universal/SKILL.md']);
  assert.deepEqual(plan.skip.map((r) => r.file), ['docxonly/SKILL.md', 'tailwindonly/SKILL.md']);
  for (const row of plan.copy.concat(plan.skip)) {
    assert.ok(row.reason && row.reason.length > 0, `${row.file} must carry a reason`);
  }
  assert.match(plan.skip.find((r) => r.file === 'tailwindonly/SKILL.md').reason, /forbidden/);
});

test('applyPlan writes the standard layout and prunes every stale skill', () => {
  const root = project({ agents: STACK_TABLE });
  const dir = skills({
    universal: 'name: universal\ndescription: always\ntags: [skill, review]',
    muionly: 'name: muionly\ndescription: mui\nappliesTo: [mui]',
    docxonly: 'name: docxonly\ndescription: docx\ntags: [skill, docx]',
  });
  const target = path.join(root, '_skills');
  fs.mkdirSync(target);
  // A stale flat skill from before the migration, and a hand-written file that must survive untouched.
  fs.writeFileSync(path.join(target, 'shadcn-design-system.skill.md'), 'stale');
  fs.writeFileSync(path.join(target, 'HANDWRITTEN.md'), 'mine');

  const result = applyPlan(root, planSkills(root, dir));

  assert.deepEqual(result.copied.sort(), ['muionly/SKILL.md', 'universal/SKILL.md']);
  assert.deepEqual(result.removed, ['shadcn-design-system.skill.md'], 'the stale skill is gone');
  assert.deepEqual(fs.readdirSync(target).sort(), ['HANDWRITTEN.md', 'muionly', 'universal']);
  assert.ok(fs.existsSync(path.join(target, 'muionly', 'SKILL.md')), 'written as <name>/SKILL.md');
});

test('a legacy flat SOURCE is normalised to the standard layout on write', () => {
  // The written shape is the standard one whatever the source shape is: a native loader scans for
  // `<name>/SKILL.md`, so a flat source must not be delivered as a shape no loader reads.
  const root = project({ agents: STACK_TABLE });
  const dir = skills({ muionly: 'name: muionly\ndescription: mui\nappliesTo: [mui]' }, { legacy: true });
  const result = applyPlan(root, planSkills(root, dir));
  assert.deepEqual(result.copied, ['muionly/SKILL.md']);
  assert.ok(fs.existsSync(path.join(root, '_skills', 'muionly', 'SKILL.md')));
  assert.ok(!fs.existsSync(path.join(root, '_skills', 'muionly.skill.md')));
});

test('a legacy flat copy is pruned even when the same skill is planned as a directory', () => {
  // The bug this closes: a project synced before the migration had `code-review.skill.md`; the new
  // sync writes `code-review/SKILL.md`. Keeping the flat file because its NAME is planned would leave
  // two loadable copies of one skill in the directory the AGENTS.md index tells the agent to load from.
  const root = project({ agents: STACK_TABLE });
  const dir = skills({ muionly: 'name: muionly\ndescription: mui\nappliesTo: [mui]' });
  const target = path.join(root, '_skills');
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'muionly.skill.md'), 'the pre-migration copy');

  const result = applyPlan(root, planSkills(root, dir));

  assert.ok(!fs.existsSync(path.join(target, 'muionly.skill.md')), 'the dead flat copy is gone');
  assert.deepEqual(result.removed, ['muionly.skill.md']);
  assert.deepEqual(fs.readdirSync(target).sort(), ['muionly']);
});

test('a skill delivers its whole payload, and a removed companion is pruned', () => {
  // A skill's references are loaded on demand by the skill itself. Copying SKILL.md alone delivered
  // the entry point and none of the files it points at, while every entry-file check stayed green.
  const root = project({ agents: STACK_TABLE });
  const dir = skills({ muionly: 'name: muionly\ndescription: mui\nappliesTo: [mui]' });
  const skillDir = path.join(dir, 'muionly');
  fs.mkdirSync(path.join(skillDir, 'references'), { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'references', 'patterns.md'), '# Patterns\n');
  fs.mkdirSync(path.join(skillDir, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'scripts', 'helper.js'), '// helper\n');

  const first = applyPlan(root, planSkills(root, dir));
  assert.deepEqual(first.copied.sort(), [
    'muionly/SKILL.md',
    'muionly/references/patterns.md',
    'muionly/scripts/helper.js',
  ]);
  assert.ok(fs.existsSync(path.join(root, '_skills', 'muionly', 'references', 'patterns.md')));

  // The source drops a companion; the next sync must remove the project's copy, or the skill keeps
  // a loadable file its own text no longer describes.
  fs.rmSync(path.join(skillDir, 'references', 'patterns.md'));
  const second = applyPlan(root, planSkills(root, dir));
  assert.deepEqual(second.removed, ['muionly/references/patterns.md']);
  assert.ok(!fs.existsSync(path.join(root, '_skills', 'muionly', 'references', 'patterns.md')));
  assert.ok(!fs.existsSync(path.join(root, '_skills', 'muionly', 'references')), 'the empty directory is gone');
});

test('a stale companion makes the delivered skill stale, not just its entry file', () => {
  const root = project({ agents: STACK_TABLE });
  const dir = skills({ muionly: 'name: muionly\ndescription: mui\nappliesTo: [mui]' });
  const skillDir = path.join(dir, 'muionly');
  fs.mkdirSync(path.join(skillDir, 'references'), { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'references', 'patterns.md'), '# Patterns v2\n');
  applyPlan(root, planSkills(root, dir));
  fs.writeFileSync(path.join(skillDir, 'references', 'patterns.md'), '# Patterns v3\n');

  const drift = require('../check-sync-drift.js').compareSkills(root, {
    target: '_skills',
    source: dir,
  });
  assert.equal(drift.state, 'drift');
  assert.deepEqual(drift.stale, ['muionly/references/patterns.md']);
});

test('applyPlan with prune disabled leaves the stale skill in place', () => {
  const root = project({ agents: STACK_TABLE });
  const dir = skills({ universal: 'name: universal\ndescription: always\ntags: [skill, review]' });
  const target = path.join(root, '_skills');
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'stale.skill.md'), 'stale');
  applyPlan(root, planSkills(root, dir), { prune: false });
  assert.ok(fs.existsSync(path.join(target, 'stale.skill.md')));
});

test('CLI --json reports the profile and every decision, and writes nothing', () => {
  const root = project({ agents: STACK_TABLE });
  const dir = skills({ muionly: 'name: muionly\ndescription: mui\nappliesTo: [mui]' });
  const result = runSync(process.execPath, [SCRIPT, root, '--json'], {
    cwd: REPO_ROOT,
    env: { ...process.env, PLAN_SKILLS_DIR: dir },
  });
  assert.equal(result.status, 0, result.stderr);
  const [entry] = JSON.parse(result.stdout);
  assert.equal(entry.mode, 'configured');
  assert.deepEqual(entry.copy, ['muionly/SKILL.md']);
  assert.equal(entry.applied, null, 'no --apply means nothing on disk moves');
  assert.equal(fs.existsSync(path.join(root, '_skills')), false);
});

test('CLI --apply materialises the plan and reports what it pruned', () => {
  const root = project({ agents: STACK_TABLE });
  const dir = skills({ muionly: 'name: muionly\ndescription: mui\nappliesTo: [mui]' });
  const result = runSync(process.execPath, [SCRIPT, root, '--apply', '--json'], {
    cwd: REPO_ROOT,
    env: { ...process.env, PLAN_SKILLS_DIR: dir },
  });
  assert.equal(result.status, 0, result.stderr);
  const [entry] = JSON.parse(result.stdout);
  assert.deepEqual(entry.applied.copied, ['muionly/SKILL.md']);
  assert.ok(fs.existsSync(path.join(root, '_skills', 'muionly', 'SKILL.md')));
});

test('CLI exits 1 when a CONFIGURED project matches zero skills', () => {
  // A configured project that matches nothing is almost always a broken profile rather than a project
  // that needs nothing, so it is surfaced instead of being reported as a clean zero.
  const root = project({ agents: STACK_TABLE });
  const dir = skills({ docxonly: 'name: docxonly\ndescription: docx\ntags: [skill, docx]' });
  const result = runSync(process.execPath, [SCRIPT, root], {
    cwd: REPO_ROOT,
    env: { ...process.env, PLAN_SKILLS_DIR: dir },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /matched ZERO skills/);
});

test('CLI exits 2 on an unknown flag rather than ignoring it', () => {
  const result = runSync(process.execPath, [SCRIPT, '--nope'], { cwd: REPO_ROOT });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown flag/);
});

/* ------------------------------------------------------------------ *
 * THE DELIVERY INVARIANT — the sync must delegate, not re-implement.
 *
 * The selector is only a control if the thing that actually writes `_skills/` uses it. Two writers
 * do that — `Sync-Skills` in the module and `Sync-SkillsInline` in the GUI — and before this guard
 * each held its own `Get-ChildItem … *.skill.md` loop that copied everything. Restoring that loop is
 * a one-line edit that no test would have caught, and it would silently undo the whole selection
 * while every unit test above still passed, because those test the planner and not its caller.
 *
 * The same invariant covers the `## Skills` block: both writers must call `inject-skills-block.js`
 * rather than grow their own copy of the injection. They did carry one until 2026-10-13 — an inline
 * append that duplicated the block's fallback text and could never refresh what it had written.
 *
 * The machine-global tool pools (`~/.config/opencode/skills`, `~/.qoder/skills`) are a DIFFERENT
 * surface with a different rule — a shared pool, not a project mirror — and are deliberately not
 * judged here.
 * ------------------------------------------------------------------ */

const SCRIPTS = path.join(REPO_ROOT, 'guidelines/global-configs/scripts');
const WRITERS = {
  'GuidelineSync.psm1': path.join(SCRIPTS, 'GuidelineSync.psm1'),
  'sync-manager.ps1': path.join(REPO_ROOT, 'sync-manager.ps1'),
};
const DELIVERY_FNS = ['Sync-Skills', 'Sync-SkillsInline'];
/** The shape of the defect: enumerate every skill file, then copy it. */
const BULK_COPY = /Get-ChildItem[^\n]*\*\.skill\.md/;

const readWriters = () => Object.fromEntries(Object.entries(WRITERS).map(([n, f]) => [n, fs.readFileSync(f, 'utf8')]));

/** The body of each function that writes a project's `_skills/` mirror. */
function deliveryBlocks(sources) {
  const blocks = {};
  for (const [name, text] of Object.entries(sources)) {
    for (const fn of DELIVERY_FNS) {
      // Located by index, not by a constructed regex: the name is dynamic, and a pattern built from
      // it would have to spell its escapes twice over. The body ends at the first line whose only
      // character is `}` — a PowerShell function's closing brace sits at column 0, nested ones do not.
      const paren = text.indexOf(`function ${fn}(`);
      const brace = text.indexOf(`function ${fn} {`);
      const head = paren === -1 ? brace : paren;
      if (head === -1) continue;
      const end = text.indexOf('\n}', head);
      if (end === -1) continue;
      blocks[`${name}:${fn}`] = text.slice(head, end + 2);
    }
  }
  return blocks;
}

/** One line per delivery path that does not delegate, or that still bulk-copies. */
function undelegated(blocks) {
  const failures = [];
  for (const [key, body] of Object.entries(blocks)) {
    if (!body.includes('plan-skills.js')) failures.push(`${key}: does not invoke plan-skills.js`);
    // The `## Skills` block has ONE home too — `inject-skills-block.js` — for the same reason: an
    // inline copy of the injection is a second place the block can be written from, and the two
    // would drift exactly on the project whose skills just changed.
    if (!body.includes('inject-skills-block.js')) failures.push(`${key}: does not invoke inject-skills-block.js`);
    if (BULK_COPY.test(body)) failures.push(`${key}: bulk-copies *.skill.md instead of applying a plan`);
  }
  return failures;
}

test('every delivery path delegates skill selection to the planner', () => {
  const failures = undelegated(deliveryBlocks(readWriters()));
  assert.deepEqual(failures, [], failures.join('; '));
});

test('the delivery check is not vacuous — it finds both writers that write _skills/', () => {
  const blocks = deliveryBlocks(readWriters());
  // If the extraction stops matching, `undelegated` would pass over an empty corpus forever.
  assert.deepEqual(Object.keys(blocks).sort(), ['GuidelineSync.psm1:Sync-Skills', 'sync-manager.ps1:Sync-SkillsInline']);
  for (const [key, body] of Object.entries(blocks)) assert.ok(body.length > 400, `${key} read as empty`);
});

test('REVERSAL PROOF: re-adding a copy-everything loop fails the delivery check', () => {
  const blocks = deliveryBlocks(readWriters());
  assert.deepEqual(undelegated(blocks), [], 'clean to begin with');

  // The exact regression: the planner call is replaced by the loop the selector removed.
  blocks['GuidelineSync.psm1:Sync-Skills'] = [
    'function Sync-Skills {',
    '    $skillFiles = Get-ChildItem "$skillsDir\\*.skill.md"',
    '    foreach ($file in $skillFiles) { Copy-Item $file.FullName $target -Force }',
    '}',
  ].join('\n');
  const failures = undelegated(blocks);
  assert.equal(failures.length, 3, failures.join('; '));
  assert.ok(failures.some((f) => /does not invoke plan-skills\.js/.test(f)), failures.join('; '));
  assert.ok(failures.some((f) => /does not invoke inject-skills-block\.js/.test(f)), failures.join('; '));
  assert.ok(failures.some((f) => /bulk-copies \*\.skill\.md/.test(f)), failures.join('; '));
});
