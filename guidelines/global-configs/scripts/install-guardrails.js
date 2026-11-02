#!/usr/bin/env node

/**
 * install-guardrails.js — Turn two prose rules into hooks a project actually runs.
 *
 * INTENT: "never reset --hard / --no-verify / commit secrets" is advice an agent can ignore; a hook cannot
 * be. This installs, idempotently and non-destructively:
 *   1. .claude/settings.json  — a PreToolUse Bash hook running guard-command.js (merged, never overwritten)
 *   2. .husky/pre-commit      — runs scan-secrets.js on the staged diff (created only if absent)
 * Both call the scripts through the synced `_guidelines/` mirror and no-op if it is not there yet, so a
 * project that has not synced is never blocked by a missing file.
 *
 * Usage:  node install-guardrails.js <project-path> [--dry-run]
 *
 * Source: global-configs/scripts/install-guardrails.js
 */

const fs = require('fs');
const path = require('path');

const GUARD_CMD = 'node _guidelines/global-configs/scripts/guard-command.js';
const HOOK_MARK = 'guard-command.js';

function preCommitHook() {
  return [
    '#!/usr/bin/env sh',
    '# Installed by install-guardrails.js — blocks a commit that adds a credential.',
    'SCAN="_guidelines/global-configs/scripts/scan-secrets.js"',
    'if [ -f "$SCAN" ]; then',
    '  node "$SCAN" || exit 1',
    'fi',
    '',
  ].join('\n');
}

/** Merge the PreToolUse guard into a parsed settings object; returns {settings, changed}. */
function mergeClaudeSettings(settings) {
  const next = settings && typeof settings === 'object' ? settings : {};
  next.hooks = next.hooks || {};
  const pre = Array.isArray(next.hooks.PreToolUse) ? next.hooks.PreToolUse : [];
  const present = pre.some((e) => (e.hooks || []).some((h) => String(h.command || '').includes(HOOK_MARK)));
  if (present) return { settings: next, changed: false };
  pre.push({ matcher: 'Bash', hooks: [{ type: 'command', command: GUARD_CMD }] });
  next.hooks.PreToolUse = pre;
  return { settings: next, changed: true };
}

/** @returns {{file: string, status: string}[]} */
function installGuardrails(projectPath, { dryRun = false } = {}) {
  const actions = [];

  const settingsPath = path.join(projectPath, '.claude', 'settings.json');
  let current = {};
  let parseable = true;
  if (fs.existsSync(settingsPath)) {
    try {
      current = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
      parseable = false;
    }
  }
  if (!parseable) {
    actions.push({ file: '.claude/settings.json', status: 'unparseable — skipped (fix the JSON, then re-run)' });
  } else {
    const { settings, changed } = mergeClaudeSettings(current);
    if (!changed) {
      actions.push({ file: '.claude/settings.json', status: 'guard hook already present — skipped' });
    } else {
      actions.push({ file: '.claude/settings.json', status: dryRun ? 'would merge the guard hook' : 'merged the guard hook' });
      if (!dryRun) {
        fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
        fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
      }
    }
  }

  const hookPath = path.join(projectPath, '.husky', 'pre-commit');
  if (fs.existsSync(hookPath)) {
    const has = fs.readFileSync(hookPath, 'utf8').includes('scan-secrets.js');
    actions.push({ file: '.husky/pre-commit', status: has ? 'secret scan already present — skipped' : 'exists — not modified (add scan-secrets.js yourself)' });
  } else {
    actions.push({ file: '.husky/pre-commit', status: dryRun ? 'would write' : 'written' });
    if (!dryRun) {
      fs.mkdirSync(path.dirname(hookPath), { recursive: true });
      fs.writeFileSync(hookPath, preCommitHook(), { encoding: 'utf8', mode: 0o755 });
    }
  }
  return actions;
}

function main() {
  const argv = process.argv.slice(2);
  const target = argv.find((a) => !a.startsWith('--'));
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    console.error('Usage: node install-guardrails.js <project-path> [--dry-run]');
    process.exit(3);
  }
  for (const a of installGuardrails(path.resolve(target), { dryRun: argv.includes('--dry-run') })) {
    console.log(`  ${a.file}: ${a.status}`);
  }
}

if (require.main === module) main();

module.exports = { installGuardrails, mergeClaudeSettings, preCommitHook };
