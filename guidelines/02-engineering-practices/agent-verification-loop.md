# Agent Verification Loop — Self-Verification Before Claiming Done

**Status:** Normative
**Scope:** Global
**Token Tier:** Compact (~700 tokens)
**Last Updated:** 2026-09-22
**Cross-References:** `speed-tiered-workflow.md`, `testing-patterns.md`, `verification-for-non-coders.md`, `debugging-with-ai.md`

---

## Purpose

Define the self-verification loop an AI agent MUST run before reporting any implementation as complete. Depth scales with the declared mode (`speed-tiered-workflow.md`); honesty does not. The user cannot read code and relies on the agent's verification claims — an unverified "done" is a false report.

---

## Core Rule: No "Done" Without Evidence

The agent MUST NOT report a task complete until it has executed the verification appropriate to the change type at the cheapest sufficient tier. "It compiles" / "the code looks right" / "I wrote it correctly" are NOT evidence — in any mode.

## Tier 0 — Trivial Changes (all modes)

Typo, comment, formatting, docs-only, or config nudge with no behavior impact: run lint/type-check on the touched file (or `gate:fast`), report one line (`Verified: lint clean on <file>`). No Docs line, no RTL table row, no full evidence block. If the change can alter behavior, it is not Tier 0.

## Verification Loop by Change Type

Depth below is the standard/guarded floor; vibe mode runs the cheapest sufficient row and reports one line (see mode matrix).

| Change Type | Minimum Required Verification |
|---|---|
| UI component/page | Dev server running + page loads + DOM-state check in both LTR and RTL (vibe: run once, one direction unless shipping; both directions at milestone) |
| Form | Submit valid input (success path) AND invalid input (error messages appear) |
| API endpoint | Request exercised against dev server; response status + shape checked |
| Business logic / utility | Unit tests written AND passing (`npm test` or project equivalent) — vibe MAY rely on the smoke run until second bite |
| Bug fix | Regression test reproducing the bug (required at second bite or standard+), passing after fix; previously-failing behavior re-exercised |
| Data/schema change | Migration applied to dev database; affected query exercised |
| Config/build change | Build succeeds (`npm run build`); app starts |

## Verification Cost Tiering (Mandatory)

LLM-driven interactive verification — screen capture + vision analysis, GUI automation, browser-driving for visual confirmation — is slow and token-expensive. It is the MOST expensive verification instrument available and MUST be treated as a scarce resource, rationed by tier:

**Tier 1 — Automated tests (DEFAULT; every change).**
Unit tests, service/API integration tests against a real (temp) database, type-check, lint, i18n/contract parity checks. These are the primary evidence of correctness: fast, deterministic, repeatable, CI-friendly. If a behavior is hard to assert with tests, add test hooks (data attributes, exported pure functions, seam interfaces) rather than reaching for screen automation.

**Tier 2 — Programmatic E2E (occasional; slice/milestone completions).**
Headless end-to-end harness (e.g., Playwright `_electron` / `chromium`) that drives the real app and asserts on DOM state, returned data, or persisted DB rows. NO screenshots, NO vision models — selectors and data only. Runs in seconds.

**Tier 3 — Visual/interactive verification (rare exception ONLY).**
Screen capture + vision analysis or manual GUI automation. Reserved for:
(a) milestone exit criteria and final RTL/LTR layout sign-off of NEW screens;
(b) rendering/layout defects that tests cannot observe;
(c) explicit user request.
Never as routine per-change verification. Never loop captures — one capture, one assertion, done.

**Selection rule:** before any Tier-3 check, ask "can a test or DB query assert this?" If yes, write the test instead. The cheaper tiers are not shortcuts — they are STRONGER evidence (deterministic, repeatable, regression-catching) than one-off visual inspection.

## Loop Steps

1. **Implement** the requested change.
2. **Execute** the minimum verification from the table above at the CHEAPEST sufficient tier (see Cost Tiering) and the depth required by the project's mode. Tier 0 changes stop after lint/type-check. Run the commands yourself — do not assume they pass.
3. **On failure:** fix and re-run. If the same failure persists after 2 fix attempts, STOP and report honestly (see `escalation rules` below).
3a. **Docs-Decision (triggers only):** if the change matches a row in the Trigger table in `documentation-strategy.md`, update steering docs + freshness headers NOW, same iteration, and report `Docs: updated <files>`. Non-trigger changes require no Docs line and no `N/A` justification — silence is the correct non-trigger response.
4. **Report with evidence:** state WHAT was verified, HOW (exact command or check), and the RESULT. Example: "Ran `npm test` — 14 passed, 0 failed. Loaded `/login` via headless e2e — form submits, error message shows on empty submit." Tier 0: one line suffices. Vibe mode: one line + anything NOT verified. standard/guarded: full block + Docs line when triggered.
5. **State what was NOT verified** if any part of the table could not be run (e.g., no dev server available). Never silently omit it.

## Honesty Rules

- NEVER claim tests pass without running them.
- NEVER describe expected behavior as observed behavior.
- If verification is impossible in the current environment, say so explicitly and list exactly what the user should check manually.
- A partial result reported truthfully beats a full claim reported falsely.

## Anti-Patterns

| Anti-Pattern | Why It's Forbidden |
|---|---|
| "Done" with no verification step mentioned | Unverifiable claim — user must trust blindly |
| Non-trigger change padded with a fake `Docs: N/A` line | Ceremony without a trigger — the Docs line fires on triggers only |
| Trigger change with no Docs line | Next session inherits stale context |
| "Tests should pass" / "This will work" | Prediction presented as evidence |
| Running only the happy path | Most bugs live in error/empty states |
| Skipping RTL check on UI work | RTL regressions are invisible in LTR and are the #1 bilingual-app defect |
| Fixing forward silently after failure | User loses track of what changed during debugging |
| Screenshot/vision checks as routine per-change verification | Most expensive, slowest instrument; deterministic tests are stronger evidence (see Cost Tiering) |
| Verifying data/logic state through the screen when a DB query or test can assert it directly | Wastes tokens and time; indirect observation is also less reliable |

---

## Key Takeaways

1. Evidence or it didn't happen. Run the checks yourself — honesty never scales down with mode.
2. Match verification depth to change type AND declared mode — the table is the standard floor, Tier 0 the trivial floor.
3. Match verification COST to need: automated tests first, programmatic e2e second, visual/interactive last (Cost Tiering).
4. Report format: what was verified, how, result — plus anything not verified. Docs line only on triggers.
5. Two failed fixes = stop and escalate, never a third blind attempt.
