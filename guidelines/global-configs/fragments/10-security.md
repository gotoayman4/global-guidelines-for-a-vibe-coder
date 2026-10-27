## Security (Always Load — DO NOT REMOVE)

- **SQL Injection Prevention.** ALL database queries MUST use parameterized statements. NEVER concatenate strings into SQL.
  → Source: `02-engineering-practices/security-engineering.md`
- **Secrets Management.** NEVER hardcode secrets, tokens, API keys, or credentials in source files. Environment variables only. Pre-commit hooks MUST scan for secret patterns.
  → Source: `03-git-and-ci/environment-management.md`
- **Input Validation.** ALL user input MUST be validated at system boundaries (API controllers, DTOs). Trust no client-side validation.
  → Source: `02-engineering-practices/error-handling-philosophy.md`
- **Authentication Code Review.** Auth code gets the highest scrutiny in EVERY mode: AI self-review, an automated auth-flow test at each milestone, and an independent fresh-session AI review before shipping any auth change. No human reviewer is required.
  → Source: `02-engineering-practices/security-engineering.md`
- **Dependency Audit and Version Pinning.** Before installing any NEW dependency or major bump, verify the latest stable version via web/npm — AI-suggested names and versions are unverified. Pin older majors only with an ADR.
  → Source: `00-ai-fundamentals/ai-security-governance.md`
- **CORS.** NEVER use `origin: '*'`. Configure an explicit CORS whitelist from day one.
- **Security Headers.** CSP, HSTS and X-Frame-Options MUST be configured — mandatory, not optional.
  → Source: `02-engineering-practices/security-engineering.md`
- **File Upload MIME Validation (Magic-Byte).** ALL upload endpoints MUST detect MIME type from the file's magic bytes (`file-type`, pinned), never from the client `Content-Type`; reject types not on the allowlist.
  → Source: `02-engineering-practices/file-upload-security.md`
