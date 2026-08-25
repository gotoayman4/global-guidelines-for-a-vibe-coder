# Prompt Engineering Patterns — Structured AI Communication

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,100 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `ai-collaboration-mindset.md`, `context-management-strategy.md`

---

## Purpose

Define repeatable, high-signal patterns for composing prompts that produce deterministic, high-quality AI output. These patterns apply across all AI coding assistants, IDEs, and LLM interfaces.

---

## The Core Pattern: Role → Goal → Context → Constraints → Output

Every effective prompt follows this structure. Omit any element and quality degrades predictably.

| Element | Purpose | Example |
|---|---|---|
| **Role** | Set the AI's persona and expertise level | "You are a senior React engineer reviewing code for accessibility issues." |
| **Goal** | Define the specific outcome | "Refactor this component to use React Server Components." |
| **Context** | Provide relevant background | "This component is part of a dashboard that renders 100+ data cards. Current performance is 2.3s FCP." |
| **Constraints** | Bound the solution space | "Use MUI v7 components only. Do not introduce new dependencies. Keep bundle impact under 5KB." |
| **Output** | Specify format and structure | "Output the refactored component as a single file with inline comments explaining each change." |

**Anti-pattern:** "Make this better" — this is the most expensive two-token prompt you'll ever write. It costs you the tokens to send it plus the tokens to fix whatever the AI guesses you meant.

---

## Pattern 1: Constraint-First Prompting

Define what the AI must NOT do before defining what it should do. Constraints eliminate entire categories of wrong output.

```
You are building a user registration form. 

CONSTRAINTS:
- Do NOT use any third-party form libraries (no Formik, no react-hook-form)
- Do NOT make the form multi-step
- Do NOT add CAPTCHA integration
- Use only MUI v7 components

IMPLEMENT:
A single-page registration form with email, password (with strength indicator), and submit.
```

**Why this works:** AI models optimize for completeness. Without negative constraints, they add libraries, patterns, and features you didn't ask for. Constraints are more powerful than instructions because they actively prune the model's output space.

---

## Pattern 2: Progressive Refinement

Start broad, observe output, then narrow with specific corrections. Never expect perfect output on the first prompt.

**Iteration loop:**

1. **Scout prompt** — "Show me 3 approaches to implementing a search bar with autocomplete in React + MUI."
2. **Evaluate** — Compare approaches. Pick one.
3. **Constrain prompt** — "Implement approach #2 (MUI Autocomplete + debounced fetch). Use a custom hook for the debounce logic. Handle loading, empty, and error states."
4. **Review** — Test the output. Identify gaps.
5. **Pinpoint prompt** — "The debounce hook doesn't cancel in-flight requests on unmount. Fix this with an AbortController."

**Why this works:** Each iteration reduces ambiguity. The AI's probability distribution narrows with each constraint, producing more deterministic output. This is the difference between shotgun prompting and surgical prompting.

---

## Pattern 3: Plan-Before-Code

For non-trivial features, force the AI to produce a plan before writing a single line of code. This exposes hidden assumptions before they become code.

```
Task: Add role-based access control to the admin dashboard.

Step 1: Produce an architecture plan covering:
  - Permission model (roles, permissions, inheritance)
  - Where authorization checks live (middleware? hooks? both?)
  - How the UI adapts to permissions (hidden vs disabled elements)
  - Database schema changes required

Do NOT write code yet. I will review the plan and then ask you to implement.
```

**Why this works:** The cost of fixing an architectural mistake after code generation is 5-10x higher than catching it in the planning phase. Plans are cheap; rewrites are expensive. This pattern also forces the human to engage as a reviewer before committing to an implementation direction.

---

## Pattern 4: Incremental Scope (The 1-Feature Rule)

Each prompt should target exactly one change: one feature, one refactor, one bug fix, one component. Never ask for multiple unrelated changes in one prompt.

**Good:**
- "Add email validation to the registration form."
- "Refactor the auth middleware to use the new JWT library."
- "Fix the 500 error on the /api/users endpoint."

**Bad:**
- "Add email validation, refactor auth, and fix the 500 error on users." — Three unrelated tasks, three times the hallucination surface area, zero reviewability.

**Why this works:** Each additional task in a prompt multiplies the probability that at least one output will be wrong. One task = one review cycle = one clean commit. Multi-task prompts produce diffs that are impossible to review atomically.

---

## Pattern 5: Ask "Why" — Force Reasoning Before Generation

Require the AI to explain its reasoning before producing output. This surfaces weak decisions before they become code.

```
Before writing code, explain:
- Why this approach over alternatives
- What trade-offs you're making
- What edge cases this solution handles (and which it doesn't)
- What would make this solution wrong for production

Then implement.
```

**Why this works:** AI models are pattern-matchers, not engineers. They will confidently suggest a microservice architecture for a todo app because they've seen it in training data. Forcing explicit reasoning before generation catches these misfires. If the AI can't articulate a good "why," the code won't be good either.

---

## Pattern 6: Reference Existing Conventions

Always point the AI at existing project patterns. Never assume it will discover them.

```
Before modifying the codebase, read:
- /src/hooks/useApi.ts (our API call pattern)
- /src/components/ErrorBoundary.tsx (our error handling pattern)
- .eslintrc.json (our linting rules)

Follow these patterns exactly. Do not introduce new patterns.
```

**Why this works:** AI treats each session as a new project unless told otherwise. Without explicit references, it generates code in its own preferred style — which may be completely inconsistent with your codebase. Pattern drift accumulates silently and destroys codebase coherence.

---

## Pattern 7: Output Format Specification

Specify exactly how you want the output structured. This makes review faster and reduces ambiguity.

```
Output format:
1. A summary of changes (max 3 sentences)
2. The complete modified file(s) with changes inline
3. A list of files that should be tested after applying changes
4. A list of risks or edge cases I should verify manually
```

---

## Prompt Calibration Reference

| Prompt Quality | Characteristics | Typical Output Quality |
|---|---|---|
| **Vague** | "Add login" | Unusable: wrong stack, missing security, inconsistent patterns |
| **Goal-only** | "Add login with JWT" | Partially usable: needs major refactoring |
| **Constrained** | "Add login with JWT using our existing auth middleware pattern. Read /src/auth/ first." | Mostly usable: needs review and minor fixes |
| **Specified** | Role + Goal + Context + Constraints + Output format + Reference files | Highly usable: needs verification testing only |
| **Calibrated** | Specified + iterated 2-3 times with corrections | Production-ready after standard review |

---

## Anti-Patterns in Prompting

| Anti-Pattern | Why It Fails | Fix |
|---|---|---|
| **"Do it right"** | "Right" has no meaning to an AI | Specify exactly what "right" means: tests pass, linting clean, no new dependencies |
| **The mega-prompt** | One prompt for auth + payments + dashboard + tests | Break into separate, focused prompts |
| **No reference files** | AI invents its own patterns | Always point at 2-3 existing files as pattern templates |
| **Accepting first output** | First output is always a draft | Treat as draft. Iterate at least once. |
| **Prompting without acceptance criteria** | No way to verify output matches intent | Include: "This is correct when: [specific verifiable conditions]" |
| **Over-specifying implementation** | "Use a for-loop, then a reduce, then..." — you're writing code in prose | Specify WHAT, not HOW. Let the AI choose implementation details. |

---

## Key Takeaways

1. Every prompt should include: Role, Goal, Context, Constraints, Output format.
2. Constraints (what NOT to do) are more powerful than instructions (what TO do).
3. Plan before code. Architecture mistakes caught at the planning stage cost nothing.
4. One feature per prompt. Multi-task prompts are unreviewable.
5. Iterate: first output is a draft. Quality comes from the refinement loop.
6. Reference existing files. Never let the AI invent its own project conventions.

---

## Cross-References

- **Depends on:** `ai-collaboration-mindset.md` — foundational principles for AI interaction
- **Extended by:** `context-management-strategy.md` — token and attention optimization techniques
- **Applied in:** `development-workflow.md` — these patterns embedded in the workflow loop
- **Applied in:** `ai-agent-orchestration.md` — multi-agent prompt composition
