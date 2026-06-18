# Code Duplication Prevention — AI-Assisted Deduplication

**Status:** Normative
**Scope:** Global
**Token Tier:** Compact (~600 tokens)
**Last Updated:** 2026-06-18
**Cross-References:** `file-organization.md`, `ai-collaboration-mindset.md`

---

## Purpose

Define rules and patterns for detecting and eliminating duplicated logic in AI-assisted development. AI frequently produces the same validation, mapping, or transformation logic across multiple files because it treats each file independently. This guideline instructs AI to proactively detect duplication — not defer it to a refactoring pass.

---

## Core Principle: Deduplicate in the Same Iteration

When AI generates code, it must check: does this logic already exist elsewhere in the codebase? If the same mapping, validation, or transformation pattern appears in 2+ files, extract it to a shared utility **immediately** — do not wait for a refactoring pass. Duplication left in place becomes invisible to subsequent AI sessions (context amnesia).

---

## Common Duplication Patterns AI Introduces

### 1. Mapping / Lookup Tables

The same `Record<X, Y>` mapping copied across files. Common examples:
- Role code normalizers (UPPERCASE → lowercase)
- Status label maps
- Enum-to-display-name converters

**Fix:** Extract to a single exported `const` or `function` in a shared constants or utils file. Export a normalized lookup function with exhaustive tests.

### 2. Validation Logic

The same regex, length check, or format validator duplicated in multiple forms, DTOs, or components.

**Fix:** Extract to `src/utils/validation.ts` or equivalent. Every form imports from one source.

### 3. API Response Shaping

The same `map()` or `reduce()` to reshape API responses into UI-friendly objects.

**Fix:** Extract to a service-layer transformer function.

### 4. Enum Value Sets

The same `Set<string>` or `as const` array of valid enum values maintained in two separate files. Example: `VALID_ROLES` in both backend chain-config-validation and frontend AuthContext.

**Fix:** Single source of truth. If backend and frontend must both have it, document the canonical source and add a test that asserts both sets match.

---

## Detection Rules for AI

During every code generation session, the AI MUST:

1. **Before writing a new mapping/lookup:** Search for existing functions or constants that perform the same mapping.
2. **Before writing validation logic:** Check `src/utils/` and `src/services/` for existing validators.
3. **Before defining enums/const arrays:** Check `src/constants/` for existing definitions.
4. **When modifying a file:** Scan the full file for logic that could be extracted to a shared location while you're touching it.

If duplication is found:
- **Same file:** Collapse immediately.
- **Same module/directory:** Extract to a shared file in that directory.
- **Cross-module:** Extract to `src/utils/` or `src/constants/` and import in both places.

---

## When Duplication Is Acceptable

Duplication is acceptable ONLY when:
- **Different domains:** The logic appears identical but serves fundamentally different business rules (document the difference in a comment).
- **Stabilization layer:** Backend and frontend each need a copy for type safety at compile time (e.g., enum values must exist in both TypeScript and SQL). Document the canonical source.
- **Temporary parallelism:** Two features under active development that will converge. Mark with a dated ADR reference and a plan to deduplicate.

---

## Key Takeaways

1. AI MUST proactively detect duplication across files during every session.
2. When the same logic appears in 2+ files, extract to a shared utility immediately.
3. Do not defer deduplication to a later refactoring pass.
4. Document the canonical source when duplication is unavoidable (backend + frontend enum mirrors).

---

## Cross-References

- **Governed by:** `file-organization.md` — file size limits and modularity rules
- **Applied by:** `ai-collaboration-mindset.md` — the foundation for AI judgment
