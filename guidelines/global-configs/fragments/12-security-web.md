## Web Security (Browser-Facing Apps, APIs & Uploads)
<!-- requires: web-ui, api, uploads -->

- **CORS, Headers & Sessions.** NEVER use `origin: '*'`; configure an explicit CORS whitelist from day one. For apps served to browsers, CSP, HSTS and X-Frame-Options are mandatory; cookie sessions are `HttpOnly`, `Secure`, `SameSite` with CSRF protection, and login/auth endpoints are rate-limited.
  → Source: `02-engineering-practices/security-engineering.md`
- **File Upload MIME Validation (Magic-Byte).** Upload endpoints MUST detect MIME from magic bytes (e.g., `file-type` pinned), never client `Content-Type`; reject non-allowlisted types.
  → Source: `02-engineering-practices/file-upload-security.md`
