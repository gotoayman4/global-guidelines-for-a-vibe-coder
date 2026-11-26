/**
 * skill-stores.js — the one home for writing a MARKER-SCOPED skill store.
 *
 * WHY THIS EXISTS. Two new delivery writers share one shape: the machine-global pool
 * (`sync-global-skills.js` → `~/.agents/skills`, `~/.claude/skills`, `~/.zcode/skills`) and the
 * project native adapter (`sync-project-adapters.js` → `<project>/.agents/skills`,
 * `<project>/.claude/skills`). Both write into a directory a native Agent Skills loader scans,
 * and BOTH directories can hold skills this sync does not own — `~/.agents/skills` on this machine
 * carries a user-installed `code-review` whose bytes are not the corpus's, and a project's
 * `.agents/skills` can carry skills the project wrote itself. A writer that "syncs" such a
 * directory by mirroring it would delete or overwrite work it did not write, which is exactly the
 * destructive act on an inference the drift guard refuses to commit (`check-sync-drift.js`
 * §competingStores: "report the collision by name; do not resolve it").
 *
 * THE CONTRACT IS THE MARKER. A store this sync owns carries a `.*-skill-sync.json` marker naming
 * the exact skill names the sync wrote and the source those bytes came from. Ownership is
 * per-NAME, never per-directory: the sync may create, refresh and prune only the names its own
 * marker lists (plus the names it is about to list), and every other skill in the store is
 * foreign — left byte-for-byte alone.
 *
 * THE CENTRAL REPO IS THE SOURCE OF TRUTH (owner decision, 2026-10-31). A planned skill whose
 * name already exists in the store as a foreign skill is OVERWRITTEN with the source bytes and
 * reported by name — a same-named downstream copy is either the corpus's own skill gone stale or
 * a name the corpus now owns, and in neither case does the older downstream byte win. A foreign
 * skill with a DIFFERENT name is still never touched: the corpus claims only the names it
 * delivers. A store with skills but NO marker is refused outright until the caller carries the
 * owner's recorded decision (`adopt`), because adopting it writes a marker nobody transferred.
 *
 * THE WRITTEN SHAPE IS THE STANDARD ONE: `<name>/SKILL.md` plus the whole payload
 * (`references/`, `scripts/`, `assets/`) — the same rule `plan-skills.js` §applyPlan applies to
 * `_skills/`, for the same reason: a skill whose on-demand files are missing is a table of
 * contents without chapters. Pruning mirrors the same rule: within an OWNED skill, a companion
 * the source no longer carries is removed; an owned skill the source no longer plans is removed
 * whole. Nothing else is ever unlinked.
 *
 * NOT a guard: no `@tier`. It materialises and verifies a derived value.
 *
 * Source: global-configs/scripts/lib/skill-stores.js
 */

const fs = require('fs');
const path = require('path');
const { SKILL_FILE, listSkills, skillPayload, listFiles } = require('./skill-files.js');

/** The marker files this sync recognises as its own, inside any store directory. */
const MARKER_RE = /^\..*-skill-sync\.json$/;

/**
 * The marker file name for a store, derived from the TOOL directory that owns it:
 * `<project>/.agents/skills` and `~/.agents/skills` both yield `.agents-skill-sync.json`.
 * The parent directory is the tool's identity (`.agents`, `.claude`, `.zcode`); the leaf is
 * always `skills`. A store whose parent is not a dotted tool directory falls back to the
 * store's own name, so the marker stays unique to the store either way.
 * @param {string} storeDir
 * @returns {string}
 */
function markerNameFor(storeDir) {
  const abs = path.resolve(storeDir);
  const parent = path.basename(path.dirname(abs));
  // `.agents` names the tool with a leading dot that is the HIDDEN-file marker, not part of the
  // identity — the template below adds the dot itself, so it is stripped here rather than doubled.
  const tool = (/^[\w.-]+$/.test(parent) && parent !== '' ? parent : path.basename(abs)).replace(/^\./, '');
  return `.${tool}-skill-sync.json`;
}

/**
 * The marker of a store, parsed and shape-checked. `null` when absent or unreadable — a marker
 * this sync cannot trust is treated exactly like no marker, because acting on a half-readable
 * ownership claim is how a foreign skill gets overwritten.
 * @param {string} storeDir
 * @returns {{names: string[], source: string}|null}
 */
function readMarker(storeDir) {
  const file = path.join(storeDir, markerNameFor(storeDir));
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(parsed.names) || typeof parsed.source !== 'string') return null;
    if (parsed.names.some((n) => typeof n !== 'string')) return null;
    return { names: parsed.names, source: parsed.source };
  } catch {
    return null;
  }
}

/**
 * Every skill name present in a store, in both layouts. Used to detect foreign skills and
 * name collisions; `listSkills` already tolerates the legacy flat file, which a half-migrated
 * store may still carry.
 * @param {string} storeDir
 * @returns {string[]}
 */
function storeSkillNames(storeDir) {
  return listSkills(storeDir).map((s) => s.name);
}

/** Byte equality after EOL normalisation — the rule `hashTree` and `compareSkills` apply. */
function sameContent(a, b) {
  const read = (p) => fs.readFileSync(p).toString('utf8').replace(/\r\n/g, '\n');
  return read(a) === read(b);
}

/**
 * Write (or preview) a marker-scoped store.
 *
 * ADOPTING A FOREIGN STORE. By default a store that holds skills but no marker is refused: it is
 * somebody else's work, and writing a marker over it would claim ownership nobody transferred.
 * `adopt: true` is the owner's recorded decision to deliver into it — the marker is written
 * claiming ONLY the names this sync delivers, foreign skills with different names keep their
 * bytes untouched, and a planned name that already exists as a foreign skill is OVERWRITTEN with
 * the source bytes and reported (the central repo is the source of truth; owner decision
 * 2026-10-31). This machine's user stores were adopted exactly once each (2026-10-31): the
 * user-installed `code-review` they carried was replaced by the corpus's, and every differently
 * named user skill stayed.
 *
 * @param {string} storeDir the store directory; created when missing
 * @param {Array<{name: string, entry: string}>} planned the skills to own, `entry` being the abs
 *        path to the source `SKILL.md` (or legacy flat file) whose whole payload is delivered
 * @param {{dryRun?: boolean, sourceRoot: string, adopt?: boolean}} opts `sourceRoot` is recorded
 *        in the marker as the directory the bytes came from — the drift verifier resolves it, so
 *        it must be the directory the VERIFIER will compare against (the corpus root for a global
 *        pool, the project's `_skills` for a native adapter)
 * @returns {{refused: {reason: string, foreign: string[]}|null, copied: string[], unchanged: string[],
 *           removed: string[], overridden: string[], marker: 'written'|'unchanged'|'absent'}}
 */
function materialiseStore(storeDir, planned, { dryRun = false, sourceRoot, adopt = false } = {}) {
  const result = { refused: null, copied: [], unchanged: [], removed: [], overridden: [], marker: 'absent' };
  const exists = fs.existsSync(storeDir);
  const present = exists ? new Set(storeSkillNames(storeDir)) : new Set();
  const marker = exists ? readMarker(storeDir) : null;

  // A store holding skills but no marker is not ours and will not be adopted unless the caller
  // carries the owner's decision (`adopt: true`) — see the docblock for what adoption covers.
  if (exists && present.size > 0 && !marker && !adopt) {
    return { ...result, refused: { reason: 'store has skills but no marker — not ours to manage (pass --adopt to deliver into it)', foreign: [...present].sort() } };
  }

  const owned = new Set(marker ? marker.names : []);
  const plannedNames = new Set(planned.map((p) => p.name));

  if (!dryRun) fs.mkdirSync(storeDir, { recursive: true });

  // 1. Planned skills. A name that exists but is not ours is still delivered: the source bytes
  //    win (owner decision 2026-10-31), and the override is reported by name.
  for (const { name, entry } of planned) {
    const destDir = path.join(storeDir, name);
    if (present.has(name) && !owned.has(name)) result.overridden.push(name);
    const payload = skillPayload(entry);
    const expected = new Set(payload.map((item) => item.rel));
    for (const item of payload) {
      const to = path.join(destDir, item.rel);
      const isUnchanged = fs.existsSync(to) && sameContent(to, item.from);
      if (isUnchanged) {
        result.unchanged.push(`${name}/${item.rel}`);
        continue;
      }
      if (!dryRun) {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.writeFileSync(to, fs.readFileSync(item.from));
      }
      result.copied.push(`${name}/${item.rel}`);
    }
    // Companions the source no longer carries, inside a skill this run owns — one the marker
    // already claimed, or one just overridden (a replaced skill is replaced whole, or the
    // directory keeps offering the foreign skill's stale instructions). A stale instruction is
    // worse than a missing one, because the agent will follow it.
    if ((owned.has(name) || result.overridden.includes(name)) && fs.existsSync(destDir)) {
      for (const rel of listFiles(destDir)) {
        if (expected.has(rel)) continue;
        if (!dryRun) fs.unlinkSync(path.join(destDir, rel));
        result.removed.push(`${name}/${rel}`);
      }
    }
  }

  // 2. Prune owned names the plan no longer carries. Only a directory carrying a SKILL.md is a
  //    skill, and only a name OUR marker listed is ours to remove; a legacy flat file is removed
  //    only when it too was ours.
  for (const name of owned) {
    if (plannedNames.has(name)) continue;
    const dirAbs = path.join(storeDir, name);
    if (fs.existsSync(path.join(dirAbs, SKILL_FILE))) {
      if (!dryRun) fs.rmSync(dirAbs, { recursive: true });
      result.removed.push(`${name}/${SKILL_FILE}`);
    }
  }

  // 3. The marker. No timestamp — the file must be byte-stable across no-op runs, the same
  //    idempotency `inject-skills-block.js` grants AGENTS.md.
  const nextMarker = {
    source: path.resolve(sourceRoot || '.'),
    names: planned.map((p) => p.name).sort(),
  };
  const markerFile = path.join(storeDir, markerNameFor(storeDir));
  const currentMarker = fs.existsSync(markerFile) ? fs.readFileSync(markerFile, 'utf8') : '';
  const nextMarkerText = `${JSON.stringify(nextMarker, null, 2)}\n`;
  if (nextMarkerText !== currentMarker) {
    if (!dryRun) fs.writeFileSync(markerFile, nextMarkerText, 'utf8');
    result.marker = 'written';
  } else {
    result.marker = 'unchanged';
  }

  return result;
}

/**
 * Verify a store against what the plan says it must hold — the read-only half, used by the drift
 * guard. Content is verified for every PLANNED name regardless of who wrote it: under the
 * source-of-truth doctrine a same-named foreign skill with different bytes is a STALE downstream
 * copy (drift — the remedy is a sync, which overwrites it), and one with matching bytes is in
 * sync even before its marker claims it. A foreign skill with a different name is never drift,
 * and a store with skills but no marker is `unmanaged` (reported, never failed — adopting it is
 * an owner decision).
 *
 * @param {string} storeDir
 * @param {Array<{name: string, entry: string}>} planned
 * @returns {{state: 'absent'|'unmanaged'|'sync'|'drift', marker: boolean, missing: string[],
 *           stale: string[], extraOwned: string[], overridden: string[], foreign: string[]}}
 */
function verifyStore(storeDir, planned) {
  const empty = { state: 'absent', marker: false, missing: [], stale: [], extraOwned: [], overridden: [], foreign: [] };
  if (!fs.existsSync(storeDir)) return empty;

  const present = new Set(storeSkillNames(storeDir));
  const marker = readMarker(storeDir);
  if (!marker) {
    if (present.size === 0) return empty;
    return { ...empty, state: 'unmanaged', foreign: [...present].sort() };
  }

  const owned = new Set(marker.names);
  const plannedNames = new Set(planned.map((p) => p.name));
  const missing = [];
  const stale = [];
  const overridden = [];

  for (const { name, entry } of planned) {
    const destDir = path.join(storeDir, name);
    if (present.has(name) && !owned.has(name)) overridden.push(name);
    if (!fs.existsSync(path.join(destDir, SKILL_FILE))) {
      missing.push(`${name}/${SKILL_FILE}`);
      continue;
    }
    for (const item of skillPayload(entry)) {
      const to = path.join(destDir, item.rel);
      if (!fs.existsSync(to)) stale.push(`${name}/${item.rel}`);
      else if (!sameContent(to, item.from)) stale.push(`${name}/${item.rel}`);
    }
  }

  const extraOwned = [...owned].filter((name) => !plannedNames.has(name));
  const foreign = [...present].filter((name) => !owned.has(name) && !plannedNames.has(name)).sort();
  const drift = missing.length || stale.length || extraOwned.length;
  return {
    state: drift ? 'drift' : 'sync',
    marker: true,
    missing: missing.sort(),
    stale: stale.sort(),
    extraOwned: extraOwned.sort(),
    overridden: overridden.sort(),
    foreign,
  };
}

/**
 * Remove only the skills owned by this sync inside a retired store target (`retiredTargets`).
 * Unmanaged directories or non-owned foreign skills inside the store are left untouched; empty
 * store/parent tool directories are removed only when nothing else remains inside them.
 * @param {string} storeDir
 * @param {{dryRun?: boolean}} [opts]
 * @returns {{removed: string[]}}
 */
function pruneRetiredStore(storeDir, { dryRun = false } = {}) {
  if (!fs.existsSync(storeDir)) return { removed: [] };
  const marker = readMarker(storeDir);
  if (!marker) return { removed: [] };

  const removed = [];
  for (const name of marker.names) {
    const dirAbs = path.join(storeDir, name);
    if (fs.existsSync(path.join(dirAbs, SKILL_FILE))) {
      if (!dryRun) fs.rmSync(dirAbs, { recursive: true });
      removed.push(`${name}/${SKILL_FILE}`);
    }
  }
  const markerFile = path.join(storeDir, markerNameFor(storeDir));
  if (fs.existsSync(markerFile)) {
    if (!dryRun) fs.rmSync(markerFile);
  }
  if (!dryRun) {
    try {
      if (fs.readdirSync(storeDir).length === 0) {
        fs.rmdirSync(storeDir);
        const parent = path.dirname(storeDir);
        if (fs.existsSync(parent) && fs.readdirSync(parent).length === 0) fs.rmdirSync(parent);
      }
    } catch {
      // Leave non-empty or busy directories intact.
    }
  }
  return { removed };
}

module.exports = { MARKER_RE, markerNameFor, readMarker, materialiseStore, verifyStore, storeSkillNames, pruneRetiredStore };
