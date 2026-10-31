#!/usr/bin/env node

/**
 * inject-skills-block.js — Write, and REFRESH, the `## Skills` inventory in a project's AGENTS.md.
 *
 * INTENT: the sync used to append a `## Skills` section only when the project had none
 * (`-notmatch '(?m)^## Skills'`) and could never touch it again. That is fine while the block is a
 * frozen sentence and wrong the moment it is DERIVED — a layout change, a new skill or an edited
 * `description` strands the old block forever, because the sync cannot tell its OWN generated block
 * from a hand-written one. Measured 2026-10-13: after the `<name>/SKILL.md` migration, five fleet
 * projects still pointed at `_skills/<name>.skill.md` — a path that no longer exists — and no
 * re-sync could repair them.
 *
 * DECISION: the block is MARKER-DELIMITED, and the marker is the only thing the sync owns.
 *
 *   1. A marked block is REFRESHED in place — the region between the markers is replaced and nothing
 *      else in the file is touched. This is the case that was impossible before.
 *   2. An UNMARKED `## Skills` whose body is exactly the manifest's `agentsMdSectionBody` is a block
 *      a previous sync wrote, before markers existed. It is MIGRATED to a marked block rather than
 *      mistaken for prose — the body is compared against the manifest's own value, so the recogniser
 *      is the single home and not a second list of historical strings.
 *   3. Any other `## Skills` is HAND-WRITTEN and is left alone. `AGENTS.md` is the project's
 *      constitution; a generated index that overwrote a project's own rule would be worse than a
 *      stale one. gs-coordinator-helper's D159 paragraph and pcms's `.qoder/` note live here.
 *   4. No `## Skills` at all — the section is appended.
 *
 * AND THE SECTION IS CHECKED AGAINST WHAT THE PROJECT ACTUALLY HAS. Point 3 says the sync will not
 * overwrite a hand-written section; it used to follow that with "and `--check` calls that up to
 * date", which is a control reporting green about the one state it cannot see. Measured 2026-10-19
 * across the seven registered projects: three carry a hand-written section, and two of them named at
 * most five of the twelve-to-seventeen skills they had been delivered — so an agent following those
 * sections was told to "load a skill when its trigger matches" while being given almost no triggers.
 * The check now asks a question the filesystem can answer: does the section NAME every delivered
 * skill? A hand-written section stays hand-written; it just cannot be silent about what it omits.
 *
 * WHICH SECTION, WHEN THERE ARE SEVERAL. The old matcher took the first heading beginning with
 * `Skills` at ANY level, so a constitution carrying `### Skills (Always Load)` — the shape this
 * repo's own `AGENTS.md` uses — had the inventory injected into that subsection while the `## Skills`
 * section it was meant to fill stayed empty. The shallowest candidate now wins, and within a level
 * the exact label `Skills` beats `Skills (mandatory)`.
 *
 * THE BLOCK IS RENDERED FROM THE PROJECT'S OWN `_skills/`, never from the central corpus. The sync
 * delivers a FILTERED set (a subset of the pool), so rendering the whole pool into a project would produce a
 * table of rows whose links resolve to files the project does not have. `collect` reads the delivered
 * files, so the table is exactly what the agent can open, and the links are prefixed `_skills/` to
 * resolve from the project root rather than from inside `_skills/`.
 *
 * IDEMPOTENT: an unchanged block is not rewritten, so a re-sync does not churn AGENTS.md (and a
 * `clean-tree` step does not see a file that only changed its mtime).
 *
 * Usage:
 *   node inject-skills-block.js <projectRoot>            # write / refresh / migrate
 *   node inject-skills-block.js <projectRoot> --check    # exit 1 if a change is due
 *   node inject-skills-block.js <projectRoot> --quiet    # exit code only
 *
 * Exit codes: 0 = up to date (or written); 1 = `--check` found a change due, or the section omits a
 *             delivered skill; 2 = usage error.
 *
 * Source: global-configs/scripts/inject-skills-block.js
 */

const fs = require('fs');
const path = require('path');
const { collect, renderBlock } = require('./render-skills-index.js');
const { listSkills } = require('./lib/skill-files.js');

const AGENTS = 'AGENTS.md';
const SKILLS_DIR = '_skills';
const HEADING = '## Skills';
/** The link prefix that resolves from the project root; `renderBlock` renders `<name>/SKILL.md`. */
const LINK_PREFIX = `${SKILLS_DIR}/`;

/**
 * The markers. They name the tool that owns the region, so a reader who finds them knows what wrote
 * it and what will rewrite it — a marker that only says "generated" leaves the operator guessing.
 */
const BEGIN = `<!-- BEGIN generated:skills-block — written by sync-guidelines.ps1, do not edit inside -->`;
const END = '<!-- END generated:skills-block -->';

/**
 * The project's own notes, inside the generated block.
 *
 * WHY THIS REGION EXISTS. Three of the seven registered projects carry a hand-written `## Skills`
 * section, and the sync refuses to overwrite it — `AGENTS.md` is the project's constitution, and a
 * generator that overwrote a project's own rule would be worse than a stale one. But "refuse to
 * overwrite" also meant "never refresh": the inventory went stale the moment a skill was added
 * upstream, and the drift guard could then only report an omission it had no way to fix.
 *
 * This region splits the two halves. The TABLE is generated and regenerated — it names every skill
 * the project was delivered, with the trigger for each. The NOTES are the project's own text and are
 * carried over VERBATIM on every refresh, so a project keeps its rule ("our canonical skills live
 * in `.qoder/skills/`", "these six skills are deliberately not delivered") while still receiving an
 * inventory that cannot go stale.
 *
 * The region is OPTIONAL: a block without one is a plain generated block, and a project that has no
 * notes of its own needs no marker.
 */
const NOTES_BEGIN = '<!-- BEGIN project:skills-notes — your own notes; the sync preserves this region verbatim -->';
const NOTES_END = '<!-- END project:skills-notes -->';

/**
 * The notes region of a text, markers included — or null when the text has none.
 *
 * A HALF-MARKED notes region is treated as absent rather than guessed at: a region with a BEGIN and
 * no END is a broken file, and rewriting it on a guess would destroy text the project wrote.
 *
 * @param {string} text
 * @returns {string|null}
 */
function notesRegion(text) {
  const lf = String(text || '');
  const start = lf.indexOf(NOTES_BEGIN);
  if (start === -1) return null;
  const end = lf.indexOf(NOTES_END, start);
  if (end === -1) return null;
  return lf.slice(start, end + NOTES_END.length);
}

const MANIFEST = path.join(__dirname, '..', 'sync-manifest.json');

/** The block, wrapped so a later run can find it. */
function marked(block) {
  return `${BEGIN}\n\n${block}\n\n${END}`;
}

/** The marked region of a document, or null. Both markers are required — a half-marked file is not
 *  ours to overwrite, and guessing which half was meant is how a generator eats a paragraph. */
function markedSpan(doc) {
  const start = doc.indexOf(BEGIN);
  if (start === -1) return null;
  const end = doc.indexOf(END, start);
  if (end === -1) return null;
  return { start, end: end + END.length };
}

/**
 * The `## Skills` section, as line indices: `heading`, the body span `[bodyStart, end)`.
 * A section ends at the next heading of the same or a shallower level, so `## Skills (mandatory)`
 * following a `## Skills` is a sibling, not part of its body.
 *
 * WHICH CANDIDATE WINS, and why the old "first match wins" was wrong. The old rule took the first
 * heading whose text began with `Skills`, at ANY level. A project whose constitution carries a
 * `### Skills (Always Load)` subsection — a shape this very repo's `AGENTS.md` uses — would have had
 * its inventory injected INTO that subsection, silently, while the `## Skills` section it was meant
 * to fill stayed empty. Verified 2026-10-19: a document with `### Skills (Always Load)` above a
 * `## Skills` made the old matcher return the `###` one.
 *
 * The rule now is: the SHALLOWEST candidate wins, and within one level the EXACT label `Skills`
 * beats `Skills (mandatory)` or `Skills (Always Load)`. A deeper heading is still accepted when no
 * shallower one exists — a project whose only skills heading is a `###` subsection still gets its
 * table, which is better than none.
 */
function findSkillsSection(lines) {
  const candidates = [];
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (!h) continue;
    const label = h[2].trim();
    if (!/^Skills\b/i.test(label)) continue;
    const level = h[1].length;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].match(/^(#{1,6})\s+/);
      if (next && next[1].length <= level) {
        end = j;
        break;
      }
    }
    candidates.push({ heading: i, bodyStart: i + 1, end, level, exact: /^skills$/i.test(label) });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.level - b.level || b.exact - a.exact || a.heading - b.heading);
  return candidates[0];
}

/** The body a PREVIOUS sync wrote, per the manifest — the migration recogniser, never a literal. */
function legacyBody() {
  try {
    return String(JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))?.skills?.agentsMdSectionBody || '').trim();
  } catch {
    return '';
  }
}

/**
 * Does the `## Skills` section NAME every skill the project was actually delivered?
 *
 * WHY THIS EXISTS. The sync's `--check` used to report `kept` — "there is a hand-written `## Skills`
 * section and I refuse to touch it" — as **"up to date", exit 0**. Measured 2026-10-19 across the
 * seven registered projects: three carry a hand-written section, and the check was green on all three
 * while two of them named at most five of the twelve-to-seventeen skills they had been delivered. A
 * control that reports "fine" about the exact state it cannot see is worse than no control, because
 * it teaches the operator to stop reading it.
 *
 * So the check now asks a question it can answer from the filesystem: does the inventory name what
 * the project HAS? A hand-written section is allowed to exist — `AGENTS.md` is the project's own
 * constitution, and a generator that overwrote a project's rule would be worse than a stale one —
 * but it is no longer allowed to be silent about what it omits.
 *
 * HOW A NAME COUNTS AS NAMED. Two forms only, both unambiguous:
 *   - `<name>/SKILL.md` — the form the generated table uses (`[architect](_skills/architect/SKILL.md)`)
 *   - `` `<name>` ``      — the form a hand-written section uses when it names the skill in prose.
 * A bare word inside a sentence ("the architect decided") does not count, and neither does a mention
 * in the section's prose about something else. The check is about an INVENTORY, not about a word.
 *
 * The scope is the SECTION BODY, not the whole document: a skill named in an unrelated rule
 * elsewhere in `AGENTS.md` is not an inventory entry, and treating it as one would let a project
 * pass on a mention that tells the agent nothing about when to load the skill.
 *
 * @param {string} sectionText the `## Skills` section body
 * @param {string} skillsDir the project's delivered skills directory
 * @returns {{state: 'complete'|'incomplete'|'none', delivered: number, referenced: number, missing: string[]}}
 */
function verifyInventory(sectionText, skillsDir) {
  const delivered = listSkills(skillsDir).map((s) => s.name);
  if (!delivered.length) return { state: 'none', delivered: 0, referenced: 0, missing: [] };
  const text = String(sectionText || '');
  const missing = [];
  let referenced = 0;
  for (const name of delivered) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const asPath = new RegExp(`${escaped}/SKILL\\.md`);
    const asCode = new RegExp('`' + escaped + '`');
    if (asPath.test(text) || asCode.test(text)) referenced += 1;
    else missing.push(name);
  }
  return {
    state: missing.length ? 'incomplete' : 'complete',
    delivered: delivered.length,
    referenced,
    missing,
  };
}

/** The `## Skills` section body of a document, or an empty string when it has none. */
function skillsSectionBody(doc) {
  const span = markedSpan(String(doc || '').replace(/\r\n/g, '\n'));
  if (span) {
    const lf = String(doc).replace(/\r\n/g, '\n');
    return lf.slice(span.start, span.end);
  }
  const section = findSkillsSection(String(doc || '').replace(/\r\n/g, '\n').split('\n'));
  if (!section) return '';
  return String(doc).replace(/\r\n/g, '\n').split('\n').slice(section.bodyStart, section.end).join('\n');
}

/**
 * Normalise a block so two versions can be compared for SUBSTANCE rather than for layout.
 *
 * WHY THIS EXISTS. The generated table lands in a project's `AGENTS.md`, and four of the seven
 * registered projects run prettier over their markdown in a pre-commit hook. Prettier aligns
 * markdown tables, so the formatter rewrites the block the sync just wrote — and the next sync
 * writes it back unaligned. The block then differs from the file on every cycle, and the
 * `clean-tree` pre-push gate reports a dirty tree for a change nobody made.
 *
 * Comparing the two NORMALISED forms settles it: a table row is reduced to its cells, trimmed,
 * and rejoined, so `| a   | b |` and `| a | b |` are the same block. Anything that is not a table
 * row is compared on its trimmed text. A real edit — a new skill, a changed trigger, a changed
 * sentence — still differs, so the check never swallows a genuine change.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeBlock(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('|')) return trimmed;
      return trimmed
        .split('|')
        .map((cell) => {
          const value = cell.trim();
          // The delimiter row is the one place a formatter changes the TEXT and not just the
          // padding: prettier fills the column with dashes, the plain renderer writes three.
          return /^-+$/.test(value) ? '---' : value;
        })
        .join('|');
    })
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Apply the block to a document.
 * @returns {{content: string, action: 'refreshed'|'migrated'|'appended'|'kept'|'unchanged'}}
 */
function applyBlock(doc, block) {
  const eol = doc.includes('\r\n') ? '\r\n' : '\n';
  const lf = doc.replace(/\r\n/g, '\n');

  const span = markedSpan(lf);
  if (span) {
    // The project's own notes travel with the refresh: the table is regenerated, the notes are not.
    const old = lf.slice(span.start, span.end);
    const notes = notesRegion(old);
    const body = notes ? `${block}\n\n${notes}` : block;
    const next = `${lf.slice(0, span.start)}${marked(body)}${lf.slice(span.end)}`;
    if (next === lf) return { content: doc, action: 'unchanged' };
    // A formatter may have re-aligned the generated table. That is a layout change, not a change to
    // the block, and rewriting it would make every sync dirty the tree of a project whose
    // pre-commit hook runs a markdown formatter. The file keeps the formatter's alignment.
    if (normalizeBlock(next) === normalizeBlock(lf)) return { content: doc, action: 'unchanged' };
    return { content: next.replace(/\n/g, eol), action: 'refreshed' };
  }

  const lines = lf.split('\n');
  const section = findSkillsSection(lines);
  if (section) {
    const body = lines.slice(section.bodyStart, section.end).join('\n').trim();
    const known = legacyBody();
    if (!known || body !== known) {
      // Hand-written, or a generated body this manifest no longer declares. Either way it is not
      // ours to rewrite.
      return { content: doc, action: 'kept' };
    }
    lines.splice(section.heading + 1, section.end - section.heading - 1, '', ...marked(block).split('\n'), '');
    return { content: lines.join('\n').replace(/\n/g, eol), action: 'migrated' };
  }

  const trimmed = lf.replace(/\s+$/, '');
  const next = `${trimmed}\n\n---\n\n${HEADING}\n\n${marked(block)}\n`;
  return { content: next.replace(/\n/g, eol), action: 'appended' };
}

function main() {
  const argv = process.argv.slice(2);
  const flags = argv.filter((a) => a.startsWith('--'));
  const unknown = flags.filter((f) => !['--check', '--quiet'].includes(f));
  if (unknown.length) {
    console.error(`❌ unknown flag ${unknown[0]}`);
    console.error('Usage: node inject-skills-block.js <projectRoot> [--check] [--quiet]');
    process.exit(2);
  }
  const checkOnly = flags.includes('--check');
  const quiet = flags.includes('--quiet');

  const projectRoot = argv.find((a) => !a.startsWith('--'));
  if (!projectRoot) {
    console.error('❌ a project root is required');
    console.error('Usage: node inject-skills-block.js <projectRoot> [--check] [--quiet]');
    process.exit(2);
  }

  const agentsPath = path.join(projectRoot, AGENTS);
  const skillsDir = path.join(projectRoot, SKILLS_DIR);

  // Nothing to index and nothing to write. A project with no AGENTS.md has not been scaffolded (the
  // starters own that); a project with no skills receives no section — an empty table is worse than
  // no table, because it claims the project has skills.
  if (!fs.existsSync(agentsPath)) {
    if (!quiet) console.log(`  ${path.basename(projectRoot)}: no ${AGENTS} — nothing to inject`);
    process.exit(0);
  }
  if (listSkills(skillsDir).length === 0) {
    if (!quiet) console.log(`  ${path.basename(projectRoot)}: no skills under ${SKILLS_DIR}/ — nothing to inject`);
    process.exit(0);
  }

  // `terse: true` — the AGENTS.md block is paid for on every boot in every tool that reads it, and
  // a native loader already injects the full description from its own catalog (owner decision
  // 2026-10-31). The corpus INDEX keeps the full text: read on demand, never loaded per session.
  const block = renderBlock(collect(skillsDir), { linkPrefix: LINK_PREFIX, terse: true });
  const before = fs.readFileSync(agentsPath, 'utf8');
  const { content, action } = applyBlock(before, block);

  // What the section says, checked against what the project actually has. `content` is the document
  // as it WILL be, so a write that just happened is measured the same way as one already on disk.
  const inventory = verifyInventory(skillsSectionBody(content), skillsDir);
  const name = path.basename(projectRoot);

  if (checkOnly) {
    if (action === 'refreshed' || action === 'migrated' || action === 'appended') {
      console.error(`❌ ${name}: ${SKILLS_DIR} block needs ${action} — run the sync`);
      process.exit(1);
    }
    if (inventory.state === 'incomplete') {
      console.error(
        `❌ ${name}: ${SKILLS_DIR} block names ${inventory.referenced} of ${inventory.delivered} delivered skill(s) — missing: ${inventory.missing.join(', ')}`
      );
      process.exit(1);
    }
    if (action === 'kept') {
      if (!quiet) {
        console.log(
          `  ✅ ${name}: ${SKILLS_DIR} block is hand-written and left alone — inventory verified (${inventory.referenced}/${inventory.delivered} skills named)`
        );
      }
      process.exit(0);
    }
    if (!quiet) console.log(`  ✅ ${name}: ${SKILLS_DIR} block up to date`);
    process.exit(0);
  }

  if (action !== 'unchanged' && action !== 'kept') {
    fs.writeFileSync(agentsPath, content, 'utf8');
  }
  if (!quiet) {
    if (action === 'kept') {
      console.log(
        `  ℹ️ ${name}: left the hand-written ${SKILLS_DIR} section alone — inventory verified (${inventory.referenced}/${inventory.delivered} skills named)`
      );
    } else {
      const note = { refreshed: 'refreshed', migrated: 'migrated to a refreshable block', appended: 'added', unchanged: 'up to date' }[action];
      console.log(`  ✅ ${name}: ${note}`);
    }
  }
  // A hand-written section that omits delivered skills is reported, loudly, but the WRITE still
  // succeeded — so the exit code stays 0 and the caller is not told the section was not written.
  // `--check` is where an omission becomes a failure; the drift guard is where it becomes a verdict.
  //
  // THE REPORT GOES TO STDOUT, not stderr. The sync runs this script from PowerShell, and
  // PowerShell's native-command wrapper turns a native process writing to stderr into a
  // `NativeCommandError` — a terminating error under the module's `$ErrorActionPreference`. A
  // warning that broke the sync that was trying to fix it would be a defect, so the warning is
  // ordinary output. stderr stays reserved for the `--check` failure, where a non-zero exit is
  // the whole point.
  if (inventory.state === 'incomplete') {
    console.log(
      `  ⚠️  ${name}: the ${SKILLS_DIR} section names ${inventory.referenced} of ${inventory.delivered} delivered skill(s) — missing: ${inventory.missing.join(', ')}`
    );
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { applyBlock, marked, markedSpan, findSkillsSection, legacyBody, verifyInventory, skillsSectionBody, notesRegion, normalizeBlock, BEGIN, END, NOTES_BEGIN, NOTES_END, HEADING, SKILLS_DIR, LINK_PREFIX };
