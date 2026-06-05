# Table Patterns

**Status:** Normative  
**Scope:** Global  
**Token Tier:** Low (~1,500 tokens)  
**Last Updated:** 2026-05-24
**Cross-References:** `form-patterns.md`, `loading-and-empty-states.md`, `notification-patterns.md`, `api-design-standards.md`, `react-performance.md`

---

## Purpose

This guide defines the standard table pattern for all data-list views in the application. It establishes a consistent API, column definition format, pagination strategy, loading/empty/error states, and accessibility requirements — so every table behaves predictably.

---

## Standard Table Component

All tabular data views must use a shared standard table component. Never use raw MUI `<Table>`, `<TableHead>`, `<TableBody>`, `<TableRow>`, or `<TableCell>` for list pages.

### When to Use

Use the standard table whenever you need to display data with:
- Column headers
- Pagination
- Sortable columns
- Loading / empty / error states

This includes: entity lists, search results, analytics tables, workflow queues, template lists.

---

## Column Definition

Each column is defined via a typed column definition object:

```typescript
const columns: ColumnDef<MyRow>[] = [
  {
    key: 'name',              // Unique column key, used for sort tracking
    label: t('columns.name'), // Pre-translated display label
    sortable: true,           // Enables sort toggle on header click
    width: 200,               // Optional fixed CSS width
    align: 'left',            // Optional alignment ('left' | 'center' | 'right')
    renderCell: (row) => row.name, // Required cell renderer
  },
];
```

### Column Definition Rules

- `key` must be unique within the table.
- `label` must be pre-translated via `t()` — never hardcoded strings.
- Use `sortable: true` only for columns backed by the API sort parameter.
- `renderCell` receives the full row — use it for formatted values, badges, links, or action buttons.

---

## Required Props

| Prop | Type | Description |
|---|---|---|
| `columns` | `ColumnDef<T>[]` | Column definitions |
| `rows` | `T[]` | Data rows |
| `getRowKey` | `(row: T) => string` | Unique key per row |
| `totalCount` | `number` | Total record count for pagination |
| `page` | `number` | 0-based page index |
| `pageSize` | `number` | Rows per page |
| `onPageChange` | `(page: number) => void` | Page change handler |
| `onPageSizeChange` | `(size: number) => void` | Page size change handler |

---

## Optional Props

| Prop | Description |
|---|---|
| `loading` | Shows skeleton rows while data loads |
| `error` | Shows error alert with retry option |
| `sortColumn` | Active sort column key |
| `sortDir` | `'asc'` or `'desc'` |
| `onSortChange` | `(column: string, dir: string) => void` |
| `onRowClick` | `(row: T) => void` — makes rows clickable |
| `emptyMessage` | Custom empty-state text (defaults to translated "No data") |
| `ariaLabel` | Accessibility label for the table |
| `pageSizeOptions` | Array of page size options, e.g. `[10, 25, 50, 100]` |
| `stickyHeader` | Whether header sticks on scroll (default `true`) |
| `maxHeight` | CSS max-height for scrollable area |

---

## States

### Loading

- Show **skeleton rows** (not a spinner) during initial load.
- Skeleton should match the column count and approximate layout.

### Empty

- Show a centered empty-state message with an optional illustration.
- Provide a descriptive message: "No programs found" not "No data".

### Error

- Show an error alert with the error message.
- Provide a "Retry" button that re-triggers the data fetch.

### No Results (Filtered)

- Distinguish from empty: "No results match your filters" vs "No items exist yet".
- Offer a "Clear filters" action.

---

## Pagination

- Use **server-side pagination** — API returns `{ data, pagination: { page, pageSize, totalCount } }`.
- Standard page size options: `[10, 25, 50, 100]`. Default: `25`.
- Page state should be in the URL query params for shareable/bookmarkable URLs.

---

## Sorting

- Click column header to toggle: `asc` → `desc` → none.
- Pass sort state to the API: `?sort=name&order=asc`.
- Only one column sorted at a time (unless the API supports multi-column sort).

---

## Integration Pattern

Combine the standard table with the page header component:

```tsx
function MyListPage() {
  const { data, isLoading, error } = useMyData();

  return (
    <Box>
      <PageHeader icon={ListIcon} title={t('page.title')} subtitle={t('page.subtitle')} />
      <StandardTable
        columns={columns}
        rows={data?.items ?? []}
        getRowKey={(r) => r.id}
        totalCount={data?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        loading={isLoading}
        error={error}
        sortColumn={sortColumn}
        sortDir={sortDir}
        onSortChange={handleSortChange}
      />
    </Box>
  );
}
```

---

## Design Constraints

- Uses only theme tokens (`theme.palette.*`, `theme.palette.divider`) — never hardcoded colors.
- Works correctly in both light and dark modes.
- Works correctly in both RTL and LTR directions.
- Table is responsive: uses `overflow-x: auto` as small-screen fallback.

---

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Raw MUI `<Table>` components | Use the standard table component |
| Client-side pagination for API data | Use server-side pagination |
| Hardcoded column labels | Use `t()` i18n keys |
| No loading state | Show skeleton rows |
| No empty state message | Show descriptive empty state |
| Sorting without API integration | Pass sort params to API |
| Duplicate table logic across pages | Use the shared standard table |

---

## Key Takeaways

1. **One table component for all list views** — consistency, not duplication.
2. **Column definitions as data** — declarative, type-safe, testable.
3. **Server-side pagination & sorting** — don't load all data client-side.
4. **Three states always handled**: loading (skeleton), empty (message), error (alert + retry).
5. **Theme tokens only** — dark mode and RTL work automatically.
6. **Page state in URL params** — shareable, bookmarkable, back-button-friendly.

---

## Cross-References

- [Form Patterns](./form-patterns.md) — editing individual rows via dialogs
- [Loading & Empty States](./loading-and-empty-states.md) — state pattern details
- [Notification Patterns](./notification-patterns.md) — success/error feedback after row actions
- [API Design Standards](../../04-architecture/api-design-standards.md) — pagination envelope
- [React Performance](../../05-stack-guides/react/react-performance.md) — virtualization for large datasets
