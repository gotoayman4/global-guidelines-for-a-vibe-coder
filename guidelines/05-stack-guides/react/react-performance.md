---
status: "Normative"
scope: "Stack (React)"
tags: [react, performance, memo]
---

# React Performance — Optimization Patterns

---

## Directives

1. Memoization is opt-in, never default. Apply only when profiling shows the re-render/computation is expensive.
2. EVERY route-level component MUST be lazy-loaded (`React.lazy` + `Suspense`). Heavy below-fold components too.
3. Lists >100 items MUST be virtualized (`react-window` or MUI virtualization). Never flat `.map()` for large lists — AI generates this by default; reject it.
4. Move state down: state lives in the closest component that needs it.
5. No inline objects/arrays as props to memoized children — use stable module-level references or `useMemo`.
6. Tree-shakeable imports for all third-party libraries (`lodash/debounce`, not `lodash`). MUI named imports from root are tree-shakeable.
7. Dynamic `import()` for heavy rarely-used libraries (xlsx, charts).
8. Images: `loading="lazy"` + explicit width/height to prevent layout shift.
9. NEVER optimize without measurement first (React DevTools Profiler, Lighthouse). AI guesses wrong about what's slow.

---

## Canonical Patterns

Memoization usage:

```tsx
const UserCard = React.memo(({ user }: { user: User }) => <Card>{user.name}</Card>);
const sortedUsers = useMemo(() => [...users].sort(byName), [users]);
const handleSave = useCallback((data: UserData) => saveMutation.mutate(data), [saveMutation]);
```

Route-level splitting:

```tsx
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
<Suspense fallback={<PageSkeleton />}>
  <Routes>...</Routes>
</Suspense>
```

Virtualization:

```tsx
import { FixedSizeList } from 'react-window';
<FixedSizeList height={600} itemCount={items.length} itemSize={80} width="100%">
  {({ index, style }) => <div style={style}><ItemCard item={items[index]} /></div>}
</FixedSizeList>
```

---

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Memoizing everything | Profile first, memoize on evidence |
| No lazy loading | React.lazy for every route |
| Flat map for big lists | Virtualization >100 items |
| State too high in tree | Move state down |
| Inline objects as props | Stable references |
| Namespace imports of heavy libs | Tree-shakeable/dynamic imports |

---

## Cross-References

- **Depends on:** `react-architecture.md`, `performance-optimization.md`
