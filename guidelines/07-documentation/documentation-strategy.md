# Documentation Strategy — Knowledge Persistence for AI and Humans

**Status:** Advisory
**Scope:** Global
**Token Tier:** Full (~1,500 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `guideline-authoring-standards.md`

---

## Purpose

Define the documentation strategy for AI-assisted projects. Documentation serves a dual purpose: it guides human contributors AND provides persistent context for AI agents across sessions. Good documentation reduces AI onboarding time from 10+ messages to 1-2.

---

## Why Documentation Matters More in Vibe Coding

In traditional development, knowledge lives in developers' heads. In vibe coding, knowledge must live in files because:
- AI sessions start with zero context
- Different AI models are used across sessions
- Human understanding is partial (code was generated, not written)
- Onboarding a new AI model shouldn't require re-explaining the codebase

**Rule:** Documentation is not a chore — it's the memory layer that makes AI collaboration work across sessions and models.

---

## Required Documentation Files

### 1. README.md (Repository Entry Point)

Every project must have a README that enables a new AI session (or human) to understand the project in under 5 minutes.

```markdown
# Project Name
Brief description (1-2 sentences)

## Tech Stack
- Frontend: React 19, Vite 7, MUI v9
- Backend: Express 5, PostgreSQL 16, Prisma
- Testing: Vitest, Playwright

## Quick Start
```bash
npm install
cp .env.example .env
npm run dev
```

## Project Structure
```
src/
├── components/   # UI components
├── hooks/        # Custom hooks
├── services/     # Business logic
└── pages/        # Route pages
```

## Key Architecture Decisions
- [Link to ADRs]
- [Link to architecture docs]
```

### 2. WORLD.md (Product Intent)

See `planning-and-scoping.md` for the full template. This file defines what the project exists to do — and what it must NOT become.

### 3. Architecture Decision Records (ADRs)

For significant architectural decisions, create an ADR. This prevents AI from reversing decisions in future sessions.

**ADR template (`docs/adr/001-use-postgresql.md`):**
```markdown
# ADR 001: Use PostgreSQL as Primary Database

## Status
Accepted (2026-05-24)

## Context
We need a relational database for user data, orders, and inventory.
Considered PostgreSQL, MySQL, and MongoDB.

## Decision
Use PostgreSQL because:
- Superior JSON support for semi-structured data
- Row-Level Security for multi-tenant isolation
- AI models have extensive PostgreSQL training data

## Consequences
- Team needs PostgreSQL expertise
- RLS adds query complexity
- Positive: Strong ecosystem and tooling
```

### 4. API Documentation

Every API endpoint must be documented. This enables AI to generate correct frontend code without guessing response shapes.

**Minimum API docs:**
```markdown
## GET /api/users
Returns a paginated list of users.

Query Parameters:
- page (number, default: 1)
- limit (number, default: 20, max: 100)
- role (string, optional): Filter by role
- search (string, optional): Search by name or email

Response:
```json
{
  "data": [{ "id": "uuid", "email": "...", ... }],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```
```

### 5. Environment Setup Documentation

Document all environment variables and their purposes:

```markdown
## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| DATABASE_URL | Yes | — | PostgreSQL connection string |
| JWT_SECRET | Yes | — | Secret for JWT signing |
| PORT | No | 3000 | Server port |
| CORS_ORIGIN | No | http://localhost:5173 | Allowed CORS origin |
```

---

## Documentation Maintenance

### Update Documentation in the Same Iteration

When AI modifies code, it must also update relevant documentation. This is Phase 8 of the standard development loop.

**Prompt template:**
```
After implementing the changes, update:
1. README.md if setup steps or features changed
2. API documentation if endpoints changed
3. Environment docs if new variables were added
4. ADRs if architectural decisions were made
```

### AI-Generated Documentation Review

AI-generated documentation often contains:
- Placeholder text that was never filled in
- Outdated examples from previous code versions
- Hallucinated features that don't exist

**Review checklist:**
- [ ] Do code examples match the current codebase?
- [ ] Are environment variables accurate?
- [ ] Do setup steps work on a fresh clone?
- [ ] Are API response examples current?

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **No README** | AI sessions waste 10+ messages on basic orientation | README with stack, structure, quick start |
| **Outdated docs** | AI follows wrong instructions; generates incorrect code | Update docs in same iteration as code changes |
| **Docs only for humans** | AI can't parse unstructured, prose-heavy docs | Structured format with code examples, tables, explicit lists |
| **No API documentation** | AI guesses response shapes; frontend breaks | Document every endpoint: params, response shape, errors |
| **Undocumented decisions** | AI reverses architecture decisions in future sessions | ADRs for significant decisions |

---

## Key Takeaways

1. Documentation is the memory layer for AI. It reduces onboarding from 10 messages to 1-2.
2. Minimum: README + WORLD.md + API docs + Environment docs.
3. Update docs in the same iteration as code changes.
4. ADRs prevent AI from revisiting decided questions.
5. Documentation is for AI first, humans second. Structured, scannable, code-heavy.

---

## Cross-References

- **Depends on:** `guideline-authoring-standards.md` — standards for writing guideline documents
- **Applied by:** `planning-and-scoping.md` — WORLD.md template
- **Applied by:** `development-workflow.md` — the Document phase
