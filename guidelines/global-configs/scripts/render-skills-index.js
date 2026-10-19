#!/usr/bin/env node

/**
 * render-skills-index.js — Renders the skill trigger inventory from the skills' own front-matter.
 *
 * INTENT: a skill's activation trigger lives in its front-matter `description`, which means the
 * trigger is stored inside the door it guards — an agent has to open the file to learn when to open
 * the file. Measured 2026-10-12 across the fleet: the `## Skills` section the sync writes into a
 * project's `AGENTS.md` named NO skill (zero occurrences of any `<name>.skill.md`), there was no
 * index inside `_skills/`, and the only inventory that existed — the generated skills table in
 * `_index/MASTER_INDEX.md` — sat inside the gitignored `_guidelines/` mirror that no rule points at
 * for skills. The result was that a skill could only ever be found by guessing its filename, which
 * works for `code-review` and fails for `firestore-cost-optimization`.
 *
 * DECISION: the inventory is DERIVED, never authored. Every cell comes from a skill's own
 * front-matter, so this file is a rendering and not a second home — the same relationship
 * `render-index.js` has to the guideline front-matter. Adding a skill adds a row with no edit here.
 *
 * THE OBLIGATION IS PART OF THE GENERATED BLOCK. The preamble inside the markers states the
 * load-and-announce rule, so a consumer that emits the block (`--emit`) receives the rule and the
 * inventory together. Splitting them would let a project install the table and lose the rule that
 * makes the table mean anything.
 *
 * WHAT THIS DOES NOT GUARD. A skill with no `description` renders as `—` and this script does not
 * fail — `audit-rules.js` owns that contract, and two guards failing for one defect is how a report
 * stops being read. The visible `—` is the pointer to the guard that will fail.
 *
 * Usage:
 *   node render-skills-index.js            # rewrite skills/INDEX.md
 *   node render-skills-index.js --check    # exit 1 if INDEX.md has drifted from the skills
 *   node render-skills-index.js --emit     # print the generated block only (for the sync to inject)
 *
 * Exit codes: 0 = rendered / in sync; 1 = drift, missing input, or a missing marker; 2 = usage error.
 *
 * Source: global-configs/scripts/render-skills-index.js
 */

const fs = require('fs');
const path = require('path');
const { parseFrontMatter, meta, asList } = require('./lib/front-matter.js');
const { SKILL_EXT, listSkills } = require('./lib/skill-files.js');

const SCRIPT_DIR = __dirname;
const GUIDELINES = path.resolve(SCRIPT_DIR, '..', '..');
// Overridable so the CLI's exit-code contract can be exercised against a fixture instead of the
// live corpus — the lesson `check-sync-drift.js` records: a test that asserts live state passes only
// while that state is broken, and fails the moment the corpus is fixed.
const SKILLS_DIR = process.env.SKILLS_INDEX_DIR || path.join(GUIDELINES, 'global-configs', 'skills');
const INDEX_PATH = process.env.SKILLS_INDEX_PATH || path.join(SKILLS_DIR, 'INDEX.md');

const MARKER = 'GENERATED:skills-index';
const BEGIN = `<!-- ${MARKER} — run \`npm run render:skills\` -->`;
const END = '<!-- /GENERATED -->';

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

/** A table cell: `|` would end the cell, and a newline would end the row. */
const cell = (value) => String(value).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();

/** `appliesTo` as a readable cell. Absent is reported, never invented — see the docblock. */
const appliesCell = (appliesTo) =>
  Array.isArray(appliesTo) && appliesTo.length ? appliesTo.map((a) => `\`${a}\``).join(' ') : '—';

/**
 * Every skill on disk, with the three facts the inventory renders.
 *
 * The skill's own directory name is the fallback `name`, because that is what a loader registers
 * when the front-matter is silent — rendering the stem is reporting what the tool would actually
 * use, not guessing at an intent nobody declared. `file` is the path relative to the skills root,
 * which is also the link target, so the inventory works for both `<name>/SKILL.md` and a legacy
 * `<name>.skill.md`.
 */
function collect(skillsDir = SKILLS_DIR) {
  if (!fs.existsSync(skillsDir)) fail(`skills directory not found: ${skillsDir}`);
  const skills = listSkills(skillsDir);
  if (skills.length === 0) fail(`no skills under ${skillsDir} — corpus is empty`);

  return skills.map((skill) => {
    const fm = parseFrontMatter(fs.readFileSync(skill.abs, 'utf8'));
    const appliesTo = asList(meta(fm, 'appliesTo'));
    return {
      file: skill.file,
      name: fm && fm.name ? fm.name : skill.name,
      trigger: fm && fm.description ? fm.description : null,
      appliesTo: appliesTo.length ? appliesTo : null,
      status: meta(fm, 'status') || '—',
    };
  });
}

/**
 * The generated block: the obligation, then the inventory. One block, so they cannot separate.
 *
 * `linkPrefix` is what makes ONE renderer serve two files whose relative depth differs. The block
 * lives at `_skills/INDEX.md` (a link `code-review/SKILL.md` resolves beside it) AND inside a
 * project's `AGENTS.md` at the project root (where the same link must be `_skills/code-review/SKILL.md`).
 * Rendering the row link from the file's own location, rather than hard-coding one of the two, is the
 * difference between a navigable inventory and a table of broken links — and it is why the injector
 * can reuse this function instead of growing a second, drifting copy of the table.
 */
function renderBlock(skills, { linkPrefix = '' } = {}) {
  const lines = [];
  lines.push('**Every skill here is task-activated.** Before starting a task, scan the `Load when`');
  lines.push('column. When a row matches, open that skill and follow it, and announce it in chat as');
  lines.push('`Skill: <name> activated`.');
  lines.push('');
  lines.push('**Record the activation.** The chat announcement is what the human sees; it is not evidence.');
  lines.push('When you open a skill, append one line to `docs/skill-activations.log` in this project:');
  lines.push('`<ISO-8601 timestamp> | <skill-name> | <the task that triggered it>`. A receipt naming a');
  lines.push('skill this project does not carry is a false receipt, so the log is validated against the');
  lines.push('delivered set.');
  lines.push('');
  lines.push('**Where the files live.** `_skills/<name>/SKILL.md` is the synced mirror this project reads:');
  lines.push('present after a sync, absent in a fresh clone until one runs. The canonical source is the');
  lines.push('central steering repo\'s `guidelines/global-configs/skills/` — the mirror is a copy of it,');
  lines.push('and only the skills that fit this project\'s stack are copied.');
  lines.push('');
  lines.push('A skill never outranks `AGENTS.md`: where the two disagree, `AGENTS.md` wins. And a row whose');
  lines.push('`Applies to` does not cover this project\'s stack is **not applicable** — skip it rather than');
  lines.push('adapting it, because a skill written for a stack this project forbids will contradict the');
  lines.push('constitution if it is followed anyway.');
  lines.push('');
  lines.push('**The sync applies the same rule when it copies.** `_skills/` is not the whole pool:');
  lines.push('`plan-skills.js` reads each project\'s `### Stack` table, its `### Forbidden …` list and its');
  lines.push('`package.json`, copies only the skills that fit and prunes the ones that no longer do.');
  lines.push('`npm run plan:skills` prints that decision for every registered project without touching');
  lines.push('anything. A project that declares no stack at all receives everything, because nothing can be');
  lines.push('ruled out — the right default for an empty folder, the wrong one for a project that simply');
  lines.push('never filled the table in.');
  lines.push('');
  lines.push(`| Skill | Load when | Applies to | Status |`);
  lines.push('|---|---|---|---|');
  for (const skill of skills) {
    const name = `[${skill.name}](${linkPrefix}${skill.file})`;
    lines.push(`| ${name} | ${cell(skill.trigger || '— *no trigger declared*')} | ${appliesCell(skill.appliesTo)} | ${cell(skill.status)} |`);
  }
  return lines.join('\n');
}

/** Replace the text between BEGIN and END. Returns null when either marker is absent. */
function replaceRegion(doc, content) {
  const start = doc.indexOf(BEGIN);
  if (start === -1) return null;
  const end = doc.indexOf(END, start);
  if (end === -1) return null;
  return `${doc.slice(0, start)}${BEGIN}\n\n${content}\n\n${doc.slice(end)}`;
}

function main() {
  const argv = process.argv.slice(2);
  const unknown = argv.filter((a) => !['--check', '--emit'].includes(a));
  if (unknown.length) {
    console.error(`❌ unknown flag ${unknown[0]}`);
    console.error('Usage: node render-skills-index.js [--check] [--emit]');
    process.exit(2);
  }
  const checkOnly = argv.includes('--check');
  const emitOnly = argv.includes('--emit');

  const skills = collect();
  const block = renderBlock(skills);
  const withoutTrigger = skills.filter((s) => !s.trigger).length;
  const withoutAppliesTo = skills.filter((s) => !Array.isArray(s.appliesTo) || s.appliesTo.length === 0).length;

  // `--emit` exists for the sync: a project's `AGENTS.md` must carry the SAME block, and the only
  // way to guarantee that is for one renderer to produce both. A second renderer would be a second
  // home for the inventory, which is the defect this file was written to remove.
  if (emitOnly) {
    process.stdout.write(`${block}\n`);
    process.exit(0);
  }

  if (!fs.existsSync(INDEX_PATH)) {
    fail(`skills/INDEX.md not found at ${INDEX_PATH} — create it with the ${MARKER} markers, then run "npm run render:skills"`);
  }
  const onDisk = fs.readFileSync(INDEX_PATH, 'utf8');
  const rendered = replaceRegion(onDisk, block);
  if (rendered === null) {
    fail(`marker not found in skills/INDEX.md: ${MARKER} (BEGIN or END missing) — do not delete the generated region`);
  }

  const note = `${skills.length} skills · ${withoutTrigger} without a trigger · ${withoutAppliesTo} without appliesTo`;

  if (checkOnly) {
    if (onDisk.replace(/\r\n/g, '\n') !== rendered.replace(/\r\n/g, '\n')) {
      fail('skills/INDEX.md has drifted from the skills — run "npm run render:skills". Do not hand-edit inside the GENERATED markers.');
    }
    console.log(`✅ skills/INDEX.md in sync (${note})`);
    return;
  }

  fs.writeFileSync(INDEX_PATH, rendered.replace(/\r\n/g, '\n'), 'utf8');
  console.log(`✅ rendered skills/INDEX.md (${note})`);
}

if (require.main === module) main();

module.exports = { collect, renderBlock, replaceRegion, cell, appliesCell, SKILL_EXT, INDEX_PATH, MARKER, BEGIN, END };
