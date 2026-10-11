---
status: "Normative"
scope: "Stack (Supabase Auth)"
tags: [supabase, auth, jwt, grants]
---

# Supabase Authentication

**Tags:** `#supabase` `#auth` `#jwt` `#rls` `#guards` `#grants`
---

> **⚠️ Breaking Change:** since 2026-05-30, new tables need explicit per-role `GRANT` statements before Data API access. Full pattern in [Supabase Database Patterns](./supabase-database.md).

Architecture: React (supabase-js + anon key, user JWT) → NestJS backend (AuthGuard validates JWT; RolesGuard checks permissions) → Supabase PostgreSQL (service_role key server-side; RLS as second defense).

## Directives

1. **Auth proves identity; authorization is a separate role/scope check.** Both app-level AND DB-level must hold.
2. **JWT validated locally in the NestJS AuthGuard on every protected request** — extract claims (`sub`, `email`, `app_metadata.role`) into an `AuthUser` context. NEVER call the Supabase Auth API per request.
3. **Never bypass authentication for protected routes**, even in development.
4. **User linkage:** local `public.users` row with `supabase_auth_id` → `auth.users.id`; domain data (name_ar/name_en, role, preferences) lives in the app row. Create on first login or invitation.
5. **Roles:** RolesGuard + custom `@Roles()` decorator at controller level; roles from JWT claims or local users table.
6. **RLS second line of defense:** policies use `auth.uid()` ownership; default DENY then minimal grants per role.
7. **Key discipline:** service-role key = server-side privileged operations only (bypasses RLS); anon key = client-side only (respects RLS). Both via `ConfigService`, never hardcoded.
8. **Grants per role on every new `public` table** (since May 2026): anon → SELECT · authenticated → CRUD · service_role → CRUD. Missing grant = PostgREST `42501`. Include GRANTs in migrations: GRANT → ENABLE RLS → CREATE POLICY.
9. Validate JWT expiration and issuer; log security events (failed auth, forbidden access, role escalation).
10. Never build custom auth from scratch — Supabase Auth handles credential storage.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Auth-API call every request | Local JWT validation |
| Anon key for server operations | Service-role key |
| Bypassing auth "for convenience" | Guards always |
| Skipping RLS "for convenience" | Defense-in-depth mandatory |
| Missing GRANT on new tables | Three-step migration pattern |

## Cross-References

`supabase-database.md` · `../nestjs/nestjs-architecture.md` · `../../02-engineering-practices/security-engineering.md`
