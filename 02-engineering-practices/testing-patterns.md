# Testing Patterns — Concrete Strategies for AI-Assisted Testing

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,800 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `testing-philosophy.md`, `development-workflow.md`

---

## Purpose

Define concrete, actionable testing patterns for AI-assisted development. This is the HOW companion to `testing-philosophy.md`'s WHY.

---

## Pattern 1: Contract-First API Testing

API contracts are the most important testing surface in AI-assisted development. AI frequently breaks API response shapes, renames fields, and changes status codes.

**Pattern:**
```typescript
// Contract test for GET /api/users/:id
describe('GET /api/users/:id', () => {
  it('returns user with correct shape', async () => {
    const response = await request(app).get('/api/users/1');
    
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      email: expect.any(String),
      name: expect.any(String),
      createdAt: expect.any(String),
      // Role must be one of these values
      role: expect.stringMatching(/^(admin|user|viewer)$/),
    });
    // Sensitive fields must NEVER be exposed
    expect(response.body.passwordHash).toBeUndefined();
    expect(response.body.resetToken).toBeUndefined();
  });
});
```

**Why this matters:** AI renames `email` to `emailAddress`, changes `role` from string to object, and "helpfully" includes `passwordHash` in responses. Contract tests catch all of these.

---

## Pattern 2: Behavioral Integration Tests

Test complete user scenarios at the service/database boundary. These are the workhorse tests in vibe coding.

**Pattern:**
```typescript
describe('User Registration Flow', () => {
  it('registers a new user and prevents duplicate emails', async () => {
    // Register
    const result = await userService.register({
      email: 'new@test.com',
      password: 'ValidP@ss1',
    });
    expect(result.success).toBe(true);
    expect(result.user.email).toBe('new@test.com');
    
    // Verify in database
    const dbUser = await db.query('SELECT * FROM users WHERE email = $1', ['new@test.com']);
    expect(dbUser.rows).toHaveLength(1);
    
    // Duplicate prevention
    const duplicate = await userService.register({
      email: 'new@test.com',
      password: 'Another1!',
    });
    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toContain('already exists');
  });
});
```

**Why this matters:** This tests the full vertical: validation → business logic → database → response. If AI changes any layer, this catches it. It's one test covering what would otherwise need 5 unit tests.

---

## Pattern 3: Critical Flow E2E Tests

E2E tests protect the user journeys where failure is catastrophic. Prioritize ruthlessly.

**Priority list (implement in order):**
1. User can register and log in
2. User can perform the primary workflow (e.g., create order, submit form)
3. User cannot access protected pages without login
4. Payment/subscription flows work end-to-end
5. User can perform secondary workflows

**Pattern (Playwright):**
```typescript
test('user can register, login, and access dashboard', async ({ page }) => {
  // Register
  await page.goto('/register');
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'ValidP@ss1!');
  await page.click('[data-testid="register-button"]');
  await expect(page).toHaveURL('/dashboard');
  
  // Verify dashboard content
  await expect(page.locator('[data-testid="welcome-message"]'))
    .toContainText('test@example.com');
  
  // Logout
  await page.click('[data-testid="logout-button"]');
  
  // Verify protected route redirects to login
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});
```

**Why this matters:** AI-generated changes break routing, auth guards, and UI rendering in ways unit and integration tests can't detect. E2E tests are your last line of defense.

---

## Pattern 4: Regression Tests for Fixed Bugs

Every time you fix a bug, add a test that would have caught it. This prevents AI from reintroducing the same bug in a future refactor.

**Pattern:**
```typescript
describe('Bug #142: Empty search returns 500', () => {
  it('empty search returns empty results, not 500', async () => {
    const response = await request(app).get('/api/search?q=');
    expect(response.status).toBe(200);
    expect(response.body.results).toEqual([]);
  });
  
  it('whitespace-only search returns empty results', async () => {
    const response = await request(app).get('/api/search?q=   ');
    expect(response.status).toBe(200);
    expect(response.body.results).toEqual([]);
  });
});
```

**Rule:** Every bug fix commit includes a regression test. No exceptions. AI has no memory of past bugs — tests are the memory.

---

## Pattern 5: AI-Assisted Test Generation (With Review)

AI can generate test scaffolding, but you must review and augment.

**Generation prompt:**
```
Generate tests for the user registration endpoint.

Cover:
- Happy path: valid email + strong password → 201 + JWT
- Missing email → 400
- Invalid email format → 400
- Weak password → 400 with validation message
- Duplicate email → 409
- SQL injection attempt in email field → 400 (sanitized)

Use behavioral assertions: test inputs → outputs.
Do NOT test implementation details (don't mock internal functions).
Use the existing test patterns in /tests/auth/register.test.ts.
```

**Review checklist for AI-generated tests:**
- [ ] Do assertions verify correct behavior (not just "function called")?
- [ ] Are edge cases actually tested (not just listed in comments)?
- [ ] Would the test fail if the behavior was wrong? (Test the test)
- [ ] Is each test independent? (No shared mutable state)
- [ ] Are test descriptions clear about what's being tested?

---

## Pattern 6: The 5-Minute Smoke Test

After every AI code generation, run a quick manual smoke test. Automated tests catch regressions; manual tests catch UX and visual issues.

```
Manual smoke test (5 minutes):
1. Start the app → no startup errors
2. Log in → redirected correctly
3. Navigate to the changed feature → renders without errors
4. Perform the happy path → works as expected
5. Check browser console → no red errors
```

**Rule:** Never commit AI-generated code without running the smoke test. "Tests pass" doesn't mean "the UI renders correctly."

---

## Pattern 7: Test Data Isolation

AI often generates tests that depend on specific database state. This creates fragile, order-dependent tests.

**Rules for test data:**
1. Each test creates its own data (or uses a fresh transaction)
2. Tests never depend on data created by other tests
3. Database is reset or transactions are rolled back between tests
4. Never use production data in tests

**Implementation:**
```typescript
beforeEach(async () => {
  // Start transaction
  await db.query('BEGIN');
});

afterEach(async () => {
  // Rollback — database is clean for next test
  await db.query('ROLLBACK');
});
```

---

## The Testing Workflow

```
FEATURE IMPLEMENTED → WRITE/UPDATE TESTS → RUN TESTS → TESTS PASS? → 
  YES → MANUAL SMOKE TEST → COMMIT
  NO  → AI FIXES CODE → RUN TESTS → (repeat until pass)
```

**Critical rule:** Never skip the "WRITE/UPDATE TESTS" step. AI-generated code without tests is unverified code. If tests are infeasible (visual-only changes, configuration), document the manual verification steps explicitly.

---

## Testing by Change Type

| Change Type | Minimum Tests | Rationale |
|---|---|---|
| **New feature** | Integration test (happy path + 2 edge cases) + E2E if critical flow | Verify behavior end-to-end |
| **Bug fix** | Regression test that reproduces the bug | Prevent re-emergence |
| **Refactoring** | Existing tests must still pass | Behavior must be preserved |
| **UI change** | E2E test for the changed interaction | Visual + behavioral verification |
| **API change** | Updated contract test | Ensure response shape stability |
| **Performance fix** | Before/after timing assertions | Prove improvement |

---

## Anti-Patterns in Testing Practice

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Tests after features (or never)** | Tests mirror bugs instead of preventing them | Write tests in the same iteration as the code |
| **Mocking everything** | Tests pass but real integration fails | Prefer integration tests with real database/API over heavily mocked unit tests |
| **One massive test file** | Impossible to find relevant tests; merge conflicts | One test file per module/feature |
| **Commenting out failing tests** | Bugs are silently ignored | Fix the code or the test — never suppress |
| **Testing implementation details** | Tests break on every refactor | Test behavior: given inputs → expected outputs |
| **Excessive E2E without integration** | Slow feedback; hard to debug failures | Integration tests for fast feedback; E2E for critical flows only |

---

## Key Takeaways

1. Contract tests for every API. AI breaks response shapes constantly.
2. Behavioral integration tests as the primary test layer. Test complete scenarios.
3. E2E tests for critical flows only. Login, payments, core workflows.
4. Regression test for every bug fix. AI has no memory of past bugs.
5. Review AI-generated tests. They look correct but often test the wrong thing.
6. 5-minute smoke test after every AI generation. Tests pass ≠ UI works.

---

## Cross-References

- **Depends on:** `testing-philosophy.md` — the philosophy these patterns implement
- **Applied by:** `development-workflow.md` — the Test phase in the standard loop
- **Applied by:** `playwright-e2e.md` — E2E-specific patterns for Playwright
