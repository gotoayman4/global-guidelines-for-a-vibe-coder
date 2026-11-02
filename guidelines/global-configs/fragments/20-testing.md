## Testing (Always Load — depth by mode)

- **Mode Sets Test Depth.** `vibe`: smoke-run each iteration; regression test when a path breaks twice or at milestone. `standard`: behavioral tests on critical/high-risk code, regression test every fix, integration at boundaries. `guarded`: full pyramid + critical-flow E2E before ship. Ship boundary in ALL modes: login, payments, permissions and persistence verified by automated E2E on deployed target (LTR+RTL when bilingual).
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Behavioral Tests Only.** Assert inputs → outputs — never internals, spies, or call counts. `standard`/`guarded`: tests first for critical features, same iteration otherwise. Verify AI assertions catch real logic flaws.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Evidence Before "Done".** Unverified until exercised — "it compiled" is false. NEVER claim a check passed without running it. Report WHAT ran, RESULT, and what was NOT verified. `type-check` is the type verdict, not editor diagnostics.
  → Source: `02-engineering-practices/agent-verification-loop.md`
- **Pre-Commit + Pre-Push Gates.** Commits (husky + lint-staged) lint, type-check and format. Pre-push runs `always` guards, `audit:gate`, clean-tree check, plus the mode gate (`vibe`: `gate:fast` — falling back to available `lint`/`type-check` during day-0 scaffolding; `standard`: lint + type-check + suite, deferring build to ship; `guarded`: adds build + path-aware extras). In `standard`/`guarded` and releases, missing required scripts FAIL the gate. `--no-verify` is forbidden; hooks need no real secrets. Release exits use the release override and write `docs/gate-receipts/<UTC-stamp>.md`.
  → Source: `03-git-and-ci/local-ci-strategy.md`
