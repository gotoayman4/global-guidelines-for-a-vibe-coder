#!/usr/bin/env node

/**
 * project-mode.js — Read a project's declared workflow mode from `WORLD.md`.
 *
 * INTENT: the mode is declared once, in `WORLD.md` (`speed-tiered-workflow.md` §Mode
 * Declaration), and read by every instrument that behaves differently per mode:
 * `slice-close.js` records it in the changelog entry, `measure-boot-budget.js` resolves
 * the context cap from it. Two readers, one regex — a second copy would drift, and the
 * drift would be invisible because both copies would still look right.
 *
 * DECISION: silent means `standard`, which is what the doctrine prescribes — never
 * `vibe`. A project that has not declared a mode must not silently receive the loosest
 * one, and a cap resolved from an undeclared mode is a cap nobody chose.
 *
 * CAVEAT: the match is anchored to a list item (`- **mode:** \`vibe\``), so prose that
 * merely mentions the word — "the mode scales what a session reads" — cannot be mistaken
 * for the declaration. A project that declares its mode in another shape reads as
 * `standard`; that is a safe wrong answer, not a silent loosening.
 *
 * Source: global-configs/scripts/lib/project-mode.js
 */

const fs = require('fs');
const path = require('path');

/** The declaration as `WORLD.md` writes it: a list item naming exactly one of the three modes. */
const MODE_RE = /^[-*]\s*\*\*mode:\*\*\s*`?([a-z]+)`?/m;

/** The modes `speed-tiered-workflow.md` defines. */
const MODES = ['vibe', 'standard', 'guarded'];

/** The project's declared mode, or `standard` when `WORLD.md` is absent or silent. */
function deriveMode(root) {
  const abs = path.join(root, 'WORLD.md');
  if (!fs.existsSync(abs)) return 'standard';
  const match = fs.readFileSync(abs, 'utf8').match(MODE_RE);
  return match ? match[1] : 'standard';
}

module.exports = { deriveMode, MODES };
