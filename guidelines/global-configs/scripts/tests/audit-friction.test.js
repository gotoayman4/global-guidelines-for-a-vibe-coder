const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/audit-friction.js');
const { contextCaps, churn, delivery, proposals, lastArtifact } = require('../audit-friction.js');

function run(args, cwd = REPO_ROOT) {
  return runSync(process.execPath, [SCRIPT, ...args], { cwd });
}

test('contextCaps reads the three caps from the file that owns them', () => {
  const caps = contextCaps();
  assert.deepEqual(caps, { vibe: 25000, standard: 60000, guarded: 120000 });
});

test('churn measures docs vs code over the commit window', () => {
  const result = churn(REPO_ROOT, 40);
  assert.ok(result, 'the central repo is a git repository');
  assert.ok(result.codeAdd > 0, 'code lines were counted');
  assert.ok(result.ratio >= 0);
  assert.equal(typeof result.docFiles, 'number');
});

test('delivery returns null for a project with no mirror rather than guessing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'friction-nomirror-'));
  assert.equal(delivery(dir), null);
});

test('delivery separates "no mirror" from "mirror, source not reachable"', () => {
  // A consuming project: a mirror, and no `guidelines/` of its own. The old check returned
  // null here, so the report claimed the project had no mirror at all.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'friction-mirroronly-'));
  fs.mkdirSync(path.join(dir, '_guidelines', 'global-configs'), { recursive: true });
  fs.writeFileSync(path.join(dir, '_guidelines', 'global-configs', 'x.md'), '# x\n');

  const here = delivery(dir);
  assert.notEqual(here, null, 'a mirror that exists is not "no mirror"');
  assert.equal(typeof here.comparable, 'boolean');

  // Downstream the source is the central repo, which the project cannot see.
  const downstream = delivery(dir, path.join(dir, 'guidelines'));
  assert.equal(downstream.comparable, false);
  assert.equal(downstream.inSync, null);
  assert.equal(downstream.mirrorFiles, 1);
});

test('contextCaps resolves from the mirror, so it works in a consuming project', () => {
  // The reversal proof for a real shipped defect: this fixture is the layout a consuming
  // project has, and a repo-root-relative path resolved to `<project>/guidelines`, which does
  // not exist — so every project was told "no cap found to compare against".
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'friction-downstream-'));
  const scripts = path.join(dir, '_guidelines', 'global-configs', 'scripts');
  fs.mkdirSync(path.join(scripts, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(dir, '_guidelines', '01-workflow-methodology'), { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, 'guidelines/global-configs/scripts/lib/context-caps.js'),
    path.join(scripts, 'lib', 'context-caps.js'),
  );
  fs.copyFileSync(
    path.join(REPO_ROOT, 'guidelines/01-workflow-methodology/speed-tiered-workflow.md'),
    path.join(dir, '_guidelines', '01-workflow-methodology', 'speed-tiered-workflow.md'),
  );

  const copied = require(path.join(scripts, 'lib', 'context-caps.js'));
  assert.deepEqual(copied.contextCaps(), { vibe: 25000, standard: 60000, guarded: 120000 });
});

test('proposals counts the ones that name no control', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'friction-prop-'));
  const props = path.join(dir, 'guidelines-proposals');
  fs.mkdirSync(props);
  fs.writeFileSync(path.join(props, '2026-01-01-has-guard.md'), '# P\n\n**Guard:** `x.test.js`\n');
  fs.writeFileSync(path.join(props, '2026-01-02-no-guard.md'), '# P\n\n**Target guideline file:** `x.md`\n');
  fs.writeFileSync(path.join(props, '2026-01-03-also-none.md'), '# P\n\nNothing here.\n');
  const result = proposals(dir);
  assert.equal(result.total, 3);
  assert.equal(result.withoutGuard, 2);
  assert.equal(result.examples.length, 2, 'examples are capped for the report');
});

test('proposals accepts a guard given a section of its own, not just an inline marker', () => {
  // The proposal format is not prescribed, so a real guard written as a heading was reported
  // as absent — four of four in one project, while all four named one.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'friction-propsection-'));
  const props = path.join(dir, 'guidelines-proposals');
  fs.mkdirSync(props);
  fs.writeFileSync(
    path.join(props, '2026-01-01-section-guard.md'),
    '# P\n\n## The guard that fails if the lesson is unlearned\n\n`x.test.js` fails on the old shape.\n',
  );
  fs.writeFileSync(
    path.join(props, '2026-01-02-labelled-guard.md'),
    '# P\n\n**Guard that fails if the lesson is unlearned:** the reversal proof itself.\n',
  );
  fs.writeFileSync(path.join(props, '2026-01-03-still-none.md'), '# P\n\n## What happened\n\nNothing.\n');
  const result = proposals(dir);
  assert.equal(result.total, 3);
  assert.equal(result.withoutGuard, 1);
  assert.deepEqual(result.examples, ['2026-01-03-still-none.md']);
});

test('lastArtifact reports the newest dated artifact and its age', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'friction-last-'));
  fs.mkdirSync(path.join(dir, 'docs/friction'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/friction/2026-01-01.md'), '# old\n');
  fs.writeFileSync(path.join(dir, 'docs/friction/2026-06-15.md'), '# newer\n');
  fs.writeFileSync(path.join(dir, 'docs/friction/notes.md'), '# not dated\n');
  const result = lastArtifact(dir);
  assert.equal(result.file, path.join('docs/friction', '2026-06-15.md'), 'undated files are ignored');
  assert.ok(result.ageDays >= 0);
});

test('lastArtifact returns null when the directory has no dated artifact', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'friction-empty-'));
  assert.equal(lastArtifact(dir), null);
});

test('CLI --json emits the whole report as parseable JSON', () => {
  const result = run([REPO_ROOT, '--json']);
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.caps.vibe, 25000);
  assert.ok(parsed.churn, 'the central repo has churn numbers');
});

test('CLI --check-cadence exits 1 when no artifact has ever been written', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'friction-cadence-'));
  const result = run([dir, '--check-cadence', '--quiet']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /friction audit is stale/);
});

test('CLI --write creates the artifact and makes --check-cadence pass', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'friction-write-'));
  const written = run([dir, '--write']);
  assert.equal(written.status, 0);
  const dated = new Date().toISOString().split('T')[0];
  const artifact = path.join(dir, 'docs/friction', `${dated}.md`);
  assert.ok(fs.existsSync(artifact), 'the artifact is written to docs/friction/<date>.md');

  const cadence = run([dir, '--check-cadence']);
  assert.equal(cadence.status, 0, 'a fresh artifact satisfies the cadence check');
});

test('CLI rejects a missing project root with exit 2', () => {
  const result = run([path.join(os.tmpdir(), 'definitely-not-here-friction')]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /does not exist/);
});
