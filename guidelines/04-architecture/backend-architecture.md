---
status: "Normative"
scope: "Global"
tags: [backend, rest, services]
---

# Backend Architecture — Structuring Server Applications

---

AI over-engineers backends (microservices, event sourcing, CQRS for CRUD apps). Sane defaults:

## Directives

1. **Start monolithic.** Split into services only with concrete evidence the monolith can't handle load/complexity.
2. **Layer separation:**
   ```
   src/
   ├── routes/        # HTTP handlers — THIN (10-20 lines): parse → service → respond
   ├── services/      # Business logic — testable pure functions + injected deps
   ├── repositories/  # Data access — all queries live here
   ├── models/        # Types, validation schemas
   ├── middleware/    # Auth, logging, rate limiting, errors
   └── config/  utils/
   ```
3. **Typed errors** (`NotFoundError` 404, `ValidationError` 400, `ConflictError` 409, …) thrown by services; routes catch and format. Consistent response shapes: `{ data }` · `{ data, pagination: { page, limit, total } }` · `{ error, code }`.
4. **Middleware order:** logging → CORS → rate limiting → authentication → authorization → validation → handler → error handler. Auth middleware on ALL protected routes; permissions checked server-side, never "the frontend hides it."
5. **Database access via ORM/query builder through repositories** — parameterized queries always; transactions wrap atomic multi-step ops; connection pooling configured per environment.
6. **Async work off the request path:** emails/reports/uploads go to a job queue (BullMQ) in production — never inside HTTP handlers.
7. **API conventions** (full details in `api-design-standards.md`): REST verbs, pagination on every list endpoint (`?page=1&limit=20`, max 100), filtering/sorting via query params.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Microservices for MVP | Monolith until proven necessary |
| Business logic in routes | Services layer |
| Missing input validation | Zod/Joi at route level |
| Raw SQL concatenation | Parameterized / ORM |
| Blocking work in handlers | Job queue |
| Inconsistent error responses | Typed errors + fixed shapes |
| Unpaginated lists | Pagination mandatory |

## Cross-References

`api-design-standards.md` · `database-architecture.md` · `nestjs-architecture.md` · `error-handling-philosophy.md`
