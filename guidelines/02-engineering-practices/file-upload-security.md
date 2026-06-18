# File Upload Security — Magic-Byte MIME Validation

**Status:** Normative
**Scope:** Global
**Token Tier:** Compact (~700 tokens)
**Last Updated:** 2026-06-18
**Cross-References:** `security-engineering.md`, `error-handling-philosophy.md`

---

## Purpose

Define the mandatory file upload security practices for AI-assisted development. AI frequently trusts client-supplied `Content-Type` headers for MIME validation — a critical security vulnerability. This guideline makes magic-byte inspection the non-negotiable standard.

---

## Core Rule: Never Trust Client-Supplied Content-Type

The `Content-Type` header from `multipart/form-data` requests is set by the client and can be arbitrarily spoofed. An attacker can upload `evil.exe` with `Content-Type: image/png` and bypass header-only validation.

**ALL file upload endpoints MUST:**
1. Read magic bytes from the file buffer (first bytes of the file)
2. Detect the actual MIME type from those bytes
3. Validate the detected MIME type against an allowed whitelist
4. Reject files whose detected MIME type is not in the whitelist

---

## Implementation Standard

### Node.js / NestJS Backend

Use the `file-type` package for magic-byte detection:

```typescript
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

async function validateFileMime(buffer: Buffer): Promise<boolean> {
  const result = await fileTypeFromBuffer(buffer);
  return result !== undefined && ALLOWED_MIME_TYPES.has(result.mime);
}
```

### Package Version Constraint

Use `file-type@16.5.4` (CommonJS-compatible). Version 17+ is ESM-only and incompatible with NestJS/Node.js CommonJS module systems unless the project has migrated to ESM.

### File Size Validation

In addition to MIME validation, enforce file size limits:
- **Default max:** 10 MB per file
- **Configurable:** Per-endpoint override via DTO or config
- **Rejection response:** HTTP 413 with machine-readable error code `FILE_TOO_LARGE`

---

## Validation Order (Defense in Depth)

Always validate in this order:
1. **File exists** (buffer is non-empty)
2. **File size** within limit
3. **Magic-byte MIME** matches whitelist
4. **Sanitize filename** (ASCII-safe, no path traversal)
5. **Store** to Supabase Storage / filesystem

Reject at the first failing check. Never proceed to storage if any validation fails.

---

## Forbidden Patterns

| Anti-Pattern | Why It's Dangerous | Fix |
|---|---|---|
| **Trusting `req.file.mimetype`** | Client sets this; trivially spoofed | Use `fileTypeFromBuffer(req.file.buffer)` instead |
| **Extension-only validation** | `.exe` renamed to `.png` passes | Validate magic bytes, not file extension |
| **Blacklist approach** | New dangerous formats bypass it | Use an allowed MIME whitelist |
| **No size limit** | DoS via 1 GB uploads | Enforce max file size |

---

## Key Takeaways

1. NEVER trust client-supplied `Content-Type` or `mimetype` for file validation.
2. ALWAYS detect MIME type from magic bytes using `file-type@16.5.4`.
3. Use an explicit MIME whitelist — never a blacklist.
4. Validate: existence → size → MIME → filename → store.
5. Reject with machine-readable error codes.

---

## Cross-References

- **Depends on:** `security-engineering.md` — general security engineering standards
- **Depends on:** `error-handling-philosophy.md` — machine-readable error code conventions
- **Applied by:** `api-design-standards.md` — file upload endpoint design
