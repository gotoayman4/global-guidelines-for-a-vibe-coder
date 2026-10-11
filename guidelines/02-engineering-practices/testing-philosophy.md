---
status: "Normative"
scope: "Global"
tags: [testing, philosophy, contracts]
---

# Testing Philosophy — Survival Infrastructure for AI-Assisted Development

---

**The less code you write yourself, the more important testing becomes.** Vibe coding creates a trust deficit between what the code does and what you believe it does. Tests are the mechanism that closes the gap — but the dose scales with risk: depth follows the declared mode (`speed-tiered-workflow.md`), and the ship boundary is where every project pays full price.

## Directives by Mode

| Mode | Requirement |
|---|---|
| **vibe** | Smoke run per iteration (app starts, happy path works). Regression test only when a bug bites the same path twice, or when stabilizing at a milestone. No suite requirement while iterating. |
| **standard** | Behavioral tests with code for critical/high-risk changes; regression test with every fix; integration at boundaries; E2E on critical flows. |
| **guarded** | Full pyramid (below) + critical-flow E2E before ship; security-sensitive paths human-reviewed. |

**Ship boundary (all modes):** before any release or milestone exit, critical flows (login/auth · payments · permissions · data persistence) MUST be verified — E2E or equivalent — in both LTR and RTL. Vibe mode never ships unverified critical flows.

## Universal Directives (every test that exists)

1. **Primary objective: regression containment.** Most vibe-coded apps fail because later AI changes silently break existing behavior — not because the first version was imperfect. Prevent working features from breaking; don't chase 100% coverage.
2. **Tests are behavioral contracts:** they define WHAT (inputs → outputs), never HOW (internals, spies, call counts). Behavioral tests survive refactoring; implementation tests create false confidence.
3. **Tests are the executable specification.** When context is lost, models change, or a new agent joins — tests remain and constrain AI behavior.
4. **AI-optimized pyramid (standard/guarded):** integration ~45% (API contracts, DB, service boundaries) · behavioral unit ~30% · E2E ~15% (login, payments, core workflows) · static ~10% (tsc strict, ESLint). Unit tests de-emphasized — AI-written ones mirror implementation and break on refactor.
5. **Protect critical flows first:** login/auth · payments · permissions · data persistence · core workflows must NEVER silently break. Then contract shapes, form validation, search. Layout snapshots last.
6. **Verification cost mirrors the pyramid:** automated tests are the DEFAULT evidence for every change; programmatic headless e2e (no screenshots/vision) runs at slice/milestone completions; visual/interactive verification (screen capture + vision analysis) is a scarce resource reserved for milestone sign-off, layout-only defects, or explicit user request. See `agent-verification-loop.md` → Verification Cost Tiering. If behavior is hard to test, add test hooks rather than screen automation.
7. **Never trust AI-generated tests without review.** They are often tautological or shallow. Verify: assertions check correct behavior (not "function was called") · edge cases covered (null/empty/boundaries) · test fails when behavior is wrong (break the code deliberately) · one behavior per test. In vibe mode, review applies to every test that does exist — there is simply less of it.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| No tests ever, in any mode | vibe: smoke + regression-on-second-bite; ship boundary always verifies critical flows |
| Implementation-mirroring tests | Behavioral contracts |
| Trusting AI-generated tests | Review assertions + failure behavior |
| Coverage-percentage obsession | Protect critical flows instead |
| Tests written after features (standard/guarded) | Same iteration at minimum |
| Full pyramid enforced on a throwaway spike | Declare vibe mode; ceremony protects nothing there |
| E2E-only | Integration layer for fast feedback |
| Screenshot/vision-driven E2E where DOM/state assertions suffice | Headless programmatic e2e; reserve visual checks for layout sign-off (see `agent-verification-loop.md` Cost Tiering) |
| Test policy and ship boundary read as contradictory, so a scripted production write is proposed as the "honest" resolution | The boundary asks for **verification**, not automation. Restrict tests to a sandbox **and** schedule a dated human pass on the real target — write both down in the same file |

## Cross-References

`speed-tiered-workflow.md` (the mode matrix) · `testing-patterns.md` (the HOW) · `agent-verification-loop.md` · `refactoring-strategy.md`
