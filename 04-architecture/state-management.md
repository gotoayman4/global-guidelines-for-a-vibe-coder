# State Management — Managing Application State with AI

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,800 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `frontend-architecture.md`

---

## Purpose

Define the state management strategy optimized for AI-assisted frontend development. AI over-uses global state, puts server data in client stores, and creates complex state machines for simple UI. This document defines the right tool for each type of state.

---

## The Four Types of State

Every piece of state in a frontend application falls into one of four categories. Use the right tool for each:

| State Type | Examples | Tool | Why |
|---|---|---|---|
| **Server State** | User list, blog posts, order history | React Query / TanStack Query | Auto-caching, refetching, cache invalidation |
| **UI State** | Modal open/close, tab selection, form input | `useState` / `useReducer` | Local, simple, co-located with component |
| **Global UI State** | Theme, locale, auth status | Context / Zustand | Shared across components but infrequently changed |
| **Form State** | Multi-step form data, validation state | React Hook Form / Formik | Handles validation, dirty tracking, submission state |

**Rule:** Server state NEVER goes in a global store (Redux, Zustand, Context). AI frequently does this — it fetches data and stores it in a global state object instead of using a server-state library. This creates stale data, cache invalidation bugs, and unnecessary complexity.

---

## Server State (React Query Pattern)

```typescript
// Hook: encapsulates all server state for a resource
const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
    staleTime: 5 * 60 * 1000,  // 5 minutes before refetch
  });
};

const useUser = (id: string) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => api.getUser(id),
    enabled: !!id,
  });
};

// Mutation: updates server state + invalidates cache
const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateUserInput) => api.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
```

**Benefits of this approach:**
- Automatic caching and background refetching
- Loading, error, and data states built in
- Cache invalidation is explicit and predictable
- AI can follow the pattern: query key → query function → consume hook

---

## UI State (Local)

```typescript
// Local state: co-located with the component that owns it
const UserFilter = () => {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  // Use local state + server state together
  const { data: users, isLoading } = useUsers({ search, role });
  
  // ...
};
```

**Rule:** If only one component (and its direct children) needs the state, keep it local. Don't lift it to a global store "just in case."

---

## Global UI State (When Local Isn't Enough)

Lift state to global ONLY when:
- Multiple unrelated components need the same state
- The state needs to persist across page navigations
- The state represents a cross-cutting concern (auth, theme, locale)

**Minimal global state example (Context):**
```typescript
const AuthContext = createContext<AuthState | null>(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth logic here
  
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

**Rule:** If you have more than 3 global Context providers, you're overusing global state. Audit: does this state TRULY need to be global?

---

## Form State

Forms are the most common source of AI-generated state management problems. Use a form library:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginForm = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });
  
  const loginMutation = useLogin();
  
  const onSubmit = (data) => loginMutation.mutate(data);
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}
      
      <button type="submit" disabled={isSubmitting}>Login</button>
    </form>
  );
};
```

**Benefits:** Validation, error messages, dirty tracking, submission state — all handled by the library, not custom `useState` chains.

---

## Decision Flow

```
Is this state from the server?
  YES → React Query
  NO  → Is it needed by multiple unrelated components?
          YES → Is it a cross-cutting concern (auth, theme)?
                  YES → Context / Zustand
                  NO  → Reconsider: can it be local?
          NO  → Is it form state?
                  YES → React Hook Form
                  NO  → useState / useReducer (local)
```

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Server data in Redux** | Manual caching, stale data, complex invalidation | React Query for server state |
| **Everything in global state** | Unnecessary complexity, performance issues | Default to local state; lift only when proven necessary |
| **Prop drilling >3 levels** | Fragile component chains | Context or component composition |
| **Custom form state management** | Reimplementing validation, dirty tracking | Use React Hook Form or Formik |
| **Multiple sources of truth** | User object in React Query AND Context AND local state | One source per state type |
| **No loading/error handling** | Blank screens, crashes | Every data query must handle loading + error |

---

## Key Takeaways

1. Four state types: server, UI, global UI, form. Different tools for each.
2. Server state in React Query. Never in Redux, Context, or Zustand.
3. Default to local state. Lift to global only when proven necessary.
4. Form state in a form library. Don't hand-roll validation and dirty tracking.
5. One source of truth per state type. No duplicated state.
6. Every data-dependent component handles loading + error + empty + success.

---

## Cross-References

- **Depends on:** `frontend-architecture.md` — state management as an architectural layer
- **Applied by:** `react-architecture.md` — React-specific state patterns
