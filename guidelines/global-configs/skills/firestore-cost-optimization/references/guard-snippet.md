# Guard snippet — paste-ready static bans

Extracted from the skill body (progressive disclosure): the skill keeps the DECISION, this file keeps the CODE. Read it only when you are actually adding the guard.

## Guard snippet (paste at project setup)

Zero infrastructure: two files, both on steps the local-CI gate already runs. **Measure before you pin** —
run the scan, write the allowlist rows from what it found, and only then set the totals; a guard authored
from a guess is either vacuous or born red.

```js
// eslint.config.js — inside the block covering the source tree (NOT oxlint: it runs first
// in most setups and does not implement this rule, so ESLint is the enforcing half).
'no-restricted-syntax': ['error', {
  selector: 'CallExpression[callee.name=/^(onSnapshot|onSnapshotMetadata|onSnapshotFromBrowser|onListen)$/]',
  message: 'A Firestore realtime listener is a perpetual read budget. Use one-shot getDoc/getDocs + '
    + 'manual refresh; adopting a listener needs a recorded decision and a named `files:` override.',
}],
```

```js
// <data-layer>.test.ts — the bounded-read census. Reuse whatever file-walking + comment-stripping
// the existing read tests already have; adding rows to a guard that exists is cheaper than a new guard.
const UNBOUNDED_ALLOWED = [
  // [file, collection, reason > 20 chars] — a small seeded reference set, or a cap that would drop data
  ['src/services/reference.ts', 'programs', 'seeded reference set, bounded by the seed script'],
];
const INDIRECT_ALLOWED = [];            // getDocs(q): the bound lives in a variable — a recorded decision
const TOTAL_SCANS = 31;                 // ★ pinned MEASURED total: a broken detector cannot pass vacuously
const BOUNDED_SCANS = 26;               // ★ pinned: bounded in place

// per services file, comments stripped, for each `getDocs(` occurrence:
//   window = the call's own parentheses, tracked by depth (keeps the opening '(')
//   bounded  = window includes 'limit('
//   indirect = the whole argument is one bare identifier (\s*[A-Za-z_$][\w$]*\s*[,)]?\s*$)
// then: every scan must be bounded || allowlisted || indirect-allowlisted,
//       and rows.length / bounded count must equal the pinned totals.
```

Both halves need a **reversal proof** before they are believed: temporarily add a listener and an
unbounded `getDocs(collection(db, 'something'))`, confirm `lint` and `test` each go red naming the site,
then delete them. A guard that has never been seen red is a rumor.
