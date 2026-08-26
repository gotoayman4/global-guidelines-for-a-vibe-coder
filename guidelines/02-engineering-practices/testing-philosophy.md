# Testing Philosophy — Survival Infrastructure for AI-Assisted Development

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~800 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `ai-collaboration-mindset.md`, `testing-patterns.md`

---

**The less code you write yourself, the more important testing becomes.** Vibe coding creates a trust deficit between what the code does and what you believe it does. Tests are the only mechanism that closes the gap. Testing is not quality assurance — it is **survival infrastructure**: without tests, AI progressively corrupts the codebase with each session and you have no way to detect it.

## Directives

1. **Primary objective: regression containment.** Most vibe-coded apps fail because later AI changes silently break existing behavior — not because the first version was imperfect. Prevent working features from breaking; don't chase 100% coverage.
2. **Tests are behavioral contracts:** they define WHAT (inputs → outputs), never HOW (internals, spies, call counts). Behavioral tests survive refactoring; implementation tests create false confidence.
3. **Tests are the executable specification.** When context is lost, models change, or a new agent joins — tests remain and constrain AI behavior.
4. **AI-optimized pyramid:** integration ~45% (API contracts, DB, service boundaries) · behavioral unit ~30% · E2E ~15% (login, payments, core workflows) · static ~10% (tsc strict, ESLint). Unit tests de-emphasized — AI-written ones mirror implementation and break on refactor.
5. **Protect critical flows first:** login/auth · payments · permissions · data persistence · core workflows must NEVER silently break. Then contract shapes, form validation, search. Layout snapshots last.
6. **Never trust AI-generated tests without review.** They are often tautological or shallow. Verify: assertions check correct behavior (not "function was called") · edge cases covered (null/empty/boundaries) · test fails when behavior is wrong (break the code deliberately) · one behavior per test.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| No tests | Minimum: E2E for critical flows |
| Implementation-mirroring tests | Behavioral contracts |
| Trusting AI-generated tests | Review assertions + failure behavior |
| Coverage-percentage obsession | Protect critical flows instead |
| Tests written after features | Same iteration at minimum |
| E2E-only | Integration layer for fast feedback |

## Cross-References

`testing-patterns.md` (the HOW) · `agent-verification-loop.md` · `refactoring-strategy.md`
