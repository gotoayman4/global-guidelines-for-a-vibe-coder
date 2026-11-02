#!/usr/bin/env node

/**
 * capabilities.js — Read a project's declared capabilities from `WORLD.md` §Capabilities.
 *
 * INTENT: the always-loaded constitution paid for rules the project never needed — RTL for a CLI,
 * CORS for a library, design heuristics for a worker. A capability is a one-word fact about what the
 * project IS (`web-ui`, `api`, `database`, `uploads`, `bilingual`); the sync includes an optional
 * constitution module only when the project declares a capability that module requires.
 *
 * THE SHAPE mirrors `project-mode.js` for the same reasons: a list item inside the `## Capabilities`
 * section, with the value in BACKTICKS — `- **capabilities:** \`web-ui, api, bilingual\``.
 *
 * UNDECLARED = EVERYTHING. A project that declares nothing (or only unknown words) gets every module,
 * which is today's behaviour. The safe wrong answer is more rules, never silently fewer. `none`
 * declares an explicit empty set: only the universal core applies.
 *
 * Source: global-configs/scripts/lib/capabilities.js
 */

const fs = require('fs');
const path = require('path');

const CAPABILITIES = ['web-ui', 'api', 'database', 'uploads', 'bilingual'];

const SECTION = /^##\s+Capabilities\b/m;
const DECL = /^[ \t]*[-*][ \t]+\*\*capabilities:\*\*[ \t]*`([^`\n]*)`/m;

/**
 * @param {string} worldText the whole text of `WORLD.md`
 * @returns {{declared: boolean, values: string[], unknown: string[]}}
 */
function parseCapabilities(worldText) {
  const text = String(worldText || '').replace(/\r\n/g, '\n');
  const empty = { declared: false, values: [], unknown: [] };
  const start = text.search(SECTION);
  if (start === -1) return empty;
  const body = text.slice(start);
  const firstNewline = body.indexOf('\n');
  const next = firstNewline === -1 ? -1 : body.slice(firstNewline).search(/^##\s/m);
  const section = next === -1 ? body : body.slice(0, firstNewline + next);
  const match = section.match(DECL);
  if (!match) return empty;

  const words = match[1].split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
  if (words.length === 1 && words[0] === 'none') return { declared: true, values: [], unknown: [] };
  const values = [...new Set(words.filter((w) => CAPABILITIES.includes(w)))];
  const unknown = words.filter((w) => !CAPABILITIES.includes(w) && w !== 'none');
  return { declared: values.length > 0, values: values, unknown };
}

/**
 * @param {string} root project root
 * @returns {{declared: boolean, values: string[], unknown: string[]}}
 */
function readCapabilities(root) {
  const abs = path.join(root, 'WORLD.md');
  if (!fs.existsSync(abs)) return { declared: false, values: [], unknown: [] };
  try {
    return parseCapabilities(fs.readFileSync(abs, 'utf8'));
  } catch {
    return { declared: false, values: [], unknown: [] };
  }
}

module.exports = { parseCapabilities, readCapabilities, CAPABILITIES };
