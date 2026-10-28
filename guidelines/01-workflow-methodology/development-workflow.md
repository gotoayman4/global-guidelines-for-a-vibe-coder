---
status: "Normative"
scope: "Global"
tags: [workflow, process, lifecycle]
---

# Development Workflow — The Standard Loop

---

**Core mandate — vertical slices only:** build one complete feature UI → API → DB before starting the next. Horizontal layering (all models, then all services, then all UI) is the #1 cause of "90% done, nothing works."

**Mode-aware:** phase depth scales with the declared mode in `speed-tiered-workflow.md` (`vibe | standard | guarded`). Intent → first running slice (minutes) is measured every iteration — speed is a first-class metric alongside correctness.

## The Loop

`INTENT → CONTEXT → PLAN → IMPLEMENT → TEST → REVIEW → REFACTOR → DOCUMENT → COMMIT → ITERATE`
A tight loop of 15–60 minutes per iteration (`vibe` mode targets the low end) — working code every cycle; tested code every cycle outside vibe.

## Phase Directives

1. **Intent (5%):** desired outcome, not implementation. Checklist: what it does (happy path) · who uses it · what must NOT happen · stack constraints · acceptance criteria ("done" = verifiable conditions). In vibe mode, three bullets replace the full checklist for small changes.
2. **Context (10%):** point at existing files as pattern references when the convention is not obvious from the tree — never assume the AI discovers conventions on its own. Include exact versions, schema/API contracts, non-goals. **Budget it by mode:** `vibe ≤40K`, `standard ≤90K`, `guarded ≤160K` tokens read before the first edit (`speed-tiered-workflow.md` §The Context Budget). Name the files the task needs; the `_guidelines/` mirror is a menu, not a checklist. Reading past the cap is allowed only with one recorded line saying what was read and why.
3. **Plan (15%):** depth by mode — vibe: 3-bullet intent, no plan-approval gate (never skip planning when auth, payments, or schema are touched). standard/guarded: non-trivial changes demand a plan first (affected files, data model, API/UI changes, testing strategy, risks, rollback; propose alternatives only when the choice is not obvious). Review: simplest that works? respects conventions? maintainable in a year? Architectural mistakes cost 5–10× after implementation.
4. **Implement (25%):** requested scope only — no unrelated refactors · preserve public APIs · no new dependencies without justification · keep the change to the files the feature needs; split when the change cannot be summarised in one sentence, not at a file count.
5. **Test (15%):** depth by mode per `testing-philosophy.md` — vibe: smoke run + regression test on second bite or at milestone. standard/guarded: unit tests on business logic + integration at boundaries + E2E on critical flows + regression tests for fixed bugs. Tests verify BEHAVIOR not implementation. Review AI-generated assertions — AI writes tests that pass even when logic is wrong.
6. **Review (10%):** self-review prompt: "Review the produced code as a strict senior engineer — bugs, security, edge cases, performance, accessibility. Separate confirmed issues from concerns; propose fixes. Run the checks you cite." Checklist: solves requirement · simpler option? · matches conventions · future sessions can modify safely. An independent fresh-session AI review is mandatory for auth, payments, permissions, destructive data changes, and new dependencies; there is no human reviewer. Vibe mode may collapse the self-review into the run-it-once check for trivial changes (Tier 0).
7. **Refactor (10%):** behavior-preserving only (tests prove it); commit working state BEFORE refactoring; never mix refactor with feature changes in one iteration.
8. **Document (5%):** per `documentation-strategy.md` — a trigger-table match updates that fact's one home in the same iteration, in every mode; a non-trigger change writes nothing.
9. **Commit (5%):** conventional format (`feat(auth): …`). If you can't summarize the commit in one sentence, split it. Vibe mode MAY batch related micro-edits into one conventional commit; never end a session uncommitted.

## Red Flags (stop)

Skipping planning on auth/payments/schema work (any mode) · horizontal layering (FORBIDDEN) · 10 features generated before running the app once · committing only at session end · "it compiled" accepted as done · mixing refactor with features · unreviewed AI tests passing · vibe mode crossing the ship boundary without critical-flow checks.

## Cross-References

`speed-tiered-workflow.md` · `planning-and-scoping.md` · `testing-patterns.md` · `code-review-workflow.md` · `refactoring-strategy.md` · `debugging-with-ai.md` · `ai-collaboration-mindset.md`
