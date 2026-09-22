## Testing (Always Load)

- **Regression Tests for Bug Fixes.** Every bug fix MUST include a regression test that reproduces the bug and verifies the fix.
  → Source: `02-engineering-practices/testing-patterns.md`
- **Tests for Critical and High-Risk Code.** New code touching critical flows (auth, payments, permissions, data persistence, core workflows) MUST include tests. Service boundaries SHOULD include integration tests. Simple UI rendering, pass-through code, and prototypes MAY skip tests. Optimize for regression risk, not coverage percentage.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Tests Before or With Code, Not After.** For critical and high-risk features, write behavioral tests first from requirements/PRD. For all other code, write tests in the same iteration as implementation. NEVER defer tests to a later sprint — tests written after features mirror bugs instead of defining correct behavior.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Critical Flow E2E Coverage.** Critical workflow chains MUST have E2E coverage for both happy path and failure path.
  → Source: `02-engineering-practices/testing-patterns.md`
- **Test Behavior, Not Implementation.** Tests MUST verify behavior (what the code does), not implementation (how). Do not test internal function calls, state shape, or private methods.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **No Code Without Test Verification.** Every line of AI-generated code is unverified until tests pass. "It compiled, so it works" is false.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Agent Verification Loop — Evidence Before "Done" (Cost-Tiered).** The agent MUST NOT report a task complete without executing verification itself. Verification is RATIONED BY COST — LLM-driven screen capture/vision/GUI automation is the most expensive instrument and is NOT routine: Tier 1 (default, every change) = automated tests, type-check, lint, contract/i18n parity. Tier 2 (slice/milestone completions) = programmatic headless E2E asserting DOM/data/DB — no screenshots, no vision. Tier 3 (rare exception) = visual/interactive verification, only for milestone exit/RTL-LTR sign-off of NEW screens, defects tests cannot observe, or explicit user request. Before any Tier-3 check ask: "can a test or DB query assert this?" If yes, write the test instead. Report WHAT was verified, HOW, RESULT — plus anything NOT verified. NEVER claim tests pass without running them; NEVER present predictions as observations.
  → Source: `02-engineering-practices/agent-verification-loop.md`
- **Normalization Functions Require Exhaustive Tests.** Every normalization/mapping function MUST have exhaustive parameterized tests: every valid input, every deprecated alias, empty/whitespace/invalid inputs, and case variations (`it.each()` or equivalent).
  → Source: `02-engineering-practices/testing-patterns.md`
- **Pre-Commit Hooks Mandatory.** Every project MUST have pre-commit hooks (husky + lint-staged) running lint, type-check, and formatting, installed automatically after `npm install`. No commits without passing hooks.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **Local CI — Pre-Push Gate Mandatory.** CI runs locally; no cloud CI provider required. Every project MUST have a pre-push hook running the full pipeline: `[FILL — e.g., npm run lint && npm run type-check && npm test -- --run && npm run build]`, plus the project's own dependency-audit wrapper (a bare `npm audit` that cannot reach the registry exits 0 — an unreachable registry MUST exit non-zero) and a `git status --porcelain` clean-tree check. `git push --no-verify` is forbidden. If the gate is slow, optimize the gate — never skip it. Hooks MUST NOT require real secrets.
  → Source: `03-git-and-ci/local-ci-strategy.md`
- **Two Loops: Fast Inside the Slice, Full at the Boundary.** Define `npm run gate:fast` (`lint` + `type-check` + tests scoped to the diff) for the seconds-long loop between edits, and run the full gate once before pushing. `gate:fast` is NOT evidence and MUST NOT be cited as verification; minutes-long suites that protect one subtree MUST be path-aware (run only when that subtree changed) rather than dropped.
  → Source: `03-git-and-ci/local-ci-strategy.md`
- **Gate Receipts — Evidence Is an Artifact.** `npm run gate:receipt` runs the gate and writes `docs/gate-receipts/<UTC-stamp>.md` (timestamp, commit, per-step exit and key figures, verdict). The instrument MUST strip ANSI escapes from captured output, and any step that cannot be green before the commit (clean-tree) is informational — it never decides the verdict.
  → Source: `03-git-and-ci/local-ci-strategy.md`
