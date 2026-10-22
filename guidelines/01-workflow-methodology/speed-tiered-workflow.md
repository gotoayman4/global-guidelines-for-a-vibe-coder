---
status: "Normative"
scope: "Global"
tags: [speed, modes, vibe, standard, guarded, ceremony, ship-boundary, context-budget, escalation]
---

# Speed-Tiered Workflow — Vibe / Standard / Guarded Modes

---

Speed is a first-class metric alongside accuracy: time from intent to first running slice is measured, not felt. One process does not fit a throwaway prototype and a payment system — a declared mode scales **context, plan, test, verification, steering and gate** ceremony. The ship boundary, not every loop iteration, is where quality hardens.

## Mode Declaration

The project declares its mode in `WORLD.md` (`mode: vibe | standard | guarded`). A starter project begins at `vibe` — the default until the first ship/milestone, after which escalation is a dated decision recorded in WORLD.md. A project that declares no mode at all is assumed `standard`: its stage is unknown, and an undeclared project must not silently receive the loosest tier (`global-configs/scripts/lib/project-mode.js`). Mode changes are recorded in WORLD.md with date and reason.

## The Mode Matrix

**A mode that does not change how much you read, how many files you write, or what the gate runs is a label, not a mode.** Every row below is a cost a session actually pays — not a description of how carefully it thinks.

| Dimension | vibe | standard | guarded |
|---|---|---|---|
| **Context** — tokens read before the first edit | **≤40K** — the task's 2–4 files | **≤90K** — the task files + the contracts they touch | **≤160K** — the full boot chain |
| **Plan** | 3-bullet intent; no plan gate | feature plan for non-trivial; AI reviews | standard plan + architecture review |
| **Tests** | smoke run + regression test only when a bug bites twice or at milestone | behavioral tests with code; regression every fix | full pyramid + critical-flow E2E before ship |
| **Verification** | run it once + one-line report at the cheapest sufficient tier | evidence table by change type | full evidence + security pass on auth/data changes |
| **Steering writes** | **1 file** — the record (decision number + its entry) | 2 files | the full set + an ADR per architectural decision |
| **Gate** — per push | **`gate:fast`** + the `always` guard tier | the full pipeline | the full pipeline + the path-aware extras |
| **Commits** | conventional, coarser increments | every working increment | every increment + checkpoint discipline |

## The Context Budget — the row most projects ignore

The reading a session does before its first edit is the largest single cost it pays, and until this row existed no gate measured it. Budget it:

1. **Pick, do not hoard.** Name the 2–4 files the task needs. The reading list is a *menu*, not a checklist — reading all of it because it is mandated is the tax, not the safety.
2. **Two quantities — the chain and the menu — and only the chain is budgeted.** The **chain** is what `07-documentation/documentation-strategy.md` §The Mandated Doc Set marks `every session`: the floor a session cannot skip, and the only thing a mode cap governs. The **menu** is everything else the project carries — the spec, the roadmap, the runbooks, the ADR index — read by choice; it is ratcheted (rule 4), never budgeted, because a budget that also covers what you read by choice measures a library rather than a session. `node _guidelines/global-configs/scripts/measure-boot-budget.js <projectRoot>` reports both and charges `--max-tokens` to the chain alone; `--files` declares a project's own floor.
3. **Exceeding the cap is allowed, not free.** A session MAY read past its mode's budget; it MUST then record one line naming what it read and why the task needed it. An unrecorded overshoot is a violation; a recorded one is a decision.
4. **A cap that only rises is not a cap.** Re-base a file's cap only against its live measurement, and freeze the menu total as a high-water mark that may not be raised without retiring something. A ratchet pointed at a monotonic document — a living PRD, a roadmap that only appends — is a growth curve with a number next to it.
5. **The cap is enforced at the milestone, never mid-slice.** `node _guidelines/global-configs/scripts/measure-boot-budget.js . --max-tokens <the mode's cap> --strict` exits non-zero when the chain is over. Wire it as an npm script (`docs:boot:strict`) and make it a **milestone-exit criterion**: during a slice the instrument stays report-only, because a document overrun must not block a working increment — but a chain that has outgrown its cap is a decision the project owes, and at the exit it is paid. A measured overrun with no failing check is a number nobody acts on: a reference project read **14K tokens** at session start while its menu weighed **51K**, and the only figure anyone ever quoted was their **65K sum** — against the chain's 40K cap. The wrong quantity was measured, so neither was ever fixed and no guard was wired for either (measured 2026-10-12).

## The Gate Scales With the Mode

`local-ci-strategy.md` owns how the gate is built; this file owns **how much of it runs**. One hook, three behaviours, and `--no-verify` forbidden in all three:

| Mode | What the hook runs per push | What it defers to the ship boundary |
|---|---|---|
| vibe | `gate:fast` (lint + type-check + the changed tests) + every guard in the `always` tier | the full suite, e2e, the desktop pair, the build |
| standard | the full pipeline | — |
| guarded | the full pipeline + the path-aware extras | — |

The hook reads the declared `mode`, so a project escalates its gate by escalating its mode — a dated, recorded act, not a hand-edit to the hook. **Removing a check is never the optimisation**: the optimisation is running each check at the frequency its trigger actually needs (`workflow-friction-audit.md`).

## Absolute Rules (All Modes)

1. **Security never relaxes.** SQLi prevention, secrets, input validation, auth review, CORS, security headers, and magic-byte upload checks apply identically in every mode.
2. **No fake evidence.** NEVER claim tests pass without running them; NEVER present predictions as observations.
3. **Ship boundary hardens quality.** Before any release or milestone exit: critical-flow checks (login, payments, data persistence) verified in both LTR and RTL, and **the full pipeline is green** — whatever the mode, and whatever the inner loop ran. A vibe loop may be loose; a ship may not.
4. **Fix the change; revert the approach.** A failing check on a sound change is fixed and re-run (two attempts — `agent-verification-loop.md`). Wrong output — the approach itself is broken, or fixes keep landing on new breakage — is reverted or stashed and regenerated with better constraints. Never debug forward past the second failed fix.
5. **Speed is measured.** Record intent → first running slice (minutes) per iteration (see `workflow-friction-audit.md` buckets). A mode that feels fast but measures slow is misconfigured.

## Mode Transitions

Escalation is **automatic and evidence-based**. The last four triggers escalate the **slice**, not the project: the declared mode returns when the slice closes. Every escalation writes one line naming its trigger — a mode that must be remembered is a mode that will be wrong.

| Trigger | Action |
|---|---|
| First ship or milestone | escalate the project to `standard` or `guarded`; `vibe` remains only for throwaway work |
| Same bug path bites twice | add the regression test immediately, regardless of mode |
| Auth, payments, or permissions touched | run that change's verification at guarded tier even while the loop runs in vibe |
| A `ship`-tier guard owns a changed path | run that guard set for this slice, in any mode |
| The same test file fails twice in one slice | escalate the slice to `standard`; say so in one line |
| Repeated silent regressions | escalate the project; run `workflow-friction-audit.md` |

## Accepted Trade-offs by Mode

| Mode | Accepted risk | Absorbed by |
|---|---|---|
| vibe | no suite → silent regressions between milestones | milestone critical-flow checks; regression-on-second-bite |
| vibe | the fast loop can pass what the full pipeline would catch | the ship boundary runs the full pipeline; nothing is *skipped*, it is *deferred* to a named boundary |
| vibe | staler steering prose | the **record** still lands (decision number + entry); only the ritual defers to the milestone |
| standard | slower inner loop than vibe | `gate:fast` two-loop pattern |
| guarded | slowest loop | path-aware gates keep unrelated subtrees fast |

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| vibe mode shipping to production | escalate the project before crossing the ship boundary |
| guarded ceremony on a throwaway spike | demote to vibe — the ceremony protects nothing here |
| Treating mode as an excuse to skip security or honesty rules | Absolute Rules apply in every mode |
| Mode declared at bootstrap, never revisited | revisit at every milestone; record the change |
| **A vibe session that reads the whole boot chain and writes six steering files** | the mode is not wired to Context or Steering — apply both rows, or the mode is decoration |
| **Reading everything "because the bootstrap mandates it"** | the chain is a menu; name the 2–4 files the task needs |
| **A cap re-based upward every time its file grows** | re-base only against live measurement; freeze the chain total |
| **Keeping a hand-maintained decision counter** | derive the next number from the existing set; a counter races between concurrent sessions |

## Key Takeaways

1. Declare the mode; let it scale context, plan, tests, verification, steering and gate — never security or honesty.
2. The ship boundary is the hard quality gate; the loop inside is where speed is won.
3. Budget the reading, cap the steering writes, and derive what can be derived — those three are the whole difference between a fast mode and a relabelled slow one.
4. Measure intent → first running slice; escalate automatically when the evidence says so.

---

## Cross-References

- **Depends on:** `development-workflow.md` — the loop this scales, `documentation-strategy.md` — trigger table, `context-management-strategy.md` — the reading budget
- **Extended by:** `testing-philosophy.md`, `agent-verification-loop.md` — mode-scoped depth
- **Applied by:** `workflow-friction-audit.md` — speed measurement, `local-ci-strategy.md` — the gate this file sizes, `ai-collaboration-mindset.md` — speed as a metric
