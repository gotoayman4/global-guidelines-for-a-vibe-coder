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
 * Usage:  node install-guardrails.js <project-path> [--dry-run] [--full]
 *   --full  Also merge PreToolUse Read/Edit/Write/MultiEdit credential guard and
 *           PostToolUse fast JS/JSON syntax + secret check (`guard-file-access.js`).
 *
 * Source: global-configs/scripts/install-guardrails.js
 */

const fs = require('fs');
const path = require('path');

const GUARD_CMD = 'node _guidelines/global-configs/scripts/guard-command.js';
const HOOK_MARK = 'guard-command.js';
const FILE_GUARD_CMD = 'node _guidelines/global-configs/scripts/guard-file-access.js';
const POST_EDIT_CMD = 'node _guidelines/global-configs/scripts/guard-file-access.js --post-edit';
const FILE_GUARD_MARK = 'guard-file-access.js';

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

function ensureHookEntry(list, matcher, command, isMatch) {
  const present = list.some((e) => (e.hooks || []).some((h) => isMatch(String(h.command || ''))));
  if (present) return false;
  list.push({ matcher, hooks: [{ type: 'command', command }] });
  return true;
}

/** Merge PreToolUse (and opt-in file/post-edit) hooks into parsed settings; returns {settings, changed}. */
function mergeClaudeSettings(settings, { includeFileGuards = false, includePostEdit = false } = {}) {
  const next = settings && typeof settings === 'object' ? settings : {};
  next.hooks = next.hooks || {};
  const pre = Array.isArray(next.hooks.PreToolUse) ? next.hooks.PreToolUse : [];
  let changed = ensureHookEntry(pre, 'Bash', GUARD_CMD, (c) => c.includes(HOOK_MARK));
  if (includeFileGuards) {
    const addedFile = ensureHookEntry(
      pre,
      'Read|Edit|Write|MultiEdit|NotebookEdit',
      FILE_GUARD_CMD,
      (c) => c.includes(FILE_GUARD_MARK) && !c.includes('--post-edit')
    );
    changed = changed || addedFile;
  }
  next.hooks.PreToolUse = pre;

  if (includePostEdit) {
    const post = Array.isArray(next.hooks.PostToolUse) ? next.hooks.PostToolUse : [];
    const addedPost = ensureHookEntry(
      post,
      'Edit|Write|MultiEdit|NotebookEdit',
      POST_EDIT_CMD,
      (c) => c.includes(FILE_GUARD_MARK) && c.includes('--post-edit')
    );
    next.hooks.PostToolUse = post;
    changed = changed || addedPost;
  }

  return { settings: next, changed };
}

/** @returns {{file: string, status: string}[]} */
function installGuardrails(projectPath, { dryRun = false, full = false } = {}) {
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
    const { settings, changed } = mergeClaudeSettings(current, {
      includeFileGuards: full,
      includePostEdit: full,
    });
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
    console.error('Usage: node install-guardrails.js <project-path> [--dry-run] [--full]');
    process.exit(3);
  }
  for (const a of installGuardrails(path.resolve(target), {
    dryRun: argv.includes('--dry-run'),
    full: argv.includes('--full'),
  })) {
    console.log(`  ${a.file}: ${a.status}`);
  }
}

if (require.main === module) main();

module.exports = { installGuardrails, mergeClaudeSettings, preCommitHook };
