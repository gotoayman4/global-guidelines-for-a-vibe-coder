# TypeScript Conventions

**Status:** Normative  
**Scope:** Stack (TypeScript)  
**Token Tier:** Medium (~1,800 tokens)  
**Tags:** `#typescript` `#types` `#strict` `#dto` `#generics`

---

## Purpose

This guide defines TypeScript conventions for frontend (React) and backend (NestJS) codebases. It establishes type safety standards, module organization, and patterns that keep TypeScript projects predictable, refactorable, and AI-friendly.

---

## Version & Strictness

- Target the latest stable TypeScript version adopted by the project.
- Run with `strict: true`. Never weaken type checking to fix errors — fix the types instead.
- Never add `any` casts, `eslint-disable` suppressions, or `@ts-ignore` except for proven third-party type gaps. Always add a comment explaining why.
- Never use `as unknown as T` double casts unless there is no alternative — document the reason.

---

## Type Definitions

### Interface vs Type

- Use `interface` for object shapes that may be extended or merged.
- Use `type` for unions, intersections, and aliases.
- Export all public types explicitly — prefer named exports over barrel `export *`.

### Enums

- Prefer `const enum` for compile-time-only values.
- Use string unions for API-crossing types that need JSON serialization:
  ```typescript
  // ✅ API-crossing: use string union
  export type WorkflowStatus = "draft" | "pending_review" | "approved" | "rejected";

  // ✅ Compile-time only: use const enum
  const enum InternalState { Idle, Loading, Active }
  ```

### Namespaces

- Never use `namespace` — prefer ES module scope.

### Utility Types

- Leverage built-in utility types: `Partial<T>`, `Required<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`.
- For deeply partial structures, define explicit `DeepPartial<T>` rather than cascading `Partial<>`.

---

## Functions & Utilities

- Prefer named exports over default exports for utilities to improve refactoring safety.
- Pure utility functions belong in `src/utils/`. Add unit tests for non-trivial utilities.
- Mark functions `async` only when they `await` something — never write `async function() { return value; }`.
- Use optional chaining (`?.`) and nullish coalescing (`??`) instead of manual null checks where appropriate.

---

## API Types & DTOs

- All API request and response shapes must be typed. Never accept `any` from API responses.
- Backend DTOs live in the respective `modules/<domain>/dto/` folder.
- Frontend service functions must have explicit return type annotations matching the API envelope: `{ data: T; pagination?: Pagination; error?: ApiError }`.
- Reuse types from shared type files rather than redeclaring inline.

---

## Import Organization

Import order (enforce with ESLint):

1. Built-in Node.js modules (`path`, `fs`)
2. External packages (`react`, `@mui/material`, `swr`)
3. Internal absolute paths (`@/hooks`, `@/services`, `@/types`)
4. Relative paths (`./`, `../`)

Never mix default and named imports on the same line unless the library requires it.

---

## Generics & Type Inference

- Let TypeScript infer return types where the function body is straightforward.
- Explicitly annotate return types for public API functions, service methods, and hooks — this serves as documentation and catches interface drift.
- Use descriptive generic parameter names when the meaning isn't obvious: `TData`, `TResponse`, `TParams` — not just `T`.

```typescript
// ✅ Descriptive generics
async function fetchPaginated<TItem>(
  endpoint: string,
  params: QueryParams
): Promise<PaginatedResponse<TItem>> { ... }
```

---

## Discriminated Unions for Error Handling

Use discriminated unions to make error handling exhaustive:

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

function handleResult<T>(result: Result<T>) {
  if (result.success) {
    // TypeScript narrows to { success: true; data: T }
    return result.data;
  }
  // TypeScript narrows to error case
  throw new ApiError(result.error.code, result.error.message);
}
```

---

## MUI `sx` Prop Typing (Frontend)

When writing components that accept an `sx` prop:

- Prefer `SystemStyleObject<Theme>` over `SxProps<Theme>` for props that need to be spread. `SxProps` includes array types that pollute index signatures when spread into objects.
- For theme-dependent sx values, use the callback form `sx={(theme: Theme) => ({...})}`.

```typescript
// ✅ Safe to spread
interface Props {
  sx?: SystemStyleObject<Theme>;
}

// ✅ Callback form for theme access
<Card sx={(theme: Theme) => ({
  mb: 4,
  background: headerGradient(theme, color),
})} />
```

---

## NestJS-Specific (Backend)

- Decorate DTOs with `class-validator` decorators for `ValidationPipe` compatibility.
- Guards, interceptors, and pipes belong in `backend/src/common/`.
- Use `@Injectable()` consistently — never manually instantiate services.
- Apply auth guards on every protected controller or route-level method.
- Avoid business logic in controllers — delegate to service layer.

---

## Common Anti-Patterns

| Anti-Pattern | Why It's Harmful | Fix |
|---|---|---|
| `any` cast to silence errors | Hides real type bugs | Fix the underlying type or narrow with type guards |
| `as unknown as T` double cast | Bypasses all type safety | Use proper type constructors or mappers |
| `export *` barrels | Leaks internal types, slows compilation | Export named members explicitly |
| `async` functions without `await` | Unnecessary promise wrapping | Remove `async` keyword |
| Returning `any` from API calls | No type safety on data shapes | Define and use typed DTOs |
| `namespace` usage | Non-standard module pattern | Use ES modules |

---

## Key Takeaways

1. **`strict: true` is non-negotiable** — weaker settings hide bugs that bite later.
2. **Prefer `interface` for objects, `type` for unions** — clear signal of intent.
3. **String unions over enums for API types** — JSON-safe and simpler at boundaries.
4. **Explicit return types on public APIs** — documentation and safety net.
5. **Discriminated unions for result types** — makes error handling exhaustive.
6. **`SystemStyleObject<Theme>` over `SxProps<Theme>`** — safer spread in MUI components.

---

## Cross-References

- [NestJS Architecture](../nestjs/nestjs-architecture.md) — backend-specific TypeScript patterns
- [React Architecture](../react/react-architecture.md) — frontend component typing
- [API Design Standards](../../04-architecture/api-design-standards.md) — request/response envelope typing
- [Error Handling Philosophy](../../02-engineering-practices/error-handling-philosophy.md) — typed error patterns
- [Backend Architecture](../../04-architecture/backend-architecture.md) — service and controller typing
