#!/usr/bin/env node

/**
 * new-project.js — One-command project bootstrap from the single-source starters.
 *
 * Expands AGENTS.starter.md, WORLD.starter.md, and README.starter.md into a target project root,
 * injects the speed-mode declaration, merges gate:fast / gate:receipt scripts into
 * package.json when present, and writes a pre-push hook skeleton. Husky install
 * is printed as a next step (no network installs from this script).
 *
 * Usage:
 *   node new-project.js <projectPath> [--mode vibe|standard|guarded] [--name <pkg>]
 *   node new-project.js <projectPath> --dry-run
 *
 * Create-if-missing semantics (like sync-manager): never overwrites an existing
 * AGENTS.md or WORLD.md — reports and skips instead.
 *
 * Exit codes: 0 = scaffolded (or dry-run), 1 = path/error, 2 = usage.
 *
 * Source: global-configs/scripts/new-project.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const STARTERS = path.join(REPO_ROOT, 'global-configs', 'templates');
const dryRun = process.argv.includes('--dry-run');

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error('Usage: node new-project.js <projectPath> [--mode vibe|standard|guarded] [--name <pkg>] [--dry-run]');
  process.exit(2);
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { projectPath: null, mode: 'vibe', name: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') continue;
    if (a === '--mode') {
      args.mode = argv[++i];
      if (!['vibe', 'standard', 'guarded'].includes(args.mode)) {
        throw new Error(`invalid mode: ${args.mode}`);
      }
    } else if (a === '--name') {
      args.name = argv[++i];
      if (!args.name) throw new Error('--name requires a value');
    } else if (a.startsWith('--')) {
      throw new Error(`unknown option: ${a}`);
    } else {
      rest.push(a);
    }
  }
  if (rest.length !== 1) throw new Error('expected exactly one <projectPath> argument');
  args.projectPath = rest[0];
  return args;
}

function injectMode(worldContent, mode) {
  const date = new Date().toISOString().split('T')[0];
  const marker = '## What This Project Is';
  const modeLine = `- **mode:** \`${mode}\` — \`vibe | standard | guarded\` per \`_guidelines/01-workflow-methodology/speed-tiered-workflow.md\``;
  const initLine = `  - ${date} — initialized as \`${mode}\` by new-project.js`;

  if (worldContent.includes('## Speed Mode')) {
    let next = worldContent.replace(/^[ \t]*- \*\*mode:\*\*.*$/m, modeLine);
    if (!next.includes(`initialized as \`${mode}\` by new-project.js`)) {
      // Preserve the file's own line endings when inserting under Transition log.
      const eol = next.includes('\r\n') ? '\r\n' : '\n';
      const logRe = /(^[ \t]*- \*\*Transition log:\*\*[ \t]*$)/m;
      if (logRe.test(next)) {
        next = next.replace(logRe, `$1${eol}${initLine}`);
      } else {
        // No log heading — append a Transition log block after the Set: line (or mode line).
        const anchor = /^[ \t]*- \*\*Set:\*\*.*$/m.exec(next);
        if (anchor) {
          next = next.replace(anchor[0], `${anchor[0]}${eol}- **Transition log:**${eol}${initLine}`);
        }
      }
    }
    return next;
  }

  if (!worldContent.includes(marker)) return worldContent;
  const block = [
    '## Speed Mode',
    '',
    modeLine,
    '- **Set:** bootstrapped by new-project.js; revisit at every milestone.',
    '- **Transition log:**',
    initLine,
    '',
    '',
    marker,
  ].join('\n');
  return worldContent.replace(marker, block);
}

function mergeGateScripts(pkg) {
  const additions = {
    'gate:fast': 'npm run lint && npm run type-check',
    'gate:receipt': 'echo "wire gate:receipt to the project full pipeline — see local-ci-strategy.md"',
  };
  let changed = false;
  pkg.scripts = pkg.scripts || {};
  for (const [k, v] of Object.entries(additions)) {
    if (!pkg.scripts[k]) {
      pkg.scripts[k] = v;
      changed = true;
    }
  }
  return { pkg, changed };
}

function prePushHook() {
  return [
    '#!/bin/sh',
    '# Pre-push full gate — order is the normative list (local-ci-strategy.md)',
    '# Order: lint → type-check → test → build → audit → clean-tree',
    '# Enable: npm exec husky init  (or copy to .husky/pre-push)',
    'npm run lint && npm run type-check && npm test -- --run && npm run build',
    'exit $?',
    '',
  ].join('\n');
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    usage(err.message);
  }
  const projectPath = path.resolve(process.cwd(), args.projectPath);
  if (!fs.existsSync(projectPath)) fail(`project path does not exist: ${projectPath}`);

  const agentsSrc = path.join(STARTERS, 'AGENTS.starter.md');
  const worldSrc = path.join(STARTERS, 'WORLD.starter.md');
  const readmeSrc = path.join(STARTERS, 'README.starter.md');
  if (!fs.existsSync(agentsSrc) || !fs.existsSync(worldSrc) || !fs.existsSync(readmeSrc)) {
    fail('starter templates missing (AGENTS.starter.md, WORLD.starter.md, README.starter.md)');
  }

  const agentsDest = path.join(projectPath, 'AGENTS.md');
  const worldDest = path.join(projectPath, 'WORLD.md');
  const readmeDest = path.join(projectPath, 'README.md');
  const pkgDest = path.join(projectPath, 'package.json');
  const hooksDir = path.join(projectPath, '.husky');
  const hookDest = path.join(hooksDir, 'pre-push');

  const actions = [];
  if (fs.existsSync(agentsDest)) {
    actions.push({ file: 'AGENTS.md', status: 'exists — skipped (create-if-missing)' });
  } else {
    actions.push({ file: 'AGENTS.md', status: 'would write', write: () => fs.copyFileSync(agentsSrc, agentsDest) });
  }

  if (fs.existsSync(worldDest)) {
    actions.push({ file: 'WORLD.md', status: 'exists — skipped (create-if-missing)' });
  } else {
    const worldContent = injectMode(fs.readFileSync(worldSrc, 'utf8'), args.mode);
    actions.push({ file: 'WORLD.md', status: `would write (mode=${args.mode})`, write: () => fs.writeFileSync(worldDest, worldContent, 'utf8') });
  }

  if (fs.existsSync(readmeDest)) {
    actions.push({ file: 'README.md', status: 'exists — skipped (create-if-missing)' });
  } else {
    actions.push({ file: 'README.md', status: 'would write', write: () => fs.copyFileSync(readmeSrc, readmeDest) });
  }

  if (fs.existsSync(pkgDest)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgDest, 'utf8'));
      if (args.name) pkg.name = args.name;
      const { pkg: merged, changed } = mergeGateScripts(pkg);
      if (changed) {
        actions.push({
          file: 'package.json',
          status: 'would write (merge gate:fast + gate:receipt scripts)',
          write: () => fs.writeFileSync(pkgDest, `${JSON.stringify(merged, null, 2)}\n`, 'utf8'),
        });
      } else {
        actions.push({ file: 'package.json', status: 'gate scripts already present — skipped' });
      }
    } catch {
      actions.push({ file: 'package.json', status: 'unparseable — skipped' });
    }
  } else {
    actions.push({ file: 'package.json', status: 'absent — skipped (create your app first)' });
  }

  if (fs.existsSync(hookDest)) {
    actions.push({ file: '.husky/pre-push', status: 'exists — skipped' });
  } else {
    actions.push({
      file: '.husky/pre-push',
      status: 'would write skeleton',
      write: () => {
        fs.mkdirSync(hooksDir, { recursive: true });
        fs.writeFileSync(hookDest, prePushHook(), 'utf8');
      },
    });
  }

  if (dryRun) {
    console.log('── dry run — no files written ──');
    for (const a of actions) console.log(`  ${a.file}: ${a.status}`);
    process.exit(0);
  }

  for (const a of actions) {
    if (a.write) a.write();
    console.log(`✅ ${a.file}: ${a.status.replace('would write', 'written')}`);
  }

  console.log('\nNext steps:');
  console.log('  1. Search [FILL] in AGENTS.md — fill the stack table + project mandates (the only home for rules)');
  console.log('  2. Complete WORLD.md sections (mode already set to ' + args.mode + ')');
  console.log('  3. Complete README.md — what this is, structure tree, quick start');
  console.log('  4. npx husky init   # install hooks; keep the generated pre-push order comment');
  console.log('  5. pwsh -File <central-repo>\\guidelines\\global-configs\\scripts\\sync-guidelines.ps1 -ProjectPath .  # mirror _guidelines/');
  console.log('  6. git config core.hooksPath .husky   # if not using husky default');
  console.log('\n  Docs set: AGENTS.md + WORLD.md + README.md (+ docs/AI_ARCHITECTURE.md on demand).');
  console.log('  There is no AI_CONTEXT.md or ARCHITECTURE_INDEX.md — one home per fact (07-documentation/documentation-strategy.md).');
}

if (require.main === module) main();

module.exports = { injectMode, mergeGateScripts, prePushHook, parseArgs };
