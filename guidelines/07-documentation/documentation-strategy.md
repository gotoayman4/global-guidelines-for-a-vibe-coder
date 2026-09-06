# Documentation Strategy — Knowledge Persistence for AI and Humans

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~900 tokens)
**Last Updated:** 2026-09-06
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
4. Every task ends with a Docs-Decision: `Docs: updated <files> | N/A (<reason>)`. Silence is a violation — same as "Done" with no verification.
5. Steering docs are AI-first: imperative tables and bullets, MUST/SHOULD per RFC 2119, no prose paragraphs. Humans are not the audience.

## Trigger Table (When Docs MUST Change)

| Trigger | Files to Update |
|---|---|
| New endpoint, table, migration, env var, build command | `AI_ARCHITECTURE.md` + API/migration ref + `AI_CONTEXT.md` commands if changed |
| New dependency or stack version bump | `AGENTS.md` Stack table + `AI_CONTEXT.md` |
| Auth/RBAC change | `AI_ARCHITECTURE.md` Cross-Cutting + `WORLD.md` Security Model + ADR if a decision |
| New shared component, convention, forbidden pattern | `AGENTS.md` mandates + `AI_ARCHITECTURE.md` "How to Change Safely" |
| Scope/guardrail reversal | `WORLD.md` — AI proposes a `Proposed Update` block, human approves, then agent applies |
| New subsystem | New row in `AI_ARCHITECTURE.md` Subsystems + `ARCHITECTURE_INDEX.md` if a doc was added |

Non-trigger (typo, formatting, internal refactor with no contract change, test-only): leave docs, report `Docs: N/A (<reason>)`.

## Freshness Header

Every steering doc (`AGENTS.md` mandates section, `WORLD.md`, `AI_CONTEXT.md`, `AI_ARCHITECTURE.md`, `ARCHITECTURE_INDEX.md`) carries: `**Last Updated:** YYYY-MM-DD | **Commit:** short SHA | **Change:** one line`. Bump it in the same commit as the behavior change.

## Drift Check (Warn-Only)

`npm run docs:check` flags trigger-like diffs with no steering-doc change in the same commit. It NEVER fails — it warns. Run it before pushing; treat a warning as a prompt to re-run the Docs-Decision, not as a gate.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Docs updated "later" | Same iteration as code |
| Decisions living only in chat history | ADRs |
| Stale README stack versions | Pin + update on change |

## Cross-References

`planning-and-scoping.md` · `ai-code-documentation.md`
