# File Organization — Size Limits and Modularity

**Status:** Normative
**Scope:** Global
**Token Tier:** Compact (~1,200 tokens)
**Last Updated:** 2026-06-05
**Cross-References:** `04-architecture/frontend-architecture.md`, `global-configs/skills/implementation-plan.skill.md`, `global-configs/templates/AGENTS.starter.md`

---

## Purpose

Define file size limits and modularity rules for all source code. AI agents produce better output in focused, small files and degrade significantly in large, monolithic files. This rule establishes a dual-threshold system: plan for 400 lines during implementation, enforce 500 lines as a hard limit.

---

## The Rule

### Dual Threshold

| Phase | Threshold | Why |
|---|---|---|
| **Planning** | ≤400 lines per file | Forces decomposition early; 20% buffer before hard limit |
| **Enforcement** | ≤500 lines per file | Hard limit checked by ESLint; accounts for reasonable overshoot |

**Plan for 400, hard limit 500.** If a task's estimated file sizes exceed 400 lines per file in the plan, the file should be split into smaller modules before implementation begins.

### Scope — Source Code Only

This rule applies to **source code files** only:

| Applies | Does NOT apply |
|---|---|
| `.ts`, `.tsx`, `.js`, `.jsx` | `.md`, `.mdx` — documentation and prose |
| `.css`, `.scss`, `.less` | `.json`, `.yaml`, `.toml`, `.env.*` — configuration |
| `.vue`, `.svelte` | Generated/code-gen output (migrations, GraphQL types, OpenAPI clients, proto stubs) |
| Service/worker files | Data/declarative files (routing tables, permission maps, locale data, seed files) |
| | CI/CD configs (`.github/workflows/*.yml`, `Dockerfile`, `Makefile`) |
| | Test fixture/factory files with primarily declarative data |

---

## ESLint Enforcement

Add the following rule to the project's ESLint configuration during setup:

```jsonc
{
  "rules": {
    "max-lines": ["error", {
      "max": 500,
      "skipBlankLines": true,
      "skipComments": true
    }],
    "max-lines-per-function": ["warn", 80]
  }
}
```

- `max-lines` at error level — blocks builds and CI
- `skipBlankLines` + `skipComments` — counts only actual code lines, not formatting whitespace or documentation
- `max-lines-per-function` at warn level — encourages small functions without blocking delivery

**CI integration:** The project's `npm run lint` command MUST include `--max-warnings 0` or equivalent to ensure warnings are also addressed before merge.

---

## Exceptions

### File-Type Exclusions (no limit)

The rule does not apply to the file types listed in the Scope table above. These are excluded by ESLint's natural file targeting and need no explicit configuration.

### Justified Code Exceptions

A code file may exceed 500 lines only when documentation, configuration, or declarative data inflates the count AND logic is minimal. Each exception requires:

1. An inline `eslint-disable` comment with a documented reason
2. Review approval during PR

```typescript
// eslint-disable-next-line max-lines -- reason: union type definitions (600+ variants)
export type SupportedLocale =
  | 'en-US'
  | 'ar-SA'
  // ... 600+ locale codes
```

**Valid reasons:**
- Union type definitions with many variants
- Error code catalogs (error code → message mappings)
- Permission/role matrix definitions
- Complex regular expression patterns with embedded documentation

**Invalid reasons (will be rejected):**
- "Too busy to split" — lazy, not legitimate
- "It's just one component" — components are the #1 source of monolithic files
- "The AI wrote it this way" — AI defaults to monolithic; override it
- No documented reason at all

---

## When to Split

Split a file when any of these conditions are true:

| Condition | Action |
|---|---|
| Component has multiple distinct visual sections | Extract sub-components |
| File contains business logic alongside rendering | Extract to hook or service |
| File handles multiple unrelated state concerns | Extract state machine or separate module |
| File mixes data fetching with presentation | Extract data layer (query/mutation hooks) |
| Estimated plan exceeds 400 lines for the file | Split during planning, not during implementation |
| A single function exceeds 80 lines | Refactor into smaller functions |

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Splitting without cohesion** | 10 files of 50 lines each, but scattered responsibility | Split by responsibility, not by line count |
| **Barrel exports that mask poor structure** | `index.ts` re-exports everything; files are technically small but coupled | Split by module boundary, not file mechanics |
| **Two unrelated features in one file** | "Both are under 400 lines so they can stay together" | One file = one responsibility regardless of size |
| **Silent eslint-disable** | `// eslint-disable-next-line max-lines` with no reason | Every disable must document why |
| **Planning without size awareness** | "Task 1.1: implement checkout" — but no file boundaries specified | Plans must list files with estimated line counts |

---

## Key Takeaways

1. Dual threshold: plan for 400 lines, enforce 500 lines via ESLint `max-lines` rule.
2. Excluded file types: `.md`, config, generated code, data files, CI configs — no limit.
3. Code exceptions allowed ONLY with `eslint-disable` + documented reason reviewed in PR.
4. ESLint config: `max-lines: ["error", { max: 500, skipBlankLines: true, skipComments: true }]`.
5. Add `max-lines` to ESLint during project setup (see `first-project-setup.skill.md`).
6. Split by responsibility, not line count. Small files with scattered concerns are not an improvement.
7. The 500-line limit is per-file, not per-module. A module can span multiple files.

---

## Cross-References

- **Extended by:** `04-architecture/frontend-architecture.md` — component-level split guidance
- **Applied by:** `global-configs/skills/implementation-plan.skill.md` — planning-phase file size estimation
- **Applied by:** `global-configs/skills/first-project-setup.skill.md` — ESLint configuration during project bootstrap
- **Extracted to:** `global-configs/templates/AGENTS.starter.md` — compact rule for project steering files
- **Governed by:** `08-governance/ai-governance-framework.md` — authority hierarchy and conflict resolution
