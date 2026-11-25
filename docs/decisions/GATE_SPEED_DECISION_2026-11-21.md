# Gate Speed — Solo Re-Run Classification, Flake Confirmation, and Receipt-as-Gate — Owner Decision

**Date:** 2026-11-21
**Decision class:** Doctrine additions to `guidelines/03-git-and-ci/local-ci-strategy.md`. No constitution line changes and no starter re-render: all three additions are written conditionally ("a project that ships receipts and a pre-push hook …"), so a project without emulators, receipts or a hook reads none of them as an obligation. This record justifies; the guideline file is the one normative home of the text.
**Scope:** `guidelines/03-git-and-ci/local-ci-strategy.md`; fleet delivery via `sync:all` to the seven registered projects. **Implementation is per project's own gate and is opt-in** — the reference implementation lands in `gs-coordinator-helper` (its ADR 079 records the receipt-as-gate mechanism; its plan document `docs/plans/release-gate-speed-plan.md` rev 2 records the slices).
**Status:** applied in the working tree; `npm run validate` exits 0.

---

## The owner's instruction (2026-11-21, in session)

Requesting the review:

> *"…the most time consuming is the e2e tests, because for any fail in any test, all tests should be re-run again while it is — I think — the failing suite/tests should be re-run not all tests. In general pushing the app to production takes hours because of the fixing and re-run process. It's not needed to re-run all tests on fail of one, only the failing; also flaking and timeout tests should not prevent pushing, especially if the test passes when run alone."*

Approving the plan and the two gated decisions (OD-1 this doctrine and its fleet sync; OD-2 the receipt-as-gate mechanism):

> *"Now proceed with implementation of version 2 (corrected/enhanced plan)."*

---

## 1. The measured problem (evidence: `gs-coordinator-helper/docs/gate-receipts/`)

| Fact | Figure | Source |
|---|---|---|
| Green production receipt (`--e2e`) | ~30 min (vitest 387 s + e2e matrix ~1,100 s + build) | receipt `2026-11-21-171913Z` |
| The release push re-runs vitest + build at the same tree | ~8–10 min duplicated | `.husky/pre-push` guarded chain vs the receipt's steps |
| Every RED restarts the whole cycle | 5 receipts on 2026-11-21 alone; 20 in the last week | `docs/gate-receipts/` listing |
| Red class 1 — one e2e suite flakes under load, passes solo | d143 `10/16` → `15/16` → solo green, repeatedly | known gotchas 2026-11-14 |
| Red class 2 — one vitest test red, e2e 64/64 green | 1 of 8,769 | receipt `2026-11-21-164512Z` |
| Red class 3 — the receipt reddens on its own evidence (a drift guard reading the previous receipt) | "paid two RED receipts" | known gotchas 2026-11-21 |
| Red class 4 — full vitest reddens load-sensitive jsdom waits while the emulator stack runs | one test 2/2 red at ~300 s suite duration, green alone | known gotchas 2026-11-21 |

The dominant cost is not the green gate — it is the all-or-nothing restart policy applied to failures that pass when re-run alone, plus reds the instrument itself causes.

## 2. The decision — three doctrines (normative text: `local-ci-strategy.md`)

1. **Solo re-run classification** (§The Loop Inside Tier A and Tier B): a red environment-sensitive suite is classified before it is fixed — one solo re-run on a fresh boot, loop evidence only, never ship evidence and never citable in a receipt.
2. **Flake confirmation** (§Tier B — The Pre-Push Gate): a suite that fails, then passes on an immediate fresh-boot re-run of the SAME tree, is a `flake-confirmed` pass — recorded, not a gate failure. Constraints: ONE confirmation pass per run, max; each pass boots its own lifecycle and re-seeds (never adopts state); the evidence is recorded in the run summary and the receipt; the same suite flaking twice across runs is its own slice (regression test + escalation), never a third silent retry; never applies to lint, type-check, the dependency audit, security guards, or deterministic unit lanes.
3. **Receipt-as-gate** (§Gate Receipts): a release push backed by a PASS receipt whose provenance tree identifies the pushed content may skip the chain steps that receipt already ran at that tree. The hook keeps unconditionally: the pre-flight clean-tree, every path-aware step the receipt did not run, the dependency audit, the `ship`-tier receipt check, and the final clean-tree. Anything unreadable, missing, FAIL, class-shallow, or tree-mismatched fails SAFE to the full chain. This removes redundant re-execution, not coverage — every check still runs once, at the boundary, on the exact shipped tree.

## 3. Rejected optimisations — recorded so they are not re-proposed

| Rejected | Why |
|---|---|
| Parallelising the emulator matrix | the suites share one emulator lifecycle and seeded fixtures; concurrency collides (measured in `gs-coordinator-helper` ADR 073) |
| Conditionalising the callable probes | the probes are the only exercise of the one callable backend; a security pin is not a scope victim (D330) |
| Removing e2e from rules-sensitive pushes | a security step is never mode-scaled; the path trigger stays |
| Retrying deterministic lanes (lint, type-check, audit, unit) | a deterministic check that fails once has failed |
| `--no-verify` / skipping the gate | forbidden in every mode, unchanged |
| Dropping or narrowing any check entirely | the plan removes redundant re-execution and absorbs measured environment flakes — never coverage |

## 4. What does not change

Security depth and honesty rules in every mode; the path-aware e2e / desktop / audit steps; both clean-tree checks; guard tiers and `guard:tiers`; release classes and the release override; receipt cadence (a receipt stays a milestone/release artifact); `--no-verify` forbidden.

## 5. Per-project adoption

The doctrine text ships to every registered project via the sync; adopting the mechanisms is each project's own decision, implemented in its own runner, instrument and hook:

- **Reference implementation:** `gs-coordinator-helper` — plan `docs/plans/release-gate-speed-plan.md` rev 2, ADR 079, receipts under `docs/gate-receipts/`.
- A project with no emulator-backed suites, no receipts, or no pre-push hook is unaffected by the text (all three additions are conditional).
- Fleet adoption outcomes are recorded in §Outcome below as projects adopt.

## Outcome

- `gs-coordinator-helper` — adopted (all three doctrines; see its changelog `docs/changelog/2026-Q4.md` and ADR 079).
