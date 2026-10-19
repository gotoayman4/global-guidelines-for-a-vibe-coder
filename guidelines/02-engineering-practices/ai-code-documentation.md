---
status: "Normative"
scope: "Global"
tags: [documentation, comments, ai-context, icdc]
---

# AI-Optimized Code Documentation — Comments for the Next AI Session

---

Code is written by AI and read by AI. Inline comments are **context persistence** — they replace the session memory lost between conversations. Write comments that let a brand-new AI agent understand intent with zero history.

## Directives

1. **A file opens with a file-level header when its purpose or constraints are not obvious from its name:** purpose (1–2 sentences), key constraints affecting modification, bilingual/RTL notes, related files. A trivial file whose name says everything needs no header.
2. **ICDC framework for non-trivial code:**
   - `INTENT:` what this code accomplishes (always for non-trivial functions; skip trivial getters/setters)
   - `CONSTRAINT:` business rules / security / performance limits the code must not violate (when not obvious from code)
   - `DECISION:` why this approach over the seemingly simpler alternative (when the obvious path was intentionally rejected)
   - `CAVEAT:` surprising behaviors, edge cases, mutation warnings, intentional-looking-bug-is-not
3. **Additional prefixes** for scannability: `SECURITY:` · `PERFORMANCE:` · `RTL:` (logical-properties notes).
4. **JSDoc/TSDoc on a public export when its contract is not inferable from the signature** (functions, hooks, components, API handlers): parameters (name + meaning, not just type), return shape/meaning, side effects. A self-describing signature needs no restatement. Internal single-file helpers use INTENT comments instead.
5. **Never restate what the code does** — AI reads code. Comments add only CONTEXT the code cannot express (`// increment by 1` is forbidden noise).
6. **TODO/FIXME MUST reference a tracker issue:** `// TODO(ISSUE-123): …` or throw a descriptive error. Silent TODOs are invisible debt.
7. **Delete commented-out code** — Git preserves history; dead code misleads the next session.
8. **Stale comments worse than none:** update comments when behavior changes.
9. **If a comment is needed to explain WHAT, refactor first.** Comments explain WHY and WHY NOT; important rules belong in code enforcement AND comments.

## Canonical Patterns

```typescript
// INTENT: Calculate total price including VAT at country-specific rate.
// CONSTRAINT: Password hashed with bcrypt (cost 12); plain text NEVER in logs/responses.
// DECISION: Optimistic concurrency (last-write-wins) — <50 users, locking not justified (ADR-005).
// CAVEAT: Empty string = "no filter" (UI clears search box), NOT "search empty name".

/**
 * Calculate total price including VAT at the country-specific rate.
 * @param price - Base price before tax (must be >= 0)
 * @param account - Account with taxExempt flag and countryCode
 * @returns Total incl. VAT, or 0 if tax-exempt
 * @throws ValidationError if price is negative
 */
```

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Restating code | Context-only comments |
| No comments on complex logic | ICDC framework |
| Silent TODOs | `TODO(ISSUE-123)` format |
| Commented-out code | Delete; Git remembers |
| Stale comments | Update with behavior |
| Rule in comment but not enforced | Validate in code + comment |

## Cross-References

`documentation-strategy.md` · `ai-collaboration-mindset.md` · `typescript-conventions.md` · `context-management-strategy.md`
