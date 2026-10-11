# Workflow Speed Reform Proposal — Making All Three Modes Actually Fast

**Date:** 2026-10-11
**Scope:** Central guidelines repo + the six projects synced from it
**Evidence base:** `D:\WebApps\gs-coordinator-helper` at `c598947` (D317), its 30 `guidelines-proposals/`,
and this repo's own `guidelines/` at HEAD
**Method:** Every number below is measured on 2026-10-11 and re-measurable; the command is given inline or
in the Appendix. Nothing here is estimated from a feeling.
**Companion:** `DOCUMENTATION_REFORM_PROPOSAL_2026-10-11.md` (shipped R1–R10). This proposal does **not**
re-open it; it attacks the axis that reform left untouched — *time*.
**Status:** **Implemented — S1–S16 shipped** (see §11). `npm run validate` exits 0; 82/82 script tests pass.

---

## 11. Implementation status (as applied)

Three waves, in order, each ending on a green gate. `npm run validate` = audit · check-links · check-index ·
check-drift · check-index-drift · docs:census · test:scripts. Test count went **54 → 82** (three new suites,
one retired).

### Wave A — give the mode teeth

| # | Shipped | Where |
|---|---|---|
| **S1** | `Context` is now the first row of the mode matrix: **≤40K / ≤90K / ≤160K** tokens before the first edit, with a four-point budget rule (pick don't hoard · one chain definition · a recorded overshoot · a cap that only rises is not a cap) | `speed-tiered-workflow.md` §The Context Budget, `development-workflow.md` Phase 2, `context-management-strategy.md` D7 |
| **S2** | The trigger table is **mode-aware** — one column per mode, `vibe` = 1 write, `standard` = 2, `guarded` = full set | `documentation-strategy.md` §Trigger Table |
| **S3** | New §Record vs Ritual: the decision number + entry never scale; the §20.7 pointer, the second file and the full set do | `documentation-strategy.md` |
| **S4** | `gate:fast` + `always` guards is the **vibe per-push gate**; the full pipeline runs at the ship boundary. **"full pre-push gate" was deleted from the all-modes absolutes** — the single highest-value edit | `fragments/00-preamble.md`, `fragments/20-testing.md`, `speed-tiered-workflow.md` §Absolute Rules + §The Gate Scales With the Mode, `local-ci-strategy.md` §Which Gate Runs |
| **S5** | Guards declare `@tier` (`always` \| `standard+` \| `ship`); the gate derives the set from the guards, keyed on mode — D314's mechanism generalised | `local-ci-strategy.md` §Guard Tiers, `testing-philosophy.md` §Guard Tiers |
| **S6** | Six automatic, evidence-based escalations; four of them escalate the **slice**, not the project | `speed-tiered-workflow.md` §Mode Transitions |

**Constitution budget:** the new dimension pushed the starter to 5,229/5,000. Per the repo's own doctrine
("retire or demote, never just add"), **seven rules were narrowed** — React stack detail, the behavioural-test
rule, the verification-tiers rule, the RTL portal rule, the upload-MIME rule, and two preamble trims — landing
at **4,997/5,000**. `check-drift` enforces it.

### Wave B — kill the per-slice prose tax

| # | Shipped | Where |
|---|---|---|
| **S7** | **New `npm run slice:close`** — derives the changelog entry, the decision number, the freshness line and the receipt pointer from the repository's own state. `--dry-run`, `--decision`, `--sha` overrides. 15 tests incl. the derivation proof | `scripts/slice-close.js`, `local-ci-strategy.md` §Slice Close |
| **S8** | One archive per quarter (`docs/changelog/<YYYY>-Q<n>.md`) with a `**Doc:**` column, not one file per document | `documentation-strategy.md` §History |
| **S9** | The freshness line is **written, never typed**; `bump-freshness.js` and its 7 tests were **retired** — the job moved into `slice:close`, which already knows the date and the SHA | `documentation-strategy.md` §Freshness, `WORLD.starter.md`, `AI_ARCHITECTURE.starter.md` |
| **S10** | Meta-guards budgeted at **under 5% of the suite**, each with a non-vacuity probe; prefer one regenerate-and-diff over a parity guard per document | `documentation-strategy.md` §Guards, `ai-governance-framework.md` |
| **S11** | The decision number is **derived** (`max(existing)+1` across the docs *and* the archives), not counted — the counter and its race are gone | `slice-close.js`, `documentation-strategy.md` §Record vs Ritual |

### Wave C — deliver, and measure

| # | Shipped | Where |
|---|---|---|
| **S12** | **New `npm run sync:drift`** — hashes each project's `_guidelines/` mirror against the source and **fails on any difference**. `sync:all` records the source hash on success and fails if the mirror it delivered does not match. `"Skip if mirror exists"` is gone, and the fragment now names `sync:all`/`sync:drift` instead of `npm run sync-guidelines`, which exists in no `package.json` | `scripts/check-sync-drift.js`, `fragments/90-project-setup.md`, `documentation-strategy.md` §Delivery, `sync-all.js` |
| **S13** | **New `npm run audit:friction`** — one pass over all four buckets (boot chain against the declared cap · doc-vs-code churn · mirror drift · proposals naming no guard), writes `docs/friction/<date>.md`, `--check-cadence` fails past 35 days. **A monthly automation now runs it across the central repo and the fleet** | `scripts/audit-friction.js`, `workflow-friction-audit.md` §Cadence |
| **S14** | A proposal must name **the guard that fails if the lesson is unlearned**; `audit:friction` reports the count, so the gap is visible | `documentation-strategy.md` §Guards, `fragments/60-ai-collaboration.md` |
| **S15** | `AGENTS.md` line 41 said "~7,000 tokens" (**truth: 5,000 in the manifest, 4,997 rendered**); line 64 described `validate` without `test:scripts`. Both fixed, both now quote their source | `AGENTS.md` |
| **S16** | One chain definition: `speed-tiered-workflow.md` owns it, `measure-boot-budget.js` reads the caps from that file and prints `OVER/within the vibe cap`, and its `DEFAULT_FILES` names the owner | `measure-boot-budget.js`, `speed-tiered-workflow.md` |

### Measured outcome

```
npm run validate          → exit 0 · 82/82 tests · 1020 links · 4 canonical facts, one home each
constitution budget       → 4,997 / 5,000 tokens (was 4,991; seven rules narrowed to pay for the new dimension)
npm run sync:drift        → ❌ 6 of 6 projects are not running the current rules   ← the finding, now visible
npm run audit:friction .  → 154,488 tokens · OVER the vibe cap of 40,000
                            docs +9,785 vs code +11,778 → 0.83 doc lines per code line
                            30 of 30 proposals name no guard
```

The first two instrument runs are the reform's own justification: **the boot chain is 3.9× the vibe cap**, and
**every dependent project is running older rules than it believes**. Both numbers were previously invisible.

### Still open (deliberately not done here)

- **Syncing the fleet.** `sync:drift` reports 6 of 6 behind; fixing that means running `npm run sync:all` and
  committing in six other repositories, which is a separate decision with its own review.
- **The `ship`-tier guard set.** S5 defines the tiers and the derivation; tagging the existing guards is
  per-project work, and the referenced repo already has the machinery (`@docs-guard`, the non-DOM lane).
- **`docs:verify`.** S10 prefers one regenerate-and-diff over a parity guard per document; the central repo
  has that for the index (`check-index-drift`) but not yet for the steering docs.


---

## Verdict

The guidelines have a speed model with one lever (`mode: vibe | standard | guarded`) and that lever is
wired to the wrong dimensions. It scales the depth of *thinking artifacts* — plan, test depth, verification
depth, prose depth — while the four things that actually consume a session are **mode-invariant**:

| What a session actually pays | Measured (referenced repo) | Scaled by `mode`? |
|---|---|---|
| Reading before the first edit | **~154,488 tokens** across 10 files | **No** — the bootstrap chain is identical in all three modes |
| Steering writes per slice | up to **6 files** (same-iteration table) | **No** — `WORLD.md`: vibe "does not buy a skip of the PRD-first mandate" |
| Gate run per push | the full pipeline; `--no-verify` forbidden | **No** — the constitution lists "full pre-push gate" as an *absolute* in every mode |
| Evidence artifact per slice | 1 receipt + changelog rows | **No** — same shape in every mode |

**So `vibe` ≈ `standard` minus one plan-approval gate.** Against 154K tokens of mandatory reading and a
six-file write, that is a rounding error. That is precisely the reported symptom: *the workflow is slow even
in vibe mode.*

The second finding is worse, and it is why a content reform alone cannot help: **the documentation reform
this repo already shipped has reached none of its six dependent projects.** All 105 guideline files differ
from the mirror in the referenced repo, which is 19 days old, while the sync registry asserts a date the
filesystem contradicts.

**Headline target:** first-edit reading **154K → ≤40K tokens (vibe)**; steering writes per slice **6 → 1 file
(vibe)**; per-push gate **full pipeline → the mode's gate**, with the full pipeline unchanged at the ship
boundary; and a sync that **fails** instead of a sync that is remembered.

---

## 1. What the referenced repo actually did (D268 → D317), measured

The campaign is real, well-executed, and worth generalising — it is the raw material for this reform. Seven
moves, each with a measured before/after:

| Move | Commit | What it changed | Measured effect |
|---|---|---|---|
| **Tier the loop by path** | D268 | The intra-slice loop runs the non-DOM lane instead of a diff | 130 files / ~13s, a superset of every structural guard |
| **Split the test lanes** | D268 | `test:unit` (130 files, ~13s) vs `test:ui` (66 files, ~64s) | The cheap lane is now the default |
| **Cache the loop, not the gate** | D313 | `gate:fast` caches lint + makes `tsc` incremental; the hook keeps the uncached lint | **~62s → ~24s warm** |
| **Derive the docs guard set** | D314 | Each guard declares `@docs-guard`; the gate derives the set from the docblocks | **5–7s** docs loop over 11 files / 1,191 tests; the hook carries no list to go stale |
| **Split the PRD by audience** | D316 | 156 acceptance bodies move to `docs/ACCEPTANCE.md`; §20.7 becomes an index | PRD shrinks; the acceptance file leaves the boot chain by design (ADR 028) |
| **Re-base the boot caps** | D317 | Every cap re-measured; the total frozen at the high-water mark | Caps stop carrying phantom allowance |
| **One copy of the mode value** | D310/D311 | Mode declared once in `WORLD.md`, cited elsewhere, guarded | `steeringParity.test.ts` clause 8 fails on a third copy |

**What to keep and generalise:** D268 (path-aware lanes), D313 (cache the loop, never the gate), D314 (a guard
declares its own trigger) and D311 (a declared value owes a check) are the four best ideas in the repo. This
proposal applies each of them to an axis the project could not reach from inside itself — *mode* and *delivery*.

---

## 2. What it cost — the paperwork ledger (measured)

```bash
cd /d/WebApps/gs-coordinator-helper
git log -40 --numstat --format="%h" | awk 'NF==3{if($3~/\.md$/){dl+=$1}else{cl+=$1}}END{print dl, cl, dl/cl}'
```

| Measure | Value | Command / source |
|---|---|---|
| Doc lines added vs code lines added, last 40 commits | **9,785 vs 11,778 → 0.83 doc lines per code line** | `git log -40 --numstat` |
| Same ratio over the whole history | 66,786 vs 188,644 → 0.35 | `git log --numstat` |
| **The recent "speed" period writes docs at 2.4× the historical rate per line of code** | 0.83 ÷ 0.35 | derived |
| Doc file-touches, last 30 commits | **163 of 305** (53%) | `git show --name-only` |
| Commits that are 100% documentation | 11 of the last 30 | same |
| Gate receipts | **165 files** | `ls docs/gate-receipts | wc -l` |
| Distinct decision numbers consumed | **289** | `grep -oE '\bD[0-9]{2,3}\b' docs/PRD.md docs/ROADMAP.md AGENTS.md | sort -u | wc -l` |
| Markdown files vs code files | **317 vs 545** | `git ls-files` |
| Commits on the busiest recent day | **19** (2026-10-10); 23 on 2026-10-08 | `git log --format=%ad` |

**Read that carefully.** A campaign whose stated purpose was *speed* produced, in its own window, doc churn
at 2.4× the historical rate relative to code. Every one of those slices paid the same-iteration steering tax
and wrote a receipt. The tax is not a side effect of the workflow — **it is the workflow**, and the campaign
was measuring the gate while the paperwork ate the session.

---

## 3. Root causes

### RC1 — The mode matrix scales the wrong dimensions
`speed-tiered-workflow.md` scales Plan, Tests, Verification, Docs *depth*, Commits. The measured costs are
Context (reading), Steering *breadth* (file count), Gate *scope*, and Evidence *production*. One of those
four appears in the matrix; the other three do not appear anywhere in the mode vocabulary.

### RC2 — The steering mandate is mode-independent by construction
The same-iteration table demands up to six files for one trigger:

| Trigger | Files that MUST change in the same iteration |
|---|---|
| New route / page / shared component / convention | `docs/PRD.md` §20.7 + `docs/ACCEPTANCE.md` + `docs/AI_ARCHITECTURE.md` + `docs/ROADMAP.md` + `docs/AI_CONTEXT.md` |
| Auth / RBAC / rules change | the above + `WORLD.md` + the deny-matrix suite |

`documentation-strategy.md` is proud that "each trigger names **exactly one file**". True per row — and a
single new component still matches five rows. The "one file per row" rule fixed *duplication*; it did nothing
about *fan-out*.

### RC3 — The boot budget is a ratchet, not a cap
`bootBudget.test.ts` documents **seven** re-basings (D184 → D218 → D239 → D254 → D255 → D263 → D317), each
applying `cap = ceil(measured × 1.1)`. The rule has never once forced a file down; it only slows growth. The
measured chain today:

```
chain total: ~154,488 tokens read before the first edit
docs/PRD.md      51,535   ← 33% of the chain, in ONE file
docs/ROADMAP.md  34,217
docs/AI_ARCHITECTURE.md 23,292 · docs/RUNBOOKS.md 18,140 · AGENTS.md 13,890
docs/adr/README.md 5,823 · WORLD.md 5,222 · DATA_POLICY 1,333 · DEVTOOLS 1,036
```

Two contradictions sit inside that table. First, `docs/PRD.md` is capped as a **whole file** while the
bootstrap instructs reading "the header + the sections for the current task — never the whole file": the
budget guards a document nobody reads in full. Second, `docs/PRD.md` and `docs/ROADMAP.md` are *living
documents that only grow* — "append D-numbers, never rewrite history" — so the largest two entries in the
chain are structurally incapable of shrinking. A ratchet pointed at a monotonic quantity is a growth curve.

### RC4 — The gate's cost is a function of repo age, not of risk
196 test files · 4,190 tests · 79.5s for the suite · 36 e2e suites · 80 rows in `GUARDS_INVENTORY.md`. The
hook runs the full pipeline on every push in every mode, and `--no-verify` is forbidden everywhere. D268 and
D314 proved the mechanism for making this *conditional* (path-aware lanes, derived guard sets) — but the
condition is *what changed*, never *which mode we are in*. A `vibe` push and a `guarded` push cost the same.

### RC5 — Evidence is prose, and prose needs guards to check the prose
One slice writes: a changelog entry (in up to four archive files), a D-number, a freshness header, a §20.7
pointer, and a receipt — all typed by hand. The repo then needs ~6 parity guards whose only job is to catch
the drift that hand-typing creates (`steeringParity`, `docsParity`, `changelogParity`, `freshnessGate`,
`bootBudget`, `guardInventory`). **The documentation strategy already states the fix** — "machine output is
referenced, never transcribed" — but applies it only to *verification numbers*, not to the steering writes
that surround them.

### RC6 — The ruleset is delivered by a manual, unverified copy
This is the finding that makes all others moot until it is fixed.

```bash
diff -rq D:/WebApps/gs-coordinator-helper/_guidelines D:/WebApps/global-guidelines-for-a-vibe-coder/guidelines
```

| Measure | Value |
|---|---|
| Guideline `.md` files that differ between mirror and source | **105 of 105** |
| Mirror mtime vs source mtime | **2026-09-22 vs 2026-10-11 — 19 days** |
| What `sync-projects.json` asserts | `gs-coordinator-helper … "lastSynced": "2026-09-26 02:34"` — a date the filesystem contradicts |
| Artifacts the project never received | `README.starter.md`, `check-doc-census.js`, `render-index.js`, `lib/run-sync.js`, 3 test suites |
| The instruction that permits this | `fragments/90-project-setup.md` line 61: *"Mirror guidelines into `_guidelines/` … **Skip if mirror exists**"* |
| The command that instruction names | `npm run sync-guidelines` — **exists in no `package.json`** (the real one is `npm run sync:all`) |
| Mandated always-read `README.md` in the project | **absent** — the instrument reports it, nothing fails |

The dependent repo is running the rules **as they were before the documentation reform**, and the tooling
reports it as `synced`. Every session there bootstraps from a 19-day-old copy of the doctrine.

### RC7 — The central repo has no instrument for its own process
`workflow-friction-audit.md` is a good *method* — symptom table, bucketing, ranking by frequency × duration —
and it ships **no command, no cadence, and no number**. The referenced project had to *write*
`measure-boot-budget.js` from scratch because the guideline handed it a method without an instrument. And
the audit has never run in the central repo: the repo's own `AGENTS.md` carries two untested claims about
itself (§5).

### RC8 — The lesson loop terminates inside one project
30 `guidelines-proposals/*.md` exist in the referenced repo. Nothing reads them centrally. Several say so
explicitly: *"applied at D162 … no further central-repo edits needed."* The mechanism that is supposed to
turn a hard-won lesson into a global rule is a directory that no one collects.

---

## 4. Reform principles

- **P1 — The mode scales CONTEXT and BREADTH, not just depth.** A mode that does not change how much you
  read or how many files you write is a label, not a mode.
- **P2 — Measure the session, not the artifact.** The unit of optimisation is intent → first running slice,
  and the costs are tokens read, files written, seconds gated.
- **P3 — A derived thing is never typed.** Counters, headers, changelog rows, mode values. If a tool can
  compute it, a human must not write it, and no parity guard is needed.
- **P4 — Conditions scale with risk.** Path-awareness proved this for *what changed*; apply it to *how
  guarded the mode is*.
- **P5 — Delivery is a gate.** An instruction to copy something is a wish. A hash comparison is a control.
- **P6 — Every lesson ships with a control or it is a wish.** A proposal without a failing check is prose.

---

## 5. Fix the central repo's own drift first (measured today)

The repo whose thesis is *"a claim about the docs is a test"* currently carries two untested claims about
itself:

| Claim | Where | Truth | Command |
|---|---|---|---|
| Constitution budget is "~7,000 tokens" | `AGENTS.md` line 41 | `fragments/manifest.json` says `maxTokens: 5000`; the rendered starter measures **4,991 tokens / 19,962 chars** | `node -e "console.log(require('fs').readFileSync('guidelines/global-configs/templates/AGENTS.starter.md','utf8').length/4)"` |
| `npm run validate` = "audit + check-links + check-index + check-drift + check-index-drift + docs:census" | `AGENTS.md` line 64 | `package.json` also runs **`test:scripts`** | `node -e "console.log(require('./package.json').scripts.validate)"` |

Both are one-line fixes. They matter here because a speed reform is only credible if the instrument that
proves it is itself correct — and because a stale number in the constitution is exactly the failure mode
`workflow-friction-audit.md` tells projects to hunt for.

---

## 6. The reform

### Wave A — Give the mode teeth (the only lever that exists)

| # | Change | Touches |
|---|---|---|
| **S1** | **Add `Context` as a fourth mode dimension — a *session* reading budget, not a file cap.** `vibe ≤ 40K tokens`, `standard ≤ 90K`, `guarded ≤ 160K` before the first edit. The bootstrap stops being a list to satisfy and becomes a budget to fit: name the 2–4 files the task needs; anything beyond the cap needs a one-line justification in the slice record. Fixes RC1 + RC3. | `speed-tiered-workflow.md` §Mode Matrix, `development-workflow.md` Phase 2, `context-management-strategy.md` |
| **S2** | **Make the trigger table mode-aware.** One row per (trigger × mode): `vibe` = **1 file** (the cheapest home — `AGENTS.md` §Mandates or the ADR), `standard` = 2, `guarded` = the full set. A new shared component must not cost five writes in vibe. Fixes RC2. | `documentation-strategy.md` §Trigger Table |
| **S3** | **Split "record" from "ritual".** `vibe` = one D-number + one changelog entry + the receipt. `standard` adds the §20.7 pointer + freshness. `guarded` adds the ADR + full steering set. The *record* survives in every mode; only the *ritual* scales. | `documentation-strategy.md`, `speed-tiered-workflow.md` §Accepted Trade-offs |
| **S4** | **`gate:fast` becomes the mode's per-push gate.** `vibe` → the fast loop per push, full pipeline at the ship boundary. `standard` → full pipeline per push. `guarded` → full + path-aware extras. `--no-verify` stays forbidden everywhere. **Deleting the phrase "full pre-push gate" from the absolutes list is the single highest-value edit in this document.** Fixes RC4. | `fragments/00-preamble.md`, `speed-tiered-workflow.md` §Absolute Rules, `local-ci-strategy.md` |
| **S5** | **Guard sets declare a `@tier` (`always` \| `standard+` \| `ship`).** `vibe` runs `always` + the guards whose subject files changed. This is D314's derived-guard-set mechanism with `mode` as the derivation key instead of `path` — the referenced repo already measured it working (11 files / 1,191 tests / 5–7s). | `local-ci-strategy.md`, `testing-philosophy.md` |
| **S6** | **Escalation is automatic and evidence-based.** Auto-escalate the *slice* to `standard`+ when the diff touches auth/rules/mail (already stated), **or** when the same test file fails twice, **or** when a `ship`-tier guard owns a changed path. A mode that must be remembered is a mode that will be wrong. | `speed-tiered-workflow.md` §Mode Transitions |

### Wave B — Kill the per-slice prose tax

| # | Change | Touches |
|---|---|---|
| **S7** | **`npm run slice:close` writes the derived artifacts.** One command emits the changelog entry (commit subject + receipt verdict), advances the D-number, and writes the receipt. The agent writes prose only where prose *is* the product: the PRD acceptance body and an ADR. Generalises "machine output is referenced, never transcribed" from numbers to steering writes. Fixes RC5. | `local-ci-strategy.md` §Receipts, `documentation-strategy.md` |
| **S8** | **One changelog archive, not four.** The referenced repo writes one event into `agents-2026-Q4.md`, `prd-2026-Q4.md`, `roadmap-2026-Q4.md`, `aicontext-2026-Q4.md` — four copies of one fact, each with its own parity guard. One `docs/changelog/<YYYY>-Q<n>.md` with a `**Doc:**` column. The repo already outlawed "one copy per rule"; this is the same rule for *events*. | `documentation-strategy.md` §History |
| **S9** | **Retire the freshness header.** `Last Updated / Commit / Change` is `git log -1 --format` on that path. The doc reform's own P6 says "metadata is derived, not typed"; apply it. `bump-freshness.js` exists only because the header is typed — and in the referenced repo it silently wrote `**Commit:** nosha` for months. | `documentation-strategy.md` §Freshness Header, `bump-freshness.js` |
| **S10** | **Budget the meta-guards.** Guards whose subject is another document may not exceed 5% of the suite, and each must carry a non-vacuity probe. Prefer **one** `npm run docs:verify` that regenerates every derived fact and diffs — the `check-index-drift` pattern the doc reform already shipped and proved. | `documentation-strategy.md` §Guards, `ai-governance-framework.md` |
| **S11** | **Derive the D-number; stop keeping the counter.** "The next D-number lives at the top of ROADMAP §2 and NOWHERE else" is a hand-maintained counter guarded by a parity test, 289 numbers deep, and the source of a real race (two concurrent sessions take the same number — a failure this project has already hit). `D<max+1>` computed at `slice:close`, written by the same command that writes the row. No counter, no parity guard, no race. | `documentation-strategy.md`, `AGENTS.starter.md` §Session Bootstrap |

### Wave C — Make the ruleset arrive, and measure the process

| # | Change | Touches |
|---|---|---|
| **S12** | **Sync becomes a gate.** Replace *"Skip if mirror exists"* with: a project fails `docs:verify` when `_guidelines/` differs from the central `guidelines/` at the commit the central `HEAD` names. `sync-projects.json` stores the **content hash** it synced, never a `lastSynced` date it does not verify. Fix the instruction that names the non-existent `npm run sync-guidelines`. Fixes RC6 — and until this ships, nothing else in this document reaches a project. | `fragments/90-project-setup.md`, `sync-projects.json`, `sync-all.js`, `check-project-freshness.js` |
| **S13** | **The central repo gets a friction instrument and a cadence.** `npm run audit:friction` = boot budget + doc-vs-code churn + canonical-copy count + sync drift, written to a dated artifact, run **monthly as an automation**. `workflow-friction-audit.md` currently has a symptom table and no command. Fixes RC7. | `workflow-friction-audit.md`, `package.json`, new script |
| **S14** | **A lesson arrives with a control, or it is a wish.** Require each `guidelines-proposals/*.md` to name (a) the target guideline file, (b) **the guard that fails if the lesson is unlearned**, (c) whether it applies centrally or project-locally. Have `validate` read every synced project's proposals directory and fail on an un-triaged proposal older than N days. Fixes RC8. | `documentation-strategy.md`, `ai-governance-framework.md`, `check-doc-census.js` |
| **S15** | **Fix §5's two stale claims and guard them.** The census machinery already exists. | `AGENTS.md` lines 41, 64 |
| **S16** | **One definition of "the boot chain".** Today the guidelines' instrument measures **10 files / 154,488 tokens** on the referenced repo while that repo's own guard caps **6 files / 126,461** with a 163,976 ceiling — two numbers, one subject, no shared definition. Publish the chain in `speed-tiered-workflow.md`; both the instrument and the project guard read it from there. | `speed-tiered-workflow.md`, `measure-boot-budget.js`, `AGENTS.starter.md` |

---

## 7. The mode matrix, before and after

| Dimension | Today: vibe | Today: standard | Today: guarded | **Reformed: vibe** | **Reformed: standard** | **Reformed: guarded** |
|---|---|---|---|---|---|---|
| **Context (new)** | full chain | full chain | full chain | **≤40K, task-scoped** | ≤90K | ≤160K |
| Plan | 3 bullets | feature plan | plan + arch review | unchanged | unchanged | unchanged |
| Tests | smoke + 2nd bite | with code | full pyramid | unchanged | unchanged | unchanged |
| **Steering writes (changed)** | **up to 6 files** | up to 6 files | up to 6 files | **1 file** (D-number + entry) | 2 files | full set + ADR |
| **Gate per push (changed)** | **full pipeline** | full pipeline | full + path extras | **`gate:fast`** | full pipeline | full + path extras |
| **Guards run (changed)** | **all** | all | all | **`always` + changed subjects** | all | all |
| **Evidence (changed)** | hand-written rows | hand-written rows | hand-written rows | **`slice:close` derives it** | derived | derived + ADR |
| Ship boundary | critical flows LTR+RTL, full gate | same | same | **unchanged — never scales** | unchanged | unchanged |
| Security / honesty | absolutes | absolutes | absolutes | **unchanged — never scales** | unchanged | unchanged |

The last two rows are the point: the reform buys speed **only** by removing mode-invariant ceremony from the
inner loop. Nothing that protects a ship, a secret, or the truth moves.

---

## 8. Guards, so it cannot regrow

| Guard | Fails when |
|---|---|
| `context:budget` | a session's declared reading list exceeds the mode's token cap |
| `mode:breadth` | a slice writes more steering files than its mode permits |
| `gate:mode` | a `vibe` push runs a `ship`-tier guard set, or a `ship` boundary runs less than the full pipeline |
| `sync:drift` | `_guidelines/` differs from the central `guidelines/` at the recorded hash (S12 — the load-bearing one) |
| `docs:verify` | any derived doc fact (D-number, header, changelog row) differs from what the generator emits |
| `meta-guard budget` | guards-about-docs exceed 5% of the suite, or a guard lacks a non-vacuity probe |
| `proposal:triage` | a synced project holds a proposal that names no guard and has been un-triaged past N days |
| `friction:cadence` | no `docs/friction/` artifact exists within the last 35 days |

Each mirrors an existing pattern in this repo — `check-index-drift` (regenerate and diff), `docs:census`
(one home per fact), `check-drift` (a budget that fails) — so none of them requires new machinery to invent.

---

## 9. Risks and trade-offs

| Risk | Mitigation |
|---|---|
| A 40K context budget makes a session miss a rule it needed | The budget is a *budget*, not a blindfold: a one-line justification may exceed it, and the overshoot is recorded. `guarded` exists for work that genuinely needs the whole chain. |
| Vibe push + fast loop lets a regression reach `master` | `master` must still be validatable; the fast loop is per-push, the full pipeline is per-merge-to-ship and per-milestone. The referenced repo already runs the full suite once per push *and* the loop — S4 moves the full suite to where it catches something new, not to nowhere. |
| One changelog file becomes a large file | It is an archive, split by quarter, read on demand — the property that made the current four files tolerable. Four files do not make each one smaller; they make each one a copy. |
| Deriving the D-number breaks a workflow that greps for it | The derived number is still written to the same place; only its *production* changes. The referenced repo's own parity guard becomes unnecessary rather than violated. |
| Sync-as-a-gate blocks work in a project that is mid-slice | Ship S12 with a `--force` that records the hash and the reason, so a stale mirror is a **recorded** decision rather than a silent default. |
| Auto-escalation surprises the operator | Every escalation writes one line naming the trigger. Escalation is already automatic for auth/rules in `WORLD.md`; S6 only extends the same mechanism. |

---

## 10. What we deliberately keep

- **The three modes themselves.** The vocabulary is right; only the wiring is wrong.
- **Absolute security and honesty rules.** Never scaled, in any wave.
- **The ship boundary.** Critical flows in both directions, full gate, before any release.
- **The receipt pattern** (`gate:receipt`) — machine-written evidence, cited by path. S7 extends it; it does
  not replace it.
- **Path-aware gates and derived guard sets** (D268, D313, D314) — generalised to mode, not discarded.
- **`guidelines-proposals/`** — the loop is right; it needs a destination and a triage guard, not a rewrite.
- **The doc-set census and one-home-per-fact doctrine** — S8 applies the same doctrine to events.

---

## Appendix — reproduce every number

```bash
# --- the referenced repo ---------------------------------------------------
cd /d/WebApps/gs-coordinator-helper

# boot chain (authoritative instrument, from the central repo)
node /d/WebApps/global-guidelines-for-a-vibe-coder/guidelines/global-configs/scripts/measure-boot-budget.js .
#   → chain total: ~154,488 tokens ; missing files: 1 (README.md)

# doc-vs-code churn, last 40 commits
git log -40 --numstat --format="%h" | awk 'NF==3{if($3~/\.md$/){dl+=$1}else{cl+=$1}}END{print "docs",dl,"code",cl,"ratio",dl/cl}'
#   → docs 9785 code 11778 ratio 0.83

# doc file-touches per commit, last 30
for h in $(git log --format=%h -30); do
  t=$(git show --name-only --format= $h | grep -c .); d=$(git show --name-only --format= $h | grep -cE '\.md$'); echo "$h $t $d"; done

# receipts, decisions, docs vs code files
ls docs/gate-receipts | wc -l                                    # 165
grep -ohE '\bD[0-9]{2,3}\b' docs/PRD.md docs/ROADMAP.md AGENTS.md | sort -u | wc -l   # 289
git ls-files '*.md' | wc -l ; git ls-files '*.ts' '*.tsx' '*.mjs' '*.cjs' | wc -l     # 317 / 545

# mirror drift
diff -rq _guidelines /d/WebApps/global-guidelines-for-a-vibe-coder/guidelines | grep -c differ   # 105
stat -c '%y' _guidelines/01-workflow-methodology/speed-tiered-workflow.md                        # 2026-09-22
cat /d/WebApps/global-guidelines-for-a-vibe-coder/sync-projects.json | grep -A2 gs-coordinator   # claims 2026-09-26

# --- the central repo ------------------------------------------------------
cd /d/WebApps/global-guidelines-for-a-vibe-coder
node -e "console.log(require('fs').readFileSync('guidelines/global-configs/templates/AGENTS.starter.md','utf8').length/4)"  # 4991
grep -n '"maxTokens"' guidelines/global-configs/fragments/manifest.json                            # 5000
grep -n "7,000" AGENTS.md                                                                          # line 41 — stale
node -e "console.log(require('./package.json').scripts.validate)"                                  # includes test:scripts
grep -n "npm run validate " AGENTS.md                                                              # line 64 — omits it
grep -n "Skip if mirror exists" guidelines/global-configs/fragments/90-project-setup.md            # line 61
grep -rn "npm run sync-guidelines" package.json                                                    # no match — the named script does not exist
ls guidelines-proposals/*.md 2>/dev/null || ls /d/WebApps/gs-coordinator-helper/guidelines-proposals/*.md | wc -l   # 30
```
