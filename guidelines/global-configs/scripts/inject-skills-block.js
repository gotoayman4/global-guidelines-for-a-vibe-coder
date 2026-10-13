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
 * THE BLOCK IS RENDERED FROM THE PROJECT'S OWN `_skills/`, never from the central corpus. The sync
 * delivers a FILTERED set (12–16 of 20), so rendering the whole pool into a project would produce a
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
 * Exit codes: 0 = up to date (or written); 1 = `--check` found a change due, or the project is
 *             unusable; 2 = usage error.
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
 * The FIRST `## Skills` section, as line indices: `heading`, the body span `[bodyStart, end)`.
 * A section ends at the next heading of the same or a shallower level, so `## Skills (mandatory)`
 * following a `## Skills` is a sibling, not part of its body.
 */
function findSkillsSection(lines) {
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (!h || !/^Skills\b/.test(h[2].trim())) continue;
    const level = h[1].length;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].match(/^(#{1,6})\s+/);
      if (next && next[1].length <= level) {
        end = j;
        break;
      }
    }
    return { heading: i, bodyStart: i + 1, end };
  }
  return null;
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
 * Apply the block to a document.
 * @returns {{content: string, action: 'refreshed'|'migrated'|'appended'|'kept'|'unchanged'}}
 */
function applyBlock(doc, block) {
  const eol = doc.includes('\r\n') ? '\r\n' : '\n';
  const lf = doc.replace(/\r\n/g, '\n');

  const span = markedSpan(lf);
  if (span) {
    const next = `${lf.slice(0, span.start)}${marked(block)}${lf.slice(span.end)}`;
    if (next === lf) return { content: doc, action: 'unchanged' };
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

  const block = renderBlock(collect(skillsDir), { linkPrefix: LINK_PREFIX });
  const before = fs.readFileSync(agentsPath, 'utf8');
  const { content, action } = applyBlock(before, block);

  if (checkOnly) {
    if (action === 'unchanged' || action === 'kept') {
      if (!quiet) console.log(`  ✅ ${path.basename(projectRoot)}: ${SKILLS_DIR} block up to date`);
      process.exit(0);
    }
    console.error(`❌ ${path.basename(projectRoot)}: ${SKILLS_DIR} block needs ${action} — run the sync`);
    process.exit(1);
  }

  if (action !== 'unchanged' && action !== 'kept') {
    fs.writeFileSync(agentsPath, content, 'utf8');
  }
  if (!quiet) {
    const note = { refreshed: 'refreshed', migrated: 'migrated to a refreshable block', appended: 'added', kept: 'left the hand-written section alone', unchanged: 'up to date' }[action];
    console.log(`  ${action === 'kept' ? 'ℹ️ ' : '✅'} ${path.basename(projectRoot)}: ${note}`);
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { applyBlock, marked, markedSpan, findSkillsSection, legacyBody, BEGIN, END, HEADING, SKILLS_DIR, LINK_PREFIX };
