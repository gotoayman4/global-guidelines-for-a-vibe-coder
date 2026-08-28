#!/usr/bin/env node

/**
 * render-agents-starter.js — Renders AGENTS.starter.md from single-source fragments.
 *
 * The starter's sections live in global-configs/fragments/*.md (one markdown section
 * per file, order defined in fragments/manifest.json). This script concatenates them
 * into global-configs/templates/AGENTS.starter.md. Edit rules in the fragments —
 * the template is generated output and must never be hand-edited.
 *
 * Usage:
 *   node render-agents-starter.js            # render templates/AGENTS.starter.md
 *   node render-agents-starter.js --check    # exit 1 if the template drifted from fragments
 *
 * The --check mode compares EOL-normalized content so it is stable across
 * autocrlf settings. It also enforces the token budget from manifest.json
 * (estimated at chars/4) so the always-loaded file cannot silently bloat.
 *
 * Exit codes: 0 = rendered / in sync; 1 = drift, budget exceeded, or missing fragment.
 *
 * Source: global-configs/scripts/render-agents-starter.js
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const FRAGMENTS_DIR = path.resolve(SCRIPT_DIR, '..', 'fragments');
const checkOnly = process.argv.includes('--check');

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function readManifest() {
  const manifestPath = path.join(FRAGMENTS_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) fail(`manifest.json not found at ${manifestPath}`);
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    fail(`manifest.json is not valid JSON: ${err.message}`);
  }
}

function render(manifest) {
  const chunks = [];
  for (const section of manifest.sections) {
    const fragmentPath = path.join(FRAGMENTS_DIR, section);
    if (!fs.existsSync(fragmentPath)) fail(`fragment missing: ${section} (listed in manifest.json)`);
    const raw = fs.readFileSync(fragmentPath, 'utf8').replace(/\r\n/g, '\n');
    chunks.push(raw.replace(/\n+$/, ''));
  }
  return chunks.join('\n\n') + '\n';
}

const manifest = readManifest();
const rendered = render(manifest);

const outputPath = path.resolve(FRAGMENTS_DIR, manifest.output);
const tokens = Math.ceil(rendered.length / 4);

if (checkOnly) {
  if (!fs.existsSync(outputPath)) {
    fail(`generated template missing: ${manifest.output} — run "npm run render:starters"`);
  }
  const onDisk = fs.readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n');
  if (onDisk !== rendered) {
    fail(
      'templates/AGENTS.starter.md has drifted from fragments — hand-edits are not allowed. ' +
      'Fix the rule in global-configs/fragments/ and run "npm run render:starters".'
    );
  }
  if (tokens > manifest.maxTokens) {
    fail(`token budget exceeded: ~${tokens} tokens > budget ${manifest.maxTokens}. Retire or demote rules instead of adding.`);
  }
  console.log(`✅ templates/AGENTS.starter.md in sync with fragments (~${tokens} / ${manifest.maxTokens} tokens, ${manifest.sections.length} sections)`);
} else {
  fs.writeFileSync(outputPath, rendered);
  const budgetNote = tokens > manifest.maxTokens
    ? ` — ⚠️ OVER BUDGET: ~${tokens} / ${manifest.maxTokens} tokens (npm run check-drift will fail)`
    : ` (~${tokens} / ${manifest.maxTokens} tokens)`;
  console.log(`✅ rendered ${manifest.sections.length} sections → templates/AGENTS.starter.md${budgetNote}`);
}
