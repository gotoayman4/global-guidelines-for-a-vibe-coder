#!/usr/bin/env node

/**
 * guard-command.js — Refuse the shell commands the constitution forbids, deterministically.
 *
 * INTENT: "NEVER `git reset --hard`", "`--no-verify` is forbidden", "never `git add -A`" are prose
 * rules, and prose is followed only when the model remembers it. A pre-tool hook is followed every
 * time. This is that hook's brain: one pure function (`evaluate`) plus three entry points.
 *
 *   PreToolUse hook (Claude Code and compatible): the tool call arrives as JSON on stdin
 *     ({"tool_input":{"command":"..."}}); exit 2 blocks the call and stderr is shown to the model.
 *   Direct:   node guard-command.js --command "git reset --hard"
 *   Stdin:    echo "git clean -fd" | node guard-command.js --stdin
 *
 * PERMISSION, NOT A LOOPHOLE: the rules protect work the user has not authorised losing. When the user
 * has explicitly approved one, set `GUARD_ALLOW=<rule-id>[,<rule-id>]` for that one command; the
 * override is named, so it is visible in the transcript and never a blanket off-switch.
 *
 * LIMITS (stated, not hidden): this reads the command text. It sees quoted `bash -c "…"` payloads but
 * not commands assembled at runtime or inside scripts. It is a seatbelt, not a sandbox.
 *
 * Exit codes: 0 = allowed; 2 = blocked (the hook convention); 3 = usage error.
 *
 * Source: global-configs/scripts/guard-command.js
 */

const fs = require('fs');

/** id, matcher over ONE simple command (quotes already blanked), and the reason shown to the model. */
const RULES = [
  { id: 'git-reset-hard', re: /\bgit\b[^;&|]*\breset\b[^;&|]*--hard\b/, why: '`git reset --hard` destroys uncommitted work. Stash first, or ask the user for explicit permission.' },
  { id: 'git-checkout-discard', re: /\bgit\b[^;&|]*\b(?:checkout|restore)\b[^;&|]*(?:\s--\s|\s--$|\s\.(?:\s|$))/, why: 'Discarding working-tree changes (`git checkout --` / `git restore .`) loses work. Stash first, or ask the user.' },
  { id: 'git-clean-force', re: /\bgit\b[^;&|]*\bclean\b[^;&|]*\s-[a-zA-Z]*f/, why: '`git clean -f` deletes untracked files permanently. Stash with `-u` first, or ask the user.' },
  { id: 'git-force-push', re: /\bgit\b[^;&|]*\bpush\b(?![^;&|]*--force-with-lease)[^;&|]*(?:\s--force\b|\s-[a-zA-Z]*f\b)/, why: 'Force-pushing rewrites shared history. Never on main; use `--force-with-lease` on your own branch only with the user\'s permission.' },
  { id: 'no-verify', re: /\bgit\b[^;&|]*\b(?:commit|push|merge|rebase|cherry-pick|am)\b[^;&|]*--no-verify\b/, why: '`--no-verify` bypasses the gates. Fix the failing check instead.' },
  { id: 'git-add-all', re: /\bgit\b[^;&|]*\badd\b[^;&|]*(?:\s-A\b|\s--all\b|\s\.(?:\s|$)|\s-u\b)/, why: 'Stage by explicit path, never `git add -A` / `.` — it sweeps in scratch files and secrets.' },
  { id: 'rm-rf-broad', re: /(?:\brm\b[^;&|]*\s-[a-zA-Z]*[rR][a-zA-Z]*[fF]|\brm\b[^;&|]*\s-[a-zA-Z]*[fF][a-zA-Z]*[rR])[^;&|]*\s(?:\/|~|\$HOME|\.|\*|\.\.)(?:\s|$)/, why: 'Recursive force-delete of a root, home, or the whole working directory. Name the exact path.' },
  { id: 'remove-item-broad', re: /\bRemove-Item\b(?=[^;&|]*-Recurse)(?=[^;&|]*-Force)[^;&|]*\s(?:[A-Za-z]:\\?|\\|~|\$HOME|\.|\*)(?:\s|$)/i, why: 'Recursive force-delete of a drive root, home, or the whole working directory. Name the exact path.' },
  { id: 'db-destructive', re: /\b(?:prisma\s+migrate\s+reset|prisma\s+db\s+push\b[^;&|]*--force-reset|drizzle-kit\s+drop|sequelize\b[^;&|]*db:(?:drop|migrate:undo:all)|rails\s+db:(?:drop|reset)|DROP\s+(?:DATABASE|SCHEMA)\b)/i, why: 'Destructive database command. Never against a production or shared database without explicit approval in this session.' },
];

/** Blank the inside of quotes so a commit message that MENTIONS a forbidden command is not a match. */
function blankQuotes(text) {
  return text.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');
}

/** Payloads of `bash -c "…"` / `pwsh -Command "…"` — evaluated as commands in their own right. */
function inlineScripts(text) {
  const out = [];
  const re = /(?:\b(?:bash|sh|zsh|cmd|pwsh|powershell)(?:\.exe)?\b[^;&|"']*\s(?:-c|\/c|-Command|-command)\s+)(["'])((?:(?!\1)[\s\S])*)\1/g;
  let m;
  while ((m = re.exec(text))) out.push(m[2]);
  return out;
}

/**
 * @param {string} command the shell command line as the tool will run it
 * @param {{allow?: string[]}} [options] rule ids the user has explicitly authorised
 * @returns {{blocked: boolean, id?: string, reason?: string}}
 */
function evaluate(command, { allow = [] } = {}) {
  const text = String(command || '');
  const candidates = [text, ...inlineScripts(text)];
  for (const candidate of candidates) {
    const segments = blankQuotes(candidate).split(/&&|\|\||;|\||\r?\n/);
    for (const segment of segments) {
      const padded = ` ${segment.trim()} `;
      for (const rule of RULES) {
        if (allow.includes(rule.id)) continue;
        if (rule.re.test(padded)) return { blocked: true, id: rule.id, reason: rule.why };
      }
    }
  }
  return { blocked: false };
}

function allowedFromEnv(env = process.env) {
  return String(env.GUARD_ALLOW || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function commandFromHookJson(raw) {
  try {
    const data = JSON.parse(raw);
    const cmd = data && data.tool_input && (data.tool_input.command || data.tool_input.cmd);
    return typeof cmd === 'string' ? cmd : null;
  } catch {
    return null;
  }
}

function main() {
  const argv = process.argv.slice(2);
  const at = argv.indexOf('--command');
  let command = null;
  if (at !== -1) {
    command = argv[at + 1];
  } else {
    const raw = fs.readFileSync(0, 'utf8');
    command = argv.includes('--stdin') ? raw : commandFromHookJson(raw) ?? raw;
  }
  if (command === undefined || command === null) {
    console.error('Usage: node guard-command.js --command "<cmd>" | --stdin | (hook JSON on stdin)');
    process.exit(3);
  }
  const result = evaluate(command, { allow: allowedFromEnv() });
  if (result.blocked) {
    console.error(`BLOCKED by constitution guardrail [${result.id}]: ${result.reason}`);
    console.error(`If the user has explicitly approved this, re-run with GUARD_ALLOW=${result.id} for this one command.`);
    process.exit(2);
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { evaluate, RULES, allowedFromEnv, commandFromHookJson };
