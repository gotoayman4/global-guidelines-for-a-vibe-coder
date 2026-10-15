/**
 * front-matter.js — the one reader for YAML front-matter in this corpus.
 *
 * INTENT: three scripts need the same thing — the `key: value` block at the top of a file, with
 * inline `[a, b]` sequences and optional quotes. `render-index.js` grew its own copy, and a second
 * copy is how two readers drift: one accepts a quoted scalar the other returns with the quotes
 * still attached, and the difference surfaces as a table cell nobody can explain. This is the
 * single home.
 *
 * SCOPE, DELIBERATELY NARROW: scalars, inline sequences, and ONE level of nested map. The nested
 * map exists for exactly one key — the Agent Skills standard's optional `metadata:` block, which is
 * the spec-conformant home for a skill's repo-specific fields (`status`, `scope`, `tags`,
 * `appliesTo`). A skill must expose only `name` and `description` at the top level, or a strict
 * loader rejects it; the rest ride under `metadata:`. Block sequences and multi-line scalars are
 * still out of scope, and a full YAML parser would be a dependency this repo does not need. An
 * unrecognised line is skipped rather than guessed at — a parser that invents structure is worse
 * than one that reports nothing.
 *
 * `meta(fm, key)` is the accessor every reader should use: it reads `fm.metadata[key]` when the key
 * lives under the metadata block and falls back to the top-level `fm[key]`. That one function is
 * what lets the skill corpus move to the standard without every reader learning two shapes.
 *
 * `parseFrontMatter` returns null when there is no front-matter at all, which is a different answer
 * from "front-matter with no keys": the first is a file that has not declared anything, the second
 * is a file whose block is present but empty. Callers that require a key must handle null.
 *
 * NOT a guard: no `@tier`. It derives a value rather than asserting a property, so
 * `check-guard-tiers.js` deliberately leaves it out of scope (see that file's CAVEAT).
 *
 * Usage:
 *   const { parseFrontMatter } = require('./lib/front-matter.js');
 *   const fm = parseFrontMatter(fs.readFileSync(file, 'utf8'));  // null | Record<string, string|string[]>
 *
 * Source: global-configs/scripts/lib/front-matter.js
 */

/**
 * A scalar value: an inline `[a, b]` sequence, a quoted string, or the raw text.
 *
 * **CONSTRAINT — a double-quoted scalar is UNESCAPED, not just unwrapped.** YAML writes an inner
 * quote as `\"`, so a parser that strips the outer quotes only has removed the envelope. Measured
 * 2026-10-15: the emulator skill's `description` (a double-quoted YAML scalar whose trigger words are
 * themselves quoted) arrived in every generated table as `\"popup\"`, and the row injected into a
 * project's `AGENTS.md` — a generated region no project may hand-edit — carried the backslashes. The
 * escape set is deliberately the two this corpus uses: `\"` and `\\`. Any other sequence (`\t`, `\n`,
 * `\uXXXX`) is left as the author wrote it, on the same rule as the rest of this file — a parser that
 * invents structure is worse than one that reports nothing.
 *
 * @param {string} raw
 * @returns {string|string[]}
 */
function scalarValue(raw) {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length > 1) {
    return raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (raw.startsWith("'") && raw.endsWith("'") && raw.length > 1) {
    return raw.slice(1, -1);
  }
  return raw;
}

/**
 * Parse the leading `---` block.
 *
 * Accepts both LF and CRLF line endings — a file checked out with `core.autocrlf=true` on Windows
 * would otherwise parse as "no front-matter at all", which every reader treats as a skill that
 * declares nothing. A key whose value is empty opens a nested map; the lines indented beneath it
 * land in that map. One level deep, no more.
 *
 * @param {string} text
 * @returns {Record<string, string|string[]|Record<string,string|string[]>>|null}
 */
function parseFrontMatter(text) {
  const match = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const fm = {};
  let mapKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    const kv = line.match(/^(\s*)([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const indented = kv[1].length > 0;
    const key = kv[2];
    const raw = kv[3].trim();
    if (indented) {
      if (mapKey) fm[mapKey][key] = scalarValue(raw);
      // An indented line with no open map is skipped, never attached to the previous scalar.
      continue;
    }
    if (raw === '') {
      fm[key] = {};
      mapKey = key;
    } else {
      fm[key] = scalarValue(raw);
      mapKey = null;
    }
  }
  return fm;
}

/**
 * Read a front-matter key from wherever it lives — the top level, or the nested `metadata:` map.
 *
 * INTENT: a skill's repo-specific fields (`status`, `scope`, `tags`, `appliesTo`) moved under
 * `metadata:` to satisfy the Agent Skills standard, while guideline files keep them at the top
 * level. Without one accessor, every reader would need to know both shapes and would drift.
 *
 * @param {Record<string, unknown>|null} fm
 * @param {string} key
 * @returns {unknown}
 */
function meta(fm, key) {
  if (!fm) return undefined;
  if (fm.metadata && typeof fm.metadata === 'object' && fm.metadata[key] !== undefined) {
    return fm.metadata[key];
  }
  return fm[key];
}

/**
 * The keys a caller requires, as a list of the ones that are missing or blank.
 *
 * A key that is present but empty (`description:`) is MISSING for every purpose that matters: a
 * native loader reads the description to decide when to activate the skill, and an empty string
 * activates nothing. Treating `''` as satisfied is how a skill ends up permanently unloadable while
 * every check reports green.
 *
 * @param {Record<string, string|string[]>|null} fm
 * @param {string[]} keys
 * @returns {string[]}
 */
function missingKeys(fm, keys) {
  if (!fm) return keys.slice();
  return keys.filter((key) => {
    const value = meta(fm, key);
    if (Array.isArray(value)) return value.length === 0;
    return value === undefined || String(value).trim() === '';
  });
}

/**
 * A front-matter value as a list of non-empty strings.
 *
 * The Agent Skills standard's `metadata:` block holds string values, so a list is written
 * comma-separated (`tags: skill, review`) and split back here; an inline `[a, b]` sequence — the
 * shape a legacy flat skill still uses — is already an array and passes through.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
function asList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

module.exports = { parseFrontMatter, missingKeys, meta, scalarValue, asList };
