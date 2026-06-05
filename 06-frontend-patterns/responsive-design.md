# Responsive Design

**Status:** Normative  
**Scope:** Global  
**Token Tier:** Low (~1,500 tokens)  
**Last Updated:** 2026-05-24
**Cross-References:** `mui-styling.md`, `mui-rtl-bidirectional.md`, `accessibility-standards.md`, `table-patterns.md`, `playwright-e2e.md`

---

## Purpose

This guide defines responsive design standards for web applications. It establishes screen targets, breakpoint strategy, layout patterns, and accessibility reflow requirements — ensuring the UI works correctly across all supported screen sizes.

---

## Screen Targets

Define clear screen size priorities based on your user base:

| Tier | Breakpoint | Width | Priority |
|---|---|---|---|
| **Desktop** | `lg` | ≥1280px | Primary |
| **Laptop/Tablet Landscape** | `md` | 768px–1279px | Supported |
| **Tablet Portrait** | `sm` | 600px–767px | Graceful |
| **Mobile** | `xs` | <600px | WCAG reflow minimum |

**Rule:** All layouts must be correct at `lg` and `md` breakpoints. Mobile layout must not break but full mobile UX optimization is deprioritized unless mobile is a primary target.

---

## Breakpoint Strategy

### Desktop-First (Recommended)

Use desktop-first breakpoint logic — design for the largest target, then adapt downward:

```tsx
// ✅ Desktop-first: hide on small, show on medium+
<Box sx={{ display: { xs: 'none', md: 'block' } }}>

// ✅ Desktop-first: stack on small, row on medium+
<Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
```

**Why desktop-first:**
- Primary users are on desktops (≥1280px).
- Simpler mental model — start with the ideal layout, then accommodate smaller screens.
- MUI breakpoints naturally support this pattern.

### When to Use Mobile-First

Only if your analytics show >40% mobile traffic. In that case, invert the pattern:

```tsx
// Mobile-first: default stack, row on medium+
<Box sx={{ display: 'flex', flexDirection: 'column', md: 'row' }}>
```

---

## Layout Patterns

### Responsive Grid

```tsx
<Grid container spacing={3}>
  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
    {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
  </Grid>
</Grid>
```

### Responsive Stack

```tsx
<Stack
  direction={{ xs: 'column', md: 'row' }}
  spacing={2}
>
  <Box flex={1}>{/* Content */}</Box>
  <Box sx={{ width: { xs: '100%', md: 320 } }}>{/* Sidebar */}</Box>
</Stack>
```

### Responsive Tables

Complex data tables should use `overflow-x: auto` as a small-screen fallback:

```tsx
<Box sx={{ overflowX: 'auto' }}>
  <StandardTable ... />
</Box>
```

For data tables that must work well on mobile, consider:
- Hiding less critical columns on small screens: `sx={{ display: { xs: 'none', md: 'table-cell' } }}`.
- Using a card layout for mobile instead of a table.
- Collapsing rows into expandable cards.

---

## Accessibility Reflow (WCAG 1.4.10)

Content must reflow to **320px width** without horizontal scrolling. This is a WCAG compliance requirement, not a design target.

**Rules:**
- Use `flex`/`grid` with fluid sizing — avoid fixed pixel widths.
- Multi-column layouts must stack at narrow viewports.
- Approval workflow timelines and complex data displays must restructure for narrow screens.
- Never use `min-width` that exceeds the viewport on small screens.

---

## RTL Considerations

Responsive layouts must work correctly in both RTL and LTR:

- Use MUI's breakpoint system — it automatically respects direction.
- Avoid CSS `left`/`right` positioning — use `start`/`end` properties instead.
- Flexbox `row` and `row-reverse` flip correctly with direction.
- Test responsive behavior in both RTL and LTR at each breakpoint.

---

## Testing Responsive Layouts

### Unit/Component Tests

- Test that components render without errors at each breakpoint.
- Verify that hidden/shown elements respect breakpoint logic.

### E2E Tests

- Use Playwright's viewport configuration to test at `lg` (1280px) and `md` (768px).
- Verify that the 320px reflow minimum is met (no horizontal scroll).
- Test both RTL and LTR at each viewport.

---

## Common Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Fixed pixel widths on containers | Use `maxWidth` or fluid widths |
| `display: none` without responsive alternatives | Provide a mobile-accessible alternative |
| Horizontal scroll on key user flows | Use `overflow-x: auto` only as fallback for data tables |
| Mobile-first when 90%+ users are on desktop | Use desktop-first |
| Fixed-position elements blocking mobile content | Use responsive positioning or hide on small screens |
| Ignoring 320px reflow | WCAG requires it — test it |

---

## Key Takeaways

1. **Desktop-first unless mobile is dominant** — design for the primary user.
2. **MUI breakpoints handle responsive behavior** — `xs`, `sm`, `md`, `lg`, `xl`.
3. **320px reflow is a WCAG floor, not a design target** — satisfy the minimum, don't over-optimize.
4. **`overflow-x: auto` for data tables on small screens** — last resort, not first choice.
5. **Test at `lg` and `md`** — your primary target sizes.
6. **RTL + responsive must work together** — test both at each breakpoint.

---

## Cross-References

- [MUI Styling Guide](../../05-stack-guides/mui/mui-styling.md) — breakpoint and responsive API
- [MUI RTL & Bidirectional](../../05-stack-guides/mui/mui-rtl-bidirectional.md) — RTL responsive behavior
- [Accessibility Standards](../../02-engineering-practices/accessibility-standards.md) — WCAG reflow requirements
- [Table Patterns](../table-patterns.md) — responsive table patterns
- [Playwright E2E Testing](../../05-stack-guides/playwright/playwright-e2e.md) — responsive viewport testing
