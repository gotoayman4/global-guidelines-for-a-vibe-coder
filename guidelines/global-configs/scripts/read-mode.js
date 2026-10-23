#!/usr/bin/env node

/**
 * read-mode.js — Print the mode a project declares. The command a pre-push hook calls.
 *
 * INTENT: `speed-tiered-workflow.md` §The Gate Scales With the Mode says the hook "reads
 * the declared `mode`". A hook that carries its own grep carries a second copy of the
 * declaration, and the copies disagree: measured 2026-10-23, the shell grep shipped in
 * `new-project.js` read a `- **Transition mode:**` line as a declaration, and the two
 * shipped readers accepted a mode in a shape the one working downstream reader rejected.
 * One reader, one shape, and every caller — the hook, the fleet audit, the guards — goes
 * through it.
 *
 * CONTRACT: the caller must fail SAFE. Exit 0 means a mode was printed and it is the one
 * the gate runs. Exit 2 means nothing legible was declared, and the caller pays the full
 * chain. A declaration nobody can parse must never become a cheaper gate.
 *
 * USAGE:
 *   node read-mode.js [projectRoot] [--json]
 *
 * `projectRoot` defaults to the current directory. `--json` prints the full answer
 * (`mode`, `declared`, `reason`) instead of the bare mode.
 *
 * Exit codes: 0 = a mode was declared and printed; 2 = nothing legible was declared
 *             (the reason goes to stderr); 3 = usage error.
 *
 * @tier always — a mode the gate cannot read is a gate that guesses. This is the read
 *   every mode-aware gate starts from, and it must work in every mode.
 *
 * Source: global-configs/scripts/read-mode.js
 */

const path = require('path');
const { readMode } = require('./lib/project-mode.js');

function usage(msg) {
  if (msg) console.error(`❌ ${msg}`);
  console.error('Usage: node read-mode.js [projectRoot] [--json]');
  process.exit(3);
}

function main() {
  const argv = process.argv.slice(2);
  let json = false;
  let root = null;
  for (const arg of argv) {
    if (arg === '--json') json = true;
    else if (arg.startsWith('-')) usage(`unknown option: ${arg}`);
    else if (root) usage('expected exactly one <projectRoot>');
    else root = arg;
  }

  const projectRoot = path.resolve(root || process.cwd());
  const answer = readMode(projectRoot);

  if (!answer.declared) {
    console.error(`read-mode: ${answer.reason} — the caller must fail safe.`);
    process.exit(2);
  }

  if (json) {
    console.log(JSON.stringify({ mode: answer.mode, declared: answer.declared, root: projectRoot }));
  } else {
    console.log(answer.mode);
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { main };
