# React Architecture — Component Patterns and Best Practices

**Status:** Normative
**Scope:** Stack (React)
**Token Tier:** Full (~2,500 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `frontend-architecture.md`, `state-management.md`

---

## Purpose

Define React-specific architectural patterns optimized for AI-assisted development. These patterns ensure AI generates consistent, maintainable, and performant React code.

---

## Component Architecture

### Functional Components Only

**Rule:** Use functional components with hooks exclusively. No class components. No HOCs (Higher-Order Components) unless wrapping a third-party API.

```tsx
// ALWAYS:
const UserProfile = ({ userId }: { userId: string }) => {
  const { user, isLoading } = useUser(userId);
  if (isLoading) return <Skeleton />;
  return <ProfileCard user={user} />;
};

// NEVER:
class UserProfile extends React.Component { ... }
```

### Component Size Limit

**Rule:** Components MUST NOT exceed 300 lines. Split at this boundary:
- Multiple distinct visual sections → extract sub-components
- Contains business logic → extract to custom hooks
- Multiple state concerns → extract state machines or sub-hooks

### Component File Structure

```tsx
// 1. Imports (external → internal → types → styles)
import { useState } from 'react';
import { Button, Input } from '@mui/material';
import { useUser } from '@/hooks/useUser';
import type { User } from '@/types/user';

// 2. Types (if not in separate file)
interface UserProfileProps { userId: string; }

// 3. Component
export const UserProfile = ({ userId }: UserProfileProps) => {
  // 3a. Hooks (state, effects, custom hooks)
  const { user, isLoading, error } = useUser(userId);
  const [isEditing, setIsEditing] = useState(false);
  
  // 3b. Derived state / handlers
  const handleSave = () => { ... };
  
  // 3c. Conditional rendering
  if (isLoading) return <UserProfileSkeleton />;
  if (error) return <ErrorDisplay error={error} />;
  if (!user) return <NotFound message="User not found" />;
  
  // 3d. Main render
  return ( ... );
};
```

---

## Hooks Patterns

### Custom Hook Naming

All custom hooks MUST start with `use`:
- `useAuth()` — authentication state
- `useUser(id)` — fetch and manage a user resource
- `useDebounce(value, delay)` — debounced value
- `useLocalStorage(key, initialValue)` — persisted state

### Data Fetching Hooks

Use React Query (TanStack Query) for ALL server state:

```tsx
const useUsers = (filters?: UserFilters) => {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => api.getUsers(filters),
    staleTime: 5 * 60 * 1000,
  });
};

const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
};
```

**Never:** `useEffect` + `useState` + `fetch()` for data fetching. This pattern is what AI generates by default — reject it consistently.

---

## Rendering Patterns

### Always Handle Four States

Every data-dependent component MUST handle: loading, error, empty, success.

```tsx
if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorState error={error} onRetry={refetch} />;
if (!data || data.length === 0) return <EmptyState />;
return <DataDisplay data={data} />;
```

### Conditional Rendering

Use ternary for simple conditions, early returns for complex state:

```tsx
// Simple: ternary
{isLoggedIn ? <Dashboard /> : <Login />}

// Complex: early return pattern (preferred for readability)
if (isLoading) return <Skeleton />;
if (error) return <Error />;
return <Content />;
```

### Lists and Keys

```tsx
// Key MUST be stable, unique identifier — never index
{users.map((user) => (
  <UserCard key={user.id} user={user} />
))}
```

---

## Performance Patterns

See `react-performance.md` for full details. Quick reference:

- `React.memo` for components that re-render with same props
- `useMemo` for expensive computations
- `useCallback` for functions passed to memoized children
- Lazy loading for route-level components: `React.lazy(() => import('./Page'))`
- Virtualization for lists >100 items: `react-window` or MUI's virtualization

**Rule:** Memoization is a performance optimization, not a default. Apply when profiling shows re-renders are expensive.

---

## Event Handling

```tsx
// Handler naming: handle[Event]
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // ...
};

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setName(e.target.value);
};

// Inline for simple cases, extracted for complex logic
<button onClick={handleSubmit}>Submit</button>
<button onClick={() => setIsOpen(true)}>Open</button>
```

---

## Context Usage

**Rule:** Context is for truly global state ONLY (auth, theme, locale). Don't use Context for state that only 2-3 components need.

```tsx
// Good: Auth context
const AuthContext = createContext<AuthState | null>(null);
export const useAuth = () => useContext(AuthContext);

// Bad: Context for form state that only 2 components use
// Use prop drilling or composition instead
```

---

## TypeScript Integration

```tsx
// Props always typed
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

// Events typed
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... };

// Children typed
interface LayoutProps {
  children: React.ReactNode;
}

// Never use `any` — use `unknown` if truly unknown
```

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Class components** | Verbose, AI generates outdated patterns | Functional components + hooks |
| **fetch() in useEffect** | No caching, race conditions, stale data | React Query |
| **Inline complex handlers** | Unreadable JSX | Extract to named handlers |
| **Index as key** | Reordering bugs, performance issues | Stable unique ID as key |
| **Missing loading/error states** | Blank screens, crashes | Four-state pattern always |
| **Prop drilling >3 levels** | Fragile, hard for AI to trace | Context or composition |
| **any types** | Loses all type safety | Proper TypeScript interfaces |

---

## Key Takeaways

1. Functional components + hooks exclusively. No classes. No HOCs.
2. React Query for ALL server state. Never fetch() in useEffect.
3. Every component handles: loading, error, empty, success.
4. 300-line component limit. Split into hooks and sub-components.
5. Keys must be stable unique IDs. Never use array index.
6. Context only for truly global state (auth, theme).

---

## Cross-References

- **Extended by:** `react-performance.md` — React performance optimization
- **Extended by:** `react-testing.md` — React testing patterns
- **Depends on:** `frontend-architecture.md` — general frontend architecture
- **Depends on:** `state-management.md` — state management strategy
