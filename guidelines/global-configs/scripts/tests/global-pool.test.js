const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { globalPoolSkills } = require('../lib/plan-skills.js');
const { SKILL_FILE, listSkills } = require('../lib/skill-files.js');
const { staleness } = require('../check-fleet-staleness.js');
const { expandTarget, plannedFor } = require('../sync-global-skills.js');

/** A source corpus with a tagged (scoped) and an untagged (agnostic) skill. */
function corpus() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'global-pool-src-'));
  fs.mkdirSync(path.join(dir, 'agnostic'));
  fs.writeFileSync(path.join(dir, 'agnostic', SKILL_FILE), '---\nname: agnostic\ndescription: d\n---\n');
  fs.mkdirSync(path.join(dir, 'scoped'));
  fs.writeFileSync(path.join(dir, 'scoped', SKILL_FILE), '---\nname: scoped\ndescription: d\nmetadata:\n  tags: [tailwind]\n---\n');
  return dir;
}

test('globalPoolSkills selects exactly the skills that name no technology', () => {
  const src = corpus();
  const plan = globalPoolSkills(src);
  assert.deepEqual(plan.copy.map((r) => r.name), ['agnostic']);
  assert.deepEqual(plan.skip.map((r) => r.name), ['scoped']);
  assert.ok(plan.copy[0].reason.includes('stack-agnostic'));
  assert.ok(plan.skip[0].reason.includes('stack-scoped'));
});

test('appliesTo: any is a DECLARED stack-agnostic skill — it lands in the pool despite a technology tag', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'global-pool-src-'));
  fs.mkdirSync(path.join(dir, 'declared-agnostic'));
  fs.writeFileSync(
    path.join(dir, 'declared-agnostic', SKILL_FILE),
    '---\nname: declared-agnostic\ndescription: d\nmetadata:\n  appliesTo: any\n  tags: [tailwind]\n---\n'
  );
  const plan = globalPoolSkills(dir);
  assert.deepEqual(plan.copy.map((r) => r.name), ['declared-agnostic']);
  assert.equal(plan.copy[0].basis, 'appliesTo', 'the declaration wins over the tag inference');
  assert.deepEqual(plan.copy[0].scope, []);
});

test('globalPoolSkills reports an unresolvable appliesTo rather than silently universalising it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'global-pool-src-'));
  fs.mkdirSync(path.join(dir, 'typo'));
  fs.writeFileSync(
    path.join(dir, 'typo', SKILL_FILE),
    '---\nname: typo\ndescription: d\nmetadata:\n  appliesTo: [mooi]\n---\n'
  );
  const plan = globalPoolSkills(dir);
  // `mooi` resolves to nothing, the tags give nothing — the skill lands in the pool, but the row
  // CARRIES the unknown token so the CLI prints the warning and the operator fixes the typo.
  assert.deepEqual(plan.copy.map((r) => r.name), ['typo']);
  assert.deepEqual(plan.copy[0].unknownTokens, ['mooi']);
});

test('plannedFor maps plan rows to `{name, entry}` pairs the store writer accepts', () => {
  const src = corpus();
  const planned = plannedFor(globalPoolSkills(src));
  assert.equal(planned.length, 1);
  assert.equal(planned[0].name, 'agnostic');
  assert.ok(fs.existsSync(planned[0].entry), 'entry resolves');
  assert.deepEqual(listSkills(src).length, 2);
});

test('expandTarget resolves a manifest `~` target against the user profile, an absolute one verbatim', () => {
  assert.equal(expandTarget('~'), os.homedir());
  assert.equal(expandTarget('~/.agents/skills'), path.join(os.homedir(), '.agents', 'skills'));
  const abs = path.join(os.tmpdir(), 'some-store');
  assert.equal(expandTarget(abs), path.resolve(abs));
});

test('staleness verdicts are per-artifact and never invented', () => {
  const source = { hash: 'src', count: 1 };
  const skills = { hash: 'sk', count: 1 };
  assert.deepEqual(
    staleness({ name: 'p', contentHash: 'src', skillsHash: 'sk' }, source, skills),
    { name: 'p', guidelines: 'current', skills: 'current', lastSynced: null }
  );
  assert.equal(staleness({ name: 'p', contentHash: 'old', skillsHash: 'sk' }, source, skills).guidelines, 'behind');
  assert.equal(staleness({ name: 'p', skillsHash: 'old' }, source, skills).skills, 'behind');
  assert.equal(staleness({ name: 'p' }, source, skills).guidelines, 'never recorded');
  // No skills corpus declared → the skills verdict says so rather than guessing a comparison.
  assert.equal(staleness({ name: 'p', contentHash: 'src' }, source, null).skills, 'not declared');
});
