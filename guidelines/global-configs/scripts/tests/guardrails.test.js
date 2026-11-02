const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { runSync } = require('../lib/run-sync.js');
const { evaluate, commandFromHookJson } = require('../guard-command.js');
const { scanText, scanDiff } = require('../scan-secrets.js');

const GUARD = path.join(__dirname, '..', 'guard-command.js');

const BLOCKED = [
  ['git reset --hard', 'git-reset-hard'],
  ['git -C app reset --hard HEAD~1', 'git-reset-hard'],
  ['git checkout -- src/a.ts', 'git-checkout-discard'],
  ['git restore .', 'git-checkout-discard'],
  ['git clean -fd', 'git-clean-force'],
  ['git push --force origin main', 'git-force-push'],
  ['git push -f', 'git-force-push'],
  ['git commit -m "x" --no-verify', 'no-verify'],
  ['git push --no-verify', 'no-verify'],
  ['git add -A', 'git-add-all'],
  ['git add .', 'git-add-all'],
  ['rm -rf /', 'rm-rf-broad'],
  ['rm -rf ~', 'rm-rf-broad'],
  ['npm test && git reset --hard', 'git-reset-hard'],
  ['bash -c "git clean -fdx"', 'git-clean-force'],
  ['npx prisma migrate reset', 'db-destructive'],
  ['Remove-Item -Recurse -Force .', 'remove-item-broad'],
];

const ALLOWED = [
  'git status',
  'git add src/a.ts docs/b.md',
  'git commit -m "docs: explain why git reset --hard and --no-verify are forbidden"',
  'git checkout main',
  'git checkout -b feature/x',
  'git push --force-with-lease origin feature/x',
  'git push origin main',
  'git clean -n',
  'rm -rf node_modules',
  'rm -rf dist/',
  'npm run lint -- --fix',
  'Remove-Item -Recurse -Force .\\build',
];

for (const [cmd, id] of BLOCKED) {
  test(`guard blocks: ${cmd}`, () => {
    const r = evaluate(cmd);
    assert.equal(r.blocked, true, `expected block for: ${cmd}`);
    assert.equal(r.id, id);
  });
}

for (const cmd of ALLOWED) {
  test(`guard allows: ${cmd}`, () => {
    assert.equal(evaluate(cmd).blocked, false, `expected allow for: ${cmd}`);
  });
}

test('an explicit, named override allows exactly that rule and no other', () => {
  assert.equal(evaluate('git reset --hard', { allow: ['git-reset-hard'] }).blocked, false);
  assert.equal(evaluate('git clean -fd', { allow: ['git-reset-hard'] }).blocked, true);
});

test('hook JSON: the command is read from tool_input; garbage falls through', () => {
  assert.equal(commandFromHookJson('{"tool_name":"Bash","tool_input":{"command":"ls"}}'), 'ls');
  assert.equal(commandFromHookJson('not json'), null);
});

test('CLI exit codes follow the hook convention: 2 blocks, 0 allows', () => {
  const blocked = runSync(process.execPath, [GUARD, '--command', 'git reset --hard']);
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /BLOCKED by constitution guardrail \[git-reset-hard\]/);
  const ok = runSync(process.execPath, [GUARD, '--command', 'git status']);
  assert.equal(ok.status, 0);
  const overridden = runSync(process.execPath, [GUARD, '--command', 'git reset --hard'], { env: { ...process.env, GUARD_ALLOW: 'git-reset-hard' } });
  assert.equal(overridden.status, 0);
});

// Credentials are assembled at runtime so this file never trips the repo's own scanner.
const awsKey = 'AK' + 'IA' + 'ABCDEFGHIJKLMNOP';
const ghToken = 'gh' + 'p_' + 'a'.repeat(36);
const stripe = 'sk_' + 'live_' + 'a1B2c3D4e5F6g7H8';

test('scanText finds high-confidence credentials and redacts the value', () => {
  for (const [line, id] of [
    [`const k = "${awsKey}";`, 'aws-access-key'],
    [`token: ${ghToken}`, 'github-token'],
    [`key=${stripe}`, 'stripe-live-key'],
    ['-----BEGIN RSA PRIVATE ' + 'KEY-----', 'private-key'],
    ['DB=postgres://admin:hunter2hunter2@db.internal/app', 'url-credentials'],
    ['const api_key = "a8f3k29dk39dk29dkd02";', 'assigned-secret'],
  ]) {
    const f = scanText(line, 'x.ts');
    assert.equal(f.length, 1, line);
    assert.equal(f[0].id, id);
    assert.doesNotMatch(JSON.stringify(f), /hunter2|a8f3k29|ABCDEFGHIJ/, 'the value is never echoed back');
  }
});

test('scanText ignores env lookups, placeholders and an explicit allow marker', () => {
  for (const line of [
    'const k = process.env.API_KEY;',
    'api_key = "your-api-key-goes-here"',
    'password: "changeme-changeme"',
    `const doc = "${awsKey}"; // secretscan:allow`,
    'const apiKey = getKey();',
  ]) {
    assert.deepEqual(scanText(line, 'x.ts'), [], line);
  }
});

test('scanDiff reads only ADDED lines, with real line numbers, and skips .env.example and lockfiles', () => {
  const diff = [
    'diff --git a/src/a.ts b/src/a.ts',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1,2 +10,3 @@',
    ` const old = "${awsKey}";`,
    '+const fine = 1;',
    `+const bad = "${awsKey}";`,
    'diff --git a/.env.example b/.env.example',
    '--- a/.env.example',
    '+++ b/.env.example',
    '@@ -0,0 +1 @@',
    `+KEY=${awsKey}`,
  ].join('\n');
  const f = scanDiff(diff);
  assert.equal(f.length, 1);
  assert.deepEqual([f[0].file, f[0].line, f[0].id], ['src/a.ts', 11, 'aws-access-key']);
});
