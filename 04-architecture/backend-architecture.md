# Backend Architecture — Structuring Server Applications

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,200 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `api-design-standards.md`, `database-architecture.md`

---

## Purpose

Define architectural principles for backend applications built with AI assistance. AI over-engineers backends — adding microservices, event sourcing, and CQRS for simple CRUD apps. This document defines the sane defaults.

---

## Core Architectural Principles

### 1. Start Monolithic

Begin with a single deployable unit. Only split into services when you have concrete evidence that the monolith cannot handle the load or organizational complexity.

**Why:** AI loves microservices because enterprise patterns dominate training data. A todo app does not need 5 services, a message queue, and an event bus. Monoliths are simpler for AI to reason about, modify, and test.

### 2. Layer Separation Within the Monolith

Even in a monolith, separate concerns into layers:

```
src/
├── routes/        # HTTP handlers — thin, delegates to services
├── services/      # Business logic — the core of the application
├── repositories/  # Data access — database queries, ORM operations
├── models/        # Data models, types, validation schemas
├── middleware/     # Auth, logging, rate limiting, error handling
├── config/        # Environment-specific configuration
└── utils/         # Shared utilities
```

**Rule:** Routes handle HTTP concerns only (request parsing, response formatting). Services contain business logic. Repositories contain data access. Never mix these layers.

### 3. Routes Are Thin

Route handlers should be 10-20 lines. Parse input → call service → format response. No business logic in routes.

```typescript
// Good route handler:
app.post('/api/users', authenticate, async (req, res) => {
  const input = createUserSchema.parse(req.body);
  const user = await userService.createUser(input);
  res.status(201).json(user);
});

// Bad route handler:
app.post('/api/users', async (req, res) => {
  // 50 lines of validation, password hashing, database query, email sending
  // AI generates this pattern constantly — reject it
});
```

### 4. Services Are Testable

Services should be pure functions of their inputs + injected dependencies. No direct database access, no HTTP concerns.

```typescript
class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService,
  ) {}
  
  async createUser(input: CreateUserInput): Promise<User> {
    // Validation
    const validated = createUserSchema.parse(input);
    
    // Business logic
    const passwordHash = await bcrypt.hash(validated.password, 12);
    const existing = await this.userRepo.findByEmail(validated.email);
    if (existing) throw new ConflictError('Email already registered');
    
    // Persistence
    const user = await this.userRepo.create({ ...validated, passwordHash });
    
    // Side effects
    await this.emailService.sendWelcome(user.email);
    
    return user;
  }
}
```

### 5. Explicit Error Handling

Every service method should throw typed errors. Routes catch them and format responses.

```typescript
// Typed errors:
class NotFoundError extends Error { statusCode = 404; }
class ValidationError extends Error { statusCode = 400; }
class UnauthorizedError extends Error { statusCode = 401; }
class ForbiddenError extends Error { statusCode = 403; }
class ConflictError extends Error { statusCode = 409; }
```

---

## API Design Principles

See `api-design-standards.md` for full details. Core principles:

### RESTful Conventions
```
GET    /api/users          → List users
GET    /api/users/:id      → Get user
POST   /api/users          → Create user
PUT    /api/users/:id      → Update user (full replace)
PATCH  /api/users/:id      → Update user (partial)
DELETE /api/users/:id      → Delete user
```

### Consistent Response Format
```typescript
// Success:
{ "data": { ... } }

// List:
{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 150 } }

// Error:
{ "error": "Human-readable message", "code": "VALIDATION_ERROR" }
```

### Pagination
Every list endpoint must support pagination: `?page=1&limit=20`. Maximum page size: 100.

### Filtering and Sorting
```
GET /api/users?role=admin&sort=createdAt&order=desc&search=john
```

---

## Middleware Architecture

Order matters. Middleware should be applied consistently:

```
1. Request logging
2. CORS
3. Rate limiting
4. Authentication
5. Authorization (if applicable to all routes)
6. Input validation (if using middleware-based validation)
7. Route handler
8. Error handler (catches all unhandled errors)
```

**Rule:** Auth middleware on ALL protected routes. Never rely on "the frontend will hide the button." Check permissions server-side on every protected endpoint.

---

## Database Access Patterns

See `database-architecture.md` for full details. Core principles:

- Use an ORM (Prisma, TypeORM) or query builder (Knex) — never raw SQL string concatenation
- Database queries go through repositories, never directly in routes or services
- Transactions wrap multi-step operations that must be atomic
- Connection pooling configured appropriately for the deployment environment

---

## Background Jobs and Async Processing

For operations that shouldn't block the HTTP response (sending emails, generating reports, processing uploads):

1. **Simple:** `setTimeout` / `process.nextTick` for fire-and-forget (dev only)
2. **Reliable:** Job queue (Bull/BullMQ with Redis) for production
3. **Heavy:** Dedicated worker process for CPU-intensive tasks

**Rule:** Don't send emails in the HTTP request handler. Queue them.

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Microservices for MVP** | Operational complexity without benefit | Start monolithic; split only when proven necessary |
| **Business logic in routes** | Untestable, duplicated across endpoints | Services layer for all business logic |
| **No input validation** | Malformed data corrupts the database | Validate every input with Zod/Joi at the route level |
| **Raw SQL string concatenation** | SQL injection vulnerability | Parameterized queries or ORM |
| **Blocking operations in HTTP handlers** | Slow responses, timeouts | Queue long-running work |
| **Inconsistent error responses** | Frontend can't handle errors reliably | Typed errors + consistent response format |
| **Missing pagination** | Endpoints return 100,000 rows | Pagination on every list endpoint |

---

## Key Takeaways

1. Start monolithic. Split only when proven necessary.
2. Layers: Routes (thin) → Services (business logic) → Repositories (data access).
3. Every route validates input. Every route handles auth. Every route returns consistent responses.
4. Database access through repositories. Parameterized queries only.
5. Long-running work goes through a job queue, not the HTTP handler.
6. Typed errors with consistent response format across all endpoints.

---

## Cross-References

- **Extended by:** `api-design-standards.md` — detailed API design conventions
- **Extended by:** `database-architecture.md` — database design and access patterns
- **Extended by:** `nestjs-architecture.md` — NestJS-specific implementation
- **Applied by:** `error-handling-philosophy.md` — error handling patterns
