# Code Review Workflow — Quality Gates for AI-Generated Code

**Status:** Advisory
**Scope:** Global
**Token Tier:** Full (~1,600 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `development-workflow.md`, `ai-security-governance.md`

---

## Purpose

Define the code review process for AI-generated code. AI output is a first draft — review is how it becomes production-quality. This workflow applies whether you're reviewing alone, with an AI reviewer, or with human collaborators.

---

## The Review Mindset

Review AI-generated code with MORE skepticism than human-written code. AI produces code that:
- Looks professional (even when wrong)
- Compiles cleanly (even when logically flawed)
- Follows patterns you didn't ask for
- Omits edge case handling silently
- Introduces vulnerabilities in every fourth prompt

**Rule:** Assume every line of AI-generated code is wrong until you've verified it. This isn't cynicism — it's the correct prior based on empirical evidence.

---

## The Two-Phase Review

### Phase 1: AI Self-Review (Quick Filter)

Before you invest time reviewing, ask the AI to review its own work. This catches the obvious mistakes.

```
Review the code you just produced as a strict senior engineer.
Look for:
- Bugs and logic errors
- Security vulnerabilities (OWASP Top 10)
- Missing edge cases
- Performance problems
- Accessibility issues
- Maintainability concerns

Clearly separate:
- Confirmed issues (definitely wrong)
- Possible concerns (might be wrong, needs human judgment)

For each confirmed issue, propose the minimal fix.
```

**What AI self-review catches:** syntax errors, missing imports, obvious logic flaws, patterns it knows are deprecated.

**What AI self-review misses:** business logic errors, domain-specific edge cases, architectural misfits, security vulnerabilities it doesn't recognize as vulnerabilities.

---

### Phase 2: Human Review (The Real Gate)

Your review. The AI's self-review is a filter, not a replacement.

**Review checklist — apply to every AI-generated change:**

**Correctness:**
- [ ] Does this actually solve the stated requirement?
- [ ] Are all acceptance criteria met?
- [ ] Are edge cases handled? (null, empty, large inputs, concurrent access)
- [ ] Is error handling present and correct? (not leaking internals)

**Security (see `ai-security-governance.md` for full list):**
- [ ] Are all database queries parameterized?
- [ ] Are auth checks present on every protected route?
- [ ] Are user inputs validated server-side?
- [ ] Are there any hardcoded secrets, tokens, or keys?
- [ ] Is CORS restricted to explicit origins?

**Consistency:**
- [ ] Does the code follow existing project conventions?
- [ ] Are naming conventions consistent with the rest of the codebase?
- [ ] Is the pattern correct? (not a new pattern the AI invented)

**Simplicity:**
- [ ] Is there a simpler solution?
- [ ] Are there unnecessary abstractions or dependencies?
- [ ] Would a junior developer understand this code?

**Maintainability:**
- [ ] Can future AI sessions modify this safely?
- [ ] Is the code partitioned into appropriately sized files?
- [ ] Are public APIs stable and documented?

**Testability:**
- [ ] Can the behavior be verified with automated tests?
- [ ] Are tests included and do they test behavior (not implementation)?

---

## The Multi-Agent Review Pattern

For critical code paths (auth, payments, permissions), use multiple reviewers.

```
Agent 1 (Security Reviewer): Audit for OWASP Top 10, auth bypass, injection
Agent 2 (Performance Reviewer): Audit for N+1 queries, memory leaks, render bottlenecks
Agent 3 (Test Reviewer): Audit test coverage, edge case coverage, assertion quality

Human synthesizes findings → Only merge when all three pass.
```

Each reviewer gets the same code diff but a different review focus. The specialization catches more than one general reviewer.

---

## Review by Change Size

| Change Size | Review Approach | Merge Criteria |
|---|---|---|
| **1 file, <50 lines** | Quick scan + run tests | Tests pass + no obvious issues |
| **1-3 files, <200 lines** | Full checklist review | All checklist items pass |
| **3-5 files, <500 lines** | Full review + AI self-review + run all tests | Full checklist + regression suite passes |
| **5+ files, 500+ lines** | **Reject.** Ask AI to split into smaller changes. | N/A — split first, then review separately |

**Rule:** If the diff is too large to review thoroughly in 15 minutes, it's too large. Reject and demand smaller increments.

---

## Review Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Skimming because "the AI is smart"** | Vulnerabilities and logic errors ship to production | Full checklist for every change |
| **Reviewing only the diff, not the behavior** | Code looks clean but does the wrong thing | Test the actual behavior before approving |
| **Accepting "it compiled" as verification** | Compilation catches syntax, not logic, not security | Run tests + manual smoke test |
| **Delegating review entirely to AI** | AI can't assess business logic correctness | Human reviews business logic; AI reviews patterns |
| **Rubber-stamping small changes** | "Small" doesn't mean "safe" — one line can be catastrophically wrong | Apply checklist regardless of change size |

---

## The Review Loop

```
AI GENERATES → AI SELF-REVIEWS → AI FIXES → HUMAN REVIEWS → HUMAN REQUESTS CHANGES → AI FIXES → HUMAN APPROVES → MERGE
```

Do not merge after AI self-review alone. Do not merge without running tests. Do not merge anything you haven't read.

---

## Key Takeaways

1. Two-phase review: AI self-review filters obvious issues; human review is the real gate.
2. Use the checklist. Every time. No exceptions for "small" changes.
3. Multi-agent review for critical paths (auth, payments, permissions).
4. Reject diffs larger than 500 lines. Split into smaller, reviewable increments.
5. AI self-review catches syntax and patterns; it misses business logic and domain edges.

---

## Cross-References

- **Depends on:** `development-workflow.md` — the Review phase in the standard loop
- **Depends on:** `ai-security-governance.md` — the security review checklist
- **Applied by:** `testing-philosophy.md` — tests as the verification mechanism
