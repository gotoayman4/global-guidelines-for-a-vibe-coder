const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const { runSync } = require('../lib/run-sync.js');

const REPO = path.resolve(__dirname, '../../../../');

/**
 * THE INVARIANT: a PowerShell file that contains a non-ASCII character MUST start with a UTF-8 BOM.
 *
 * WHY IT EXISTS (measured 2026-10-13, on this repo, by breaking it).
 *
 * `sync-all.js` spawns `powershell.exe` — Windows PowerShell **5.1**. A 5.1 host reads a BOM-less
 * script using the system ANSI codepage, not UTF-8. On this machine that codepage is 1256, where the
 * bytes `E2 80 94` decode to `U+201D` — a RIGHT DOUBLE QUOTATION MARK. And PowerShell's tokenizer
 * accepts smart quotes as string delimiters. So an em dash inside a double-quoted string decodes into
 * a character that CLOSES the string:
 *
 *     Write-Host "the mirror is INCOMPLETE — stop"      # the dash closes the string early
 *     The string is missing the terminator: ".          # ...and the script will not parse at all
 *
 * The blast radius is the whole file, not the line: every brace after it reads as unbalanced, so the
 * errors surface as "Missing closing '}'" hundreds of lines away, at a `'` inside a word like
 * `they're`. Measured: all seven fleet projects failed their sync with that message.
 *
 * WHY IT SURVIVED REVIEW. A PowerShell **7** host reads a BOM-less file as UTF-8, so the same file
 * parses clean — `Parser::ParseFile` under pwsh reported 0 errors on the broken script. The defect is
 * invisible to every check that does not run the host that actually executes the file, which is why
 * this guard shells out to `powershell.exe` rather than parsing in-process.
 *
 * WHY A BOM AND NOT ASCII-ONLY. Both work. A BOM keeps the repo's prose (its comments are full of em
 * dashes) and needs no rewriting; ASCII-only would fight every future edit. `GuidelineSync.psm1`
 * already carried a BOM for exactly this reason, so this makes the existing pattern the rule.
 */

/** Every `.ps1`/`.psm1` this repo owns, discovered rather than listed. */
function powerShellFiles(dir = REPO, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // Skip generated/vendored trees. `_guidelines/` is a byte copy of `guidelines/`, so a defect here
    // is reported once at its source rather than once per project that happens to be synced.
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '_guidelines' || entry.name.startsWith('.')) continue;
      powerShellFiles(full, out);
    } else if (/\.ps(m1|1)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** The non-ASCII characters in a file, with the count and the UTF-8 bytes that carry them. */
function nonAscii(text) {
  const found = new Map();
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 128) continue;
    const bytes = [...Buffer.from(ch, 'utf8')];
    // The bytes 0x91-0x94 are the ANSI-codepage smart quotes — the ones PowerShell treats as
    // delimiters. Named here so a report says which characters can actually break a parse.
    const quoteRisk = bytes.some((b) => b >= 0x91 && b <= 0x94);
    const key = `U+${cp.toString(16).toUpperCase().padStart(4, '0')} (bytes ${bytes.map((b) => b.toString(16)).join(' ')})${quoteRisk ? ' [ANSI smart-quote risk]' : ''}`;
    found.set(key, (found.get(key) || 0) + 1);
  }
  return found;
}

const hasBom = (file) => fs.readFileSync(file).subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]));

/**
 * Files that carry a non-ASCII character but no BOM — the defect, as a list.
 * @returns {Array<{file: string, chars: Map<string, number>}>}
 */
function unbomdNonAscii(files) {
  const failures = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const chars = nonAscii(text.replace(/^\uFEFF/, ''));
    if (chars.size > 0 && !hasBom(file)) failures.push({ file: path.relative(REPO, file), chars });
  }
  return failures;
}

/** Ask the ACTUAL host to parse a file. Returns {available, errors: string[]}. */
function parseWithHost(file) {
  const cmd = `$t=$null; $e=$null; $null=[System.Management.Automation.Language.Parser]::ParseFile('${file}',[ref]$t,[ref]$e); if ($e.Count -eq 0) { 'CLEAN' } else { $e | ForEach-Object { $_.Message } }`;
  const r = runSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd]);
  if (r.error || r.status !== 0) return { available: false, errors: [] };
  const out = r.stdout.trim();
  return { available: true, errors: out === 'CLEAN' ? [] : out.split(/\r?\n/).filter(Boolean) };
}

const hostProbe = parseWithHost(path.join(REPO, 'package.json'));
const SKIP = hostProbe.available ? false : 'powershell.exe is not available on this host';

test('every PowerShell file with non-ASCII content carries a UTF-8 BOM', () => {
  const failures = unbomdNonAscii(powerShellFiles());
  const detail = failures
    .map((f) => `  ${f.file}: ${[...f.chars.keys()].join(', ')}`)
    .join('\n');
  assert.deepEqual(failures, [], `a PowerShell 5.1 host will not parse these:\n${detail}`);
});

test('the guard is not vacuous — it finds the scripts, and there is non-ASCII to protect', () => {
  const files = powerShellFiles();
  assert.ok(files.length >= 3, `expected the repo's PowerShell scripts, found ${files.length}`);
  // If the corpus ever went ASCII-only, this rule would pass over nothing. Say so out loud rather
  // than leaving a green check that proves nothing.
  const withNonAscii = files.filter((f) => nonAscii(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')).size > 0);
  assert.ok(withNonAscii.length > 0, 'no PowerShell file contains non-ASCII — this guard is now vacuous');
});

test('REVERSAL PROOF: stripping the BOM from a real script is reported', () => {
  const files = powerShellFiles();
  const withBom = files.filter(hasBom);
  assert.ok(withBom.length > 0, 'expected at least one BOM-carrying script to mutate');
  assert.deepEqual(unbomdNonAscii(files), [], 'clean to begin with');

  // The exact regression: an editor that "normalises" line endings or encodings strips the BOM.
  const victim = withBom.find((f) => nonAscii(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')).size > 0);
  assert.ok(victim, 'expected a BOM-carrying script with non-ASCII content');
  const raw = fs.readFileSync(victim);
  const stripped = raw.subarray(3); // drop the BOM
  const tmp = path.join(REPO, '.workbuddy-ai', 'tmp', 'bom-stripped.ps1');
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, stripped);
  try {
    const failures = unbomdNonAscii([tmp]);
    assert.equal(failures.length, 1, 'the mutation must be reported');
    assert.match(failures[0].file, /bom-stripped\.ps1$/);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

test('the host that actually runs these scripts parses every one of them', { skip: SKIP }, () => {
  // The check that would have caught the original defect. An in-process parse under PowerShell 7
  // reported 0 errors on a file that PowerShell 5.1 refused outright, so this MUST go through
  // powershell.exe rather than `Parser::ParseFile` in whatever host the test suite happens to run in.
  const failures = [];
  for (const file of powerShellFiles()) {
    const { errors } = parseWithHost(file);
    for (const message of errors) failures.push(`${path.relative(REPO, file)}: ${message}`);
  }
  assert.deepEqual(failures, [], `powershell.exe 5.1 rejected:\n${failures.join('\n')}`);
});

test('the host parse check is not vacuous — it can report a real syntax error', { skip: SKIP }, () => {
  const tmp = path.join(REPO, '.workbuddy-ai', 'tmp', 'deliberately-broken.ps1');
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  // An unbalanced brace, which is what the encoding defect surfaced as.
  fs.writeFileSync(tmp, 'if ($true) {\n  Write-Host "unclosed"\n');
  try {
    const { available, errors } = parseWithHost(tmp);
    assert.equal(available, true, 'the probe must reach a real host');
    assert.ok(errors.length > 0, 'a broken script must produce at least one parse error');
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});
