---
name: codebase-cleanup
description: On-demand structural cleanup for dead code, unused exports/dependencies, duplicated helpers across 2+ files, files exceeding 400 lines, and obsolete shims without changing behavior. Activate when asked to declutter a codebase, prune unused files/exports, extract duplicated utilities, or resolve accumulated structural debt. Triggers on clean up dead code, prune unused, codebase cleanup, trim bloated files.
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, cleanup, dead-code, duplication, maintenance
  appliesTo: any
---

# Skill: Codebase Cleanup

Delete dead code, consolidate duplicates across 2+ files, and split oversized modules safely while preserving runtime behavior. Use `refactoring` for restructuring live design patterns inside a module; use this skill for pruning and debt hygiene across files.

---

## Trigger

Activate when:
- Asked to declutter a repository, remove unused code/exports/dependencies, or pay down structural debt
- Multiple files carry duplicated helpers or exceed the 400-line ceiling (`file-organization.md`)
- Obsolete compatibility shims, superseded files, or orphan test fixtures remain after refactors

---

## Load Guidelines

1. `02-engineering-practices/file-organization.md` — 400-line ceiling and split timing
2. `02-engineering-practices/code-duplication-prevention.md` — Rule of 2+ duplication threshold
3. `01-workflow-methodology/refactoring-strategy.md` — Behavior preservation and rollback safety

---

## Workflow

1. **Confirm safety net & checkpoint:** Verify clean git state or commit a checkpoint (`checkpoint: pre-cleanup`); run the existing test suite and type-check first so baseline failures are separated from cleanup changes.
2. **Prove unused before deleting:** Search every reference across source, tests, routes, dynamic imports, scripts, and config files (`package.json`, manifests, hooks) before deleting a symbol, file, or dependency. Never assume an unimported file is unused if an entrypoint, reflection map, or CLI script loads it dynamically.
3. **Consolidate duplicates (2+ files):** Extract shared pure helpers into an existing canonical utility module rather than creating parallel wrapper files. Keep public behavior identical.
4. **Split oversized files (>400 lines):** Separate by coherent responsibility (types/constants, pure transforms, handlers/hooks), preserve existing public exports from the entry module when callers depend on them, and keep slices independently testable.
5. **Re-verify & report honestly:** Run type-check, lint, tests, and build after each logical increment. State deleted files/exports, extracted helpers, and any dynamically loaded paths intentionally retained.

---

## Anti-Patterns

- Deleting files or dependencies solely from zero static `import` matches without checking dynamic imports, scripts, configs, or manifest entries
- Mixing functional behavior changes or feature additions into a cleanup diff
- Deleting tests just because a helper moved instead of updating imports and keeping the behavioral contract green
- Running broad cleanup on an uncheckpointed dirty working tree

---

## Cross-References

- **Depends on:** `02-engineering-practices/file-organization.md`, `02-engineering-practices/code-duplication-prevention.md`, `01-workflow-methodology/refactoring-strategy.md`
- **Complements:** `refactoring` skill (structural design improvements inside active modules)
