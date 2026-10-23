const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/slice-close.js');
const {
  quarterFile,
  nextDecision,
  nextFromDocs,
  declaredNextNumber,
  deriveMode,
  updateFreshness,
  wrap,
  slugify,
  adrNumber,
  appendTableRow,
  buildLiteAdr,
  ADR_INDEX,
} = require('../slice-close.js');

const ADR_INDEX_HEADER = /^\|\s*ADR\s*\|\s*Decision\s*\|/;
const DECISION_LOG_HEADER = /^\|\s*ID\s*\|\s*Decision\s*\|\s*Rationale\s*\|/;

const today = () => new Date().toISOString().split('T')[0];

/** The canonical mode declaration shape — `WORLD.md` §Speed Mode, a list item, a backticked value. */
const worldWithMode = (mode, rest = '') => `# WORLD\n\n## Speed Mode\n\n- **mode:** \`${mode}\`\n${rest}`;

/** A minimal project: a constitution carrying decisions, and a WORLD.md declaring a mode. */
function makeProject({ agents = '# AGENTS\n\nSee D7 for the last decision.\n', world = worldWithMode('vibe') } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice-close-'));
  if (agents !== null) fs.writeFileSync(path.join(dir, 'AGENTS.md'), agents, 'utf8');
  if (world !== null) fs.writeFileSync(path.join(dir, 'WORLD.md'), world, 'utf8');
  return dir;
}

function run(args, cwd = REPO_ROOT) {
  return runSync(process.execPath, [SCRIPT, ...args], { cwd });
}

test('quarterFile maps a date to its calendar quarter', () => {
  assert.equal(quarterFile('2026-01-15'), 'docs/changelog/2026-Q1.md');
  assert.equal(quarterFile('2026-03-31'), 'docs/changelog/2026-Q1.md');
  assert.equal(quarterFile('2026-04-01'), 'docs/changelog/2026-Q2.md');
  assert.equal(quarterFile('2026-10-11'), 'docs/changelog/2026-Q4.md');
  assert.equal(quarterFile('2026-12-31'), 'docs/changelog/2026-Q4.md');
});

test('nextDecision is max(existing) + 1, not a counter', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD4 and D19 and D7 — out of order on purpose.\n' });
  assert.equal(nextDecision(dir, []), 20, 'the highest number wins, not the last written');
});

test('nextDecision returns 1 for a project with no decisions yet', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nNo decisions here.\n' });
  assert.equal(nextDecision(dir, []), 1);
});

test('nextDecision also reads decisions already in the archive', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD3.\n' });
  assert.equal(nextDecision(dir, [{ rel: 'docs/changelog/2026-Q4.md', content: '### x — D41 · later\n' }]), 42);
});

test('deriveMode reads WORLD.md and defaults to standard when silent', () => {
  assert.equal(deriveMode(makeProject({ world: worldWithMode('guarded') })), 'guarded');
  assert.equal(deriveMode(makeProject({ world: '# WORLD\n\nNo mode declared.\n' })), 'standard');
  assert.equal(deriveMode(makeProject({ world: null })), 'standard');
});

test('updateFreshness rewrites the line in place and leaves the rest alone', () => {
  const content = '# WORLD\n\n**Last Updated:** 2020-01-01 | **Commit:** aaa | **Change:** old\n\nBody stays.\n';
  const { content: after, changed } = updateFreshness(content, '2026-10-11', 'bbb', 'new note');
  assert.equal(changed, true);
  assert.match(after, /\*\*Last Updated:\*\* 2026-10-11 \| \*\*Commit:\*\* bbb \| \*\*Change:\*\* new note/);
  assert.ok(!after.includes('old'));
  assert.match(after, /Body stays\./);
});

test('updateFreshness reports unchanged when the doc has no freshness line', () => {
  const content = '# WORLD\n\nNo marker.\n';
  const { content: after, changed } = updateFreshness(content, '2026-10-11', 'bbb', 'note');
  assert.equal(changed, false);
  assert.equal(after, content, 'a missing marker is never added silently');
});

test('wrap keeps every word and never exceeds the width', () => {
  const text = Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ');
  const lines = wrap(text, 400).split('\n');
  assert.ok(lines.length > 1, 'a 700-char bullet is wrapped');
  for (const l of lines) assert.ok(l.length <= 400, `line over 400 chars: ${l.length}`);
  assert.equal(lines.join(' '), text, 'wrapping is byte-preserving at word boundaries');
});

test('CLI closes a slice: writes the quarter archive and derives the decision number', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD7 is the last one.\n' });
  fs.mkdirSync(path.join(dir, 'docs/gate-receipts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/gate-receipts/x.md'), '# gate receipt\n\nVERDICT: GREEN\n', 'utf8');
  const result = run([dir, '--title', 'the first slice', '--sha', 'abc1234', '--doc', 'AGENTS.md', '--receipt', 'docs/gate-receipts/x.md']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /D8 \(derived/);

  const archive = path.join(dir, quarterFile(today()));
  assert.ok(fs.existsSync(archive), 'the quarter archive is created');
  const body = fs.readFileSync(archive, 'utf8');
  assert.match(body, new RegExp(`### ${today()} — D8 · the first slice`));
  assert.match(body, /\*\*Mode:\*\* vibe/, 'the mode comes from WORLD.md when not given');
  assert.match(body, /\*\*Commit:\*\* `abc1234`/);
  assert.match(body, /\*\*Doc:\*\* `AGENTS\.md`/);
  assert.match(body, /\*\*Receipt:\*\* `docs\/gate-receipts\/x\.md`/);
  assert.match(body, /- \*\*Mode:/, 'the entry is a bullet, one line per fact');
});

test('CLI refuses to cite a receipt that does not exist — a pointer is not evidence', () => {
  const dir = makeProject();
  const result = run([dir, '--title', 'cites nothing', '--receipt', 'docs/gate-receipts/missing.md']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /does not name an existing file/);
  assert.equal(fs.existsSync(path.join(dir, 'docs/changelog')), false, 'nothing is written on a false citation');
});

test('CLI derives the NEXT number on a second run — the archive is read back, not a counter incremented', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD7 is the last one.\n' });
  const first = run([dir, '--title', 'first', '--sha', 'aaa']);
  assert.equal(first.status, 0);
  assert.match(first.stdout, /D8 \(derived/);

  const second = run([dir, '--title', 'second', '--sha', 'bbb']);
  assert.equal(second.status, 0);
  assert.match(second.stdout, /D9 \(derived/, 'run 1 wrote D8 into the archive; run 2 must see it and return D9');

  const body = fs.readFileSync(path.join(dir, quarterFile(today())), 'utf8');
  assert.match(body, /· first/);
  assert.match(body, /· second/, 'entries append — the archive is never rewritten');
});

test('CLI updates the freshness line only for the doc the slice names with --doc', () => {
  const dir = makeProject({
    world: worldWithMode('standard', '\n**Last Updated:** 2020-01-01 | **Commit:** aaa | **Change:** old\n'),
  });
  run([dir, '--title', 'freshness moves', '--sha', 'ccc', '--doc', 'WORLD.md']);
  const world = fs.readFileSync(path.join(dir, 'WORLD.md'), 'utf8');
  assert.match(world, new RegExp(`\\*\\*Last Updated:\\*\\* ${today()} \\| \\*\\*Commit:\\*\\* ccc`));
  assert.match(world, /\*\*Change:\*\* freshness moves/);
});

test('CLI leaves a freshness line untouched when the slice does not name that doc', () => {
  const dir = makeProject({
    world: worldWithMode('standard', '\n**Last Updated:** 2020-01-01 | **Commit:** aaa | **Change:** old\n'),
  });
  const before = fs.readFileSync(path.join(dir, 'WORLD.md'), 'utf8');
  run([dir, '--title', 'code only', '--sha', 'ccc', '--doc', 'AGENTS.md']);
  assert.equal(fs.readFileSync(path.join(dir, 'WORLD.md'), 'utf8'), before, 'a code slice does not claim its steering doc changed');
});

test('CLI --dry-run reports the plan and writes nothing', () => {
  const dir = makeProject();
  const before = fs.readdirSync(dir).sort();
  const result = run([dir, '--title', 'planned', '--dry-run']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /dry-run: nothing written/);
  assert.deepEqual(fs.readdirSync(dir).sort(), before, 'no archive, no rewrite');
});

test('CLI rejects a missing --title with a usage error', () => {
  const result = run([makeProject()]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--title is required/);
});

test('CLI refuses an empty corpus rather than reporting success over nothing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slice-close-empty-'));
  const result = run([dir, '--title', 'nothing here']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /not a project/);
});

test('CLI rejects an unknown mode', () => {
  const result = run([makeProject(), '--title', 'x', '--mode', 'turbo']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--mode must be vibe \| standard \| guarded/);
});

// --- `--adr`: the decision's three derived sites -------------------------------------------

/** A project carrying both index tables, so `--adr` has somewhere to write. */
function makeAdrProject({ agents = '# AGENTS\n\nD7 is the last one.\n' } = {}) {
  const dir = makeProject({ agents });
  fs.mkdirSync(path.join(dir, 'docs/adr'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ADR_INDEX),
    '# ADR index\n\n| ADR | Decision | Depth | Status |\n|---|---|---|---|\n| [007](007-old.md) | an earlier call (D7) | Lite | Accepted (2026-10-01) |\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(dir, 'docs/PRD.md'),
    '# PRD\n\n# 24. Decisions Log\n\n| ID | Decision | Rationale |\n|---|---|---|\n| D7 | an earlier call | it had to be somewhere |\n',
    'utf8',
  );
  return dir;
}

test('slugify is lowercase, hyphenated, and truncates at a word boundary', () => {
  assert.equal(slugify('Add a Retry to the login form'), 'add-a-retry-to-the-login-form');
  assert.equal(slugify('  Weird   --  punctuation!! '), 'weird-punctuation');
  const long = slugify('one two three four five six seven eight nine ten eleven twelve thirteen');
  assert.ok(long.length <= 48, `slug too long: ${long.length}`);
  assert.ok(!long.endsWith('-'), 'a truncation never leaves a trailing hyphen');
  assert.ok(long.startsWith('one-two-three'), 'the slug keeps its leading words');
});

test('adrNumber pads to three digits so file name and decision number are one scheme', () => {
  assert.equal(adrNumber(7), '007');
  assert.equal(adrNumber(45), '045');
  assert.equal(adrNumber(1234), '1234');
});

test('appendTableRow adds to the matching table only, and reports a missing one', () => {
  const doc = '| ADR | Decision |\n|---|---|\n| [001](001-a.md) | one |\n\n| Other | Table |\n|---|---|\n| x | y |\n';
  const after = appendTableRow(doc, ADR_INDEX_HEADER, '| [002](002-b.md) | two |');
  const lines = after.split('\n');
  assert.equal(lines[3], '| [002](002-b.md) | two |', 'the row lands at the end of the ADR table');
  assert.equal(lines[7], '| x | y |', 'the second table is untouched');
  assert.equal(appendTableRow('no tables here', ADR_INDEX_HEADER, '| a | b |'), null, 'a missing table is reported, not created');
});

test('buildLiteAdr derives the header and keeps the authored body verbatim', () => {
  const adr = buildLiteAdr({ number: '045', title: 'App Check cancelled', date: '2026-10-12', decision: 45, why: 'No attestation surface.' });
  assert.match(adr, /^# ADR 045: App Check cancelled/);
  assert.match(adr, /## Status: Accepted \(2026-10-12\) · \*\*Depth:\*\* lite · \*\*Decision:\*\* D45/);
  assert.match(adr, /## Context \/ Decision\n\nNo attestation surface\./);
});

test('CLI --adr writes the decision\'s five sites from one invocation', () => {
  const dir = makeAdrProject();
  const result = run([
    dir,
    '--title',
    'Add a Retry to the login form',
    '--sha',
    'abc1234',
    '--adr',
    '--why',
    'The form had no recovery path after a transient network failure.',
  ]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /D8 \(derived/);

  const adr = fs.readFileSync(path.join(dir, 'docs/adr/008-add-a-retry-to-the-login-form.md'), 'utf8');
  assert.match(adr, /## Context \/ Decision\n\nThe form had no recovery path/);

  const index = fs.readFileSync(path.join(dir, ADR_INDEX), 'utf8');
  assert.match(index, /\| \[008\]\(008-add-a-retry-to-the-login-form\.md\) \| Add a Retry to the login form \(D8\) \| Lite \| Accepted \(\d{4}-\d{2}-\d{2}\) \|/);
  assert.equal(index.match(/^\| \[/gm).length, 2, 'the earlier row survives; the new one appends');

  const log = fs.readFileSync(path.join(dir, 'docs/PRD.md'), 'utf8');
  assert.match(log, /\| D8 \| Add a Retry to the login form \| The form had no recovery path after a transient network failure\. \|/);
  assert.equal(log.match(/^\| D\d/gm).length, 2, 'the earlier decision row survives');
});

test('CLI --adr without --why is a usage error — the reasoning is never invented', () => {
  const result = run([makeAdrProject(), '--title', 'no reason given', '--adr']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--adr requires --why/);
});

test('CLI --adr never overwrites a hand-authored ADR — it adds the rows only', () => {
  const dir = makeAdrProject();
  const authored = '# ADR 008: HAND AUTHORED\n\nA full-depth body the agent wrote.\n';
  fs.writeFileSync(path.join(dir, 'docs/adr/008-hand.md'), authored, 'utf8');
  const result = run([dir, '--title', 'hand written', '--sha', 'aaa', '--decision', '8', '--adr', '--adr-file', '008-hand.md', '--why', 'the row rationale']);
  assert.equal(result.status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'docs/adr/008-hand.md'), 'utf8'), authored, 'the file is byte-identical');
  assert.match(result.stdout, /exists — left untouched/);
  assert.match(fs.readFileSync(path.join(dir, ADR_INDEX), 'utf8'), /\[008\]\(008-hand\.md\)/);
});

test('CLI --adr reports a missing index instead of creating one', () => {
  const dir = makeAdrProject();
  fs.rmSync(path.join(dir, ADR_INDEX));
  const result = run([dir, '--title', 'no index', '--sha', 'aaa', '--adr', '--why', 'a reason']);
  assert.equal(result.status, 0, 'a missing optional doc is reported, not fatal');
  assert.match(result.stdout, /is absent — no ADR-index row written/);
  assert.ok(!fs.existsSync(path.join(dir, ADR_INDEX)), 'the script does not invent a table the project did not choose');
});

test('CLI --adr-depth full records the depth in the index row', () => {
  const dir = makeAdrProject();
  run([dir, '--title', 'an irreversible call', '--sha', 'aaa', '--adr', '--adr-depth', 'full', '--why', 'cannot be undone']);
  assert.match(fs.readFileSync(path.join(dir, ADR_INDEX), 'utf8'), /\| an irreversible call \(D8\) \| Full \|/);
});

test('CLI rejects an unknown --adr-depth', () => {
  const result = run([makeAdrProject(), '--title', 'x', '--adr', '--adr-depth', 'deep', '--why', 'y']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--adr-depth must be lite \| full/);
});

test('CLI --adr --dry-run writes nothing at all', () => {
  const dir = makeAdrProject();
  const result = run([dir, '--title', 'planned adr', '--adr', '--why', 'a reason', '--dry-run']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /dry-run: nothing written/);
  assert.ok(!fs.existsSync(path.join(dir, 'docs/adr/008-planned-adr.md')), 'no ADR file');
  assert.ok(!fs.existsSync(path.join(dir, 'docs/changelog')), 'no archive');
});

test('a decisions log at docs/DECISIONS.md is found and written', () => {
  const dir = makeAdrProject();
  // The PRD loses its table; the standalone log carries it instead (the C1 split).
  fs.writeFileSync(path.join(dir, 'docs/PRD.md'), '# PRD\n\n# 24. Decisions Log\n\nSee `docs/DECISIONS.md`.\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'docs/DECISIONS.md'), '# Decisions Log\n\n| ID | Decision | Rationale |\n|---|---|---|\n| D7 | an earlier call | it had to be somewhere |\n', 'utf8');
  const result = run([dir, '--title', 'split log', '--sha', 'aaa', '--adr', '--why', 'a reason']);
  assert.equal(result.status, 0);
  assert.match(fs.readFileSync(path.join(dir, 'docs/DECISIONS.md'), 'utf8'), /\| D8 \| split log \| a reason \|/);
});

// --- `--duration`: speed is measured, not felt ----------------------------------------------

test('CLI --duration records intent → first running slice in the entry', () => {
  const dir = makeProject();
  run([dir, '--title', 'a timed slice', '--sha', 'abc1234', '--duration', '42']);
  const body = fs.readFileSync(path.join(dir, quarterFile(today())), 'utf8');
  assert.match(body, /\*\*Intent→slice:\*\* 42m/);
});

test('CLI omits the measurement when it was not taken — never a fabricated zero', () => {
  const dir = makeProject();
  run([dir, '--title', 'untimed', '--sha', 'abc1234']);
  const body = fs.readFileSync(path.join(dir, quarterFile(today())), 'utf8');
  assert.ok(!body.includes('Intent→slice'), 'an unmeasured slice records nothing rather than 0m');
});

test('CLI rejects a non-numeric or negative --duration', () => {
  assert.equal(run([makeProject(), '--title', 'x', '--duration', 'soon']).status, 2);
  assert.equal(run([makeProject(), '--title', 'x', '--duration', '-1']).status, 2);
});

// --- the number is derived from the COMMITTED tree, and an earmark is not a record ----------
// Measured 2026-10-23 in gs-coordinator-helper at D360. Two defects, one run: the scan read the
// working tree, so the half-written record this slice was closing had already raised the maximum and
// the tool invented D361; and the project's own `- Next D-number: **D360**` line — a reservation —
// was counted as a used number, which would have kept deriving the number AFTER the one reserved.

test('nextFromDocs skips a declared next-number line instead of counting it as used', () => {
  const docs = [
    { rel: 'docs/ROADMAP.md', content: '# Roadmap\n\n- Next D-number: **D40** — the single authoritative location (D7 decided this).\n' },
  ];
  assert.equal(declaredNextNumber(docs), 40, 'the earmark is read as a declaration');
  assert.equal(nextFromDocs(docs), 40, 'and returned as the answer, not bumped to D41');
});

test('the earmark line is recognized in the shapes a document actually uses', () => {
  for (const line of [
    '- Next D-number: **D9**',
    '- **Next D-number:** `D9`',
    '**Next D-number:** D9',
    '| Next D-number | D9 |',
    '- Next D-number is D9',
  ]) {
    // The D12 sits on the earmark line; counting it would return 13, so this also pins the whole-line skip.
    const docs = [{ rel: 'docs/ROADMAP.md', content: `${line} — D12 decided this.\n` }];
    assert.equal(declaredNextNumber(docs), 9, line);
    assert.equal(nextFromDocs(docs), 9, `${line} is skipped whole`);
  }
});

test('nextFromDocs takes the earmark only when it is above the used numbers', () => {
  const docs = [
    { rel: 'docs/ROADMAP.md', content: '- Next D-number: **D9** (stale line)\n' },
    { rel: 'docs/PRD.md', content: 'D12 and D11 are already recorded.\n' },
  ];
  assert.equal(nextFromDocs(docs), 13, 'a stale earmark cannot pull the number backwards');
});

test('nextDecision reads the project documents itself and honours their earmark', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD3.\n' });
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/ROADMAP.md'), '# Roadmap\n\n- Next D-number: **D40**\n', 'utf8');
  assert.equal(nextDecision(dir), 40);
});

test('CLI derives decision docs from the committed tree: an uncommitted mention cannot raise the number', () => {
  const dir = makeGitProject('# AGENTS\n\nD7 is the last committed one.\n');
  // In-flight prose: the working AGENTS.md cites D9, uncommitted. Prose is not the record.
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# AGENTS\n\nD7 and now D9 in the working tree.\n', 'utf8');

  const before = run([dir, '--title', 'closing', '--dry-run']);
  assert.equal(before.status, 0);
  assert.match(before.stdout, /D8 \(derived: max\(used D<n>\) \+ 1/, 'the tree owes D8, not D10');

  runSync('git', ['add', '-A'], { cwd: dir });
  gitCommit(dir, 'record D9');
  const after = run([dir, '--title', 'closing', '--dry-run']);
  assert.match(after.stdout, /D10 \(derived/, 'after the commit the same run MUST report n+1');
});

test('a second close of the same slice is a no-op — one heading, one write', () => {
  const dir = makeGitProject('# AGENTS\n\nD7.\n');
  seedArchive(dir, '### earlier — D7 · old\n');

  const first = run([dir, '--title', 'closing', '--sha', 'aaa']);
  assert.match(first.stdout, /D8 \(derived/);
  const again = run([dir, '--title', 'closing', '--sha', 'aaa']);
  assert.equal(again.status, 0);
  assert.match(again.stdout, /D8 \(already recorded\)/);

  const body = fs.readFileSync(path.join(dir, quarterFile(today())), 'utf8');
  assert.equal((body.match(/— D8 · closing/g) || []).length, 1, 'a retry must not append a duplicate entry');
});

test('two slices closed before one commit get two numbers', () => {
  const dir = makeGitProject('# AGENTS\n\nD7.\n');
  seedArchive(dir, '### earlier — D7 · old\n');

  const a = run([dir, '--title', 'slice A', '--sha', 'aaa']);
  const b = run([dir, '--title', 'slice B', '--sha', 'bbb']);
  assert.match(a.stdout, /D8 \(derived/);
  assert.match(b.stdout, /D9 \(derived/, 'the uncommitted D8 is a record in the archive, so the next slice is D9');
});

test('a number already in the archive fails fast instead of recording it twice', () => {
  const dir = makeGitProject('# AGENTS\n\nD7.\n');
  seedArchive(dir, `### ${today()} — D8 · another slice\n`);

  const result = run([dir, '--title', 'mine', '--decision', '8']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /D8 is already recorded/);
  assert.match(result.stderr, /Commit the archive/);
});

test('CLI --archive writes the named document archive and no other', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD7.\n' });
  const archive = 'docs/changelog/roadmap-2026-Q4.md';
  const result = run([dir, '--title', 'per-doc archive', '--sha', 'abc1234', '--archive', archive]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /archive:\s+docs\/changelog\/roadmap-2026-Q4\.md \(given by --archive\)/);
  const body = fs.readFileSync(path.join(dir, archive), 'utf8');
  assert.match(body, /One archive per quarter is the default/, 'the header no longer forbids the file it was asked to write');
  assert.doesNotMatch(body, /not one per document/);
  assert.ok(!fs.existsSync(path.join(dir, quarterFile(today()))), 'the default quarter file is NOT written beside it');
});

test('CLI --archive re-reads the named archive, so a second slice continues its numbering', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD7.\n' });
  const archive = 'docs/changelog/roadmap-2026-Q4.md';
  run([dir, '--title', 'one', '--sha', 'aaa', '--archive', archive]);
  const second = run([dir, '--title', 'two', '--sha', 'bbb', '--archive', archive]);
  assert.match(second.stdout, /D9 \(derived/, 'the first entry is in the archive the derivation now reads');
});

test('an archive adopted mid-quarter continues the default quarter file numbering', () => {
  const dir = makeProject({ agents: '# AGENTS\n\nD7.\n' });
  const first = run([dir, '--title', 'default first', '--sha', 'aaa']);
  assert.match(first.stdout, /D8 \(derived/);

  const second = run([dir, '--title', 'named second', '--sha', 'bbb', '--archive', 'docs/changelog/roadmap-2026-Q4.md']);
  assert.match(second.stdout, /D9 \(derived/, 'the default quarter file still holds D8, so the new archive starts at D9');
});

test('CLI rejects an --archive outside docs/, that is not markdown, or that is a decision document', () => {
  for (const bad of [
    'ROADMAP.md',
    'docs/roadmap.txt',
    '../elsewhere/x.md',
    'docs/../outside.md',
    'docs/changelog/../../outside.md',
    'docs/PRD.md',
    'docs/adr/README.md',
  ]) {
    const result = run([makeProject(), '--title', 'x', '--archive', bad]);
    assert.equal(result.status, 2, `${bad} must be a usage error`);
    assert.match(result.stderr, /--archive must name a markdown file under docs\//);
  }
});

/** A temp project that IS a git repository with one commit, so `HEAD:./<path>` has bytes to return. */
function makeGitProject(agents) {
  const dir = makeProject({ agents });
  runSync('git', ['init', '--quiet'], { cwd: dir });
  runSync('git', ['add', '-A'], { cwd: dir });
  gitCommit(dir, 'first');
  return dir;
}

/** Commit a seeded archive at the resolved quarter path, so the next close has committed history. */
function seedArchive(dir, content) {
  const rel = quarterFile(today());
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), content, 'utf8');
  runSync('git', ['add', rel], { cwd: dir });
  gitCommit(dir, 'seed archive');
}

function gitCommit(dir, message) {
  const result = runSync('git', ['-c', 'user.email=guard@test.invalid', '-c', 'user.name=guard', 'commit', '--quiet', '-m', message], { cwd: dir });
  assert.equal(result.status, 0, `git commit failed: ${result.stderr}`);
}
