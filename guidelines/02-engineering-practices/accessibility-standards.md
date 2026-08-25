# Accessibility Standards — Building Inclusive Interfaces

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,900 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `frontend-architecture.md`, `icon-usage.md`

---

## Purpose

Define accessibility (a11y) standards for AI-assisted frontend development. AI generates inaccessible UI by default — it omits ARIA attributes, ignores keyboard navigation, and produces color contrast failures. This document is the minimum enforceable standard.

---

## Why AI Fails at Accessibility

AI models are trained on code that systematically neglects accessibility. The web is mostly inaccessible, and AI reproduces this pattern. Specific failure modes:

- Missing `alt` text on images
- Divs used as buttons (no keyboard support, no role)
- Forms without labels or error announcements
- Modals that don't trap focus
- Color-only indicators (invisible to screen readers)
- Missing heading hierarchy (skipping from h1 to h4)
- No skip-to-content links
- Dynamic content updates without `aria-live` announcements

**Rule:** Never assume AI output is accessible. Review every UI change for a11y compliance.

---

## Minimum Enforceable Standards (WCAG 2.1 AA)

These are non-negotiable. Every AI-generated UI must meet them:

### 1. Semantic HTML

Use native HTML elements with built-in accessibility. Don't reinvent buttons with divs.

```html
<!-- NEVER ACCEPT FROM AI -->
<div class="button" onclick="submit()">Submit</div>

<!-- ALWAYS REQUIRE -->
<button type="submit">Submit</button>
```

**Elements that must use native semantics:**
- Buttons → `<button>`, not `<div onclick>`
- Links → `<a href>`, not `<span onclick>`
- Form inputs → `<input>`, `<select>`, `<textarea>` with associated `<label>`
- Headings → `<h1>` through `<h6>` in logical order (no skipping levels)
- Lists → `<ul>`, `<ol>`, `<li>`
- Tables → `<table>`, `<thead>`, `<tbody>`, `<th scope>`

### 2. Keyboard Navigation

All interactive elements must be keyboard accessible.

- Tab order must be logical (matches visual order)
- Focus indicators must be visible (never `outline: none` without replacement)
- Dialogs must trap focus when open
- Esc must close dialogs/dropdowns
- Custom interactive widgets need ARIA keyboard patterns (tabs, menus, comboboxes)

### 3. Screen Reader Support

- All images have descriptive `alt` text (or `alt=""` for decorative)
- Form inputs have associated `<label>` elements
- Error messages are announced via `aria-live` regions
- Dynamic content changes are announced (loading states, search results, notifications)
- Page has a logical heading structure (h1 → h2 → h3, no skipping)
- Language is set on `<html lang="en">`

### 4. Color and Contrast

- Text meets minimum contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Information is never conveyed by color alone (add icons, text, or patterns)
- Focus indicators have sufficient contrast
- Links are distinguishable from surrounding text (not just by color)

### 5. Forms

- Every input has a visible, associated label
- Required fields are marked (visually AND programmatically)
- Error messages are associated with their inputs (`aria-describedby`)
- Validation errors are announced to screen readers
- Form has a clear submit button (not just Enter key)

---

## AI Prompting for Accessibility

**Template to add to UI prompts:**
```
Ensure accessibility:
- Use semantic HTML elements (button, input, label, heading hierarchy)
- All interactive elements are keyboard accessible
- Images have descriptive alt text
- Color contrast meets WCAG 2.1 AA (4.5:1 minimum)
- Forms have associated labels and error announcements
- Focus management is correct (trapped in modals, visible indicators)
- Tested with keyboard navigation (Tab, Enter, Esc, arrow keys)
```

---

## Accessibility Testing Checklist

### Automated (run on every PR):
```
[ ] Lighthouse Accessibility score >90
[ ] axe DevTools or jest-axe finds no violations
[ ] ESLint a11y plugin shows no errors (jsx-a11y)
```

### Manual (review for every new UI feature):
```
[ ] Tab through the entire feature — can you reach everything?
[ ] Press Enter on every interactive element — does it work?
[ ] Press Esc on every dialog/dropdown — does it close?
[ ] Check focus visibility — can you always see where focus is?
[ ] Turn on screen reader (VoiceOver/NVDA) — can you navigate the feature?
[ ] Zoom to 200% — does the layout still work?
```

---

## Common AI Accessibility Failures (and Fixes)

| AI Failure | Consequence | Fix |
|---|---|---|
| `<div onclick>` instead of `<button>` | Not keyboard accessible; no screen reader role | Use `<button>` or add `role="button" tabindex="0"` with keyboard handler |
| Missing form labels | Screen reader users can't identify inputs | `<label for="id">` or `<input aria-label="...">` |
| Modal without focus trap | Keyboard users tab behind the modal | Focus first element on open; trap Tab within modal; close on Esc |
| Color-only error state | Color-blind users can't see errors | Add icon + text message alongside red border |
| Missing `alt` on images | Screen reader announces "image" with no context | Descriptive `alt` for content images; `alt=""` for decorative |
| `aria-hidden="true"` on focusable element | Focusable element becomes invisible to screen reader but reachable by keyboard | Never aria-hide focusable elements |
| Skipping heading levels | Screen reader navigation breaks | h1 → h2 → h3; never h1 → h4 |
| Dynamic content without `aria-live` | Screen reader doesn't announce changes | `aria-live="polite"` for updates; `aria-live="assertive"` for critical alerts |

---

## Tooling

| Tool | Purpose |
|---|---|
| **eslint-plugin-jsx-a11y** | Catch a11y issues at lint time |
| **jest-axe** | Automated a11y testing in unit/integration tests |
| **Lighthouse** | Comprehensive a11y audit in CI or manually |
| **axe DevTools** | Browser extension for manual a11y inspection |
| **WAVE** | Visual overlay showing a11y issues |
| **VoiceOver (Mac) / NVDA (Windows)** | Screen reader testing |

---

## Key Takeaways

1. AI generates inaccessible UI by default. A11y must be explicitly demanded.
2. Semantic HTML is the foundation. Native elements have built-in accessibility.
3. Keyboard navigation is non-negotiable. Every interaction must work without a mouse.
4. Minimum standard: WCAG 2.1 AA. Automated tools catch ~30% of issues; manual testing catches the rest.
5. Add a11y requirements to every UI prompt. Without them, AI skips accessibility entirely.

---

## Cross-References

- **Depends on:** `frontend-architecture.md` — accessibility as an architectural concern
- **Applied by:** `testing-patterns.md` — accessibility testing in CI
- **Applied by:** `mui-rtl-bidirectional.md` — RTL-specific accessibility considerations
