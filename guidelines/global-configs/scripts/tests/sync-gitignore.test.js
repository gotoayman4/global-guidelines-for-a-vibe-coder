const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const REPO = path.resolve(__dirname, '../../../../');
const SCRIPTS = path.join(REPO, 'guidelines/global-configs/scripts');
const MANIFEST = path.join(REPO, 'guidelines/global-configs/sync-manifest.json');

/**
 * Every file that writes into a project. The GUI is scanned as well as the CLI: `sync-manager.ps1`
 * is a second entry point to the same outputs, and it is where two more copies of the entry list
 * lived. A guard that watched only the CLI would have called this repository clean while the GUI
 * still hardcoded `_guidelines/`.
 */
const WRITERS = {
  'sync-guidelines.ps1': path.join(SCRIPTS, 'sync-guidelines.ps1'),
  'GuidelineSync.psm1': path.join(SCRIPTS, 'GuidelineSync.psm1'),
  'sync-manager.ps1': path.join(REPO, 'sync-manager.ps1'),
};

/** A project-local path a writer builds. Static text, deliberately — see the docblock below. */
const CREATED = /Join-Path\s+\$(?:projectRoot|projectPath)\s+"([^"]+)"/g;

/**
 * Paths a writer touches on purpose and does NOT ignore. Each needs a reason, because the reason is
 * the review: a path belongs here only after someone decided the project should see it in `git status`.
 */
const TRACKED_ON_PURPOSE = {
  'AGENTS.md':
    'the sync appends a `## Skills` section to it — the project constitution is tracked by design, and the sync only ever adds to a file the project owns',
  '.vscode': 'the sync merges .vscode/settings.json so the editor picks up AGENTS.md — a project config, and whether it is committed is the project\'s call',
  '.gitignore': 'the ignore file is itself the artifact these scripts edit',
};

const trim = (p) => p.replace(/\/+$/, '');

const read = (file) => fs.readFileSync(file, 'utf8');

/**
 * Every `gitignoreEntry` the manifest declares — the same set `Get-GitignoreEntries` returns. The
 * walk mirrors the module's: top-level sections, then one level of nesting (skills.globalPool,
 * skills.nativeAdapters) plus array elements (toolConfigs[]), and a value may be a string or an
 * array of strings.
 */
function manifestEntries(manifest = JSON.parse(read(MANIFEST))) {
  const flat = [];
  const collect = (value) => {
    if (typeof value === 'string') flat.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
  };
  const entryOf = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    collect(obj.gitignoreEntry);
  };
  for (const section of Object.values(manifest)) {
    if (!section || typeof section !== 'object') continue;
    entryOf(section);
    for (const nested of Object.values(section)) {
      if (Array.isArray(nested)) {
        nested.forEach(entryOf);
      } else {
        entryOf(nested);
      }
    }
  }
  return flat;
}

/**
 * A nested section that declares `targets` promises that every PROJECT-RELATIVE target lands
 * ignored — the native adapter dirs are created by the sync and must never ship untracked, because
 * the `clean-tree` pre-push step fails on an untracked directory. The demand does not depend on the
 * section ALSO declaring `gitignoreEntry`: a section that dropped the entry while keeping the
 * targets is precisely the regression this names. `~` targets are machine-global paths, not
 * project-local, so no project gitignore covers them.
 */
function nestedTargetsNotIgnored(manifest = JSON.parse(read(MANIFEST))) {
  const ignored = new Set(manifestEntries(manifest).map(trim));
  const misses = [];
  for (const section of Object.values(manifest)) {
    if (!section || typeof section !== 'object') continue;
    for (const nested of Object.values(section)) {
      if (!nested || typeof nested !== 'object' || Array.isArray(nested)) continue;
      if (!Array.isArray(nested.targets)) continue;
      for (const target of nested.targets) {
        if (typeof target !== 'string' || target.startsWith('~')) continue;
        if (!ignored.has(trim(target))) misses.push(target);
      }
    }
  }
  return misses;
}

const createdPaths = (text) => [...new Set([...text.matchAll(CREATED)].map((match) => match[1]))];

/**
 * THE INVARIANT: every project-local path the sync creates is either ignored by an entry the
 * manifest declares, or tracked on purpose with a stated reason.
 *
 * WHY IT EXISTS. `sync-guidelines.ps1 -Backup` created `.guidelines-backups/` and the entry lived in
 * no list — the manifest declared `gitignoreEntry` per section and nothing read the field, while each
 * writer kept its own literal. A `-Backup` run therefore left an untracked directory, and the
 * `clean-tree` step of the pre-push gate fails on an untracked directory: a tool-caused scratch dir
 * blocked a documented gate. The same shape covers the next path anyone adds — a new
 * `Join-Path $projectRoot` in neither list fails here, at the moment it is written, rather than in a
 * downstream project's push.
 *
 * @returns {{ok: boolean, why?: string, entries?: string[], paths?: string[], unclassified?: string[]}}
 */
function coverage(sources, entries) {
  if (entries.length === 0) return { ok: false, why: 'the manifest declares no gitignoreEntry' };
  const paths = [...new Set(Object.values(sources).flatMap(createdPaths))];
  const ignored = new Set(entries.map(trim));
  const unclassified = paths.filter((p) => !ignored.has(trim(p)) && !(p in TRACKED_ON_PURPOSE));
  return { ok: unclassified.length === 0, entries, paths, unclassified };
}

/**
 * THE SECOND INVARIANT: a writer must not carry its own copy of an entry. A quoted entry literal is
 * the shape a second home takes, and a second home is what the defect WAS — not the missing string,
 * but three lists that could each be edited without the others.
 *
 * An entry that equals a tool-config TARGET is exempt: `sync-manager.ps1`'s fallback TOOL_CONFIGS
 * table is the sanctioned copy of the manifest's toolConfigs (the fallback exists for a machine
 * where the manifest is unreadable), so the file NAME it carries is the target decision, not the
 * ignore decision — "CLAUDE.md is ignored" lives only in the manifest.
 */
function secondHomes(sources, entries) {
  const manifest = JSON.parse(read(MANIFEST));
  const targets = new Set((manifest.toolConfigs || []).map((c) => c.target).filter(Boolean));
  const hits = [];
  for (const [name, text] of Object.entries(sources)) {
    for (const entry of entries) {
      if (targets.has(entry)) continue;
      for (const literal of [`"${entry}"`, `'${entry}'`]) {
        if (text.includes(literal)) hits.push(`${name} hardcodes ${literal}`);
      }
    }
  }
  return hits;
}

/**
 * The slice of a writer that merges VS Code settings — from the key it merges (or the change flag
 * declared just above it) to the write below. Both ends matter: the flag is initialised before the
 * first key is tested, so a block that starts at the key would miss the initialisation and report a
 * correct writer as broken.
 */
function settingsBlock(text) {
  const key = text.indexOf('chat.useAgentsMdFile');
  if (key === -1) return null;
  const flag = text.search(/\$\w*[Cc]hanged\s*=\s*\$false/);
  const start = flag === -1 ? key : Math.min(flag, key);
  return text.slice(start, start + 4000);
}

/**
 * THE THIRD INVARIANT: a writer must not rewrite a file whose content it did not change.
 *
 * WHY IT EXISTS. The settings merge ran unconditionally, so every sync rewrote `.vscode/settings.json`
 * even when every value was already correct — and under the Windows PowerShell 5.1 host the rewrite
 * was also a reformat, because `ConvertTo-Json` 5.1 emits a BOM, a 4-space indent, `":  "` and no
 * trailing newline while 7.x emits clean 2-space. Measured 2026-10-12 across the fleet: four projects
 * showed a 24-line diff for a file whose values never changed, and `sync-all.js` spawns the 5.1 host,
 * so the noise was guaranteed on every fleet run. A no-op sync must be a no-op.
 *
 * @returns {string[]} one line per writer that merges settings without guarding the write
 */
function settingsWriteIsGuarded(sources) {
  const failures = [];
  for (const [name, text] of Object.entries(sources)) {
    const block = settingsBlock(text);
    if (block === null) continue; // this writer does not touch VS Code settings
    const guard = block.search(/if\s*\(\s*-not\s+\$\w*[Cc]hanged\s*\)/);
    const write = block.search(/\[System\.IO\.File\]::WriteAllText/);
    if (guard === -1) {
      failures.push(`${name}: merges settings with no change guard — every sync rewrites the file`);
      continue;
    }
    if (write === -1) {
      failures.push(`${name}: merges settings but never writes them`);
      continue;
    }
    if (!/\$\w*[Cc]hanged\s*=\s*\$false/.test(block)) failures.push(`${name}: the change flag is never initialised`);
    if (write < guard) failures.push(`${name}: writes settings before testing whether anything changed`);
  }
  return failures;
}

const realSources = () => Object.fromEntries(Object.entries(WRITERS).map(([name, file]) => [name, read(file)]));

test('the manifest declares every entry the sync writes, including the backup directory', () => {
  const entries = manifestEntries();
  // Stated explicitly so deleting one is a failure rather than a quietly smaller set.
  assert.ok(entries.includes('_guidelines/'), JSON.stringify(entries));
  assert.ok(entries.includes('_skills/'), JSON.stringify(entries));
  assert.ok(entries.includes('.guidelines-backups/'), JSON.stringify(entries));
  // The native adapter dir, declared inside §skills.nativeAdapters (retired Claude Code adapter 2026-11-26):
  // the sync writes it, native loaders scan it, and untracked it fails `clean-tree`.
  assert.ok(entries.includes('.agents/skills/'), JSON.stringify(entries));
});

test('every nested section with project-relative targets ignores them all', () => {
  assert.deepEqual(
    nestedTargetsNotIgnored(),
    [],
    'a declared sync target that no gitignoreEntry covers ships untracked'
  );
});

test('REVERSAL PROOF: dropping the adapter gitignoreEntry names active targets', () => {
  const manifest = JSON.parse(read(MANIFEST));
  delete manifest.skills.nativeAdapters.gitignoreEntry;
  assert.deepEqual(nestedTargetsNotIgnored(manifest), ['.agents/skills']);
});

test('REVERSAL PROOF: a machine-global target is exempt, a project-relative one is not', () => {
  const manifest = JSON.parse(read(MANIFEST));
  delete manifest.skills.nativeAdapters.gitignoreEntry;
  manifest.skills.nativeAdapters.targets.push('~/.cursor/skills');
  assert.deepEqual(
    nestedTargetsNotIgnored(manifest),
    ['.agents/skills'],
    'the ~ target is not a project path, so it is not demanded; the project-relative one is'
  );
});

test('every path the sync creates is ignored, or tracked on purpose', () => {
  const result = coverage(realSources(), manifestEntries());
  assert.equal(result.ok, true, `unclassified project paths: ${(result.unclassified || []).join(', ')}`);
});

test('no writer keeps its own copy of an entry', () => {
  const hits = secondHomes(realSources(), manifestEntries());
  assert.deepEqual(hits, [], `the entry list has more than one home: ${hits.join('; ')}`);
});

test('the check is not vacuous — it finds the writers, the paths and the entries it judges', () => {
  const sources = realSources();
  const entries = manifestEntries();
  // If the extraction stops matching, `coverage` would report success over an empty corpus forever.
  assert.equal(Object.keys(sources).length, 3);
  for (const [name, text] of Object.entries(sources)) assert.ok(text.length > 500, `${name} read as empty`);
  assert.ok(entries.length >= 3, `expected the manifest entries, got ${JSON.stringify(entries)}`);

  const result = coverage(sources, entries);
  assert.ok(result.paths.length >= 4, `expected several created paths, got ${JSON.stringify(result.paths)}`);
  // And at least one created path must be covered BY an entry, or the two lists are unrelated.
  const ignored = new Set(entries.map(trim));
  assert.ok(result.paths.some((p) => ignored.has(trim(p))), 'no created path matched any entry');
});

test('THE REGRESSION: the backup directory a -Backup run creates is ignored', () => {
  // The defect this guard was written for. `.guidelines-backups/` is built by `Get-BackupDir` in the
  // module, and leaving it untracked fails the `clean-tree` pre-push step.
  const sources = realSources();
  assert.ok(createdPaths(sources['GuidelineSync.psm1']).includes('.guidelines-backups'), 'the module still builds the backup path');

  const result = coverage(sources, manifestEntries());
  assert.ok(result.entries.includes('.guidelines-backups/'));
  assert.equal(result.ok, true);
});

test('REVERSAL PROOF: dropping the backup section fails, naming the path', () => {
  const manifest = JSON.parse(read(MANIFEST));
  delete manifest.backups;
  const entries = Object.values(manifest)
    .filter((s) => s && typeof s === 'object' && typeof s.gitignoreEntry === 'string')
    .map((s) => s.gitignoreEntry);
  assert.ok(!entries.includes('.guidelines-backups/'), 'the mutation must actually drop the entry');

  const result = coverage(realSources(), entries);
  assert.equal(result.ok, false);
  assert.deepEqual(result.unclassified, ['.guidelines-backups']);
});

test('REVERSAL PROOF: re-hardcoding an entry in a writer fails the single-home check', () => {
  const sources = realSources();
  const entries = manifestEntries();
  assert.deepEqual(secondHomes(sources, entries), [], 'clean to begin with');

  // The exact regression: someone re-adds a literal instead of reading the manifest.
  sources['sync-manager.ps1'] = `${sources['sync-manager.ps1']}\n$null = "_guidelines/"\n`;
  const hits = secondHomes(sources, entries);
  assert.equal(hits.length, 1);
  assert.match(hits[0], /sync-manager\.ps1 hardcodes "_guidelines\/"/);
});

test('REVERSAL PROOF: a new project path fails until it is classified', () => {
  // The ratchet. A path added to a writer without a decision fails here, not in a downstream push.
  const sources = realSources();
  sources['sync-guidelines.ps1'] = `${sources['sync-guidelines.ps1']}\n$null = Join-Path $projectRoot ".cache"\n`;
  const result = coverage(sources, manifestEntries());
  assert.equal(result.ok, false);
  assert.deepEqual(result.unclassified, ['.cache']);
});

test('the guard is not fooled by a path that only looks classified', () => {
  // `_guidelines` must not be satisfied by an entry for a different path sharing a prefix.
  const sources = realSources();
  const entries = manifestEntries().map((e) => (e === '_guidelines/' ? '_guidelines-old/' : e));
  const result = coverage(sources, entries);
  assert.equal(result.ok, false);
  assert.ok(result.unclassified.includes('_guidelines'), JSON.stringify(result.unclassified));
});

test('every writer that merges VS Code settings guards the write behind a change check', () => {
  const sources = realSources();
  const failures = settingsWriteIsGuarded(sources);
  assert.deepEqual(failures, [], failures.join('; '));
});

test('the settings check is not vacuous — it examines both writers that merge settings', () => {
  const sources = realSources();
  // If the block extraction stops matching, the check would pass over an empty set forever.
  const examined = Object.entries(sources).filter(([, text]) => settingsBlock(text) !== null).map(([name]) => name);
  assert.deepEqual(examined.sort(), ['sync-guidelines.ps1', 'sync-manager.ps1'], JSON.stringify(examined));
});

test('REVERSAL PROOF: an unguarded settings write is named', () => {
  const sources = realSources();
  assert.deepEqual(settingsWriteIsGuarded(sources), [], 'clean to begin with');

  // The exact regression: the guard is dropped and the write runs unconditionally again.
  const before = sources['sync-guidelines.ps1'];
  sources['sync-guidelines.ps1'] = before.replace(/if\s*\(\s*-not\s+\$changed\s*\)/, 'if ($true)');
  assert.notEqual(sources['sync-guidelines.ps1'], before, 'the mutation must actually remove the guard');

  const failures = settingsWriteIsGuarded(sources);
  assert.equal(failures.length, 1, failures.join('; '));
  assert.match(failures[0], /sync-guidelines\.ps1: merges settings with no change guard/);
});

/**
 * THE FOURTH INVARIANT: a writer must not put a BOM in a project file.
 *
 * WHY IT EXISTS. `Set-Content -Encoding UTF8` means "UTF-8 WITH a BOM" on Windows PowerShell 5.1 —
 * the host `sync-all.js` spawns — and "without" on 7.x, so the same sync wrote different bytes per
 * host. Every starter and tool-config file the sync produced (AGENTS.md, README.md,
 * `.github/copilot-instructions.md`, ...) therefore carried a BOM on the fleet host. Measured
 * 2026-10-13: five of six projects shipped a BOM'd `.github/copilot-instructions.md`, while its own
 * template is 445 bytes with none — the generated copy did not match its source. A BOM is diff
 * noise, and before a `---` it makes a front-matter parser read "no front-matter at all". The
 * `.vscode/settings.json` merge had already been fixed to `WriteAllText` for exactly this reason;
 * this extends that fix to every project-file write through one `Write-Utf8NoBom` helper.
 *
 * @returns {string[]} one line per project-file write that still uses the BOM-emitting idiom
 */
function bomProjectWrites(sources) {
  const failures = [];
  for (const [name, text] of Object.entries(sources)) {
    const hits = text.match(/Set-Content\s+-Path\s+\$targetPath[^\r\n]*-Encoding\s+UTF8/g) || [];
    for (const h of hits) failures.push(`${name}: ${h.trim()}`);
  }
  return failures;
}

test('no writer writes a project file with the BOM-emitting Set-Content idiom', () => {
  const failures = bomProjectWrites(realSources());
  assert.deepEqual(failures, [], failures.join('; '));
});

test('the BOM check is not vacuous — the writers still write project files, via the no-BOM helper', () => {
  const sources = realSources();
  const helper = /Write-Utf8NoBom\s+-Path\s+\$targetPath/g;
  // If the writes were deleted rather than rerouted, the check above would pass over nothing.
  assert.ok(
    (sources['GuidelineSync.psm1'].match(helper) || []).length >= 5,
    'GuidelineSync.psm1 no longer routes its project writes through Write-Utf8NoBom'
  );
  assert.ok(
    (sources['sync-manager.ps1'].match(helper) || []).length >= 8,
    'sync-manager.ps1 no longer routes its project writes through Write-Utf8NoBom'
  );
});

test('REVERSAL PROOF: a reintroduced BOM write is named', () => {
  const sources = realSources();
  assert.deepEqual(bomProjectWrites(sources), [], 'clean to begin with');

  // The exact regression: someone reaches for the familiar Set-Content again.
  sources['GuidelineSync.psm1'] += '\nSet-Content -Path $targetPath -Value "x" -NoNewline -Encoding UTF8\n';
  const failures = bomProjectWrites(sources);
  assert.equal(failures.length, 1, failures.join('; '));
  assert.match(failures[0], /GuidelineSync\.psm1: Set-Content -Path \$targetPath/);
});
