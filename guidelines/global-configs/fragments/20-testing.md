## Testing (Always Load — depth by mode)

- **Mode Sets Test Depth.** vibe: smoke-run each iteration; a regression test when the same path breaks twice or at a milestone. standard: behavioral tests on critical/high-risk code, a regression test with every fix, integration at boundaries. guarded: full pyramid + critical-flow E2E before ship. Ship boundary in ALL modes: login, payments, permissions and persistence verified by automated E2E against the deployed target, LTR and RTL.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Behavioral Tests Only.** Tests assert inputs → outputs — never internals, spies, or call counts. Review AI-written assertions: they pass when the logic is wrong.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Evidence Before "Done".** A change is unverified until exercised — "it compiled" is false. NEVER claim a check passed without running it. Report WHAT ran, the RESULT, and anything NOT verified. The project's `type-check` is the type verdict, not an editor diagnostic. Detail: `agent-verification-loop.md`.
  → Source: `02-engineering-practices/agent-verification-loop.md`
- **Pre-Commit + Pre-Push Gates.** Hooks (husky + lint-staged) lint, type-check and format on every commit. The pre-push gate is the declared mode's: `gate:fast` in vibe; `[FILL — e.g., npm run lint && npm run type-check && npm test -- --run && npm run build]` in standard/guarded, plus the dependency-audit wrapper and the clean-tree check. A required step whose script is missing FAILS the gate — never skipped as green. `--no-verify` is forbidden; hooks MUST NOT need real secrets. A release exit runs the full gate via the release override and writes one receipt to `docs/gate-receipts/<UTC-stamp>.md`. Detail: `local-ci-strategy.md`.
  → Source: `03-git-and-ci/local-ci-strategy.md`
