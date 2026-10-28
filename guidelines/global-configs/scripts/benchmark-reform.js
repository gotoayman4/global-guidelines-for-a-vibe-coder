#!/usr/bin/env node

/**
 * benchmark-reform.js — Did the lean reform cut reading cost WITHOUT losing the rules?
 *
 * INTENT: Measure the reform instead of asserting it. The pre-reform doctrine made an agent read
 * a session-initiation chain before the first edit; the lean model cuts that chain to AGENTS.md +
 * WORLD.md and makes the index a lookup. This instrument reports, from the actual files:
 *
 *   COST      tokens (chars/4, the same estimate the rest of the repo uses) for the reading chain
 *             before and after, plus the task file each representative request needs.
 *   RULE      whether a distinctive rule sentence in that task file survived the reform. A reform
 *   RETENTION that cut cost by deleting guidance would be a regression, not a result.
 *   REACH     whether the task file is still registered in MASTER_INDEX and whether a mapped skill
 *             is still loadable (its front-matter carries a name and description).
 *
 * THE BEFORE SIDE IS READ FROM GIT, not from memory. Each before file is loaded with
 * `git show <ref>:<path>`, so the baseline cannot drift with the working tree. The after side is
 * the working tree — the state about to ship, including uncommitted edits.
 *
 * WHAT THE BEFORE CHAIN IS. The narrowest defensible reading is the mandated doc set: pre-reform,
 * `documentation-strategy.md` marked AGENTS.md, WORLD.md and README.md `every session`; after, only
 * AGENTS.md and WORLD.md are mandatory. Wider than that, the pre-reform `AGENT_BOOT_PROTOCOL.md`
 * (the session-initialisation procedure the central README pointed at) told Step 2 to read
 * `MASTER_INDEX.md` whenever a mirror exists and pointed Step 4 at `RETRIEVAL_RULES.md`. Both bands
 * are reported separately: `declared` (the every-session set) and `full` (declared + the retrieval
 * procedure). Reporting only the wide band would overstate the gain; reporting only the narrow
 * band would hide the retrieval tax the reform actually removed.
 *
 * WHAT THIS IS NOT. Rule retention is a textual check, not a live-agent run: it proves the rule
 * text is still there and still reachable, not that an agent asked to "audit security" will open
 * the right file on the first try. A live run (12–20 prompts against N sessions, scored for
 * first-file choice) is the stronger test and remains unrun. Token counts are chars/4 estimates.
 *
 * CONSTRAINT: Report-only by default. `--check` exits 1 when a rule was lost, a task file
 * disappeared, a task file is unindexed, or a mapped skill stopped being loadable. A catalog whose
 * regex no longer matches the BEFORE ref is a broken instrument, not a finding — that exits 2.
 * `--fleet` measures registered projects read-only and never writes; their chains stay in the
 * pre-reform shape until each project's own slice re-syncs its AGENTS.md.
 *
 * Usage:
 *   node benchmark-reform.js [--json] [--check] [--before <ref>] [--fleet]
 *
 * Source: global-configs/scripts/benchmark-reform.js
 * Last Updated: 2026-10-28
 */

const fs = require('fs');
const path = require('path');
const { runSync } = require('./lib/run-sync.js');
const { parseFrontMatter } = require('./lib/front-matter.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const BEFORE_DEFAULT = 'ec55a54';

/**
 * The pre-reform every-session set. `README.md` is here because the old mandated-doc table marked
 * it `every session`; the lean table demotes it to orientation.
 */
const DECLARED_BEFORE = [
  { rel: 'guidelines/global-configs/templates/AGENTS.starter.md', label: 'constitution' },
  { rel: 'guidelines/global-configs/templates/WORLD.starter.md', label: 'intent + mode' },
  { rel: 'guidelines/global-configs/templates/README.starter.md', label: 'orientation' },
];

/**
 * The retrieval layer the old boot protocol required whenever a `_guidelines/` mirror existed:
 * the index it told you to read, the tag table it pointed at, and the protocol itself.
 */
const RETRIEVAL_BEFORE = [
  { rel: 'guidelines/_index/MASTER_INDEX.md', label: 'index' },
  { rel: 'guidelines/_index/RETRIEVAL_RULES.md', label: 'retrieval rules' },
  { rel: 'guidelines/_index/AGENT_BOOT_PROTOCOL.md', label: 'boot protocol' },
];

/** The lean every-session set: the two documents a session must read before its first edit. */
const DECLARED_AFTER = [
  { rel: 'guidelines/global-configs/templates/AGENTS.starter.md', label: 'constitution' },
  { rel: 'guidelines/global-configs/templates/WORLD.starter.md', label: 'intent + mode' },
];

/**
 * The 18 representative tasks. Each names a realistic request, the file that answers it, a phrase
 * that is distinctive of that file's guidance (not a generic word), and the skill delivered for it
 * where one exists. `indexNeedle` is how the file is found in MASTER_INDEX; it defaults to the
 * basename and is the skill directory name for a skill-only task.
 *
 * A catalog phrase is chosen to survive ordinary edits — it is a rule the file exists to state,
 * not a sentence that happens to be there. If a task file is renamed or the rule is retired, this
 * benchmark is supposed to fail and make someone decide which happened.
 */
const TASKS = [
  {
    id: 'plan-feature',
    prompt: 'Add a feature end-to-end',
    file: 'guidelines/01-workflow-methodology/development-workflow.md',
    rule: /vertical slices? only/i,
    skill: 'implementation-plan',
  },
  {
    id: 'write-tests',
    prompt: 'Add tests for this service',
    file: 'guidelines/02-engineering-practices/testing-philosophy.md',
    rule: /behavioral tests?/i,
    skill: 'test-generation',
  },
  {
    id: 'debug-bug',
    prompt: 'The login is broken — debug it',
    file: 'guidelines/01-workflow-methodology/debugging-with-ai.md',
    rule: /minimal reproduction/i,
  },
  {
    id: 'code-review',
    prompt: 'Review this diff before I push',
    file: 'guidelines/01-workflow-methodology/code-review-workflow.md',
    rule: /separate AI context/i,
    skill: 'code-review',
  },
  {
    id: 'refactor',
    prompt: 'Refactor this module without changing behavior',
    file: 'guidelines/01-workflow-methodology/refactoring-strategy.md',
    rule: /preserve behavior/i,
    skill: 'refactoring',
  },
  {
    id: 'security-audit',
    prompt: 'Audit this app for security holes',
    file: 'guidelines/02-engineering-practices/security-engineering.md',
    rule: /least privilege on every endpoint/i,
    skill: 'security-audit',
  },
  {
    id: 'performance',
    prompt: 'The list page is slow — optimize it',
    file: 'guidelines/02-engineering-practices/performance-optimization.md',
    rule: /measure first/i,
    skill: 'performance-audit',
  },
  {
    id: 'electron-update',
    prompt: 'Ship an auto-updating Electron release',
    file: 'guidelines/05-stack-guides/electron/electron-auto-update.md',
    rule: /latest\.yml/i,
    skill: 'electron-auto-update',
  },
  {
    id: 'arabic-pdf',
    prompt: 'Export an Arabic invoice to PDF',
    file: 'guidelines/05-stack-guides/arabic-rtl-pdf-generation.md',
    rule: /font subset embedding/i,
    skill: 'arabic-rtl-pdf-export',
  },
  {
    id: 'firestore-cost',
    prompt: 'Our Firestore bill is too high',
    file: 'guidelines/global-configs/skills/firestore-cost-optimization/SKILL.md',
    rule: /minimising reads/i,
    skill: 'firestore-cost-optimization',
    indexNeedle: 'firestore-cost-optimization',
  },
  {
    id: 'supabase-auth',
    prompt: 'Add Supabase auth and RLS to this table',
    file: 'guidelines/05-stack-guides/supabase/supabase-auth.md',
    rule: /RLS second line of defense/i,
  },
  {
    id: 'rtl-ui',
    prompt: 'Make this dashboard Arabic/RTL',
    file: 'guidelines/02-engineering-practices/bidirectional-design-principles.md',
    rule: /logical properties exclusively/i,
  },
  {
    id: 'accessibility',
    prompt: 'Check keyboard accessibility',
    file: 'guidelines/02-engineering-practices/accessibility-standards.md',
    rule: /visible focus/i,
  },
  {
    id: 'forms',
    prompt: 'Build this settings form',
    file: 'guidelines/06-frontend-patterns/form-patterns.md',
    rule: /focus first invalid control/i,
  },
  {
    id: 'design-system',
    prompt: 'Adopt the design system tokens',
    file: 'guidelines/08-governance/design-system-governance.md',
    rule: /design tokens = single source of truth/i,
  },
  {
    id: 'local-ci',
    prompt: 'Run CI locally before push',
    file: 'guidelines/03-git-and-ci/local-ci-strategy.md',
    rule: /gate:fast/,
  },
  {
    id: 'docs-steering',
    prompt: 'Update the steering docs',
    file: 'guidelines/07-documentation/documentation-strategy.md',
    rule: /one home per fact/i,
  },
  {
    id: 'speed-mode',
    prompt: 'Declare vibe mode and scale the process',
    file: 'guidelines/01-workflow-methodology/speed-tiered-workflow.md',
    rule: /ship boundary hardens quality/i,
  },
];

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

class DataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataError';
  }
}

function usage() {
  return [
    'Usage: node benchmark-reform.js [--json] [--check] [--before <ref>] [--fleet]',
    '  --before <ref>   git ref holding the pre-reform corpus (default ec55a54)',
    '  --check          exit 1 when a rule was lost, a file disappeared, or a skill stopped loading',
    '  --json           machine-readable output',
    '  --fleet          also measure each registered project\'s current reading chain (read-only)',
  ].join('\n');
}

function parseArgs(argv) {
  const options = { before: BEFORE_DEFAULT, json: false, check: false, fleet: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') { options.json = true; continue; }
    if (arg === '--check') { options.check = true; continue; }
    if (arg === '--fleet') { options.fleet = true; continue; }
    if (arg === '--before') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new UsageError('--before requires a git ref');
      }
      options.before = value;
      i += 1;
      continue;
    }
    throw new UsageError(`unknown argument "${arg}"`);
  }
  return options;
}

/** chars/4 — the same estimate `measure-boot-budget.js` and `render-index.js` use. */
function tokensOf(text) {
  return Math.ceil(text.replace(/\r\n/g, '\n').length / 4);
}

function gitShow(ref, rel, cache) {
  if (!cache.has(rel)) {
    const result = runSync('git', ['show', `${ref}:${rel}`], { cwd: REPO_ROOT });
    cache.set(rel, result.status === 0 ? result.stdout : null);
  }
  return cache.get(rel);
}

function readWorking(rel) {
  const abs = path.join(REPO_ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

function measureChain(entries, ref, cache) {
  const files = entries.map((entry) => {
    const text = ref === null ? readWorking(entry.rel) : gitShow(ref, entry.rel, cache);
    return {
      rel: entry.rel,
      label: entry.label,
      missing: text === null,
      tokens: text === null ? 0 : tokensOf(text),
    };
  });
  return {
    files,
    tokens: files.reduce((sum, file) => sum + file.tokens, 0),
    missing: files.filter((file) => file.missing).map((file) => file.rel),
  };
}

function skillState(task, ref, cache) {
  if (!task.skill) return null;
  const rel = `guidelines/global-configs/skills/${task.skill}/SKILL.md`;
  const before = gitShow(ref, rel, cache);
  const after = readWorking(rel);
  const fm = after === null ? null : parseFrontMatter(after);
  return {
    name: task.skill,
    rel,
    presentBefore: before !== null,
    presentAfter: after !== null,
    loadable: Boolean(fm && fm.name && fm.description),
  };
}

function evaluateTask(task, ref, cache, beforeIndex, afterIndex) {
  const beforeText = gitShow(ref, task.file, cache);
  const afterText = readWorking(task.file);
  const needle = task.indexNeedle || path.basename(task.file);
  return {
    id: task.id,
    prompt: task.prompt,
    file: task.file,
    ruleLabel: String(task.rule),
    fileBefore: beforeText === null ? null : tokensOf(beforeText),
    fileAfter: afterText === null ? null : tokensOf(afterText),
    ruleBefore: beforeText === null ? false : task.rule.test(beforeText),
    ruleAfter: afterText === null ? false : task.rule.test(afterText),
    indexedBefore: beforeIndex.includes(needle),
    indexedAfter: afterIndex.includes(needle),
    skill: skillState(task, ref, cache),
  };
}

/**
 * A project's chain as it exists today: the pre-reform shape (AGENTS + WORLD + README + the mirror's
 * index pages). `floor` is AGENTS + WORLD **as they exist today** — the lean model's mandatory set,
 * not a projection of a resized file. This instrument does not assume a file it has not read.
 */
const FLEET_FILES = [
  { rel: 'AGENTS.md', role: 'constitution' },
  { rel: 'WORLD.md', role: 'intent + mode' },
  { rel: 'README.md', role: 'orientation' },
  { rel: '_guidelines/_index/MASTER_INDEX.md', role: 'index' },
  { rel: '_guidelines/_index/RETRIEVAL_RULES.md', role: 'retrieval rules' },
  { rel: '_guidelines/_index/AGENT_BOOT_PROTOCOL.md', role: 'boot protocol' },
];

function measureFleet() {
  const registryPath = path.join(REPO_ROOT, 'sync-projects.json');
  if (!fs.existsSync(registryPath)) {
    return { note: 'sync-projects.json not found — fleet not measured', projects: [] };
  }
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const projects = registry.map((entry) => {
    const root = entry.path;
    if (!fs.existsSync(root)) {
      return { name: entry.name, path: root, missingProject: true, files: [], chain: 0, floor: 0 };
    }
    const files = FLEET_FILES.map((file) => {
      const abs = path.join(root, file.rel);
      const exists = fs.existsSync(abs);
      return {
        rel: file.rel,
        role: file.role,
        present: exists,
        tokens: exists ? tokensOf(fs.readFileSync(abs, 'utf8')) : 0,
      };
    }).filter((file) => file.present);
    const floor = files
      .filter((file) => file.rel === 'AGENTS.md' || file.rel === 'WORLD.md')
      .reduce((sum, file) => sum + file.tokens, 0);
    return {
      name: entry.name,
      path: root,
      missingProject: false,
      files,
      chain: files.reduce((sum, file) => sum + file.tokens, 0),
      floor,
    };
  });
  return { note: null, projects };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(path.join(REPO_ROOT, 'guidelines', '_index', 'MASTER_INDEX.md'))) {
    throw new DataError('MASTER_INDEX.md not found — run this instrument from the central guidelines repo');
  }
  const refCheck = runSync('git', ['rev-parse', '--verify', `${options.before}^{commit}`], { cwd: REPO_ROOT });
  if (refCheck.status !== 0) {
    throw new DataError(`cannot resolve --before ref "${options.before}" — is the repository history complete?`);
  }

  const cache = new Map();
  const beforeIndex = gitShow(options.before, 'guidelines/_index/MASTER_INDEX.md', cache);
  const afterIndex = readWorking('guidelines/_index/MASTER_INDEX.md');
  if (beforeIndex === null) throw new DataError(`MASTER_INDEX.md does not exist at ${options.before}`);

  const declaredBefore = measureChain(DECLARED_BEFORE, options.before, cache);
  const retrievalBefore = measureChain(RETRIEVAL_BEFORE, options.before, cache);
  const declaredAfter = measureChain(DECLARED_AFTER, null, cache);

  const tasks = TASKS.map((task) => evaluateTask(task, options.before, cache, beforeIndex, afterIndex));

  const problems = [];
  const advisories = [];
  for (const task of tasks) {
    if (!task.ruleBefore) {
      problems.push(`${task.id}: the benchmark rule ${task.ruleLabel} does not match ${task.file} at ${options.before} — fix the catalog, the before ref moved, or the rule was renamed before the baseline`);
      continue;
    }
    if (task.fileAfter === null) {
      problems.push(`${task.id}: ${task.file} no longer exists`);
      continue;
    }
    if (!task.ruleAfter) {
      problems.push(`${task.id}: rule lost — ${task.ruleLabel} no longer appears in ${task.file}`);
    }
    if (!task.indexedAfter) {
      problems.push(`${task.id}: ${task.file} is not discoverable from MASTER_INDEX.md`);
    }
    if (task.skill && !task.skill.presentAfter) {
      problems.push(`${task.id}: skill ${task.skill.name} is missing (${task.skill.rel})`);
    } else if (task.skill && !task.skill.loadable) {
      problems.push(`${task.id}: skill ${task.skill.name} is unloadable — its front-matter needs a name and description`);
    }
    if (task.skill && !task.skill.presentBefore) {
      advisories.push(`${task.id}: skill ${task.skill.name} is new since ${options.before} — loadability checked, retention has no baseline`);
    }
    if (!task.indexedBefore) {
      advisories.push(`${task.id}: ${task.file} was not indexed at ${options.before} — the after-side reach check stands alone`);
    }
  }
  const beforeFull = declaredBefore.tokens + retrievalBefore.tokens;
  const afterFull = declaredAfter.tokens;
  const savings = beforeFull - afterFull;
  const savingsPct = beforeFull === 0 ? 0 : Math.round((savings / beforeFull) * 1000) / 10;
  const declaredSavings = declaredBefore.tokens - afterFull;
  const declaredPct = declaredBefore.tokens === 0
    ? 0
    : Math.round((declaredSavings / declaredBefore.tokens) * 1000) / 10;

  const fleet = options.fleet ? measureFleet() : null;

  const report = {
    beforeRef: options.before,
    after: 'working tree',
    date: new Date().toISOString().split('T')[0],
    boot: {
      beforeDeclared: declaredBefore,
      beforeRetrieval: retrievalBefore,
      beforeFull,
      after: declaredAfter.tokens,
      savings,
      savingsPct,
      declaredSavings,
      declaredPct,
    },
    tasks,
    problems,
    advisories,
    fleet,
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('═══════════════════════════════════════════');
    console.log(`  Lean Reform Benchmark — ${tasks.length} tasks`);
    console.log(`  before ${options.before} → working tree  ·  ${report.date}`);
    console.log('═══════════════════════════════════════════\n');

    console.log('  READING CHAIN (tokens, chars/4)\n');
    console.log('  phase'.padEnd(22) + 'before'.padStart(10) + 'after'.padStart(10));
    for (const file of declaredBefore.files) {
      const after = declaredAfter.files.find((candidate) => candidate.rel === file.rel);
      console.log(`  ${file.label}`.padEnd(22) + String(file.tokens).padStart(10) + String(after ? after.tokens : '—').padStart(10));
    }
    console.log(`  ${'retrieval layer'}`.padEnd(22) + String(retrievalBefore.tokens).padStart(10) + '—'.padStart(10));
    console.log('  ' + '─'.repeat(40));
    console.log(`  ${'FULL'.padEnd(20)}${String(beforeFull).padStart(10)}${String(afterFull).padStart(10)}  →  ${savings >= 0 ? '-' : '+'}${Math.abs(savings)} tokens (${savingsPct >= 0 ? '-' : '+'}${Math.abs(savingsPct)}%)`);
    console.log(`  ${'declared only'.padEnd(20)}${String(declaredBefore.tokens).padStart(10)}${String(afterFull).padStart(10)}  →  ${declaredSavings >= 0 ? '-' : '+'}${Math.abs(declaredSavings)} tokens (${declaredPct >= 0 ? '-' : '+'}${Math.abs(declaredPct)}%)`);

    console.log('\n  TASKS — chain + the task file that answers the request\n');
    console.log(
      '  task'.padEnd(18) + 'before'.padStart(9) + 'after'.padStart(9) + 'delta'.padStart(9) +
      '  rule  index  skill',
    );
    for (const task of tasks) {
      const before = beforeFull + (task.fileBefore || 0);
      const after = afterFull + (task.fileAfter || 0);
      const delta = after - before;
      const rule = task.ruleAfter ? '✓' : '✗';
      const index = task.indexedAfter ? '✓' : '✗';
      const skill = task.skill ? (task.skill.loadable ? '✓' : '✗') : '·';
      console.log(
        `  ${task.id}`.padEnd(18) + String(before).padStart(9) + String(after).padStart(9) +
        `${delta >= 0 ? '+' : ''}${delta}`.padStart(9) + `  ${rule}     ${index}      ${skill}`,
      );
    }

    if (problems.length === 0) {
      console.log('\n  ✅ every rule survived, every task file is indexed, every mapped skill loads');
    } else {
      console.log(`\n  ${options.check ? '❌' : '⚠️'} ${problems.length} finding(s)${options.check ? ':' : ' (report only):'}`);
      for (const problem of problems) console.log(`     • ${problem}`);
    }
    if (advisories.length) {
      console.log(`\n  ${advisories.length} advisory note(s):`);
      for (const advisory of advisories) console.log(`     • ${advisory}`);
    }

    if (fleet) {
      console.log('\n  FLEET — each registered project\'s current chain (read-only)\n');
      if (fleet.note) {
        console.log(`  ${fleet.note}`);
      } else {
        console.log('  project'.padEnd(42) + 'chain'.padStart(8) + 'floor'.padStart(8) + 'navigation'.padStart(12) + 'files'.padStart(7));
        for (const project of fleet.projects) {
          if (project.missingProject) {
            console.log(`  ${project.name}`.padEnd(42) + '  — project path not found');
            continue;
          }
          console.log(
            `  ${project.name}`.padEnd(42) + String(project.chain).padStart(8) + String(project.floor).padStart(8) +
            String(project.chain - project.floor).padStart(12) + String(project.files.length).padStart(7),
          );
        }
        console.log('\n  floor = AGENTS.md + WORLD.md; the lean model\'s chain once that project adopts the lean starter.');
        console.log('  navigation = README + mirror index pages in the pre-reform chain. No after value is projected.');
      }
    }

    console.log('\n  LIMITS: rule retention is textual (the rule is still there and reachable), not a live-agent');
    console.log('  first-run test. Tokens are chars/4 estimates. The before chain is the doctrine\'s mandated');
    console.log('  set; its retrieval layer is shown separately so the narrow and wide readings stay visible.');
  }

  if (problems.length > 0 && options.check) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  if (error instanceof UsageError) {
    console.error(`✗ ${error.message}`);
    console.error(usage());
    process.exit(2);
  }
  if (error instanceof DataError) {
    console.error(`✗ ${error.message}`);
    process.exit(2);
  }
  throw error;
}
