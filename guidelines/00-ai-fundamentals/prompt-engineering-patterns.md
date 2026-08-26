# Prompt Engineering Patterns — Structured AI Communication

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~700 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `ai-collaboration-mindset.md`, `context-management-strategy.md`

---

## Core Pattern: Role → Goal → Context → Constraints → Output

Every prompt includes all five; omitting any degrades quality predictably. Anti-pattern: "Make this better" — the most expensive two-token prompt (generation cost + rework cost).

## The 7 Patterns

1. **Constraint-first:** state what NOT to do before what to do ("Do NOT add dependencies · no multi-step · MUI only"). Constraints prune the output space more powerfully than instructions.
2. **Progressive refinement:** scout broad ("show me 3 approaches") → evaluate → constrain to one approach → review output → pinpoint corrections. First output is always a draft.
3. **Plan-before-code:** for non-trivial features, force a plan first and forbid code until reviewed. Plans are cheap; rewrites cost 5–10×.
4. **Incremental scope (1-feature rule):** one prompt = one change. Multi-task prompts multiply hallucination surface and produce unreviewable diffs.
5. **Force reasoning before generation:** "Before writing code, explain: why this approach, trade-offs, edge cases handled/not, what would make this wrong in production." If the AI can't articulate the why, the code won't be good.
6. **Reference existing conventions:** point at 2–3 existing files per prompt ("read useApi.ts and ErrorBoundary.tsx; follow these patterns exactly"). AI treats each session as a new project unless told otherwise.
7. **Specify output format:** e.g., summary (≤3 sentences) → modified files inline → files to test → risks to verify manually.

## Calibration Ladder

Vague ("add login") → unusable · Goal-only → partial · Constrained (+ pattern refs) → mostly usable · Specified (all five elements) → verify-only · Calibrated (specified + 2–3 iterations) → production-ready.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| "Do it right" | Define right: tests pass, lint clean |
| Mega-prompt (auth+payments+tests) | Separate focused prompts |
| No reference files | 2–3 pattern files every time |
| Accepting first output | Iterate at least once |
| No acceptance criteria | "This is correct when: [conditions]" |
| Over-specifying HOW | Specify WHAT, not implementation |

## Cross-References

`ai-collaboration-mindset.md` · `context-management-strategy.md` · `development-workflow.md` · `ai-agent-orchestration.md`
