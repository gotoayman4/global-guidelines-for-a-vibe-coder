# RTL Tech Stack — Right-to-Left Arabic-Optimized Development

**Status:** Normative
**Scope:** Global — All Projects (Bilingual by Default)
**Token Tier:** Full (~2,000 tokens)
**Last Updated:** 2026-05-26
**Cross-References:** `mui/mui-rtl-bidirectional.md`, `shadcn/shadcn-rtl-bidirectional.md`, `accessibility-standards.md`, `frontend-architecture.md`

---

## Purpose

Define the technology requirements and conventions for building applications that support Right-to-Left (RTL) languages — specifically Arabic, but also Hebrew, Persian, and Urdu. This guideline covers tech stack selection, CSS conventions, numeral handling, font stacks, and testing.

**Bilingual-first notice:** All projects in this organization are bilingual (English + Arabic) by default. These rules always apply, not conditionally. Every feature, every page, and every component MUST be designed for bidirectional text from the start.

---

## Numeral Policy

### UI Chrome Default

Default application UI chrome should use Western Arabic numerals: `0 1 2 3 4 5 6 7 8 9`.

This applies by default to:
- Table data and row numbers
- Form fields (phone numbers, quantities, prices)
- Charts, graphs, and data visualizations
- Pagination controls
- Counters, badges, and notifications
- Dates (use `Intl.DateTimeFormat`)
- Currency values (use `Intl.NumberFormat`)

### Domain Exceptions

Do not globally forbid Arabic-Indic numerals. Writing, publishing, education, legal, religious, archival, and institution-specific products may need user-selectable numeral styles.

For those products, define an explicit numeral policy per context:

| Context | Recommended Default | Allowed Options |
|---|---|---|
| Application chrome | Western Arabic | Western Arabic unless the product explicitly requires otherwise |
| User-authored content | Preserve user input | Western Arabic, Arabic-Indic, preserve-as-typed |
| Generated documents | Product-specific | Western Arabic, Arabic-Indic, institution/template default |
| Search/indexing | Normalize internally | Match regardless of numeral presentation |

When Arabic-Indic numerals are allowed, they must be a deliberate product requirement and covered by tests. Do not mix numeral systems accidentally in the same UI control.

### Implementation
```javascript
// UI chrome default: force Western Arabic numerals.
new Intl.NumberFormat('ar-u-nu-latn').format(1234) // "1,234" — guaranteed Western

// Document/content option: Arabic-Indic numerals when product requirements allow it.
new Intl.NumberFormat('ar-u-nu-arab').format(1234) // "١٬٢٣٤"

// Preserve-as-typed content should not be manually converted at input time.
```

---

## Tech Stack Requirements — Latest Stable with Proven RTL

**Version verification mandate:** Before installing or pinning any RTL-critical package (UI library, CSS framework, editor, PDF renderer, document generator), search the web or npm registry for the current latest stable version. AI training data is stale — never trust AI-suggested version numbers without web verification. Pin to older major versions only when documented in an ADR: (1) the latest version has documented Arabic RTL/BiDi regressions, (2) a major version jump has no migration guide or community adoption, or (3) critical RTL plugins/integrations have not yet updated.

### UI Component Foundation: Choose a Proven RTL-Capable Option

MUI is not mandatory, but it is **NOT deprecated**. Both MUI and shadcn/ui are first-class supported options. Choose a UI foundation based on product needs, design direction, ownership model, and RTL maturity. The choice must be recorded in the project PRD or an ADR.

**Existing MUI projects:** This guideline's addition of the shadcn/ui option does not require or recommend migrating existing MUI apps. MUI remains fully supported with complete RTL documentation at `mui/mui-rtl-bidirectional.md`.

Acceptable options include:

| Option | Best For | Requirements | RTL Mechanism |
|---|---|---|---|
| **MUI 7+** | Apps that benefit from a complete, mature component library and Material-style interaction patterns | Use theme direction, Emotion RTL cache, portal direction testing | Runtime stylis-plugin-rtl CSS flipping |
| **Tailwind CSS + shadcn/ui RTL + @base-ui/react** | Apps needing source-owned components, custom product identity, and strong composability | Use logical utilities, Radix `DirectionProvider`, portal direction testing, `pnpm dlx shadcn@latest init --rtl` | Browser-native CSS logical properties (zero runtime) |
| **Tailwind CSS + @base-ui/react / React Aria internal design system** | Apps with specialized UX such as editors, IDEs, publishing tools, or domain-specific workflows | Own component APIs, test keyboard/a11y/RTL behavior thoroughly | Browser-native CSS logical properties |
| **Arabic-first component system** | Products whose visual language must be deeply Arabic-first | Dependency review, accessibility review, RTL behavior verification | Depends on library choice |
| **Custom design system** | Long-lived products with unique interaction models | Requires explicit design tokens, a11y patterns, test coverage, and RTL audit rules | Depends on implementation |
 
All options must satisfy these non-negotiable requirements:

```
REQUIRE:
- Single app direction state: 'rtl' / 'ltr'
- Runtime direction toggle support when bilingual UI is required
- Direction applied before first render to avoid flicker
- Portal-based components tested in RTL and LTR
- Keyboard and screen-reader accessibility
- Logical CSS properties/classes
- No hardcoded 'ltr' except in explicit code/user-content contexts

FORBID:
- Choosing a component library only because it is popular
- Assuming a library's RTL support works without testing portals, menus, dialogs, and overlays
- Mixing multiple component frameworks without an ADR
- Manual left/right flipping scattered across components
```

### MUI-Specific Rules When MUI Is Chosen (Production-Ready — NOT Deprecated)

If a project chooses MUI — whether new or existing — use the current stable MUI version and RTL setup. This path is fully supported and covered in detail by `mui/mui-rtl-bidirectional.md`.

```
REQUIRE:
- MUI 7+ for new MUI-based projects unless an ADR justifies another MUI version
- Emotion cache with RTL prefix plugin (stylis-plugin-rtl)
- Theme direction: 'rtl' / 'ltr' from the single app direction state
- No first-paint flicker (set direction from stored preference before render)

FORBIDDEN:
- MUI v5 or v6 APIs in new MUI 7+ projects
- Manual direction flipping (use MUI's built-in RTL support)
- Hardcoding 'ltr' anywhere in components
```

Reference: `mui/mui-rtl-bidirectional.md` for full MUI RTL configuration when MUI is selected.

### shadcn/ui + Tailwind CSS Rules When shadcn/ui Is Chosen

If a project chooses shadcn/ui + Tailwind CSS, initialize with RTL from the start.

```
REQUIRE:
- `pnpm dlx shadcn@latest create --rtl` for new projects OR `pnpm dlx shadcn@latest init --rtl` for existing
- @radix-ui/react-direction DirectionProvider wrapping the entire application
- React Aria I18nProvider for locale, dates, numbers, and RTL keyboard navigation
- Logical Tailwind classes exclusively: ms-*, ps-*, start-*, text-start, border-s, rounded-s
- Explicit dir="rtl" on ALL portal content (DialogContent, PopoverContent, DropdownMenuContent, etc.)
- Inline <script> to set document.documentElement.dir before React mounts (prevents flicker)

FORBIDDEN:
- Physical Tailwind classes (ml-*, pl-*, left-*, right-*, text-left, text-right) outside LTR-only contexts
- Portal components without explicit dir prop
- tracking-* on Arabic text (disconnects cursive letters)
- text-black/50 or similar opacity on Arabic text blocks (causes jagged rendering in Firefox)
- word-break: break-all on Arabic content (tears mid-ligature words)
- [dir="rtl"] CSS overrides when logical properties can be used instead
```

Reference: `shadcn/shadcn-rtl-bidirectional.md` for full shadcn/ui + Tailwind RTL configuration when shadcn/ui is selected.

### CSS Framework: Tailwind CSS with Logical Properties (When Tailwind Is the Styling Layer)

If the project uses Tailwind CSS (including shadcn/ui projects), these rules apply:

```
REQUIRE:
- Tailwind CSS 3.4+ with logical property classes
- ms-* / me-* (margin-start/end) — NEVER ml-* / mr-*
- ps-* / pe-* (padding-start/end) — NEVER pl-* / pr-*
- start-* / end-* (inset-inline-start/end) — NEVER left-* / right-*
- text-start / text-end — NEVER text-left / text-right

FORBID:
- Physical directional CSS properties (margin-left, padding-right, border-left, etc.)
- Physical Tailwind classes (ml-*, mr-*, pl-*, pr-*, left-*, right-*)
```

If the project uses MUI (Emotion CSS-in-JS), use MUI's `sx` direction-aware shorthand and CSS logical properties in styled components — see `mui/mui-rtl-bidirectional.md`. Do not mix Tailwind classes into MUI projects.

### CSS-in-JS: Logical Properties

When using Emotion or styled-components:
```css
/* ALWAYS */
margin-inline-start: 16px;
padding-inline-end: 8px;
border-inline-start: 1px solid;

/* NEVER */
margin-left: 16px;
margin-right: 16px;
padding-left: 8px;
```

---

## Font Stack — Arabic-Optimized

### Recommended Fonts (in priority order)

| Font | Type | Best For | Weight Advice |
|---|---|---|---|
| **Tajawal** | Sans-serif | Modern UI, dashboards, forms | 400+ only; excellent at small sizes |
| **Cairo** | Sans-serif | Headings, titles, navigation | 400, 500, 700 recommended |
| **Noto Sans Arabic** | Sans-serif | UI labels, buttons, tables — comprehensive coverage | 400, 700; avoid 300 |
| **Noto Kufi Arabic** | Sans-serif | Headings, display text | 400, 700 |
| **Noto Naskh Arabic** | Serif | Body text, long-form content | 400, 700 |
| **Amiri** | Serif | Long-form reading, academic content | 400, 700 |
| **Scheherazade New** | Serif | Print-style, formal documents | 400, 700 |

### Font Stack Declaration
```css
body {
  font-family: 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', 'Roboto', sans-serif;
}

/* RTL-specific heading */
h1, h2, h3 {
  font-family: 'Cairo', 'Tajawal', 'Noto Sans Arabic', sans-serif;
}
```

**Rule:** Always include both Arabic and Latin font fallbacks. Never assume Arabic fonts are installed on the user's system — include them or load from CDN. Arabic font files are 3–5x larger than Latin; use `unicode-range` to split and lazy-load.

### Arabic Typography Rules

```
REQUIRE:
- Arabic line-height: 1.6–1.8 (vs 1.4–1.5 for Latin) — diacritics need more vertical space
- Minimum font-weight: 400 for Arabic body text (300 is too thin and illegible)
- text-underline-offset >= 4px for Arabic links — prevents dot clipping
- Use unicode-range font subsetting to avoid loading unused glyphs

FORBIDDEN:
- letter-spacing / tracking-* on Arabic text — disconnects cursive letters
- Opacity/alpha on Arabic text blocks — causes jagged rendering in Firefox
- word-break: break-all on Arabic content — tears mid-ligature words
- Latin-only font stacks without Arabic fallbacks
```

### Performance: Logical Properties vs Auto-Flipping (For Stack Selection)

When choosing between stacks, CSS logical properties (Tailwind's `ms-*`, `ps-*`, etc.) produce **1x CSS** with **zero runtime cost**. The browser handles mirroring natively. In contrast, MUI's stylis-plugin-rtl produces ~1.6x CSS and runs at ~50–100ms per re-render. For document-heavy or IDE-like applications, this difference is material. For typical enterprise dashboards with standard UI density, MUI's runtime overhead is negligible in practice.

```
WHEN CHOOSING A STACK:
- CSS logical properties (Tailwind v4, shadcn/ui RTL): 1x CSS, 0ms runtime
- stylis-plugin-rtl (MUI): ~1.6x CSS, ~50-100ms per re-render

EXISTING MUI PROJECTS:
- Do NOT migrate solely for RTL performance reasons
- The stylis overhead is rarely a bottleneck in practice
- Only consider migration if the product needs custom visual identity or code ownership
```

---

## Bidirectional Text Handling

### Wrap Mixed-Script Content
```html
<!-- User-generated content that may contain mixed Arabic/English -->
<p>User <bdi>{userName}</bdi> posted a comment</p>
```

### Direction Attribute
```html
<html dir="rtl" lang="ar">
<body dir="rtl">
<!-- RTL-aware containers -->
<div dir="auto">  <!-- Content direction auto-detected -->
```

---

## Icon Handling

| Icon Type | RTL Behavior |
|---|---|
| Directional (arrows, chevrons, back/forward) | MUST flip in RTL |
| Non-directional (home, settings, search, user) | MUST NOT flip |
| Text indicators (bullets, quotes) | Auto-flip with direction |
| Custom SVG icons | Use `transform: scaleX(-1)` for directional flip |

**Rule:** Never manually create separate LTR/RTL icon sets. Use the chosen UI foundation's direction-aware icon behavior or a centralized CSS transform/helper for directional icons.

---

## Date, Number, and Currency Formatting

```javascript
// ALWAYS use Intl formatters — never manually construct locale-specific strings

// Dates
const formatter = new Intl.DateTimeFormat('ar-SA', {
  year: 'numeric', month: 'long', day: 'numeric'
});
// Arabic month names; numeral output depends on numbering system.

// UI chrome default: force Western Arabic numerals.
const numFormatter = new Intl.NumberFormat('ar-SA-u-nu-latn');
// "1,234.56"

// Domain-specific document output may intentionally use Arabic-Indic numerals.
const documentNumFormatter = new Intl.NumberFormat('ar-SA-u-nu-arab');
// "١٬٢٣٤٫٥٦"

// Currency
const currencyFormatter = new Intl.NumberFormat('ar-SA', {
  style: 'currency', currency: 'SAR'
});
```

---

## Automated RTL Auditing

Run RTL violation detection on every PR:

```bash
npx rtlify-ai init    # Install RTL rule configuration
npx rtlify-ai check   # Detect RTL violations
npx rtlify-ai fix     # Auto-fix simple violations
```

Integrate into CI/CD:
```yaml
# GitHub Actions example
- name: RTL Audit
  run: npx rtlify-ai check
```

---

## Testing RTL

### E2E Testing — Dual Direction

Every E2E test MUST run in both directions:

```javascript
// Playwright example
test('login flow works in RTL', async ({ page }) => {
  await page.goto('/ar/login'); // Arabic locale route
  await expect(page.locator('[dir="rtl"]')).toBeVisible();
  // ... test RTL-specific behavior
});

test('login flow works in LTR', async ({ page }) => {
  await page.goto('/en/login');
  await expect(page.locator('[dir="ltr"]')).toBeVisible();
});
```

### Manual RTL Checklist
- [ ] All pages render correctly with `dir="rtl"`
- [ ] Forms align right-to-left with labels preceding inputs
- [ ] Tables scroll right-to-left
- [ ] Modal dialogs appear in correct position
- [ ] Navigation and breadcrumbs flow right-to-left
- [ ] Charts and graphs have correct axis direction
- [ ] UI chrome numbers follow the product numeral policy
- [ ] Document/content numerals follow user, template, or institution settings
- [ ] Directional icons are flipped, non-directional are not

---

## Architecture for Bilingual Apps

### URL Strategy
```
/en/dashboard     # English (LTR)
/ar/dashboard     # Arabic (RTL)
```

### i18n Library
Use `react-i18next` or `next-intl` for translation management. Never hardcode strings.

### Direction Toggle
```javascript
// Store user preference in localStorage
localStorage.setItem('dir', 'rtl'); // or 'ltr'
// Apply before first render to prevent flicker
```

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Accidental numeral mixing** | Users see inconsistent numbers across the same UI or document | Define numeral policy per context and format via `Intl` |
| **Physical CSS properties** | Layout breaks in RTL; margins on wrong side | Use logical properties exclusively |
| **Hardcoded direction** | Cannot toggle language without code changes | Theme direction from stored preference |
| **No RTL testing** | RTL UI silently broken until Arabic users complain | Run all E2E tests in both directions |
| **Latin-only font stack** | Arabic text renders in ugly fallback font | Include Arabic fonts in the stack |
| **Treating MUI as mandatory for all RTL apps** | Forces the wrong UX foundation on specialized products | Choose a proven RTL-capable foundation and document the decision |
| **Flipping non-directional icons** | Home/search/settings icons look wrong in RTL | Only flip directional icons (arrows, chevrons) |
| **Manual date/number formatting** | Inconsistent locale handling and numeral surprises | Always use Intl.DateTimeFormat / Intl.NumberFormat |
| **`tracking-*` on Arabic text** | Arabic cursive letters disconnect, text becomes illegible | `[lang="ar"] { letter-spacing: 0 }` |
| **Portal components without `dir` prop (shadcn/@base-ui)** | Content renders LTR inside RTL portals | Always pass `dir="rtl"` to portal content |
| **`dir` set only in React, not HTML** | First paint shows LTR layout before React mounts (flicker) | Inline script sets `dir` before first paint |
| **Shadow opacity on Arabic text** | Jagged rendering of connected glyphs (especially Firefox) | Use opaque color tokens instead of `text-black/50` |

---

## Key Takeaways

1. Use Western Arabic numerals (0-9) for UI chrome by default, but allow explicit product/domain exceptions for authored or generated content.
2. Use logical CSS properties exclusively in all stacks. In Tailwind: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `border-s`, `rounded-s`. In MUI Emotion: `marginInlineStart`, `paddingInlineEnd`, or MUI's direction-aware `sx` props. Never use physical `left`/`right`/`margin-left` etc. in UI chrome.
3. MUI 7+ is ONE valid RTL-capable choice, not a universal mandate. shadcn/ui + Tailwind v4 + @base-ui/react offers zero-runtime RTL via CSS logical properties and is preferred for custom-identity products (editors, IDEs, publishing tools, academic apps).
4. Include Arabic fonts in the stack: Tajawal, Cairo, Noto Sans Arabic, Noto Naskh Arabic. Never use `tracking-*` or opacity on Arabic text.
5. Run `npx rtlify-ai check` on every PR. Automate in CI/CD.
6. Test every feature in both LTR and RTL. Dual-direction E2E tests are mandatory. Storybook RTL mode for all shared components.
7. Use `Intl.DateTimeFormat` and `Intl.NumberFormat` — never manually format locale-specific strings. Prefer React Aria `I18nProvider` for full Arabic locale support including Hijri calendar.
8. Portal components (Dialog, Popover, DropdownMenu, etc.) do NOT inherit `dir` — pass `dir="rtl"` explicitly on all portal content.
9. Prevent first-paint flicker: set `document.documentElement.dir` via inline script BEFORE React mounts.
10. CSS logical properties (Tailwind v4, shadcn/ui) produce 1x CSS with zero runtime RTL cost. MUI's stylis runtime approach is also production-proven and rarely a real bottleneck — both stacks are valid.

---

## Cross-References

- **Extended by:** `mui/mui-rtl-bidirectional.md` — detailed MUI RTL configuration when MUI is selected
- **Extended by:** `shadcn/shadcn-rtl-bidirectional.md` — detailed shadcn/ui + Tailwind RTL configuration when shadcn/ui is selected
- **Depends on:** `accessibility-standards.md` — WCAG requirements for bidirectional UIs
- **Governed by:** `../02-engineering-practices/bidirectional-design-principles.md` — design rationale and architectural guidance for RTL
- **Applied by:** `playwright-e2e.md` — E2E testing in both directions
- **Applied by:** `frontend-architecture.md` — component patterns for RTL
