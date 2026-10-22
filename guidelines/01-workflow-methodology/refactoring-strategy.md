---
status: "Normative"
scope: "Global"
tags: [refactoring, maintenance, technical-debt]
---

# Refactoring Strategy — Maintaining Coherence Over Time

---

AI codebases accumulate entropy faster than human ones: pattern drift, duplication, inconsistent abstraction, dead code, naming inconsistency. Refactoring is the maintenance cost of AI acceleration — schedule a pass after every 3–5 features.

## Directives

1. **Two refactor types:**
   - *Opportunistic* (during feature work): fix what you're touching — duplicated logic, confusing names, bloated functions. Only code already being modified; behavior preserved; committed separately from feature changes.
   - *Dedicated sessions* (standalone): after 3–5 features · file >300 lines (plan split) · ≥400 lines (record as debt; split before the NEXT feature touches it or in a scheduled pass — do not stall the current change) · same logic in 3+ places · naming drift confusing AI · before major features touching old code.
2. **Safety net first:** existing tests passing — in `vibe`, the smoke path is the safety net, and a refactor touching auth/payments/permissions escalates the slice to standard+ → commit rollback point → explicit scope (files to touch, files not to touch).
3. **Specific goals only:** "Extract validation from the 600-line component" ✓ · "Clean up the code" ✗.
4. **Incremental execution:** one concern at a time, never 20 files in one session. Refactoring prompt includes: scope lists (may/must-not modify) + rules (preserve behavior, no new functionality, no API signature changes, run the mode's verification after each change).
5. **Verify after each step:** the full suite green before proceeding in standard/guarded; in `vibe`, the smoke path plus every existing test. `agent-verification-loop.md` applies.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| "Refactor everything" mega-session | One concern per pass |
| Mixing refactor with feature changes | Separate commits |
| Refactoring without a safety net | Smoke run + existing tests first (escalate a critical-path refactor) |
| Vague goals ("modernize") | Specific measurable goal |

## Cross-References

`development-workflow.md` · `testing-patterns.md` · `file-organization.md` · `code-duplication-prevention.md`
