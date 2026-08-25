# React Performance — Optimization Patterns

**Status:** Normative
**Scope:** Stack (React)
**Token Tier:** Full (~2,000 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `react-architecture.md`, `performance-optimization.md`

---

## Purpose

Define React-specific performance optimization patterns. AI generates components that re-render unnecessarily, render large lists without virtualization, and load heavy dependencies synchronously. This document provides the fixes.

---

## Memoization

### React.memo

Use when a component re-renders with the same props:

```tsx
const UserCard = React.memo(({ user }: { user: User }) => {
  return <Card>{user.name}</Card>;
});
```

**When to use:** Component renders often, props rarely change, render is non-trivial.
**When NOT to use:** Component always gets new props, render is trivial (a few divs).

### useMemo

Cache expensive computations:

```tsx
const sortedUsers = useMemo(
  () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
  [users]
);
```

**When to use:** Computation is expensive (sorting large arrays, filtering, deriving complex data).
**When NOT to use:** Simple arithmetic, string concatenation, creating objects/arrays from primitives.

### useCallback

Stabilize function references for memoized children:

```tsx
const handleSave = useCallback((data: UserData) => {
  saveMutation.mutate(data);
}, [saveMutation]);
```

**When to use:** Function passed to `React.memo` child, function in dependency array of expensive effect.
**When NOT to use:** Function passed to native HTML elements (`onClick` on `<button>`), inline handlers in non-memoized components.

---

## Code Splitting and Lazy Loading

### Route-Level Splitting

```tsx
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));

const App = () => (
  <Suspense fallback={<PageSkeleton />}>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  </Suspense>
);
```

**Rule:** Every route-level component MUST be lazy-loaded. Bundle size grows quickly with AI-generated code.

### Component-Level Splitting

For heavy components not needed on initial render:

```tsx
const HeavyChart = React.lazy(() => import('./HeavyChart'));

{showChart && (
  <Suspense fallback={<ChartSkeleton />}>
    <HeavyChart data={data} />
  </Suspense>
)}
```

---

## List Virtualization

For lists exceeding 100 items, use virtualization:

```tsx
import { FixedSizeList } from 'react-window';

const VirtualizedList = ({ items }: { items: Item[] }) => (
  <FixedSizeList
    height={600}
    itemCount={items.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <ItemCard item={items[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

Or use MUI's built-in virtualization for MUI projects.

**Rule:** AI generates flat `.map()` for all lists regardless of size. When list items exceed 100, demand virtualization.

---

## Image Optimization

```tsx
// Lazy load images
<img src={url} loading="lazy" alt={description} />

// Specify dimensions to prevent layout shift
<img src={url} width={300} height={200} alt={description} />
```

---

## Bundle Size Awareness

### Tree-Shakeable Imports

```tsx
// BAD: Imports entire library (non-tree-shakeable)
import _ from 'lodash';

// GOOD: Modular imports for tree-shaking
import debounce from 'lodash/debounce';

// MUI v5+ supports tree-shaking with named imports from root
import { Button, TextField, Dialog } from '@mui/material';
```

### Dynamic Imports for Heavy Libraries

```tsx
// Heavy library only loaded when needed
const handleExport = async () => {
  const XLSX = await import('xlsx');
  XLSX.writeFile(workbook, 'export.xlsx');
};
```

---

## Preventing Unnecessary Re-Renders

### Move State Down

State should live as close as possible to where it's used:

```tsx
// BAD: State in parent causes all children to re-render
const Parent = () => {
  const [count, setCount] = useState(0);
  return (
    <>
      <SlowComponent />     {/* Re-renders on every count change */}
      <Counter count={count} onChange={setCount} />
    </>
  );
};

// GOOD: State isolated to the component that needs it
const Parent = () => (
  <>
    <SlowComponent />
    <Counter />  {/* Owns its own count state */}
  </>
);
```

### Avoid Inline Objects/Arrays as Props

```tsx
// BAD: New object reference on every render → memoized child re-renders
<Chart config={{ type: 'line', animated: true }} data={data} />

// GOOD: Stable reference (defined outside component or memoized)
const CHART_CONFIG = { type: 'line', animated: true } as const;
<Chart config={CHART_CONFIG} data={data} />
```

---

## Performance Measurement

Before optimizing, measure:
- **React DevTools Profiler** — identify which components re-render
- **Lighthouse** — overall performance score, LCP, FCP
- **Chrome Performance tab** — flame charts for render bottlenecks

**Rule:** Never optimize without measurement data. AI frequently optimizes components that aren't slow.

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Memoizing everything** | Added complexity with no benefit | Memoize only when profiling shows benefit |
| **No lazy loading** | Large initial bundle; slow first load | React.lazy for every route |
| **Flat map for infinite lists** | Browser crash with 10K items | Virtualization for lists >100 items |
| **State too high in tree** | Entire subtree re-renders on state change | Move state down |
| **Inline objects as props** | Memoized children re-render every time | Stable references or useMemo |
| **Import * from heavy libraries** | Large bundle; slow load | Tree-shakeable or dynamic imports |

---

## Key Takeaways

1. Memoization is a tool, not a default. Profile before memoizing.
2. React.lazy for every route-level component.
3. Virtualization for lists >100 items.
4. Move state down to prevent unnecessary re-renders.
5. Tree-shakeable imports for all third-party libraries.
6. Measure before optimizing. AI guesses wrong about what's slow.

---

## Cross-References

- **Depends on:** `react-architecture.md` — architectural foundation
- **Depends on:** `performance-optimization.md` — general performance philosophy
- **Extended by:** `react-testing.md` — test performance regressions
