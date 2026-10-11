---
status: "Normative"
scope: "Stack (React)"
tags: [react, hooks, components]
---

# React Architecture — Component Patterns

---

## Directives

1. Functional components + hooks ONLY. No class components. No HOCs (except wrapping third-party APIs).
2. Components MUST NOT exceed 300 lines. Split: multiple visual sections → sub-components; business logic → custom hooks; multiple state concerns → sub-hooks.
3. ALL server state via React Query (TanStack Query). NEVER `useEffect` + `useState` + `fetch()` — reject this AI-default pattern consistently.
4. Every data-dependent component MUST handle all four states: loading, error, empty, success.
5. List keys: stable unique ID, never array index.
6. Context for truly global state only (auth, theme, locale). 2–3 components → props or composition instead.
7. Custom hooks MUST start with `use`. Handlers named `handle[Event]`.
8. Props and event handlers always typed. Never `any` — use `unknown` if truly unknown.

---

## Canonical Patterns

Component file order — imports (external → internal → types) → types → component (hooks → derived/handlers → early returns → render):

```tsx
export const UserProfile = ({ userId }: UserProfileProps) => {
  const { user, isLoading, error } = useUser(userId);
  if (isLoading) return <UserProfileSkeleton />;
  if (error) return <ErrorDisplay error={error} />;
  if (!user) return <NotFound message="User not found" />;
  return <ProfileCard user={user} />;
};
```

Server state hooks:

```tsx
const useUsers = (filters?: UserFilters) =>
  useQuery({ queryKey: ['users', filters], queryFn: () => api.getUsers(filters), staleTime: 5 * 60 * 1000 });

const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};
```

Four-state guard:

```tsx
if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorState error={error} onRetry={refetch} />;
if (!data || data.length === 0) return <EmptyState />;
return <DataDisplay data={data} />;
```

---

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Class components | Functional components + hooks |
| `fetch()` in useEffect | React Query |
| Index as key | Stable unique ID |
| Missing loading/error/empty states | Four-state pattern always |
| Prop drilling >3 levels | Context or composition |
| `any` types | Proper interfaces |

---

## Cross-References

- **Extended by:** `react-performance.md`, `react-testing.md`
- **Depends on:** `frontend-architecture.md`, `state-management.md`
