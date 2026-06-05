# Error Handling Philosophy — Making Failures Safe and Diagnosable

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,100 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `api-design-standards.md`, `ai-security-governance.md`, `ux-design-principles.md`

---

## Purpose

Define the error handling strategy for AI-assisted codebases. AI prioritizes the happy path and systematically neglects failure modes. This document is the counterbalance — it ensures every AI-generated piece of code handles failure correctly.

---

## The Error Handling Problem with AI

AI-generated code has a consistent failure pattern: **it assumes success**. AI will:
- Skip null checks because "the data should be there"
- Omit try/catch blocks because "this shouldn't fail"
- Return 500 Internal Server Error for every failure mode
- Leak stack traces, database schemas, and internal state to users
- Ignore validation because "the frontend validates input"
- Assume perfect user behavior

Research confirms: AI fails to sanitize inputs against XSS **86%** of the time and fails log injection sanitization **88%** of the time. The pattern is clear — error handling and input validation are not optional quality improvements; they are structural requirements that must be enforced.

---

## The Error Handling Mandate

Add this to every functional prompt for AI:

```
Include error handling for:
- Null/undefined inputs
- Invalid formats and types
- Database connection failures
- External API timeouts and failures
- Authorization failures
- Rate limit exceeded

Validate all user inputs server-side.
Never expose stack traces or internal state to users.
Return appropriate HTTP status codes (400 for bad input, 401 for auth, 403 for forbidden, 404 for not found, 500 for server errors with generic message).
```

---

## Error Handling Principles

### 1. Never Trust Client-Side Validation

AI often generates validation only on the frontend, assuming the backend doesn't need it. This is catastrophically wrong.

**Rule:** ALL inputs must be validated server-side, regardless of client-side validation. Use a schema validation library (Zod, Joi, Yup).

```typescript
// ALWAYS:
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]+$/),
});

// In every route handler:
const parsed = schema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
}
```

### 2. Explicit Error Handling, Always

AI skips try/catch because "it's boilerplate." Enforce it.

```typescript
// NEVER ACCEPT FROM AI:
app.get('/api/users/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  res.json(user); // What if findUser fails? What if user is null?
});

// ALWAYS REQUIRE:
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await db.findUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Failed to fetch user', { userId: req.params.id, error });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 3. Never Expose Internals

AI-generated error messages often leak database schemas, stack traces, and internal paths.

```typescript
// NEVER ACCEPT (leaks schema):
res.status(500).json({ error: 'INSERT INTO users (email, password_hash) VALUES ($1, $2) - duplicate key value violates unique constraint "users_email_key"' });

// ALWAYS REQUIRE (generic to user, detailed in logs):
logger.error('User registration failed: duplicate email', { email: req.body.email });
res.status(409).json({ error: 'An account with this email already exists' });
```

### 4. Consistent Error Response Format

AI generates inconsistent error shapes across endpoints. Standardize:

```typescript
// Standard error response:
{
  "error": "Human-readable message",
  "code": "VALIDATION_ERROR",  // Machine-readable code
  "details": [                 // Optional: field-level errors
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### 5. Appropriate HTTP Status Codes

AI often returns 200 for errors or 500 for everything. Enforce correct codes:

| Situation | Status Code |
|---|---|
| Bad input (validation failure) | 400 |
| Authentication required | 401 |
| Permission denied | 403 |
| Resource not found | 404 |
| Conflict (duplicate) | 409 |
| Rate limit exceeded | 429 |
| Server error (unexpected) | 500 |

---

## Error Handling by Layer

### Database Layer
- Connection failures must be caught and retried (with backoff)
- Query errors must be logged with context (query, parameters, timing)
- Never expose raw database errors to users
- Transactions must roll back on any error (partial commits are data corruption)

### API Layer
- Every endpoint must validate inputs before processing
- Auth errors (401/403) must be handled before business logic
- Timeout handling for external API calls (don't hang forever)
- Rate limiting with clear error messages

### UI Layer
- Error boundaries must wrap every major component/section
- Loading and error states are mandatory — no blank screens
- User-friendly error messages, not technical jargon
- Retry mechanisms for transient failures (network errors)

---

## Edge Case Checklist

When reviewing AI-generated code, verify:

```
[ ] What happens when input is null? undefined? empty string?
[ ] What happens when the database is unreachable?
[ ] What happens when an external API times out?
[ ] What happens when the user is not authenticated?
[ ] What happens when the user lacks permission?
[ ] What happens with concurrent requests?
[ ] What happens with extremely large inputs?
[ ] What happens with malformed data (SQL injection, XSS payloads)?
[ ] Are error messages safe? (No stack traces, no internal paths, no schema details)
[ ] Is there a single error boundary that prevents the entire app from crashing?
```

---

## Anti-Patterns in Error Handling

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Empty catch blocks** | Errors silently swallowed; impossible to debug | Always log errors; always return a response |
| **500 for everything** | Client can't distinguish user error from server error | Use appropriate status codes |
| **Client-only validation** | Malicious requests bypass validation entirely | Server-side validation on every endpoint |
| **Leaking internals in errors** | Attacker learns database schema, file paths, library versions | Generic user messages; detailed server logs |
| **No null checking** | `Cannot read property 'x' of null` crashes production | Defensive checks on all external inputs |
| **Assuming happy path** | Code works only under perfect conditions | Handle failure modes explicitly |

---

## Key Takeaways

1. AI prioritizes the happy path. You must explicitly demand error handling in every prompt.
2. Server-side validation is mandatory. Client-side validation is cosmetic.
3. Never expose internals to users. Generic messages to users, detailed logs for debugging.
4. Standardize error response format across all endpoints.
5. Error boundaries at every level: database, API, UI.
6. The edge case checklist is for every AI-generated change, not just new features.

---

## Cross-References

- **Depends on:** `api-design-standards.md` — consistent API response formats
- **Applied by:** `ai-security-governance.md` — security implications of error handling
- **Applied by:** `debugging-with-ai.md` — using error information for debugging
- **Applied by:** `security-engineering.md` — preventing error-based information disclosure
