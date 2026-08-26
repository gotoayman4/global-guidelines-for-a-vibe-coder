# Table Patterns

**Status:** Normative
**Scope:** Global
**Token Tier:** Low (~700 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `loading-and-empty-states.md`, `api-design-standards.md`, `react-performance.md`

---

All tabular data views use ONE shared standard table component — never raw `<Table>`/`<TableRow>` primitives for list pages. Applies to entity lists, search results, analytics, workflow queues.

## Directives

1. **Declarative typed column definitions:**
   ```typescript
   const columns: ColumnDef<MyRow>[] = [{
     key: 'name',               // unique; sort tracking
     label: t('columns.name'),  // pre-translated via i18n — never hardcoded
     sortable: true,            // only if backed by API sort param
     renderCell: (row) => row.name,
   }];
   ```
2. **Server-side pagination and sorting always** — API returns `{ data, pagination: { page, pageSize, totalCount } }`; sort state passed as `?sort=name&order=asc`; one sorted column at a time by default. Page state lives in URL query params (shareable, back-button friendly). Page sizes `[10, 25, 50, 100]`, default 25.
3. **Four states mandatory:** loading → skeleton rows matching column layout (not a spinner) · empty → descriptive centered message ("No programs found", not "No data") · filtered-empty → distinct message + "Clear filters" action · error → alert + Retry re-triggering fetch.
4. **Required props:** columns, rows, getRowKey (unique per row), totalCount, page, pageSize, onPageChange, onPageSizeChange.
5. **Design constraints:** theme tokens only (works in light/dark automatically) · correct in RTL and LTR · responsive via `overflow-x: auto` fallback · sticky header default.
6. **Integration:** combine with PageHeader; large datasets virtualize (see `react-performance.md`).

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Raw MUI Table components | Shared standard table |
| Client-side pagination of API data | Server-side |
| Hardcoded column labels | i18n keys |
| Missing loading/empty/error states | Skeleton + messages + retry |
| Duplicate table logic across pages | One shared component |

## Cross-References

`form-patterns.md` · `loading-and-empty-states.md` · `notification-patterns.md` · `../04-architecture/api-design-standards.md`
