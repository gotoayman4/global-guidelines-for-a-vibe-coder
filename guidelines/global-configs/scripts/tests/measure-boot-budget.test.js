const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/measure-boot-budget.js');

function makeFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'measure-boot-budget-'));
  for (const [relative, contents] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, contents, 'utf8');
  }
  return root;
}

function runBudget(root, args) {
  const result = runSync(process.execPath, [SCRIPT, root, ...args], { cwd: REPO_ROOT });
  if (result.error) throw result.error;
  return {
    ...result,
    json: args.includes('--json') && result.stdout.trim() ? JSON.parse(result.stdout) : null,
  };
}

test('measures a complete clean corpus successfully', () => {
  const root = makeFixture({
    'AGENTS.md': '# Rules\n\nUse the tests.\n',
    'WORLD.md': '# Product\n\nKeep the scope small.\n',
  });
  const result = runBudget(root, [
    '--files', 'AGENTS.md,WORLD.md',
    '--max-tokens', '1000',
    '--history-warn', '25',
    '--strict',
    '--json',
  ]);

  assert.equal(result.status, 0);
  assert.equal(result.json.missingCount, 0);
  assert.deepEqual(result.json.missingFiles, []);
  assert.equal(result.json.files.length, 2);
  assert.deepEqual(result.json.problems, []);
});

test('keeps partial input visible while strict mode enforces completeness', () => {
  const root = makeFixture({ 'present.md': '# Present\n\nInstruction.\n' });
  const args = ['--files', 'present.md,missing.md', '--json'];

  const reportOnly = runBudget(root, args);
  assert.equal(reportOnly.status, 0);
  assert.equal(reportOnly.json.missingCount, 1);
  assert.deepEqual(reportOnly.json.missingFiles, ['missing.md']);
  assert.deepEqual(reportOnly.json.files.find((file) => file.rel === 'missing.md'), {
    rel: 'missing.md',
    missing: true,
    load: 'always',
  });
  assert.match(reportOnly.json.problems.join('\n'), /missing\.md/);

  const human = runBudget(root, ['--files', 'present.md,missing.md']);
  assert.equal(human.status, 0);
  assert.match(human.stdout, /missing\.md\s+— \(not present\)/);
  assert.match(human.stdout, /missing chain files: 1/);
  assert.match(human.stdout, /report only/);

  const strict = runBudget(root, [...args, '--strict']);
  assert.equal(strict.status, 1);
  assert.equal(strict.json.missingCount, 1);
  assert.match(strict.json.problems.join('\n'), /file not found/);
});

test('treats an entirely missing corpus as a data error', () => {
  const root = makeFixture({});
  const result = runBudget(root, ['--files', 'missing.md', '--json']);

  assert.equal(result.status, 2);
  assert.equal(result.json.totalTokens, 0);
  assert.equal(result.json.missingCount, 1);
  assert.deepEqual(result.json.missingFiles, ['missing.md']);
  assert.match(result.json.problems.join('\n'), /missing\.md/);
});

test('rejects missing and invalid option values with usage status 2', () => {
  const root = makeFixture({ 'present.md': '# Present\n' });
  const invalidArgs = [
    ['--files'],
    ['--files', ''],
    ['--files', ', ,'],
    ['--max-tokens'],
    ['--max-tokens', '0'],
    ['--max-tokens', '-1'],
    ['--max-tokens', '1.5'],
    ['--max-tokens', 'not-a-number'],
    ['--max-tokens', 'Infinity'],
    ['--history-warn'],
    ['--history-warn', '-1'],
    ['--history-warn', '100.1'],
    ['--history-warn', 'not-a-number'],
    ['--history-warn', 'Infinity'],
    ['--unknown-option'],
  ];

  for (const args of invalidArgs) {
    const result = runBudget(root, ['--files', 'present.md', ...args]);
    assert.equal(result.status, 2, `expected status 2 for ${args.join(' ')}`);
    assert.equal(result.json, null);
    assert.match(result.stderr, /Usage: node measure-boot-budget\.js/);
  }
});

test('counts dated entry bodies, change-log sections, and repeated ledger bodies', () => {
  const contents = [
    '# Guide',
    '',
    '**Last Updated:** 2026-09-22',
    '',
    '## Entries',
    '### 2026-09-22 — Current',
    'The dated entry body is history, not an instruction.',
    '#### Detail',
    'Nested dated-entry detail is also history.',
    '### 2026-09-21 — Previous',
    'The second dated entry body is history too.',
    '',
    '## Freshness',
    '**Change (previous):** first ledger entry',
    'The first ledger body remains available for audit.',
    '**Change (previous):** second ledger entry',
    'The second ledger body remains available for audit.',
    '**Change (previous):** third ledger entry',
    'The third ledger body remains available for audit.',
    '',
    '## Change Log',
    'A named change-log section has history content.',
    'It ends at the next same-level heading.',
    '',
    '## Current Guidance',
    'This instruction is not history.',
    '',
  ].join('\n');
  const root = makeFixture({ 'history.md': contents });
  const result = runBudget(root, ['--files', 'history.md', '--json']);
  const row = result.json.files[0];

  assert.equal(result.status, 0);
  assert.equal(row.ledgerEntries, 3);
  assert.ok(row.historyChars > contents.indexOf('## Entries'));
  assert.ok(row.historyChars > 200, `expected history body characters, got ${row.historyChars}`);
  assert.ok(row.historyChars < row.chars, 'current guidance should remain outside history');
  assert.ok(row.historyPct > 25);
  assert.equal(typeof row.historyChars, 'number');
});

test('does not combine ledger entries from separate sections', () => {
  const root = makeFixture({
    'split-ledger.md': [
      '# Guide',
      '## First Section',
      '**Change (previous):** first',
      '**Change (previous):** second',
      '## Second Section',
      '**Change (previous):** third',
      '## Current Guidance',
      'Instruction only.',
      '',
    ].join('\n'),
  });
  const result = runBudget(root, ['--files', 'split-ledger.md', '--json']);
  const row = result.json.files[0];

  assert.equal(result.status, 0);
  assert.equal(row.ledgerEntries, 0);
  assert.equal(row.historyChars, 0);
});

test('does not inflate history for Last Updated metadata alone', () => {
  const root = makeFixture({
    'metadata.md': '# Guide\n\n**Last Updated:** 2026-09-22\n\nInstruction only.\n',
  });
  const result = runBudget(root, ['--files', 'metadata.md', '--json']);

  assert.equal(result.status, 0);
  assert.equal(result.json.files[0].historyChars, 0);
  assert.equal(result.json.files[0].historyPct, 0);
});

test('counts an ordinary dated example as one line, not as a history section', () => {
  const datedExample = '2026-09-22 is an example date, not an entry heading.';
  const contents = `${datedExample}\nThe following instruction is not dated history.\n`;
  const root = makeFixture({ 'example.md': contents });
  const result = runBudget(root, ['--files', 'example.md', '--json']);

  assert.equal(result.status, 0);
  assert.equal(result.json.files[0].historyChars, datedExample.length + 1);
  assert.ok(result.json.files[0].historyChars < contents.length);
});

test('counts overlapping history detections once', () => {
  const historyBody = [
    '## Change Log',
    '### 2026-09-22 — Current',
    'Dated body inside the named history section.',
    '**Change (previous):** first ledger entry',
    '**Change (previous):** second ledger entry',
    '**Change (previous):** third ledger entry',
    '',
  ].join('\n');
  const contents = `${historyBody}## Guidance\nInstruction only.\n`;
  const root = makeFixture({ 'overlap.md': contents });
  const result = runBudget(root, ['--files', 'overlap.md', '--json']);

  assert.equal(result.status, 0);
  assert.equal(result.json.files[0].historyChars, historyBody.length);
});

test('fails a deliberately over-budget fixture in strict mode', () => {
  const root = makeFixture({ 'broken.md': '# A deliberately measured document\n' });
  const reportOnly = runBudget(root, ['--files', 'broken.md', '--max-tokens', '1', '--json']);
  const strict = runBudget(root, ['--files', 'broken.md', '--max-tokens', '1', '--strict', '--json']);

  assert.equal(reportOnly.status, 0);
  assert.ok(reportOnly.json.problems.length > 0);
  assert.equal(strict.status, 1);
  assert.match(strict.json.problems.join('\n'), /tokens/);
});

/** The instrument's default reading set, split by the doctrine's own load policy. */
const CHAIN = ['AGENTS.md', 'WORLD.md', 'README.md'];
const MENU = [
  'DEVTOOLS.md',
  'docs/PRD.md',
  'docs/ROADMAP.md',
  'docs/AI_ARCHITECTURE.md',
  'docs/DATA_POLICY.md',
  'docs/RUNBOOKS.md',
  'docs/adr/README.md',
  'docs/STATE_TRANSITION_MATRIX.md',
  'docs/DECISIONS.md',
];

/** A corpus that satisfies the default list, with a deliberately heavy on-demand spec. */
function defaultCorpus() {
  const files = {};
  for (const rel of [...CHAIN, ...MENU]) files[rel] = `# ${rel}\n\nInstruction.\n`;
  // Heavy, but in short lines: a long paragraph would trip the unwrappable-prose finding
  // and mask the budget behaviour this fixture exists to exercise.
  files['docs/PRD.md'] = `# Spec\n\n${'xxxx\n'.repeat(800)}`;
  return files;
}

test('charges the mode budget for the always-read chain, not the on-demand menu', () => {
  const root = makeFixture(defaultCorpus());
  const json = runBudget(root, ['--json']).json;

  assert.equal(json.missingCount, 0);
  assert.deepEqual(json.files.map((file) => file.rel), CHAIN);
  assert.deepEqual([...json.onDemand.map((file) => file.rel)].sort(), [...MENU].sort());
  assert.ok(json.onDemandTokens > 1000, `expected the menu to carry the spec, got ${json.onDemandTokens}`);
  assert.ok(json.totalTokens < 100, `the chain is three short files, got ${json.totalTokens}`);
});

test('the menu is not charged to the chain budget (reversal proof)', () => {
  const root = makeFixture(defaultCorpus());
  const measured = runBudget(root, ['--json']).json;
  const budget = String(measured.totalTokens);

  // As declared: three short files, so the budget fits and strict mode passes.
  const declared = runBudget(root, ['--max-tokens', budget, '--strict', '--json']);
  assert.equal(declared.status, 0);

  // The reversal: the SAME budget with every document treated as chain — the behaviour
  // this split replaced — must fail. A test that passed both ways would prove nothing.
  const allAsChain = runBudget(root, [
    '--files', [...CHAIN, ...MENU].join(','),
    '--max-tokens', budget,
    '--strict',
    '--json',
  ]);
  assert.equal(allAsChain.status, 1);
  assert.match(allAsChain.json.problems.join('\n'), /chain ~\d+ tokens > budget/);
});

test('reports the chain and the menu as separate sections in the human output', () => {
  const root = makeFixture(defaultCorpus());
  const result = runBudget(root, []);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /BOOT CHAIN — read every session, charged to the mode budget/);
  assert.match(result.stdout, /ON-DEMAND MENU — read by choice, NOT charged to the mode budget/);
  assert.match(result.stdout, /chain total: ~\d+ tokens/);
  assert.match(result.stdout, /menu total: ~\d+ tokens across 9 document\(s\)/);
});

test('an absent menu file is a note, an absent chain file is a failure', () => {
  // Only the three chain documents exist: the whole menu is absent.
  const root = makeFixture({
    'AGENTS.md': '# Rules\n\nInstruction.\n',
    'WORLD.md': '# Product\n\n- **mode:** `vibe`\n',
    'README.md': '# Readme\n\nInstruction.\n',
  });
  const json = runBudget(root, ['--cap-from-mode', '--strict', '--json']).json;

  // Nine absent menu documents do not fail the check...
  assert.equal(json.missingMenuFiles.length, 9);
  assert.deepEqual(json.missingFiles, []);
  assert.deepEqual(json.problems, []);

  // ...but the same absence in the chain does. Same corpus, one file moved into the floor.
  const chainGap = runBudget(root, ['--files', 'AGENTS.md,GHOST.md', '--strict', '--json']);
  assert.equal(chainGap.status, 1);
  assert.match(chainGap.json.problems.join('\n'), /GHOST\.md: file not found/);
});

test('a long paragraph is an advisory, never a failure', () => {
  const root = makeFixture({
    'AGENTS.md': `# Rules\n\n${'word '.repeat(200)}\n`,
    'WORLD.md': '# Product\n\n- **mode:** `vibe`\n',
    'README.md': '# Readme\n\nInstruction.\n',
  });

  const json = runBudget(root, ['--cap-from-mode', '--strict', '--json']).json;
  assert.deepEqual(json.problems, []);
  assert.equal(json.advisories.length, 1);
  assert.match(json.advisories[0], /paragraph of \d+ chars/);

  // The same input under --strict still exits 0: readability never gates a milestone.
  const strict = runBudget(root, ['--cap-from-mode', '--strict']);
  assert.equal(strict.status, 0);
  assert.match(strict.stdout, /readability note\(s\) — never fatal/);
});

test('--cap-from-mode resolves the cap from the declared mode', () => {
  const root = makeFixture({
    ...defaultCorpus(),
    'WORLD.md': '# Product\n\n- **mode:** `guarded`\n',
  });
  const json = runBudget(root, ['--cap-from-mode', '--json']).json;

  assert.equal(json.mode, 'guarded');
  assert.equal(json.maxTokens, 160000);
});

test('--cap-from-mode defaults to standard, never vibe, when WORLD.md is silent', () => {
  const root = makeFixture(defaultCorpus());
  const json = runBudget(root, ['--cap-from-mode', '--json']).json;

  assert.equal(json.mode, 'standard');
  assert.equal(json.maxTokens, 90000);
});

test('--cap-from-mode and --max-tokens are mutually exclusive', () => {
  const root = makeFixture(defaultCorpus());
  const result = runBudget(root, ['--cap-from-mode', '--max-tokens', '1']);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /mutually exclusive/);
});

test('the resolved cap follows the mode (reversal proof)', () => {
  // ~50K tokens in one file: over the vibe cap, comfortably inside the guarded one.
  const heavy = `# Rules\n\n${'xxxx\n'.repeat(40000)}`;
  const root = makeFixture({
    'AGENTS.md': heavy,
    'WORLD.md': '# Product\n\n- **mode:** `vibe`\n',
  });

  const vibe = runBudget(root, ['--files', 'AGENTS.md,WORLD.md', '--cap-from-mode', '--strict', '--json']);
  assert.equal(vibe.status, 1);
  assert.match(vibe.json.problems.join('\n'), /tokens > budget 40000/);

  // The same corpus under `guarded` is within its cap: the number moved with the mode,
  // which is the whole point of deriving it instead of typing it into package.json.
  fs.writeFileSync(path.join(root, 'WORLD.md'), '# Product\n\n- **mode:** `guarded`\n', 'utf8');
  const guarded = runBudget(root, ['--files', 'AGENTS.md,WORLD.md', '--cap-from-mode', '--strict', '--json']);
  assert.equal(guarded.status, 0);
});
