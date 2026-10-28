#!/usr/bin/env node

/**
 * render-index.js — Generates the index tables and the cross-reference graph.
 *
 * INTENT: MASTER_INDEX.md must not be hand-maintained. This script reads each
 * guideline file's YAML front-matter (status/scope/tags) and its `## Cross-References`
 * footer, computes the token estimate (chars/4, the same formula as
 * render-agents-starter.js), and rewrites the regions between the GENERATED markers
 * in _index/MASTER_INDEX.md. Hand-authored prose (purpose, loading note, lifecycle
 * states, task routing) lives outside the markers and is never touched.
 *
 * CONSTRAINT: only two facts are derived here — the metadata the file already declares
 * (front-matter) and the edges the file already types (its Cross-References footer).
 * Nothing is invented, and no date is stored: `Last Updated` is answered by
 * `git log -1 --format=%ad --date=short -- <file>`, which cannot go stale.
 *
 * DECISION: token counts are NOT in the front-matter (they were a hand-typed field
 * before). A number a human maintains is a number that is wrong; chars/4 recomputed on
 * every render is right by construction.
 *
 * Usage:
 *   node render-index.js            # rewrite MASTER_INDEX.md
 *   node render-index.js --check    # exit 1 if MASTER_INDEX.md has drifted
 *
 * Exit codes: 0 = rendered / in sync; 1 = drift or missing input.
 *
 * Source: global-configs/scripts/render-index.js
 */

const fs = require('fs');
const path = require('path');
const { parseFrontMatter, meta, asList } = require('./lib/front-matter.js');
const { listSkills } = require('./lib/skill-files.js');
// The scope reader the SELECTOR uses. The table must not re-derive applicability on its own: a
// second derivation would drift from the rule that actually decides which skills a project gets.
const { skillScope } = require('./lib/plan-skills.js');

const SCRIPT_DIR = __dirname;
const GUIDELINES = path.resolve(SCRIPT_DIR, '..', '..');
const INDEX_PATH = path.join(GUIDELINES, '_index', 'MASTER_INDEX.md');
const SKILLS_DIR = path.join(GUIDELINES, 'global-configs', 'skills');

const MARKER_TABLES = 'GENERATED:index-tables';
const MARKER_SKILLS = 'GENERATED:index-skills';
const MARKER_GRAPH = 'GENERATED:index-graph';
const BEGIN = (id) => `<!-- ${id} — run \`npm run render:index\` -->`;
const END = '<!-- /GENERATED -->';

/** Presentation labels for the domain directories (the dir name is the id). */
const CATEGORY_LABELS = {
  '00-ai-fundamentals': '00 — AI Fundamentals',
  '01-workflow-methodology': '01 — Workflow Methodology',
  '02-engineering-practices': '02 — Engineering Practices',
  '03-git-and-ci': '03 — Git & CI/CD',
  '04-architecture': '04 — Architecture',
  '05-stack-guides': '05 — Stack Guides',
  '06-frontend-patterns': '06 — Frontend Patterns',
  '07-documentation': '07 — Documentation',
  '08-governance': '08 — Governance',
};

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

/**
 * Minimal YAML front-matter reader — the shared one. It used to be a private copy here, which the
 * `front-matter.js` docblock already names as the drift it exists to prevent; keeping the copy is
 * how a skill's `metadata:` block would parse in one reader and vanish in the other.
 */
const tokensOf = (text) => Math.ceil(text.length / 4);

/** Relative link from _index/ to a file under guidelines/. */
const linkFrom = (abs) => `../${path.relative(GUIDELINES, abs).replace(/\\/g, '/')}`;

const tagCell = (tags) => (tags && tags.length ? tags.map((t) => `\`#${t}\``).join(' ') : '—');

function row(abs, fm, display = path.basename(abs)) {
  return `| [${display}](${linkFrom(abs)}) | ${meta(fm, 'status')} | ${meta(fm, 'scope')} | ~${tokensOf(fs.readFileSync(abs, 'utf8'))} | ${tagCell(asList(meta(fm, 'tags')))} |`;
}

const TABLE_HEADER = ['| File | Status | Scope | Tokens | Tags |', '|---|---|---|---|---|'];

function collect() {
  const categories = [];
  for (const dir of Object.keys(CATEGORY_LABELS)) {
    const dirPath = path.join(GUIDELINES, dir);
    if (!fs.existsSync(dirPath)) continue;
    const files = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.md')) files.push(p);
      }
    };
    walk(dirPath);
    const entries = files.map((f) => ({ abs: f, fm: parseFrontMatter(fs.readFileSync(f, 'utf8')) }));
    const bad = entries.filter((e) => !e.fm || !e.fm.status || !e.fm.scope);
    if (bad.length) fail(`front-matter missing status/scope in: ${bad.map((b) => path.relative(GUIDELINES, b.abs)).join(', ')}`);
    categories.push({ dir, label: CATEGORY_LABELS[dir], entries });
  }
  if (categories.length === 0) fail('no guideline category directories found — corpus is empty');

  const skills = listSkills(SKILLS_DIR).map((s) => ({
    abs: s.abs,
    display: s.file,
    fm: parseFrontMatter(fs.readFileSync(s.abs, 'utf8')),
  }));
  const badSkills = skills.filter((s) => !s.fm || !meta(s.fm, 'status') || !meta(s.fm, 'scope'));
  if (badSkills.length) fail(`skill front-matter missing status/scope in: ${badSkills.map((b) => b.display).join(', ')}`);

  return { categories, skills };
}

/** Typed edges from a file's `## Cross-References` footer. */
function parseCrossRefs(text) {
  const match = text.match(/^## Cross-References\b[\s\S]*$/m);
  if (!match) return [];
  const body = match[0];
  const out = [];
  const bullet = /^[-*]\s+\*\*([^*]+?):\*\*\s*(.*)$/gm;
  let b;
  while ((b = bullet.exec(body)) !== null) {
    const names = [...b[2].matchAll(/`([^`]+\.md)`/g)].map((x) => x[1]);
    if (names.length) out.push({ rel: b[1].trim().toLowerCase(), names });
  }
  if (out.length === 0) {
    const names = [...body.matchAll(/`([^`]+\.md)`/g)].map((x) => x[1]);
    if (names.length) out.push({ rel: 'see also', names });
  }
  return out;
}

function renderTables(categories) {
  const lines = [];
  for (const c of categories) {
    lines.push(`### ${c.label}`, '', ...TABLE_HEADER);
    for (const e of c.entries) lines.push(row(e.abs, e.fm));
    lines.push('');
  }
  return lines.join('\n').replace(/\n+$/, '');
}

/**
 * The skills table row.
 *
 * WHY IT IS NOT THE GUIDELINE ROW. The guideline table's columns are `File | Status | Scope | Tokens |
 * Tags`, and a skill's `scope` says which projects the skill ASSUMES — not which skills a given
 * project receives. That distinction was load-bearing and invisible: the table is inside the
 * `_guidelines/` mirror, and every delivered tool config at the time (Cursor, Windsurf, Trae, Gemini,
 * Qoder, Kilo) pointed the agent at `_guidelines/_index/MASTER_INDEX.md`. Measured 2026-10-19: an agent
 * working in a MUI project could follow that table straight to `rtl-shadcn-setup`,
 * `shadcn-design-system` and `tiptap-tailwind-reset` — the three skills `plan-skills.js` excludes
 * from that project precisely because they contradict its constitution. The filter was real, and the
 * table that outranked it had no applicability column to check. The tool configs now name
 * `AGENTS.md` as the entry point, but the index is still reachable from `AGENTS.md`, so the column
 * remains the fix.
 *
 * So the skills table carries `Applies to`, read through `skillScope()` — the SAME function
 * `plan-skills.js` decides with, not a private re-read of `appliesTo`. That distinction is load-
 * bearing: only one skill in the corpus declares `appliesTo`, and the selector infers the rest from
 * their `tags`. A table that read `appliesTo` directly would print `—` for `rtl-shadcn-setup` —
 * the very skill a MUI project must not load — and tell the agent "no stack declared" about the
 * one row whose applicability matters most. An inferred scope is marked `(inferred)` so the reader
 * can see which rows are declared and which the selector derived.
 *
 * @param {string} abs the skill's `SKILL.md`
 * @param {object} fm its parsed front-matter
 * @param {string} display the link label
 */
function skillRow(abs, fm, display) {
  const scope = skillScope(fm);
  const applies = scope.tokens.length
    ? scope.tokens.map((t) => `\`${t}\``).join(' ') + (scope.declared ? '' : ' (inferred)')
    : '— *stack-agnostic*';
  return `| [${display}](${linkFrom(abs)}) | ${meta(fm, 'status')} | ${meta(fm, 'scope')} | ${applies} | ~${tokensOf(fs.readFileSync(abs, 'utf8'))} | ${tagCell(asList(meta(fm, 'tags')))} |`;
}

const SKILLS_TABLE_HEADER = ['| File | Status | Scope | Applies to | Tokens | Tags |', '|---|---|---|---|---|---|'];

/**
 * The banner above the skills table.
 *
 * It says three things an agent needs before it opens anything: this table is the UPSTREAM CORPUS,
 * a project receives a filtered subset of it, and the project's own `AGENTS.md` `## Skills` block is
 * the authoritative inventory for that project.
 */
const SKILLS_TABLE_BANNER = [
  '> **This table is the upstream corpus, not a project\'s skill set.** A project receives only the',
  '> skills that fit its stack; the authoritative inventory for a project is the `## Skills` block in',
  '> its own `AGENTS.md`, which names every skill it was delivered and the trigger for each. A row',
  '> whose `Applies to` does not cover the project\'s stack is **not applicable** — skip it rather',
  '> than adapting it.',
  '',
].join('\n');

function renderSkills(skills) {
  return [
    '### Skills — Task-Activated',
    '',
    SKILLS_TABLE_BANNER,
    ...SKILLS_TABLE_HEADER,
    ...skills.map((s) => skillRow(s.abs, s.fm, s.display)),
  ].join('\n');
}

function renderGraph(categories) {
  const lines = [];
  for (const c of categories) {
    lines.push(`### ${c.dir}`);
    for (const e of c.entries) {
      const edges = parseCrossRefs(fs.readFileSync(e.abs, 'utf8'));
      const name = path.basename(e.abs);
      if (edges.length === 0) {
        lines.push(`- \`${name}\` → no cross-references`);
        continue;
      }
      // Emit basenames only: a footer's refs are relative to its own directory, which is
      // not _index/, so copying a path verbatim would produce a link that cannot resolve.
      // Merge duplicate relation labels (e.g. two "depends on:" bullets) into one clause.
      const grouped = new Map();
      for (const edge of edges) {
        const list = grouped.get(edge.rel) || [];
        for (const n of edge.names) {
          const base = n.split('/').pop();
          if (!list.includes(base)) list.push(base);
        }
        grouped.set(edge.rel, list);
      }
      const parts = [...grouped].map(([rel, names]) => `${rel}: ${names.map((n) => `\`${n}\``).join(', ')}`);
      lines.push(`- \`${name}\` → ${parts.join(' · ')}`);
    }
    lines.push('');
  }
  return lines.join('\n').replace(/\n+$/, '');
}

/** Replace the text between BEGIN(id) and END. Returns null if the marker is absent. */
function replaceRegion(doc, id, content) {
  const begin = BEGIN(id);
  const start = doc.indexOf(begin);
  if (start === -1) return null;
  const end = doc.indexOf(END, start);
  if (end === -1) return null;
  return `${doc.slice(0, start)}${begin}\n\n${content}\n\n${doc.slice(end)}`;
}

function renderIndex(doc, { categories, skills }) {
  const withTables = replaceRegion(doc, MARKER_TABLES, renderTables(categories));
  if (withTables === null) fail(`marker not found in MASTER_INDEX.md: ${MARKER_TABLES}`);
  const withSkills = replaceRegion(withTables, MARKER_SKILLS, renderSkills(skills));
  if (withSkills === null) fail(`marker not found in MASTER_INDEX.md: ${MARKER_SKILLS}`);
  const withGraph = replaceRegion(withSkills, MARKER_GRAPH, renderGraph(categories));
  if (withGraph === null) fail(`marker not found in MASTER_INDEX.md: ${MARKER_GRAPH}`);
  return withGraph;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  if (!fs.existsSync(INDEX_PATH)) fail(`MASTER_INDEX.md not found at ${INDEX_PATH}`);

  const model = collect();
  const onDisk = fs.readFileSync(INDEX_PATH, 'utf8');
  const rendered = renderIndex(onDisk, model);

  const fileCount = model.categories.reduce((n, c) => n + c.entries.length, 0) + model.skills.length;

  if (checkOnly) {
    if (onDisk.replace(/\r\n/g, '\n') !== rendered.replace(/\r\n/g, '\n')) {
      fail('MASTER_INDEX.md has drifted from the files — run "npm run render:index". Do not hand-edit inside the GENERATED markers.');
    }
    console.log(`✅ MASTER_INDEX.md in sync (${model.categories.length} categories, ${fileCount} files)`);
  } else {
    // Always emit LF: .gitattributes declares `*.md text eol=lf`, and a hand-edit that
    // introduced CRLF would otherwise leave the file with mixed line endings.
    fs.writeFileSync(INDEX_PATH, rendered.replace(/\r\n/g, '\n'), 'utf8');
    console.log(`✅ rendered MASTER_INDEX.md (${model.categories.length} categories, ${model.skills.length} skills, ${fileCount} files)`);
  }
}

if (require.main === module) main();

module.exports = { collect, parseFrontMatter, parseCrossRefs, renderTables, renderSkills, renderGraph, renderIndex, replaceRegion, tokensOf, BEGIN, END };
