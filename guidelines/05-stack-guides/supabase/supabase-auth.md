# Supabase Authentication

**Status:** Normative  
**Scope:** Stack (Supabase Auth)  
**Token Tier:** Low (~1,500 tokens)  
**Tags:** `#supabase` `#auth` `#jwt` `#rls` `#guards` `#grants`

---

> **⚠️ Breaking Change — Effective May 30, 2026**
> Starting **May 30, 2026**, new Supabase projects no longer automatically grant Data API access to new `public` tables for `anon`, `authenticated`, or `service_role`.
> Explicit `GRANT` statements are now required per role. This affects how JWT-authenticated clients reach tables via supabase-js.
> See [Supabase Database Patterns](./supabase-database.md#data-api-access--explicit-grants-required) for the full migration pattern.

---

## Purpose

This guide defines the authentication and authorization integration pattern for applications using Supabase Auth with a NestJS backend. It covers JWT validation, guard architecture, role-based access, user linkage, and security boundaries.

---

## Architecture Overview

```
┌──────────────┐     JWT      ┌──────────────┐    service-role    ┌──────────────┐
│   Frontend   │ ──────────►  │    NestJS    │ ────────────────►  │  Supabase    │
│   (React)    │              │   Backend    │                    │  PostgreSQL  │
└──────────────┘              └──────────────┘                    └──────────────┘
       │                            │                                    │
       │ supabase-js (anon key)     │ Auth Guard validates JWT           │ RLS policies
       │ user session + JWT         │ Roles Guard checks permissions     │ 2nd defense
```

**Key principle:** Authentication proves identity. Authorization requires separate role/scope checks. Both app-level and DB-level authorization must hold.

---

## JWT Validation

### In NestJS Guards

- The auth guard validates the JWT on every protected request.
- Extract user claims from the validated JWT — **do not hit the Supabase Auth API on every request**.
- Map JWT claims to a local user context (`AuthUser` type) that controllers and services use.

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    const payload = await this.verifyJwt(token);
    request.user = { id: payload.sub, email: payload.email, role: payload.role };
    return true;
  }
}
```

### JWT Claims

The JWT typically carries:
- `sub` — user ID (maps to `auth.users.id`)
- `email` — user email
- `app_metadata` / `user_metadata` — custom claims (role, permissions)

---

## User Linkage

Store a local application user record that links to the auth identity:

```
auth.users (Supabase)          public.users (App)
┌──────────────┐              ┌──────────────────┐
│ id (UUID)    │◄─────────────│ supabase_auth_id  │
│ email        │              │ id (UUID)         │
│ ...          │              │ name_ar, name_en  │
└──────────────┘              │ role              │
                               │ created_at        │
                               └──────────────────┘
```

- The `supabase_auth_id` column references `auth.users.id`.
- The app user row holds domain-specific data (name, role, preferences).
- Create the app user row on first login (or via invitation flow).

---

## Authorization Model

### Role-Based Access

- Implement role checks via a `RolesGuard` + custom `@Roles()` decorator.
- Roles are stored in the JWT claims or the local users table.
- Apply at the controller or route level:

```typescript
@Controller("api/v1/admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminController { ... }
```

### Row-Level Security (RLS)

- RLS at the database layer is the **second line of defense** — both must hold.
- RLS policies use `auth.uid()` for ownership checks.
- Grant minimal access: default DENY, then grant SELECT/INSERT/UPDATE/DELETE per role.

---

## Security Rules

### Non-Negotiables

- **Never bypass authentication for protected routes**, even in development.
- **Never use the anon key for privileged operations** on the server — use the service-role key.
- **Never hardcode credentials or JWT secrets** — always use `ConfigService` / environment variables.
- **Validate JWT expiration and issuer** — never accept unvalidated tokens.
- **Log security-relevant events** — failed auth attempts, forbidden access.

### Service-Role Key Usage

- The service-role key bypasses RLS — use it only for server-side operations that need full access.
- The anon key respects RLS — use it only for client-side operations.
- Both keys accessed via `ConfigService`, never hardcoded.

### Grant Requirements per Role (New — May 2026)

As of May 30, 2026, each role must have explicit `GRANT` privileges on `public` tables before the Data API allows access. This affects how client-side `supabase-js` and server-side `service_role` calls interact with tables:

| Key/Role | Grant Required | Effect |
|---|---|---|
| **anon key** → `anon` role | `GRANT SELECT ON public.table TO anon` | Public read-only Data API access |
| **user JWT** → `authenticated` role | `GRANT SELECT, INSERT, UPDATE, DELETE ON public.table TO authenticated` | Signed-in user Data API access |
| **service_role key** → `service_role` role | `GRANT SELECT, INSERT, UPDATE, DELETE ON public.table TO service_role` | Server-side privileged access (bypasses RLS) |

Missing grants produce a `42501` error. Always include `GRANT` statements in migrations alongside `CREATE TABLE` and `ENABLE ROW LEVEL SECURITY`.

---

## Common Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Hitting auth API on every request | Validate JWT locally; only call auth API for session management |
| Anon key for server operations | Use service-role key for privileged server access |
| Implementing auth from scratch | Use Supabase Auth — don't build custom auth |
| Bypassing RLS "for convenience" | RLS is defense-in-depth — always enable |
| Skipping `GRANT` on new tables (after May 2026) | Include explicit `GRANT` per role in every migration (GRANT → ENABLE RLS → CREATE POLICY) |
| Storing plaintext passwords | Never store passwords — Supabase Auth handles this |

---

## Key Takeaways

1. **JWT validation is local and fast** — don't call the auth API on every request.
2. **Auth (identity) ≠ Authorization (permissions)** — both layers must exist.
3. **RLS is mandatory defense-in-depth** — app guards + DB policies both hold.
4. **Service-role key is server-only** — never expose it to the client.
5. **Link auth users to app users** — separate auth identity from domain data.
6. **Include explicit GRANTs in migrations** — every new table needs `GRANT` per role.
7. **Log security events** — failed auth, forbidden access, role escalations.

---

## Cross-References

- [Supabase Database Patterns](supabase-database.md) — RLS policies, schema design
- [NestJS Architecture](../nestjs/nestjs-architecture.md) — guard implementation
- [Security Engineering](../../02-engineering-practices/security-engineering.md) — authentication and authorization patterns
- [Backend Architecture](../../04-architecture/backend-architecture.md) — service-level auth integration
