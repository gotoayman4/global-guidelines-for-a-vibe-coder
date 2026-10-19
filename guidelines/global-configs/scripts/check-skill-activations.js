#!/usr/bin/env node

/**
 * check-skill-activations.js — prove a project's skill-activation log is a truthful receipt.
 *
 * INTENT: the repo's own AGENTS.md says the chat announcement "Skill: <name> activated" is the
 * only thing that makes an activation visible, "because no file in the repo can record whether a
 * skill was loaded". A chat message leaves no artifact, so the claim is unfalsifiable: a project
 * can announce twenty activations and nothing on disk can disagree, and a guard that checks a
 * file nobody writes proves nothing. The receipt fixes that — an agent appends a line to a
 * project-local log when it opens a skill — and this script is the part that makes the receipt
 * TRUSTWORTHY rather than decorative.
 *
 * DECISION: two assertions, and no others.
 *   1. Every line is well-formed: three `|`-separated fields, an ISO-8601 timestamp, a skill name,
 *      a non-empty task.
 *   2. Every named skill is one the project ACTUALLY HAS, read from the project's own `_skills/`
 *      — the delivered set, not the central corpus. The sync delivers a filtered set, so a name
 *      that exists upstream but not here is exactly the false receipt worth catching, and it is
 *      the one failure a format check could never see.
 *
 * CONSTRAINT: A MISSING LOG IS NOT AN ERROR. A project that has not activated a skill yet is
 * healthy, not broken. Failing an absent file would make this guard fail every fresh checkout and
 * teach people to delete it; absence is reported as "no activations recorded yet" and exits 0.
 *
 * CONSTRAINT: only the FIRST TWO separators split a line. The task description is free text and
 * may contain `|`, so the third field is the remainder of the line — trimming it would silently
 * change what a receipt claims happened.
 *
 * CONSTRAINT: the timestamp is checked against an ISO-8601 SHAPE first and only then parsed.
 * `Date.parse` alone is too generous — it accepts bare numbers (`'12'` becomes a date in 2001) and
 * short strings, so a typo would become a plausible timestamp instead of an error. A receipt that
 * is wrong about WHEN is wrong in a way nobody notices, so a malformed timestamp is reported, not
 * guessed at.
 *
 * WHAT THIS DOES NOT PROVE: that a skill was read, or that reading it helped. The log records an
 * agent's claim; this check verifies the claim is well-formed and names a skill the project can
 * open. A receipt is a record of an assertion, not a witness — and it is a receipt the project
 * writes, so it proves the project's bookkeeping, not the agent's behaviour.
 *
 * Usage:
 *   node check-skill-activations.js [projectRoot]         # validate and report (defaults to cwd)
 *   node check-skill-activations.js [projectRoot] --quiet # exit code only
 *
 * `--quiet` suppresses the SUCCESS summary. Errors are still printed: a failure with no stated
 * reason is a failure nobody can act on, and the exit code alone does not say which line to fix.
 *
 * Exit codes: 0 = the log is valid (or absent); 1 = a malformed line, or a skill the project does
 *             not carry; 2 = usage error.
 *
 * @tier standard+ — a project's own receipt book, checked at a milestone rather than on every
 *   push. The log is written by an agent during a session, not by the gate, and the central repo
 *   has no project to check it against.
 *
 * Source: global-configs/scripts/check-skill-activations.js
 */

const fs = require('fs');
const path = require('path');
const { listSkills } = require('./lib/skill-files.js');

/**
 * The activation log, relative to the project root. THE one home for this path: a second copy of
 * the string in a template, a script or a doc is how a reader ends up checking a file that is
 * never written.
 */
const ACTIVATION_LOG = path.join('docs', 'skill-activations.log');

/** Where the sync delivers the skills a project may activate. */
const SKILLS_DIR = '_skills';

/** The field separator of a receipt line. */
const SEPARATOR = '|';

const USAGE = 'Usage: node check-skill-activations.js [projectRoot] [--quiet]';

/**
 * The shape of an ISO-8601 timestamp: a calendar date, a `T`, a wall-clock time, and an optional
 * UTC offset. The offset may be absent — a local time is still ISO-8601 — but the DATE-TIME is
 * not optional, because a bare date cannot order two activations on the same day.
 */
const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

/**
 * Is this a timestamp the log may carry?
 * @param {string} value
 * @returns {boolean}
 */
function isValidTimestamp(value) {
  if (typeof value !== 'string' || !ISO_8601.test(value.trim())) return false;
  return !Number.isNaN(Date.parse(value.trim()));
}

/**
 * Parse one log line into a candidate entry. A candidate that cannot be read is returned too, with
 * `malformed` set and a reason — the caller needs the LINE NUMBER of a bad line, which a
 * well-formed-only list would have thrown away.
 *
 * @param {string} text the raw line
 * @param {number} lineNumber 1-based, as a reader sees it
 * @returns {{lineNumber:number, text:string, timestamp:string, skill:string, task:string,
 *            malformed:boolean, reason:string|null}}
 */
function parseLine(text, lineNumber) {
  const parts = text.split(SEPARATOR);
  const timestamp = (parts[0] || '').trim();
  const skill = (parts[1] || '').trim();
  // The remainder of the line, not a third field: the task is free text and may contain `|`.
  const task = parts.length > 2 ? parts.slice(2).join(SEPARATOR).trim() : '';

  const entry = { lineNumber, text, timestamp, skill, task, malformed: false, reason: null };

  if (parts.length < 3) {
    return {
      ...entry,
      malformed: true,
      reason: `expected 3 fields separated by "${SEPARATOR}", found ${parts.length}`,
    };
  }
  if (!isValidTimestamp(timestamp)) {
    return { ...entry, malformed: true, reason: `timestamp "${timestamp}" is not a valid ISO-8601 date` };
  }
  if (!skill) {
    return { ...entry, malformed: true, reason: 'the skill name is empty' };
  }
  if (!task) {
    return { ...entry, malformed: true, reason: 'the task description is empty' };
  }
  return entry;
}

/**
 * Read a project's activation log.
 *
 * `lines` is the file as it stands, split on newlines. `entries` holds a candidate for every line
 * that is neither blank nor a comment — a comment is a line whose trimmed form starts with `#`.
 *
 * @param {string} projectRoot
 * @returns {{path: string, exists: boolean, lines: string[], entries: object[]}}
 */
function readActivations(projectRoot) {
  const logPath = path.join(projectRoot, ACTIVATION_LOG);
  if (!fs.existsSync(logPath)) {
    return { path: logPath, exists: false, lines: [], entries: [] };
  }
  const lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/);
  const entries = [];
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    entries.push(parseLine(line, index + 1));
  });
  return { path: logPath, exists: true, lines, entries };
}

/**
 * The skills a project can actually open — the ones the sync delivered into its `_skills/`.
 *
 * The set is read from the project, never from the central corpus: the sync delivers a filtered
 * set, so a name that is in the corpus but not in the project is a false receipt.
 *
 * @param {string} projectRoot
 * @returns {Set<string>}
 */
function knownSkills(projectRoot) {
  const skillsDir = path.join(projectRoot, SKILLS_DIR);
  return new Set(listSkills(skillsDir).map((skill) => skill.name));
}

/**
 * Judge a set of candidate entries.
 *
 * `total` counts every well-formed line, including one that names a skill the project lacks — it
 * was recorded as an activation, and the run fails on it either way. `lastActivatedAt` is the
 * timestamp of the most recent well-formed line, as written in the log.
 *
 * @param {string} projectRoot
 * @param {object[]} entries candidates from `readActivations`
 * @returns {{errors: Array<{lineNumber:number, reason:string, text:string}>, total:number,
 *            distinctSkills:number, lastActivatedAt:string|null}}
 */
function validateActivations(projectRoot, entries) {
  const known = knownSkills(projectRoot);
  const errors = [];
  const skills = new Set();
  let total = 0;
  let lastActivatedAt = null;
  let lastEpoch = Number.NEGATIVE_INFINITY;

  for (const entry of entries) {
    if (entry.malformed) {
      errors.push({ lineNumber: entry.lineNumber, reason: entry.reason, text: entry.text });
      continue;
    }
    total += 1;
    skills.add(entry.skill);
    const epoch = Date.parse(entry.timestamp);
    if (epoch >= lastEpoch) {
      lastEpoch = epoch;
      lastActivatedAt = entry.timestamp;
    }
    if (!known.has(entry.skill)) {
      errors.push({
        lineNumber: entry.lineNumber,
        reason: `unknown skill "${entry.skill}" — the project does not carry it`,
        text: entry.text,
      });
    }
  }

  return { errors, total, distinctSkills: skills.size, lastActivatedAt };
}

/**
 * Validate a project's activation log.
 *
 * @param {string[]} [argv] defaults to the process arguments
 * @returns {number} the exit code — 0 valid, 1 invalid log, 2 usage error
 */
function main(argv = process.argv.slice(2)) {
  const flags = argv.filter((arg) => arg.startsWith('--'));
  const unknown = flags.filter((flag) => flag !== '--quiet');
  if (unknown.length) {
    console.error(`❌ unknown flag ${unknown[0]}`);
    console.error(USAGE);
    return 2;
  }
  const quiet = flags.includes('--quiet');

  const given = argv.find((arg) => !arg.startsWith('--'));
  // The project root DEFAULTS TO THE WORKING DIRECTORY. A guard is run from the project it guards —
  // `npm run skills:activations` in a project root, a CI step with that root as the working
  // directory — so making the path a required argument would only add a way to point the check at
  // the wrong tree. An explicit path is still accepted and still wins.
  const projectRoot = path.resolve(given || process.cwd());

  const { path: logPath, exists, entries } = readActivations(projectRoot);
  const project = path.basename(projectRoot);

  if (!exists) {
    if (!quiet) console.log(`  ✅ ${project}: no activations recorded yet (${logPath})`);
    return 0;
  }

  const { errors, total, distinctSkills, lastActivatedAt } = validateActivations(projectRoot, entries);

  if (errors.length) {
    console.error(`❌ ${logPath}: ${errors.length} invalid activation${errors.length === 1 ? '' : 's'}`);
    for (const error of errors) {
      console.error(`   line ${error.lineNumber}: ${error.reason}`);
    }
    return 1;
  }

  if (total === 0) {
    if (!quiet) console.log(`  ✅ ${project}: no activations recorded yet (${logPath})`);
    return 0;
  }

  if (!quiet) {
    console.log(`  ✅ ${project}: ${total} activation${total === 1 ? '' : 's'}, ${distinctSkills} distinct skill${distinctSkills === 1 ? '' : 's'}`);
    console.log(`     last: ${lastActivatedAt}`);
    console.log(`     log:  ${logPath}`);
  }
  return 0;
}

// `process.exitCode` rather than `process.exit()`: the summary is the product of this script, and
// an exit that truncates it reports a check nobody can read.
if (require.main === module) process.exitCode = main();

module.exports = {
  ACTIVATION_LOG,
  SKILLS_DIR,
  SEPARATOR,
  isValidTimestamp,
  parseLine,
  readActivations,
  knownSkills,
  validateActivations,
  main,
};
