---
name: firestore-cost-optimization
description: Activate when optimizing Firebase/Firestore costs, minimizing reads/writes/deletes, staying within free-tier quotas, or reducing hosting download volume
status: "Advisory — with an enforced core"
scope: "Global (Task-Type Skill)"
tags: [skill, firestore, firebase, cost, quota]
---

# Skill: Firestore Cost Optimization

The tactics below are judgment; the three bans named in "Enforced by" are gate-checked in projects that
adopted them. Name which kind a line is: an agent that cannot tell a wish from a wall will treat both as
optional, and a skill whose trigger the session never fires constrains nothing at all (see "Enforced by",
D201-class lesson).

**Activation announcement:** When this skill activates, output in chat: `Skill: firestore-cost-optimization activated -- Source: _skills/firestore-cost-optimization.skill.md`

## Trigger

Activate when:
- User says "this is expensive", "reduce Firestore costs", "free tier", "quota", "read/write budget"
- Adding, refactoring, or reviewing any Firestore read/write/delete path (listeners, queries, counters, cleanup jobs)
- Reviewing Firebase Hosting cache strategy or bundle download size
- **Setting up or deploying any project whose backend is Firebase/Firestore** — the ceiling applies at the
  first document and at every deploy, not only when someone complains about a bill (activation is where an
  advisory skill otherwise dies: `first-project-setup` and `deploy-production` name this trigger)
- User states cost is a priority over performance/speed

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `02-engineering-practices/cost-optimization-strategy.md` — global cost philosophy ("default to free, justify every expense")
2. If SDK-level detail is needed, read the official skill references at `.agents/skills/firebase-firestore/` (progressive disclosure — only the needed reference file)

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a Firebase cost engineer. **Every read, write, and delete is billed** — assume the Spark (free) tier unless the user says otherwise. Cost beats performance and speed wherever the tradeoff is bearable. If a change adds $0 cost but adds latency, that is fine. If it saves cost but adds latency, prefer the cost-saving change unless it breaks a documented UX requirement.

---

## Workflow

1. **Inventory every data flow** touching Firestore: listeners, one-shot reads, writes, deletes, triggers. Classify each as **hot** (real-time, per-session) or **cold** (one-shot, per-action).
2. **Apply the decision rules:**

| Data need | Cost-correct choice |
|---|---|
| Real-time requirement | ONE unified `onSnapshot` on a single document/collection — never nested listeners per child item |
| One-shot data | `getDoc`/`getDocs` — a listener is a perpetual read budget |
| Periodic refresh | Adaptive polling with backoff (e.g. 10–30s) — latency is cheaper than a live connection; only poll while the view is visible |
| Counters / participant counts | `FieldValue.increment` on a dedicated counter document — never read-modify-write |
| Bulk writes | `WriteBatch` (≤500 ops) — never a loop of individual `set` calls |
| Bulk deletes (TTL cleanup) | Batched server-side deletes (admin SDK, 500/batch) in a scheduled function — never per-item client deletes |
| Derived/aggregate data | Store denormalized aggregates, update on write — avoid fan-out reads that re-derive the same numbers |
| Static/reference data | Fetch once and cache locally for the session — do not re-query on every render |
| Queries | Always bounded (`limit`) and filtered — never collection-wide scans |

3. **Budget check:** Estimate worst-case daily ops per flow, sum them, and compare — **against the
   numbers this project actually has, read from the Console or the pinned CLI, not from this table.** The
   figures below are a **2026-08-17 baseline**, transcribed by hand; a quota that is not measured is a
   guess with units, and a paid edition bills differently from the tier named here:
   - Spark (free) tier: **50,000 reads/day, 20,000 writes/day, 20,000 deletes/day**, 1 GiB storage
   - Hosting: 10 GB storage, **360 MB/day download**, 10 GB/month (Spark)
   - Blaze rates (if on paid): $0.06/100K reads, $0.18/100K writes, $0.02/100K deletes
   - Keep headroom: flag any flow consuming >30% of a daily quota.
   - **OPEN QUESTION, not an assertion:** whether a **Standard-edition** database (`freeTier: false` in some
     projects, `true` in others) bills the same allowances as the legacy free-tier figures above. Verify per
     project before quoting a percentage of a quota.
4. **Hosting download — fonts first, because they are the most commonly mis-diagnosed byte:**
   - **Whose bandwidth pays?** Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) is served by
     Google's CDN. Those bytes are **never billed to Firebase Hosting**. So "self-host the fonts to cut
     the hosting bill" is false reasoning: the browser downloads the font once either way and only the
     origin changes — self-hosting *adds* bytes to your quota, it does not remove a download. What
     self-hosting does buy is offline support (Electron), no third-party origin, and control of subsetting.
   - **The lever is the cache header, not the origin.** Firebase Hosting's default for a static asset is a
     **one-hour** cache — `Cache-Control: max-age=3600`, measured on both live sites 2026-10-12. It does
     **not** infer `immutable` from a content-hashed filename, so even a Vite-hashed `index-<hash>.js` or
     `cairo-<hash>.woff2` is re-fetched after an hour unless a `headers` block says otherwise. A font
     dropped in `public/` keeps a plain name *and* the one-hour default: **that** is the real "extra
     download per visit", and it is a missing header, not a self-hosting decision.
   - **Verify the rule matches something before calling it optimization.** A `**/*.@(woff2|woff|ttf)`
     block in a project that ships **no font file at all** is inert config — it protects nothing and reads
     as work already done. Look for font files in the build output first; if there are none, say so rather
     than counting the header as a win.
   - **A `source` pattern matches the REQUEST path, not the rewritten one.** Measured: with an SPA rewrite
     of `**` → `/index.html`, a `{"source": "index.html"}` block fires for a literal `/index.html`
     request but **not** for `/`, which keeps the one-hour default. Naming `/` as well is still **not
     enough** — it misses every deep route (`/jobs/123`, `/orders/9`), so the HTML shell stays
     browser-cached and can serve a stale shell pointing at chunk hashes a deploy has deleted.
     **The robust fix is a leading catch-all, not a list of routes:**
     `{"source": "**", "headers": [{"key": "Cache-Control", "value": "no-store"}]}` declared **first**,
     with the asset rules **after** it. Firebase applies matching rules **in declaration order**
     (documented, and verified live), so the later, more specific asset rules override the catch-all.
     Verified on both hosting targets of sharia-college 2026-10-12: `/`, `/index.html`, `/jobs/123` and an
     arbitrary deep route all returned `no-store`, while `/assets/index-<hash>.js`, `/assets/*.css` and
     root images kept `max-age=31536000, immutable` — the catch-all did **not** clobber them. Do not
     hand-enumerate shell routes; you will miss one, and the failure is a white screen, not a slow load.
   - **Scope `immutable` to the hashed output dir — never to `**/*.js`.** `immutable` promises the URL's
     content will never change, so it may only be applied where the filename changes with the content.
     A bundler's output dir (`**/assets/*`) qualifies. A **stable-named** file in `public/` does not:
     a `**/*.@(js|css)` rule pins a `public/theme-init.js` for a year, and no deploy can ever correct it
     for a returning visitor. Scope to `**/assets/*`, and route fonts through the bundler (`src/assets/`,
     or `@fontsource`) so they land there hashed rather than in `public/fonts/`.
   - **Then the bundle.** Every byte shipped is billed download, and the entry bundle usually dwarfs the
     fonts: a 2 MB hashed bundle at `max-age=3600` costs a revalidation round-trip per returning visitor
     per hour, and a full 2 MB on any cache miss; the same bundle at `immutable` costs nothing after the
     first visit. Size and header are two separate levers — pull both.
   - **Measure the slice before proposing to defer it.** A `manualChunks` rule that welds a whole vendor
     family into one chunk (`id.includes('/firebase/')` → `vendor-firebase`) makes per-surface deferral
     impossible: an eagerly-reachable `firebase/auth` drags a lazy-only `firebase/storage` onto the
     critical path with it. Measured on sharia-college 2026-10-12 (esbuild minify → brotli, per surface):
     Firestore 135 KB, auth 29 KB, storage 14 KB, app 7 KB — so "defer storage", the obvious idea, is
     worth ~3% of a 493 KB critical path. Report the number before recommending the refactor. Route-level
     `lazy()` splitting is usually already correct; a monolithic vendor layer is often monolithic
     **because its two biggest surfaces are genuinely needed at first paint**, not because someone
     forgot to split it. Do not sell a bundle refactor as a hosting-cost win.
   - Paste-ready block set (security headers + shell + assets + fonts):
     `global-configs/templates/firebase-hosting-headers.json.template`
5. **Output the audit table** (below). State the estimated daily ops and verdict per flow.

---

## Output Format

```markdown
## Firestore Cost Audit — [Scope]

### Quota Baseline  (verify live — the numbers below are a 2026-08-17 transcription)
- Reads/day: [X] / 50,000 (Spark baseline) — [%]
- Writes/day: [X] / 20,000 — [%]
- Deletes/day: [X] / 20,000 — [%]
- Hosting download/day: [X] MB / 360 MB — [%]

### Data Flows

| # | Flow | Type | Ops/day | Est. Cost | Verdict | Fix |
|---|------|------|---------|-----------|---------|-----|
| 1 | [flow] | listener/one-shot/write/delete | [N] | [$0 / ~$x] | ✅/⚠️/❌ | [action] |

### Recommendations
- [ ] Single unified listener instead of N nested listeners
- [ ] Replace polling with adaptive backoff / pause when hidden
- [ ] Counters via FieldValue.increment
- [ ] Batch writes / scheduled batched deletes
- [ ] Long cache-control on immutable hosting assets
```

---

## Anti-Patterns

- Do NOT add a second listener where one unified subscription serves the view — listeners are the #1 read-budget killer
- Do NOT poll at fixed high frequency; use adaptive backoff and pause when off-screen
- Do NOT read-modify-write counters — use `FieldValue.increment`
- Do NOT loop client-side deletes — batch them server-side
- Do NOT run collection-wide queries without `limit`/filters
- Do NOT re-query static data on every render — fetch once, cache locally
- Do NOT ship unbundled assets without long `max-age` cache headers
- Do NOT ship three font families at five weights each — it inflates client page weight and reduces no Firebase bill
- Do NOT add a font `Cache-Control` block to a project that self-hosts no font file — inert config reads as a completed optimization
- Do NOT claim a font decision changed the hosting bill without saying whose CDN serves the bytes
- Do NOT optimize latency at the expense of reads without user approval — cost wins when tradeoffs are bearable

---

## Enforced by (three static bans, each on a step that already runs)

Central rule 17 — "a declared control is not an enforced one" (`02-engineering-practices/security-engineering.md`)
applies to spend exactly as it applies to auth. A cost doctrine that no gate step can turn red is a
promise the next session has to remember; these three are not:

| Ban | Instrument | Gate step |
|---|---|---|
| A realtime listener where a one-shot read serves | `no-restricted-syntax` over the listener family | `lint` |
| A collection read with no `limit()` and no recorded exception | a census that scans the data layer | `test` |
| A read site appearing, vanishing or moving without a decision | the same census, with its totals **pinned** | `test` |

**What these do NOT cover, named rather than left to be discovered:** write and delete volume, per-row
client deletes, hosting download bytes, bundle size, the >30%-of-quota ceiling, and the quota figures
themselves. Those need a dated usage artifact (Console read, cited by path) — until one exists, say so in
the rule instead of letting a green gate imply that cost is controlled.

---

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

---

## Key Takeaways

1. The free-tier numbers above are a **baseline to verify, not a budget to quote**: read the live project
   (Console or pinned CLI) before computing a percentage of a quota, and note the edition. Then: 50K reads,
   20K writes, 20K deletes/day and 360 MB/day hosting download were the shape of the ceiling in 2026-08.
2. One unified subscription beats many narrow listeners, every time — and the listener is the one pattern
   worth a **lint ban**, because it is the only one that keeps spending after the user closes the tab.
3. Adaptive polling (10–30s) is a valid, cost-correct pattern when real-time isn't required.
4. Counters = `FieldValue.increment`; bulk work = batches; cleanup = scheduled server-side batched deletes.
5. Cost beats speed where the tradeoff is bearable — default to the free path.
6. **A rule with no failing check is documentation.** Put the two or three bans that cover the biggest
   budgets on steps that already run (`lint`, `test`), and list in the same place what is still unguarded.
7. **Fonts are the wrong suspect.** Google-served fonts cost the hosting quota nothing; the header on your
   own hashed assets is what decides whether a returning visitor costs a byte. Check the origin before you
   change it, and check that the header rule matches a file that exists before you call it optimized.

---

## Cross-References

- Cost philosophy: `02-engineering-practices/cost-optimization-strategy.md`
- Why a declared control needs a failing check: `02-engineering-practices/security-engineering.md` (rule 17)
- Where the checks run: `03-git-and-ci/local-ci-strategy.md`
- Paste-ready hosting header block: `global-configs/templates/firebase-hosting-headers.json.template`
- SDK/query reference (progressive disclosure): `.agents/skills/firebase-firestore/`
- Conflict resolution: `global-configs/skills/performance-audit.skill.md` (when cost and speed conflict, cost wins unless UX is measurably broken)
- Skill design patterns: `../../docs/repo-meta/skill-design-patterns.md`
