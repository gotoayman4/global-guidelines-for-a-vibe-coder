const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { SKILL_FILE, listSkills } = require('../lib/skill-files.js');
const { materialiseStore, verifyStore, markerNameFor, readMarker } = require('../lib/skill-stores.js');

/**
 * A source skills tree built from a spec: `agnostic` skills carry no technology token (the
 * machine-global pool's selection), `scoped` ones carry a `tailwind` tag. Every skill is the
 * standard layout with one companion reference, so payload delivery (not just the entry file)
 * is exercised.
 */
function sourceSkills({ agnostic = [], scoped = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-stores-src-'));
  const fm = (name, extra) => `---\nname: ${name}\ndescription: d ${name}\n${extra}---\nbody ${name}\n`;
  for (const name of agnostic) {
    fs.mkdirSync(path.join(dir, name, 'references'), { recursive: true });
    fs.writeFileSync(path.join(dir, name, SKILL_FILE), fm(name, ''));
    fs.writeFileSync(path.join(dir, name, 'references', 'note.md'), `note for ${name}\n`);
  }
  for (const name of scoped) {
    fs.mkdirSync(path.join(dir, name), { recursive: true });
    fs.writeFileSync(path.join(dir, name, SKILL_FILE), fm(name, 'metadata:\n  tags: [tailwind]\n'));
  }
  return dir;
}

/** The planned list a caller derives from a source root, as `{name, entry}`. */
function planAll(sourceRoot) {
  return listSkills(sourceRoot).map((s) => ({ name: s.name, entry: s.abs }));
}

test('markerNameFor derives the tool identity from the parent directory', () => {
  assert.equal(markerNameFor(path.join('x', '.agents', 'skills')), '.agents-skill-sync.json');
  assert.equal(markerNameFor(path.join(os.homedir(), '.zcode', 'skills')), '.zcode-skill-sync.json');
});

test('materialiseStore writes the whole payload plus a marker naming exactly what it delivered', () => {
  const src = sourceSkills({ agnostic: ['alpha'] });
  const store = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'skill-stores-out-')), 'skills');
  const result = materialiseStore(store, planAll(src), { sourceRoot: src });
  assert.deepEqual(result.refused, null);
  assert.deepEqual(result.copied.sort(), ['alpha/SKILL.md', 'alpha/references/note.md']);
  assert.ok(fs.existsSync(path.join(store, 'alpha', 'references', 'note.md')), 'companion delivered');
  const marker = readMarker(store);
  assert.deepEqual(marker.names, ['alpha']);
  assert.equal(path.resolve(marker.source), path.resolve(src));
});

test('materialiseStore is idempotent — a second run rewrites nothing', () => {
  const src = sourceSkills({ agnostic: ['alpha'] });
  const store = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'skill-stores-out-')), 'skills');
  materialiseStore(store, planAll(src), { sourceRoot: src });
  const markerBefore = fs.readFileSync(path.join(store, markerNameFor(store)), 'utf8');
  const second = materialiseStore(store, planAll(src), { sourceRoot: src });
  assert.deepEqual(second.copied, []);
  assert.equal(second.removed.length, 0);
  assert.equal(second.marker, 'unchanged');
  assert.equal(fs.readFileSync(path.join(store, markerNameFor(store)), 'utf8'), markerBefore);
});

test('materialiseStore refuses a store that holds skills but no marker, and writes nothing', () => {
  const src = sourceSkills({ agnostic: ['alpha'] });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-stores-out-'));
  const store = path.join(root, 'skills');
  fs.mkdirSync(store);
  fs.mkdirSync(path.join(store, 'theirs'));
  fs.writeFileSync(path.join(store, 'theirs', SKILL_FILE), '---\nname: theirs\ndescription: theirs\n---\ntheirs\n');

  const result = materialiseStore(store, planAll(src), { sourceRoot: src });
  assert.ok(result.refused, 'refused');
  assert.deepEqual(result.refused.foreign, ['theirs']);
  assert.deepEqual(result.copied, [], 'nothing written');
  assert.ok(!fs.existsSync(path.join(store, 'alpha')), 'foreign store untouched');
  assert.ok(!fs.existsSync(path.join(store, markerNameFor(store))), 'no marker claimed');
});

test('adopt coexists: foreign bytes survive, collisions are skipped, the marker claims only ours', () => {
  const src = sourceSkills({ agnostic: ['alpha', 'beta'] });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-stores-out-'));
  const store = path.join(root, 'skills');
  // A foreign `alpha` with bytes that are NOT the source's — the user's own skill of the same name.
  fs.mkdirSync(path.join(store, 'alpha'), { recursive: true });
  fs.writeFileSync(path.join(store, 'alpha', SKILL_FILE), '---\nname: alpha\ndescription: the user own\n---\ntheirs\n');

  const result = materialiseStore(store, planAll(src), { sourceRoot: src, adopt: true });
  assert.deepEqual(result.refused, null);
  assert.deepEqual(result.collisions, ['alpha'], 'collision named, never overwritten');
  assert.equal(fs.readFileSync(path.join(store, 'alpha', SKILL_FILE), 'utf8').includes('the user own'), true, 'foreign bytes intact');
  assert.deepEqual(readMarker(store).names, ['beta'], 'marker claims only what we delivered');
  assert.ok(fs.existsSync(path.join(store, 'beta', SKILL_FILE)), 'non-colliding skill written');
});

test('materialiseStore prunes an owned skill the plan dropped, and never a foreign one', () => {
  const src = sourceSkills({ agnostic: ['alpha', 'beta'] });
  const store = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'skill-stores-out-')), 'skills');
  materialiseStore(store, planAll(src), { sourceRoot: src });

  const narrowed = planAll(src).filter((p) => p.name !== 'alpha');
  fs.mkdirSync(path.join(store, 'foreign')); // unmarked foreign dir beside ours
  fs.writeFileSync(path.join(store, 'foreign', 'notes.md'), 'not a skill, not ours\n');

  const result = materialiseStore(store, narrowed, { sourceRoot: src });
  assert.ok(!fs.existsSync(path.join(store, 'alpha')), 'owned-and-dropped pruned');
  assert.ok(fs.existsSync(path.join(store, 'foreign', 'notes.md')), 'foreign untouched');
  assert.deepEqual(readMarker(store).names, ['beta']);
  assert.ok(result.removed.includes('alpha/SKILL.md'));
});

test('materialiseStore removes a companion the source no longer carries inside an owned skill', () => {
  const src = sourceSkills({ agnostic: ['alpha'] });
  const store = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'skill-stores-out-')), 'skills');
  materialiseStore(store, planAll(src), { sourceRoot: src });
  fs.unlinkSync(path.join(src, 'alpha', 'references', 'note.md'));

  const result = materialiseStore(store, planAll(src), { sourceRoot: src });
  assert.ok(result.removed.includes('alpha/references/note.md'), 'stale companion pruned');
  assert.ok(!fs.existsSync(path.join(store, 'alpha', 'references', 'note.md')));
});

test('verifyStore: absent, unmanaged, sync and drift are the four verdicts that matter', () => {
  const src = sourceSkills({ agnostic: ['alpha', 'beta'] });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-stores-out-'));

  assert.equal(verifyStore(path.join(root, 'absent'), planAll(src)).state, 'absent');

  const unmanaged = path.join(root, 'unmanaged');
  fs.mkdirSync(unmanaged);
  assert.equal(verifyStore(unmanaged, planAll(src)).state, 'absent', 'an empty dir is absence, not ownership');
  fs.mkdirSync(path.join(unmanaged, 'theirs'));
  fs.writeFileSync(path.join(unmanaged, 'theirs', SKILL_FILE), 'theirs\n');
  assert.equal(verifyStore(unmanaged, planAll(src)).state, 'unmanaged');

  const store = path.join(root, 'managed');
  materialiseStore(store, planAll(src), { sourceRoot: src });
  assert.equal(verifyStore(store, planAll(src)).state, 'sync');

  // Drift, three ways: an edited byte, a missing planned skill, an owned name no longer planned.
  fs.writeFileSync(path.join(store, 'alpha', SKILL_FILE), '---\nname: alpha\ndescription: edited\n---\nedited\n');
  const narrowed = planAll(src).filter((p) => p.name !== 'beta');
  const verdict = verifyStore(store, narrowed);
  assert.equal(verdict.state, 'drift');
  assert.ok(verdict.stale.some((f) => f.startsWith('alpha/')), 'edited byte is stale');
  assert.ok(verdict.extraOwned.includes('beta'), 'owned-but-unplanned is drift');
  assert.ok(verdict.missing.length === 0);
});

test('verifyStore reports a foreign same-name collision without calling it drift', () => {
  const src = sourceSkills({ agnostic: ['alpha'] });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-stores-out-'));
  const store = path.join(root, 'skills');
  fs.mkdirSync(path.join(store, 'alpha'), { recursive: true });
  fs.writeFileSync(path.join(store, 'alpha', SKILL_FILE), 'theirs\n');
  // Adopted coexistence: the marker claims nothing (collision excluded), the store stays un-drifted.
  materialiseStore(store, planAll(src), { sourceRoot: src, adopt: true });
  const verdict = verifyStore(store, planAll(src));
  assert.deepEqual(verdict.collisions, ['alpha']);
  assert.equal(verdict.state, 'sync', 'a collision is an owner decision, not drift the guard can fix');
});
