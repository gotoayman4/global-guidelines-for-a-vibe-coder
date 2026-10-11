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

/** Minimal YAML front-matter reader: scalars and inline `[a, b]` sequences. */
function parseFrontMatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const raw = kv[2].trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      fm[kv[1]] = raw.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (raw.startsWith('"') && raw.endsWith('"')) {
      fm[kv[1]] = raw.slice(1, -1);
    } else {
      fm[kv[1]] = raw;
    }
  }
  return fm;
}

const tokensOf = (text) => Math.ceil(text.length / 4);

/** Relative link from _index/ to a file under guidelines/. */
const linkFrom = (abs) => `../${path.relative(GUIDELINES, abs).replace(/\\/g, '/')}`;

const tagCell = (tags) => (tags && tags.length ? tags.map((t) => `\`#${t}\``).join(' ') : '—');

function row(abs, fm) {
  const name = path.basename(abs);
  return `| [${name}](${linkFrom(abs)}) | ${fm.status} | ${fm.scope} | ~${tokensOf(fs.readFileSync(abs, 'utf8'))} | ${tagCell(fm.tags)} |`;
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

  const skills = fs.readdirSync(SKILLS_DIR).filter((f) => f.endsWith('.skill.md')).sort()
    .map((f) => ({ abs: path.join(SKILLS_DIR, f), fm: parseFrontMatter(fs.readFileSync(path.join(SKILLS_DIR, f), 'utf8')) }));
  const badSkills = skills.filter((s) => !s.fm || !s.fm.status || !s.fm.scope);
  if (badSkills.length) fail(`skill front-matter missing status/scope in: ${badSkills.map((b) => path.basename(b.abs)).join(', ')}`);

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

function renderSkills(skills) {
  return ['### Skills — Task-Activated', '', ...TABLE_HEADER, ...skills.map((s) => row(s.abs, s.fm))].join('\n');
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
