---
status: "Normative"
scope: "Global"
tags: [router, react-router, createBrowserRouter, useBlocker]
---

# Router Architecture — React Router Data Router Standard

---

## Purpose

Define the mandatory React Router architecture pattern for all projects. The `<BrowserRouter>` component API is legacy — `createBrowserRouter` (data router API) is the standard. This guideline prevents custom anti-patterns like hand-rolled navigation blockers.

---

## Core Rule: Data Router Only

Use `createBrowserRouter` exclusively. NEVER use `<BrowserRouter>`.

```typescript
// CORRECT: Data router with createBrowserRouter
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'programs/:id', element: <ProgramDetail /> },
    ],
  },
]);

// WRONG: Legacy BrowserRouter
<BrowserRouter>
  <Routes>...</Routes>
</BrowserRouter>
```

**Why:** The data router API enables:
- Native `useBlocker` for navigation-blocking (unsaved forms)
- `useNavigation` for loading states
- Route loaders and actions for data fetching
- Type-safe route parameters

---

## Navigation Blocking: Use Native `useBlocker`

React Router's `useBlocker` hook (available only with `createBrowserRouter`) is the sole mechanism for blocking navigation. Custom workarounds like `useBrowserRouterBlocker` that detect navigation after commit and reverse it are **forbidden** — they cause route flash bugs and violate React Router's data flow.

```typescript
// CORRECT: Native useBlocker
const blocker = useBlocker(
  ({ currentLocation, nextLocation }) =>
    isDirty && currentLocation.pathname !== nextLocation.pathname
);

// WRONG: Custom blocker that pushes back after navigation
// This creates a visible route flash and breaks the back button.
```

---

## Lazy Loading

All route-level components MUST use `React.lazy()` or Vite's dynamic import:

```typescript
const ProgramDetail = lazy(() => import('./pages/ProgramDetail'));
```

Route config objects reference the lazy component. A `<Suspense>` wrapper with a loading skeleton is required at the layout level.

---

## Route Organization

- All route definitions in `src/App.tsx` (or a dedicated `src/router.tsx`)
- Route parameters typed via TypeScript generics or inferred from route config
- Protected routes via a wrapper component that checks auth, not inline checks in each page
- Wildcard `*` route for 404 handling

---

## Forbidden Patterns

| Anti-Pattern | Why It's Dangerous | Fix |
|---|---|---|
| **`<BrowserRouter>`** | Cannot use `useBlocker`, loaders, or actions | Use `createBrowserRouter` |
| **Custom navigation blocker** | Causes route flash; breaks browser history | Use native `useBlocker` |
| **Inline auth checks in every page** | Repeated logic; easy to forget | Auth guard wrapper component |
| **Eagerly loaded routes** | Large initial bundle | `React.lazy()` for all route components |

---

## Key Takeaways

1. Always use `createBrowserRouter` — never `<BrowserRouter>`.
2. Always use native `useBlocker` — never custom navigation-blocking workarounds.
3. Lazy-load all route-level components.
4. Centralize route definitions in one file.

---

## Cross-References

- **Governed by:** `frontend-architecture.md` — routing falls under frontend architecture
- **Extended by:** `react-architecture.md` — React-specific routing patterns
