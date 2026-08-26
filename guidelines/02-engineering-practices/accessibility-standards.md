# Accessibility Standards — Building Inclusive Interfaces

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~700 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `frontend-architecture.md`, `icon-usage.md`, `visual-design-principles.md`

---

AI generates inaccessible UI by default — missing ARIA, broken keyboard nav, contrast failures — because training data is mostly inaccessible web code. Never assume AI output is accessible; review every UI change.

## Minimum Standards (WCAG 2.1 AA, non-negotiable)

1. **Semantic HTML:** `<button>` not `<div onclick>` · `<a href>` not clickable spans · inputs with associated `<label>` · heading hierarchy h1→h6 without skipping · real lists and tables (`<th scope>`).
2. **Keyboard navigation:** logical tab order matching visual order · visible focus indicators (never bare `outline: none`) · dialogs trap focus · Esc closes dialogs/menus · custom widgets implement ARIA keyboard patterns.
3. **Screen reader support:** descriptive `alt` on images (`alt=""` decorative) · labels on all form inputs · errors announced via `aria-live` · dynamic changes (loading/results/notifications) announced · `<html lang>` set.
4. **Color & contrast:** text ≥4.5:1 (large text/UI ≥3:1) · never color as sole indicator — pair with icons/text/patterns · links distinguishable beyond color.
5. **Forms:** visible associated labels · required fields marked visually AND programmatically · errors linked via `aria-describedby` + announced · clear submit button.
6. **RTL a11y:** tab order follows visual RTL flow; skip-link appears on the start side; mixed content wrapped in `lang` attributes for correct screen-reader voice.

## Verification

- Keyboard-only pass: Tab / Enter / Esc / arrows through every flow
- axe-core scan in E2E CI (see `playwright-e2e.md`) — zero violations
- Include the accessibility block in UI prompts: semantic HTML, keyboard access, alt text, contrast AA, labels, focus management

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Div-as-button | Native `<button>` |
| `outline: none` without replacement | Visible focus indicator |
| Missing input labels | Associated `<label>` |
| Color-only status | Icon + text + color |
| Modal without focus trap | Trap + Esc close |
| Skipped heading levels | Logical h1→h6 |

## Cross-References

`icon-usage.md` · `form-patterns.md` · `playwright-e2e.md`
