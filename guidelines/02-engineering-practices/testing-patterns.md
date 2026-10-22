---
status: "Normative"
scope: "Global"
tags: [testing, patterns, unit, integration, e2e]
---

# Testing Patterns — Concrete Strategies for AI-Assisted Testing

---

The HOW companion to `testing-philosophy.md`: this file governs tests that **exist**; `testing-philosophy.md` decides **whether** they exist at all. The directives below are the standard/guarded floor — in `vibe`, the test step is the smoke run (app starts, happy path works), with a regression test only at the second bite or at a milestone. Never skip the verification step; if verification is infeasible (visual-only/config), document manual verification explicitly.

## Directives

1. **standard/guarded: contract tests for every API endpoint** — assert status code, response shape via `toMatchObject`, enum-constrained fields, and that sensitive fields (`passwordHash`, `resetToken`) are `undefined`. AI renames fields and leaks internals constantly; contract tests catch it.
2. **standard/guarded: behavioral integration tests as the workhorse layer** — complete user scenarios at the service/DB boundary (register → verify in DB → duplicate rejected). One vertical test replaces five unit tests.
3. **E2E for critical flows only** — at the ship boundary in every mode, and during iteration in standard/guarded — in priority order: register/login → primary workflow → protected routes redirect → payment flows → secondary workflows. Use `data-testid` selectors.
4. **standard/guarded: regression test with EVERY bug fix** — a test that would have caught the bug (including whitespace/empty-input variants). In `vibe`, the regression is added at the second bite or at a milestone (`speed-tiered-workflow.md` §Mode Transitions); tests are the memory AI lacks.
5. **AI-generated tests MUST be reviewed:** assertions verify behavior (not "function was called"), edge cases actually executed, each test would fail if behavior were wrong, tests independent (no shared mutable state).
6. **Test data isolation:** each test creates its own data or runs in a rolled-back transaction (`BEGIN`/`ROLLBACK` in beforeEach/afterEach); never depend on other tests' data; never use production data.
7. **standard/guarded: normalization/mapping functions get EXHAUSTIVE parameterized tests** (`it.each`): every valid value, every deprecated alias, empty/whitespace/null inputs, case variants, invalid inputs. A silently-nulling role alias is a P0 production bug that ships undetected without this.
8. **Testing by change type (standard/guarded floor; `vibe` runs the smoke path):** new feature → integration (happy + 2 edge) + E2E if critical · bug fix → regression · refactor → existing tests still pass · UI change → E2E of the interaction · API change → updated contract test · perf fix → before/after timing.
9. **Known pitfall — TS6 + jest-mock:** do NOT `import { jest } from '@jest/globals'`; rely on global `jest` from `@types/jest` (its `ResolvedValue<T>` keeps `mockResolvedValue` accepting values after TS6 broke conditional-type distribution). Verify mock compilation after TS upgrades.

Directives 5, 6, and 9 are universal: they apply to every test that exists, including in `vibe`.

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
| Tests after features (standard/guarded) | Same iteration as code; in `vibe`, regression at the second bite or milestone |
| Running the full suite inside a `vibe` iteration | Smoke run per behavior-changing iteration; changed tests at push (`gate:fast`); full suite at the ship boundary |
| Mocking everything | Real DB/API integration preferred |
| Commenting out failing tests | Fix code or test — never suppress |
| Testing implementation details | Behavior: inputs → outputs |
| Massive single test file | One file per module |
| E2E everywhere, no integration | Integration for speed; E2E critical only |

## Cross-References

`testing-philosophy.md` · `agent-verification-loop.md` · `playwright-e2e.md`
