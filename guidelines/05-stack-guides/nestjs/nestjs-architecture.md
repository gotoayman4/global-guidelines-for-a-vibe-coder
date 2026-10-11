---
status: "Normative"
scope: "Stack (NestJS)"
tags: [nestjs, backend, modules]
---

# NestJS Backend Architecture

**Tags:** `#nestjs` `#backend` `#modules` `#controllers` `#services` `#guards`
---

## Directives

1. **One feature module per domain** (`modules/programs/`, `modules/users/`… each with dto/, controller, service, module). Shared infrastructure in `common/`. Avoid circular deps; `forwardRef()` only as last resort.
2. **Controllers thin:** route → service → respond. No business logic ever. Proper HTTP verbs; auth guards on every protected controller/route; endpoints under `/api/v1/<resource>`; success envelope `{ data, pagination? }`; error envelope `{ error, code, details? }` — never both data and error in one response.
3. **Services hold business logic:** `@Injectable()`, constructor-injected typed dependencies; services (not controllers) touch the database; multi-table writes in explicit transactions; approved records immutable — create versions, never mutate.
4. **DTO validation mandatory:** every controller input typed with a DTO class using `class-validator`; global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` in main.ts; separate Create/Update DTOs; DTOs live in `modules/<domain>/dto/`.
5. **Auth:** JWT verified in guards — extract claims from the validated token, no auth-API call per request; never bypass auth even in dev. Roles guard + `@Roles()` decorator; DB-level RLS is the second line of defense (both layers must hold).
6. **Errors:** throw `HttpException` subclasses from services with machine-readable codes (`throw new NotFoundException({ code: 'PROGRAM_NOT_FOUND', message: … })`); global exception filter normalizes unhandled errors to the envelope; never expose stack traces in production.
7. **Database:** use the DB client directly (not heavy ORM); service-role key server-side via `ConfigService` (never anon key for privileged ops, never hardcoded credentials); transactions for consistency; rely on DB RLS for row-level authorization.
8. **Performance & security:** ConfigService for env vars (never `process.env` directly) · rate limiting on public endpoints (`@nestjs/throttler`) · sanitize stored HTML content · log security events via NestJS Logger · paginate all list endpoints.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Business logic in controllers | Delegate to services |
| Missing ValidationPipe | Enable globally with whitelist |
| Mutating approved records | New version rows |
| Hardcoded connection strings / `process.env` | ConfigService |
| Direct anon key for privileged reads | Service-role key |

## Cross-References

`../typescript/typescript-conventions.md` · `../../04-architecture/backend-architecture.md` · `../../04-architecture/api-design-standards.md` · `../supabase/supabase-database.md`
