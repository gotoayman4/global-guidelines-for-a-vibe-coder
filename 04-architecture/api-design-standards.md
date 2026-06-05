# API Design Standards — Contracts Between Frontend and Backend

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,000 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `backend-architecture.md`, `error-handling-philosophy.md`

---

## Purpose

Define API design standards that enable AI to generate consistent, predictable APIs. Without standards, AI generates different URL patterns, response formats, and error structures for every endpoint — making the frontend impossible to build consistently.

---

## URL Conventions

### Resource Naming
```
GET    /api/users           → List users
GET    /api/users/:id       → Get single user
POST   /api/users           → Create user
PUT    /api/users/:id       → Replace user
PATCH  /api/users/:id       → Update user (partial)
DELETE /api/users/:id       → Delete user

# Nested resources:
GET    /api/users/:id/posts          → List user's posts
POST   /api/users/:id/posts          → Create post for user

# Non-CRUD actions:
POST   /api/auth/login               → Login
POST   /api/auth/logout              → Logout
POST   /api/users/:id/verify-email   → Action on resource
```

**Rules:**
- Plural nouns for resources (`/users`, not `/user`)
- Hyphens for multi-word paths (`/email-verification`, not `/emailVerification` or `/email_verification`)
- No verbs in resource URLs (actions go after the resource: `/users/:id/verify`)
- No trailing slashes
- Version prefix if needed: `/api/v1/users`

---

## Request Standards

### Query Parameters
```
GET /api/users?page=1&limit=20&sort=createdAt&order=desc&search=john&role=admin
```

- `page` — starts at 1
- `limit` — default 20, max 100
- `sort` — column name
- `order` — `asc` or `desc`
- `search` — full-text search term

### Request Body (JSON)
```json
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user"
}
```

- Content-Type must be `application/json`
- Request body is JSON (not form-encoded unless file upload)
- camelCase for JSON keys
- Dates in ISO 8601 format: `"2026-05-24T14:30:00Z"`

---

## Response Standards

### Success Response (Single Resource)
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2026-05-24T14:30:00Z",
    "updatedAt": "2026-05-24T14:30:00Z"
  }
}
```

### Success Response (List)
```json
{
  "data": [
    { "id": "uuid-1", "email": "user1@example.com", ... },
    { "id": "uuid-2", "email": "user2@example.com", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Response
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

**Rules:**
- Response always wrapped in `{ "data": ... }` for success
- Errors always have `error` (human message) and `code` (machine-readable)
- Field-level errors in `details` array when applicable
- NEVER expose stack traces, internal paths, or database errors

---

## HTTP Status Codes

| Code | When to Use |
|---|---|
| **200** | Successful GET, PUT, PATCH |
| **201** | Successful POST (resource created) |
| **204** | Successful DELETE (no content) |
| **400** | Bad input (validation failure) |
| **401** | Authentication required (not logged in) |
| **403** | Permission denied (logged in but wrong role) |
| **404** | Resource not found |
| **409** | Conflict (duplicate resource) |
| **422** | Unprocessable entity (semantic error, not syntax) |
| **429** | Rate limit exceeded |
| **500** | Unexpected server error (generic message only) |

**Anti-pattern:** Returning 200 with `{ "error": "..." }`. If there's an error, use an error status code.

---

## Pagination Standard

Every list endpoint MUST support pagination. No exceptions for lists that could exceed 50 items.

**Request:**
```
GET /api/users?page=1&limit=20
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Response headers (optional but recommended):**
```
Link: </api/users?page=2>; rel="next"
Link: </api/users?page=8>; rel="last"
X-Total-Count: 150
```

---

## Filtering, Sorting, and Search

### Filtering
```
GET /api/users?role=admin&isActive=true
```
Exact match by default. For range/different operators, use suffixes:
```
GET /api/users?createdAt_gte=2026-01-01&createdAt_lte=2026-12-31
GET /api/users?age_gt=18
```

### Sorting
```
GET /api/users?sort=createdAt&order=desc
```
Single sort field. `order` is `asc` (default) or `desc`.

### Search
```
GET /api/users?search=john
```
Full-text search across name and email fields. Behavior should be documented per endpoint.

---

## Versioning

If API versioning is needed:

```
# URL versioning (preferred):
/api/v1/users
/api/v2/users

# Header versioning (alternative):
Accept: application/vnd.myapp.v1+json
```

**Rule:** Version only when making breaking changes. Don't pre-version APIs.

---

## Authentication

### Token Format
```
Authorization: Bearer <jwt_token>
```

### Unauthenticated Response
```json
401 Unauthorized
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### Forbidden Response
```json
403 Forbidden
{
  "error": "You do not have permission to perform this action",
  "code": "FORBIDDEN"
}
```

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Inconsistent URL patterns** | `/getUsers`, `/api/user`, `/users/get-all` — frontend can't predict URLs | Standard REST conventions |
| **200 for errors** | Frontend treats errors as success | Use appropriate error status codes |
| **Missing pagination** | Endpoint returns all records; crashes with large datasets | Pagination on every list endpoint |
| **Nested data explosion** | `GET /api/users` returns users + all their posts + all comments | Use sparse fieldsets or separate endpoints for nested data |
| **No error codes** | Frontend can't handle errors programmatically | Machine-readable `code` field in every error |
| **Inconsistent date formats** | Some endpoints return Unix timestamps, others ISO 8601 | ISO 8601 everywhere |
| **Exposing internals in errors** | Database schemas, stack traces, file paths leaked | Generic messages; detailed logs server-side |

---

## Key Takeaways

1. Consistent URL patterns: plural nouns, hyphens, no verbs in resource paths.
2. Standard response format: `{ "data": ... }` for success, `{ "error": "...", "code": "..." }` for errors.
3. Pagination on every list endpoint. No exceptions.
4. ISO 8601 dates. camelCase JSON keys.
5. Appropriate HTTP status codes. Never 200 for errors.
6. Errors are machine-readable (code) and human-readable (error).

---

## Cross-References

- **Depends on:** `backend-architecture.md` — API as the interface layer
- **Depends on:** `error-handling-philosophy.md` — consistent error formats
- **Applied by:** `frontend-architecture.md` — frontend consumes these APIs
- **Applied by:** `frontend-backend-contract.instructions.md` — contract testing
