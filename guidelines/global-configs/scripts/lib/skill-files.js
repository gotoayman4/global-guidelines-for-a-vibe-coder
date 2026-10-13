/**
 * skill-files.js — the one home for "what is a skill file, and what is its name".
 *
 * INTENT: eight scripts walk the skills corpus, and before this file each carried its own
 * `readdirSync(dir).filter(f => f.endsWith('.skill.md'))`. When the corpus moved to the Agent
 * Skills standard layout — a directory per skill, `<name>/SKILL.md` — eight private copies of the
 * old assumption is eight places to forget. This is the single home: the constants, the walk, and
 * the name derivation live here, and every reader imports them.
 *
 * THE STANDARD, AND THE ONE EXCEPTION. The Agent Skills specification (agentskills.io/specification)
 * requires a skill to be a directory containing `SKILL.md`, with `name` matching the directory. That
 * is what this repo ships. The flat `<name>.skill.md` layout is still READ — a project whose `_skills/`
 * has not been re-synced yet, and the fixtures in the test suite, both use it — but it is never
 * WRITTEN. Tolerance is for the transition, not a second supported format.
 *
 * NOT a guard: no `@tier`. It derives a value rather than asserting a property.
 *
 * Source: global-configs/scripts/lib/skill-files.js
 */

const fs = require('fs');
const path = require('path');

/** The standard filename, required by the Agent Skills specification. What the sync writes. */
const SKILL_FILE = 'SKILL.md';

/** The legacy flat filename suffix. Read for backward compatibility, never written. */
const SKILL_EXT = '.skill.md';

/**
 * Every skill under a directory, tolerant of both layouts.
 *
 * @param {string} dir
 * @returns {Array<{name: string, file: string, abs: string}>} sorted by skill name
 */
function listSkills(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const abs = path.join(dir, entry.name, SKILL_FILE);
      if (fs.existsSync(abs)) out.push({ name: entry.name, file: `${entry.name}/${SKILL_FILE}`, abs });
    } else if (entry.isFile() && entry.name.endsWith(SKILL_EXT)) {
      const name = entry.name.slice(0, -SKILL_EXT.length);
      out.push({ name, file: entry.name, abs: path.join(dir, entry.name) });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The skill's own name, from a path. `<dir>/<name>/SKILL.md` → `<name>`; `<dir>/<name>.skill.md` → `<name>`.
 * @param {string} abs
 * @returns {string}
 */
function skillName(abs) {
  const base = path.basename(abs);
  if (base === SKILL_FILE) return path.basename(path.dirname(abs));
  if (base.endsWith(SKILL_EXT)) return base.slice(0, -SKILL_EXT.length);
  return base;
}

/**
 * Does this relative path look like a skill file? Used by the drift guard, which hashes paths.
 * @param {string} relPosix a path relative to the skills root, `/`-separated
 * @returns {boolean}
 */
function isSkillPath(relPosix) {
  return relPosix === SKILL_FILE || relPosix.endsWith(`/${SKILL_FILE}`) || relPosix.endsWith(SKILL_EXT);
}

module.exports = { SKILL_FILE, SKILL_EXT, listSkills, skillName, isSkillPath };
