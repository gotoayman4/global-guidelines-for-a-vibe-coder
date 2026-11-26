#!/usr/bin/env node

/**
 * scan-secrets.js — Fail a commit that adds a credential, before it enters history.
 *
 * INTENT: "NEVER hardcode secrets; pre-commit hooks scan for secret patterns" is a constitution rule
 * with no scanner behind it unless the project installs one. This is a dependency-free baseline: it reads
 * the lines a commit ADDS (`git diff --cached`), not the whole tree, so it is fast and never re-flags
 * history. High-confidence patterns only — a noisy scanner gets bypassed, and a bypassed scanner is worse
 * than none. It complements, and does not replace, a dedicated tool such as gitleaks.
 *
 * Usage:
 *   node scan-secrets.js                 # scan staged additions in the current repo (pre-commit)
 *   node scan-secrets.js --file <path>   # scan one file's full text (no git needed)
 *
 * A line carrying `secretscan:allow` is skipped (a documented example key). `.env.example`, lockfiles
 * and this repo's own test fixtures are never scanned.
 *
 * Exit codes: 0 = clean; 1 = a probable secret was found (findings on stderr, values redacted).
 *
 * Source: global-configs/scripts/scan-secrets.js
 */

const fs = require('fs');
const path = require('path');
const { runSync } = require('./lib/run-sync.js');

const PATTERNS = [
  { id: 'private-key', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
  { id: 'aws-access-key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { id: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b/ },
  { id: 'stripe-live-key', re: /\b(?:sk|rk)_live_[0-9A-Za-z]{16,}\b/ },
  { id: 'slack-token', re: /\bxox[abprs]-[0-9A-Za-z-]{20,}\b/ },
  { id: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: 'openai-style-key', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/ },
  { id: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { id: 'url-credentials', re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@"']{2,}:[^\s:/@"']{6,}@[^\s/"']+/i },
  {
    id: 'assigned-secret',
    re: /\b[A-Za-z0-9_]*(?:secret|passw(?:or)?d|api[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key)[A-Za-z0-9_]*["']?\s*[:=]\s*["'][^"'\s$<>{}()]{12,}["']/i,
    // Placeholders and env lookups are the correct way to write these — never a finding.
    ignore: /(?:your|example|placeholder|changeme|dummy|sample|xxxx|\*{4,}|process\.env|import\.meta\.env|os\.environ|getenv)/i,
  },
];

const SKIP_FILE = /(?:^|\/)(?:\.env\.example|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$|(?:^|\/)tests?\/fixtures?\//;

/**
 * @param {string} text
 * @param {string} name label for findings
 * @returns {{file: string, line: number, id: string, sample: string}[]}
 */
function scanText(text, name) {
  const findings = [];
  const lines = String(text).split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes('secretscan:allow')) return;
    for (const p of PATTERNS) {
      const m = line.match(p.re);
      if (!m) continue;
      if (p.ignore && p.ignore.test(line)) continue;
      findings.push({ file: name, line: i + 1, id: p.id, sample: `${m[0].slice(0, 4)}…(${m[0].length} chars)` });
      break;
    }
  });
  return findings;
}

/** Added lines per file from a unified `-U0` diff, with their real line numbers. */
function parseAddedLines(diff) {
  const files = new Map();
  let file = null;
  let lineNo = 0;
  for (const raw of String(diff).split(/\r?\n/)) {
    if (raw.startsWith('+++ ')) {
      file = raw.slice(4).replace(/^b\//, '');
      if (file === '/dev/null') file = null;
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      lineNo = Number(hunk[1]);
      continue;
    }
    if (file && raw.startsWith('+') && !raw.startsWith('+++')) {
      if (!files.has(file)) files.set(file, []);
      files.get(file).push({ line: lineNo, text: raw.slice(1) });
      lineNo += 1;
    }
  }
  return files;
}

function scanDiff(diff) {
  const findings = [];
  for (const [file, added] of parseAddedLines(diff)) {
    if (SKIP_FILE.test(file.replace(/\\/g, '/'))) continue;
    for (const { line, text } of added) {
      for (const f of scanText(text, file)) findings.push({ ...f, line });
    }
  }
  return findings;
}

function report(findings) {
  console.error('❌ Probable secret(s) in this commit — remove them (use environment variables) or mark a documented example `secretscan:allow`:');
  for (const f of findings) console.error(`   ${f.file}:${f.line}  [${f.id}]  ${f.sample}`);
}

function main() {
  const argv = process.argv.slice(2);
  const fileAt = argv.indexOf('--file');
  if (fileAt !== -1) {
    const target = argv[fileAt + 1];
    if (!target || !fs.existsSync(target)) {
      console.error('Usage: node scan-secrets.js [--file <path>]');
      process.exit(3);
    }
    const findings = scanText(fs.readFileSync(target, 'utf8'), path.basename(target));
    if (findings.length) {
      report(findings);
      process.exit(1);
    }
    process.exit(0);
  }
  const res = runSync('git', ['diff', '--cached', '-U0', '--no-color', '--diff-filter=ACMR']);
  if (res.error || res.status !== 0) {
    console.error(`scan-secrets: could not read the staged diff (${res.error ? res.error.message : res.stderr.trim()}) — not blocking`);
    process.exit(0);
  }
  const findings = scanDiff(res.stdout);
  if (findings.length) {
    report(findings);
    process.exit(1);
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { scanText, scanDiff, parseAddedLines, PATTERNS, SKIP_FILE };
