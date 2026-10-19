---
status: "Normative"
scope: "Global"
tags: [files, organization, modularity, limits]
---

# File Organization — Size Limits and Modularity

---

AI produces better output in small focused files and degrades in monolithic ones.

## The Rule

| Phase | Threshold | Why |
|---|---|---|
| Planning | ≤300 lines per file | Forces early decomposition (25% buffer) |
| Enforcement | ≤400 lines per file | Hard limit via ESLint `max-lines` |
| Post-implementation | >400 lines → split to the 400 lint bound before proceeding; at 400, record the <300 refactor as debt and split before the NEXT feature touches the file (or a scheduled pass) | Never stall the current change mid-slice; the hard 400 bound stays enforced by ESLint |

**Source code only** (.ts/.tsx/.js/.jsx/.css/…). Excluded: docs (.md), config (.json/.yaml), generated/code-gen output, declarative data files (routing tables, locale data, seeds), CI configs.

## Enforcement

```jsonc
"max-lines": ["error", { "max": 400, "skipBlankLines": true, "skipComments": true }]
```
Lint runs with `--max-warnings 0`; violations block CI.

## Exceptions

A file may exceed 400 lines ONLY with an inline `eslint-disable-next-line max-lines -- reason` comment AND that documented reason (the inline comment IS the record — no reviewer required). Valid: large union types, error-code catalogs, permission matrices. Invalid: "too busy to split", "it's one component", "the AI wrote it this way".

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

`frontend-architecture.md` · the `implementation-plan` skill
