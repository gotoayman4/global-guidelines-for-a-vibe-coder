---
status: "Normative"
scope: "Global"
tags: [speed, modes, vibe, standard, guarded, ceremony, ship-boundary]
---

# Speed-Tiered Workflow — Vibe / Standard / Guarded Modes

---

Speed is a first-class metric alongside accuracy: time from intent to first running slice is measured, not felt. One process does not fit a throwaway prototype and a payment system — a declared mode scales plan, test, verification, and docs ceremony. The ship boundary, not every loop iteration, is where quality hardens.

## Mode Declaration

The project declares its mode in `WORLD.md` (`mode: vibe | standard | guarded`). Default is `vibe` until the first ship/milestone; after that the human chooses. When WORLD.md is silent, assume `standard`. Mode changes are recorded in WORLD.md with date and reason.

## The Mode Matrix

| Dimension | vibe | standard | guarded |
|---|---|---|---|
| Plan | 3-bullet intent; no plan-approval gate | feature plan for non-trivial; human approves | standard plan + architecture review |
| Tests | smoke run + regression test only when a bug bites twice or at milestone | behavioral tests with code; regression every fix | full pyramid + critical-flow E2E before ship |
| Verification | run it once + one-line report at the cheapest sufficient tier | evidence table by change type | full evidence + security pass on auth/data changes |
| Docs | Docs line only on trigger-table matches; README/WORLD at milestone | same-iteration docs on triggers; Docs line on triggers | triggers + ADR for every architectural decision |
| Commits | conventional, coarser increments | every working increment | every increment + checkpoint discipline |

## Absolute Rules (All Modes)

1. **Security never relaxes.** SQLi prevention, secrets, input validation, auth review, CORS, security headers, and magic-byte upload checks apply identically in every mode.
2. **No fake evidence.** NEVER claim tests pass without running them; NEVER present predictions as observations.
3. **Ship boundary hardens quality.** Before any release or milestone exit: critical-flow checks (login, payments, data persistence) verified in both LTR and RTL; the full pre-push gate is green. A vibe loop may be loose; a ship may not.
4. **Revert broken output.** Debugging in place is forbidden in every mode — revert or stash, then regenerate with better constraints.
5. **Speed is measured.** Record intent → first running slice (minutes) per iteration (see `workflow-friction-audit.md` buckets). A mode that feels fast but measures slow is misconfigured.

## Mode Transitions

| Trigger | Action |
|---|---|
| First ship or milestone | human picks `standard` or `guarded`; `vibe` remains only for throwaway work |
| Same bug path bites twice | add the regression test immediately, regardless of mode |
| Auth, payments, or permissions touched | treat that change's verification as guarded-tier even in vibe |
| Repeated silent regressions | escalate the mode; run `workflow-friction-audit.md` |

## Accepted Trade-offs by Mode

| Mode | Accepted risk | Absorbed by |
|---|---|---|
| vibe | no suite → silent regressions between milestones | milestone critical-flow checks; regression-on-second-bite |
| vibe | staler steering docs | trigger-table Docs line still fires; `docs:check` stays warn-only |
| vibe | coarser commits | checkpoint-before-major-op; revert-if-broken discipline |
| standard | slower inner loop than vibe | `gate:fast` two-loop pattern |
| guarded | slowest loop | path-aware gates keep unrelated subtrees fast |

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| vibe mode shipping to production | escalate mode before crossing the ship boundary |
| guarded ceremony on a throwaway spike | demote to vibe — the ceremony protects nothing here |
| Treating mode as an excuse to skip security or honesty rules | Absolute Rules apply in every mode |
| Mode declared at bootstrap, never revisited | revisit at every milestone; record the change |

## Key Takeaways

1. Declare the mode; let it scale ceremony — never scale security or honesty.
2. The ship boundary is the hard quality gate; the loop inside is where speed is won.
3. Measure intent → first running slice; escalate mode when regressions repeat.

---

## Cross-References

- **Depends on:** `development-workflow.md` — the loop this scales, `documentation-strategy.md` — trigger table
- **Extended by:** `testing-philosophy.md`, `agent-verification-loop.md` — mode-scoped depth
- **Applied by:** `workflow-friction-audit.md` — speed measurement, `ai-collaboration-mindset.md` — speed as a metric
