# GAMS Workflow-Speed Analysis — Where the Central Guidelines Spend an AI Agent's Time

**Date:** 2026-10-12
**Subject repo:** `D:\WebApps\Graduate-Affairs-Management-System-GAMS` @ `c845c9c` (27 commits, `mode: vibe`)
**Guideline source:** this repo, mirrored into GAMS at `_guidelines/` — **verified in sync, 0 of 106 files differ** (`diff -rq`)
**Companions:** `WORKFLOW_SPEED_REFORM_PROPOSAL_2026-10-11.md` (S1–S16), `DOCUMENTATION_REFORM_PROPOSAL_2026-10-11.md` (R1–R10)
**Method:** every number below is measured on 2026-10-12 against the GAMS working tree and its git history; the command is given inline or in the Appendix. Nothing here is estimated from a feeling.

---

## Verdict

GAMS is the **first dependent repo to run the reformed guidelines end-to-end** — its `_guidelines/` mirror is byte-identical to this repo's `guidelines/`, and its `AGENTS.md` already carries the reformed mode vocabulary (`Context ≤40K/≤90K/≤160K`, `Steering writes 1/2/full`, `gate:fast` in vibe). The delivery half of the reform (S12) worked. **The wiring half did not.**

Four measured findings, in order of cost:

| # | Finding | Measured | Verdict |
|---|---|---|---|
| **F1** | The boot chain a session is told to read exceeds the mode's own cap | **65,230 tokens** vs a `vibe` cap of **40,000** — 63% over | The mode's Context row is declared but not enforced |
| **F2** | The paperwork outruns the code | **0.82 doc lines per code line**; **11 of 27 commits (41%) are 100% documentation**; 79 `.md` files vs 50 code files | Two thirds of the doc set is the *record* (keep); one third is *ritual* (derivable, still typed) |
| **F3** | The per-push gate is mode-invariant | `vibe` declared, yet `.husky/pre-push` runs the **full pipeline** — ~**50.7 s** per push | The central guidance contradicts itself; see §7 |
| **F4** | Two of the three manual writes per decision are derivable | 50 ADRs, each costing a hand-typed ADR-index row **and** a `docs/PRD.md` §24 row; `slice:close` writes neither | `slice:close` covers 2 of 5 artifacts; the other 3 are typed |

**Headline:** the guidelines are no longer *content*-slow — they are **wiring**-slow. `vibe` currently buys GAMS a 3-bullet intent and a one-line report, and nothing else: the reading is the same 65K, the gate is the same 50 s, and the steering fan-out is the same 15–27 files per slice. That is exactly the symptom the speed reform set out to kill, reproduced in the first repo that adopted it.

---

## 1. Evidence base

```bash
cd /d/WebApps/Graduate-Affairs-Management-System-GAMS
git rev-list --count HEAD                      # 27
git log --reverse --format='%ad' --date=iso | head -1   # 2026-10-11 14:52:48 +0300
git log --format='%ad' --date=iso | head -1             # 2026-10-12 06:47:39 +0300
node _guidelines/global-configs/scripts/measure-boot-budget.js .
```

**The window:** 27 commits in **15 h 55 m**, all by one author (`Dr. Ayman Saleh`). This is a bootstrap-and-first-feature window, not steady state — read every figure below as *bootstrap cost*, and the question as *does bootstrap cost compound into steady state?*

**What the repo is:** Electron desktop + bilingual portal over Firebase, zero-spend discipline, single vibecoder, **no human ever reads it** (`docs/adr/024-no-human-code-review-substitute.md`: "No human code review exists; four substitute controls for auth work"). It is the purest test case this repo has: an AI-only, single-operator, guidelines-faithful project.

---

## 2. Where the AI agent's time actually goes (measured)

### 2.1 Reading before the first edit — 65,230 tokens, over the cap

`measure-boot-budget.js` (this repo's own instrument) on GAMS:

| File | Tokens | Share | Note |
|---|---|---|---|
| `docs/PRD.md` | **26,981** | **41.4%** | 1,027 lines; one file is two fifths of the chain |
| `docs/RUNBOOKS.md` | 10,500 | 16.1% | written before any runtime exists; carries a 1,116-char table row |
| `AGENTS.md` | 8,759 | 13.4% | the constitution |
| `docs/AI_ARCHITECTURE.md` | 5,178 | 7.9% | |
| `WORLD.md` | 4,125 | 6.3% | |
| `docs/ROADMAP.md` | 3,242 | 5.0% | |
| `docs/adr/README.md` | 2,449 | 3.8% | |
| `docs/DATA_POLICY.md` | 2,100 | 3.2% | |
| `README.md` | 1,235 | 1.9% | |
| `DEVTOOLS.md` | 661 | 1.0% | |
| **chain total** | **65,230** | 100% | **vibe cap 40,000 → OVER by 25,230** |

The instrument also reports 3 format findings (a 699-char paragraph in `AGENTS.md`, 607 in `PRD.md`, a 1,116-char table row in `RUNBOOKS.md`) — and, importantly, it reports them **without failing anything**.

**Two things are true at once.** First, the guideline already says the chain is *a menu, not a checklist* — "name the 2–4 files THIS task needs" (`AGENTS.md` §Session Bootstrap). A disciplined session does not read 65K. Second, **nothing measures whether it did.** The cap is a sentence in a table; there is no failing check, so the 41% of the chain that is one file is invisible to the gate. A budget with no guard is the exact shape `context-management-strategy.md` names as a non-budget.

### 2.2 The paperwork ledger — 0.82 doc lines per code line

```bash
git log --numstat --format="" | awk 'NF==3{if($3~/\.md$/){dl+=$1}else{cl+=$1}}END{print "docs",dl,"code",cl,"ratio",dl/cl}'
# docs 7517 code 9202 ratio 0.816888
```

| Measure | Value |
|---|---|
| Doc lines added / code lines added | **7,517 / 9,202 → 0.82** |
| Total lines added (all files) | 16,719 (796 deleted) |
| Commits that are 100% documentation | **11 of 27 (41%)** |
| `.md` files vs code files tracked | **79 vs 50** |
| ADRs | **50 files**, 129,031 chars ≈ **32,258 tokens** (6 full, 43 lite, 1 numbering gap at 041) |
| Gate receipts | 11 |
| `guidelines-proposals/` | 4 |
| Changelog archive | 41,863 chars ≈ 10,465 tokens, 18 entries |

For comparison, this repo's own reform proposal measured the referenced repo (`gs-coordinator-helper`) at **0.83** doc lines per code line over its last 40 commits. **GAMS reproduced the ratio almost exactly — on its first day, before shipping a single feature.** That is the strongest single piece of evidence in this analysis: the ratio is not a property of a mature repo's history, it is a property of the workflow, and it is present from commit one.

### 2.3 The per-push gate — ~50 s, identical in every mode

From the receipts (machine-written, `docs/gate-receipts/`):

| Step | First receipt (`6c65358`) | Latest receipt (`4823a65`) |
|---|---|---|
| `lint` | 11.5 s | 5.6 s |
| `type-check` | 12.9 s | 13.4 s |
| `test` | 12.2 s | 6.4 s |
| `test:rules` (emulator) | — (not yet wired) | **20.3 s** |
| `build` | 9.1 s | 2.4 s |
| `audit:gate` | 11.0 s | 2.6 s |
| **total** | **56.7 s** | **50.7 s** |

The declared mode is **`vibe`**. Per `speed-tiered-workflow.md` §The Gate Scales With the Mode, a `vibe` push should run `gate:fast` + the `always` guard tier, and defer the full suite, the build and e2e to the ship boundary. GAMS runs **all six steps on every push**, and its own `check-hooks.mjs` *enforces* that it does — the guard's alias table requires `test`, `rules`, `build`, `audit` and `clean-tree` to be present. The mode-gated gate is not merely unused; it is **locked out** by a guard that was written to match contradictory upstream text (§7).

**Cost shape matters more than the total.** `type-check` (13.4 s) and `test:rules` (20.3 s) are 66% of the gate, and both scale with repo age, not with risk — exactly RC4. The build (2.4 s) and audit (2.6 s) are cheap but are *ship-boundary* steps running forty times where they cannot catch anything new.

### 2.4 The decision apparatus — three hand-typed rows per decision

Per decision, GAMS writes:

| Artifact | Written by | Cost |
|---|---|---|
| Changelog entry (`docs/changelog/2026-Q4.md`) | `npm run slice:close` | **automated** ✅ |
| Freshness line (`WORLD.md`, `AI_ARCHITECTURE.md`) | `npm run slice:close` | **automated** ✅ |
| Gate receipt | `npm run gate:receipt` | **automated** ✅ |
| ADR file (`docs/adr/NNN-slug.md`) | the agent | prose — **keep** |
| ADR index row (`docs/adr/README.md`) | the agent | **derivable, typed** ❌ |
| `docs/PRD.md` §24 row | the agent | **derivable, typed** ❌ |

Three of six are automated; three are typed. Of the three typed, **one is the product (the ADR reasoning) and two are pure index rows** — a fact that already exists in the ADR file's own front-matter, retyped into a table, plus a third copy in the PRD's decision log. That is the "one canonical copy per rule" violation this repo outlaws, applied to *decisions*.

### 2.5 The one-time investment that paid for itself

`docs/adr/039-phase-0-gate-pipeline.md`: every guard was **reversal-proven** — shown to fail against a deliberately broken input before being trusted. That ritual is expensive and it is the best value in the repo. It found real, silent defects that no green gate would ever have reported:

- `setup-hooks.mjs` exists because husky 9.1.7 exits **0** when its `spawnSync` fails (`EBUSY` here) — so `npm install` finished clean with hooks **off**.
- The clean-tree step decided on git's **stat cache**; four files were reported ` M` while their blobs hashed identically (D50).
- Receipts were written with ANSI escapes and CRLF, against what `AGENTS.md` always claimed (D50, latest commit).

**This is the cost to protect, not to cut.** The triage in §3 separates it from the ceremony.

---

## 3. What is necessary, and what is ceremony

| Item | Necessary? | Why |
|---|---|---|
| The **record** — decision number, one-line entry, receipt path | **Yes, always** | The repo is read only by AI. Sessions have no memory; the record is the *only* thing stopping a later session from reversing a settled decision. This is not documentation, it is the agent's persisted state. |
| ADR **bodies** for irreversible decisions | **Yes** | The reasoning is the product. 6 full ADRs for 50 decisions is already the right ratio. |
| `docs/PRD.md` as the spec | **Yes** | It is what the agent implements against. |
| Security / honesty absolutes; the ship boundary | **Yes, never scales** | |
| **Reversal-proofing** guards | **Yes — one-time** | §2.5. The cheapest defect-detection the repo has. |
| The full pipeline **on every push** in `vibe` | **No** | A `vibe` push and a `guarded` push cost the same; the build and audit cannot catch anything new forty times a day. Defer to the milestone/ship boundary. |
| Reading the **whole** boot chain | **No** | The guideline already says it is a menu. The cap exists; the enforcement does not. |
| **ADR-index rows and PRD §24 rows** | **No** | Pure restatement of front-matter that already exists. Derive them. |
| Freshness headers | **Already solved** | `slice:close` writes them — the reform worked. Do not regress it. |
| Human-onboarding prose, "understand in 5 minutes", screen-reader line limits | **No** | **No human ever reads this repo.** The only remaining audience is a model. |
| `docs/RUNBOOKS.md` at 10.5K tokens, written pre-runtime | **Not yet** | Procedures for a system that does not run yet. Load on demand; do not sit in the chain. |

---

## 4. Can it be minimized — and what breaks if it is

| Change | Saves (measured) | Risk | Mitigation |
|---|---|---|---|
| Wire the gate to the mode: `vibe` push = `gate:fast` + `always` tier | ~**31 s/push** (drop `build` + `audit` + `test:rules` from the per-push loop; keep `lint`+`type-check`+`test`) | A regression reaches `main` between milestones | The `always` tier (security, honesty, structural) still runs per push; milestone exit runs the full pipeline; the ship boundary never scales. Nothing is *skipped* — it is *deferred to a named boundary*. |
| Cut the chain to ≤40K: split `PRD.md` (§22 state machines, §24 log, acceptance bodies → on-demand files) | ~**27K → ~9K** for the PRD row; chain ~65K → ~44K | A session misses a rule it needed | Task-scoped reading is already mandated; keep a task→file index; the budget may be exceeded with a one-line recorded justification. |
| Extend `slice:close` to write the ADR stub + index row + §24 row | **2 hand-typed rows per decision** (50 rows already) | A generator bug silently rewrites a decision log | Append-only; the `check-index-drift` pattern (regenerate → diff → fail) is already proven in this repo; add a non-vacuity probe. |
| Enforce the boot cap in the project gate (`docs:boot --strict`) | makes F1 impossible to repeat | A project mid-slice is blocked by a doc overrun | Report-only by default; the cap fails only at milestone exit. |
| Stop maintaining hand-typed index rows | removes the drift class entirely | — | Indexes are generated; the file is what is cited, the table is a view. |

**The line that must not move:** the *record* and the *security/honesty absolutes*. A mode that drops the decision entry to save time is not fast, it is amnesiac — and for an AI-only repo, amnesia is the failure mode with no human to catch it.

---

## 5. The documentation routine for a vibecoder whose repo is read only by AI

The question "is this routine necessary if no human is involved?" has a precise answer, and it is **yes for the record, no for the ritual** — a distinction the guidelines already draw (`documentation-strategy.md` §Record vs Ritual) and which GAMS has only partly adopted.

**What the routine buys an AI-only repo:**

- **Cross-session memory.** The single most valuable property. A fresh session reads `AGENTS.md` + `WORLD.md` + the task's PRD sections and inherits a settled world. Without the decision log, every session re-litigates D1–D50. This is why the record "never scales".
- **Guardrail enforcement.** `WORLD.md` §What This Project Is NOT is the only thing stopping an agent from proposing Microsoft Graph, Tailwind or an SSR framework. It is machine-read, and it works — `AGENTS.md` §Forbidden Dependencies is a direct descendant.
- **Reverse-proofing the spec.** `docs/PRD.md` is the acceptance oracle; `docs/adr/` is the reasoning.

**What the routine costs, and why it is ceremony here:**

- **The audience is a model, not a person.** Human-oriented affordances — onboarding prose, "5-minute understanding", structure trees, screen-reader-driven line limits — buy nothing. The `400-char` rule survives only for its *diff* rationale.
- **The ritual is a fan-out.** The trigger table's `vibe` column names **one file per trigger**; GAMS's slices touch **15–27 files**. The fan-out comes from the *other* three rows the slice also matches (ADR file + ADR index + PRD §24 + ROADMAP + changelog), each of which is either the record (keep) or derivable (automate).
- **Two of the three manual writes per decision are derivable.** This is the whole gap: the automation exists and stops one step short.

**Automatable vs. irreducible — the ledger:**

| Artifact | Status |
|---|---|
| Decision number `D<max+1>` | **automated** — `slice-close.js` derives it, never counts |
| Changelog entry | **automated** — `slice-close.js` |
| Freshness line | **automated** — `slice-close.js` |
| Gate receipt | **automated** — `gate:receipt` |
| Boot-budget measurement | **automated** — `measure-boot-budget.js` (report-only) |
| Doc census, links | **automated** — `docs:census`, `docs:links` |
| Friction audit | **automated but never run** — no `docs/friction/` exists |
| **ADR index row** | **manual — derivable** |
| **PRD §24 decision row** | **manual — derivable** |
| Boot-cap enforcement | **absent** — no failing check |
| ADR body | **irreducible prose — keep** |
| PRD acceptance criteria | **irreducible prose — keep** |
| WORLD guardrails | **irreducible prose — keep** |

**Answer: yes, it is necessary — but only the third that is irreducible, and two of the three manual steps that remain should not be manual.** The routine is not the problem; the un-automated tail of it is.

---

## 6. Root cause: the reform stopped at the vocabulary

The speed reform (S1–S5) rewrote `speed-tiered-workflow.md`, `00-preamble.md` and `20-testing.md` to make the mode scale Context, Steering and Gate. **It did not finish the sweep.** Three files still assert the pre-reform, mode-invariant gate:

| File | Line | Says | Contradicts |
|---|---|---|---|
| `03-git-and-ci/local-ci-strategy.md` | 28 | "the pre-push hook \| the full pipeline \| minutes \| Once, before the push — **never replaced by `gate:fast`**" | the same file, line 39: "`vibe` \| `gate:fast` + the `always` guard tier" |
| `03-git-and-ci/ci-cd-philosophy.md` | 13 | "a mandatory pre-push gate for **the full pipeline**" | `speed-tiered-workflow.md` §The Gate Scales With the Mode |
| `global-configs/skills/first-project-setup.skill.md` | 67, 114 | pre-push = the full pipeline | same |

This is the exact edit the reform proposal flagged as "**the single highest-value edit in this document**" — deleting the phrase "full pre-push gate" from the absolutes list — and it was applied to the fragments and the mode file but **not** to `local-ci-strategy.md`'s own summary table or the setup skill.

**The consequence is measurable and direct.** GAMS read `local-ci-strategy.md` line 28, wrote a full-pipeline hook, and wrote `check-hooks.mjs` to *enforce* it. The mode row three screens below says `vibe` should run `gate:fast`; the setup skill says the full pipeline; the hook comment even rationalises it ("The full pipeline above is the `standard`/`guarded` per-push gate and the ship boundary in every mode"). **An agent cannot obey two contradictory instructions, so it obeyed the more specific one and locked it in with a guard.** F3 is not a GAMS defect — it is this repo's.

Three further gaps, all measured:

- **F1 — no boot-cap enforcement.** `docs:boot` is report-only and is not in the project's `pre-push`. The 65K/40K overrun is invisible.
- **F4 — `slice:close` stops one step short.** It writes the changelog + freshness but not the ADR index row or the PRD §24 row, so two derivable facts stay hand-typed.
- **F5 — the friction cadence is unwired.** `npm run audit:friction` exists in GAMS's `package.json`; `docs/friction/` does not exist. The instrument that would report all of the above has never run.

---

## 7. Proposed procedures

Each proposal names the change, the measured cost it removes, and **the guard that fails if the lesson is unlearned** (the repo's own rule: a proposal without a control is a wish).

### Wave A — finish the mode wiring (this repo; the load-bearing wave)

| # | Change | Removes | Guard |
|---|---|---|---|
| **A1** | **Resolve the gate contradiction.** Rewrite `local-ci-strategy.md` line 28 and its Tier-B section, `ci-cd-philosophy.md` line 13, and `first-project-setup.skill.md` §5e/§114 to read *"the **declared mode's** gate"*, with the full pipeline named as the ship boundary. Add the pre-push row to the doc-census canonical-fact set so a second copy fails `docs:census`. | F3 — the ~31 s/push mode-invariant gate, and the lock-out guard | `docs:census` fails if "full pipeline" appears as a pre-push description in >1 mandated doc |
| **A2** | **Ship guard tiers as a declared docblock.** `local-ci-strategy.md` already specifies `always` / `standard+` / `ship` and the derivation mechanism (`@docs-guard`); make it the default the setup skill writes, so a project's hook derives its set from the guards instead of hand-listing steps. | the hand-kept step list, and its drift | a guard asserts every guard file declares a tier, and that no `ship`-tier guard runs in a `vibe` loop |
| **A3** | **Make the boot cap fail at milestone exit.** Wire `docs:boot --strict` (with the mode's cap) into the milestone-exit checklist, report-only during a slice. | F1 — the 25,230-token overrun | the strict run fails when the chain exceeds the mode cap |
| **A4** | **Publish the boot chain once** (S16). The instrument and the project guard currently disagree by design; one definition, in `speed-tiered-workflow.md`. | two numbers for one subject | both read the same table; a drift check compares them |

### Wave B — automate the last of the record

| # | Change | Removes | Guard |
|---|---|---|---|
| **B1** | **Extend `slice-close.js` to write the ADR stub, the ADR-index row and the `docs/PRD.md` §24 row** from one invocation (`--adr`). The agent keeps the reasoning; the three index rows become derived. | F4 — 2 hand-typed rows per decision, 50 already | non-vacuity probe: a second run in the same project must return `n+1` and append exactly one row to each index |
| **B2** | **Generate the ADR index and the §24 table** from ADR front-matter (`check-index-drift` pattern, already proven here). | the whole drift class for decision indexes | regenerate → diff → fail |
| **B3** | **Wire the friction cadence.** `audit:friction --check-cadence` into the monthly automation; the project's gate warns when no `docs/friction/` artifact exists within 35 days. | F5 — the instrument that reports F1–F4 never runs | `--check-cadence` exits 1 with no recent artifact |

### Wave C — cut the reading tax

| # | Change | Removes | Guard |
|---|---|---|---|
| **C1** | **Split `docs/PRD.md` by audience.** Move §22 (state-transition matrix), §24 (decisions log) and the §20 acceptance bodies to on-demand files; keep the boot PRD to what a task needs. This is D316's move, re-applied. | ~18K tokens of the 27K PRD row; chain 65K → ~44K | `measure-boot-budget.js --strict` at the mode cap |
| **C2** | **Enforce the trigger table's breadth column.** A `vibe` slice writes **1** steering file (the record); the ritual defers to the milestone. | the 15–27-file fan-out | a guard counts steering files touched per commit and fails a `vibe` slice that exceeds its breadth |

### Wave D — measure the session, not the artifact

| # | Change | Removes | Guard |
|---|---|---|---|
| **D1** | **Record "intent → first running slice"** in the changelog entry — `slice-close.js` already writes the entry, so add the field. `speed-tiered-workflow.md` §Absolute Rules 5 already mandates the measurement; nothing captures it. | the unmeasured claim that a mode is fast | the entry is missing the field → `slice:close` reports it |
| **D2** | **Report doc-vs-code churn in `audit:friction`** as a first-class figure (it already has the bucket). GAMS at **0.82** on day one is the baseline to beat. | the invisible paper tax | the monthly artifact carries the ratio |

**Sequencing.** A1 first — it is one edit in three files and it unblocks A2, C2 and the whole `vibe` gate. Then B1 (one script, removes the largest remaining manual class). C1 is the biggest single token win but touches the spec, so it lands at an M0/M1 boundary, not mid-slice.

---

## 8. What we deliberately keep

- **The record** — decision number, entry, receipt. Never scales. For an AI-only repo this is persisted state, not documentation.
- **Reversal-proofing every guard** (D39). It is the highest-yield ritual in the repo and it found four silent defects.
- **The gate itself**, at the ship boundary — full pipeline, both directions, every mode.
- **Security and honesty absolutes.**
- **`slice:close` and `gate:receipt`** — machine-written evidence, cited by path. The reform worked; extend it, do not touch it.
- **The delivery gate (S12)** — GAMS's mirror is 0-of-106 files different. This is the first time the fleet has actually received the doctrine.
- **The mode vocabulary** — Context / Plan / Tests / Verification / Steering / Gate. The vocabulary is right; only three of its rows are unenforced.

---

## 9. Appendix — reproduce every number

```bash
cd /d/WebApps/Graduate-Affairs-Management-System-GAMS

# --- delivery: is the mirror the doctrine? ---------------------------------
diff -rq _guidelines /d/WebApps/global-guidelines-for-a-vibe-coder/guidelines | grep -c differ   # 0

# --- F1: the boot chain ----------------------------------------------------
node _guidelines/global-configs/scripts/measure-boot-budget.js .
#   chain total ~65,230 tokens ; vibe cap 40,000 ; OVER ; missing files 0

# --- F2: the paperwork ledger ----------------------------------------------
git log --numstat --format="" | awk 'NF==3{if($3~/\.md$/){dl+=$1}else{cl+=$1}}END{print dl,cl,dl/cl}'   # 7517 9202 0.816888
git ls-files '*.md' | wc -l ; git ls-files '*.ts' '*.tsx' '*.mjs' '*.cjs' | wc -l                      # 79 / 50
for c in $(git rev-list HEAD); do n=$(git show --name-only --format='' $c|grep -c .); d=$(git show --name-only --format='' $c|grep -cE '\.md$'); [ "$n" = "$d" ] && [ "$n" -gt 0 ] && echo "$c"; done | wc -l   # 11
ls docs/adr/*.md | wc -l                                   # 50
cat docs/adr/*.md | wc -c                                  # 129031  (~32,258 tok)
grep -c '^### ' docs/changelog/2026-Q4.md                  # 18

# --- F3: the gate is mode-invariant ----------------------------------------
grep -n 'Order:' .husky/pre-push                           # the full six steps
sed -n '20,45p' /d/WebApps/global-guidelines-for-a-vibe-coder/guidelines/03-git-and-ci/local-ci-strategy.md
#   line 28: "never replaced by gate:fast"  vs  line 39: "vibe | gate:fast + the always tier"

# --- F4 / F5 ---------------------------------------------------------------
grep -n 'ADR\|§24\|index row' /d/WebApps/global-guidelines-for-a-vibe-coder/guidelines/global-configs/scripts/slice-close.js   # no ADR/index write
ls docs/friction 2>&1                                      # No such file or directory
node -e "console.log(require('./package.json').scripts['audit:friction'])"   # the instrument exists, never run

# --- the gate timings (machine-written) ------------------------------------
cat docs/gate-receipts/2026-10-12T03-45-38Z.md   # 5.6+13.4+6.4+20.3+2.4+2.6 = 50.7s
cat docs/gate-receipts/2026-10-11T13-10-25Z.md   # 11.5+12.9+12.2+9.1+11.0 = 56.7s
```
