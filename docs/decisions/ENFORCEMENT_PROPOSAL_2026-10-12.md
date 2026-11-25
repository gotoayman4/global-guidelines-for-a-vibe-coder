# Enforcement Proposal — Making the Amended Rules Self-Enforcing

**Date:** 2026-10-12
**Scope:** the central guidelines repo (`global-guidelines-for-a-vibe-coder`), and every
project that mirrors it.
**Status:** proposal. Each item names the change, the cost it removes, and **the control that
fails if the lesson is unlearned** — this repo's own rule is that a proposal without a control
is a wish.

**Shipped the same day.** E1–E4 are implemented and green (`npm run validate`: 202 tests, 0
failures; GAMS re-synced and passing `guard:tiers` + the drift controls check). What landed, and
where it deviated from the sketch — the deviations are the interesting part:

| # | Shipped as | Deviation, and why |
|---|---|---|
| **E1** | `check-guard-tiers.js` + `npm run guard:tiers`, wired **into** `validate`; `@tier` declared on all 10 guards | The key is **`@tier`**, not `@docs-guard` — the setup skill's §5f already mandated that name, and the doctrine's `@docs-guard` line named a docblock that existed nowhere. "`validate` EQUALs always+standard+" was **softened**: six guards are milestone- or fleet-scoped by design, so the rule is `always ⊆ gate` (fatal) plus unreached-`standard+` (reported). Both soften further inside a `_guidelines/` mirror, where the guard set is central and the wiring is a deliberate subset. |
| **E2** | `control:` front-matter; `audit-rules.js` fails a control that is named and unresolvable; `new:guideline` scaffolds the key | Shipped as specified. Ratchet holds: 2 guidelines declare a control, 61 are unclassified, none failed. |
| **E3** | `sync-manifest.json` §guards declares the required set; `check-sync-drift.js` verifies each project wires it **by file, not by script name** | The set is **declared, not derived from `@tier`** — a tier says *when* a guard runs, not *where* it is meaningful (`check-links.js` guards the guidelines tree; `check-doc-breadth.js` is a project milestone obligation). |
| **E4** | `guard-inventory` is the census's fifth canonical fact | Made **corpus-aware**: the starter template ships `[FILL]`s and names no guard, so the fact is skipped against templates and *reported* (never failed) when a project names none. A single incidental mention is not an inventory — the threshold is two. |

---

## 1. The question

This session amended the doctrine in five places. Three of those amendments *are* controls —
they shipped with a guard, a reversal proof, and a test. Two are prose. The enforcement
question is therefore not "how do we enforce the amendments?" but:

> **Which amendments are controls, which are still prose, and what is the meta-rule that
> stops a future amendment from landing as prose?**

That last clause is the real subject. A rule about rules — a breadth column, a guard tier, a
chain-versus-menu split — is only enforced when something checks the *shape of the controls*,
not merely the content of the documents.

---

## 2. What was amended, and what already enforces it

| # | Amendment | Home | Control that exists | Proof |
|---|---|---|---|---|
| 1 | **The mode binds the write breadth** — `vibe` writes 1 steering file, `standard` 2, `guarded` the full set | `documentation-strategy.md` §Guards, §Trigger Table; anti-pattern rows 160/163 | `npm run guard:breadth` (`check-doc-breadth.js`) | 14 tests; mutation proof — forcing `violation:false` fails exactly tests 5,6,8,13; swept against all 29 GAMS commits: 0 violations |
| 2 | **The chain and the menu are two numbers, and only the chain is budgeted** | `speed-tiered-workflow.md` §The Context Budget; `documentation-strategy.md` §The Mandated Doc Set | `measure-boot-budget.js` (single reader `lib/context-caps.js`) | `docs:boot:strict` — chain 14.2K vs the 40K `vibe` cap; the menu is reported, never summed |
| 3 | **A sync tool must ignore what it writes** | `local-ci-strategy.md` §Tier B item 8 | `tests/sync-gitignore.test.js` (9 tests) | reversal proofs: drop the `backups` section → fails naming the path; re-hardcode an entry → fails the single-home check; verified end to end on GAMS (`.gitignore` md5 identical across two runs) |
| 4 | **§Guard Tiers — `always` / `standard+` / `ship`** | `local-ci-strategy.md`:46–56 | **none** | — |
| 5 | **§Slice Close — the steering writes are derived too** | `local-ci-strategy.md` §Slice Close | `slice-close.js` + `guard:decisions` | `--adr` writes the five sites from one invocation; non-vacuity: a second run returns `n+1` |

**Read the table's shape.** The three amendments that changed how a *slice* behaves all
shipped with a control. The two that changed how the *process* describes itself are prose —
and one of them (row 4) is precisely the mechanism every other row depends on.

---

## 3. The gap, measured

`local-ci-strategy.md`:56 states the rule and the mechanism:

> The mechanism is not new: it is the `@docs-guard` docblock the documentation gate already
> derives its set from… **Derive the set from the guards themselves** — a list kept by hand
> in the hook is a list that goes stale, and it fails in the direction nobody notices.

Measured in this repo today:

```
guards in guidelines/global-configs/scripts/check-*.js ......... 9
guards that declare a TIER in their docblock ................... 1   (check-doc-breadth.js, added this session)
guards that declare @docs-guard ................................ 0
guards reachable from `npm run validate` ....................... 3 of 9
```

Every one of the 9 guards has an npm script — and **6 of them run in no chain at all**:

| Guard | Its script | Reached by `validate`? |
|---|---|---|
| `check-links.js` | `check-links` | **yes** |
| `check-index-coverage.js` | `check-index` | **yes** |
| `check-doc-census.js` | `docs:census` | **yes** |
| `check-decision-index.js` | `guard:decisions` | no |
| `check-doc-breadth.js` | `guard:breadth` | no |
| `check-docs-freshness.js` | `docs:check` | no |
| `check-gate-wording.js` | `guard:gate-wording` | no |
| `check-project-freshness.js` | `status:projects` | no |
| `check-sync-drift.js` | `sync:drift` | no |

That is not a defect in those six guards — three of them are milestone-exit obligations by
design (`documentation-strategy.md` §Record vs Ritual). It is the predicted consequence of
the missing control: **nothing derives which chain a guard belongs to, so membership is a
hand decision, and a hand decision is invisible when it is never made.** The doctrine names
the failure mode and ships nothing that detects it.

This is the same class the `gate-completeness-audit` skill exists for: **a control that
exists but is never reached.**

---

## 4. Proposed controls

Ordered by leverage. Each is independently shippable.

### E1 — `guard:tiers`: a guard declares when it must run, and the set is derived

The direct control for amendment 4 (proposal A2 of the analysis). A new guard,
`check-guard-tiers.js`, asserting four things about the guard set:

1. **Every** `check-*.js` guard declares `TIER: \`always\` | \`standard+\` | \`ship\`` in its
   file-level docblock. A guard with no tier fails — the tier is not optional, because an
   unclassified guard is a guard nobody can place in a chain.
2. The tier is one of the three named values. A typo fails rather than silently classifying.
3. **The chain is derived, not listed.** `npm run validate` must equal the set of guards whose
   tier is `always` or `standard+`; the `ship`-tier set must be reachable from the ship
   boundary. A guard added to the directory and to no chain fails; a guard in a chain but
   absent from the directory fails.
4. **No `ship`-tier guard runs in a `vibe` loop.** The `vibe` gate's reachable set is
   `gate:fast` + the `always` tier; a `ship` guard reachable from it fails.

**Cost it removes:** the hand-kept step list and its drift — the exact defect that produced
F3, where a project wrote the full pipeline unconditionally and then locked it in with a
guard of its own. It also makes the four currently-unreached guards a *deliberate* tier
choice instead of an accident.

**Reversal proof required:** mutate each of the four assertions and confirm a named test
fails. Specifically — remove a `TIER:` line and the tier test fails naming the file; add a
`ship` guard to `gate:fast` and the mode test fails; add a new `check-*.js` with no chain
entry and the derivation test fails. This mirrors `check-doc-breadth.test.js`, which proved
non-vacuity by mutating the violation expression.

**Risk:** low, and self-limiting. The guard reads only `package.json` and the docblocks; it
touches no product path. The one real cost is that backfilling a tier onto the 8 existing
guards forces a decision per guard — which is the point, and is a one-time ~30-minute pass.

### E2 — A rule cannot exist without a control that exists

The meta-rule. The repo already scaffolds guidelines with `npm run new:guideline` and audits
them with `npm run audit`. Extend both:

- **Front-matter gains an optional `control:` field** naming the guard that enforces the rule
  (`control: guard:breadth`). `render-index.js` ignores unknown keys, so the generated tables
  are unaffected; `docs:census` is unaffected because this is not one of the canonical facts.
- **`audit-rules.js` fails a dangling control** — a guideline that names a guard which is not
  a declared npm script, or names a guard that does not exist on disk. A rule that points at
  a control that was deleted is worse than a rule with no control: it reads as enforced.
- **Ratchet, not backfill.** Only guidelines added or *amended* must declare a control. The
  existing corpus is not touched in one pass — consistent with the repo's
  retire-or-replace ratchet. A guideline with no `control:` and no amendment stays as it is.

**Cost it removes:** the whole class "amendment landed as prose." After E2, the session's own
row 4 could not have shipped without either a control or an explicit, reviewable
`control: none — rationale` marker.

**Reversal proof required:** a test fixture guideline whose `control:` names a non-existent
script must fail `audit`; one that names a real script must pass; one with no `control:` field
must pass (the ratchet).

**Risk:** medium — it is a schema change to every guideline's front-matter, even if only
enforced going forward. The `_index` renderer and the census both read front-matter, so both
need a test asserting they tolerate the new key. This is the item to prototype on one file
before committing to the field name.

### E3 — Propagate the controls downstream, not just the prose

The mirror sync carries documents; it does not carry controls. GAMS received `guard:breadth`
only because this session ran the sync and hand-wired the npm script. That is the same
hand-kept-list defect one level up.

- **The setup skill writes the tier docblock into every guard it scaffolds**, so a new
  project's guards are classified from the first one.
- **`sync-manifest.json` declares the guard scripts a project must have**, exactly as it now
  declares the gitignore entries — one home, derived by both writers (the pattern proven this
  session in `04fad28`).
- **`check-sync-drift.js` extends from documents to controls**: a project whose mirror is in
  sync but whose `package.json` lacks a declared guard fails.

**Cost it removes:** the divergence between the central repo's controls and a downstream
project's. Today the two are aligned by hand, per project, per sync.

**Reversal proof required:** a fixture project missing one declared guard script fails
`sync:drift`, naming it.

### E4 — Census the control set

The lightest item, and it can ship first. `docs:census` already fails when a canonical fact
appears in more than one mandated document. Add one fact to its set: **the guard inventory**.
If two documents each list the guard set, or a document lists a guard that does not exist, the
census fails.

**Cost it removes:** a second hand-kept copy of the guard list in prose — the drift that the
census was built for, applied to the one list the census does not yet cover.

**Reversal proof required:** a fixture with two guard inventories fails; one with a stale
entry fails; the current repo passes.

---

## 5. Sequencing

| Order | Item | Why here |
|---|---|---|
| 1 | **E1** (`guard:tiers`) | It is the control the doctrine already specifies and the only outstanding Wave-A item. It also *unblocks* E4 — once tiers exist, the inventory is derivable rather than listed. |
| 2 | **E4** (census the inventory) | Cheap, and it closes the prose copy of the list while E1's tier set is fresh. |
| 3 | **E3** (propagate) | Needs E1's tier format settled before the setup skill and the manifest can declare it. |
| 4 | **E2** (the meta-rule) | Highest leverage, highest blast radius. Prototype the front-matter key on one amended guideline, confirm `render:index` and `docs:census` tolerate it, then adopt. |

E1 and E4 together make the guard set self-describing; E3 makes it travel; E2 makes the next
amendment unable to avoid it. Ship E1 alone and the session's row 4 is enforced; ship all
four and the *category* is closed.

---

## 6. What this proposal does not claim

- It does not claim the three shipped controls are sufficient. They are sufficient for their
  own rules; E1 is what makes their placement in a chain a decision rather than an accident.
- It does not propose re-tiering the 8 unclassified guards now. That is E1's first run, and
  its output is a review, not a mechanical fill.
- It does not touch the mandated doc set. `docs:census` counts 4 facts across 6 documents and
  this proposal adds a fact to the *census input*, not a document to the set.

---

## 7. Cross-References

`local-ci-strategy.md` §Guard Tiers (the rule and the mechanism) ·
`documentation-strategy.md` §Guards (the breadth control this generalises) ·
`workflow-friction-audit.md` (mis-tiered and unreached controls) ·
`GAMS_WORKFLOW_SPEED_ANALYSIS_2026-10-12.md` §7 (proposal A2, and the F-series measurements) ·
`WORKFLOW_SPEED_REFORM_PROPOSAL_2026-10-11.md` (D314 — derive the docs guard set)
