const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

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
  const result = childProcess.spawnSync(process.execPath, [SCRIPT, root, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
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
  });
  assert.match(reportOnly.json.problems.join('\n'), /missing\.md/);

  const human = runBudget(root, ['--files', 'present.md,missing.md']);
  assert.equal(human.status, 0);
  assert.match(human.stdout, /missing\.md\s+— \(not present\)/);
  assert.match(human.stdout, /missing files: 1/);
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
