# Monorepo Strategy — Managing Multi-Package Projects

**Status:** Advisory
**Scope:** Global
**Token Tier:** Full (~500 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `frontend-architecture.md`, `backend-architecture.md`

---

90% of vibe-coding projects should start as a single package. Complexity is the enemy of AI-assisted development.

## Decision

**Monorepo when:** 2+ packages share types/utilities/config · atomic commits needed across apps · unified CI/CD · shared design system.
**Single package when:** one app with no shared code · MVP with <3 packages · solo developer · monorepo tooling complexity outweighs benefit.

## Directives

1. **Tooling default: pnpm workspaces** (lightweight). Turborepo when caching/parallel tasks are needed. Nx only for large enterprise repos — overkill otherwise.
2. **Standard layout:** `apps/` (web, api, mobile) + `packages/` (shared types, ui, config-eslint, config-ts) + workspace definition at root.
3. **Share across packages:** TypeScript types (API contract single source) · Zod validation schemas · constants/enums · pure utility functions · shared ESLint/TS configs.
4. **Do NOT share:** business logic (each app owns it) · database models (backend owns data access) · UI components with embedded business logic · environment-specific configuration.
5. **Dependencies:** internal packages via `workspace:*`; single versions of external deps at root where possible.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Monorepo for an MVP | Single package until proven need |
| Sharing business logic between apps | Share types/schemas, not logic |
| Nx for a 3-package project | pnpm workspaces |

## Cross-References

`frontend-architecture.md` · `backend-architecture.md`
