const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/inject-skills-block.js');
const { applyBlock, marked, markedSpan, findSkillsSection, legacyBody, verifyInventory, NOTES_BEGIN, NOTES_END, BEGIN, END } = require('../inject-skills-block.js');
const { renderBlock } = require('../render-skills-index.js');

const BLOCK = '| Skill | Load when |\n|---|---|\n| [alpha](_skills/alpha/SKILL.md) | x |';

/** A project with an AGENTS.md and a standard-layout `_skills/`. */
function project({ agents = '# P\n\nBody.\n', skills = ['alpha'] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inject-skills-'));
  fs.writeFileSync(path.join(root, 'AGENTS.md'), agents);
  for (const name of skills) {
    fs.mkdirSync(path.join(root, '_skills', name), { recursive: true });
    fs.writeFileSync(
      path.join(root, '_skills', name, 'SKILL.md'),
      `---\nname: ${name}\ndescription: Use when ${name} work is needed\nmetadata:\n  appliesTo: mui\n  status: Advisory\n---\n\n# ${name}\n`
    );
  }
  return root;
}

// ─── The block's links ───────────────────────────────────────────────────────

test('renderBlock prefixes the row link so one renderer serves both files', () => {
  const skills = [{ file: 'alpha/SKILL.md', name: 'alpha', trigger: 'do alpha', appliesTo: ['mui'], status: 'Advisory' }];
  assert.match(renderBlock(skills), /\| \[alpha\]\(alpha\/SKILL\.md\) \|/, 'INDEX.md: relative to _skills/');
  assert.match(
    renderBlock(skills, { linkPrefix: '_skills/' }),
    /\| \[alpha\]\(_skills\/alpha\/SKILL\.md\) \|/,
    'AGENTS.md: relative to the project root — an unprefixed link here is broken'
  );
});

// ─── The four cases ──────────────────────────────────────────────────────────

test('applyBlock appends a marked section when the document has none', () => {
  const { content, action } = applyBlock('# P\n\nBody.\n', BLOCK);
  assert.equal(action, 'appended');
  assert.match(content, /^# P\n\nBody\.\n\n---\n\n## Skills\n\n<!-- BEGIN generated:skills-block/);
  assert.ok(content.includes(BLOCK));
  assert.ok(content.trimEnd().endsWith(END));
});

test('applyBlock REFRESHES a marked region and touches nothing else — the case that was impossible', () => {
  const doc = `# P\n\nIntro stays.\n\n## Skills\n\n${marked('OLD CONTENT')}\n\n## After\n\nTail stays.\n`;
  const { content, action } = applyBlock(doc, BLOCK);
  assert.equal(action, 'refreshed');
  assert.ok(content.includes('Intro stays.'), 'the text before is untouched');
  assert.ok(content.includes('Tail stays.'), 'and the text after is untouched');
  assert.ok(content.includes(BLOCK), 'the block is replaced');
  assert.ok(!content.includes('OLD CONTENT'), 'the stale block is gone');
  assert.equal((content.match(/BEGIN generated:skills-block/g) || []).length, 1, 'exactly one block');
});

test('applyBlock MIGRATES a block a previous sync wrote (the manifest body) to a marked one', () => {
  // The recogniser is the manifest's own value, so this is not a second home for a historical string.
  const body = legacyBody();
  assert.ok(body, 'the manifest must declare agentsMdSectionBody');
  const { content, action } = applyBlock(`# P\n\n---\n\n## Skills\n\n${body}\n`, BLOCK);
  assert.equal(action, 'migrated');
  assert.match(content, /BEGIN generated:skills-block/);
  assert.ok(!content.includes(body), 'the unmarked body is replaced by the marked block');
});

test('applyBlock LEAVES a hand-written ## Skills section alone', () => {
  const doc = '# P\n\n---\n\n## Skills\n\nProject skills live in `.qoder/skills/`. A skill never outranks this file.\n';
  const { content, action } = applyBlock(doc, BLOCK);
  assert.equal(action, 'kept');
  assert.equal(content, doc, 'a project rule is never overwritten by a generated index');
});

test('applyBlock is idempotent — a re-run reports unchanged and writes nothing', () => {
  const first = applyBlock('# P\n\nBody.\n', BLOCK);
  const second = applyBlock(first.content, BLOCK);
  assert.equal(second.action, 'unchanged');
  assert.equal(second.content, first.content);
});

test('a refreshed document keeps the CRLF line endings it arrived with', () => {
  const doc = `# P\r\n\r\n## Skills\r\n\r\n${marked('OLD').replace(/\n/g, '\r\n')}\r\n`;
  const { content } = applyBlock(doc, BLOCK);
  assert.ok(content.includes('\r\n'), 'CRLF is preserved');
  assert.ok(!/(?<!\r)\n/.test(content), 'no bare LF is introduced');
});

// ─── The section boundary ────────────────────────────────────────────────────

test('findSkillsSection stops at a sibling heading, so `## Skills (mandatory)` is not swallowed', () => {
  const lines = ['# P', '', '## Skills', '', 'body one', '', '## Skills (mandatory)', '', 'body two'];
  const section = findSkillsSection(lines);
  assert.equal(section.heading, 2);
  assert.deepEqual(lines.slice(section.bodyStart, section.end).join('\n').trim(), 'body one');
});

test('markedSpan refuses a half-marked document rather than guessing which half was meant', () => {
  assert.equal(markedSpan(`${BEGIN}\n\ncontent with no end marker\n`), null);
  assert.equal(markedSpan(`no markers at all\n`), null);
  assert.ok(markedSpan(`${BEGIN}\n\nx\n\n${END}`));
});

// ─── Which section, when there are several ───────────────────────────────────

test('findSkillsSection prefers the shallowest heading over a deeper "Skills" subsection', () => {
  // THE HAZARD. A constitution carrying `### Skills (Always Load)` — the shape this repo's own
  // AGENTS.md uses — used to be matched FIRST, because the old rule took the first heading that
  // began with `Skills` at ANY level. The inventory was then injected into that subsection while
  // the `## Skills` section it was meant to fill stayed empty.
  const lines = [
    '# P',
    '',
    '### Skills (Always Load)',
    '',
    'prose about skills',
    '',
    '## Skills',
    '',
    'the real section',
  ];
  const section = findSkillsSection(lines);
  assert.equal(lines[section.heading], '## Skills', 'the H2 wins, not the H3');
  assert.equal(lines.slice(section.bodyStart, section.end).join('\n').trim(), 'the real section');
});

test('findSkillsSection prefers the exact label "Skills" over "Skills (mandatory)" at the same level', () => {
  const lines = ['# P', '', '## Skills (mandatory)', '', 'prose', '', '## Skills', '', 'body'];
  const section = findSkillsSection(lines);
  assert.equal(lines[section.heading], '## Skills');
});

test('findSkillsSection still finds a subsection when there is no H2 section', () => {
  const lines = ['# P', '', '### Skills (Always Load)', '', 'body'];
  const section = findSkillsSection(lines);
  assert.equal(lines[section.heading], '### Skills (Always Load)', 'a project whose only heading is a subsection still gets its table');
});

// ─── The inventory check ─────────────────────────────────────────────────────

test('verifyInventory counts a skill named by link and by backticked name, and names the rest', () => {
  const root = project({ skills: ['alpha', 'beta', 'gamma'] });
  const body = '| [alpha](_skills/alpha/SKILL.md) | x |\n| `beta` | y |\n';
  const verdict = verifyInventory(body, path.join(root, '_skills'));
  assert.equal(verdict.state, 'incomplete');
  assert.equal(verdict.delivered, 3);
  assert.equal(verdict.referenced, 2);
  assert.deepEqual(verdict.missing, ['gamma'], 'the skill nobody named is the one reported');
});

test('verifyInventory does not count a bare word in prose as an inventory entry', () => {
  const root = project({ skills: ['alpha'] });
  const verdict = verifyInventory('the architect decided to skip it', path.join(root, '_skills'));
  assert.equal(verdict.state, 'incomplete');
  assert.deepEqual(verdict.missing, ['alpha']);
});

test('verifyInventory is complete when every delivered skill is named', () => {
  const root = project({ skills: ['alpha', 'beta'] });
  const verdict = verifyInventory('| `alpha` | x |\n| `beta` | y |\n', path.join(root, '_skills'));
  assert.equal(verdict.state, 'complete');
  assert.equal(verdict.referenced, 2);
});

// ─── The project's own notes ─────────────────────────────────────────────────

test('a refresh keeps the project\'s own notes region verbatim', () => {
  const notes = NOTES_BEGIN + '\nOur canonical skills live in `.qoder/skills/`.\n' + NOTES_END;
  const doc = `# P\n\n## Skills\n\n${marked(`old table\n\n${notes}`)}\n`;
  const { content, action } = applyBlock(doc, 'new table');
  assert.equal(action, 'refreshed');
  assert.match(content, /new table/, 'the table is regenerated');
  assert.match(content, /Our canonical skills live in/, 'the project\'s own text survives');
  assert.doesNotMatch(content, /old table/, 'and the old table is gone');
});

test('a refresh without a notes region leaves none behind', () => {
  const doc = `# P\n\n## Skills\n\n${marked('old table')}\n`;
  const { content } = applyBlock(doc, 'new table');
  assert.match(content, /new table/);
  assert.doesNotMatch(content, /NOTES|project:skills-notes/, 'no empty notes region is invented');
});

test('a half-marked notes region is treated as absent rather than guessed at', () => {
  const doc = `# P\n\n## Skills\n\n${marked(`old table\n\n${NOTES_BEGIN}\nnotes with no end`)}\n`;
  const { content } = applyBlock(doc, 'new table');
  assert.match(content, /new table/);
  assert.doesNotMatch(content, /notes with no end/, 'a broken region is not carried over');
});

test('a formatter re-aligning the generated table is not a change to the block', () => {
  // THE CHURN THIS PREVENTS. Four of the seven registered projects run prettier over their markdown
  // in a pre-commit hook, and prettier aligns markdown tables. The formatter rewrites the block the
  // sync just wrote; the next sync writes it back unaligned; and the `clean-tree` pre-push gate
  // then reports a dirty tree for a change nobody made.
  const aligned = [
    '| Skill      | Load when       |',
    '| ----------- | --------------- |',
    '| [alpha](_skills/alpha/SKILL.md) | Use when alpha |',
  ].join('\n');
  const plain = [
    '| Skill | Load when |',
    '|---|---|',
    '| [alpha](_skills/alpha/SKILL.md) | Use when alpha |',
  ].join('\n');
  const doc = `# P\n\n## Skills\n\n${marked(aligned)}\n`;
  const { content, action } = applyBlock(doc, plain);
  assert.equal(action, 'unchanged', 'a re-alignment is not a change');
  assert.equal(content, doc, 'and the formatter\'s alignment survives the sync');
});

test('a real change to a table cell is still a change', () => {
  const doc = `# P\n\n## Skills\n\n${marked('| Skill | Load when |\n|---|---|\n| [alpha](_skills/alpha/SKILL.md) | Use when alpha |')}\n`;
  const { action } = applyBlock(doc, '| Skill | Load when |\n|---|---|\n| [alpha](_skills/alpha/SKILL.md) | Use when beta |');
  assert.equal(action, 'refreshed', 'a changed trigger is a change, not a re-alignment');
});

test('a starter-derived pointer is upgraded into the live inventory, not left beside it', () => {
  // THE STARTER PATH. `AGENTS.starter.md` ships a `## Skills` section whose managed region holds a
  // POINTER — where the skills live and that the table lists them — because a project that has
  // never been synced has no inventory to show. The first sync replaces that region with the live
  // table, so the project ends up with ONE `## Skills` section carrying both the pointer and the
  // inventory, never two sections and never a stale pointer.
  const pointer = `${marked('Your stack\'s skills are delivered at `_skills/<name>/SKILL.md`.\n**Read it before a task.**')}`;
  const doc = `# AGENTS.md — Project Constitution\n\n## AI Collaboration\n\nSome rule.\n\n## Skills\n\n${pointer}\n\n## Reference & Project Setup\n\nMore.\n`;
  const { content, action } = applyBlock(doc, 'THE INVENTORY');
  assert.equal(action, 'refreshed');
  assert.match(content, /THE INVENTORY/, 'the region is replaced by the live inventory');
  assert.doesNotMatch(content, /Read it before a task/, 'the starter pointer does not survive');
  assert.equal(
    (content.match(/^## Skills\s*$/gm) || []).length,
    1,
    'and the project still has exactly one ## Skills section'
  );
  assert.match(content, /## Reference & Project Setup/, 'the sections around it are untouched');
});

// ─── The CLI ─────────────────────────────────────────────────────────────────

test('CLI injects, is idempotent, and --check distinguishes current from due', () => {
  const run = (root, ...flags) =>
    runSync(process.execPath, [SCRIPT, root, ...flags], { cwd: REPO_ROOT, env: { ...process.env } });

  const root = project();
  assert.equal(run(root, '--check', '--quiet').status, 1, 'a project with no block is out of date');

  assert.equal(run(root, '--quiet').status, 0, 'the sync writes it');
  const after = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.match(after, /BEGIN generated:skills-block/);
  assert.match(after, /\[alpha\]\(_skills\/alpha\/SKILL\.md\)/, 'the table links into _skills/');
  assert.match(after, /Use when alpha work is needed/, 'the trigger comes from the skill front-matter');

  assert.equal(run(root, '--quiet').status, 0, 'a second run is a no-op');
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), after, 'and does not rewrite the file');

  assert.equal(run(root, '--check', '--quiet').status, 0, 'now it is current');
});

test('CLI leaves a hand-written section alone and reports it', () => {
  const root = project({ agents: '# P\n\n## Skills\n\nHand-written rule.\n' });
  const before = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.equal(runSync(process.execPath, [SCRIPT, root, '--quiet'], { cwd: REPO_ROOT }).status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), before);
});

test('CLI does not call a hand-written section "up to date" when it omits a delivered skill', () => {
  // THE CONTROL THAT LIED. `kept` — "there is a hand-written section and the sync will not touch
  // it" — used to be reported as "up to date", exit 0. So a project could name five of the twelve
  // skills it had been delivered and the check was green, because the green was about the SYNC's
  // behaviour and not about the agent's ability to find the skills.
  const run = (root, ...flags) =>
    runSync(process.execPath, [SCRIPT, root, ...flags], { cwd: REPO_ROOT, env: { ...process.env } });

  const omitting = project({ agents: '# P\n\n## Skills\n\nHand-written rule.\n' });
  const result = run(omitting, '--check');
  assert.equal(result.status, 1, 'a section that names none of the delivered skills is not up to date');
  assert.match(result.stderr, /names 0 of 1 delivered skill/, 'and it says how many it named');
  assert.match(result.stderr, /alpha/, 'and which one is missing');

  const complete = project({ agents: '# P\n\n## Skills\n\nUse `alpha` for alpha work.\n' });
  const ok = run(complete, '--check');
  assert.equal(ok.status, 0, 'a hand-written section that names every delivered skill passes');
  assert.match(ok.stdout, /hand-written/, 'and it is reported as hand-written, not as "up to date"');
  assert.doesNotMatch(ok.stdout, /up to date/, 'the phrase claimed a currency it never checked');
});

test('CLI does nothing for a project with no skills or no AGENTS.md', () => {
  const noSkills = project({ skills: [] });
  assert.equal(runSync(process.execPath, [SCRIPT, noSkills, '--quiet'], { cwd: REPO_ROOT }).status, 0);
  assert.ok(!fs.readFileSync(path.join(noSkills, 'AGENTS.md'), 'utf8').includes('skills-block'));

  const noAgents = fs.mkdtempSync(path.join(os.tmpdir(), 'inject-noagents-'));
  assert.equal(runSync(process.execPath, [SCRIPT, noAgents, '--quiet'], { cwd: REPO_ROOT }).status, 0);
});

test('CLI rejects an unknown flag and a missing project root', () => {
  assert.equal(runSync(process.execPath, [SCRIPT, '--nope'], { cwd: REPO_ROOT }).status, 2);
  assert.equal(runSync(process.execPath, [SCRIPT], { cwd: REPO_ROOT }).status, 2);
});
