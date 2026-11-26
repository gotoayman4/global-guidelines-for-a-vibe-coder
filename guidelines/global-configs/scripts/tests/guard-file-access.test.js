const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkFileAccess, checkPostEdit, isProtectedCredentialFile } = require('../guard-file-access.js');

const FAKE_OPENAI = 'sk-proj-' + 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'guard-file-'));
}

test('isProtectedCredentialFile blocks .env and private keys but allows .env.example', () => {
  assert.equal(isProtectedCredentialFile('.env'), true);
  assert.equal(isProtectedCredentialFile('apps/api/.env.production'), true);
  assert.equal(isProtectedCredentialFile('certs/dev.pem'), true);
  assert.equal(isProtectedCredentialFile('config/firebase-adminsdk-abc.json'), true);

  assert.equal(isProtectedCredentialFile('.env.example'), false);
  assert.equal(isProtectedCredentialFile('.env.sample'), false);
  assert.equal(isProtectedCredentialFile('tests/fixtures/test.key'), false);
  assert.equal(isProtectedCredentialFile('src/config.ts'), false);
});

test('checkFileAccess blocks Read on .env and Write containing a real secret', () => {
  const readEnv = checkFileAccess({ tool_name: 'Read', tool_input: { file_path: '/app/.env.local' } }, new Set());
  assert.equal(readEnv.blocked, true);
  assert.equal(readEnv.id, 'secret-file-access');

  const writeSecret = checkFileAccess(
    {
      tool_name: 'Write',
      tool_input: { file_path: '/app/src/cfg.js', content: `export const k = "${FAKE_OPENAI}";\n` },
    },
    new Set()
  );
  assert.equal(writeSecret.blocked, true);
  assert.equal(writeSecret.id, 'secret-in-write');

  const writePlaceholder = checkFileAccess(
    {
      tool_name: 'Write',
      tool_input: { file_path: '/app/src/cfg.js', content: 'export const k = process.env.OPENAI_API_KEY;\n' },
    },
    new Set()
  );
  assert.equal(writePlaceholder.blocked, false);
});

test('checkFileAccess respects GUARD_ALLOW and Read on normal source', () => {
  const allowed = checkFileAccess(
    { tool_name: 'Read', tool_input: { file_path: '/app/.env' } },
    new Set(['secret-file-access'])
  );
  assert.equal(allowed.blocked, false);

  const readNormal = checkFileAccess(
    { tool_name: 'Read', tool_input: { file_path: '/app/src/app.ts' } },
    new Set()
  );
  assert.equal(readNormal.blocked, false);
});

test('checkPostEdit flags broken JS syntax and invalid JSON, skips tsconfig JSONC, passes clean JS', () => {
  const dir = tmpDir();
  const brokenJs = path.join(dir, 'broken.js');
  fs.writeFileSync(brokenJs, 'const x = {;\n', 'utf8');
  const resBroken = checkPostEdit({ tool_name: 'Write', tool_input: { file_path: brokenJs } }, new Set());
  assert.equal(resBroken.errors.length, 1);
  assert.equal(resBroken.errors[0].id, 'syntax-check');

  const cleanJs = path.join(dir, 'clean.js');
  fs.writeFileSync(cleanJs, 'const x = 1;\nmodule.exports = { x };\n', 'utf8');
  const resClean = checkPostEdit({ tool_name: 'Write', tool_input: { file_path: cleanJs } }, new Set());
  assert.equal(resClean.errors.length, 0);

  const badJson = path.join(dir, 'bad.json');
  fs.writeFileSync(badJson, '{ broken', 'utf8');
  const resJson = checkPostEdit({ tool_name: 'Edit', tool_input: { file_path: badJson } }, new Set());
  assert.equal(resJson.errors[0].id, 'syntax-check');

  const tsconfig = path.join(dir, 'tsconfig.json');
  fs.writeFileSync(tsconfig, '// JSONC comment\n{ "compilerOptions": {} }\n', 'utf8');
  const resTsconfig = checkPostEdit({ tool_name: 'Edit', tool_input: { file_path: tsconfig } }, new Set());
  assert.equal(resTsconfig.errors.length, 0);
});
