#!/usr/bin/env node

/**
 * context-caps.js — the per-mode reading caps, read from the file that owns them.
 *
 * INTENT: `01-workflow-methodology/speed-tiered-workflow.md` §The Context Budget declares
 * `vibe ≤40K · standard ≤90K · guarded ≤160K`. Two instruments need those numbers —
 * `measure-boot-budget.js` to fail a chain that has outgrown its cap, `audit-friction.js`
 * to name the cap it is comparing against. One reader, because a second copy drifts and
 * the drift is invisible: both copies keep looking right.
 *
 * DECISION: resolved from THIS FILE's location — `__dirname/../../..` is the mirror root,
 * which is `<central>/guidelines` centrally and `<project>/_guidelines` downstream. A
 * path computed against a repo root (`__dirname/../../../guidelines`) resolves to
 * `<project>/guidelines`, which does not exist, and the reader then returns nulls in
 * silence. That is exactly how `audit:friction` came to report "no cap found to compare
 * against" in **every** project that consumed it while the gate stayed green.
 *
 * CAVEAT: a null cap is not "no cap exists" — it is "the owner file could not be read".
 * Callers must say which, or a missing mirror reads as an absent budget.
 *
 * Source: global-configs/scripts/lib/context-caps.js
 */

const fs = require('fs');
const path = require('path');

/** The file that owns the numbers. Resolved from the mirror, so it works downstream too. */
// Three levels up from `lib/`: lib → scripts → global-configs → the mirror root.
const OWNER = path.join(__dirname, '..', '..', '..', '01-workflow-methodology', 'speed-tiered-workflow.md');

/** The mode-matrix row that carries the three caps. */
const CONTEXT_ROW = /^\|\s*\*\*Context\*\*/;

/** `{ vibe, standard, guarded }` in tokens; each is `null` when the owner file is unreadable. */
function contextCaps() {
  const caps = { vibe: null, standard: null, guarded: null };
  if (!fs.existsSync(OWNER)) return caps;
  const row = fs.readFileSync(OWNER, 'utf8').split('\n').find((line) => CONTEXT_ROW.test(line));
  if (!row) return caps;
  const found = [...row.matchAll(/≤\s*(\d+)K/g)].map((match) => Number(match[1]) * 1000);
  if (found.length === 3) [caps.vibe, caps.standard, caps.guarded] = found;
  return caps;
}

module.exports = { contextCaps, OWNER };
