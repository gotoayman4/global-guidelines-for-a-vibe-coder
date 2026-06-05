# Debugging with AI — Systematic Troubleshooting

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,900 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `development-workflow.md`, `error-handling-philosophy.md`

---

## Purpose

Define the methodology for debugging with AI assistance. AI is excellent at pattern-matching error traces to root causes — but only when you provide the right information in the right format. This document ensures you do.

---

## The Debugging Loop

```
OBSERVE → ISOLATE → HYPOTHESIZE → FIX → VERIFY → OBSERVE (repeat)
```

Each iteration narrows the problem space. AI accelerates every phase.

---

## Phase 1: Observe — Capture the Problem

Provide the AI with the exact error, not your interpretation of it.

**What to provide:**
1. **Error message** — copy-pasted, not paraphrased. "It's broken" is useless.
2. **Stack trace** — the full trace, not just the last line. The root cause is often several frames up.
3. **Steps to reproduce** — exact sequence: "1. Navigate to /login, 2. Enter email 'test@test.com', 3. Click Submit, 4. Observe white screen"
4. **Expected vs actual behavior** — "Expected: redirect to dashboard. Actual: white screen with no console errors."
5. **Screenshot** (for UI bugs) — a picture is worth a thousand words. For visual bugs, a screenshot enables one-shot fixes that text descriptions cannot.

**Anti-pattern:** "The login is broken" — the AI will guess at 12 possible interpretations before stumbling on the right one.

---

## Phase 2: Isolate — Narrow the Problem Space

Before asking the AI to fix anything, narrow down WHERE the problem lives.

**Isolation techniques:**

### Binary Search (most effective)
Disable half the system. If the bug persists, it's in the other half. Repeat.
- Comment out half the middleware → which half contains the bug?
- Test with a minimal input → does the bug require specific data?
- Rollback to last known-good commit → which commit introduced it?

### The Minimal Reproduction
Reduce the problem to the smallest possible code that still fails. A 20-line reproduction gets a correct fix in one prompt. A 500-line codebase dump gets a guess.

### Log Injection
Add targeted `console.log` / logging statements at decision points:
```
console.log('[DEBUG] auth middleware: token valid?', !!token);
console.log('[DEBUG] user service: query result', result);
```
Provide the logs to the AI. The gap between expected and actual log output IS the bug location.

---

## Phase 3: Hypothesize — Use AI to Reason

AI excels at generating hypotheses from error patterns. Use it deliberately.

**Hypothesis prompt:**
```
Here is the error and stack trace: [paste]

Here is the relevant code: [paste or @file reference]

Based on this, what are the 2-3 most likely causes? 
For each, explain why it would produce this exact error.
Rank by probability.
```

**Cross-check:** Ask a second model or a separate agent to review the hypothesis. "Claude, review this GPT-generated hypothesis for a bug in our auth middleware. Is the reasoning sound?"

**Common AI debugging failure modes:**
- Fixing the symptom instead of the root cause ("add a null check" instead of "fix why null is possible")
- Over-fixing (rewriting a 50-line function when one line was wrong)
- Introducing new bugs while fixing the original one

---

## Phase 4: Fix — Minimal, Targeted Changes

**Fix prompt template:**
```
The root cause is: [explanation]

Apply the MINIMAL fix to resolve this. Do not refactor unrelated code.
Only modify the specific lines that are wrong.
Preserve all existing behavior that was working correctly.

After the fix, explain:
1. What was wrong (root cause)
2. What you changed (specific lines)
3. Why this fix is safe (won't break other things)
4. What edge cases this fix handles
5. What edge cases this fix still doesn't handle
```

---

## Phase 5: Verify — Prove It's Fixed

Never trust that a fix works because "the error went away."

**Verification checklist:**
- [ ] Does the exact reproduction case now succeed?
- [ ] Do existing tests still pass? (Regression check)
- [ ] Was a regression test added for this specific bug?
- [ ] Were related edge cases tested? (null, empty, large inputs, concurrent requests)
- [ ] Does the fix introduce any new console warnings or errors?
- [ ] For UI bugs: does it look correct visually? (Not just "no errors")

---

## AI Debugging Patterns

### Pattern 1: Screenshot-Driven Debugging
For UI bugs, take a screenshot of the broken UI, paste it into the chat, and say: "Fix the alignment issue shown in this screenshot." This is often 10x faster than describing visual problems in prose.

### Pattern 2: The Rubber Duck Prompt
```
I'm going to explain a bug to you. Do not suggest fixes yet. 
Just ask clarifying questions until you fully understand the problem.
```
This forces you to articulate the problem completely before the AI jumps to solutions.

### Pattern 3: The Fresh-Eyes Review
```
Here is a function that should [expected behavior] but instead [actual behavior].
I've been staring at it for an hour and can't find the bug.
Review it with fresh eyes. What am I missing?
```

### Pattern 4: Behavioral Description
Instead of "fix the pagination bug," describe the exact behavior:
```
The pagination returns duplicates when new items are inserted during traversal.
Example: Page 1 shows items A,B,C. I insert item D. Page 2 shows C,D,E (C is duplicated).
Expected: Page 2 should show D,E,F (no duplicates, consistent ordering).
```
The behavioral description IS the specification. The AI can reason from it directly.

---

## When AI Debugging Fails

**Signs you should debug manually:**
- The AI has proposed 3+ different fixes and none worked
- The error is in generated code that the AI cannot trace (minified, compiled, framework internals)
- The bug involves race conditions or timing (AI reasons poorly about concurrency)
- The AI keeps fixing the symptom, not the cause

**Fallback strategy:**
1. Binary-search isolate the problem to a specific file/function
2. Write a minimal reproduction test that fails
3. Understand the bug yourself before asking AI to fix it
4. Provide the AI with: the isolation result, the failing test, and a clear hypothesis

The AI is a debugging accelerator, not a debugging replacement. You must understand the problem before you can verify the solution.

---

## Anti-Patterns in AI Debugging

| Anti-Pattern | Why It Fails | Fix |
|---|---|---|
| **Describing errors instead of pasting them** | AI guesses based on your interpretation, not the actual error | Copy-paste exact error messages and stack traces |
| **"Fix the bug" without context** | AI has no information to work with | Provide error, stack trace, relevant code, reproduction steps |
| **Accepting the first fix without verification** | Fix may mask the symptom, not cure the disease | Verify with regression test + edge case testing |
| **Letting AI rewrite entire functions for one-line bugs** | Increases risk of new bugs; loses context of existing logic | Demand minimal, targeted fixes |
| **Describing visual bugs in prose** | "The button is kind of off" → AI guesses wrong | Screenshot + "Fix the alignment shown here" |
| **Not adding a regression test for the fix** | Bug will re-emerge in a future AI-generated change | Regression test for every fixed bug |

---

## Key Takeaways

1. Paste errors, don't paraphrase. Exact error messages are debugging gold.
2. Isolate before fixing. Binary-search the problem to a specific location.
3. Screenshots for UI bugs. Images communicate what words cannot.
4. Demand minimal fixes. One-line bugs don't need function rewrites.
5. Verify with regression tests. Fixed bugs should never re-emerge silently.
6. AI accelerates debugging but doesn't replace understanding.

---

## Cross-References

- **Depends on:** `development-workflow.md` — debugging as a loop interruption in the standard workflow
- **Depends on:** `error-handling-philosophy.md` — preventing the bugs that debugging catches
- **Applied by:** `ai-collaboration-mindset.md` — "Use AI to Reason, Not Just Generate" principle
