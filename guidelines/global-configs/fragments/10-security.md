## Security (Always Load — DO NOT REMOVE)

- **SQL Injection Prevention.** ALL database queries MUST use parameterized statements. NEVER concatenate strings into SQL.
  → Source: `02-engineering-practices/security-engineering.md`
- **Secrets Management.** NEVER hardcode secrets, tokens, API keys, or credentials. Environment variables only; pre-commit hooks scan for secret patterns.
  → Source: `03-git-and-ci/environment-management.md`
- **Input Validation.** Validate ALL user input at system boundaries (API controllers, DTOs). Trust no client validation.
  → Source: `02-engineering-practices/error-handling-philosophy.md`
- **Authorization & Tenant Isolation (IDOR/BOLA).** Enforce server-side ownership/role checks (or DB RLS) on EVERY read/write — never trust client IDs, roles, or hidden UI.
  → Source: `02-engineering-practices/security-engineering.md`
- **Authentication Code Review.** Highest scrutiny in EVERY mode: AI self-review, automated auth-flow test at milestones, and independent fresh-session AI review before shipping auth changes. No human reviewer required.
  → Source: `02-engineering-practices/security-engineering.md`
- **Dependency Audit and Version Pinning.** Before installing any NEW dependency or major bump, verify latest stable version via web/npm — AI-suggested versions are unverified. Pin older majors only with an ADR.
  → Source: `00-ai-fundamentals/ai-security-governance.md`
- **CORS & Security Headers.** NEVER use `origin: '*'`; configure explicit CORS whitelist from day one. CSP, HSTS and X-Frame-Options are mandatory.
  → Source: `02-engineering-practices/security-engineering.md`
- **File Upload MIME Validation (Magic-Byte).** Upload endpoints MUST detect MIME from magic bytes (e.g., `file-type` pinned), never client `Content-Type`; reject non-allowlisted types.
  → Source: `02-engineering-practices/file-upload-security.md`
