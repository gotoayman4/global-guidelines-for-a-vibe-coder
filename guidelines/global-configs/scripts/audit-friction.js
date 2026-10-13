#!/usr/bin/env node

/**
 * audit-friction.js — Measure the process, on a schedule, with an instrument behind it.
 *
 * INTENT: No correctness gate will ever report "the workflow is slow" as a failure, so the
 * process rots in increments — each step looking reasonable alone. `workflow-friction-audit.md`
 * named the method and shipped no command; a project then had to write its own instrument.
 * This is the instrument, and it is what makes the audit's cadence checkable.
 *
 * CONSTRAINT: report-only by default. A friction finding is a decision for the operator, not a
 * failing build — the ONE thing that fails is `--check-cadence`, because an audit nobody runs
 * is the exact failure this file exists to prevent. Every number is measured here; none is
 * carried in from a document.
 *
 * DECISION: the four buckets are the ones the method names — reading (boot chain), churn
 * (docs vs code), delivery (mirror drift), and lessons (proposals that name no control).
 * Ranked by repeated cost, not by severity language.
 *
 * Usage:
 *   node audit-friction.js [projectRoot] [--write] [--json] [--check-cadence] [--days N]
 *
 * Exit codes: 0 = report (or cadence healthy); 1 = --check-cadence found no recent artifact;
 *             2 = corpus error (project root missing).
 *
 * Source: global-configs/scripts/audit-friction.js
 */

const fs = require('fs');
const path = require('path');
const { runSync } = require('./lib/run-sync.js');
const { hashTree } = require('./check-sync-drift.js');
const { parseFrontMatter, meta } = require('./lib/front-matter.js');
const { skillScope } = require('./lib/plan-skills.js');
const { listSkills } = require('./lib/skill-files.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SOURCE = path.join(REPO_ROOT, 'guidelines');
const BOOT = path.join(__dirname, 'measure-boot-budget.js');

const CADENCE_DAYS = 35;
const CHURN_COMMITS = 40;
const ARTIFACT_DIR = 'docs/friction';

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error('Usage: node audit-friction.js [projectRoot] [--write] [--json] [--check-cadence] [--days N]');
  process.exit(2);
}

/** The declared reading budget, read from the file that owns it (speed-tiered-workflow.md). */
// Owned by `lib/context-caps.js` — one reader for both instruments. A repo-root-relative path
// here resolved to `<project>/guidelines`, which does not exist downstream, so every consuming
// project was told "no cap found to compare against" while the check reported success.
const { contextCaps } = require('./lib/context-caps.js');

/** Boot-chain tokens, from the instrument that already owns the measurement. */
function bootChain(root) {
  const result = runSync(process.execPath, [BOOT, root, '--json'], { cwd: REPO_ROOT });
  if (result.status !== 0 && !result.stdout) return null;
  try {
    const parsed = JSON.parse(result.stdout);
    const present = (parsed.files || []).filter((f) => Number.isFinite(f.tokens));
    const menu = (parsed.onDemand || []).filter((f) => Number.isFinite(f.tokens));
    return {
      totalTokens: parsed.totalTokens,
      files: present.length,
      missing: parsed.missingFiles || [],
      heaviest: present.slice().sort((a, b) => b.tokens - a.tokens).slice(0, 3).map((f) => `${f.rel} ${f.tokens}`),
      // Reported beside the chain, never added to it: the menu is a ratchet (rule 4),
      // and a sum of the two is the figure that made the cap look unmet when it was not.
      menuTokens: parsed.onDemandTokens || 0,
      menuFiles: menu.length,
    };
  } catch {
    return null;
  }
}

/** Doc-vs-code churn over the last N commits — the bucket teams never look at. */
function churn(root, commits = CHURN_COMMITS) {
  const result = runSync('git', ['log', `-${commits}`, '--numstat', '--format=%h'], { cwd: root });
  if (result.status !== 0) return null;
  let docAdd = 0;
  let codeAdd = 0;
  let docFiles = 0;
  for (const line of result.stdout.split('\n')) {
    const parts = line.split('\t');
    if (parts.length !== 3) continue;
    const added = Number(parts[0]);
    if (!Number.isFinite(added)) continue;
    if (parts[2].endsWith('.md')) {
      docAdd += added;
      docFiles += 1;
    } else {
      codeAdd += added;
    }
  }
  if (codeAdd === 0) return null;
  return { commits, docAdd, codeAdd, docFiles, ratio: Number((docAdd / codeAdd).toFixed(2)) };
}

/** Delivery: is this project's mirror the current rules? */
/**
 * Compare a project's mirror against the source it was delivered from.
 *
 * The source is the central repo, so this is only answerable from a central-side run; the
 * `source` parameter exists so that fact is testable rather than assumed. From a project the
 * mirror exists but the source does not, and the two states must not collapse: reporting "no
 * `_guidelines/` mirror in this project" for a project that has one is a false statement the
 * report then acts on.
 */
function delivery(root, source = SOURCE) {
  const mirror = path.join(root, '_guidelines');
  if (!fs.existsSync(mirror)) return null;
  const theirs = hashTree(mirror);
  if (!fs.existsSync(source)) {
    return { comparable: false, inSync: null, mirrorFiles: theirs.count, sourceFiles: 0 };
  }
  const ours = hashTree(source);
  return { comparable: true, inSync: theirs.hash === ours.hash, mirrorFiles: theirs.count, sourceFiles: ours.count };
}

/**
 * Skills: the one delivered artifact that INSTRUCTS the agent rather than informing it.
 *
 * WHAT THIS CAN AND CANNOT SEE, stated because the difference is the whole point. Whether an agent
 * actually loaded a skill is recorded nowhere in a repository — a session transcript is not an
 * artifact this repo holds, and inventing a number for it would be worse than reporting nothing.
 * What IS measurable is whether a skill COULD be loaded and whether its scope is DECLARED: a skill
 * with no `description` cannot be activated by any loader (the description is the field they read to
 * decide), and a skill whose scope is inferred from `tags` is one whose selection rule lives in a
 * taxonomy field rather than in the field the selector is documented to read.
 *
 * The `inferred` count is the debt this instrument exists to make visible: it is the number of
 * skills whose placement in a project is decided by a fallback. It is allowed — the ratchet counts an
 * absent declaration rather than failing it — but it must be countable, or the fallback quietly
 * becomes the rule. Measured centrally 2026-10-12: 1 of 20 declared, 8 inferred, 11 stack-agnostic.
 */
function skills(root) {
  const dir = path.join(root, '_skills');
  if (!fs.existsSync(dir)) return null;
  const files = listSkills(dir);
  if (files.length === 0) return null;

  const triggerless = [];
  const inferred = [];
  const unresolved = [];
  let declared = 0;
  let agnostic = 0;
  for (const skill of files) {
    const fm = parseFrontMatter(fs.readFileSync(skill.abs, 'utf8'));
    const description = meta(fm, 'description');
    if (!description || String(description).trim() === '') triggerless.push(skill.file);
    const scope = skillScope(fm);
    if (scope.declared) declared += 1;
    else if (scope.tokens.length) inferred.push(skill.file);
    else agnostic += 1;
    if (scope.unknown.length) unresolved.push(`${skill.file} (${scope.unknown.join(', ')})`);
  }
  return {
    total: files.length,
    triggerless: triggerless.length,
    declared,
    inferred: inferred.length,
    agnostic,
    unresolved: unresolved.length,
    examples: triggerless.slice(0, 3),
    inferredExamples: inferred.slice(0, 3),
    unresolvedExamples: unresolved.slice(0, 3),
  };
}

/**
 * A proposal names its control inline, as a bold label that starts with the word, or gives it
 * a section of its own.
 *
 * CAVEAT: the proposal's *format* is not prescribed anywhere — `AGENTS.md` names the four
 * things it must contain (event, preventing rule, target guideline, guard), not their markup.
 * Matching only the literal `**Guard:**` reported real guards as absent in two different
 * shapes: `**Guard that fails if the lesson is unlearned:**` and a `## The guard …` heading.
 * All three now count. This is a heuristic for a report, never a gate.
 */
const GUARD_INLINE = /\*\*(?:Guard|Control)\b[^*]*:\*\*/i;
/** The section form, e.g. `## The guard that fails if the lesson is unlearned`. */
const GUARD_SECTION = /^#{2,6}\s+[^\n]*\bguard\b[^\n]*$/im;

/** Does this proposal name the control that fails if the lesson is unlearned? */
function namesGuard(content) {
  return GUARD_INLINE.test(content) || GUARD_SECTION.test(content);
}

/** Lessons: proposals that name no control are wishes, not rules (S14). */
function proposals(root) {
  const dir = path.join(root, 'guidelines-proposals');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  const withoutGuard = files.filter((f) => !namesGuard(fs.readFileSync(path.join(dir, f), 'utf8')));
  return { total: files.length, withoutGuard: withoutGuard.length, examples: withoutGuard.slice(0, 3) };
}

/** The most recent artifact, and how old it is in days. */
function lastArtifact(root) {
  const dir = path.join(root, ARTIFACT_DIR);
  if (!fs.existsSync(dir)) return null;
  const dated = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort();
  if (!dated.length) return null;
  const newest = dated[dated.length - 1];
  const ageDays = Math.floor((Date.now() - new Date(newest.slice(0, 10)).getTime()) / 86400000);
  return { file: path.join(ARTIFACT_DIR, newest), ageDays };
}

function render(report) {
  const { root, boot, churn: c, delivery: d, skills: k, proposals: p, caps, last } = report;
  const lines = [];
  lines.push('═══════════════════════════════════════════');
  lines.push(`  Workflow Friction — ${root}`);
  lines.push(`  ${report.date}`);
  lines.push('═══════════════════════════════════════════');
  lines.push('');

  lines.push('  Reading (boot chain)');
  if (!boot) {
    lines.push('    — not measured (no boot chain found)');
  } else {
    const cap = caps.vibe;
    const verdict = cap && boot.totalTokens > cap ? `over the vibe cap of ${cap} tokens` : cap ? `within the vibe cap of ${cap}` : 'no cap found to compare against';
      lines.push(`    ${boot.totalTokens} tokens across ${boot.files} files — ${verdict}`);
      if (boot.menuTokens) {
        lines.push(`    menu (read by choice, ratcheted not budgeted): ${boot.menuTokens} tokens across ${boot.menuFiles} documents`);
      }
      lines.push(`    heaviest: ${boot.heaviest.join(' · ')}`);
    if (boot.missing.length) lines.push(`    ⚠️  mandated but absent: ${boot.missing.join(', ')}`);
  }
  lines.push('');

  lines.push(`  Churn (last ${CHURN_COMMITS} commits)`);
  if (!c) {
    lines.push('    — not measured (not a git repository)');
  } else {
    lines.push(`    docs +${c.docAdd} · code +${c.codeAdd} → ${c.ratio} doc lines per code line (${c.docFiles} doc file-touches)`);
    lines.push(c.ratio > 0.5 ? '    ⚠️  the paperwork is approaching the code in size — see workflow-friction-audit.md' : '    ✅ paperwork is not the bottleneck here');
  }
  lines.push('');

  lines.push('  Delivery (mirror vs source)');
  if (!d) {
    lines.push('    — no _guidelines/ mirror in this project');
  } else if (!d.comparable) {
    lines.push(`    mirror present (${d.mirrorFiles} files) — the source is the central repo, so this is`);
    lines.push('      checked there, not here: `npm run sync:drift` in the central repo');
  } else if (d.inSync) {
    lines.push(`    ✅ mirror matches the source (${d.sourceFiles} files)`);
  } else {
    lines.push(`    ❌ mirror is behind: ${d.mirrorFiles} files vs ${d.sourceFiles} in the source`);
    lines.push('    → run `npm run sync:all`; the project is running older rules than it thinks');
  }
  lines.push('');

  lines.push('  Skills (readiness — whether a skill LOADED is not observable from the repo)');
  if (!k) {
    lines.push('    — no _skills/ directory in this project');
  } else {
    lines.push(`    ${k.total} skill(s) mirrored`);
    lines.push(k.triggerless === 0
      ? '    ✅ every skill declares a trigger'
      : `    ⚠️  ${k.triggerless} skill(s) declare no trigger — no loader can activate them`);
    for (const e of k.examples) lines.push(`       ${e}`);
    lines.push(`    scope: ${k.declared} declared (appliesTo) · ${k.inferred} inferred from tags · ${k.agnostic} stack-agnostic`);
    if (k.inferred > 0) {
      lines.push(`    ℹ️  ${k.inferred} skill(s) rely on INFERRED scope — declaring appliesTo makes the`);
      lines.push('       selector\'s rule explicit instead of a fallback');
      for (const e of k.inferredExamples) lines.push(`       ${e}`);
    }
    if (k.unresolved > 0) {
      lines.push(`    ⚠️  ${k.unresolved} skill(s) declare an appliesTo value the vocabulary cannot resolve`);
      lines.push('       — an unresolvable value is inert, so the skill reads as unscoped and is copied');
      lines.push('       to every project. See `npm run audit`.');
      for (const e of k.unresolvedExamples) lines.push(`       ${e}`);
    }
  }
  lines.push('');

  lines.push('  Lessons (guidelines-proposals)');
  if (!p) {
    lines.push('    — none');
  } else if (p.withoutGuard === 0) {
    lines.push(`    ✅ all ${p.total} proposals name a control`);
  } else {
    lines.push(`    ⚠️  ${p.withoutGuard} of ${p.total} proposals name no guard — a lesson with no failing check is a wish`);
    for (const e of p.examples) lines.push(`       ${e}`);
  }
  lines.push('');

  lines.push('  Cadence');
  lines.push(last ? `    last artifact ${last.file} — ${last.ageDays} day(s) old (target ≤ ${CADENCE_DAYS})` : '    no artifact yet — run with --write');
  lines.push('');
  lines.push('  Ranked by repeated cost: fix the item paid most often, not the one that sounds worst.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes('--write');
  const json = argv.includes('--json');
  const checkCadence = argv.includes('--check-cadence');
  const daysIdx = argv.indexOf('--days');
  const days = daysIdx === -1 ? CADENCE_DAYS : Number(argv[daysIdx + 1]);
  const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--days');
  if (positional.length > 1) usage(`unexpected argument: ${positional[1]}`);

  const root = path.resolve(positional[0] || process.cwd());
  if (!fs.existsSync(root)) usage(`project root does not exist: ${root}`);

  const report = {
    date: new Date().toISOString().split('T')[0],
    root,
    caps: contextCaps(),
    boot: bootChain(root),
    churn: churn(root),
    delivery: delivery(root),
    skills: skills(root),
    proposals: proposals(root),
    last: lastArtifact(root),
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(render(report));
  }

  if (write) {
    const dir = path.join(root, ARTIFACT_DIR);
    fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, `${report.date}.md`);
    const body = `# Workflow friction — ${report.date}\n\n\`\`\`\n${render(report)}\`\`\`\n`;
    fs.writeFileSync(out, body, 'utf8');
    if (!json) console.log(`  ✅ wrote ${path.relative(root, out)}\n`);
  }

  if (checkCadence) {
    const age = report.last ? report.last.ageDays : Infinity;
    const fresh = write ? 0 : age;
    if (fresh > days) {
      console.error(`❌ friction audit is stale: ${report.last ? `${age} day(s) since ${report.last.file}` : 'no artifact has ever been written'} (limit ${days}). Run: npm run audit:friction -- --write`);
      process.exit(1);
    }
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { contextCaps, bootChain, churn, delivery, skills, proposals, lastArtifact, CADENCE_DAYS };
