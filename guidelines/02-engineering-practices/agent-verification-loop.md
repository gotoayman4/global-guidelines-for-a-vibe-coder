# Agent Verification Loop — Self-Verification Before Claiming Done

**Status:** Normative
**Scope:** Global
**Token Tier:** Compact (~600 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `testing-patterns.md`, `verification-for-non-coders.md`, `debugging-with-ai.md`

---

## Purpose

Define the mandatory self-verification loop an AI agent MUST run before reporting any implementation as complete. The user cannot read code and relies on the agent's verification claims. An unverified "done" is a false report.

---

## Core Rule: No "Done" Without Evidence

The agent MUST NOT report a task complete until it has executed the verification loop appropriate to the change type. "It compiles" / "the code looks right" / "I wrote it correctly" are NOT evidence.

## Verification Loop by Change Type

| Change Type | Minimum Required Verification |
|---|---|
| UI component/page | Dev server running + page loads + screenshot or DOM-state check in both LTR and RTL |
| Form | Submit valid input (success path) AND invalid input (error messages appear) |
| API endpoint | Request exercised against dev server; response status + shape checked |
| Business logic / utility | Unit tests written AND passing (`npm test` or project equivalent) |
| Bug fix | Regression test reproducing the bug, passing after fix; previously-failing behavior re-exercised |
| Data/schema change | Migration applied to dev database; affected query exercised |
| Config/build change | Build succeeds (`npm run build`); app starts |

## Loop Steps

1. **Implement** the requested change.
2. **Execute** the minimum verification from the table above. Run the commands yourself — do not assume they pass.
3. **On failure:** fix and re-run. If the same failure persists after 2 fix attempts, STOP and report honestly (see `escalation rules` below).
4. **Report with evidence:** state WHAT was verified, HOW (exact command or check), and the RESULT. Example: "Ran `npm test` — 14 passed, 0 failed. Loaded `/login` in browser — form submits, error message shows on empty submit."
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
| "Tests should pass" / "This will work" | Prediction presented as evidence |
| Running only the happy path | Most bugs live in error/empty states |
| Skipping RTL check on UI work | RTL regressions are invisible in LTR and are the #1 bilingual-app defect |
| Fixing forward silently after failure | User loses track of what changed during debugging |

---

## Key Takeaways

1. Evidence or it didn't happen. Run the checks yourself.
2. Match verification depth to change type — the table is the minimum, not the ceiling.
3. Report format: what was verified, how, result — plus anything not verified.
4. Two failed fixes = stop and escalate, never a third blind attempt.
