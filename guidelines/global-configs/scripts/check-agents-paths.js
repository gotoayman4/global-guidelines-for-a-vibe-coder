#!/usr/bin/env node

/**
 * check-agents-paths.js — every file a project's Session Bootstrap tells a session to load must be
 * IN THE REPOSITORY, not merely on the disk that wrote the sentence.
 *
 * INTENT: `AGENTS.md` §Session Bootstrap is the one instruction every session obeys — "read this
 * before you start" — and nothing checked that the files it names still existed, or that they had
 * ever been committed. Measured on the reference project 2026-10-21: eight of the ten rule files
 * the bootstrap loads were untracked, and invisible in `git status` because an ignore rule covered
 * their directory. A fresh clone was told to read files it did not have, and every guard passed.
 * The failure is silent by construction: the instruction is prose, and prose is not compiled.
 *
 * WHY TRACKED, NOT PRESENT. The defect was never a missing file — the files sat on the machine
 * that wrote them. It was a file git had never seen, which for anybody else is indistinguishable
 * from missing. An existence check would have passed on the author's disk and failed only after
 * the clone: the worst possible moment to learn.
 *
 * DECISION — three severities, each matched to what can be PROVEN:
 *   - `missing` / `untracked` → FAILURE. A relative path with a directory that git does not carry
 *     is broken for every clone; there is no reading of the instruction under which it works.
 *   - bare filename → WARNING. A fleet scan found one project naming eight `.md` files with no
 *     directory at all; guessing which one was meant would invent either a pass or a false
 *     failure, so the ambiguity is reported and the owner resolves it.
 *   - external (`D:\…`, UNC) → WARNING. A constitution pointing outside its own repository is not
 *     portable, but a deliberate sibling-repo reference would be, so the owner decides; this guard
 *     only makes the choice visible.
 * `_guidelines/` and `_skills/` are sync-owned mirrors — gitignored by design — so their absence is
 * informational ("run the sync") and never a failure here.
 *
 * CAVEAT: only the Session Bootstrap section is read, at heading depths 2-4 (projects use both `##`
 * and `###`), because that is the only section carrying an obligation. A path named in prose
 * elsewhere is a citation, not an instruction. The guard also cannot tell whether the file it finds
 * is the RIGHT file — only that the target of an instruction resolves inside the repository for
 * everyone who clones it.
 *
 * Usage:
 *   node check-agents-paths.js                 # every project in sync-projects.json (central repo)
 *   node check-agents-paths.js <projectRoot>   # one project, works from inside a project too
 *   node check-agents-paths.js --json
 *
 * Exit codes: 0 = every loadable path resolves for a clone; 1 = at least one does not;
 *             2 = usage error (nothing to check: no registry and no project given).
 *
 * @tier standard+ — a fleet guard run from the central repo beside `check-sync-drift.js`. It is not
 *   in `sync-manifest.json` §guards.required: the registry it reads exists only here, so a project
 *   has no fleet to check. A project can still point it at its own root when it wants the verdict.
 *
 * Source: global-configs/scripts/check-agents-paths.js
 */

const fs = require('fs');
const path = require('path');
const { runSync } = require('./lib/run-sync.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const REGISTRY = process.env.AGENTS_PATHS_REGISTRY || path.join(REPO_ROOT, 'sync-projects.json');

/** Delivered by the sync into every project, and gitignored there by design. */
const MIRROR = /^(_guidelines|_skills)(\/|$)/;

/** A document or config a session is told to LOAD. Command scripts are instructions to run. */
const LOADABLE = /\.(md|json|ya?ml|toml|sql|ts|tsx|js|mjs|cjs)$/i;
const COMMAND_SCRIPT = /\.(ps1|psm1|sh|bash|zsh|cmd|bat)$/i;

/** Usage: the Section, its body, and the depth it was declared at. */
function bootstrap(doc) {
  const lf = doc.replace(/\r\n/g, '\n');
  const heading = /^(#{2,4})[ \t]+Session Bootstrap[ \t]*$/im.exec(lf);
  if (!heading) return null;
  const level = heading[1].length;
  const rest = lf.slice(heading.index + heading[0].length);
  // The section ends at the next heading of the SAME or shallower depth, never at a deeper one.
  const next = new RegExp(`^#{1,${level}}[ \\t]+\\S`, 'm').exec(rest);
  return { level, body: next ? rest.slice(0, next.index) : rest, owner: 'AGENTS.md' };
}

/** The backticked tokens in a section, de-duplicated and in document order. */
function backticked(body) {
  const found = [];
  const re = /`([^`\n]+)`/g;
  let m;
  while ((m = re.exec(body))) found.push(m[1].trim());
  return [...new Set(found)];
}

/**
 * Which tokens are a claim about a file. A path in this corpus never contains a space, a glob or a
 * `<placeholder>`; a URL is not a file; a command script is run, not read.
 */
function candidates(body) {
  return backticked(body).filter((t) => {
    if (!t || /\s/.test(t)) return false;
    if (/^(https?:|mailto:|git@)/.test(t)) return false;
    if (/[<>{}*|]/.test(t)) return false;
    if (COMMAND_SCRIPT.test(t)) return false;
    return LOADABLE.test(t) || t.includes('/');
  });
}

/** Every path git carries in this repository, or null when the directory is not a repository. */
function trackedFiles(root) {
  const result = runSync('git', ['ls-files', '-z'], { cwd: root });
  if (result.status !== 0) return null;
  return new Set(result.stdout.split('\0').filter(Boolean).map((s) => s.replace(/\\/g, '/')));
}

/**
 * Classify one token. `untracked` and `missing` are the two that fail; the rest are reported.
 *
 * @param {string} token   The backticked text.
 * @param {string} root    Project root.
 * @param {Set<string>} tracked Files git carries.
 */
function classify(token, root, tracked) {
  if (/^[A-Za-z]:[\\/]|^\\\\/.test(token)) return { kind: 'external' };

  const relative = token.replace(/\\/g, '/').replace(/^\.\//, '');
  const isDir = relative.endsWith('/');
  const norm = relative.replace(/\/+$/, '');
  if (!norm) return { kind: 'other' };

  if (MIRROR.test(norm)) {
    return { kind: fs.existsSync(path.join(root, norm)) ? 'mirror' : 'mirror-absent' };
  }

  // The project's own tree first: the only location a clone is guaranteed to carry.
  if (fs.existsSync(path.join(root, norm)) || isDir) {
    const carries = tracked.has(norm) || [...tracked].some((f) => f.startsWith(`${norm}/`));
    if (carries) return { kind: 'ok' };
    if (fs.existsSync(path.join(root, norm))) return { kind: 'untracked' };
  }

  // Shared docs are usually named with their `_guidelines/` prefix, but a sentence that states the
  // prefix once and then lists files is a real convention — resolve it there before calling it
  // missing. Measured 2026-10-21 in Evaluator-v4: four files named that way, all of them present.
  for (const shared of ['_guidelines', '_skills']) {
    if (fs.existsSync(path.join(root, shared, norm))) return { kind: 'mirror' };
  }

  // No directory at all: the file could live anywhere, and a guess is not a check.
  if (!norm.includes('/')) return { kind: 'bare' };
  return { kind: 'missing' };
}

const BUCKETS = ['ok', 'mirror', 'mirror-absent', 'bare', 'external', 'missing', 'untracked'];

/**
 * Judge one project. Never throws: a reason it could not judge is in `state`.
 *
 * @param {string} root Project root.
 */
function examine(root) {
  const report = { root, state: 'judged', paths: 0, failure: false, warnings: [] };
  for (const bucket of BUCKETS) report[bucket] = [];

  const agents = path.join(root, 'AGENTS.md');
  if (!fs.existsSync(agents)) return { ...report, state: 'no-agents' };

  const section = bootstrap(fs.readFileSync(agents, 'utf8'));
  if (!section) return { ...report, state: 'no-bootstrap' };

  const tokens = candidates(section.body);
  report.paths = tokens.length;
  if (!tokens.length) return { ...report, state: 'no-paths' };

  const tracked = trackedFiles(root);
  if (!tracked) return { ...report, state: 'not-a-repo', tokens };

  for (const token of tokens) {
    const { kind } = classify(token, root, tracked);
    if (report[kind]) report[kind].push(token);
  }
  report.failure = report.missing.length > 0 || report.untracked.length > 0;
  return report;
}

const STATE_NOTE = {
  'no-agents': 'no AGENTS.md — nothing to obey, nothing to resolve',
  'no-bootstrap': 'no Session Bootstrap section — a hand-written constitution is its own business',
  'no-paths': 'the section names no file',
  'not-a-repo': 'not a git repository — tracked-ness cannot be judged',
};

function render(reports) {
  const lines = [];
  lines.push('═══════════════════════════════════════════');
  lines.push('  AGENTS Path Guard — the instruction must resolve');
  lines.push('═══════════════════════════════════════════');
  lines.push('');

  for (const report of reports) {
    const name = path.basename(report.root);
    if (report.state !== 'judged') {
      lines.push(`  ℹ️  ${name}: ${STATE_NOTE[report.state]}`);
      lines.push('');
      continue;
    }
    const verdict = report.failure ? '❌' : '✅';
    lines.push(`  ${verdict} ${name}: ${report.paths} path(s) named — ${report.ok.length} tracked, ${report.mirror.length} mirror`);
    for (const token of report.untracked) lines.push(`     ❌ untracked  ${token}  (on disk, absent from git — a clone loses it)`);
    for (const token of report.missing) lines.push(`     ❌ missing    ${token}  (not on disk and not in git)`);
    for (const token of report.bare) lines.push(`     ⚠️  bare       ${token}  (no directory — cannot be resolved, only read)`);
    for (const token of report.external) lines.push(`     ⚠️  external   ${token}  (outside the repository — not portable)`);
    for (const token of report['mirror-absent']) lines.push(`     ℹ️  mirror     ${token}  (absent — run the sync)`);
    lines.push('');
  }

  const failed = reports.filter((r) => r.failure);
  const warned = reports.reduce((n, r) => n + r.bare.length + r.external.length, 0);
  if (failed.length) {
    lines.push(`  ❌ ${failed.length} project(s) tell a session to read a file a clone does not have.`);
    lines.push('     Commit the file, or fix the instruction — do not relax the guard.');
  } else {
    lines.push('  ✅ every Session Bootstrap path resolves inside its repository.');
  }
  if (warned) lines.push(`  ⚠️  ${warned} reference(s) reported but not failed — see the severities above.`);
  lines.push('');
  return lines.join('\n');
}

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error('Usage: node check-agents-paths.js [projectRoot] [--json]');
  process.exit(2);
}

function registry() {
  if (!fs.existsSync(REGISTRY)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function main() {
  const argv = process.argv.slice(2);
  let root = null;
  let json = false;

  for (const arg of argv) {
    if (arg === '--json') json = true;
    else if (arg.startsWith('-')) usage(`unknown flag ${arg}`);
    else if (root) usage(`unexpected argument ${arg}`);
    else root = path.resolve(arg);
  }

  let roots;
  if (root) roots = [root];
  else {
    const projects = registry();
    if (!projects) usage(`no project given and no registry at ${REGISTRY}`);
    roots = projects.map((p) => path.resolve(p.path));
  }

  const reports = roots.map(examine);
  const failed = reports.some((r) => r.failure);
  console.log(json ? JSON.stringify(reports, null, 2) : render(reports));
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main();

module.exports = { examine, bootstrap, candidates, classify, trackedFiles, render };
