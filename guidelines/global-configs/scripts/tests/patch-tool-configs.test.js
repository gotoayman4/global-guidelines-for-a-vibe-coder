const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/patch-tool-configs.js');
const { applyInstructions, applyRegion, templateRegion, BEGIN, END } = require('../patch-tool-configs.js');

/**
 * The managed region's body, as the TEMPLATE carries it. The script never restates this text — it
 * reads it from the template — so the fixture template below is what the target must end up with.
 */
const REGION_BODY = [
  '**Read `AGENTS.md` first.** It is this project constitution: its rules, and the `## Skills`',
  'inventory that says when to open each skill. Load the shared guidelines from `_guidelines/` only',
  'when `AGENTS.md` points you at a specific file.',
].join('\n');
const REGION = `${BEGIN}\n${REGION_BODY}\n${END}`;

const INSTRUCTIONS = ['AGENTS.md', '_guidelines/_index/RETRIEVAL_RULES.md'];

/**
 * A repo-shaped fixture: a manifest that names the tool configs, and the templates they come from.
 * Nothing here reads the live manifest or the live templates — a test that asserts live state passes
 * only while that state is broken.
 */
function fixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'patch-tool-configs-repo-'));
  const templates = path.join(root, 'guidelines', 'global-configs', 'templates');
  fs.mkdirSync(templates, { recursive: true });

  fs.writeFileSync(
    path.join(templates, 'rules.md.template'),
    `---\ndescription: rules\n---\n\n${REGION}\n\nBody of the rules.\n`
  );
  fs.writeFileSync(
    path.join(templates, 'tool.json.template'),
    `{\n  "instructions": [\n    "AGENTS.md",\n    "_guidelines/_index/RETRIEVAL_RULES.md"\n  ]\n}\n`
  );
  fs.writeFileSync(
    path.join(templates, 'tool.jsonc.template'),
    `{\n  // a JSONC comment — the template may carry comments\n  "instructions": [\n    "AGENTS.md",\n    "_guidelines/_index/RETRIEVAL_RULES.md"\n  ]\n}\n`
  );

  fs.writeFileSync(
    path.join(root, 'guidelines', 'global-configs', 'sync-manifest.json'),
    `${JSON.stringify(
      {
        toolConfigs: [
          { template: 'global-configs/templates/rules.md.template', target: '.cursor/rules/global-guidelines.mdc' },
          { template: 'global-configs/templates/tool.json.template', target: 'opencode.json' },
          { template: 'global-configs/templates/tool.jsonc.template', target: 'kilo.jsonc' },
        ],
      },
      null,
      2
    )}\n`
  );
  return root;
}

/** A project with the given files. */
function project(files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'patch-tool-configs-project-'));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

/** Run the CLI against a fixture repo. */
function run(repo, projectRoot, ...flags) {
  return runSync(process.execPath, [SCRIPT, projectRoot, ...flags], {
    cwd: REPO_ROOT,
    env: { ...process.env, GUIDELINES_REPO_ROOT: repo },
  });
}

// ─── The managed region ──────────────────────────────────────────────────────

test('the region is inserted after the front-matter, and the body stays after it', () => {
  const { content, action } = applyRegion('---\ndescription: rules\n---\n\nBody of the rules.\n', REGION);
  assert.equal(action, 'inserted');
  assert.equal(content, `---\ndescription: rules\n---\n\n${REGION}\n\nBody of the rules.\n`);
});

test('the region is inserted at the very top of a file without front-matter', () => {
  const { content, action } = applyRegion('Body of the rules.\n', REGION);
  assert.equal(action, 'inserted');
  assert.equal(content, `${REGION}\n\nBody of the rules.\n`);
});

test('an existing region is REFRESHED in place, and nothing around it moves', () => {
  const doc = `---\ndescription: rules\n---\n\n${BEGIN}\nSTALE TEXT\n${END}\n\nBody of the rules.\n`;
  const { content, action } = applyRegion(doc, REGION);
  assert.equal(action, 'refreshed');
  assert.ok(content.includes(REGION), 'the stale region is replaced by the template one');
  assert.ok(!content.includes('STALE TEXT'), 'the stale text is gone');
  assert.ok(content.includes('Body of the rules.'), 'the text after the region is untouched');
});

test("a project's own text outside the region survives a refresh", () => {
  const doc = `---\ndescription: rules\n---\n\n${BEGIN}\nSTALE TEXT\n${END}\n\nProject rule: never touch the ledger.\n`;
  const { content } = applyRegion(doc, REGION);
  assert.ok(content.includes('Project rule: never touch the ledger.'), 'a project rule is never overwritten');
  assert.ok(content.includes('description: rules'), 'nor is the front-matter');
});

test('a half-marked file is left alone rather than given a second entry point', () => {
  const doc = `---\ndescription: rules\n---\n\n${BEGIN}\nno end marker here\n`;
  const { content, action } = applyRegion(doc, REGION);
  assert.equal(action, 'kept');
  assert.equal(content, doc);
});

test('the region is read from the template, not restated in the script', () => {
  const template = `---\ndescription: rules\n---\n\n${REGION}\n\nBody.\n`;
  assert.equal(templateRegion(template), REGION);
});

// ─── The instructions array ──────────────────────────────────────────────────

test('the missing instructions are prepended, and the ones the target has are kept', () => {
  const doc = '{\n  "instructions": [\n    "_guidelines/_index/RETRIEVAL_RULES.md"\n  ]\n}\n';
  const { content, action } = applyInstructions(doc, INSTRUCTIONS);
  assert.equal(action, 'aligned');
  const parsed = JSON.parse(content);
  assert.deepEqual(parsed.instructions, INSTRUCTIONS);
  assert.ok(content.indexOf('"AGENTS.md"') < content.indexOf('"_guidelines/_index/RETRIEVAL_RULES.md"'), 'AGENTS.md comes first');
});

test("a project's own instructions are kept, after the managed ones", () => {
  const doc = '{\n  "instructions": [\n    "_guidelines/_index/RETRIEVAL_RULES.md",\n    "notes.md"\n  ]\n}\n';
  const { content } = applyInstructions(doc, INSTRUCTIONS);
  const parsed = JSON.parse(content);
  assert.deepEqual(parsed.instructions, [...INSTRUCTIONS, 'notes.md']);
});

test('a JSONC document with comments is tolerated, and the comment survives', () => {
  const doc = '{\n  // a JSONC comment\n  "instructions": [\n    "_guidelines/_index/RETRIEVAL_RULES.md"\n  ]\n}\n';
  const { content, action } = applyInstructions(doc, INSTRUCTIONS);
  assert.equal(action, 'aligned');
  assert.ok(content.includes('// a JSONC comment'), 'the comment is not touched');
  assert.ok(content.includes('"AGENTS.md"'), 'the entry is prepended');
});

test('an array that already begins with the managed entries is left alone', () => {
  const doc = `{\n  "instructions": [\n    "AGENTS.md",\n    "_guidelines/_index/RETRIEVAL_RULES.md"\n  ]\n}\n`;
  const { content, action } = applyInstructions(doc, INSTRUCTIONS);
  assert.equal(action, 'unchanged');
  assert.equal(content, doc);
});

test('a Windows-separator path is the same entry, and takes the canonical spelling', () => {
  // What a delivered config in the wild carries: the same path, written with backslashes.
  const doc = '{\n  "instructions": [\n    "_guidelines\\\\_index\\\\RETRIEVAL_RULES.md"\n  ]\n}\n';
  const { content, action } = applyInstructions(doc, INSTRUCTIONS);
  assert.equal(action, 'aligned');
  const parsed = JSON.parse(content);
  assert.deepEqual(parsed.instructions, INSTRUCTIONS, 'the mangled path is replaced, not duplicated');
});

test('a UTF-8 BOM does not stop a strict-JSON target from being patched', () => {
  const doc = `\uFEFF{\n  "instructions": [\n    "_guidelines/_index/RETRIEVAL_RULES.md"\n  ]\n}\n`;
  const { content, action } = applyInstructions(doc, INSTRUCTIONS);
  assert.equal(action, 'aligned');
  assert.ok(content.startsWith('\uFEFF'), 'the BOM is left where it was');
  assert.ok(content.includes('"AGENTS.md"'), 'the entry is prepended');
});

// ─── The CLI ─────────────────────────────────────────────────────────────────

test('the CLI inserts the region, aligns the array, and is idempotent', () => {
  const repo = fixtureRepo();
  const root = project({
    '.cursor/rules/global-guidelines.mdc': '---\ndescription: rules\n---\n\nBody of the rules.\n',
    'opencode.json': '{\n  "instructions": []\n}\n',
  });

  assert.equal(run(repo, root, '--check', '--quiet').status, 1, 'a project without the region is out of date');

  assert.equal(run(repo, root, '--quiet').status, 0, 'the sync writes it');

  const after = fs.readFileSync(path.join(root, '.cursor/rules/global-guidelines.mdc'), 'utf8');
  assert.ok(after.includes(REGION_BODY), 'the region came from the template');
  assert.ok(after.includes('Body of the rules.'), "the project's own body survived");
  assert.ok(after.startsWith('---\n'), 'the front-matter is still first');

  const json = JSON.parse(fs.readFileSync(path.join(root, 'opencode.json'), 'utf8'));
  assert.deepEqual(json.instructions, INSTRUCTIONS);

  assert.equal(run(repo, root, '--quiet').status, 0, 'a second run is a no-op');
  assert.equal(
    fs.readFileSync(path.join(root, '.cursor/rules/global-guidelines.mdc'), 'utf8'),
    after,
    'and it does not rewrite the file'
  );

  assert.equal(run(repo, root, '--check', '--quiet').status, 0, 'now it is current');
});

test('the CLI writes a JSONC target with its comments intact', () => {
  const repo = fixtureRepo();
  const root = project({ 'kilo.jsonc': '{\n  // keep me\n  "instructions": []\n}\n' });
  assert.equal(run(repo, root, '--quiet').status, 0);
  const after = fs.readFileSync(path.join(root, 'kilo.jsonc'), 'utf8');
  assert.ok(after.includes('// keep me'), 'the comment survives');
  assert.ok(after.includes('"AGENTS.md"'), 'the entry is prepended');
});

test('the CLI skips a tool config the project does not have', () => {
  const repo = fixtureRepo();
  const root = project({ 'README.md': '# P\n' });
  assert.equal(run(repo, root, '--quiet').status, 0, 'a project with no tool config is not broken');
  assert.equal(run(repo, root, '--check', '--quiet').status, 0, 'and there is nothing due');
});

test('the CLI reports a strict-JSON target it cannot parse, and writes nothing', () => {
  const repo = fixtureRepo();
  const broken = '{\n  "instructions": [,]\n}\n';
  const root = project({ 'opencode.json': broken });
  assert.equal(run(repo, root, '--quiet').status, 1, 'a config that would break the editor is a failure');
  assert.equal(fs.readFileSync(path.join(root, 'opencode.json'), 'utf8'), broken, 'and it is left untouched');
});

test('the CLI rejects an unknown flag and a missing project root', () => {
  const repo = fixtureRepo();
  assert.equal(run(repo, '--nope', '--quiet').status, 2);
  assert.equal(run(repo, '--quiet').status, 2);
});

// ─── The formatter ───────────────────────────────────────────────────────────

test('a formatter re-laying-out the region is not a change to the rule', () => {
  // THE CHURN THIS PREVENTS. Four of the seven registered projects run prettier over their markdown
  // in a pre-commit hook, and prettier adds a blank line after an HTML comment — which is where the
  // BEGIN marker sits. The formatter rewrote the region, the next sync removed the blank line
  // again, and every cycle left a dirty tree for a change nobody made.
  const region = `${BEGIN}\n**Read \`AGENTS.md\` first.**\n${END}`;
  const formatted = `${BEGIN}\n\n**Read \`AGENTS.md\` first.**\n\n${END}`;
  const doc = `# Project\n\n${formatted}\n\nBody.\n`;
  const { content, action } = applyRegion(doc, region);
  assert.equal(action, 'unchanged', 'a re-layout is not a change');
  assert.equal(content, doc, "and the formatter's layout survives the sync");
});

test('a real change to the region wording is still a change', () => {
  const doc = `# Project\n\n${BEGIN}\n**Read the old thing.**\n${END}\n`;
  const { action } = applyRegion(doc, `${BEGIN}\n**Read \`AGENTS.md\` first.**\n${END}`);
  assert.equal(action, 'refreshed');
});