#!/usr/bin/env node

/**
 * plan-skills.js — Print, or apply, which skills belong in which project.
 *
 * INTENT: the selector's decision has to be INSPECTABLE before it is destructive. The sync copies
 * into `_skills/` and prunes what no longer fits, so a wrong `appliesTo` or a mistyped Stack table
 * silently changes what an agent can load. This CLI is the dry run: with no `--apply` it prints the
 * plan, every row carries the reason it was copied or skipped, and nothing on disk moves.
 *
 * DECISION: no positional argument means EVERY registered project, because the question this answers
 * — "what would the next sync do?" — is a fleet question. A single project path narrows it.
 *
 * Usage:
 *   node plan-skills.js                      # plan every registered project
 *   node plan-skills.js <projectRoot>        # plan one project
 *   node plan-skills.js <projectRoot> --apply [--no-prune]
 *   node plan-skills.js --json
 *   node plan-skills.js --help               # the same, from the tool itself
 *
 * `--quiet` prints one summary line per project instead of the full row-by-row plan. It exists for
 * the sync, which runs this for every project and would otherwise bury its own log under 7 × 40
 * lines of detail nobody reads on a green run. The full plan remains the default for a human.
 *
 * Exit codes: 0 = planned (or applied); 1 = a project path is missing or a plan is empty for a
 *             configured project; 2 = usage error.
 *
 * Source: global-configs/scripts/plan-skills.js
 */

const fs = require('fs');
const path = require('path');
const { planSkills, applyPlan, SKILL_EXT } = require('./lib/plan-skills.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const REGISTRY = process.env.SYNC_DRIFT_REGISTRY || path.join(REPO_ROOT, 'sync-projects.json');
const SKILLS_DIR =
  process.env.PLAN_SKILLS_DIR || path.join(REPO_ROOT, 'guidelines', 'global-configs', 'skills');

const USAGE = 'Usage: node plan-skills.js [projectRoot] [--apply] [--no-prune] [--json] [--quiet]';

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error(USAGE);
  process.exit(2);
}

/** `--help` is answered, not rejected: a tool whose whole purpose is inspectability must be able to
 *  explain itself without a reader opening the source. Exit 0, because asking for help is not an error. */
function help() {
  console.log(`plan-skills.js — print, or apply, which skills belong in which project.

${USAGE}

  (no arguments)            plan every project in sync-projects.json
  <projectRoot>             plan one project
  --apply                   write the plan into <projectRoot>/_skills/ (default is a dry run)
  --no-prune                with --apply, keep skills that are no longer planned
  --json                    machine-readable output; writes nothing
  --quiet                   one summary line per project (used by the sync)
  --help, -h                this text

The decision reads the project's AGENTS.md §Stack table, its §Forbidden list and its
package.json. A project with no stack signal at all receives every skill.

Exit codes: 0 = planned or applied; 1 = a missing project path or a configured project
            matched zero skills; 2 = usage error.`);
  process.exit(0);
}

/** The registered projects, or an empty list when the registry is absent (it is gitignored). */
function registeredProjects() {
  if (!fs.existsSync(REGISTRY)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
    return (Array.isArray(parsed) ? parsed : parsed.projects || []).filter((p) => p && p.path);
  } catch {
    return [];
  }
}

/** The rungs that produced the profile, for the header line. */
function rungLabel(sources) {
  const names = { stackTable: 'stack table', packageJson: 'package.json', files: 'marker files', agentsProse: 'AGENTS.md prose' };
  const used = Object.entries(sources).filter(([key, on]) => on && names[key]).map(([key]) => names[key]);
  return used.length ? used.join(' + ') : 'nothing';
}

function renderPlan(plan, projectRoot) {
  const { profile } = plan;
  const lines = [];
  lines.push(`  profile: ${profile.mode}   (from ${rungLabel(profile.sources)})`);
  lines.push(`    uses    : ${profile.stack.join(', ') || '—'}`);
  lines.push(`    forbids : ${profile.forbidden.join(', ') || '—'}`);
  if (profile.forbiddenRaw.length > profile.forbidden.length) {
    const dropped = profile.forbiddenRaw.filter((t) => !profile.forbidden.includes(t));
    lines.push(`    reconciled: ${dropped.join(', ')} — named inside a prohibition but declared in use`);
  }
  lines.push('');
  lines.push(`  ✅ COPY (${plan.copy.length})`);
  for (const row of plan.copy) lines.push(`     ${row.file.padEnd(42)} ${row.reason}`);
  lines.push('');
  lines.push(`  ⛔ SKIP (${plan.skip.length})`);
  for (const row of plan.skip) {
    lines.push(`     ${row.file.padEnd(42)} ${row.reason}`);
    if (row.basis && row.basis !== 'appliesTo') lines.push(`     ${''.padEnd(42)} scope from ${row.basis} — declare appliesTo to make this explicit`);
  }
  if (plan.skip.some((row) => row.unknownTokens)) {
    lines.push('');
    lines.push('  ⚠️  unresolvable appliesTo values (the vocabulary does not know them):');
    for (const row of plan.skip.concat(plan.copy)) {
      if (row.unknownTokens) lines.push(`     ${row.file}: ${row.unknownTokens.join(', ')}`);
    }
  }
  lines.push('');
  lines.push(`  ${plan.copy.length} of ${plan.copy.length + plan.skip.length} skills would be copied to ${projectRoot}`);
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) help();
  const known = ['--apply', '--no-prune', '--json', '--quiet'];
  const unknown = argv.filter((a) => a.startsWith('--') && !known.includes(a));
  if (unknown.length) usage(`unknown flag ${unknown[0]}`);
  const apply = argv.includes('--apply');
  const prune = !argv.includes('--no-prune');
  const json = argv.includes('--json');
  const quiet = argv.includes('--quiet');
  const positional = argv.filter((a) => !a.startsWith('--'));
  if (positional.length > 1) usage(`unexpected argument: ${positional[1]}`);

  if (!fs.existsSync(SKILLS_DIR)) usage(`skills directory not found: ${SKILLS_DIR}`);

  let targets;
  if (positional.length === 1) {
    targets = [{ path: positional[0], name: path.basename(path.resolve(positional[0])) }];
  } else {
    targets = registeredProjects();
    if (!targets.length) {
      console.error(`❌ no registered projects (registry: ${REGISTRY}) — pass a project path explicitly`);
      process.exit(1);
    }
  }

  const results = [];
  let failed = false;
  for (const target of targets) {
    if (!fs.existsSync(target.path)) {
      console.error(`❌ project path does not exist: ${target.path}`);
      failed = true;
      continue;
    }
    const plan = planSkills(target.path, SKILLS_DIR);
    const entry = { name: target.name || path.basename(target.path), path: target.path, plan };

    if (apply) {
      entry.applied = applyPlan(target.path, plan, { prune });
    }
    results.push(entry);
  }

  if (json) {
    console.log(
      JSON.stringify(
        results.map((r) => ({
          name: r.name,
          path: r.path,
          mode: r.plan.profile.mode,
          stack: r.plan.profile.stack,
          forbidden: r.plan.profile.forbidden,
          copy: r.plan.copy.map((row) => row.file),
          skip: r.plan.skip.map((row) => ({ file: row.file, reason: row.reason })),
          applied: r.applied || null,
        })),
        null,
        2
      )
    );
  } else if (quiet) {
    for (const entry of results) {
      const { copy, skip } = entry.plan;
      const applied = entry.applied
        ? ` → ${entry.applied.copied.length} written, ${entry.applied.unchanged} unchanged, ${entry.applied.removed.length} pruned`
        : '';
      console.log(`  ${entry.name}: ${copy.length} of ${copy.length + skip.length} skills selected${applied}`);
    }
  } else {
    for (const entry of results) {
      console.log('═══════════════════════════════════════════════');
      console.log(`  Skill plan — ${entry.name}`);
      console.log('═══════════════════════════════════════════════');
      console.log(renderPlan(entry.plan, entry.path));
      if (entry.applied) {
        const a = entry.applied;
        console.log(`  ✅ applied: ${a.copied.length} written, ${a.unchanged} unchanged, ${a.removed.length} pruned`);
        for (const file of a.removed) console.log(`     removed ${file}`);
      }
    }
  }

  // A configured project that matches NO skill is almost certainly a broken profile rather than a
  // project that needs nothing, so it is surfaced instead of being reported as a clean zero.
  for (const entry of results) {
    const { profile, copy } = entry.plan;
    if (profile.mode === 'configured' && copy.length === 0) {
      console.error(`⚠️  ${entry.name}: configured profile matched ZERO skills — check the Stack table and appliesTo values`);
      failed = true;
    }
  }

  process.exit(failed ? 1 : 0);
}

if (require.main === module) main();

module.exports = { registeredProjects, renderPlan, rungLabel, SKILLS_DIR, REGISTRY };
