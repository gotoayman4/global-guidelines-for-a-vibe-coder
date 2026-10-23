const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { judge, readAllowlist, gatedAdvisories, expired, auditEnv, ALLOWLIST } = require('../audit-gate.js');

const NOW = new Date('2026-10-23T00:00:00Z');

function report(overrides = {}) {
  return {
    metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } },
    vulnerabilities: {},
    ...overrides,
  };
}

function advisory(url, severity, title = 'a thing') {
  return { url, severity, title };
}

test('a high advisory with no allowlist entry blocks the gate', () => {
  const judged = judge(report({ vulnerabilities: { lodash: { via: [advisory('GHSA-aaaa-bbbb-cccc', 'high')] } } }), {}, NOW);
  assert.equal(judged.blocking.length, 1);
  assert.match(judged.blocking[0], /GHSA-aaaa-bbbb-cccc/);
  assert.equal(judged.tolerated.length, 0);
});

test('a moderate advisory is reported, never gated', () => {
  const judged = judge(report({ vulnerabilities: { lodash: { via: [advisory('GHSA-aaaa-bbbb-cccc', 'moderate')] } } }), {}, NOW);
  assert.equal(judged.blocking.length, 0);
  assert.equal(judged.tolerated.length, 0);
});

test('an allowlisted advisory is tolerated while its review date holds', () => {
  const entries = { 'GHSA-aaaa-bbbb-cccc': { why: 'no upstream fix', reviewBy: '2026-12-31' } };
  const judged = judge(report({ vulnerabilities: { lodash: { via: [advisory('GHSA-aaaa-bbbb-cccc', 'high')] } } }), entries, NOW);
  assert.equal(judged.blocking.length, 0);
  assert.equal(judged.tolerated.length, 1);
  assert.match(judged.tolerated[0], /tolerated until 2026-12-31/);
});

test('an expired allowlist entry blocks the gate while the advisory is still reported', () => {
  const entries = { 'GHSA-aaaa-bbbb-cccc': { why: 'no upstream fix', reviewBy: '2026-01-31' } };
  const judged = judge(report({ vulnerabilities: { lodash: { via: [advisory('GHSA-aaaa-bbbb-cccc', 'high')] } } }), entries, NOW);
  assert.equal(judged.blocking.length, 1);
  assert.match(judged.blocking[0], /expired 2026-01-31/);
});

test('an expired entry whose advisory is gone is stale clutter, not a failure', () => {
  const entries = { 'GHSA-gone-gone-gone': { why: 'old', reviewBy: '2026-01-31' } };
  const judged = judge(report(), entries, NOW);
  assert.equal(judged.blocking.length, 0);
  assert.equal(judged.stale.length, 1);
  assert.match(judged.stale[0], /delete it/);
});

test('the advisory URL is the key, so one package with two advisories needs two entries', () => {
  const found = gatedAdvisories(
    report({
      vulnerabilities: {
        lodash: { via: [advisory('GHSA-one', 'high'), advisory('GHSA-two', 'critical')] },
      },
    }),
  );
  assert.equal(found.size, 2);
  const judged = judge(
    report({
      vulnerabilities: {
        lodash: { via: [advisory('GHSA-one', 'high'), advisory('GHSA-two', 'critical')] },
      },
    }),
    { 'GHSA-one': { why: 'accepted', reviewBy: '2027-01-01' } },
    NOW,
  );
  assert.equal(judged.tolerated.length, 1);
  assert.equal(judged.blocking.length, 1, 'the second advisory is not accepted');
  assert.match(judged.blocking[0], /GHSA-two/);
});

test('a malformed allowlist fails closed — a policy nobody can read is a policy nobody enforces', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-allowlist-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, ALLOWLIST), '{ not json', 'utf8');
  const read = readAllowlist(root);
  assert.equal(read.error !== null, true);
  assert.match(read.error, /not valid JSON/);

  fs.writeFileSync(path.join(root, ALLOWLIST), JSON.stringify({ 'GHSA-x': { reviewBy: '2027-01-01' } }), 'utf8');
  const noWhy = readAllowlist(root);
  assert.equal(noWhy.error !== null, true);
  assert.match(noWhy.error, /no "why"/);
});

test('a missing allowlist means no accepted risks, and is reported rather than failed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-allowlist-'));
  const read = readAllowlist(root);
  assert.equal(read.error, null);
  assert.equal(read.present, false);
  assert.deepEqual(read.entries, {});
});

test('a comment key in the allowlist is not an advisory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-allowlist-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.writeFileSync(
    path.join(root, ALLOWLIST),
    JSON.stringify({ _comment: 'Accepted dependency risks, keyed by advisory URL.' }),
    'utf8',
  );
  const read = readAllowlist(root);
  assert.equal(read.error, null);
  assert.deepEqual(Object.keys(read.entries), ['_comment']);
});

test('an entry with no review date never expires; an unparseable one expires at once', () => {
  assert.equal(expired({ why: 'x' }, NOW), false);
  assert.equal(expired({ why: 'x', reviewBy: 'not-a-date' }, NOW), true);
  assert.equal(expired({ why: 'x', reviewBy: '2026-10-22' }, NOW), true);
  assert.equal(expired({ why: 'x', reviewBy: '2026-10-24' }, NOW), false);
});

test('the child environment drops the config npm rejects and pins script execution off', () => {
  const env = auditEnv();
  assert.equal(env.npm_config_allow_scripts, undefined);
  assert.equal(env.npm_config_ignore_scripts, 'true');
});
