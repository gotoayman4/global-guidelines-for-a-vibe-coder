const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/inject-skills-block.js');
const { applyBlock, marked, markedSpan, findSkillsSection, legacyBody, BEGIN, END } = require('../inject-skills-block.js');
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
