# Frontend Architecture — Structuring UI Applications

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,200 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `state-management.md`, `api-design-standards.md`

---

## Purpose

Define the architectural principles and patterns for frontend applications built with AI assistance. These principles apply regardless of framework (React, Vue, Svelte) and ensure AI can reason about, modify, and extend the codebase safely.

---

## Core Architectural Principles

### 1. Separate UI from Logic

Keep rendering, business rules, and data access in distinct layers. This is the single most important principle for AI-maintainable frontends.

```
src/
├── components/     # UI rendering only (JSX, CSS, visual structure)
├── hooks/          # Stateful logic, side effects, API calls
├── services/       # Pure business logic, validation, calculations
├── types/          # TypeScript interfaces and types
├── utils/          # Pure utility functions (formatting, transformation)
└── pages/          # Route-level composition of components
```

**Rule:** A component file should contain UI rendering only. Business logic goes in hooks or services. API calls go through a dedicated API layer. AI respects this separation when it's structurally enforced.

### 2. One Component, One Responsibility

Files must follow the file size limits defined in `02-engineering-practices/file-organization.md`. Plan for 400 lines per file during implementation; 500 is the hard limit enforced by ESLint. AI generates inconsistent logic in large files and produces better output when files are focused.

**When to split:**
- Component has multiple distinct visual sections → extract sub-components
- Component contains business logic → extract to hook
- Component handles multiple states independently → extract state machine or sub-components
- File exceeds 400 lines in the plan → split before implementing

### 3. Prefer Composition Over Inheritance

React's composition model (children, render props, slots) is more AI-friendly than class inheritance or complex HOC chains. AI understands "wrap this in that" better than "extend this class and override these methods."

```tsx
// AI-friendly composition:
<PageLayout>
  <Sidebar />
  <MainContent>
    <DataTable data={items} />
  </MainContent>
</PageLayout>
```

### 4. Centralize Business Logic

Avoid spreading validation, permissions, and calculations across components. Centralize in dedicated services that AI can reference.

**Bad:** Validation logic in 5 different form components.
**Good:** `validation.ts` exports `validateEmail()`, `validatePassword()`. Every component imports from one source.

### 5. Explicit Data Flow

AI reasons poorly about implicit data flow (context that magically appears, global state that silently changes). Make data flow visible:

- Props flow down explicitly
- Events/callbacks flow up explicitly
- Global state is accessed through well-known hooks (`useAuth()`, `useFeatureFlags()`)
- Side effects are contained in hooks with clear dependency arrays

---

## Directory Structure

```
src/
├── components/
│   ├── ui/              # Generic, reusable UI primitives (Button, Input, Modal)
│   ├── layout/          # Page layouts (Header, Sidebar, Footer)
│   └── features/        # Feature-specific composed components
│       ├── auth/
│       ├── dashboard/
│       └── settings/
├── hooks/
│   ├── useAuth.ts       # Authentication hook
│   ├── useApi.ts        # API call hook with loading/error states
│   └── useForm.ts       # Form state management
├── services/
│   ├── api.ts           # API client configuration
│   ├── auth.ts          # Auth service (login, logout, token management)
│   └── validation.ts    # Shared validation logic
├── types/
│   ├── user.ts
│   ├── api.ts
│   └── common.ts
├── utils/
│   ├── format.ts        # Date, number, string formatting
│   └── constants.ts     # App-wide constants
├── pages/               # Route-level page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   └── Settings.tsx
├── App.tsx              # Root component with routing
└── main.tsx             # Entry point
```

**Why this works for AI:** AI can be pointed at specific directories: "Modify only files in `src/features/auth/`" — clear scope boundaries. The separation means AI rarely needs to understand the entire codebase to make a change.

---

## Component Patterns

### Page Component Pattern
```tsx
// Page component: routing + layout + data fetching
const DashboardPage = () => {
  const { data, loading, error } = useDashboardData();
  
  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return <EmptyState />;
  
  return <DashboardLayout data={data} />;
};
```

**AI must always handle:** loading, error, empty, and success states. No component renders without handling all four.

### Feature Component Pattern
```tsx
// Feature component: composes UI primitives, delegates logic to hooks
const UserProfileForm = ({ userId, onSave }) => {
  const { user, updateUser, isSaving, error } = useUserProfile(userId);
  
  return (
    <Form onSubmit={handleSubmit}>
      <Input label="Name" value={user.name} onChange={...} />
      <Input label="Email" value={user.email} onChange={...} />
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" loading={isSaving}>Save</Button>
    </Form>
  );
};
```

### Custom Hook Pattern
```tsx
// Hook: encapsulates all state, side effects, and API calls
const useUserProfile = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => { fetchUser(userId); }, [userId]);
  
  const updateUser = async (data: Partial<User>) => {
    setIsSaving(true);
    try {
      const updated = await api.updateUser(userId, data);
      setUser(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  return { user, isLoading, isSaving, error, updateUser };
};
```

---

## Routing Architecture

- Keep routing logic in one place (typically `App.tsx` or a dedicated router file)
- Use lazy loading for route-level components (`React.lazy`)
- Protected routes via a wrapper component, not inline checks
- Route parameters typed (TypeScript generics)

---

## State Management Philosophy

See `state-management.md` for full details. Core principle:

- **Server state:** React Query / TanStack Query (or similar)
- **UI state:** `useState` / `useReducer` (local)
- **Global UI state:** Context or Zustand (sparingly)
- **Form state:** React Hook Form or similar

**Rule:** Don't put server state in global stores. AI frequently does this — putting fetched data in Redux/Zustand instead of using a server-state library. This creates stale data bugs.

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Monolithic components** | 800-line components that AI can't safely modify | Split at 500 lines (plan for 400). One responsibility per component |
| **Logic in render** | Business logic scattered across JSX | Extract to hooks and services |
| **Inline API calls** | `fetch()` directly in component | Centralize in API service layer |
| **Prop drilling >3 levels** | Fragile, hard for AI to trace | Context or composition |
| **Mixing server and UI state** | Stale data, cache invalidation bugs | Server state in React Query; UI state in hooks |
| **No loading/error/empty states** | Blank screens, crashes on API failure | Every data-dependent component handles all 4 states |
| **Implicit data flow** | AI can't trace where data comes from | Explicit props, named hooks, typed context |

---

## Key Takeaways

1. Separate UI from logic. Components render; hooks manage state; services hold business logic.
2. Files under 500 lines (plan for 400). See `02-engineering-practices/file-organization.md` for the full rule.
3. Every data-dependent component handles: loading, error, empty, success.
4. Centralize business logic. One source of truth for validation, permissions, calculations.
5. Explicit data flow. Props down, events up. No implicit global state.
6. Server state in React Query. Not in Redux. Not in Context.

---

## Cross-References

- **Extended by:** `state-management.md` — detailed state management strategy
- **Governed by:** `../02-engineering-practices/file-organization.md` — file size limits and modularity rules
- **Extended by:** `react-architecture.md` — React-specific implementation patterns
- **Governed by:** `../08-governance/design-system-governance.md` — design token and shared component governance
- **Applied by:** `api-design-standards.md` — frontend-backend contract definition
