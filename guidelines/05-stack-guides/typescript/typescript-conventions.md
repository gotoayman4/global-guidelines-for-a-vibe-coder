---
status: "Normative"
scope: "Stack (TypeScript)"
tags: [typescript, types, strict]
---

# TypeScript Conventions

**Tags:** `#typescript` `#types` `#strict` `#dto` `#generics`
---

## Directives

1. **`strict: true` non-negotiable.** Never weaken type checking to fix errors — fix the types. No `any` casts, `eslint-disable`, or `@ts-ignore` except proven third-party gaps (comment why). No `as unknown as T` double casts unless no alternative exists (document why).
2. **`interface` for extendable object shapes; `type` for unions/intersections/aliases.** Export all public types explicitly — no barrel `export *`.
3. **Enums:** string unions for API-crossing types (`type WorkflowStatus = "draft" | "approved"`); `const enum` for compile-time-only values. Never `namespace`.
4. **API/DTO typing:** all request/response shapes typed — never accept `any` from API responses; backend DTOs in `modules/<domain>/dto/`; frontend service functions annotated with the API envelope `{ data: T; pagination?; error? }`; reuse shared types, don't redeclare.
5. **Functions:** named exports over default (refactoring safety); pure utilities in `src/utils/` with unit tests; `async` only when awaiting something; prefer `?.` and `??` over manual null checks.
6. **Generics & inference:** let TS infer simple returns; explicit return types on public APIs/services/hooks (documentation + interface-drift detection); descriptive generic names (`TData`, `TResponse`) not bare `T`.
7. **Utility types:** leverage `Partial`, `Pick`, `Omit`, `Record`; explicit `DeepPartial<T>` for deep structures.
8. **Import order (ESLint-enforced):** Node built-ins → external packages → internal absolute (`@/hooks`) → relative.
9. **Discriminated unions for results:** `Result<T> = { success: true; data: T } | { success: false; error: { code, message } }` — makes error handling exhaustive via narrowing.
10. **MUI sx typing:** prefer `SystemStyleObject<Theme>` over `SxProps<Theme>` on props that get spread; callback form `sx={(theme) => ({...})}` for theme-dependent values.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| `any` to silence errors | Fix the type / type guard |
| Double casts | Proper mappers |
| `export *` barrels | Named exports |
| `async` without `await` | Remove keyword |
| Untyped API calls | Typed DTOs |

## Cross-References

`../nestjs/nestjs-architecture.md` · `../react/react-architecture.md` · `../../04-architecture/api-design-standards.md`
