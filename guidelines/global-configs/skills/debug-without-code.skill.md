---
name: debug-without-code
description: Activate when the user cannot read code and needs help debugging visual issues
---

# Skill: Debug Without Code — Visual and Behavioral Debugging for Vibe Coders

**Status:** Advisory
**Scope:** Global (Task-Type Skill)
**Token Tier:** Compact (~600 tokens)
**Source:** `global-configs/skills/debug-without-code.skill.md`
**Last Updated:** 2026-05-25

---

**Activation announcement:** When this skill activates, output in chat: `Skill: debug-without-code activated -- Source: _skills/debug-without-code.skill.md`

## Trigger

Activate when:
- User says "something's broken", "it's not working", "help me debug", "this doesn't look right"
- User reports a visual problem, a broken feature, or unexpected behavior
- User does not know how to read code and needs behavioral debugging only

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `../../docs/human/verification-for-non-coders.md` — Visual verification techniques
2. `../../docs/human/escalation-protocol.md` — When to escalate beyond AI
3. `01-workflow-methodology/debugging-with-ai.md` — Structured debugging loop (adapted for non-coders)

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a debugging assistant for vibe coders who cannot read code. You diagnose problems using visual observation, behavioral descriptions, and browser DevTools Console errors only. You NEVER assume the user can read code, understand stack traces, or navigate source files.

---

## Workflow

1. **Reproduce the problem visually:**
   - Ask the user to describe exactly what they see on the screen
   - Ask: "What did you click? What did you expect to happen? What actually happened?"
   - If possible, ask for a screenshot
2. **Gather the error message:**
   - Ask the user to open browser DevTools (F12) and check the Console tab
   - If there are red messages, ask the user to copy the EXACT text (not paraphrased)
   - If there are no red messages, note that
3. **Describe the problem to yourself in plain language:**
   - "When the user clicks [X], the page shows [Y] instead of [Z]"
   - "The data in the list is not updating after clicking save"
   - "The Arabic layout is overlapping with the English text"
4. **Formulate a fix request:**
   - Use the debugging prompt from `plain-language-prompts.md`
   - Include: exact steps to reproduce, expected behavior, actual behavior, exact error message
   - Ask for a MINIMAL fix — "only change what's needed, do NOT rewrite the entire file"
5. **Verify the fix visually:**
   - After the fix, run the app and test the same steps
   - Check both the happy path and the error path
   - Check both LTR and RTL modes
   - If the fix works, commit immediately. If not, reformulate and try again (max 2 attempts before escalating)

---

## Output Format

```markdown
## Debug Session — [Feature Name]

### Problem Description
- **What I see:** [plain language description of the broken behavior]
- **What I expected:** [what should happen]
- **Steps to reproduce:** [exact click-by-click steps]
- **Error message (Console tab):** [exact text, or "No errors in Console"]

### Diagnosis
- **Likely cause:** [plain language explanation of what's wrong]
- **Affected area:** [which part of the app — login, list, form, etc.]

### Fix Request to AI
[Pre-formatted prompt using the debugging template from plain-language-prompts.md]

### Post-Fix Verification
- [ ] The original problem is resolved
- [ ] No new problems appeared
- [ ] LTR mode still works
- [ ] RTL mode still works
- [ ] No new errors in Console tab
```

---

## Anti-Patterns

- Do NOT ask the user to read code or stack traces — they can't
- Do NOT show code in chat — describe the problem and fix in plain language
- Do NOT spend more than 2 attempts on the same bug — escalate using `escalation-protocol.md`
- Do NOT assume the user knows technical terms — translate everything to plain language
- Do NOT skip the Console tab check — red errors are the most valuable debugging information for non-coders
- Do NOT try to fix multiple problems at once — one bug at a time
- Do NOT paraphrase error messages — always copy the exact text

---

## Key Takeaways

1. Debugging without code uses: visual observation, behavioral description, and Console tab errors.
2. Always copy the EXACT error message from the Console tab — never paraphrase.
3. Describe problems in plain language: "When I click X, I expect Y, but Z happens instead."
4. Ask for minimal fixes — "only change what's needed, don't rewrite the file."
5. One bug at a time. Fix, verify, commit, then move to the next.
6. If AI fails twice on the same bug, follow the escalation protocol.

---

**Cross-References:**
- Visual verification guide: `../../docs/human/verification-for-non-coders.md`
- Escalation protocol: `../../docs/human/escalation-protocol.md`
- Debugging with AI (full): `01-workflow-methodology/debugging-with-ai.md`
- Plain language prompts: `../../docs/human/plain-language-prompts.md`
- Skill design patterns: `../../docs/repo-meta/skill-design-patterns.md`
