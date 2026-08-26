# NestJS Backend Architecture

**Status:** Normative  
**Scope:** Stack (NestJS)  
**Token Tier:** Medium (~2,000 tokens)  
**Tags:** `#nestjs` `#backend` `#modules` `#controllers` `#services` `#guards`
**Last Updated:** 2026-08-26  

---

## Purpose

This guide defines the architecture and conventions for NestJS backend applications. It covers module organization, controller/service separation, authentication patterns, DTO validation, error handling, and database integration — establishing a consistent, maintainable backend structure.

---

## Module Architecture

### One Feature Module per Domain

Organize code around business domains — not technical layers:

```
backend/src/
├── common/              # Shared infrastructure (guards, pipes, interceptors, decorators)
├── modules/
│   ├── programs/        # Programs domain
│   │   ├── dto/
│   │   ├── programs.controller.ts
│   │   ├── programs.service.ts
│   │   └── programs.module.ts
│   ├── courses/         # Courses domain
│   ├── workflows/       # Workflows domain
│   └── users/           # Users domain
└── main.ts
```

- One feature module per domain.
- Shared infrastructure lives in `common/`.
- Import only what is needed — avoid circular dependencies. Use `forwardRef()` only when unavoidable.

---

## Controllers (Keep Thin)

Controllers route requests to services — **no business logic**.

### Rules

- Use proper HTTP methods: `GET` (read), `POST` (create), `PUT`/`PATCH` (update), `DELETE` (delete).
- Apply auth guards on every protected controller or route method.
- All endpoints under `/api/v1/<resource>`.
- Success envelope: `{ data: T; pagination?: Pagination }`.
- Error envelope: `{ error: string; code: string; details?: unknown }` — never return both `data` and `error` in the same response.

```typescript
@Controller("api/v1/programs")
@UseGuards(AuthGuard)
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  async findAll(@Query() query: GetProgramsDto) {
    return this.programsService.findAll(query);
  }

  @Post()
  async create(@Body() dto: CreateProgramDto, @CurrentUser() user: AuthUser) {
    return this.programsService.create(dto, user);
  }
}
```

---

## Services (Business Logic Here)

- All business logic lives in service classes decorated with `@Injectable()`.
- Inject dependencies through constructor with typed interfaces.
- Services call the database — not controllers directly.
- Multi-table operations must use explicit transactions.
- **Immutable entities:** Approved records are immutable — create new versions, never mutate.

```typescript
@Injectable()
export class ProgramsService {
  constructor(
    private readonly db: DatabaseClient,
    private readonly workflowService: WorkflowService,
  ) {}

  async create(dto: CreateProgramDto, user: AuthUser): Promise<Program> {
    // 1. Validate business rules
    // 2. Create entity in transaction
    // 3. Create audit log
    // 4. Return typed result
  }
}
```

---

## DTOs & Validation

### Mandatory Rules

- Every controller input must be typed with a DTO class.
- Use `class-validator` decorators on all DTO properties.
- Enable global `ValidationPipe` in `main.ts` with `whitelist: true, forbidNonWhitelisted: true`.
- Create separate DTOs for create and update operations.
- DTOs live in `modules/<domain>/dto/`.

```typescript
export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @Matches(/^[A-Z]{2,4}\d{3,4}$/)
  courseCode: string;

  @IsInt()
  @Min(1)
  @Max(6)
  creditHours: number;
}
```

---

## Authentication & Authorization

### Authentication (Identity)

- Verify the JWT in an auth guard. Extract user claims from the validated JWT — do not hit the auth API on every request.
- **Never bypass authentication for protected routes**, even in development.

### Authorization (Permissions)

- Implement role-based access via a roles guard + custom `@Roles()` decorator.
- Roles are stored in JWT claims or a roles table.
- Row-Level Security at the database layer is the **second line of defense** — both app-level and DB-level authorization must hold.

### Guard Rule

- JWT should be validated in NestJS guards, then mapped to the local user/role context.
- Authentication proves identity. Authorization requires separate role/scope checks.

---

## Error Handling

- Throw NestJS `HttpException` subclasses (`NotFoundException`, `ForbiddenException`, `BadRequestException`, etc.) from services.
- All errors must include a machine-readable `error.code`.
- A global exception filter normalizes unhandled errors into the API envelope format.
- **Never expose stack traces or internal error details in production responses.**

```typescript
// ✅ Throw typed exceptions with error codes
throw new NotFoundException({
  code: "PROGRAM_NOT_FOUND",
  message: `Program with id ${id} not found`,
});

// ✅ Global filter catches unhandled errors
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Normalize to { data: null, error: { code, message } }
  }
}
```

---

## Database Integration

- Use the database client directly — not a heavy ORM.
- Runtime: use the **service-role key** on the server (never the anon key for privileged operations), accessed via `ConfigService`. Never hardcode credentials.
- Multi-step writes: use transactions to keep data consistent.
- Rely on database-level RLS for row-level authorization — do not reimplement in application code.

---

## Performance & Security

| Practice | Why |
|---|---|
| Validate all input via DTOs | Prevents injection and malformed data |
| Use `ConfigService` for env vars | Never `process.env` directly — testable, centralized |
| Rate limiting on public endpoints | Prevents abuse (`@nestjs/throttler`) |
| Sanitize HTML-rendered content | Prevents XSS in stored content |
| Log security events | Failed auth, forbidden attempts — use NestJS `Logger` |
| Paginate all list endpoints | Prevents unbounded queries |

---

## Common Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Business logic in controllers | Delegate to services |
| Direct anon key for privileged reads | Use service-role key via ConfigService |
| Missing ValidationPipe | Always enable with `whitelist` and `forbidNonWhitelisted` |
| Mutating approved/immutable records | Create new versions instead |
| Hardcoded connection strings | Always use ConfigService / env vars |
| `process.env` in service code | Inject via ConfigService |
| Circular module dependencies | Restructure; use `forwardRef()` only as last resort |

---

## Key Takeaways

1. **Controllers are thin routers** — they delegate to services, never contain business logic.
2. **One module per domain** — clear boundaries, minimal coupling.
3. **DTOs + ValidationPipe on every input** — defense at the boundary.
4. **Auth guard on every protected route** — opt-in security is broken security.
5. **Typed error codes, never prose scraping** — machine-readable, i18n-friendly.
6. **Transactions for multi-table writes** — atomicity is non-negotiable for data integrity.
7. **Immutable approved records** — create versions, never mutate history.

---

## Cross-References

- [TypeScript Conventions](../typescript/typescript-conventions.md) — language-level typing rules
- [Backend Architecture](../../04-architecture/backend-architecture.md) — general backend philosophy
- [API Design Standards](../../04-architecture/api-design-standards.md) — REST conventions and envelope format
- [Supabase Database Patterns](../supabase/supabase-database.md) — database-specific patterns
- [Supabase Auth](../supabase/supabase-auth.md) — authentication integration details
- [Error Handling Philosophy](../../02-engineering-practices/error-handling-philosophy.md) — error taxonomy and logging
- [Security Engineering](../../02-engineering-practices/security-engineering.md) — security practices
