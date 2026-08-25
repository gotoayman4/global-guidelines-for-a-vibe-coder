# React Testing — Component and Hook Testing Patterns

**Status:** Normative
**Scope:** Stack (React)
**Token Tier:** Full (~2,000 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `react-architecture.md`, `testing-patterns.md`

---

## Purpose

Define React-specific testing patterns optimized for AI-generated components. AI generates implementation-mirroring tests that break on refactoring. This document establishes behavioral testing for React.

---

## Testing Library Principles

Use React Testing Library (RTL) for component tests. Core principles:

1. **Test behavior, not implementation** — test what the user sees and does, not component internals
2. **Query by accessibility** — prefer `getByRole`, `getByLabelText`, `getByText` over `getByTestId`
3. **No state or props inspection** — don't test `useState` values or prop contents directly
4. **No mock implementations** — mock only at the network/service boundary

---

## Component Test Patterns

### Rendering and Content

```tsx
test('displays user name and email', () => {
  render(<UserCard user={{ id: '1', name: 'John', email: 'john@test.com' }} />);
  
  expect(screen.getByText('John')).toBeInTheDocument();
  expect(screen.getByText('john@test.com')).toBeInTheDocument();
});
```

### User Interaction

```tsx
test('calls onSave when save button is clicked', async () => {
  const onSave = vi.fn();
  render(<UserForm onSave={onSave} />);
  
  await userEvent.type(screen.getByLabelText('Name'), 'John');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  
  expect(onSave).toHaveBeenCalledWith({ name: 'John' });
});
```

### State Transitions

```tsx
test('shows loading then data when fetch succeeds', async () => {
  mockApi.getUser.mockResolvedValue({ id: '1', name: 'John' });
  
  render(<UserProfile userId="1" />);
  
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  expect(await screen.findByText('John')).toBeInTheDocument();
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
```

### Error States

```tsx
test('shows error message when fetch fails', async () => {
  mockApi.getUser.mockRejectedValue(new Error('Network error'));
  
  render(<UserProfile userId="1" />);
  
  expect(await screen.findByText(/network error/i)).toBeInTheDocument();
});
```

### Accessibility

```tsx
test('form inputs are accessible', () => {
  render(<LoginForm />);
  
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
});
```

---

## Hook Testing

Test hooks using `renderHook` from RTL:

```tsx
import { renderHook, waitFor } from '@testing-library/react';

test('useUser fetches and returns user data', async () => {
  mockApi.getUser.mockResolvedValue({ id: '1', name: 'John' });
  
  const { result } = renderHook(() => useUser('1'));
  
  expect(result.current.isLoading).toBe(true);
  
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
  
  expect(result.current.user).toEqual({ id: '1', name: 'John' });
});
```

---

## Mocking Strategy

### Mock at the Service/API Boundary

```tsx
// Mock the API module, not fetch()
vi.mock('@/services/api', () => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
}));
```

### Don't Mock React Internals

```tsx
// NEVER mock React hooks:
vi.mock('react', () => ({ useState: vi.fn() }));  // NO

// Mock at the data boundary instead:
vi.mock('@/hooks/useUser');  // If testing a parent component
```

---

## Query Priority

Use queries in this priority order:

| Priority | Query | Example |
|---|---|---|
| 1 (Best) | Accessible queries | `getByRole`, `getByLabelText`, `getByText` |
| 2 | Semantic queries | `getByAltText`, `getByTitle` |
| 3 | Test IDs | `getByTestId` (last resort) |

```tsx
// BEST: Accessible
screen.getByRole('button', { name: /submit/i });

// GOOD: Semantic
screen.getByLabelText(/email/i);

// LAST RESORT: Test ID
screen.getByTestId('submit-button');
```

---

## Async Testing

```tsx
// Use findBy* for async elements
const userElement = await screen.findByText('John');

// Use waitFor for assertions that need retry
await waitFor(() => {
  expect(screen.getByText('Saved')).toBeInTheDocument();
});

// Use waitForElementToBeRemoved for loading states
await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));
```

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Testing implementation details** | Tests break on refactoring | Test behavior: what user sees and does |
| **Mocking React hooks** | Tests don't verify real behavior | Mock at the data/API boundary |
| **getByTestId everywhere** | Tests ignore accessibility | Prefer accessible queries |
| **Snapshot tests** | Pass when UI breaks in subtle ways | Behavioral assertions instead |
| **Testing state directly** | `expect(state.count).toBe(1)` — fragile | Test the rendered output |
| **No async handling** | Flaky tests that sometimes pass | findBy*, waitFor, act() properly |

---

## Key Takeaways

1. Test behavior (what user sees) not implementation (how component works internally).
2. Query by accessibility: role → label → text → testId (last resort).
3. Mock at the API boundary, never React internals.
4. Every component test covers: render → loading → success → error → interaction.
5. Async tests use findBy* and waitFor, not arbitrary timeouts.
6. Don't test hooks in isolation unless they're shared across many components.

---

## Cross-References

- **Depends on:** `react-architecture.md` — component patterns being tested
- **Depends on:** `testing-patterns.md` — general testing patterns
- **Depends on:** `testing-philosophy.md` — why behavioral testing matters
