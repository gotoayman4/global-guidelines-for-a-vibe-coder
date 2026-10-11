---
status: "Normative"
scope: "Global"
tags: [escalation, debugging, troubleshooting]
---

# Escalation Protocol — When AI Fails, What to Do Next

---

## Purpose

AI tools fail. They produce incorrect code, hallucinate APIs, misunderstand requirements, and get stuck in loops. This document provides a clear escalation path: what to try, in what order, and when to step outside the current approach (including, as a last resort, outside help).

---

## The Escalation Ladder

Follow these levels IN ORDER. Do not skip levels.

### Level 1: Reformulate (0-5 minutes)

**What:** Rewrite your prompt using different words.

**How:**
- Describe the problem from a different angle
- Use the verification prompt template (see `plain-language-prompts.md`)
- Add more constraints (what NOT to do)
- Point at 2-3 existing files as style references
- Break the task into a smaller piece

**When to move on:** AI fails twice on the same problem after reformulation.

### Level 2: Web Search (5-15 minutes)

**What:** Search the web for up-to-date documentation and solutions.

**How:**
- Tell your AI tool: "I failed twice. Search for current documentation before retrying."
- Search yourself: `[technology name] + [error message]` or `[technology name] + [what you want to do]`
- Check official documentation sites, not forum posts from 3 years ago
- Look for Stack Overflow answers with recent dates

**When to move on:** Web search confirms the technology/API doesn't work as AI claims, or no solution is found.

### Level 3: Reduce Scope (15-30 minutes)

**What:** Strip the problem down to the smallest possible version.

**How:**
- Ask AI to build the absolute minimum version of the feature
- Remove all constraints that aren't strictly necessary
- Solve the core problem first, then add complexity back one step at a time
- Create a new, clean branch for the reduced version

**When to move on:** Even the minimal version fails, or the core technology approach is wrong.

### Level 4: Alternative Approach (30-60 minutes)

**What:** Try a completely different technical approach.

**How:**
- Ask AI: "This approach isn't working. What's a completely different way to achieve the same goal?"
- Switch from library A to library B (e.g., from Redux to Zustand, from REST to GraphQL)
- Simplify: remove a feature or use a simpler architecture
- Check `WORLD.md` — is this feature even required, or is it scope creep?

**When to move on:** No alternative approach works, or the feature requires fundamental architectural knowledge you lack.

### Level 5: Community and Documentation (1-2 hours)

**What:** Seek help from human communities.

**How:**
- Post on Stack Overflow with exact error message and minimal reproduction
- Search GitHub Issues for the library/technology you're using
- Ask in relevant Discord/Slack communities
- Check the technology's official documentation and examples

**When to move on:** Community confirms it's a known issue with no workaround, or you've spent 2+ hours on a single problem.

### Level 6: Professional Help (Last Resort)

**What:** Hire or consult a developer.

**How:**
- Prepare a clear description: what you want, what you tried, what failed
- Include the exact error message and minimal reproduction steps
- Specify which guideline approach you attempted
- Budget for 1-2 hours of professional consultation — this is cheaper than 10+ hours of circular AI attempts

**When to move on:** You should have moved on to this level already if you've spent more than 2 hours on a single problem.

---

## Per-Error-Type Escalation Shortcuts

Some error types have faster escalation paths:

| Error Type | Skip To Level | Why |
|---|---|---|
| **"Module not found" or "Package does not exist"** | Level 2 immediately | AI likely hallucinated the package name. Search web first. |
| **Type errors after AI change** | Level 1 with exact error | Reformulate: paste the exact error message and ask AI to fix only that error |
| **App crashes on startup** | Level 3 immediately | Strip down to minimal version. Something fundamental is broken. |
| **Authentication/security issues** | Levels 1–4 with extra rigor | Auth mistakes are catastrophic — exhaust the AI-side ladder before considering outside help. |
| **Database migration failures** | Level 2 immediately | Check the database docs. AI often hallucinates migration syntax. |
| **RTL/layout issues** | Level 1 with screenshot | Reformulate with exact visual description of what's wrong. |
| **AI keeps generating the same broken code** | Level 4 immediately | The approach is wrong. Try a different method entirely. |

---

## Time-Based Escalation Rules

| Time Spent on One Problem | Action |
|---|---|
| 0-5 minutes | Reformulate and retry |
| 5-15 minutes | Search the web |
| 15-30 minutes | Reduce scope to minimal version |
| 30-60 minutes | Try alternative approach |
| 1-2 hours | Seek community help |
| 2+ hours | Stop. Get professional help. |

**Soft rule:** after 2 hours on a single problem, step back and try a different rung of the ladder. A solo project has no reviewer to fall back on — the ladder is your escalation path, not a requirement.

---

## What to Do When You're Stuck Right Now

Copy this prompt and give it to your AI tool:

```
I'm stuck. I've been trying to solve this problem for [X] minutes.

Problem: [describe in plain language]
What I've tried: [list approaches]
Error message: [paste exact error]
What I expected: [describe desired behavior]

Please suggest 3 completely different approaches to solve this.
For each approach, tell me: how simple it is, how long it should take,
and what could go wrong.
```

---

## Anti-Patterns

| Anti-Pattern | Why It's Dangerous |
|---|---|
| Repeating the same prompt 5+ times | AI will produce the same broken output — reformulate instead |
| Skipping web search | For package/API issues, web search almost always finds the answer faster |
| Trying to fix auth/security with AI alone without exhausting the ladder | Auth mistakes are catastrophic — escalate with extra rigor. |
| Spending 4+ hours on one problem | Sunk cost fallacy. Escalate. Professional help is cheaper. |
| Asking AI "what's wrong?" without giving the error message | AI needs the exact error text. Always copy-paste, never paraphrase. |

---

## Key Takeaways

1. Follow the escalation ladder IN ORDER: Reformulate → Web Search → Reduce Scope → Alternative Approach → Community → Professional Help.
2. Never repeat the same prompt more than twice. Reformulate or try a different approach.
3. Copy exact error messages. Never paraphrase errors for AI.
4. Security and auth issues: escalate through the ladder with extra rigor.
5. Time-box: after 2 hours on any single problem, step back and change level.

---

## Cross-References

- **Companion to:** `ai-collaboration-mindset.md` — the "Know When to Drop Out of AI Mode" section
- **Companion to:** `debugging-with-ai.md` — the structured debugging loop
- **Prerequisite for:** `beginner-vibe-coder-guide.md` — red flag detection