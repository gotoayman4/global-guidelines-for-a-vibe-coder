# Development Workflow — The Standard Loop

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,000 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `ai-collaboration-mindset.md`, `prompt-engineering-patterns.md`

---

**Core mandate — vertical slices only:** build one complete feature UI → API → DB before starting the next. Horizontal layering (all models, then all services, then all UI) is the #1 cause of "90% done, nothing works."

## The Loop

`INTENT → CONTEXT → PLAN → IMPLEMENT → TEST → REVIEW → REFACTOR → DOCUMENT → COMMIT → ITERATE`
A tight loop of 15–60 minutes per iteration — working, tested code every cycle.

## Phase Directives

1. **Intent (5%):** desired outcome, not implementation. Checklist: what it does (happy path) · who uses it · what must NOT happen · stack constraints · acceptance criteria ("done" = verifiable conditions).
2. **Context (10%):** provide 2–3 existing files as pattern references BEFORE generating — never assume the AI discovers conventions. Include exact versions, schema/API contracts, non-goals.
3. **Plan (15%):** for non-trivial changes demand a plan first (affected files, data model, API/UI changes, testing strategy, risks, rollback; propose 2–3 approaches simplest-first). Review: simplest that works? respects conventions? maintainable in a year? Architectural mistakes cost 5–10× after implementation.
4. **Implement (25%):** requested scope only — no unrelated refactors · preserve public APIs · no new dependencies without justification · 1–3 files per change, >5 files requires splitting into smaller iterations.
5. **Test (15%):** unit tests on business logic + integration at boundaries + E2E on critical flows + regression tests for fixed bugs. Tests verify BEHAVIOR not implementation. Review AI-generated assertions — AI writes tests that pass even when logic is wrong.
6. **Review (10%):** self-review prompt: "Review the produced code as a strict senior engineer — bugs, security, edge cases, performance, accessibility. Separate confirmed issues from concerns; propose fixes." Human checks: solves requirement · simpler option? · matches conventions · future sessions can modify safely.
7. **Refactor (10%):** behavior-preserving only (tests prove it); commit working state BEFORE refactoring; never mix refactor with feature changes in one iteration.
8. **Document (5%):** README setup steps, API docs, architecture notes, ICDC comments — same iteration as the code.
9. **Commit (5%):** conventional format (`feat(auth): …`). If you can't summarize the commit in one sentence, split it.

## Red Flags (stop)

Skipping the plan phase · horizontal layering (FORBIDDEN) · 10 features generated before running the app once · committing only at session end · "it compiled" accepted as done · mixing refactor with features · unreviewed AI tests passing.

## Cross-References

`planning-and-scoping.md` · `testing-patterns.md` · `code-review-workflow.md` · `refactoring-strategy.md` · `debugging-with-ai.md` · `ai-collaboration-mindset.md`
