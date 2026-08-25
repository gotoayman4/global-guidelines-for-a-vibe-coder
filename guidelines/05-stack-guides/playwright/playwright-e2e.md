# Playwright E2E Testing

**Status:** Normative  
**Scope:** Stack (Playwright)  
**Token Tier:** Medium (~1,800 tokens)  
**Tags:** `#playwright` `#e2e` `#testing` `#browser` `#a11y`

---

## Purpose

This guide defines E2E testing conventions using Playwright for React + MUI applications. It covers locator strategy, test structure, authentication, RTL/LTR bilingual testing, accessibility checks, and quality standards.

---

## Core Principles

1. **Role-based locators** — use `getByRole`, `getByLabel`, `getByText`; never CSS class selectors or DOM structure.
2. **Web-first assertions** — `await expect(locator).toHaveText(...)` auto-retries; never use `isVisible()` polling.
3. **No hard-coded waits** — `page.waitForTimeout()` is forbidden. Use `waitForSelector`, `waitForResponse`, or assertion auto-retry.
4. **Page Object Model (POM)** — encapsulate selectors and actions in page object classes. Tests call POM methods, not raw locators.

---

## Test Structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature — Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/feature");
  });

  test("User submits item for review", async ({ page }) => {
    await test.step("Fill and submit form", async () => {
      await page.getByRole("button", { name: "Submit for Review" }).click();
    });

    await test.step("Verify status change", async () => {
      await expect(page.getByRole("status")).toContainText("Pending Review");
    });
  });
});
```

### Best Practices

- Use `test.describe()` blocks to group related user flows.
- Use `test.step()` to document multi-step test actions (visible in reports).
- Each test should be **independent** — no shared mutable state between tests.
- **One file per major feature or workflow chain.**

---

## Locator Strategy

### Priority Order

| Priority | Locator | Example |
|---|---|---|
| 1 (Best) | Role + accessible name | `page.getByRole('button', { name: 'Save' })` |
| 2 | Label text | `page.getByLabel('Username')` |
| 3 | Text content | `page.getByText('Welcome back')` |
| 4 | Test ID (last resort) | `page.getByTestId('submit-btn')` |

### Avoid

| Anti-Pattern | Why |
|---|---|
| CSS class selectors (`.MuiButton-root`) | Brittle — breaks on MUI updates |
| DOM structure selectors (`div > div > button`) | Brittle — any refactor breaks it |
| ID selectors without accessible names | Not user-facing |
| XPath selectors | Hard to read and maintain |

### MUI Specifics

- MUI `Select` dropdown options render in a portal — use `page.getByRole('option', { name: 'Value' })`.
- For MUI `Dialog`, trigger buttons are in-page but the dialog renders in a portal.

---

## Assertion Patterns

| Goal | Use |
|---|---|
| Accessibility tree snapshot | `toMatchAriaSnapshot` |
| Element count | `toHaveCount` |
| Exact text | `toHaveText` |
| Partial text | `toContainText` |
| URL after navigation | `toHaveURL` |
| Visibility change | `toBeVisible` / `toBeHidden` |
| Attribute value | `toHaveAttribute` |

---

## Authentication in Tests

- Use stored auth state via `storageState` in `playwright.config.ts` — **do not re-login in every test**.
- Test at least two roles: regular user + admin/reviewer.
- Verify that unauthorized role access is correctly blocked (403 behavior).

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    storageState: 'auth.json', // Reuse auth state across tests
  },
});
```

---

## RTL & Bilingual Testing

### Configuration

```typescript
export default defineConfig({
  projects: [
    {
      name: 'chromium-ar',
      use: { ...devices['Desktop Chrome'], locale: 'ar-QA' },
    },
    {
      name: 'chromium-en',
      use: { ...devices['Desktop Chrome'], locale: 'en-US' },
    },
  ],
});
```

### Verification Strategy

- Test both `dir="rtl"` (Arabic) and `dir="ltr"` (English) layouts for every layout-sensitive component.
- Verify the HTML direction attribute: `expect(page.locator('html')).toHaveAttribute('dir', 'rtl')`.
- Verify Arabic and English text renders correctly.
- Date fields: verify both calendar system displays based on locale.

### Parameterized Tests

Don't duplicate test files for every language:

```typescript
const locales = [
  { code: 'ar-QA', name: 'Arabic', submitText: 'إرسال' },
  { code: 'en-US', name: 'English', submitText: 'Submit' },
];

for (const locale of locales) {
  test(`Submit form in ${locale.name}`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: locale.submitText }).click();
  });
}
```

---

## Accessibility Testing

Integrate `@axe-core/playwright` for automated accessibility checks:

```typescript
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { level: 1 }).waitFor();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

---

## Quality Checklist

Before finalizing E2E tests:

- [ ] All locators are role-based / accessible-name-based
- [ ] No `waitForTimeout` calls
- [ ] Page Object Model used for repeated interactions
- [ ] Auth state uses `storageState`, not manual login
- [ ] RTL and LTR variants covered for layout-sensitive UI
- [ ] Critical workflow chains have coverage (happy path + at least one failure path)
- [ ] Unauthorized access attempts are tested
- [ ] Accessibility scans pass with zero violations

---

## Common Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| `page.waitForTimeout(3000)` | Use `waitForSelector` or `expect` auto-retry |
| `page.locator('.MuiButton-contained')` | Use `page.getByRole('button', { name: '...' })` |
| CSS class selectors | Use role-based locators |
| Testing one language only | Parameterize for both RTL and LTR |
| Re-logging in every test | Use `storageState` |
| `isVisible()` for assertions | Use `expect(locator).toBeVisible()` |
| Sharing mutable state between tests | Each test is independent |

---

## Key Takeaways

1. **Role-based locators always** — accessible, resilient, semantic.
2. **No hard waits ever** — Playwright's auto-waiting is better.
3. **POM for repeated interactions** — DRY selectors, single source of truth.
4. **storageState for auth** — skip login, focus on feature testing.
5. **Test both RTL and LTR** — bilingual apps need both.
6. **Accessibility scans in CI** — catch violations automatically.
7. **Happy path + failure path per workflow** — complete coverage.

---

## Cross-References

- [MUI RTL & Bidirectional](../mui/mui-rtl-bidirectional.md) — RTL implementation details
- [Testing Philosophy](../../02-engineering-practices/testing-philosophy.md) — why tests matter
- [Testing Patterns](../../02-engineering-practices/testing-patterns.md) — contract-first, behavioral integration
- [Accessibility Standards](../../02-engineering-practices/accessibility-standards.md) — WCAG requirements
- [React Testing](../react/react-testing.md) — unit/integration testing with RTL
