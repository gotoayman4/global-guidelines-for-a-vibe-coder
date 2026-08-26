# Testing Patterns — Concrete Strategies for AI-Assisted Testing

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,400 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `testing-philosophy.md`, `development-workflow.md`, `agent-verification-loop.md`

---

The HOW companion to `testing-philosophy.md`. Workflow: implement → write/update tests → run → pass? → smoke test → commit. Never skip the test step; if tests are infeasible (visual-only/config), document manual verification explicitly.

## Directives

1. **Contract tests for every API endpoint** — assert status code, response shape via `toMatchObject`, enum-constrained fields, and that sensitive fields (`passwordHash`, `resetToken`) are `undefined`. AI renames fields and leaks internals constantly; contract tests catch it.
2. **Behavioral integration tests as the workhorse layer** — complete user scenarios at the service/DB boundary (register → verify in DB → duplicate rejected). One vertical test replaces five unit tests.
3. **E2E for critical flows only, in priority order:** register/login → primary workflow → protected routes redirect → payment flows → secondary workflows. Use `data-testid` selectors.
4. **Regression test with EVERY bug fix** — a test that would have caught the bug (including whitespace/empty-input variants). No exceptions; tests are the memory AI lacks.
5. **AI-generated tests MUST be reviewed:** assertions verify behavior (not "function was called"), edge cases actually executed, each test would fail if behavior were wrong, tests independent (no shared mutable state).
6. **Test data isolation:** each test creates its own data or runs in a rolled-back transaction (`BEGIN`/`ROLLBACK` in beforeEach/afterEach); never depend on other tests' data; never use production data.
7. **Normalization/mapping functions get EXHAUSTIVE parameterized tests** (`it.each`): every valid value, every deprecated alias, empty/whitespace/null inputs, case variants, invalid inputs. A silently-nulling role alias is a P0 production bug that ships undetected without this.
8. **Testing by change type:** new feature → integration (happy + 2 edge) + E2E if critical · bug fix → regression · refactor → existing tests still pass · UI change → E2E of the interaction · API change → updated contract test · perf fix → before/after timing.
9. **Known pitfall — TS6 + jest-mock:** do NOT `import { jest } from '@jest/globals'`; rely on global `jest` from `@types/jest` (its `ResolvedValue<T>` keeps `mockResolvedValue` accepting values after TS6 broke conditional-type distribution). Verify mock compilation after TS upgrades.

## Canonical Patterns

Contract test:

```typescript
const response = await request(app).get('/api/users/1');
expect(response.status).toBe(200);
expect(response.body).toMatchObject({
  id: expect.any(Number),
  email: expect.any(String),
  role: expect.stringMatching(/^(admin|user|viewer)$/),
});
expect(response.body.passwordHash).toBeUndefined();
```

Exhaustive normalization:

```typescript
it.each(['dean', 'lecturer', 'guest'])('passes through %s', (role) => {
  expect(normalizeRoleCode(role)).toBe(role);
});
it.each([['DEAN', 'dean'], ['DEANS_DELEGATE', 'assistant_dean_academic_affairs']])(
  'maps %s → %s', (input, expected) => expect(normalizeRoleCode(input)).toBe(expected));
it.each(['', '   ', 'NOPE'])('returns null for %j', (bad) => {
  expect(normalizeRoleCode(bad)).toBeNull();
});
```

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Tests after features (or never) | Same iteration as code |
| Mocking everything | Real DB/API integration preferred |
| Commenting out failing tests | Fix code or test — never suppress |
| Testing implementation details | Behavior: inputs → outputs |
| Massive single test file | One file per module |
| E2E everywhere, no integration | Integration for speed; E2E critical only |

## Cross-References

`testing-philosophy.md` · `agent-verification-loop.md` · `playwright-e2e.md`
