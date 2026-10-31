#!/usr/bin/env node

/**
 * patch-tool-configs.js — Point an ALREADY-delivered AI-tool config at the project's `AGENTS.md`.
 *
 * INTENT: every delivered tool config (opencode.json, kilo.jsonc, GEMINI.md, the Cursor / Windsurf /
 * Trae / Qoder rule files) used to name `_guidelines/_index/MASTER_INDEX.md` or `RETRIEVAL_RULES.md`
 * as the project's entry point. But the `## Skills` inventory — the table that says WHEN to open each
 * skill — is injected into the project's own `AGENTS.md`, so an agent that boots from a tool config
 * never reaches the trigger inventory at all: the skills exist, and nothing tells the agent they
 * exist. Measured 2026-10-19 on the registered fleet: 6 of 7 projects were affected.
 *
 * A TEMPLATE EDIT ALONE CANNOT FIX IT. The tool configs are installed `create-if-missing`, so a
 * project that already has `opencode.json` keeps its old copy forever and a template change never
 * reaches it. This script is the step that reaches it: it patches the DELIVERED file in place.
 *
 * DECISION: the patch is MARKER-DELIMITED (markdown) or ARRAY-PREFIXED (json), and it never rewrites
 * project-authored text.
 *
 *   - markdown: a file that already carries the markers is REFRESHED in place — the region between
 *     the markers is replaced and nothing else in the file moves. A file without the markers gets
 *     the region inserted after its YAML front-matter, or at the very top when it has none.
 *   - json: the target's `instructions` array is made to BEGIN with the template's entries, in the
 *     template's order. Every other entry, and every other byte of the file, is left exactly as it
 *     is. A project that wrote its own instructions keeps them.
 *
 * A MISSING CONFIG IS CREATED (owner decision 2026-10-31). The manifest declares every entry
 * `mode: "create-if-missing"`, but creation used to be GUI-only (`Install-ToolConfigFile`) — a
 * project whose CLAUDE.md is gitignored and untracked (midad, 2026-10-31) has no file after a
 * fresh clone, and "ignored AND updated" needs the CLI to create it too. The CLI therefore creates
 * an absent target from its template, honouring the entry's `detect` gate (a config for a tool the
 * project does not use is not installed) and its `pathSubstitution` flag. This does not widen the
 * patch into an installer for every tool on every project: the detect gate keeps e.g. Cursor rules
 * off a project that has no `.cursor/`.
 *
 * The region text is read from the TEMPLATE, never restated here: the template is the single home
 * for the wording, and a second copy of it in this script would be a second home that drifts.
 *
 * CONSTRAINT: a STRICT-JSON target (`opencode.json`) is re-parsed with `JSON.parse` after the patch,
 * and the script exits 1 if the result does not parse. A silently broken `opencode.json` breaks the
 * user's editor, which is worse than a config that still points at the old index. A JSONC target
 * (`kilo.jsonc`) may carry comments, so it is read with a tolerant scan scoped to the
 * `"instructions"` array — no JSON5 parser is available, and adding a dependency is not an option.
 * A leading UTF-8 BOM is tolerated when parsing (it is an encoding signature, not JSON syntax, and
 * a delivered config in the wild carries one); the BOM itself is left in the file.
 *
 * The entries are compared with their separators normalised, because a delivered config carries
 * Windows separators where the template carries POSIX ones
 * (`_guidelines\_index\RETRIEVAL_RULES.md` against `_guidelines/_index/RETRIEVAL_RULES.md`). That
 * is the same entry written by an older sync, not a project-authored instruction, and the canonical
 * spelling is the template's.
 *
 * IDEMPOTENT: a second run reports "unchanged" and writes nothing, so a re-sync does not churn a
 * project's config files.
 *
 * Usage:
 *   node patch-tool-configs.js <projectRoot>            # write / refresh
 *   node patch-tool-configs.js <projectRoot> --check    # exit 1 if a change is due
 *   node patch-tool-configs.js <projectRoot> --quiet    # exit code only
 *
 * Exit codes: 0 = up to date (or written); 1 = `--check` found a change due, or a config could not
 *             be patched safely; 2 = usage error.
 *
 * `GUIDELINES_REPO_ROOT` overrides the repo the manifest and its templates are read from. It exists
 * so a test can drive this CLI against a fixture tree instead of the live one: a test that asserts
 * the live fleet passes only while that fleet is broken.
 *
 * Source: global-configs/scripts/patch-tool-configs.js
 */

const fs = require('fs');
const path = require('path');

/** The repo root — this file lives at `<repo>/guidelines/global-configs/scripts/`. */
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * The markers of the managed region. They name the writer, so a reader who finds them knows what
 * wrote the text and what will rewrite it.
 */
const BEGIN = '<!-- BEGIN generated:project-entrypoint — written by sync-guidelines.ps1, do not edit inside -->';
const END = '<!-- END generated:project-entrypoint -->';

const USAGE = 'Usage: node patch-tool-configs.js <projectRoot> [--check] [--quiet]';

/** The repo root the manifest and its templates are read from. */
function repoRoot() {
  const override = process.env.GUIDELINES_REPO_ROOT;
  return override ? path.resolve(override) : REPO_ROOT;
}

/** Where the manifest lives, relative to a repo root. */
function manifestPath(root) {
  return path.join(root, 'guidelines', 'global-configs', 'sync-manifest.json');
}

/**
 * The (template, target) pairs the sync delivers, read from the manifest — the single home for the
 * list. A hard-coded list here would be a second home, and the two would drift exactly where it
 * matters: on the tool a project added last.
 */
function toolConfigPairs(manifestFile) {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const configs = Array.isArray(manifest.toolConfigs) ? manifest.toolConfigs : [];
  return configs
    .filter((c) => c && typeof c.template === 'string' && typeof c.target === 'string')
    .map((c) => ({ template: c.template, target: c.target, mode: c.mode, detect: c.detect, pathSubstitution: c.pathSubstitution }));
}

/**
 * The substitution a delivered template carries: the absolute guidelines directory becomes the
 * project's relative mirror name, and the `{{GUIDELINES_ROOT}}` token expands to the absolute
 * guidelines directory — the same two rules `Install-ToolConfigFile` applies in the GUI, in the
 * same order, so a fallback reference is not clobbered into a relative path first.
 */
function substitutePaths(content, root) {
  const guidelinesDir = path.join(root, 'guidelines');
  return content
    .split(guidelinesDir).join('_guidelines')
    .split('{{GUIDELINES_ROOT}}').join(guidelinesDir);
}

/**
 * The template a manifest entry names. The manifest's paths are relative to the `guidelines/` tree;
 * a path relative to the repo root is accepted as a fallback so either convention resolves.
 *
 * @returns {string|null} the path, or null when no candidate exists on disk.
 */
function resolveTemplate(root, templateRel) {
  const candidates = [
    path.join(root, 'guidelines', templateRel),
    path.join(root, templateRel),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const isMarkdown = (target) => /\.(md|mdc)$/i.test(target);
const isJson = (target) => /\.(json|jsonc)$/i.test(target);
/** A STRICT-JSON target (`.json`) must stay parseable; a `.jsonc` one may carry comments. */
const isStrictJson = (target) => /\.json$/i.test(target);

/**
 * Parse a JSON document, tolerating a leading UTF-8 BOM. The mark is an encoding signature, not
 * JSON syntax: `JSON.parse` rejects it, but the tools that read the file do not, and a delivered
 * config in the wild carries one. The BOM stays in the file — the patch changes the array and
 * nothing else.
 */
function parseJson(text) {
  return JSON.parse(text.replace(/^\uFEFF/, ''));
}


/**
 * The managed region of a template — the marker block, verbatim. `null` when the template carries no
 * region, which is a broken template: there is nothing to install.
 */
function templateRegion(text) {
  const start = text.indexOf(BEGIN);
  if (start === -1) return null;
  const end = text.indexOf(END, start);
  if (end === -1) return null;
  return text.slice(start, end + END.length).replace(/\r\n/g, '\n');
}

/**
 * The `instructions` entries of a template, read with a tolerant scan. The template may be JSONC
 * (comments), and no JSON5 parser is available here.
 */
function templateInstructions(text) {
  const span = findInstructions(text);
  return span ? parseEntries(span.inner) : [];
}

/** The index of the `]` that closes the `[` at `openIndex`, or -1. String-aware. */
function matchBracket(text, openIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * The `"instructions"` array of a JSON or JSONC document: its span and its inner text. The key is
 * recognised in an object position, so a string value that happens to mention the word is not
 * mistaken for the key.
 */
function findInstructions(text) {
  const key = /(^|[{,\n])[ \t]*"instructions"\s*:\s*\[/g;
  let match;
  while ((match = key.exec(text)) !== null) {
    const open = match.index + match[0].length - 1;
    const close = matchBracket(text, open);
    if (close === -1) return null;
    return { open, close, inner: text.slice(open + 1, close) };
  }
  return null;
}

/** The string literals of an array's inner text, unescaped. */
function parseEntries(inner) {
  const entries = [];
  const literal = /"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = literal.exec(inner)) !== null) entries.push(JSON.parse(`"${match[1]}"`));
  return entries;
}

/**
 * Whether two instruction entries name the same file. The separators are compared loosely, because a
 * delivered config carries Windows separators where the template carries POSIX ones
 * (`_guidelines\_index\RETRIEVAL_RULES.md` against `_guidelines/_index/RETRIEVAL_RULES.md`) — the
 * same entry written by an older sync, not a project-authored instruction of its own. The canonical
 * spelling is the template's.
 */
function sameEntry(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  return a.replace(/\\/g, '/') === b.replace(/\\/g, '/');
}

/**
 * The YAML front-matter of a document, as the offset just after its closing marker. `null` when the
 * document has none — an unterminated block is not front-matter, and guessing where it ends is how a
 * region lands inside a block it does not belong to.
 */
function frontMatterSpan(text) {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i++) {
    const marker = lines[i].trim();
    if (marker === '---' || marker === '...') {
      return { start: 0, end: lines.slice(0, i + 1).join('\n').length + 1 };
    }
  }
  return null;
}

/**
 * Normalise a region so two versions can be compared for SUBSTANCE rather than for layout.
 *
 * WHY THIS EXISTS. Four of the seven registered projects run prettier over their markdown in a
 * pre-commit hook, and prettier adds a blank line after an HTML comment — which is exactly where
 * the BEGIN marker sits. The formatter therefore rewrote the region the sync had just written,
 * the next sync removed the blank line again, and every cycle left a dirty tree for a change
 * nobody made. Comparing the two NORMALISED forms settles it: a region that differs only in
 * blank lines and indentation is the same region, so the file is left as the formatter left it.
 *
 * A real edit — different wording, a different rule — still differs, so the check never swallows
 * a genuine change.
 */
function normalizeRegion(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n');
}

/**
 * Apply the managed region to a document.
 *
 * @returns {{content: string, action: 'refreshed'|'inserted'|'unchanged'|'kept', reason?: string}}
 */
function applyRegion(doc, region) {
  const eol = doc.includes('\r\n') ? '\r\n' : '\n';
  const lf = doc.replace(/\r\n/g, '\n');

  const start = lf.indexOf(BEGIN);
  if (start !== -1) {
    const end = lf.indexOf(END, start);
    if (end === -1) {
      // Half-marked: a BEGIN with no END. A second region would give the file two entry points, so
      // the file is left alone and reported rather than guessed at.
      return { content: doc, action: 'kept', reason: 'the BEGIN marker has no END marker' };
    }
    const current = lf.slice(start, end + END.length);
    const next = lf.slice(0, start) + region + lf.slice(end + END.length);
    if (next === lf) return { content: doc, action: 'unchanged' };
    // A formatter may have re-laid-out the region. That is a layout change, not a change to the
    // rule, and rewriting it would make every sync dirty the tree of a project whose pre-commit
    // hook runs a markdown formatter. The file keeps the formatter's layout.
    if (normalizeRegion(next) === normalizeRegion(lf)) return { content: doc, action: 'unchanged' };
    return { content: next.replace(/\n/g, eol), action: 'refreshed' };
  }

  const frontMatter = frontMatterSpan(lf);
  const head = frontMatter ? lf.slice(0, frontMatter.end) : '';
  const rest = (frontMatter ? lf.slice(frontMatter.end) : lf).replace(/^\n+/, '');
  const body = rest ? `\n\n${rest}` : '\n';
  const next = head ? `${head}\n${region}${body}` : `${region}${body}`;
  if (next === lf) return { content: doc, action: 'unchanged' };
  return { content: next.replace(/\n/g, eol), action: 'inserted' };
}

/** The array text, re-rendered with the indentation the file already uses. */
function renderArray(entries, doc, span) {
  const lineStart = doc.lastIndexOf('\n', span.open) + 1;
  const lineIndent = (doc.slice(lineStart, span.open).match(/^[ \t]*/) || [''])[0];
  const inner = doc.slice(span.open + 1, span.close);
  const itemLine = inner.split('\n').find((line) => /^[ \t]*"[^"]*"\s*,?$/.test(line));
  const itemIndent = itemLine ? (itemLine.match(/^[ \t]*/) || [''])[0] : `${lineIndent}  `;
  const body = entries.map((entry) => `${itemIndent}${JSON.stringify(entry)}`).join(',\n');
  return `[\n${body}\n${lineIndent}]`;
}

/**
 * Make a document's `instructions` array begin with the desired entries, in their order.
 *
 * The entries the document already carries are kept; the ones it is missing are prepended. A
 * document that carries them in another order has them realigned to the front, because the point of
 * the array is what the agent reads FIRST.
 *
 * @returns {{content: string, action: 'aligned'|'unchanged'|'kept', reason?: string}}
 */
function applyInstructions(doc, desired) {
  const span = findInstructions(doc);
  if (!span) {
    return { content: doc, action: 'kept', reason: 'no "instructions" array to align' };
  }
  const current = parseEntries(span.inner);
  if (desired.every((entry, index) => sameEntry(current[index], entry))) {
    return { content: doc, action: 'unchanged' };
  }
  const next = desired.concat(current.filter((entry) => !desired.some((d) => sameEntry(d, entry))));
  const rendered = renderArray(next, doc, span);
  return {
    content: doc.slice(0, span.open) + rendered + doc.slice(span.close + 1),
    action: 'aligned',
  };
}

/**
 * Patch every tool config a project already has, from the templates the manifest names.
 *
 * @param {string} projectRoot
 * @param {{repoRoot?: string}} [options]
 * @returns {Array<{target: string, action: string, reason?: string, content?: string}>}
 */
function patchProject(projectRoot, options = {}) {
  const root = options.repoRoot ? path.resolve(options.repoRoot) : repoRoot();
  const pairs = toolConfigPairs(manifestPath(root));
  const results = [];

  for (const pair of pairs) {
    const targetPath = path.join(projectRoot, pair.target);

    if (!fs.existsSync(targetPath)) {
      // create-if-missing: the file a fresh clone lacks is created from its template — the same
      // thing `Install-ToolConfigFile` does in the GUI. The entry's `detect` gate still applies: a
      // config for a tool the project does not use is not installed, and an entry that does not
      // declare the mode keeps the old behaviour (absence is not brokenness, nothing to say).
      if (pair.mode !== 'create-if-missing') {
        results.push({ target: pair.target, action: 'absent' });
        continue;
      }
      if (pair.detect && !fs.existsSync(path.join(projectRoot, pair.detect))) {
        results.push({ target: pair.target, action: 'absent' });
        continue;
      }
      const templatePath = resolveTemplate(root, pair.template);
      if (!templatePath) {
        results.push({ target: pair.target, action: 'error', reason: `template not found: ${pair.template}` });
        continue;
      }
      let content = fs.readFileSync(templatePath, 'utf8');
      if (pair.pathSubstitution !== false) content = substitutePaths(content, root);
      results.push({ target: pair.target, action: 'created', content });
      continue;
    }

    const templatePath = resolveTemplate(root, pair.template);
    if (!templatePath) {
      results.push({ target: pair.target, action: 'error', reason: `template not found: ${pair.template}` });
      continue;
    }

    // The patch compares against what the sync DELIVERS, not the raw template: creation applies
    // the entry's path substitution, so a token inside a managed region must be expanded here too
    // — otherwise the first patch after a created file re-writes the raw token back over the
    // delivered path, and the two writers fight forever.
    const raw = fs.readFileSync(templatePath, 'utf8');
    const template = pair.pathSubstitution !== false ? substitutePaths(raw, root) : raw;
    const original = fs.readFileSync(targetPath, 'utf8');
    let outcome;

    if (isMarkdown(pair.target)) {
      const region = templateRegion(template);
      if (!region) {
        results.push({ target: pair.target, action: 'error', reason: 'the template carries no managed region' });
        continue;
      }
      outcome = applyRegion(original, region);
    } else if (isJson(pair.target)) {
      const desired = templateInstructions(template);
      if (!desired.length) {
        results.push({ target: pair.target, action: 'error', reason: 'the template declares no "instructions"' });
        continue;
      }
      if (isStrictJson(pair.target)) {
        try {
          parseJson(original);
        } catch (err) {
          results.push({ target: pair.target, action: 'error', reason: `not valid JSON — left untouched: ${err.message}` });
          continue;
        }
      }
      outcome = applyInstructions(original, desired);
      if (isStrictJson(pair.target) && outcome.action === 'aligned') {
        try {
          parseJson(outcome.content);
        } catch (err) {
          results.push({ target: pair.target, action: 'error', reason: `the patched file does not parse — left untouched: ${err.message}` });
          continue;
        }
      }
    } else {
      results.push({ target: pair.target, action: 'skipped', reason: 'unknown target family' });
      continue;
    }

    results.push({ target: pair.target, action: outcome.action, reason: outcome.reason, content: outcome.content });
  }

  return results;
}

function main() {
  const argv = process.argv.slice(2);
  const flags = argv.filter((arg) => arg.startsWith('--'));
  const unknown = flags.filter((flag) => !['--check', '--quiet'].includes(flag));
  if (unknown.length) {
    console.error(`❌ unknown flag ${unknown[0]}`);
    console.error(USAGE);
    process.exit(2);
  }
  const checkOnly = flags.includes('--check');
  const quiet = flags.includes('--quiet');

  const projectRoot = argv.find((arg) => !arg.startsWith('--'));
  if (!projectRoot) {
    console.error('❌ a project root is required');
    console.error(USAGE);
    process.exit(2);
  }
  if (!fs.existsSync(projectRoot)) {
    console.error(`❌ project root not found: ${projectRoot}`);
    console.error(USAGE);
    process.exit(2);
  }

  const name = path.basename(path.resolve(projectRoot));
  const results = patchProject(projectRoot);
  const failures = results.filter((r) => r.action === 'error');
  const kept = results.filter((r) => r.action === 'kept');
  const due = results.filter((r) => ['inserted', 'refreshed', 'aligned', 'created'].includes(r.action));

  for (const result of kept) {
    if (!quiet) console.log(`  ℹ️  ${name}: ${result.target} — left alone (${result.reason})`);
  }

  if (checkOnly) {
    for (const result of due) {
      const what = result.action === 'created' ? 'created (the file is missing — the sync makes it from its template)' : `needs ${result.action}`;
      console.error(`❌ ${name}: ${result.target} — ${what} — run the sync`);
    }
    if (due.length === 0 && !quiet) console.log(`  ✅ ${name}: the tool configs already point at AGENTS.md`);
  } else {
    for (const result of due) {
      fs.writeFileSync(path.join(projectRoot, result.target), result.content, 'utf8');
      if (!quiet) console.log(`  ✅ ${name}: ${result.target} — ${result.action}`);
    }
    if (due.length === 0 && !quiet) console.log(`  ✅ ${name}: the tool configs already point at AGENTS.md`);
  }

  for (const failure of failures) {
    console.error(`❌ ${name}: ${failure.target} — ${failure.reason}`);
  }

  if (failures.length) process.exit(1);
  if (checkOnly && due.length) process.exit(1);
  process.exit(0);
}

if (require.main === module) main();

module.exports = {
  applyInstructions,
  applyRegion,
  findInstructions,
  frontMatterSpan,
  matchBracket,
  normalizeRegion,
  parseEntries,
  patchProject,
  renderArray,
  resolveTemplate,
  substitutePaths,
  templateInstructions,
  templateRegion,
  toolConfigPairs,
  BEGIN,
  END,
  REPO_ROOT,
};
