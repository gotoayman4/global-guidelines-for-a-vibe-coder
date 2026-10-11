---
status: "Advisory"
scope: "Global"
tags: [loading, empty, ux]
---

# Loading & Empty States

---

Every data-driven view has four states: LOADING → READY, with ERROR and EMPTY branches. All four MUST be handled — never render "nothing."

## Directives

1. **Skeletons over spinners for initial loads** — match the loaded layout (rows for tables, cards for grids) with subtle pulse/shimmer. No skeletons for sub-second loads.
2. **Spinners only for:** button actions during save/submit (inline `loading` state), small section refreshes, full-page navigation transitions.
3. **Empty states are typed — distinguish them:**
   | Type | Message example |
   |---|---|
   | Fresh (no data yet) | "No programs yet. Create your first program." + CTA button |
   | Filtered | "No programs match your filters." + Clear filters action |
   | Search miss | "No results found for 'xyz'." |
   | Access-restricted | "You don't have access to this category." |
4. **Error states:** human-readable message + Retry for transient failures; distinguish network ("check connection") vs server vs client errors. Never an infinite spinner.
5. **Partial data loads independently:** tabs and dashboard widgets load per-section with their own skeleton/error — one widget's failure never blocks the page. Optimistic updates show new state immediately and revert on error with a notification.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Full-page spinner for sub-second load | Nothing, or local skeleton |
| "No data" for filtered empty | Distinguish empty vs no-results |
| Error without retry | Retry button for transient errors |
| One widget blocking the page | Independent widget loading |

## Cross-References

`table-patterns.md` · `form-patterns.md` · `error-handling-philosophy.md`
