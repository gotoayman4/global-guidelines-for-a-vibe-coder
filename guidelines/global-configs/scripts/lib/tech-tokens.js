/**
 * tech-tokens.js — the one home for "what counts as a technology token".
 *
 * INTENT: two sides of the skill-selection decision need the same vocabulary. The project side says
 * "this project uses MUI"; the skill side says "this skill is for MUI". Both must resolve to the
 * same string, because the decision is an intersection: if the two sides spell it differently the
 * intersection is silently empty, and an empty intersection is indistinguishable from "this project
 * uses nothing" — so every stack-specific skill is copied to every project, which is the exact
 * defect the selector exists to remove. A second copy of this list on either side would drift, and
 * the drift would present as a clean, quiet "no match".
 *
 * WHY A CURATED LIST AND NOT A REGEX OVER PACKAGE NAMES: `@mui/material` → `mui` is not derivable
 * (the scope is `@mui`, the token is `mui`), and one package can prove two tokens — a project can
 * depend on `firebase` for Auth alone and never touch Firestore. Deriving would guess; declaring is
 * checkable, and this file is the thing a reviewer reads to find out why a skill was skipped.
 *
 * WHAT IS DELIBERATELY ABSENT: ambient technologies (TypeScript, Vite, npm, Node) carry no skill's
 * applicability, and a token no skill ever declares is dead configuration. `react` IS here, because
 * a skill may legitimately be written for any React project and a React project must be able to
 * answer yes.
 *
 * NOT a guard: no `@tier`. It derives a value rather than asserting a property, so
 * `check-guard-tiers.js` leaves it out of scope (see that file's CAVEAT).
 *
 * Source: global-configs/scripts/lib/tech-tokens.js
 */

/**
 * token → the signals that prove it, on either side of the decision.
 *
 *   packages  — regexes matched against a dependency NAME (`@mui/material`, `zustand`)
 *   files     — repo-root files whose presence proves the token (shadcn has no package)
 *   doc       — regexes matched against declared prose (a `### Stack` cell, a skill's `tags`)
 *
 * A token with no `packages` entry is not "unsupported" — it is a token that only a declaration can
 * prove, which is stated rather than guessed at.
 */
const TOKENS = {
  mui: { packages: [/^@mui\//], doc: /\b(?:MUI|Material\s?UI)\b/ },
  emotion: { packages: [/^@emotion\//], doc: /\bEmotion\b/ },
  tailwind: {
    packages: [/^tailwindcss$/, /^@tailwindcss\//, /prettier-plugin-tailwindcss/],
    doc: /\bTailwind\b/,
  },
  shadcn: { packages: [], files: ['components.json'], doc: /\bshadcn\b/i },
  tiptap: { packages: [/^@tiptap\//], doc: /\bTipTap\b/i },
  firebase: {
    packages: [/^firebase$/, /^firebase-admin$/, /^firebase-functions$/, /^@firebase\//],
    doc: /\bFirebase\b/,
  },
  // No package proves Firestore: it ships inside `firebase`, and a Firebase project may use Auth
  // without a database. Only a declaration can say so, which is why the Stack table names it.
  firestore: { packages: [], doc: /\bFirestore\b/ },
  supabase: { packages: [/^@supabase\//], doc: /\bSupabase\b/ },
  electron: {
    packages: [/^electron$/, /^electron-builder$/, /^electron-vite$/, /^@electron-toolkit\//],
    doc: /\bElectron\b/,
  },
  'inno-setup': { packages: [], doc: /\bInno\s?Setup\b/i },
  // Case-sensitive: `docs` is documentation, and a case-insensitive `doc` token would make every
  // project that writes documentation look like a DOCX project.
  docx: { packages: [/^docx$/, /^docxtemplater$/, /^html-docx-js$/], doc: /\bDOCX\b/ },
  react: { packages: [/^react$/, /^react-dom$/], doc: /\bReact\b/ },
  zustand: { packages: [/^zustand$/], doc: /\bZustand\b/ },
};

/** Every token this vocabulary knows, sorted. */
const TOKEN_NAMES = Object.keys(TOKENS).sort();

/** Is `name` a token this vocabulary can resolve? Used to reject a typo in `appliesTo`. */
function isToken(name) {
  return Object.prototype.hasOwnProperty.call(TOKENS, String(name).trim().toLowerCase());
}

/**
 * The tokens a set of dependency names proves.
 * @param {string[]} names
 * @returns {string[]} sorted, de-duplicated tokens
 */
function tokenizePackages(names) {
  const found = new Set();
  for (const name of names || []) {
    for (const [token, spec] of Object.entries(TOKENS)) {
      if ((spec.packages || []).some((re) => re.test(name))) found.add(token);
    }
  }
  return [...found].sort();
}

/**
 * The tokens a block of declared prose proves.
 * @param {string} text
 * @returns {string[]} sorted, de-duplicated tokens
 */
function tokenizeText(text) {
  const found = new Set();
  const body = String(text || '');
  for (const [token, spec] of Object.entries(TOKENS)) {
    if (spec.doc && spec.doc.test(body)) found.add(token);
  }
  return [...found].sort();
}

/** The tokens proven by files present in a repo root (shadcn's only signal). */
function tokenizeFiles(root, readdir) {
  const found = new Set();
  let entries;
  try {
    entries = readdir(root);
  } catch {
    return [];
  }
  for (const [token, spec] of Object.entries(TOKENS)) {
    if ((spec.files || []).some((f) => entries.includes(f))) found.add(token);
  }
  return [...found].sort();
}

module.exports = { TOKENS, TOKEN_NAMES, isToken, tokenizePackages, tokenizeText, tokenizeFiles };
