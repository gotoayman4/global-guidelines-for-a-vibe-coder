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

/**
 * Every file a skill delivers, relative to its own directory.
 *
 * A skill is a DIRECTORY in the standard layout, and its `SKILL.md` is only the entry point:
 * `references/`, `scripts/` and `assets/` sit beside it and are instructed to load on demand. The
 * sync used to copy `SKILL.md` alone, so a project received a skill whose own links pointed at files
 * that were never delivered — and the drift check compared entry files only, so it reported green.
 * The payload is therefore every regular file under the skill's directory, not the entry file.
 *
 * A legacy flat `<name>.skill.md` has no companions; it is delivered as `SKILL.md`.
 *
 * @param {string} abs path to a skill's `SKILL.md`, or to a legacy `.skill.md`
 * @returns {Array<{rel: string, from: string}>} `rel` is `/`-separated; `SKILL.md` sorts first
 */
function skillPayload(abs) {
  if (path.basename(abs) !== SKILL_FILE) {
    return [{ rel: SKILL_FILE, from: abs }];
  }

  const root = path.dirname(abs);
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile()) files.push({ rel: path.relative(root, p).replace(/\\/g, '/'), from: p });
    }
  };
  walk(root);
  return files.sort((a, b) => {
    if (a.rel === SKILL_FILE) return -1;
    if (b.rel === SKILL_FILE) return 1;
    return a.rel.localeCompare(b.rel);
  });
}

/**
 * Every regular file under a directory, `/`-separated relative paths. Used to find files a project
 * carries that its plan does not deliver.
 * @param {string} root
 * @returns {string[]}
 */
function listFiles(root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile()) out.push(path.relative(root, p).replace(/\\/g, '/'));
    }
  };
  walk(root);
  return out;
}

module.exports = { SKILL_FILE, SKILL_EXT, listSkills, skillName, isSkillPath, skillPayload, listFiles };
