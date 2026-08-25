# Monorepo Strategy — Managing Multi-Package Projects

**Status:** Advisory
**Scope:** Global
**Token Tier:** Full (~1,500 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `frontend-architecture.md`, `backend-architecture.md`

---

## Purpose

Define when and how to structure projects as monorepos. Most vibe coding projects start as single packages and should stay that way until there's a concrete reason to split. This document guides that decision.

---

## When to Use a Monorepo

**Use a monorepo when:**
- You have 2+ packages that share types, utilities, or configuration
- You need atomic commits across frontend and backend
- You want unified CI/CD and dependency management
- You have a shared design system or component library

**Don't use a monorepo when:**
- You have a single application with no shared code
- Your project is an MVP with <3 packages
- You're the only developer and coordination isn't a problem
- AI complexity of monorepo tooling outweighs benefits

**Rule:** 90% of vibe coding projects should start as a single package. Complexity is the enemy of AI-assisted development. Don't add monorepo overhead without a concrete reason.

---

## Monorepo Tooling

| Tool | Best For | Notes |
|---|---|---|
| **Turborepo** | JavaScript/TypeScript projects | Fast caching, good DX, AI knows it well |
| **Nx** | Large enterprise monorepos | Powerful but complex; overkill for most vibe projects |
| **pnpm workspaces** | Simple monorepos | Lightweight, no extra tooling needed |
| **npm workspaces** | Minimal setup | Basic, fewer features than pnpm |

**Default recommendation:** pnpm workspaces for simple needs. Turborepo when you need caching and parallel task execution.

---

## Directory Structure

```
my-project/
├── apps/
│   ├── web/             # Frontend (React/Vite)
│   ├── api/             # Backend (Express/NestJS)
│   └── mobile/          # Mobile (if applicable)
├── packages/
│   ├── shared/          # Shared types, utilities, constants
│   ├── ui/              # Shared UI component library
│   ├── config-eslint/   # Shared ESLint config
│   └── config-ts/       # Shared TypeScript config
├── package.json         # Root package.json (workspaces)
├── pnpm-workspace.yaml  # Workspace definition
├── turbo.json           # Turborepo config (if using)
└── .github/             # CI/CD workflows
```

---

## Shared Package Guidelines

### What to Share
- **TypeScript types/interfaces** — single source of truth for API contracts
- **Validation schemas** (Zod) — shared between frontend and backend
- **Constants and enums** — status values, roles, configuration keys
- **Utility functions** — formatting, transformation (no side effects)
- **ESLint/TypeScript config** — consistent linting across packages

### What NOT to Share
- **Business logic** — each app owns its business rules
- **Database models** — backend owns data access
- **UI components with business logic** — share pure presentational components only
- **Environment-specific configuration** — each app manages its own

---

## Dependency Management

### Package Versioning
- All internal packages use `workspace:*` protocol
- External dependencies at the root where possible (single version)
- Lock file at root level (`pnpm-lock.yaml`)

### Cross-Package Imports
```typescript
// Good: importing from shared package
import { User, CreateUserInput } from '@myorg/shared';
import { Button } from '@myorg/ui';

// Bad: importing across apps (creates coupling)
import { someUtil } from '../../apps/api/src/utils';  // NEVER
```

---

## AI Considerations for Monorepos

### Scoping AI Changes
Monorepos give AI more files to potentially modify. Always scope explicitly:

```
Task: Add email verification to the user registration flow.

Scope:
- /apps/api/src/routes/auth.ts (new verify-email endpoint)
- /apps/web/src/pages/VerifyEmail.tsx (new page)
- /packages/shared/src/types/auth.ts (add VerifyEmailInput type)

Do NOT modify any other packages or apps.
```

### Cross-Package Changes
AI often misses that a type change in `shared` requires updating consumers. Explicitly instruct:

```
When modifying types in /packages/shared, also update all consumers
in /apps/web and /apps/api that use these types.
Run tsc --noEmit after changes to catch broken references.
```

---

## When to Split the Monorepo

Signs you should split:
- CI times exceed 15 minutes (unrelated packages rebuild)
- Different modules need independent deploy cadences
- Packages have diverging dependency requirements
- The monorepo has >20 packages (coordination overhead exceeds benefits)

**Rule:** Monorepo is the default for <10 packages. Polyrepo only when monorepo tooling overhead exceeds the coordination benefit.

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Monorepo for a single app** | Unnecessary tooling complexity | Stay single-package until you have shared code |
| **Sharing business logic** | Coupling apps together; changing one breaks the other | Share types and utilities; each app owns its logic |
| **No scoping in AI prompts** | AI modifies files across the entire monorepo | Explicit scope: "Only modify /apps/web/" |
| **Circular dependencies** | Build failures; confusing for AI | Packages flow one direction: shared → apps |
| **Mixing concerns in packages** | `shared` package becomes a dumping ground | Each package has one clear purpose |

---

## Key Takeaways

1. Default to single package. Add monorepo complexity only when concretely needed.
2. Share types, schemas, utilities, and config. Don't share business logic.
3. Explicitly scope AI changes to specific packages/apps.
4. pnpm workspaces for simple needs; Turborepo for caching and parallelism.
5. Packages flow one direction: shared → apps. Never circular.

---

## Cross-References

- **Depends on:** `frontend-architecture.md` — frontend as an app in the monorepo
- **Depends on:** `backend-architecture.md` — backend as an app in the monorepo
- **Applied by:** `git-workflow-strategy.md` — branch strategy for monorepos
