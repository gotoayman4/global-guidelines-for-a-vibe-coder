# Context Management Strategy — Optimizing AI Attention

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,000 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `ai-collaboration-mindset.md`, `prompt-engineering-patterns.md`

---

## Purpose

Define the strategy and tactics for managing the scarcest resource in AI-assisted development: attention quality within the context window. As of 2026, context windows exceed 1M tokens — the constraint is no longer "will it fit?" but "will the AI pay attention to the right things?"

---

## The Attention Problem

Large context windows create a paradox: **more capacity enables sloppier input, and sloppier input degrades output quality.** When you dump an entire codebase into a 1M-token window, the AI:
- Loses track of critical constraints buried mid-conversation (the "needle in a haystack" problem)
- Generates increasingly inconsistent patterns in long sessions
- Begins ignoring rules files after ~50 messages of conversation
- Produces lower-quality reasoning on tasks in the middle of the context window ("lost in the middle" effect)

**Rule:** Context windows are about *reach*, not *density*. Use the extra space to include relevant files you'd otherwise omit — not to be lazy about curation.

---

## The Progressive Disclosure Strategy

Load only what the current task needs. Expand as needed. Never pre-load everything.

### Level 1: Task Trigger (always loaded)
The user's current prompt + the active file being edited. Zero overhead.

### Level 2: Direct Dependencies (loaded on demand)
Files directly relevant to the task — the component being modified, its immediate imports, its test file, the relevant guideline. Typically 3-8 files.

### Level 3: Context Dependencies (loaded when needed)
Files that provide broader context — parent components, API contracts, type definitions, architecture docs. Loaded only when the AI needs broader understanding.

### Level 4: Deep Dive (rarely loaded)
Full modules, complete guideline sets, documentation trees. Reserved for architecture reviews, major refactors, and onboarding.

---

## Session Hygiene

### Start Fresh for New Tasks

Do not carry one 80-message thread across five different features. The AI's attention degrades with conversation length. Best practice:

| Session Length | Attention Quality | Recommendation |
|---|---|---|
| 1-15 messages | Excellent | Ideal for focused tasks |
| 15-30 messages | Good | Still reliable for complex features |
| 30-50 messages | Degrading | Rules compliance begins to slip |
| 50+ messages | Poor | High risk of constraint violation |

**Practice:** Use `/clear`, "New Chat", or fresh agent sessions for each major feature. Transfer only the essential context (stack version, current file, task description). Do not copy entire conversation histories.

### The Handoff Pattern

When starting a new session for a related task:

```
Previous work: Implemented JWT auth middleware in /src/auth/jwt.ts. 
Tests pass. The middleware validates tokens on all /api/* routes.

Current task: Add role-based authorization on top of the JWT middleware.
Read /src/auth/jwt.ts before implementing.
```

Three sentences of context replace 40 messages of conversation history.

---

## File Tagging and Explicit Scoping

Never assume the AI will find the right file by searching. Explicitly tag relevant files.

**Preferred:** Use `@file` mentions (Cursor), file references (Claude Code), or explicit paths in your prompt.

```
Task: Update the user profile form to include avatar upload.

Reference files:
- /src/components/UserProfileForm.tsx
- /src/hooks/useFileUpload.ts
- /src/types/user.ts

Do NOT modify any other files.
```

**Why:** When an AI searches a 500-file monorepo, it often finds the wrong file with a similar name, reads outdated versions, or applies changes to the wrong module. Explicit tagging eliminates this failure mode.

---

## Token Budget Tiers

Apply the right depth for the task's scope:

| Budget Tier | Token Limit | Guideline Loading | When to Use |
|---|---|---|---|
| **Critical** | <10K tokens | Core principles only (no full guidelines) | Quick fixes, simple changes, known patterns |
| **Low** | 10-20K tokens | Primary guideline + compact extracts | Most feature work |
| **Medium** | 20-50K tokens | Full primary guidelines, compact secondary | Complex features, multi-file changes |
| **High** | >50K tokens | Full guidelines as needed | Architecture reviews, major refactors, onboarding |

**Compact extract format:** When loading guidelines in Low/Medium tiers, extract only:
1. Core Principles section
2. Anti-Patterns section
3. Relevant code patterns/templates
Skip: examples, extended reasoning, cross-references (they're in the index if needed).

---

## The Attention-Focusing Toolkit

### 1. File Scoping
"Only modify files in /src/auth/. Do not touch /src/api/ or /src/db/."

### 2. Explicit Ignore Rules
"Ignore the test files for now. Focus only on the implementation."

### 3. Step-by-Step Decomposition
Instead of one large prompt, break into sequential sub-steps:
- Step 1: Extract validation logic
- Step 2: Update middleware
- Step 3: Migrate routes
- Step 4: Add tests

Each step gets a clean, focused prompt. Each output is atomic and reviewable.

### 4. Summary Checkpoints
After significant progress in a long session, ask the AI to summarize what it knows about the task, constraints, and current state. This reveals attention drift before it produces bad code.

### 5. Constraint Repetition
In long sessions, re-state critical constraints every 10-15 messages:
"Reminder: We're using MUI v7, no new dependencies, all queries parameterized."

---

## Anti-Patterns in Context Management

| Anti-Pattern | Why It Fails | Fix |
|---|---|---|
| **Dumping the entire repo** | AI loses focus on what matters, fixes wrong things | Tag specific files; use progressive disclosure |
| **Never clearing sessions** | 100-message threads produce inconsistent, constraint-violating output | Fresh session per feature; handoff pattern for continuity |
| **Assuming AI will search correctly** | AI finds similar-looking files, not the right files | Explicit @file mentions and path references |
| **Loading all guidelines always** | Burns tokens on irrelevant advice; dilutes critical constraints | Token budget tiers; compact extracts for secondary guidelines |
| **One session = one project** | Cross-feature context pollution; attention fragmentation | One session per feature; parallel sessions for parallel work |

---

## The Golden Ratios

For any given task, aim for:
- **60-70%** of context: the code being modified + its direct dependencies
- **15-20%** of context: the relevant guideline(s) for the task type
- **10-15%** of context: the task description, constraints, and acceptance criteria
- **0-5%** of context: conversation history (the handoff summary, not the full thread)

These ratios maximize signal-to-noise. Code and constraints dominate. Conversation history barely registers.

---

## Key Takeaways

1. Attention quality degrades with conversation length. Fresh sessions beat long threads.
2. Progressive disclosure: load Level 1 → 2 → 3 → 4 only as needed.
3. Token budget tiers ensure you're loading the right depth for the task scope.
4. Explicit file tagging eliminates search-related failures.
5. Break complex tasks into sequential, focused steps — each in a clean prompt.
6. Use the handoff pattern (3-sentence summary) instead of copying conversation history.

---

## Cross-References

- **Depends on:** `ai-collaboration-mindset.md` — the "Control Context Aggressively" principle
- **Applied by:** `RETRIEVAL_RULES.md` (_index/) — the 5-step retrieval algorithm for AI agents
- **Applied by:** `prompt-engineering-patterns.md` — pattern 4 (Incremental Scope) and pattern 6 (Reference Conventions)
- **Applied by:** `ai-agent-orchestration.md` — context partitioning for parallel agents
