---
status: "Normative"
scope: "Global"
tags: [debugging, troubleshooting, error]
---

# Debugging with AI — Systematic Troubleshooting

---

Loop: `OBSERVE → ISOLATE → HYPOTHESIZE → FIX → VERIFY`. Each iteration narrows the problem space.

## Phase Directives

1. **Observe:** provide exact evidence, not interpretation — copy-pasted error message · full stack trace (root cause is frames up) · exact reproduction steps · expected vs actual behavior · screenshot for UI bugs. "The login is broken" forces 12 wrong guesses.
2. **Isolate before fixing:** binary-search (disable half, test minimal input, rollback to last-good commit) · minimal reproduction (20 lines beats a codebase dump) · targeted log injection at decision points — the gap between expected and actual log output IS the bug location.
3. **Hypothesize via AI:** "Here are error + stack + relevant code: what are the 2–3 most likely causes? Explain each; rank by probability." Cross-check with a second model for critical bugs.
4. **Fix minimally:** "Apply the MINIMAL fix. Do not refactor unrelated code. Then explain: root cause, what changed, why it's safe, edge cases handled and not handled."
5. **Verify (never trust "error went away"):** reproduction case succeeds · existing tests pass · regression test added · related edge cases tested (null/empty/large/concurrent) · no new console errors · UI looks correct visually.

## Useful Patterns

- **Screenshot-driven:** paste the broken UI screenshot + "fix the alignment shown here" — 10× faster than prose for visual bugs.
- **Rubber duck:** "Do not suggest fixes yet. Ask clarifying questions until you fully understand the problem."
- **Fresh eyes:** "This should X but does Y. I've stared for an hour. What am I missing?"
- **Behavioral description as spec:** "Page 1 shows A,B,C. Insert D. Page 2 shows C,D,E — C duplicated. Expected D,E,F."

## When AI Debugging Fails

3+ proposed fixes failed · error in minified/framework internals · race conditions or timing · repeated symptom-fixing. Fallback: binary-search to the file/function → write a failing minimal test → understand the bug yourself → hand AI the isolation result + failing test + hypothesis. The AI accelerates debugging; it doesn't replace understanding.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Paraphrasing errors | Paste exact text + full trace |
| Accepting first fix unverified | Regression test + edge cases |
| Function rewrite for one-line bug | Demand minimal fix |
| Prose descriptions of visual bugs | Screenshot |
| No regression test after fix | Bug will re-emerge |

## Cross-References

`development-workflow.md` · `error-handling-philosophy.md` · `agent-verification-loop.md`
