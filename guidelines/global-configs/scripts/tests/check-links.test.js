/**
 * tests/check-links.test.js — the two defect classes of the link checker.
 *
 * WHY THE ESCAPE CLASS NEEDED ITS OWN ASSERTION. Both recorded instances (`_index/MASTER_INDEX.md` →
 * repo-root `sync-manager.ps1`, recorded 2026-10-11; the emulator skill → `docs/repo-meta/…`, added
 * 2026-10-12) resolved to a file that EXISTS in this repo, so the existence check could never report
 * them — and each one turned every project's `docs:links` red on content a project may not edit. The
 * control must therefore be independent of existence, which is what the `escape` fixtures below prove
 * in both directions.
 *
 * FIXTURES, NOT THE LIVE CORPUS. `CHECK_LINKS_MIRROR` re-anchors the escape rule so a test can build a
 * subtree instead of asserting on the repository's current links — the same override
 * `check-sync-drift.test.js` uses for its source. The live corpus has its own coverage: a red run of
 * this file's assertions cannot be hidden by editing guidelines content, because the fixtures are made
 * in a temp directory.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const { runSync } = require('../lib/run-sync.js');
const { escapingLink } = require('../check-links.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/check-links.js');

/**
 * A temp tree standing in for the delivery layout:
 *   root/mirror/…     the mirrored subtree (centrally `guidelines/`, downstream `_guidelines/`)
 *   root/outside/…    a file that exists but is NOT delivered — so a link to it is legal here, broken there
 *   root/own.md       a file outside the mirror, i.e. a project's own doc (never an escape candidate)
 */
function fixture({ escape = false, ownBroken = false, ownOutside = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-links-'));
  const mirror = path.join(root, 'mirror');
  fs.mkdirSync(path.join(mirror, 'sub'), { recursive: true });
  fs.mkdirSync(path.join(root, 'outside'), { recursive: true });
  fs.writeFileSync(path.join(root, 'outside', 'target.md'), '# Not delivered\n');
  fs.writeFileSync(path.join(mirror, 'sub', 'b.md'), '# In tree\n');
  fs.writeFileSync(
    path.join(mirror, 'sub', 'a.md'),
    `# A\n\n[inside the tree](b.md)\n\n${escape ? '[escapes](../../outside/target.md)\n' : '[also inside](b.md)\n'}`
  );
  if (ownBroken) fs.writeFileSync(path.join(root, 'own.md'), '# Own\n\n[missing](missing/deep/path.md)\n');
  if (ownOutside) fs.writeFileSync(path.join(root, 'own.md'), '# Own\n\n[climbs out](../outside/target.md)\n');
  return { root, mirror };
}

/** Run the CLI against a fixture, anchored to its stand-in mirror. */
function run({ root, mirror }, scanTarget = mirror) {
  return runSync(process.execPath, [SCRIPT, scanTarget], {
    cwd: REPO_ROOT,
    env: { ...process.env, CHECK_LINKS_MIRROR: mirror },
  });
}

// ─── The predicate ───────────────────────────────────────────────────────────

test('escapingLink: a path that stays inside the mirror is not an escape', () => {
  const { mirror } = fixture();
  const file = path.join(mirror, 'sub', 'a.md');
  assert.equal(escapingLink('b.md#head', file, mirror).escaping, false, 'sibling with an anchor');
  assert.equal(escapingLink('sub/b.md', file, mirror).escaping, false, 'deeper, same tree');
});

test('escapingLink: a path that leaves the mirror is an escape even when the target EXISTS', () => {
  const { root, mirror } = fixture();
  const file = path.join(mirror, 'sub', 'a.md');
  const r = escapingLink('../../outside/target.md', file, mirror);
  assert.equal(r.escaping, true, 'both recorded instances were of this shape');
  assert.ok(fs.existsSync(r.resolved), 'the target resolves — existence is not the discriminator');
  assert.ok(r.resolved.startsWith(root), 'and it lands in the project root, which is not delivered');
});

test('escapingLink: anchors, URLs, absolute paths and bare names are a different class', () => {
  const { mirror } = fixture();
  const file = path.join(mirror, 'sub', 'a.md');
  for (const href of ['#head', 'https://example.com/x.md', 'mailto:a@b.c', 'C:\\abs\\x.md', '/abs/x.md', 'orphan.md']) {
    assert.equal(escapingLink(href, file, mirror).escaping, false, `not an escape: ${href}`);
  }
  assert.equal(escapingLink('', file, mirror).escaping, false, 'an empty target is an in-file anchor');
});

// ─── The CLI, in both directions ─────────────────────────────────────────────

test('REVERSAL PROOF: a clean mirror passes, the same mirror with one escaping link fails', () => {
  const clean = run(fixture());
  assert.equal(clean.status, 0, `clean fixture should pass:\n${clean.stdout}`);
  assert.match(clean.stdout, /0 escaping/);
  assert.ok(!clean.stdout.includes('MIRROR ESCAPE'), 'no defect line when nothing escapes');

  const dirty = run(fixture({ escape: true }));
  assert.equal(dirty.status, 1, 'the escaping link must fail the run');
  assert.match(dirty.stdout, /MIRROR ESCAPE: /);
  assert.match(dirty.stdout, /1 escaping/);
  assert.ok(dirty.stdout.includes(path.join('sub', 'a.md')), 'the offending file is named by its mirror-relative path');
  assert.ok(dirty.stdout.includes('../../outside/target.md'), 'and the offending link is quoted');
});

test('the guard is not vacuous: it reports how many mirrored links it actually judged', () => {
  const out = run(fixture({ escape: true })).stdout;
  const n = Number(out.match(/(\d+) link\(s\) inside the mirrored subtree judged against it/)[1]);
  assert.ok(n >= 2, `two files, three relative links — judged ${n}`);
});

test('an escaping link outside the scanned tree is not judged at all — the scan IS the mirror', () => {
  // `own.md` sits beside the mirror and climbs out of its own root. It is neither an escape (never
  // scanned) nor a broken link: the checker’s scope is the mirrored subtree, and nothing else.
  const f = fixture({ ownOutside: true });
  const r = run(f, f.root);
  assert.equal(r.status, 0, `a non-mirror file must not be judged:\n${r.stdout}`);
  assert.ok(!r.stdout.includes('own.md'), 'the project’s own doc is not in the report');
  assert.ok(r.stdout.includes(f.mirror), 'and the scanned root is printed, so the scope is visible, not inferred');
});

test('REVERSAL PROOF: a path argument does not widen the scan, and says so on its first line', () => {
  // Deliberate, measured: honouring a project root reported 430–625 false "broken links" across the
  // seven registered projects (GAMS 504), because the fallback resolvers below are conventions of THIS
  // corpus. The argument is ignored and the scope is printed rather than silently expanded.
  const f = fixture({ ownBroken: true });
  const r = run(f, f.root);
  assert.equal(r.status, 0, `the broken link in own.md must NOT be chased:\n${r.stdout}`);
  assert.ok(!r.stdout.includes('own.md'), 'documented limitation, asserted so it cannot change silently');
});
