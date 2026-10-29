#!/usr/bin/env node

/**
 * shell-code.js — the executable part of a shell script, comments removed.
 *
 * WHY THIS IS SHARED. A hook's header is a normative list of its steps, and it names scripts and
 * flags in prose. A reader that matches over the raw text reports a step the hook never runs: a
 * commented-out `--run-always` made `check-guard-tiers.js` report the always tier as wired, and a
 * commented reference to a retired script blocked the sync preflight. Every reader of a hook reads
 * code through this one function, so they cannot disagree about what a comment is.
 *
 * Line numbers are preserved (a comment line becomes an empty line) so a finding can still cite one.
 *
 * Source: global-configs/scripts/lib/shell-code.js
 */

/**
 * Cut an inline comment off a line, leaving a `#` inside a quoted string alone.
 *
 * A `#` inside a string is not a comment, and a hook line like `echo "npm test -- --run"` is a
 * string, not a step. Stripping it would report a command the hook never runs.
 */
function stripInline(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

/** The code of a hook, one entry per source line, with every comment removed. */
function codeLines(text) {
  return text.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) return '';
    return stripInline(line).trimEnd();
  });
}

/** The code of a hook as one string. */
function codeText(text) {
  return codeLines(text).join('\n');
}

module.exports = { stripInline, codeLines, codeText };
