---
status: "Normative"
scope: "Global"
tags: [verification, agent, testing, evidence, done-criteria, cost-control]
---

# Agent Verification Loop — Self-Verification Before Claiming Done

---

## Purpose

Define the self-verification loop an AI agent MUST run before reporting any implementation as complete. Depth scales with the declared mode (`speed-tiered-workflow.md`); honesty does not. The user cannot read code and relies on the agent's verification claims — an unverified "done" is a false report.

---

## Core Rule: No "Done" Without Evidence

The agent MUST NOT report a task complete until it has executed the verification appropriate to the change type at the cheapest sufficient tier. "It compiles" / "the code looks right" / "I wrote it correctly" are NOT evidence — in any mode.

## Trivial Changes (all modes)

Typo, comment, formatting, docs-only, or config nudge with no behavior impact: run lint/type-check on the touched file (or `gate:fast`), report one line (`Verified: lint clean on <file>`). No Docs line, no RTL table row, no full evidence block. If the change can alter behavior, it is not a trivial change.

## Verification Loop by Change Type

Depth below is the standard/guarded floor; vibe mode runs the cheapest sufficient row and reports one line (see mode matrix).

| Change Type | Minimum Required Verification |
|---|---|
| UI component/page | Dev server running + page loads + DOM-state check in LTR (and RTL when `bilingual`; vibe: run once, one direction unless shipping; both directions at milestone when `bilingual`) |
| Form | Submit valid input (success path) AND invalid input (error messages appear) |
| API endpoint | Request exercised against dev server; response status + shape checked |
| Business logic / utility | Unit tests written AND passing (`npm test` or project equivalent) — vibe MAY rely on the smoke run until second bite |
| Bug fix | Regression test reproducing the bug (required at second bite or standard+), passing after fix; previously-failing behavior re-exercised |
| Data/schema change | Migration applied to dev database; affected query exercised |
| Config/build change | Build succeeds (`npm run build`); app starts |

## Verification Cost Tiering (Mandatory)

LLM-driven interactive verification — screen capture + vision analysis, GUI automation, browser-driving for visual confirmation — is slow and token-expensive. It is the MOST expensive verification instrument available and MUST be treated as a scarce resource, rationed by tier:

**Tier 1 — Automated tests (DEFAULT in standard/guarded; in `vibe`, the smoke run is the per-change evidence and Tier 1 runs at milestone/ship).**
Unit tests, service/API integration tests against a real (temp) database, type-check, lint, i18n/contract parity checks. These are the primary evidence of correctness: fast, deterministic, repeatable, CI-friendly. If a behavior is hard to assert with tests, add test hooks (data attributes, exported pure functions, seam interfaces) rather than reaching for screen automation.

**Tier 2 — Programmatic E2E (occasional; milestone/ship completions in every mode, slice completions in standard/guarded).**
Headless end-to-end harness (e.g., Playwright `_electron` / `chromium`) that drives the real app and asserts on DOM state, returned data, or persisted DB rows. NO screenshots, NO vision models — selectors and data only. Runs in seconds.

**Tier 3 — Visual/interactive verification (rare exception ONLY).**
Screen capture + vision analysis or manual GUI automation. Reserved for:
(a) milestone exit criteria and final RTL/LTR layout sign-off of NEW screens;
(b) rendering/layout defects that tests cannot observe;
(c) explicit user request.
Never as routine per-change verification. Never loop captures — one capture, one assertion, done.

**Selection rule:** before any Tier-3 check, ask "can a test or DB query assert this?" If yes, write the test instead. The cheaper tiers are not shortcuts — they are STRONGER evidence (deterministic, repeatable, regression-catching) than one-off visual inspection.

**Exit-code rule (never pipe a gate through a formatter):** when pass/fail is judged by exit code, run the command unpiped (redirect to a temp log, then inspect: `npm run type-check > tc.log 2>&1; echo EXIT:$LASTEXITCODE`). PowerShell `$LASTEXITCODE` after a pipeline is the exit of the LAST element (`Select-Object` → always 0); truncating formatters also drop the error text. Truncated output is never evidence.

**Two instrument facts, same failure shape.** (a) An editor or language-server diagnostic is not the compiler's verdict: the language service caches, its configuration can differ from the project's, and it reports a file when it opens it rather than when the tree changes. The project's own `type-check` is the authority — never *fix* a diagnostic the compiler run does not report, and never claim a type error is real from the IDE alone. (b) In a PowerShell host, an inline `node -e "…"` containing newlines leaves the shell in a multi-line continuation and swallows subsequent commands into silence — one-line the script or run a file.

**Two halves of a protection are two tests:** a UI affordance (e.g. `disabled`) and a handler guard (e.g. a synchronous ref guard) MUST be asserted separately, and each proved able to fail alone. Run the whole test file, not only `-t`-filtered single tests (an unhandled teardown error only appears in the full file run). Stack-specific React/jsdom patterns (stale closures in render, focus-restore teardown artifacts) live in `05-stack-guides/react/react-testing.md`.

**A declared control is not an enforced one:** any control whose failure mode is "the platform ignores it" (headers, retention, cache TTL, rewrites) is asserted on the response, not only the config. Every check distinguishes "clean" from "not read" (absent artifact, failed request, or empty output is a failure, never a pass); disable caches or prove fresh bytes when probing cached endpoints. A local-emulator pass is not live cloud parity (index enforcement, buckets, auth) — see `firebase-firestore-practices` skill for live verification rules.

## Loop Steps

1. **Implement** the requested change.
2. **Execute** the minimum verification from the table above at the CHEAPEST sufficient tier (see Cost Tiering) and the depth required by the project's mode. Trivial changes stop after lint/type-check. Run the commands yourself — do not assume they pass.
3. **On failure (canonical escalation sequence):**
   - A failing check on a sound approach is fixed and re-run. For an environment-sensitive suite that fails once and passes on a fresh-boot solo re-run of the same tree, classify it per `local-ci-strategy.md` §Flake Confirmation instead of blindly rewriting code.
   - Stop after **2 failed attempts**: if the same failure persists or fixes keep introducing new breakage → **revert or stash** broken changes if the approach itself is wrong → **search official docs / the web** when the error or API behavior is unclear → **regenerate from clearer constraints** (`speed-tiered-workflow.md` Absolute Rule 4). Never make a third blind attempt.
4. **Docs-Decision (triggers only):** if the change matches a row in the Trigger table in `documentation-strategy.md`, update that fact's one home NOW, same iteration, and report `Docs: updated <files>`. Non-trigger changes require no Docs line and no `N/A` justification — silence is the correct non-trigger response.
5. **Report with evidence:** state WHAT was verified, HOW (exact command or check), and the RESULT. Example: "Ran `npm test` — 14 passed, 0 failed. Loaded `/login` via headless e2e — form submits, error message shows on empty submit." Trivial changes: one line suffices. Vibe mode: one line + anything NOT verified. standard/guarded: full block + Docs line when triggered.
6. **State what was NOT verified** if any part of the table could not be run (e.g., no dev server available). Never silently omit it.

## Honesty Rules

- NEVER claim tests pass without running them.
- NEVER describe expected behavior as observed behavior.
- If verification is impossible in the current environment, say so explicitly and name the AI-runnable or command-runnable check that would close the gap. Do not hand a code review to the owner: the owner cannot read code.
- A partial result reported truthfully beats a full claim reported falsely.

## Anti-Patterns

| Anti-Pattern | Why It's Forbidden |
|---|---|
| "Done" with no verification step mentioned | Unverifiable claim — user must trust blindly |
| Non-trigger change padded with a fake `Docs: N/A` line | Ceremony without a trigger — the Docs line fires on triggers only |
| Trigger change with no Docs line | Next session inherits stale context |
| "Tests should pass" / "This will work" | Prediction presented as evidence |
| Running only the happy path | Most bugs live in error/empty states |
| Skipping RTL check on bilingual UI work | RTL regressions are invisible in LTR and are the #1 bilingual-app defect |
| Debugging forward past the second failed fix | The approach is the problem; a revert plus better constraints beats a third blind attempt |
| Screenshot/vision checks as routine per-change verification | Most expensive, slowest instrument; deterministic tests are stronger evidence (see Cost Tiering) |
| Verifying data/logic state through the screen when a DB query or test can assert it directly | Wastes tokens and time; indirect observation is also less reliable |
| Gate exit code read from a pipeline tail (`… \| Select-Object`; `$LASTEXITCODE` is the formatter's) | Run unpiped; redirect to a log and echo `$LASTEXITCODE` / `$?` |
| Green unit test over a declared control that the platform ignores | Assert on the response (or name the config-check in the test); "not read" fails |
| Affordance-only test that stays green when the handler guard is deleted | Assert affordance and guard separately; reversal (delete the guard) must redden |
| Type verdict read from the editor's diagnostics | Run the project's `type-check` unpiped; the language service caches and can be configured differently from the build |
| A "clean" result from a command the shell never started | No multi-line inline `-e` in PowerShell — a swallowed here-string prints nothing and exits nothing |

---

## Key Takeaways

1. Evidence or it didn't happen. Run the checks yourself — honesty never scales down with mode.
2. Match verification depth to change type AND declared mode — the table is the standard floor, Trivial changes the minimal floor.
3. Match verification COST to need: automated tests first, programmatic e2e second, visual/interactive last (Cost Tiering).
4. Report format: what was verified, how, result — plus anything not verified. Docs line only on triggers.
5. Two failed fixes = stop and escalate, never a third blind attempt.

## Cross-References

- **Depends on:** `speed-tiered-workflow.md`, `testing-patterns.md`, `../03-git-and-ci/local-ci-strategy.md`
- **Applied by:** `debugging-with-ai.md`, `AGENTS.starter.md`
