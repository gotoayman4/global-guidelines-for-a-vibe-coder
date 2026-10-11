---
status: "Normative"
scope: "Global"
tags: [api, rest, contracts]
---

# API Design Standards — Contracts Between Frontend and Backend

---

## Directives

1. **REST URL conventions:** plural nouns (`/users` not `/user`) · hyphens for multi-word paths · no verbs in resource URLs (actions as sub-resources: `POST /users/:id/verify-email`) · no trailing slashes · version prefix only when breaking: `/api/v1/users`.
   ```
   GET    /api/users        POST /api/users       GET  /api/users/:id
   PUT    /api/users/:id    PATCH /api/users/:id  DELETE /api/users/:id
   GET    /api/users/:id/posts                    POST /api/auth/login
   ```
2. **Request standards:** JSON bodies (`application/json`, camelCase keys) · ISO 8601 dates everywhere (`"2026-05-24T14:30:00Z"`) · query params: `page` (starts at 1), `limit` (default 20, max 100), `sort`, `order=asc|desc`, `search`; range filters via suffixes (`createdAt_gte=`).
3. **Response envelopes:** success single `{ "data": {...} }` · list `{ "data": [...], "pagination": { page, limit, total, totalPages } }` · error `{ "error": "<human message>", "code": "MACHINE_CODE", "details"?: [{ field, message }] }`.
4. **Status codes:** 200 GET/PUT/PATCH · 201 POST · 204 DELETE · 400 validation · 401 unauthenticated · 403 forbidden · 404 missing · 409 conflict · 422 semantic · 429 rate-limited · 500 generic. NEVER 200 with an error body.
5. **Pagination on EVERY list endpoint** — no exception for lists that could exceed 50 items.
6. **Errors machine-readable AND human-readable; never expose stack traces, internal paths, or DB errors.**
7. **Auth header format:** `Authorization: Bearer ***`; 401 with `UNAUTHORIZED` code when missing/expired; 403 with `FORBIDDEN` for wrong role.
8. **No nested-data explosion:** list endpoints don't embed full related collections — separate endpoints or sparse fieldsets.
9. **Version only on breaking changes** — don't pre-version.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Inconsistent URLs (`/getUsers`) | REST conventions |
| 200 for errors | Correct status codes |
| Missing pagination | Mandatory on all lists |
| Nested data explosion | Sparse/separate endpoints |
| No error `code` | Machine-readable codes |
| Mixed date formats | ISO 8601 everywhere |

## Cross-References

`backend-architecture.md` · `error-handling-philosophy.md` · `frontend-architecture.md`
