# Playwright E2E Testing

**Status:** Normative
**Scope:** Stack (Playwright)
**Token Tier:** Medium (~800 tokens)
**Tags:** `#playwright` `#e2e` `#testing` `#browser` `#a11y`
**Last Updated:** 2026-08-26

---

## Directives

1. **Role-based locators in priority order:** `getByRole` (role + accessible name) → `getByLabel` → `getByText` → `getByTestId` (last resort). NEVER CSS class selectors (`.MuiButton-root`), DOM-structure paths, bare IDs, or XPath — brittle.
2. **Web-first assertions with auto-retry:** `await expect(locator).toHaveText/toBeVisible/toHaveURL/…`. Never polling `isVisible()`.
3. **NO hard-coded waits** — `page.waitForTimeout()` forbidden. Use assertion auto-retry, `waitForSelector`, `waitForResponse`.
4. **Page Object Model** for repeated interactions; tests call POM methods, not raw locators. One file per major feature/workflow; `test.describe()` grouping; `test.step()` for multi-step actions; each test independent.
5. **MUI specifics:** Select options render in a portal — `page.getByRole('option', { name })`; dialogs render outside the trigger's tree.
6. **Auth via `storageState`** (`use: { storageState: 'auth.json' }`) — never re-login per test. Test at least two roles (user + admin); verify unauthorized access is blocked.
7. **Dual-direction testing mandatory:** config projects `chromium-ar` (locale ar-QA) + `chromium-en` (en-US). Verify `html[dir]`, localized text, calendar display per locale. Parameterize by locale rather than duplicating files.
8. **Accessibility scans in CI:** `@axe-core/playwright` with tags wcag2a/2aa/21a/21aa — zero violations expected.
9. **Coverage bar:** every critical workflow chain has happy path + at least one failure path; unauthorized-access attempts tested.

## Canonical Patterns

```typescript
test('submit for review', async ({ page }) => {
  await page.getByRole('button', { name: 'Submit for Review' }).click();
  await expect(page.getByRole('status')).toContainText('Pending Review');
});

// a11y scan
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
expect(results.violations).toEqual([]);
```

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| `waitForTimeout(3000)` | Auto-retry assertions |
| Class-based locators | Role-based |
| Single-language tests | RTL+LTR parameterized |
| Manual login per test | storageState |
| Shared mutable test state | Independent tests |

## Cross-References

`../mui/mui-rtl-bidirectional.md` · `../../02-engineering-practices/testing-patterns.md` · `../../02-engineering-practices/accessibility-standards.md`
