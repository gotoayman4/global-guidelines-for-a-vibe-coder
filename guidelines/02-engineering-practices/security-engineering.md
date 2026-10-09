# Security Engineering — Building Secure Systems with AI

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,300 tokens)
**Last Updated:** 2026-09-24
**Cross-References:** `ai-security-governance.md`, `error-handling-philosophy.md`, `file-upload-security.md`

---

**Premise:** AI chooses insecure implementations nearly half the time when given a choice — training data is full of insecure code. Assume every AI-generated line touching auth, input, data access, or external services is insecure until reviewed. Implementation-level standards below; AI-specific governance (MCP, agent permissions, supply chain) in `ai-security-governance.md`.

## Directives

**Authentication**
1. Passwords: bcrypt or argon2 (never MD5/SHA1/SHA256) · min 8 chars with upper+number+special · login rate limit 5/min per IP · temporary lockout after 10 failures. Never store/log/return plaintext or hashes.
2. Sessions/tokens: JWT expiration 15–60 min + refresh rotation; refresh tokens in httpOnly cookies (never localStorage); invalidation on logout/password change; CSRF protection on state-changing requests.
3. OAuth: validate state parameter, whitelist redirect_uri, verify audience/issuer, minimum scopes.
4. **Auth code review by risk tier.** Authentication code MUST receive careful review. In vibe mode an AI self-review + automated auth-flow test is the floor and a human pass is due at the ship boundary; in standard/guarded, auth code gets 100% human review. The security property (auth works correctly, no bypass) never relaxes — only WHO reviews at which milestone scales with mode.

**Authorization & data access**
5. Least privilege on every endpoint: `authenticate` AND `authorize(role)` middleware. Multi-tenant data isolated via database RLS, not application checks alone.
6. ALL queries parameterized (`db.query('… WHERE email = $1', [email])`). String concatenation/template literals in SQL forbidden.

**Input & injection**
7. Server-side schema validation (Zod/Joi/Yup) on all inputs — client validation is cosmetic. Reject type coercion ("123" ≠ number).
8. XSS: escaped output by default (JSX); DOMPurify for any `dangerouslySetInnerHTML`; CSP header enabled; sanitize server-side too.
9. File uploads: magic-byte MIME whitelist (see `file-upload-security.md`) · size cap · malware scan in production · stored outside web root · randomized filenames · `Content-Disposition: attachment` for non-images.

**API surface**
10. Rate limits: `/auth/login` 5/min per IP · `/auth/register` 3/min · authenticated APIs 100/min.
11. CORS explicit origin whitelist only — never `*`, never null, never reflected without validation. Credentials flag only when needed.
12. Security headers mandatory: CSP · X-Content-Type-Options nosniff · X-Frame-Options DENY · HSTS · Referrer-Policy strict-origin-when-cross-origin.
13. Error responses never leak stack traces, SQL, schemas, or internal paths — generic message to user, detail to logs.

**Secrets & dependencies**
14. Secrets only in environment variables; `.env` gitignored and agent-ignored (`.cursorignore`/`.claudeignore`); separate secrets per environment; CI secrets via platform managers; pre-commit secret scanning; a committed secret is rotated immediately.
15. Dependencies: audit on every PR (`npm audit`, `npm ls <pkg>` existence check); verify latest stable version via web/npm before pinning (AI training data is stale); pin critical deps exactly; ADR required to stay on older majors; reject abandoned packages (<1 year unmaintained) and <100 weekly downloads unless from a trusted org.
16. Environments: production DEBUG=false, stack traces hidden; staging mirrors production.

**Declared vs enforced**
17. A control whose failure mode is "the platform ignores it" (headers, retention, cache TTL, rewrites) is asserted on the response, not the config — or the unit test states in its name which it checks, and the list under test is extracted from the artifact rather than hand-copied beside it. Delete a declaration the platform overrides; if the guarantee is real but not yours, assert it as a measured platform fact with the measured value so it goes red if the platform stops providing it. Every check distinguishes "clean" from "not read"; "not read" is a failure, never a pass. When comparing a declaration to a provider's normalised form, normalise the declaration first and keep a case built from the provider's literal output. An exemption names the fact that earns it and is re-checkable (pin the premise with a tripwire so the exemption dies when the code changes). Local-emulator green is not capability — one live CLI/GET read belongs with the rest.

## Review Checklist (every AI PR touching auth/input/db/uploads/config)

auth checks on protected routes · authorization verified per operation · parameterized queries · server-side validation · upload validation · no hardcoded secrets · CORS whitelist · rate limiting · deps audited · error messages clean · headers set.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| "AI is smart enough for security" | Assume insecure until reviewed |
| `origin: '*'` "for now" | Whitelist from day one |
| Skipping dependency audit | Audit every AI PR |
| Hardcoding secrets "temporarily" | .env + hooks from day one |
| Trusting AI security tests | Manual review of auth coverage |
| Unreviewed AI security fixes | Manual review of every fix |

## Cross-References

- **Depends on:** `ai-security-governance.md`, `error-handling-philosophy.md`
- **Applied by:** `code-review-workflow.md`, `api-design-standards.md`
