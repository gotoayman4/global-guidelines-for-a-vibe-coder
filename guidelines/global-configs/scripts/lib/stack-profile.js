/**
 * stack-profile.js — Read a project's technology stack, from what it declares and what it measures.
 *
 * INTENT: the skill selector must answer "does this skill belong in this project?" without a human
 * in the loop. That needs a machine-readable answer to "what does this project use", and the honest
 * finding from the fleet is that no single source provides it. Measured 2026-10-12 across the 7
 * registered projects: 6 declare a `### Stack` table, 6 declare a `### Forbidden …` list, 6 have a
 * root `package.json`, and alsael1 has only its own prose. No source covers the fleet alone, and a
 * reader that trusted the Stack table alone would treat the one project that lacks it as empty and
 * hand it all 20 skills.
 *
 * (An earlier reading of this same fleet said "2 of 7 declare a Stack table". That was wrong, and
 * the way it was wrong is worth keeping: the heading survey was piped through `head -20`, which cut
 * the list before the Stack heading appeared in four projects. The lesson is the one this repo keeps
 * relearning — a truncated measurement is indistinguishable from a negative one.)
 *
 * DECISION: a LADDER, not a single source, and the rung that answered is reported rather than
 * hidden. Precedence runs declared-before-measured, because a declaration carries a human decision
 * ("we pinned MUI 9 and here is why") while a dependency list carries only a fact. The rungs:
 *
 *   1. `AGENTS.md` §`### Stack` — the declared stack, authoritative.
 *   2. root `package.json` (+ one workspace level) — the measured stack, unioned with rung 1 rather
 *      than replacing it, because a Stack table is often incomplete and a dependency list never is.
 *   3. `stackCorpus` — the rest of `AGENTS.md`, with forbidden and skill-listing sections removed.
 *      Used only when rungs 1–2 produced nothing. This is what gives a project with neither a Stack
 *      table nor a package.json (alsael1 today) a real profile instead of a blanket copy-all.
 *   4. nothing at all — `unconfigured`, and the selector copies everything.
 *
 * THE NEGATIVE SIGNAL IS SEPARATE, AND IT IS RECONCILED AGAINST THE POSITIVE ONE. A `### Forbidden
 * Dependencies and Patterns` list is the only signal that says "not this one", and it is the one
 * that actually prevents a wrong copy: GAMS bans Tailwind, shadcn/ui and Ant Design by name, and
 * those words are what suppress the three Tailwind skills from a project that would otherwise
 * collect them. But the list cannot be read as a bare set of words, because a prohibition names the
 * technology it is protecting as often as the one it is banning — property-management-app writes
 * "No raw MUI `<Table>` … use `StandardTable`" and "No Tauri … or any alternative to Electron", in
 * a project that uses MUI and Electron. Measured: the unreconciled form reports MUI, React and
 * Electron as forbidden in three of the six projects that use them.
 *
 * So a token the Stack table DECLARES cannot also be forbidden: the project's own affirmative claim
 * about what it uses outranks a word appearing inside a sentence about what it does not. Effective
 * forbidden = (words in prohibitions) − (declared and measured stack). That leaves pma banning
 * Firebase, Supabase, Tailwind and shadcn — which is exactly what it means — while dropping the MUI
 * and Electron mentions that were never bans.
 *
 * FOUR MEASURED TRAPS, each of which silently inverted the profile before it was fixed:
 *
 *   - The Stack heading contains the words "do NOT use ranges", so a bare `do not` classified the
 *     declared stack as a forbidden list. On GAMS that read MUI, React and Electron as BANNED — and
 *     `mui-design-system` would have been skipped from the one project that pins MUI 9.5.0. See
 *     `isNegativeHeading`.
 *   - A forbidden bullet's *explanation* names the technology the project chose instead ("No Tailwind,
 *     no shadcn/ui. **MUI 9 is the recorded UI foundation**"). Tokenising the whole bullet therefore
 *     banned MUI in the project that had just declared it. See `forbiddenTokens`.
 *   - A project's `## Skills` section inventories its skills, so rung 3 read `mui-design-system` (then
 *     `mui-design-system.skill.md`, now the `mui-design-system/SKILL.md` directory) and "confirmed"
 *     MUI from the skill list itself — a loop in which a project's own inventory justified every
 *     entry in it. See `stackCorpus`, and `headingLabel` for why `## 8. Skills` did not match
 *     `^Skills` on the first attempt.
 *   - Prohibitions that name the protected technology, handled by the reconciliation above.
 *
 * CAVEAT, and the reason rung 3 is gated: prose matching is a heuristic. It is confined to a project
 * with no better signal so it can never override a real declaration, and it is reported as
 * `agentsProse` so a wrong token is visible in the plan rather than silently driving a skip. Its
 * residual error is known and accepted: "No React Native" yields the token `react`, because the
 * vocabulary has no `react-native` entry and inventing one to suppress a token no skill declares
 * would be configuration with no consumer.
 *
 * NOT a guard: no `@tier`. It derives a value rather than asserting a property.
 *
 * Source: global-configs/scripts/lib/stack-profile.js
 */

const fs = require('fs');
const path = require('path');
const { tokenizePackages, tokenizeText, tokenizeFiles, isToken } = require('./tech-tokens.js');

/** The heading that owns the declared stack: `### Stack (Pin exact versions — do NOT use ranges)`. */
const STACK_HEADING = /^Stack\b/i;

/**
 * A heading whose section states what this project must NOT use.
 *
 * DELIBERATELY NARROW — see the docblock trap 1. The phrase must be about adopting a dependency
 * (`do not use/add/suggest/install`), because a bare `do not` collides with the Stack heading.
 */
const NEGATIVE_HEADING =
  /\b(?:forbidden|banned|prohibited|anti-?patterns?|disallowed|not\s+allowed|out\s+of\s+scope|must\s+not|do\s+not\s+(?:use|add|suggest|install|introduce|depend)|don'?t\s+(?:use|add|suggest|install))\b/i;

/** A heading whose section inventories skills rather than describing the stack — see trap 3. */
const SKILLS_HEADING = /^Skills?\b/i;

/**
 * A leading section enumerator, as this corpus writes it: `## 8. Skills`, `## 10. Forbidden …`.
 *
 * Measured on alsael1: `## 8. Skills` did not match `^Skills`, so its skill list stayed in the rung-3
 * corpus and contributed four phantom technologies (`mui`, `shadcn`, `tiptap`, `inno-setup`) from the
 * filenames of the skills it had been given. Classifying the label rather than the raw heading makes
 * `8. Skills` and `Skills` the same section.
 */
const ENUMERATOR = /^\s*(?:\d+(?:\.\d+)*\s*[.)]\s*)+/;

/** A heading's text with any enumerator removed. */
function headingLabel(text) {
  return String(text).trim().replace(ENUMERATOR, '').trim();
}

/** Is this heading a forbidden section? The Stack heading is never one, and it wins outright. */
function isNegativeHeading(text) {
  const label = headingLabel(text);
  if (STACK_HEADING.test(label)) return false;
  return NEGATIVE_HEADING.test(label);
}

/** Is this heading a skill inventory? */
function isSkillsHeading(text) {
  return SKILLS_HEADING.test(headingLabel(text));
}

/**
 * Concatenate the body of every section whose heading satisfies `isTarget`.
 *
 * A section runs until the next heading at the same or a shallower level, so a `####` subsection
 * stays inside its `###` parent. The test is applied to the heading text, never the body: a body
 * match would let a table row that merely mentions the word open a section.
 */
function sections(md, isTarget) {
  const out = [];
  let level = 0;
  let capturing = false;
  for (const line of String(md).split(/\r?\n/)) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const depth = heading[1].length;
      if (capturing && depth <= level) capturing = false;
      if (isTarget(heading[2])) {
        capturing = true;
        level = depth;
      }
      continue;
    }
    if (capturing) out.push(line);
  }
  return out.join('\n');
}

/** The declared stack table, as prose. Empty string when the project declares none. */
function extractStackSection(md) {
  return sections(md, (text) => STACK_HEADING.test(headingLabel(text)));
}

/** The raw body of every section that states what the project must not use. */
function extractForbiddenSections(md) {
  return sections(md, isNegativeHeading);
}

/**
 * `AGENTS.md` minus its forbidden sections and minus its skill inventories — the corpus rung 3 reads.
 *
 * A single walk that skips the excluded sections, rather than concatenating the document and then
 * subtracting text: `extractForbiddenSections` joins two sections' bodies with everything between
 * them deleted, so the result never appears verbatim in the document and a subtractive `replace`
 * matches nothing at all. Measured on GAMS 2026-10-12: the subtractive form left `mui` and `shadcn`
 * in the positive corpus; this walk leaves neither.
 */
function stackCorpus(md) {
  const out = [];
  let level = 0;
  let skipping = false;
  for (const line of String(md).split(/\r?\n/)) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const depth = heading[1].length;
      if (skipping && depth <= level) skipping = false;
      if (isNegativeHeading(heading[2]) || isSkillsHeading(heading[2])) {
        skipping = true;
        level = depth;
      }
      continue;
    }
    if (!skipping) out.push(line);
  }
  return out.join('\n');
}

/**
 * The banned technologies, as a corpus to tokenise.
 *
 * Only the tokens that HEAD a negated list item. This is the third refinement of one rule, and each
 * earlier version was wrong in a way the fleet made visible:
 *
 *   1. Tokenise the whole forbidden section. Wrong: the section's explanatory prose names the
 *      technology the project CHOSE ("No Tailwind, no shadcn/ui. **MUI 9 is the recorded UI
 *      foundation**"), so GAMS was reported as banning MUI, React and Electron.
 *   2. Tokenise only the bullet's first sentence, and only if it negates. Better, but still wrong in
 *      the other direction: property-management-app writes "No raw MUI `<Table>` … use `StandardTable`"
 *      and "No Tauri … or any alternative to Electron" — a first sentence that bans a SUBSET of MUI,
 *      and a sentence whose object is Electron's alternatives. Both were read as outright bans.
 *   3. This one: take the span from each negation to the end of its clause, split it on `,` `/` `and`
 *      `or`, and keep only the technology that STARTS an item. "No raw MUI" heads with `raw`, so MUI
 *      is not banned; "No Tailwind CSS, shadcn/ui" heads with `Tailwind` and `shadcn`, so both are.
 *
 * Measured on the two projects with a real forbidden list, before and after this change:
 * property-management-app's bans go from a superset that included its own MUI and Electron to
 * exactly `firebase, shadcn, supabase, tailwind`; gs-coordinator-helper gains the `zustand` and
 * `supabase` that the whole-sentence form had buried inside "Redux/Zustand for server state" and
 * "MongoDB/Supabase/Postgres". The residual error is known: "No React Native" heads with `React`,
 * so `react` is reported as banned. It is harmless today (no skill declares `react`) and it is
 * cancelled for any project that declares React, by the reconciliation in `readStackProfile`.
 */
function forbiddenTokens(md) {
  const NEGATION = /\b(?:no|not|never|avoid|banned?|forbidden|prohibited?|disallowed?|without)\b/gi;
  // Where a negated phrase ends: a sentence, a clause, a dash explanation, or a parenthetical.
  const PHRASE_END = /[.;!?—–\n(]/;
  // `/` counts as a separator: `Redux/Zustand` and `MongoDB/Supabase/Postgres` are two bans each.
  const ITEM_SEP = /,|\/|\band\b|\bor\b/i;
  // A list item's leading noise: negation words, quantifiers, and the verbs of "do not USE X".
  const ITEM_SKIP = /^(?:no|not|never|without|any|all|the|a|an|or|and|suggest|add|use|using|introduce|depend)$/i;

  const found = new Set();
  for (const line of extractForbiddenSections(md).split(/\r?\n/)) {
    const bullet = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/);
    const text = (bullet ? bullet[1] : line).trim();
    if (!text) continue;

    NEGATION.lastIndex = 0;
    let negation;
    while ((negation = NEGATION.exec(text)) !== null) {
      const rest = text.slice(negation.index + negation[0].length);
      const end = rest.search(PHRASE_END);
      const phrase = end === -1 ? rest : rest.slice(0, end);

      for (const rawItem of phrase.split(ITEM_SEP)) {
        // "Do not suggest: Next.js, …" — the colon introduces the list, so the item starts after it.
        const afterColon = rawItem.includes(':') ? rawItem.slice(rawItem.lastIndexOf(':') + 1) : rawItem;
        const words = afterColon.replace(/^[^A-Za-z@]+/, '').split(/[\s*_`"'(]+/).filter(Boolean);
        const head = words.find((w) => !ITEM_SKIP.test(w));
        if (head && isToken(head)) found.add(head.toLowerCase());
      }
    }
  }
  return [...found].sort();
}

/**
 * Dependency names from the root `package.json` and one workspace level (`apps/*`, `packages/*`).
 *
 * The workspace level is not optional: GAMS's root manifest is a workspace shell with 13 entries
 * while the stack lives in `apps/web-portal`. Reading the root alone would report "React absent" for
 * a React project, and an absent token is a silent skip.
 *
 * A malformed manifest yields no names rather than an exception — the caller's job is to select
 * skills, and a project with an unparseable `package.json` has a larger problem than skill selection.
 */
function dependencyNames(root) {
  const manifests = [path.join(root, 'package.json')];
  for (const group of ['apps', 'packages']) {
    const dir = path.join(root, group);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) manifests.push(path.join(dir, entry, 'package.json'));
  }

  const names = [];
  for (const manifest of manifests) {
    if (!fs.existsSync(manifest)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      names.push(...Object.keys(parsed.dependencies || {}), ...Object.keys(parsed.devDependencies || {}));
    } catch {
      /* reported as no measurement, never as a crash */
    }
  }
  return names;
}

/**
 * Read a project's stack profile.
 *
 * @param {string} projectRoot
 * @returns {{
 *   root: string,
 *   stack: string[],
 *   forbidden: string[],
 *   mode: 'configured'|'negative-only'|'unconfigured',
 *   sources: {stackTable: boolean, packageJson: boolean, files: boolean, agentsProse: boolean, forbidden: boolean}
 * }}
 */
function readStackProfile(projectRoot) {
  const root = path.resolve(projectRoot);
  const agentsPath = path.join(root, 'AGENTS.md');
  const agents = fs.existsSync(agentsPath) ? fs.readFileSync(agentsPath, 'utf8') : '';

  const fromTable = agents ? tokenizeText(extractStackSection(agents)) : [];
  const fromPackages = tokenizePackages(dependencyNames(root));
  const fromFiles = tokenizeFiles(root, (dir) => fs.readdirSync(dir));

  const declaredTokens = new Set([...fromTable, ...fromPackages, ...fromFiles]);
  const positive = new Set(declaredTokens);
  let agentsProse = [];
  if (positive.size === 0 && agents) {
    agentsProse = tokenizeText(stackCorpus(agents));
    for (const token of agentsProse) positive.add(token);
  }

  const forbiddenRaw = agents ? forbiddenTokens(agents) : [];
  const stack = [...positive].sort();
  // Only a DECLARED or MEASURED stack may cancel a prohibition — never the prose rung. Prose matches
  // any mention, so letting it reconcile would make a ban unsay itself: a project writing "we do not
  // use Tailwind" mentions Tailwind, which would put it in the stack, which would delete the ban, which
  // would copy the Tailwind skill back in. Measured on a fixture 2026-10-12: with prose in the
  // reconciling set a real `- No Tailwind` bullet was dropped; with it excluded the ban survives.
  // `forbiddenRaw` is reported alongside so the reconciliation is visible rather than silent.
  const forbidden = forbiddenRaw.filter((token) => !declaredTokens.has(token));

  return {
    root,
    stack,
    forbidden,
    forbiddenRaw,
    mode: stack.length ? 'configured' : forbidden.length ? 'negative-only' : 'unconfigured',
    sources: {
      stackTable: fromTable.length > 0,
      packageJson: fromPackages.length > 0,
      files: fromFiles.length > 0,
      agentsProse: agentsProse.length > 0,
      forbidden: forbiddenRaw.length > 0,
    },
  };
}

module.exports = {
  readStackProfile,
  dependencyNames,
  extractStackSection,
  extractForbiddenSections,
  forbiddenTokens,
  stackCorpus,
  sections,
  headingLabel,
  isNegativeHeading,
  isSkillsHeading,
  NEGATIVE_HEADING,
  SKILLS_HEADING,
  STACK_HEADING,
};
