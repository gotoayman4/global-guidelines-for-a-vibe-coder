---
status: "Normative"
scope: "Global"
tags: [state, caching, react]
---

# State Management — Managing Application State with AI

---

AI over-uses global state, puts server data in client stores, and hand-rolls form state. Right tool per state type:

## Directives

1. **Four state types, four tools:**
   | Type | Examples | Tool |
   |---|---|---|
   | Server state | lists, records, order history | React Query / TanStack Query |
   | Local UI state | modal open, tab selection | `useState` / `useReducer` |
   | Global UI state | theme, locale, auth | Context / Zustand (sparingly) |
   | Form state | multi-step data, validation | React Hook Form + zodResolver |

2. **Server state NEVER in Redux/Zustand/Context.** AI does this by default — it creates stale-data and cache-invalidation bugs.
3. **React Query pattern per resource:** `useQuery({ queryKey: ['entity', params], queryFn })` with sensible `staleTime`; mutations invalidate via `queryClient.invalidateQueries`.
4. **Query key convention:** raw tuples only — `['users', filters] as const`. Never stringified JSON or path strings; centralize keys in a shared constants file.
5. **Default to local state.** Lift to global ONLY when: multiple unrelated components need it · persists across navigation · cross-cutting concern (auth/theme/locale). >3 global Context providers = overuse — audit.
6. **Form state in a library** (`useForm` + `zodResolver`) — never hand-rolled `useState` chains for fields/validation/dirty tracking.
7. **One source of truth per state type** — the same user object must not live in React Query AND Context AND local state simultaneously.

## Decision Flow

```
From the server?                    → React Query
Needed by multiple unrelated comps? → cross-cutting? Context/Zustand : reconsider local
Form state?                         → React Hook Form
Otherwise                           → useState/useReducer
```

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Server data in Redux | React Query |
| Everything global | Local default; lift on evidence |
| Prop drilling >3 levels | Context or composition |
| Custom form state management | React Hook Form |
| Multiple sources of truth | One per state type |

## Cross-References

`frontend-architecture.md` · `react-architecture.md` · `form-patterns.md`
