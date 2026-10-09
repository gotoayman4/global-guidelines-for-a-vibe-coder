## Security (Always Load — DO NOT REMOVE)

- **SQL Injection Prevention.** ALL database queries MUST use parameterized statements. NEVER concatenate strings into SQL.
  → Source: `02-engineering-practices/security-engineering.md`
- **Secrets Management.** NEVER hardcode secrets, tokens, API keys, or credentials in source files. Environment variables only. Pre-commit hooks MUST scan for secret patterns.
  → Source: `03-git-and-ci/environment-management.md`
- **Input Validation.** ALL user input MUST be validated at system boundaries (API controllers, DTOs). Trust no client-side validation.
  → Source: `02-engineering-practices/error-handling-philosophy.md`
- **Authentication Code Review.** Auth code gets careful review, tiered by mode: vibe = AI self-review + automated auth-flow test, human pass at ship boundary; standard/guarded = 100% human review. Security never relaxes.
  → Source: `02-engineering-practices/security-engineering.md`
- **Dependency Audit and Version Pinning.** AI-suggested package names/versions are unverified — before installing any NEW dep or major bump, verify latest stable via web/npm (skip re-search for versions already verified here). Pin older majors only with an ADR.
  → Source: `00-ai-fundamentals/ai-security-governance.md`
- **CORS.** NEVER use `origin: '*'`. Configure an explicit CORS whitelist from day one.
- **Security Headers.** Security headers (CSP, HSTS, X-Frame-Options) MUST be configured. They are mandatory, not optional.
  → Source: `02-engineering-practices/security-engineering.md`
- **File Upload MIME Validation (Magic-Byte).** ALL file upload endpoints MUST verify MIME type by reading magic bytes from the file buffer, not by trusting client-supplied `Content-Type` headers (use `file-type` — the version pinned in the project's `package.json`). Reject uploads whose detected type is not on the allowlist.
  → Source: `02-engineering-practices/file-upload-security.md`
