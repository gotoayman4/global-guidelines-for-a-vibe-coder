/**
 * plan-skills.js — Decide which skills belong in a project, and say why for every one.
 *
 * INTENT: the sync used to copy all 20 skills into every project unconditionally. For a project whose
 * stack a skill was not written for, that is worse than noise: `rtl-shadcn-setup` in an MUI project
 * is a document that contradicts the constitution, and the `## Skills` index tells the agent to load
 * what matches its task — so the wrong skill is not merely present, it is loadable.
 *
 * DECISION: fit is a two-sided intersection. The project side is a `stack-profile` (declared, then
 * measured); the skill side is its scope. The rule, in order:
 *
 *   1. A project with NO stack signal at all copies EVERYTHING. A fresh, empty folder has no stack to
 *      filter against, and withholding skills from it would be a guess dressed as a policy.
 *   2. A skill that declares no technology in its scope is STACK-AGNOSTIC and is copied everywhere.
 *      `code-review` and `security-audit` apply to every project; there is nothing to intersect.
 *   3. A skill that names a technology the project FORBIDS is skipped. This is the rule that does the
 *      real work, and it is checked before the positive match because a ban is unambiguous.
 *   4. A skill whose scope does not intersect the project's stack is skipped, and the plan says so.
 *   5. Otherwise it is copied, and the plan names the tokens that matched.
 *
 * WHERE A SKILL'S SCOPE COMES FROM — and the one judgement call in this file. `appliesTo` is the
 * declared home, and it is authoritative. But it is declared on a single skill in the pool, and a rule that only
 * fires for one skill is a rule that does not exist yet. So an UNDECLARED scope is inferred from the
 * skill's existing `tags`, intersected with the technology vocabulary. Measured on the corpus
 * 2026-10-12: that inference splits the 20 skills 8 stack-scoped / 12 stack-agnostic, and the split
 * is correct on inspection — `docx`, `firebase`, `firestore`, `inno-setup`, `mui`, `shadcn`,
 * `tailwind` and `tiptap` land on the right side, and every task-type skill lands on the other.
 *
 * The inference is a FALLBACK, never a second home: `appliesTo` overrides it, every plan row reports
 * which basis it used, and `audit-friction.js` counts the skills still relying on inference. That is
 * the ratchet this repo already uses for an absent `control:` — allowed, counted, and closed by a
 * later pass rather than by a guess now.
 *
 * WHAT THIS DOES NOT DECIDE: whether the skill is any good, whether its content is current, and
 * whether an agent actually loads it. This file only answers "does it belong in this project", and
 * the honest limit is that a wrong `appliesTo` produces a confident wrong answer — which is why the
 * plan is printable before it is applied, and why every row carries its reason.
 *
 * NOT a guard: no `@tier`. It derives a value rather than asserting a property.
 *
 * Source: global-configs/scripts/lib/plan-skills.js
 */

const fs = require('fs');
const path = require('path');
const { parseFrontMatter, meta, asList } = require('./front-matter.js');
const { isToken } = require('./tech-tokens.js');
const { readStackProfile } = require('./stack-profile.js');
const { SKILL_FILE, SKILL_EXT, listSkills, skillPayload, listFiles } = require('./skill-files.js');

/**
 * A skill's declared or inferred scope.
 *
 * `declared` is true only for `appliesTo`. `basis` is reported on every plan row so a skip can be
 * traced to a declaration or to an inference, and `unknown` collects `appliesTo` values the
 * vocabulary cannot resolve — a typo there would otherwise read as "no scope" and make the skill
 * universal, which is the one failure mode of a declaration that is silently ignored.
 *
 * Reads through `meta()`: the field lives under `metadata:` in a standard skill and at the top
 * level in a legacy one, and one accessor means neither shape leaks into this decision.
 *
 * @param {Record<string, unknown>|null} fm
 * @returns {{tokens: string[], declared: boolean, basis: string, unknown: string[]}}
 */
function skillScope(fm) {
  const declaredRaw = asList(meta(fm, 'appliesTo'));
  if (declaredRaw.length) {
    const tokens = declaredRaw.map((t) => t.toLowerCase()).filter(isToken);
    const unknown = declaredRaw.filter((t) => !isToken(t));
    if (tokens.length) {
      return { tokens: [...new Set(tokens)].sort(), declared: true, basis: 'appliesTo', unknown };
    }
    // A declaration made entirely of tokens the vocabulary cannot resolve carries no decision, so it
    // falls through to inference and reports the unresolvable values rather than silently universal.
    const inferred = inferFromTags(fm);
    return { ...inferred, unknown, basis: inferred.tokens.length ? `${inferred.basis} (appliesTo unresolved)` : 'none' };
  }
  return inferFromTags(fm);
}

/** The provisional scope: the skill's `tags`, intersected with the technology vocabulary. */
function inferFromTags(fm) {
  const tags = asList(meta(fm, 'tags'));
  const tokens = [...new Set(tags.map((t) => t.toLowerCase()).filter(isToken))].sort();
  return { tokens, declared: false, basis: tokens.length ? 'tags' : 'none', unknown: [] };
}

/**
 * Does this skill belong in this project?
 * @param {{tokens: string[]}} scope
 * @param {ReturnType<typeof readStackProfile>} profile
 * @returns {{fit: boolean, reason: string}}
 */
function fitVerdict(scope, profile) {
  if (profile.mode === 'unconfigured') {
    return { fit: true, reason: 'project has no stack signal — every skill is copied' };
  }
  if (!scope.tokens.length) {
    return { fit: true, reason: 'stack-agnostic — the skill names no technology' };
  }

  const forbidden = scope.tokens.filter((t) => profile.forbidden.includes(t));
  if (forbidden.length) {
    return { fit: false, reason: `forbidden by this project: ${forbidden.join(', ')}` };
  }

  // A project that declares only what it forbids has told us nothing to intersect against, so the
  // only defensible skip is a ban. Skipping for "no overlap" here would punish a project for an
  // omission in its documentation.
  if (profile.mode === 'negative-only') {
    return { fit: true, reason: 'project declares only prohibitions — copied unless forbidden' };
  }

  const matched = scope.tokens.filter((t) => profile.stack.includes(t));
  if (!matched.length) {
    return { fit: false, reason: `no overlap with this project's stack (${scope.tokens.join(', ')})` };
  }
  return { fit: true, reason: `matches ${matched.join(', ')}` };
}

/**
 * Plan the skill set for one project.
 *
 * @param {string} projectRoot
 * @param {string} skillsDir the source skills directory
 * @returns {{profile: object, copy: object[], skip: object[], skillsDir: string}}
 */
function planSkills(projectRoot, skillsDir) {
  const profile = readStackProfile(projectRoot);
  if (!fs.existsSync(skillsDir)) {
    throw new Error(`skills directory not found: ${skillsDir}`);
  }
  const skills = listSkills(skillsDir);

  const copy = [];
  const skip = [];
  for (const skill of skills) {
    const fm = parseFrontMatter(fs.readFileSync(skill.abs, 'utf8'));
    const scope = skillScope(fm);
    const verdict = fitVerdict(scope, profile);
    const row = { file: skill.file, name: skill.name, scope: scope.tokens, basis: scope.basis, reason: verdict.reason };
    if (scope.unknown.length) row.unknownTokens = scope.unknown;
    (verdict.fit ? copy : skip).push(row);
  }

  return { profile, copy, skip, skillsDir: path.resolve(skillsDir) };
}

/**
 * Materialise a plan into `<project>/_skills`.
 *
 * DECLARATIVE, not additive: the directory is a generated mirror, so the planned set is the whole
 * set. Without the prune a project that changes stack keeps every skill it ever matched, and the
 * stale one is still loadable — the same drift the `_guidelines/` mirror avoids with `robocopy /MIR`.
 *
 * THE WRITTEN SHAPE IS THE STANDARD ONE: `<name>/SKILL.md`, which is what a native loader scans for.
 * The destination is derived from the skill's NAME, never from the source path, so a legacy flat
 * source is normalised on the way out rather than delivered as a shape no loader reads. The legacy
 * flat `<name>.skill.md` is therefore ALWAYS dead once the standard shape is what gets written — the
 * directory supersedes it when the name is planned, and it is stale when the name is not. Keeping it
 * in the planned case is how a project ends up with two loadable copies of one skill.
 *
 * A SKILL IS MORE THAN SKILL.md. `references/`, `scripts/` and `assets/` live beside the entry file
 * and the skill instructs the agent to load them on demand. Copying the entry alone delivered a
 * table of contents whose chapters were missing, while the drift check — which compared entry files
 * only — reported the copy complete. Every file under the selected skill's directory is delivered,
 * and every file the source no longer carries is pruned from the project's copy.
 *
 * SAFETY, stated because this deletes files: only directories that actually contain a `SKILL.md` are
 * removed, only directly inside `<project>/_skills`, and only when their name is not planned; extra
 * files inside a planned skill directory are removed only when the source skill does not carry them;
 * only files ending in `.skill.md` are unlinked at the top level. A hand-written file of any other
 * name is left alone. Pruning is suppressed by `prune: false`.
 *
 * @returns {{copied: string[], removed: string[], unchanged: number}}
 */
function applyPlan(projectRoot, plan, { prune = true } = {}) {
  const target = path.join(path.resolve(projectRoot), '_skills');
  fs.mkdirSync(target, { recursive: true });

  const plannedNames = new Set(plan.copy.map((row) => row.name));
  const payloads = new Map();
  const copied = [];
  const unchanged = [];
  for (const row of plan.copy) {
    // The standard shape, regardless of the source's: `row.name` is the skill's own name, which is
    // also the directory a conformant loader requires it to live in.
    const payload = skillPayload(path.join(plan.skillsDir, row.file));
    payloads.set(row.name, payload);
    for (const item of payload) {
      const dest = `${row.name}/${item.rel}`;
      const to = path.join(target, dest);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      const body = fs.readFileSync(item.from);
      if (fs.existsSync(to) && Buffer.compare(fs.readFileSync(to), body) === 0) {
        unchanged.push(dest);
        continue;
      }
      fs.writeFileSync(to, body);
      copied.push(dest);
    }
  }

  const removed = [];
  if (prune) {
    // First, inside every planned skill: remove a companion the source no longer carries. A renamed
    // reference is otherwise left loadable forever, and the skill's links point at the old name.
    for (const row of plan.copy) {
      const dirAbs = path.join(target, row.name);
      const expected = new Set((payloads.get(row.name) || []).map((item) => item.rel));
      for (const rel of listFiles(dirAbs)) {
        if (expected.has(rel)) continue;
        fs.unlinkSync(path.join(dirAbs, rel));
        removed.push(`${row.name}/${rel}`);
      }
      removeEmptyDirectories(dirAbs);
    }

    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        // Only a directory that carries a SKILL.md is a skill; anything else is hand-written.
        if (!fs.existsSync(path.join(target, entry.name, SKILL_FILE))) continue;
        if (plannedNames.has(entry.name)) continue;
        fs.rmSync(path.join(target, entry.name), { recursive: true });
        removed.push(`${entry.name}/${SKILL_FILE}`);
      } else if (entry.isFile() && entry.name.endsWith(SKILL_EXT)) {
        // A legacy flat skill is dead the moment the standard shape is written: if its name is
        // planned the directory above supersedes it, and if it is not planned it is stale. Either
        // way it must go, or a migrated project carries two loadable copies of the same skill.
        fs.unlinkSync(path.join(target, entry.name));
        removed.push(entry.name);
      }
    }
  }

  return { copied, removed, unchanged: unchanged.length };
}

/** Remove empty subdirectories after pruning companions, keeping the skill directory itself. */
function removeEmptyDirectories(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = path.join(dir, entry.name);
    removeEmptyDirectories(child);
    if (fs.readdirSync(child).length === 0) fs.rmdirSync(child);
  }
}

module.exports = { planSkills, applyPlan, skillScope, inferFromTags, fitVerdict, asList, SKILL_FILE, SKILL_EXT, listSkills };
