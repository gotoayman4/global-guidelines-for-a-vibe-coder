# Documentation Strategy — Knowledge Persistence for AI and Humans

**Status:** Advisory
**Scope:** Global
**Token Tier:** Full (~600 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `ai-code-documentation.md`

---

Documentation is the memory layer of vibe coding: AI sessions start with zero context, models change across sessions, and human understanding of generated code is partial. Good documentation cuts AI onboarding from 10+ messages to 1–2.

## Required Documentation Files

1. **README.md** — new session (or human) understands the project in under 5 minutes: brief description · pinned tech stack · Quick Start (`npm install` → `cp .env.example .env` → `npm run dev`) · project structure tree · links to ADRs.
2. **WORLD.md** — product intent guardrail: what the project is and must NOT become (template in `planning-and-scoping.md`). Referenced in every major prompt.
3. **ADRs (`docs/adr/NNN-name.md`)** for significant architectural decisions — prevent AI from reversing decisions in future sessions. Format:
   ```markdown
   # ADR 001: Use PostgreSQL as Primary Database
   ## Status: Accepted (2026-05-24)
   ## Context: Need relational DB for users/orders/inventory; considered Postgres/MySQL/Mongo.
   ## Decision: PostgreSQL — JSON support, RLS for multi-tenant isolation, deep AI training data.
   ## Consequences: requires PG expertise; RLS adds query complexity; strong ecosystem.
   ```
4. **Inline code comments** follow `ai-code-documentation.md` (ICDC framework) — persistent context for the next AI session.

## Directives

1. Update documentation in the SAME iteration as the code change (workflow Phase 8) — stale docs mislead future sessions worse than missing docs.
2. Write for a reader with zero context: every doc states purpose, constraints, and pointers to related files.
3. Keep README's stack versions pinned and current when the stack changes.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Docs updated "later" | Same iteration as code |
| Decisions living only in chat history | ADRs |
| Stale README stack versions | Pin + update on change |

## Cross-References

`planning-and-scoping.md` · `ai-code-documentation.md`
