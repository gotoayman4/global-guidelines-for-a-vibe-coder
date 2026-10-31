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
 * load-when-matched rule, so a consumer that emits the block (`--emit`) receives the rule and the
 * inventory together. Splitting them would let a project install the table and lose the rule that
 * makes the table mean anything. The preamble is deliberately short: this block is injected into
 * every project's AGENTS.md and is paid for on every session.
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
 * A terse trigger for the AGENTS.md block: the few words that make a row fire, not the whole
 * description. WHY NOT THE FULL DESCRIPTION (owner decision 2026-10-31): the block is paid for on
 * every session boot in every tool that reads AGENTS.md, and since the native adapters + pool, a
 * native loader injects the SAME description text into its own context — the verbatim cell was a
 * second copy of a fact the tool already carries, at 1,800–2,850 tokens per project per boot.
 *
 * PRECEDENCE: an authored `metadata.trigger` wins verbatim (it is the owner's words — never
 * capped); otherwise the description's explicit `Triggers on …` clause (the phrases that name the
 * firing moment), falling back to its first sentence. Derived values are capped at 100 characters;
 * the full description stays one link away in the skill file and in each tool's own catalog.
 */
function terseTrigger(description, declared) {
  if (declared) return String(declared).trim();
  if (!description) return null;
  const text = String(description).replace(/\s+/g, ' ').trim();
  const pick = (value) => {
    let t = value.replace(/"/g, '').trim().replace(/\.$/, '');
    if (t.length > 100) t = `${t.slice(0, 100).replace(/\s+\S*$/, '')}…`;
    return t;
  };
  // The clause runs to the end of the description; `[^.]` would cut it at the first period INSIDE
  // a quoted filename (`latest.yml`, `node.exe` are real trigger phrases). Lazy-to-end captures the
  // whole clause, stripping only the final sentence period.
  const triggers = text.match(/Triggers? on:?\s+(.+?)\.?$/i);
  if (triggers) return pick(triggers[1]);
  return pick(text.split(/(?<=\.)\s/)[0]);
}

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
      triggerShort: meta(fm, 'trigger') || null,
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
 *
 * `terse: true` is the AGENTS.md shape (owner decision 2026-10-31): the trigger cell carries the
 * few firing words, not the verbatim description — the description is paid for on every boot in
 * every AGENTS.md-reading tool, and a native loader already injects it from its own catalog. The
 * corpus INDEX keeps the full text: it is read on demand, not loaded per session.
 */
function renderBlock(skills, { linkPrefix = '', terse = false } = {}) {
  const lines = [];
  lines.push('**Skills are task-activated.** Scan the `Load when` column when a task starts; when a row');
  lines.push('matches, open the linked SKILL.md and follow it. A skill never outranks `AGENTS.md`, and a row');
  lines.push("whose `Applies to` does not cover this stack is not applicable — skip it. The trigger here is");
  lines.push('terse; the full description lives in the skill file, and a native loader lists these skills in');
  lines.push('its own catalog. `_skills/` is the synced, stack-filtered copy of the central corpus (absent');
  lines.push('until the first sync); do not keep a hand-maintained copy of a delivered skill in a native');
  lines.push('store (`.qoder/skills/`, `.claude/skills/`, …) — it shadows `_skills/` and cannot follow upstream.');
  lines.push('');
  lines.push(`| Skill | Load when | Applies to | Status |`);
  lines.push('|---|---|---|---|');
  for (const skill of skills) {
    const name = `[${skill.name}](${linkPrefix}${skill.file})`;
    const trigger = terse ? terseTrigger(skill.trigger, skill.triggerShort) : skill.trigger;
    lines.push(`| ${name} | ${cell(trigger || '— *no trigger declared*')} | ${appliesCell(skill.appliesTo)} | ${cell(skill.status)} |`);
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

module.exports = { collect, renderBlock, terseTrigger, replaceRegion, cell, appliesCell, SKILL_EXT, INDEX_PATH, MARKER, BEGIN, END };
