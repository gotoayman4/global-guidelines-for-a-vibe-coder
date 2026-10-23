#!/usr/bin/env node

/**
 * project-mode.js — Read a project's declared workflow mode from `WORLD.md` §Speed Mode.
 *
 * INTENT: the mode is declared once, in `WORLD.md` (`speed-tiered-workflow.md` §Mode
 * Declaration), and read by every instrument that behaves differently per mode:
 * `slice-close.js` records it in the changelog entry, `measure-boot-budget.js` resolves
 * the context cap from it, `check-doc-breadth.js` applies its breadth, and `read-mode.js`
 * is what a project's pre-push hook calls. One reader, one shape — a second copy drifts,
 * and the drift is invisible because both copies would still look right. Three copies
 * existed; they disagreed on three of four shapes of declaration (measured 2026-10-23),
 * and the only correct one lived in a downstream repository that this repo never shipped.
 *
 * THE SHAPE, AND WHY EACH PART IS EARNED. The declaration is a list item inside the
 * `## Speed Mode` section, with the value in BACKTICKS: `- **mode:** \`vibe\``.
 *   - the SECTION, because the mode is a project-level fact and the section is where a
 *     project keeps its project-level facts. A mode line in an unrelated section is prose
 *     that happens to contain a word.
 *   - the LIST ITEM, because the declaration is a field, not a sentence. Matching prose
 *     would let "the mode scales what a session reads" decide the gate.
 *   - the BACKTICKS, because a bare word is an English word. `- **mode:** vibe is the fast
 *     track` must not read as a declaration of `vibe`.
 *
 * A file that declares its mode in any other shape reads as UNDECLARED, which resolves to
 * `standard` — the safe wrong answer, never a silent loosening.
 *
 * TWO ANSWERS, ON PURPOSE. `deriveMode` resolves the fallback and always returns a mode,
 * because a caller that needs a mode to act on must never be handed `undefined`.
 * `readMode` reports what was actually DECLARED, because a caller that must fail safe —
 * a pre-push hook, where an unreadable declaration must cost the full chain — has to tell
 * "declared standard" from "nothing declared".
 *
 * Source: global-configs/scripts/lib/project-mode.js
 */

const fs = require('fs');
const path = require('path');

/** The modes `speed-tiered-workflow.md` defines. */
const MODES = ['vibe', 'standard', 'guarded'];

/** The section that owns the declaration. */
const SECTION = /^##\s+Speed Mode\b/m;

/** The declaration itself: a list item, the field name, and a BACKTICKED value. */
const DECL = /^[ \t]*[-*][ \t]+\*\*mode:\*\*[ \t]*`([a-z]+)`/m;

/**
 * A mode-shaped line ANYWHERE in the file — used only to explain a rejection.
 *
 * A declaration in the wrong place must say so. "WORLD.md declares no mode" sent to a
 * project that plainly wrote one is a diagnostic that sends the operator looking in the
 * wrong file, and the mode stays silent — the project believes it is in `vibe` while its
 * gate runs `standard`.
 */
const MODE_SHAPED = /^[ \t]*[-*][ \t]+\*\*[^*]*mode:\*\*[ \t]*`?[a-z]+`?/m;

/**
 * The declared value, whatever it is — including a value that is not a mode.
 *
 * The value is read separately from the mode so that `WORLD.md` declaring `turbo` can be
 * REPORTED as `turbo`, rather than being flattened into "no declaration" and leaving the
 * operator with a project that silently runs `standard` and a message that says nothing
 * was declared.
 *
 * @param {string} worldText the whole text of `WORLD.md`
 * @returns {string|null}
 */
function parseValue(worldText) {
  const text = String(worldText || '');
  if (!SECTION.test(text)) return null;
  // The declaration is read from the Speed Mode section only. The section runs until the
  // next `## ` heading, so a `- **mode:**` line in a later section cannot be mistaken for
  // it — and a mode line BEFORE the section is not a declaration either.
  const start = text.search(SECTION);
  const body = text.slice(start);
  const next = body.slice(body.indexOf('\n')).search(/^##\s/m);
  const section = next === -1 ? body : body.slice(0, body.indexOf('\n') + next);
  const match = section.match(DECL);
  return match ? match[1] : null;
}

/**
 * The mode a `WORLD.md` declares, or null when it declares none or declares a non-mode.
 *
 * @param {string} worldText the whole text of `WORLD.md`
 * @returns {'vibe'|'standard'|'guarded'|null}
 */
function parseMode(worldText) {
  const value = parseValue(worldText);
  return value && MODES.includes(value) ? value : null;
}

/**
 * What the project declared, and whether it declared anything.
 *
 * @param {string} root project root
 * @returns {{mode: string|null, declared: boolean, value: string|null, reason: string}}
 */
function readMode(root) {
  const abs = path.join(root, 'WORLD.md');
  if (!fs.existsSync(abs)) {
    return { mode: null, declared: false, value: null, reason: 'WORLD.md is absent — there is no declaration to read' };
  }
  let text = '';
  try {
    text = fs.readFileSync(abs, 'utf8');
  } catch (err) {
    return { mode: null, declared: false, value: null, reason: `WORLD.md could not be read (${err.message})` };
  }
  const value = parseValue(text);
  if (!value) {
    // A mode-shaped line in the wrong place is a different fault from no line at all, and
    // the two need different fixes. Say which one this is.
    const stray = text.match(MODE_SHAPED);
    return {
      mode: null,
      declared: false,
      value: null,
      reason: stray
        ? `WORLD.md carries a mode-shaped line outside §Speed Mode ("${stray[0].trim()}") — the declaration must be a list item inside that section`
        : 'WORLD.md §Speed Mode declares no `- **mode:** `vibe|standard|guarded` value',
    };
  }
  if (!MODES.includes(value)) {
    return {
      mode: null,
      declared: false,
      value,
      reason: `WORLD.md §Speed Mode declares \`${value}\`, which is not one of ${MODES.join(' / ')}`,
    };
  }
  return { mode: value, declared: true, value, reason: '' };
}

/**
 * The project's mode, with `standard` as the fallback for a project that declares none.
 *
 * @param {string} root project root
 * @returns {'vibe'|'standard'|'guarded'}
 */
function deriveMode(root) {
  const { mode } = readMode(root);
  return mode || 'standard';
}

module.exports = { parseValue, parseMode, readMode, deriveMode, MODES };
