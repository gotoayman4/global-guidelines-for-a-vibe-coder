# Vibe Speed Follow-Up — Seven Rules the Reform Left Unstated

**Date:** 2026-10-23
**Scope:** this repo's `guidelines/` + `global-configs/fragments/`; the conformance half belongs to the consuming project
**Evidence base:** `D:\WebApps\gs-coordinator-helper` at `4f1cb64` (slice D359), which ran a `vibe` loop, verified at
guarded tier, and reported where the minutes went.
**Method:** each candidate recommendation was checked against the current corpus before it was written. Six of eight
were already upstream rules, several in stronger form than the recommendation proposed. Only the remainder shipped.
**Status:** Applied — `npm run validate` exits 0; `npm run validate:standard` exits 0 (measured 2026-10-23, re-measurable
with those two commands).

---

## 1. The finding that reframed the request

A request to "make vibe mode faster" produced eight recommendations. Reading the corpus first showed that the speed
reform of 2026-10-11 (`WORKFLOW_SPEED_REFORM_PROPOSAL_2026-10-11.md`, S1–S16) had already landed six of them:

| Recommendation | Verdict | Where it already lives |
|---|---|---|
| Run the cheap structural lane after every new file, not after the slice | **Already upstream** | `local-ci-strategy.md` §The Loop — `gate:fast` runs "after every edit batch, during the slice" |
| Date-only constitution header, no per-slice freshness prose | **Already upstream, stricter** | `documentation-strategy.md` §Freshness — "`AGENTS.md` and `README.md` carry none" |
| One slice record with pointers instead of copies | **Already upstream** | `documentation-strategy.md` §History — one archive per quarter, `**Doc:**` column, S8 |
| Derive the decision number, never count it | **Already upstream** | `slice:close.js` + §Record vs Ritual |
| The mode decides what the per-push gate runs | **Already upstream** | `local-ci-strategy.md` §Which Gate Runs — "writing the full pipeline unconditionally is the defect this branch exists to prevent" |
| Subprocess-capture facts (sync pipes) | **Half upstream** | repo `AGENTS.md` §Subprocess Capture, `lib/run-sync.js` — never in a **mirrored** guideline, so no project received it |
| Suite-level scoping inside one E2E step | **Genuine gap** | §Guard Tiers derived the guard set; nobody applied the derivation one level down |
| Cached gate steps | **Genuine gap** | "fix the gate (tier it, scope it, cache it)" named caching as a fix and stated no soundness condition |
| Escalation-class count per slice | **Genuine gap** | §Mode Transitions listed six triggers and never counted them |
| Session scratch hygiene | **Genuine gap** | the ignore-what-you-write clause covers *tools*; a human/agent session had no rule |
| Editor diagnostics vs the compiler; PowerShell here-string trap | **Genuine gap** | the exit-code rule covers pipes, not these two |

**So the dominant defect was not in the baseline. It was in one consuming project that had never conformed to it** —
its `_guidelines/` mirror was in sync (verified: `npm run sync:drift` reports `gs-coordinator-helper: guidelines mirror
in sync (190 files)`), while its hand-written constitution and its hooks still described the pre-reform workflow,
including the phrase the reform deleted on purpose. Conformance is the work; it is listed in §4 and carried out there.

A lesson worth keeping: **check delivery, then check conformance.** A current mirror is not a project that follows the
mirror. `sync:drift` proves the copy arrived; nothing proves it was obeyed.

## 2. The deltas written here

| # | Rule | File | Control |
|---|---|---|---|
| **U1** | **Suite Scope — the same derivation one level down.** A suite declares `@scope <path-glob>` in its own docblock; the runner derives the selection; an undeclared or unparseable scope **selects** the suite (fail toward coverage); a partial run prints the scope and the count inside it, never the fleet figure. | `03-git-and-ci/local-ci-strategy.md` | the project's runner, which MUST carry a test proving an unreadable declaration selects — stated as a requirement, since this repo has no suite to scope |
| **U2** | **One escalation class per slice.** Cost is the number of distinct verification regimes a diff triggers, not lines changed; a second unrelated class is a second slice, and two classes may stay only if the record names their shared root cause. | `01-workflow-methodology/speed-tiered-workflow.md` §Mode Transitions + Anti-Patterns | the record line itself (a `slice:close` entry either names one class or names the shared cause) — a scoping rule, not a machine check |
| **U3** | **A cached step is keyed on content and says so.** Key = `git write-tree` for anything that walks the tree, a lockfile hash for the audit; never a timestamp or "the last run was recent"; the receipt marks `cached (<key>)`, and a receipt that caches nothing prints `cached: none`. | `03-git-and-ci/local-ci-strategy.md` §Gate Receipts | the receipt artifact is the check — a missing `cached:` line is the signature of a silent cache |
| **U4** | **A step that cannot START is not a step that found nothing.** The `EBUSY` sync-pipe failure and its consequence (a harness that fails to *collect* reads as an empty pass) now live in a mirrored guideline, where projects can reach them. | `03-git-and-ci/local-ci-strategy.md` §Gate Receipts | `guard:tiers` + the project's own count assertions |
| **U5** | **Session scratch has one ignored home.** One gitignored directory (`scratch/`), each writer adds its own path to the ignored set, staging by path — never `git add -A` in a tree that can hold scratch. | `03-git-and-ci/local-ci-strategy.md` + `fragments/30-git.md` | `clean-tree` in the hook |
| **U6** | **Two instrument facts.** An editor/language-server diagnostic is not the compiler's verdict; a multi-line inline `node -e` in PowerShell leaves the shell in a here-string continuation that swallows every later command. | `02-engineering-practices/agent-verification-loop.md` + `fragments/20-testing.md` | the project's `type-check` step, and "truncated output is never evidence" |
| **U7** | **Non-vacuity asserts the expected population**, not merely a non-empty corpus — a silently shrunken collection passes louder than an empty one. | `07-documentation/documentation-strategy.md` §Guards | each guard's own count assertion |

The constitution absorbed four short clauses (escalation class, type-verdict authority, cached-step disclosure,
scratch home; non-vacuity stays prose-side). `npm run render:starters` measures the starter at **5,317 / 5,500
tokens** (command: `npm run render:starters`; measured 2026-10-23) — 183 tokens bought here, 183 of headroom left for
the next author, who must retire or narrow before adding.

## 3. Owner decision

**Decision:** the owner directed that the recommendations be applied to this repo, then synced and implemented in
`gs-coordinator-helper`, including the project-specific remainder — instruction of 2026-10-23.
**Why it is recorded:** the project-side half edits baseline text that this repo owns (its constitution copies the
Speed Mode and gate bullets, and one of its standing instructions duplicates the subprocess rule). Per this repo's
§Maintenance and the project's own rule 5, a change to an existing *global/baseline* rule is a governance act, not a
code review. Everything written **here** is additive or a narrowing, which the maintenance rule permits freely.
**Accepted risk:** U1 and U2 have no central automated control — this repo has no suites and no slices. Each states
the control the consuming project owes; a project that declares the rule and wires nothing is exactly the "declared
control that is not enforced" failure this corpus already outlaws.

## 4. Carried to the consuming project (not this repo's work)

1. Delete `full pre-push gate` from the project's absolutes list — a phrasing `guard:gate-wording` retires centrally,
   and the project's hook pays `standard`'s cost on every `vibe` push because of it.
2. Branch `.husky/pre-push` on `WORLD.md`'s `mode`; keep the security pins in the vibe branch (a step that is the only
   place a check runs is not a convenience).
3. Tag guards with `@tier`, derive the set, and let `gate:fast` be the vibe gate.
4. Adopt `slice:close`, one quarterly changelog archive, and drop the `AGENTS.md` freshness header — the project's
   parity guards exist to catch hand-typed derived facts; a derived fact that is never typed retires the guard.
5. Suite scoping (U1), cached-step disclosure (U3), scratch home (U5), and the ROADMAP render debt that makes 86% of
   the suite's wall time a standing tax rather than a per-slice discovery.
