# Loading & Empty States

**Status:** Advisory  
**Scope:** Global  
**Token Tier:** Low (~1,200 tokens)  
**Last Updated:** 2026-05-24
**Cross-References:** `table-patterns.md`, `form-patterns.md`, `error-handling-philosophy.md`, `react-performance.md`

---

## Purpose

This guide defines patterns for handling loading, empty, and error states in the UI. Consistent handling of these states improves perceived performance, reduces user confusion, and ensures the application never appears "stuck" or "broken."

---

## State Machine

Every data-driven view has four possible states:

```
┌──────────┐    data arrives    ┌──────────┐
│ LOADING  │ ─────────────────► │  READY   │
└──────────┘                    └──────────┘
     │                                │
     │ request fails                  │ data is empty array
     ▼                                ▼
┌──────────┐                    ┌──────────┐
│  ERROR   │                    │  EMPTY   │
└──────────┘                    └──────────┘
```

**Rule:** Always handle all four states. Never let a component render "nothing" while data loads or after an error.

---

## Loading States

### Skeleton Screens (Preferred)

Use skeleton placeholders for initial data loads — not spinners:

```tsx
function MyListPage() {
  const { data, isLoading, error } = useMyData();

  if (isLoading) {
    return <TableSkeleton rows={5} columns={columns.length} />;
  }

  if (error) {
    return <ErrorAlert error={error} onRetry={refetch} />;
  }

  if (!data?.items?.length) {
    return <EmptyState message={t('common.noItems')} />;
  }

  return <StandardTable data={data.items} ... />;
}
```

**Skeleton rules:**
- Match the approximate layout of the loaded content (rows for tables, cards for grids).
- Use subtle animations to indicate activity (pulse/shimmer).
- Don't show skeletons for sub-second loads — only when fetch time is perceptible.

### When to Use Spinners

- **Button actions:** Show a spinner inside the button during save/submit (replace label or use `loading` prop).
- **Small sections:** A centered spinner for a small content area being refreshed.
- **Full-page transitions:** Only for navigation-level loading where the entire page is being replaced.

---

## Empty States

### Types of Empty

| Type | When | Message Example |
|---|---|---|
| **Fresh** | New feature with no data yet | "No programs yet. Create your first program to get started." |
| **Filtered** | Active filters yield no results | "No programs match your filters. Try adjusting your search criteria." |
| **Search** | Search query returns nothing | "No results found for 'xyz'. Try a different search term." |
| **Access-restricted** | User lacks permissions | "You don't have access to any items in this category." |

### Empty State Components

- Include a descriptive message (not just "No data").
- For "Fresh" states, include a call-to-action button: "Create your first program".
- For "Filtered" states, include a "Clear filters" link/button.
- Use an appropriate illustration or icon that matches the context.

```tsx
function EmptyState({ type, message, action }: EmptyStateProps) {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <EmptyIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
      {action && (
        <Button variant="contained" onClick={action.onClick} sx={{ mt: 2 }}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}
```

---

## Error States

### Error Alert Pattern

```tsx
function ErrorAlert({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {error.message || t('common.unexpectedError')}
    </Alert>
  );
}
```

**Rules:**
- Always show a human-readable error message.
- Always provide a "Retry" action when the error is potentially transient.
- Distinguish between: network errors ("Check your connection"), server errors ("Something went wrong"), and client errors ("Invalid input").

---

## Partial Data

In some cases, a view may have partial data:

- **Tabbed interfaces:** Load each tab's content independently. Show skeleton in inactive tabs, not a full-page spinner.
- **Dashboards:** Load each widget independently. Show skeleton/error per widget, not per page.
- **Optimistic updates:** Show the new state immediately, then revert on error with a notification.

---

## Common Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Full-page spinner for sub-second loads | Show nothing, or use a local skeleton for lists |
| "No data" for filtered empty | Distinguish "empty" from "no results" |
| Error without retry action | Add a retry button for transient failures |
| Blocking the whole page for one widget | Load widgets independently |
| Infinite spinner on error | Show an error with retry option |
| No empty state at all (blank page) | Always render something meaningful |

---

## Key Takeaways

1. **All four states, always** — loading, ready, empty, error.
2. **Skeleton over spinner for initial loads** — better perceived performance.
3. **Distinguish empty types** — fresh, filtered, search, access-restricted.
4. **Error + retry** — never leave the user stuck.
5. **Independent loading for dashboards** — one widget's error shouldn't block others.
6. **Empty state with CTA** — guide the user to the next action.

---

## Cross-References

- [Table Patterns](./table-patterns.md) — loading/empty/error states in tables
- [Form Patterns](./form-patterns.md) — save/submit loading states
- [Error Handling Philosophy](../02-engineering-practices/error-handling-philosophy.md) — error taxonomy
- [React Performance](../05-stack-guides/react/react-performance.md) — suspense and lazy loading
