# Development Workflow — The Vibe Coder's Standard Loop

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,200 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `ai-collaboration-mindset.md`, `prompt-engineering-patterns.md`

---

## Purpose

Define the standard, repeatable development loop for AI-assisted software engineering. This workflow is the operational backbone — every feature, fix, and refactor follows this pattern. Deviation should be intentional, not accidental.

**Core Mandate — Vertical Slices Only:** ALWAYS build one complete feature from UI → API → Database before moving to the next feature. Building by horizontal layers (all models first, then all services, then all UI) is the #1 cause of "90% done, nothing works." Each iteration must produce a working, testable, end-to-end feature — however thin.

---

## The Core Loop: Intent → Context → Plan → Implement → Test → Review → Refactor → Document → Commit → Iterate

```
INTENT  →  CONTEXT  →  PLAN  →  IMPLEMENT  →  TEST  →  REVIEW  →  REFACTOR  →  DOCUMENT  →  COMMIT  →  ITERATE
   ↑                                                                                                    ↓
   └────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

This is not a waterfall. It's a tight loop where each iteration takes 15-60 minutes. The goal is working, tested, reviewed code at the end of every iteration — not after a week of generating.

---

## Phase 1: Intent (5% of effort)

Start with the desired outcome, not the implementation.

**Poor intent:**
- "Make this better."
- "Add login."
- "Fix the bug."

**Good intent:**
- "Improve the registration flow so it validates email format, password strength (min 8 chars, 1 special), and duplicate accounts before creating a user. Keep the existing database schema unchanged."
- "Add JWT-based login with refresh token rotation. Use the existing /src/auth middleware pattern. Rate-limit to 5 attempts per minute."

**The intent checklist:**
- What should the feature do? (happy path)
- Who will use it? (user context)
- What must NOT happen? (boundaries and out-of-scope)
- What technologies are required/forbidden? (stack constraints)
- What does "done" look like? (acceptance criteria)

---

## Phase 2: Context (10% of effort)

Provide the AI with relevant files, conventions, and constraints BEFORE it generates anything.

**Context to provide:**
- Relevant existing files (tag explicitly with @file or path references)
- Framework versions (locked to exact versions)
- Database schema if relevant
- API contracts / TypeScript types
- Existing patterns that must be followed
- Non-goals (what not to touch)

**Rule:** Always point at 2-3 existing files as pattern references. Never assume the AI will discover conventions on its own. Pattern drift accumulates silently across sessions.

---

## Phase 3: Plan (15% of effort)

For non-trivial changes, demand a plan before code. The cost of fixing an architectural mistake after implementation is 5-10x higher.

**Planning prompt template:**
```
Create an implementation plan for [feature]. Include:
- Affected files
- Data model changes (if any)
- API changes (if any)
- UI changes (if any)
- Testing strategy
- Risks and edge cases
- Rollback considerations

Propose 2-3 approaches starting with the simplest. 
Explain trade-offs. Do not write code yet.
```

**Plan review checklist:**
- [ ] Is this the simplest approach that works?
- [ ] Are there unnecessary dependencies or abstractions?
- [ ] Does the plan respect existing project conventions?
- [ ] Are there hidden assumptions about the existing codebase?
- [ ] Would this be maintainable for one year?

---

## Phase 4: Implement (25% of effort)

Implementation should be narrow, traceable, and reversible.

**Rules for AI implementation:**
- Implement only the requested scope. No unrelated refactors.
- Preserve public APIs unless explicitly instructed to change them.
- Keep changes minimal, readable, and consistent with existing patterns.
- Do not introduce new dependencies without justification.
- Changes should be in 1-3 files. Never modify more than 3-5 files in a single iteration without review. If touching more, split into smaller iterations.

**Implementation prompt template:**
```
Implement the approved plan for [feature].

Reference files:
- [file paths for pattern reference]

Constraints:
- Do not change [out-of-scope areas]
- Use [specific libraries/patterns]
- Maintain backward compatibility with [existing APIs]

Output:
1. Modified files with changes inline
2. Summary of what changed and why
3. Verification steps
```

---

## Phase 5: Test (15% of effort)

Every implementation must be tested. AI-generated code without tests is unverified code.

**Minimum testing layers:**
1. **Unit tests** for core business logic and validation
2. **Integration tests** for API endpoints and database interactions
3. **E2E tests** for critical user flows (login, payments, core workflows)
4. **Regression tests** for fixed bugs (prevent re-emergence)

**Rules for AI-generated tests:**
- Tests should verify BEHAVIOR, not implementation details
- Review all AI-generated test assertions — AI often writes tests that pass even when logic is wrong
- Ask for edge case tests explicitly: "Write a test for empty input, null input, and a 10MB upload"
- Never trust AI-generated tests without reading them

---

## Phase 6: Review (10% of effort)

Review AI output as a strict senior engineer would. AI can self-review, but do not rely solely on that.

**Self-review prompt (ask the AI after generating):**
```
Review the code you just produced as a strict senior engineer. 
Look for: bugs, security issues, edge cases, performance problems, 
accessibility issues, and maintainability concerns. 
Clearly separate confirmed issues from possible concerns. 
Then propose fixes for confirmed issues.
```

**Human review checklist:**
- [ ] Does the code actually solve the requirement?
- [ ] Is there a simpler solution?
- [ ] Does it match project conventions?
- [ ] Can future AI sessions modify this safely?
- [ ] Can failures be diagnosed easily?
- [ ] Is behavior verifiable with tests?
- [ ] Are there security issues? (See `ai-security-governance.md`)

---

## Phase 7: Refactor (10% of effort)

After review, refactor for clarity and maintainability — without changing behavior.

**Refactoring rules:**
- Preserve all existing behavior (verified by tests)
- Identify and state the reason for each refactor
- Run tests before and after each refactor
- Commit working state BEFORE refactoring (rollback safety)
- Do not mix refactoring with feature changes in the same iteration

---

## Phase 8: Document (5% of effort)

Documentation is part of implementation, not an afterthought.

**Documentation to update:**
- README (setup steps, environment variables)
- API documentation (new/changed endpoints)
- Architecture notes (design decisions, trade-offs)
- Inline comments (complex logic rationale, not what the code does)
- Known limitations and troubleshooting

---

## Phase 9: Commit (5% of effort)

Commit after every working increment. Frequent, small commits are your rollback safety net.

**Commit message convention:**
```
feat(auth): add password reset flow
fix(api): validate missing user email  
test(payments): cover failed refund scenario
docs(setup): document environment variables
refactor(ui): simplify dashboard card layout
```

**Rule:** If you can't write a single-sentence summary of what this commit changes, the commit is too large. Split it.

---

## Phase 10: Iterate

The loop doesn't end. Each completed iteration produces a deployable increment. The next iteration starts with a new intent based on what was learned.

---

## Workflow Health Checks

**Red flags (stop and fix):**
- Skipping the plan phase on non-trivial changes
- Building horizontal layers first (all models, then all routes, then all pages) — FORBIDDEN
- Generating 10 features before running the app once
- Committing only at the end of a multi-hour session
- Accepting AI output without review because "it compiled"
- Mixing refactoring with feature work in the same commit
- Letting AI-generated tests pass without reading them

**Green flags (continue):**
- Each iteration produces a small, reviewable change
- Tests pass and were reviewed before acceptance
- Commits are granular and have clear messages
- The app runs and passes manual smoke tests after each iteration
- Documentation is updated in the same iteration as the code change

---

## Key Takeaways

1. Follow the loop religiously. Skipping phases produces technical debt.
2. Plan before code. Architecture mistakes caught late cost 5-10x more.
3. One feature per iteration. Multi-feature iterations are unreviewable.
4. Tests before trust. AI-generated code is unverified until tested.
5. Commit after every working increment. Granular commits = cheap rollbacks.
6. The loop should complete in 15-60 minutes. If it takes longer, the scope is too large.

---

## Cross-References

- **Depends on:** `ai-collaboration-mindset.md` — the principles that justify each phase
- **Applied by:** `prompt-engineering-patterns.md` — the prompting patterns used in each phase
- **Extended by:** `planning-and-scoping.md` — deep dive on the Plan phase
- **Extended by:** `debugging-with-ai.md` — what to do when the loop breaks
- **Extended by:** `code-review-workflow.md` — deep dive on the Review phase
- **Extended by:** `refactoring-strategy.md` — deep dive on the Refactor phase
