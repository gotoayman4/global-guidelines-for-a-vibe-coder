#!/usr/bin/env node

/**
 * generate-path-rules.js — Deliver the capability modules as PATH-SCOPED rule files.
 *
 * INTENT: `AGENTS.md` loads on every turn. A rule about CSS, RTL or API pagination is dead weight while
 * the agent edits a migration. Claude Code (`.claude/rules/*.md` + `paths:`), Cursor (`.cursor/rules/*.mdc`
 * + `globs:`) and Copilot (`.github/instructions/*.instructions.md` + `applyTo:`) all load a rule file
 * only when a matching file is in play. This renders each gated fragment — the single source — into
 * those three native formats, so a project MAY run the module path-scoped instead of always-on.
 *
 * It only WRITES files it generated (marker line on the first body line) and prunes only those; a
 * hand-written rule file of the same name is reported and left alone. Modules come from the same
 * `requires` markers and the project's `WORLD.md` capabilities as the sync (undeclared = all).
 *
 * Usage:
 *   node generate-path-rules.js <projectRoot>           # dry run
 *   node generate-path-rules.js <projectRoot> --apply   # write
 *
 * Exit codes: 0 = ok; 2 = usage error.
 *
 * Source: global-configs/scripts/generate-path-rules.js
 */

const fs = require('fs');
const path = require('path');
const { readCapabilities } = require('./lib/capabilities.js');
const { stripSourceCitations } = require('./inject-constitution-block.js');

const FRAGMENTS = path.join(__dirname, '..', 'fragments');
const MARKER = '<!-- generated:path-rules — do not edit; regenerate with `npm run rules:paths` -->';
const REQUIRES = /^[ \t]*<!--[ \t]*requires:[ \t]*([a-z, -]+?)[ \t]*-->[ \t]*\n?/m;

const UI = ['**/*.tsx', '**/*.jsx', '**/*.vue', '**/*.svelte', '**/*.html'];
const STYLE = ['**/*.css', '**/*.scss'];
/** Where each gated fragment's rules matter. Fragment basename → globs. */
const GLOBS = {
  '12-security-web.md': [...UI, '**/api/**', '**/routes/**', '**/server/**', '**/upload*/**'],
  '42-api.md': ['**/api/**', '**/routes/**', '**/controllers/**', '**/server/**'],
  '45-frontend-architecture.md': [...UI, '**/components/**'],
  '50-design-ux.md': [...UI, ...STYLE],
  '70-rtl-arabic.md': [...UI, ...STYLE],
  '80-performance.md': [...UI, '**/api/**', '**/server/**'],
};

/** @returns {{file: string, slug: string, title: string, requires: string[], body: string, globs: string[]}[]} */
function loadModules(fragmentsDir = FRAGMENTS) {
  const out = [];
  for (const file of fs.readdirSync(fragmentsDir).sort()) {
    if (!GLOBS[file]) continue;
    const raw = fs.readFileSync(path.join(fragmentsDir, file), 'utf8').replace(/\r\n/g, '\n');
    const req = raw.match(REQUIRES);
    if (!req) continue;
    const title = (raw.match(/^##\s+(.+)$/m) || [, file])[1].trim();
    const body = stripSourceCitations(raw.replace(REQUIRES, '').replace(/^##\s+.+\n+/, '')).trim();
    out.push({
      file,
      slug: file.replace(/^\d+-/, '').replace(/\.md$/, ''),
      title,
      requires: req[1].split(',').map((s) => s.trim()).filter(Boolean),
      body,
      globs: GLOBS[file],
    });
  }
  return out;
}

function applicable(mod, caps) {
  if (!caps.declared) return true;
  return mod.requires.some((r) => caps.values.includes(r));
}

/** The three native renderings of one module: relative path → file text. */
function render(mod) {
  const heading = `# ${mod.title}\n\n${MARKER}\n\n${mod.body}\n`;
  const yamlList = mod.globs.map((g) => `  - "${g}"`).join('\n');
  return {
    [`.claude/rules/${mod.slug}.md`]: `---\npaths:\n${yamlList}\n---\n\n${heading}`,
    [`.cursor/rules/${mod.slug}.mdc`]: `---\ndescription: ${mod.title}\nglobs: ${mod.globs.join(',')}\nalwaysApply: false\n---\n\n${heading}`,
    [`.github/instructions/${mod.slug}.instructions.md`]: `---\napplyTo: "${mod.globs.join(',')}"\n---\n\n${heading}`,
  };
}

function isGenerated(abs) {
  try {
    return fs.readFileSync(abs, 'utf8').includes('generated:path-rules');
  } catch {
    return false;
  }
}

/**
 * @returns {{file: string, status: string}[]}
 */
function generate(projectRoot, { apply = false, fragmentsDir = FRAGMENTS } = {}) {
  const caps = readCapabilities(projectRoot);
  const mods = loadModules(fragmentsDir);
  const wanted = new Map();
  for (const m of mods.filter((x) => applicable(x, caps))) {
    for (const [rel, text] of Object.entries(render(m))) wanted.set(rel, text);
  }
  const actions = [];

  for (const [rel, text] of wanted) {
    const abs = path.join(projectRoot, rel);
    if (fs.existsSync(abs)) {
      if (!isGenerated(abs)) {
        actions.push({ file: rel, status: 'exists and is hand-written — left alone' });
        continue;
      }
      if (fs.readFileSync(abs, 'utf8') === text) {
        actions.push({ file: rel, status: 'up to date' });
        continue;
      }
    }
    actions.push({ file: rel, status: apply ? 'written' : 'would write' });
    if (apply) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, text, 'utf8');
    }
  }

  // Prune only what this tool generated and no longer applies (e.g. a capability was dropped).
  for (const dir of ['.claude/rules', '.cursor/rules', '.github/instructions']) {
    const absDir = path.join(projectRoot, dir);
    if (!fs.existsSync(absDir)) continue;
    for (const name of fs.readdirSync(absDir)) {
      const rel = `${dir}/${name}`;
      const abs = path.join(absDir, name);
      if (wanted.has(rel) || !isGenerated(abs)) continue;
      actions.push({ file: rel, status: apply ? 'removed (module no longer applies)' : 'would remove (module no longer applies)' });
      if (apply) fs.rmSync(abs);
    }
  }
  return actions;
}

function main() {
  const argv = process.argv.slice(2);
  const target = argv.find((a) => !a.startsWith('--'));
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
    console.error('Usage: node generate-path-rules.js <projectRoot> [--apply]');
    process.exit(2);
  }
  for (const a of generate(path.resolve(target), { apply: argv.includes('--apply') })) {
    console.log(`  ${a.file}: ${a.status}`);
  }
}

if (require.main === module) main();

module.exports = { generate, loadModules, render, applicable, GLOBS };
