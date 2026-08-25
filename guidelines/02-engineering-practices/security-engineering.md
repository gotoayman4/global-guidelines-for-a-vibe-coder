# Security Engineering — Building Secure Systems with AI

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,100 tokens)
**Last Updated:** 2026-05-26
**Cross-References:** `ai-security-governance.md`, `error-handling-philosophy.md`

---

## Purpose

Define security engineering standards for AI-assisted development. This document covers implementation-level security practices. For AI-specific security governance (MCP, agent permissions, prompt security), see `ai-security-governance.md`.

---

## The Security Reality

AI-generated code consistently introduces security vulnerabilities. Research confirms models choose insecure implementations nearly half the time when given a choice. This is not a model quality issue — it's a training data issue. The web is full of insecure code, and AI reproduces those patterns.

**Rule:** Every line of AI-generated code touching auth, data access, user input, or external services must be reviewed for security. No exceptions.

---

## Authentication Security

### Password Handling
```
REQUIRE:
- bcrypt or argon2 for password hashing (never MD5, SHA1, SHA256)
- Minimum password length: 8 characters
- Password strength requirements: at least 1 uppercase, 1 number, 1 special character
- Rate limiting on login: 5 attempts per minute per IP/account
- Account lockout after 10 failed attempts (temporary, 15 minutes)

FORBID:
- Storing plaintext passwords (ever, for any reason)
- Logging passwords or password hashes
- Returning password hashes in API responses
- Weak hashing algorithms
```

### Session and Token Management
```
REQUIRE:
- JWT with short expiration (15-60 minutes) + refresh token rotation
- Refresh tokens stored securely (httpOnly cookie, not localStorage)
- Session invalidation on password change or logout
- CSRF protection on state-changing requests

FORBID:
- JWTs without expiration
- Storing tokens in localStorage
- Infinite-lived sessions
```

### OAuth / Social Login
```
REQUIRE:
- Validate state parameter to prevent CSRF
- Validate redirect_uri against whitelist
- Verify token audience and issuer
- Request minimum necessary scopes
```

---

## Authorization Security

### Principle of Least Privilege
Every endpoint must verify the user has permission for the requested operation:

```typescript
// ALWAYS:
app.delete('/api/users/:id', authenticate, authorize('admin'), async (req, res) => {
  // Only admins can reach this code
});

// NEVER:
app.delete('/api/users/:id', authenticate, async (req, res) => {
  // Any authenticated user can delete any user
});
```

### Row-Level Security (Database)
For multi-tenant applications, enforce data isolation at the database level (RLS in PostgreSQL/Supabase), not just the application level. AI often misses RLS policies.

---

## Input Validation and Injection Prevention

### SQL Injection
```
REQUIRE: Parameterized queries for ALL database operations
FORBID: String concatenation or template literals in SQL queries

// ALWAYS:
db.query('SELECT * FROM users WHERE email = $1', [email])

// NEVER:
db.query(`SELECT * FROM users WHERE email = '${email}'`)
```

### XSS Prevention
```
REQUIRE:
- Escaped output in HTML contexts (React's JSX handles this by default)
- DOMPurify for any dangerouslySetInnerHTML
- Content-Security-Policy header (script-src 'self')
- Input sanitization on the server (don't trust client sanitization)

FORBID:
- dangerouslySetInnerHTML without DOMPurify
- Inline event handlers from user input
- Direct insertion of user input into script tags
```

### File Upload Security
```
REQUIRE:
- Validate file type (whitelist, not blacklist)
- Validate file size (max 10MB default, configurable)
- Scan uploads for malware (in production)
- Store uploads outside web root
- Randomize filenames (don't use user-provided names)
- Serve uploads with Content-Disposition: attachment (not inline) for non-image files

FORBID:
- Executing uploaded files
- Trusting client-side MIME type
- Storing uploads in publicly accessible directories with predictable names
```

---

## API Security

### Rate Limiting
Every public endpoint must be rate-limited:
```
/api/auth/login       → 5 req/min per IP
/api/auth/register    → 3 req/min per IP
/api/*                → 100 req/min per user (authenticated)
```

### CORS
```
REQUIRE:
- Explicit origin whitelist
- Specific methods (GET, POST, PUT, DELETE — not *)
- Credentials: true only when needed

FORBID:
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Origin: null
- Reflecting the request origin without validation
```

### Security Headers
```
REQUIRE:
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS)
- Referrer-Policy: strict-origin-when-cross-origin
```

---

## Dependency Security

### Dependency Audit
Run these on every AI-generated PR:
- `npm audit` — known vulnerabilities
- `npm ls <package>` — verify package actually exists (AI hallucination check)

### Dependency Addition Rules
```
REQUIRE:
- Justification for every new dependency
- Search the web or npm registry for the latest stable version before pinning. AI training data is stale — never trust AI-suggested version numbers without web verification.
- Pinned versions (not ^ or ~ ranges for critical deps)
- Review of package: maintainers, weekly downloads, last update, known issues
- Documented ADR if pinning to an older major version (compatibility constraint, Arabic RTL regression, undocumented breaking changes, ecosystem lag)

FORBID:
- Abandoned packages (no updates in >1 year)
- Packages with <100 weekly downloads (unless from trusted org)
- Installing packages suggested by AI without verification of existence AND latest stable version
```

---

## Secrets and Configuration

### Secrets Management
```
REQUIRE:
- All secrets in environment variables
- .env in .gitignore (verified)
- Different secrets for dev, staging, production
- CI/CD secrets via platform secret manager

FORBID:
- Hardcoded secrets in any file (code, config, tests, comments, documentation)
- Committing .env files
- Sharing secrets between environments
- Logging secrets
```

### Environment Configuration
```
REQUIRE:
- Production: DEBUG=false, verbose logging OFF, stack traces hidden
- Staging: mirror production config as closely as possible
- Development: isolated from production services
```

---

## Security Review Checklist

Apply to every AI-generated PR that touches:
- Authentication or authorization
- User input handling
- Database queries
- File uploads
- External API calls
- Configuration or environment

```
[ ] Authentication: Are auth checks present on every protected route?
[ ] Authorization: Are permissions verified for the specific operation?
[ ] SQL: Are all queries parameterized?
[ ] XSS: Is user input sanitized before rendering?
[ ] File Upload: Are uploads validated and stored securely?
[ ] Secrets: Any hardcoded keys, tokens, or passwords?
[ ] CORS: Whitelisted origins only?
[ ] Rate Limiting: Are sensitive endpoints rate-limited?
[ ] Dependencies: New deps audited (npm audit + existence check)?
[ ] Error Messages: No stack traces or internals in responses?
[ ] Headers: CSP, HSTS, X-Frame-Options set correctly?
```

---

## Key Takeaways

1. AI generates insecure code by default. Security is always a manual review concern.
2. Auth code gets 100% human review. No exceptions.
3. All queries parameterized. All inputs validated server-side.
4. Principle of least privilege: every endpoint, every database query.
5. Dependencies audited on every AI PR. AI hallucinates package names.
6. Secrets never in code. Environment variables only.
7. Security headers and rate limiting are mandatory, not optional.

---

## Cross-References

- **Depends on:** `ai-security-governance.md` — AI-specific security risks and MCP governance
- **Depends on:** `error-handling-philosophy.md` — error handling's security implications
- **Applied by:** `code-review-workflow.md` — security review in the review process
- **Applied by:** `api-design-standards.md` — security in API design
