---
status: "Normative"
scope: "Stack (React)"
tags: [react, testing, rtl]
---

# React Testing — Component and Hook Testing Patterns

---

React Testing Library (RTL) for component tests. AI generates implementation-mirroring tests that break on refactoring — these patterns prevent that.

## Directives

1. **Test behavior, not implementation** — what the user sees and does; never inspect `useState` values or props directly.
2. **Query by accessibility priority:** `getByRole` → `getByLabelText` → `getByText`/semantic → `getByTestId` (last resort). Accessible queries double as a11y checks.
3. **Mock only at the service/API boundary** (`vi.mock('@/services/api')`) — NEVER mock React internals (`vi.mock('react')`). Mock custom hooks only when testing parents.
4. **Async via RTL primitives:** `findBy*` for async elements · `waitFor` for retrying assertions · `waitForElementToBeRemoved` for loading states. No arbitrary timeouts.
5. **Component test coverage per component:** renders content → interaction calls handler with right args → loading state → success state → error state.
6. **Hook testing** via `renderHook` + `waitFor` only for hooks shared across components; single-component hooks are tested through the component.
7. **No snapshot tests** — they pass when UI breaks subtly.

## Canonical Patterns

```tsx
test('displays user name and email', () => {
  render(<UserCard user={{ name: 'John', email: 'john@test.com' }} />);
  expect(screen.getByText('John')).toBeInTheDocument();
});

test('calls onSave when save clicked', async () => {
  const onSave = vi.fn();
  render(<UserForm onSave={onSave} />);
  await userEvent.type(screen.getByLabelText('Name'), 'John');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));
  expect(onSave).toHaveBeenCalledWith({ name: 'John' });
});

test('shows error on fetch failure', async () => {
  mockApi.getUser.mockRejectedValue(new Error('Network error'));
  render(<UserProfile userId="1" />);
  expect(await screen.findByText(/network error/i)).toBeInTheDocument();
});
```

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Testing implementation details | Rendered output |
| Mocking React hooks | Data-boundary mocks |
| getByTestId everywhere | Accessible queries |
| Snapshot tests | Behavioral assertions |
| Flaky async (timeouts) | findBy*/waitFor |

## Cross-References

`testing-patterns.md` · `testing-philosophy.md` · `../playwright/playwright-e2e.md`
