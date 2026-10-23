#!/usr/bin/env node

/**
 * audit-gate.js — the dependency-audit wrapper the pre-push hook calls, never a bare `npm audit`.
 *
 * WHY A WRAPPER AND NOT `npm audit`. A bare `npm audit` reports "no vulnerabilities" by printing
 * nothing and exiting 0 when it cannot reach the registry. The gate then passes while knowing
 * NOTHING about the dependency state — a silent pass, which is worse than no gate at all, because
 * it is recorded as evidence. This wrapper treats "I could not determine the answer" as a failure
 * and says so by name.
 *
 * THE RULE, stated once: the gate passes only when `npm audit --json` produced a parseable report
 * containing a `metadata.vulnerabilities` object. Everything else — non-JSON output, a missing
 * metadata block, an unexpected exit code, a timeout — fails closed with the captured stderr.
 *
 * WHAT IS GATED. High and critical ADVISORIES, matched by their advisory URL (GHSA-…), not by
 * package name: one package can carry several advisories of different severities, and one advisory
 * can reach several packages, so a name-keyed list is wrong in both directions.
 *
 * THE ALLOWLIST is project-local (`scripts/audit-allowlist.json`, relative to the repository root)
 * and EXPIRING: every entry carries a `why` and a `reviewBy` date. An entry whose review date has
 * passed AND whose advisory is still reported fails the gate — the exemption lapsed and the risk
 * remains. An entry whose advisory is gone is stale clutter: it is printed so it can be deleted.
 * An allowlist that never expires is a permanent exemption with no owner.
 *
 * WHERE IT RUNS. The repository root is the process's working directory, because npm runs a
 * lifecycle script in the package root. The corpus copy audits whichever repository invokes it;
 * a project that copies it under its own `scripts/` audits that project.
 *
 * Usage:
 *   node audit-gate.js            # human-readable verdict
 *   node audit-gate.js --json     # machine-readable
 *
 * Exit codes: 0 = audited, and the result is clean or only tolerated findings; 1 = fail closed,
 *             with a named reason.
 *
 * Source: global-configs/scripts/audit-gate.js
 */

const fs = require('fs');
const path = require('path');
const { npmSync } = require('./lib/run-sync.js');

/** An unreachable registry should fail in a minute, not hang a push forever. */
const TIMEOUT_MS = 120000;

/** Advisory severities that fail the gate. Lower ones are reported, not enforced. */
const GATED_SEVERITIES = ['high', 'critical'];

/** The project-local allowlist, relative to the repository root. */
const ALLOWLIST = path.join('scripts', 'audit-allowlist.json');

/**
 * The child environment.
 *
 * `npm_config_ignore_scripts` is pinned here because `npm audit` runs inside a lifecycle script
 * and must never execute a dependency's install script. `npm_config_allow_scripts` is DELETED:
 * npm exports the whole config surface as `npm_config_*` into every child, and npm 11 rejects
 * `allow-scripts` when it arrives from the environment rather than from `.npmrc` — measured
 * 2026-10-11: with the variable inherited, `npm audit` exits 1 with `EALLOWSCRIPTS` on every
 * push, which is a permanently red gate nobody can act on. `npm audit` reads the lockfile and the
 * advisory database and installs nothing, so install-script policy cannot weaken it.
 */
function auditEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.toLowerCase() === 'npm_config_allow_scripts') delete env[key];
  }
  env.npm_config_ignore_scripts = 'true';
  return env;
}

/** Last few lines of a stream, so a failure message stays readable in a hook. */
const tail = (text, lines = 12) => text.trim().split('\n').slice(-lines).join('\n');

/**
 * The allowlist, parsed.
 *
 * A malformed allowlist FAILS: an allowlist that cannot be read is not an allowlist that allows
 * nothing, it is an allowlist nobody is looking at, and treating it as empty would silently
 * enforce a policy the project thought it had relaxed. A MISSING allowlist is the opposite case —
 * no accepted risks have been recorded, which is the same as an empty one — so it is reported and
 * the gate continues.
 *
 * @param {string} root the repository root
 * @returns {{entries: object, error: string|null, present: boolean}}
 */
function readAllowlist(root) {
  const file = path.join(root, ALLOWLIST);
  if (!fs.existsSync(file)) return { entries: {}, error: null, present: false };
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return { entries: {}, error: `${ALLOWLIST} is not valid JSON — ${err.message}`, present: true };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { entries: {}, error: `${ALLOWLIST} must be an object keyed by advisory URL`, present: true };
  }
  for (const [url, entry] of Object.entries(parsed)) {
    if (url.startsWith('_')) continue;
    if (!entry || typeof entry !== 'object') {
      return { entries: {}, error: `${ALLOWLIST} entry "${url}" must be an object with a "why"`, present: true };
    }
    if (!entry.why) {
      return { entries: {}, error: `${ALLOWLIST} entry "${url}" has no "why" — an accepted risk must state its reason`, present: true };
    }
  }
  return { entries: parsed, error: null, present: true };
}

/** Has this entry's review date passed? An entry with no date never expires. */
function expired(entry, now) {
  if (!entry || !entry.reviewBy) return false;
  const due = Date.parse(entry.reviewBy);
  if (Number.isNaN(due)) return true;
  return due < now.getTime();
}

/**
 * The gated advisories in a report, keyed by advisory URL.
 *
 * @param {object} report the parsed `npm audit --json` report
 * @returns {Map<string, {title: string, packages: Set<string>}>}
 */
function gatedAdvisories(report) {
  const found = new Map();
  const vulnerabilities = (report && report.vulnerabilities) || {};
  for (const [pkg, info] of Object.entries(vulnerabilities)) {
    for (const via of (info && info.via) || []) {
      if (!via || typeof via !== 'object') continue;
      if (!GATED_SEVERITIES.includes(via.severity)) continue;
      const url = via.url || `${pkg}@${via.title || 'unknown-advisory'}`;
      if (!found.has(url)) found.set(url, { title: via.title || '', packages: new Set(), severity: via.severity });
      found.get(url).packages.add(pkg);
    }
  }
  return found;
}

/**
 * The verdict, computed from the report and the allowlist.
 *
 * @param {object} report the parsed `npm audit --json` report
 * @param {object} entries the allowlist
 * @param {Date} [now] the clock, injected so a test can prove the expiry rule
 * @returns {{blocking: string[], tolerated: string[], stale: string[], counts: object}}
 */
function judge(report, entries, now = new Date()) {
  const found = gatedAdvisories(report);
  const counts = (report && report.metadata && report.metadata.vulnerabilities) || {};
  const blocking = [];
  const tolerated = [];
  const stale = [];

  for (const [url, detail] of found) {
    const entry = entries[url];
    if (!entry) {
      blocking.push(`${url} :: ${detail.title} (via ${[...detail.packages].join(', ')})`);
      continue;
    }
    if (expired(entry, now)) {
      blocking.push(`${url} :: ${detail.title} — the allowlist entry expired ${entry.reviewBy}`);
      continue;
    }
    tolerated.push(`${url} :: ${detail.title} — tolerated until ${entry.reviewBy || 'further notice'}`);
  }

  for (const [url, entry] of Object.entries(entries)) {
    if (url.startsWith('_')) continue;
    if (!expired(entry, now)) continue;
    if (found.has(url)) continue;
    stale.push(`${url} — the allowlist entry expired ${entry.reviewBy}, but the advisory is no longer reported: delete it`);
  }

  return { blocking, tolerated, stale, counts };
}

/** The empty verdict — one shape, so a caller never reads a missing field. */
function verdict() {
  return { ok: true, reason: null, detail: null, blocking: [], tolerated: [], stale: [], counts: {} };
}

/**
 * Run `npm audit --json` and turn the outcome into a verdict.
 *
 * @param {string} root the repository root
 * @param {Date} [now] the clock
 * @returns {{ok: boolean, reason: string|null, detail: string|null, blocking: string[], tolerated: string[], stale: string[], counts: object}}
 */
function audit(root, now = new Date()) {
  const result = npmSync(['audit', '--json'], { cwd: root, env: auditEnv(), timeout: TIMEOUT_MS });

  if (result.error) {
    return { ...verdict(), ok: false, reason: `npm audit could not start — ${result.error.message}`, detail: result.stderr };
  }
  if (result.signal) {
    return {
      ...verdict(),
      ok: false,
      reason: `npm audit did not answer within ${TIMEOUT_MS / 1000}s`,
      detail: 'An unreachable registry is the usual cause. This is a FAILURE, not a pass: the dependency state is unknown.',
    };
  }
  if (result.status !== 0 && result.status !== 1) {
    // npm exits 1 when it FOUND vulnerabilities, so only 0 and 1 carry a verdict. Anything else
    // (7 = no lockfile, 128+, a crash) means the audit never ran.
    return {
      ...verdict(),
      ok: false,
      reason: `npm audit exited with code ${result.status} — it did not produce a report`,
      detail: tail(result.stderr) || '(no stderr)',
    };
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    return {
      ...verdict(),
      ok: false,
      reason: 'npm audit produced no parseable JSON report',
      detail: [
        'This is the silent-pass case this wrapper exists to catch: a bare `npm audit` exits 0 here',
        'and reports nothing, so the gate would record a pass it did not earn.',
        '',
        'Captured stderr:',
        tail(result.stderr) || '(empty)',
      ].join('\n'),
    };
  }

  const counts = report && report.metadata && report.metadata.vulnerabilities;
  if (counts === null || typeof counts !== 'object') {
    return {
      ...verdict(),
      ok: false,
      reason: 'npm audit returned JSON with no `metadata.vulnerabilities` block — the report is not trustworthy',
      detail: tail(result.stdout, 12),
    };
  }

  const { entries, error, present } = readAllowlist(root);
  if (error) return { ...verdict(), ok: false, reason: error, detail: null };

  const judged = judge(report, entries, now);
  return {
    ...judged,
    ok: judged.blocking.length === 0,
    reason: judged.blocking.length === 0 ? null : `${judged.blocking.length} gated advisory/advisories are not accepted`,
    detail: judged.blocking.join('\n'),
    allowlist: present ? ALLOWLIST : null,
  };
}

function main() {
  const json = process.argv.includes('--json');
  const root = process.cwd();
  const result = audit(root);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  const summary = ['info', 'low', 'moderate', 'high', 'critical', 'total']
    .filter((key) => typeof result.counts[key] === 'number')
    .map((key) => `${key}=${result.counts[key]}`)
    .join('  ');

  if (!result.ok) {
    console.error(`audit:gate FAIL — ${result.reason}`);
    if (result.detail) console.error(result.detail);
    process.exit(1);
  }
  if (!result.allowlist) console.log(`  note       no ${ALLOWLIST} — no risk is accepted`);
  for (const line of result.tolerated) console.log(`  tolerated  ${line}`);
  for (const line of result.stale) console.log(`  stale      ${line}`);
  console.log(`audit:gate OK — the registry answered and the report parsed (${summary || 'no counts'}).`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { audit, judge, readAllowlist, gatedAdvisories, expired, auditEnv, GATED_SEVERITIES, ALLOWLIST };
