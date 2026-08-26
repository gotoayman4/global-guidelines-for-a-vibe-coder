# File Organization — Size Limits and Modularity

**Status:** Normative
**Scope:** Global
**Token Tier:** Compact (~600 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `frontend-architecture.md`, `implementation-plan.skill.md`, `AGENTS.starter.md`

---

AI produces better output in small focused files and degrades in monolithic ones.

## The Rule

| Phase | Threshold | Why |
|---|---|---|
| Planning | ≤300 lines per file | Forces early decomposition (40% buffer) |
| Enforcement | ≤500 lines per file | Hard limit via ESLint `max-lines` |
| Post-implementation | >500 lines → REFACTOR immediately, verify before next task |

**Source code only** (.ts/.tsx/.js/.jsx/.css/…). Excluded: docs (.md), config (.json/.yaml), generated/code-gen output, declarative data files (routing tables, locale data, seeds), CI configs.

## Enforcement

```jsonc
"max-lines": ["error", { "max": 500, "skipBlankLines": true, "skipComments": true }]
```
Lint runs with `--max-warnings 0`; violations block CI.

## Exceptions

A file may exceed 500 lines ONLY with an inline `eslint-disable-next-line max-lines -- reason` comment AND PR approval. Valid: large union types, error-code catalogs, permission matrices. Invalid: "too busy to split", "it's one component", "the AI wrote it this way".

## When to Split

Multiple distinct visual sections → sub-components · business logic beside rendering → hook/service · multiple unrelated state concerns → separate modules · data fetching mixed with presentation → query hooks · single function >80 lines → smaller functions · plan estimate >300 lines → split during planning. **Split by responsibility, not by line count** — ten scattered 50-line files are not cohesion.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Splitting without cohesion | Responsibility-based splits |
| Barrel exports masking coupling | Real module boundaries |
| Two unrelated features in one file | One responsibility regardless of size |
| Silent eslint-disable | Documented reason required |

## Cross-References

`frontend-architecture.md` · `implementation-plan.skill.md`
