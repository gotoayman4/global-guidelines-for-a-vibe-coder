## Testing (Always Load — depth by mode)

- **Mode Sets Test Depth.** `vibe`: smoke-run each iteration; add a regression test when a path breaks twice or at milestone. `standard`: behavioral tests on critical code, a regression test per fix, integration at boundaries. `guarded`: full pyramid + critical-flow E2E before ship. Ship boundary, all modes: pilot runs automated E2E for login & permissions; production adds payments & persistence.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Behavioral Tests Only.** Assert inputs → outputs, never internals, spies, or call counts; check that AI-written assertions can actually fail. `standard`/`guarded`: tests first for critical features.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Evidence Before "Done".** Unverified until exercised — "it compiled" is false. NEVER claim a check passed without running it. Report WHAT ran, RESULT, and what was NOT verified. `type-check` is the type verdict, not editor diagnostics.
  → Source: `02-engineering-practices/agent-verification-loop.md`
- **Gates.** Commits (husky + lint-staged) lint, type-check and format. Pre-push runs the mode gate: `vibe` `gate:fast` (or the available `lint`/`type-check`), `standard` lint + type-check + suite, `guarded` adds build + path extras. Releases use the release override and write `docs/gate-receipts/<UTC-stamp>.md`. In `standard`/`guarded` a missing required script FAILS the gate; a script named here that the project lacks is reported, never invented — run the nearest check and say which. `--no-verify` is forbidden.
  → Source: `03-git-and-ci/local-ci-strategy.md`
