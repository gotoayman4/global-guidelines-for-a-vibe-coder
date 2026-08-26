# Error Handling Philosophy — Making Failures Safe and Diagnosable

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,100 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `api-design-standards.md`, `ai-security-governance.md`, `ux-design-principles.md`

---

## Directives

1. ALL inputs validated server-side with a schema library (Zod/Joi/Yup) — client-side validation is cosmetic.
2. Every async operation wrapped in explicit error handling. No empty catch blocks. AI skips try/catch as "boilerplate" — enforce it.
3. NEVER expose internals in error responses: no stack traces, no SQL, no schema, no file paths. Generic message to user; detailed context to server logs only.
4. Standard error response shape on every endpoint: `{ "error": string, "code": string, "details"?: [{ field, message }] }`.
5. Correct HTTP status codes: 400 bad input · 401 unauthenticated · 403 forbidden · 404 not found · 409 conflict · 429 rate-limited · 500 unexpected (generic message).
6. Database layer: catch + retry connection failures (backoff); log query errors with context; transactions roll back fully on any error.
7. API layer: validate before processing; handle auth before business logic; timeouts on external calls.
8. UI layer: error boundaries around major sections; loading/error states mandatory; retry for transient failures.
9. Handle the failure modes explicitly in every prompt/request: null/undefined inputs, invalid formats, DB failures, external API timeouts, auth failures, rate limits.

---

## Canonical Patterns

Server-side validation:

```typescript
const parsed = schema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ error: 'Invalid input', code: 'VALIDATION_ERROR', details: parsed.error.flatten() });
}
```

Endpoint error handling:

```typescript
try {
  const user = await db.findUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
  res.json(user);
} catch (error) {
  logger.error('Failed to fetch user', { userId: req.params.id, error });
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
```

---

## Edge Case Checklist (verify for every change)

null/undefined/empty input · DB unreachable · external API timeout · unauthenticated · unauthorized · concurrent requests · very large input · malformed/malicious data (SQLi/XSS payloads) · error messages safe · app-level error boundary present.

---

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Empty catch blocks | Log + return a response |
| 500 for everything | Correct status codes |
| Client-only validation | Server-side on every endpoint |
| Internals leaked in errors | Generic messages, detailed logs |
| No null checks | Defensive checks on all external inputs |

---

## Cross-References

- **Depends on:** `api-design-standards.md`
- **Applied by:** `ai-security-governance.md`, `debugging-with-ai.md`, `security-engineering.md`
