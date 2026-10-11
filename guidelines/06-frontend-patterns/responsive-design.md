---
status: "Normative"
scope: "Global"
tags: [responsive, breakpoints, layout]
---

# Responsive Design

---

## Directives

1. **Screen targets:** `lg` ≥1280px (primary) · `md` 768–1279 (supported) · `sm` 600–767 (graceful) · `xs` <600px (WCAG reflow minimum). All layouts correct at lg and md; mobile must not break, but full mobile UX optimization is deprioritized unless mobile is a primary target.
2. **Desktop-first by default:** design the ideal layout, adapt downward —
   ```tsx
   <Box sx={{ display: { xs: 'none', md: 'block' } }}>
   <Stack direction={{ xs: 'column', md: 'row' }}>
   ```
   Mobile-first only when analytics show >40% mobile traffic.
3. **320px reflow is a WCAG requirement (1.4.10), not a design target:** content reflows to 320px width without horizontal scrolling. Fluid flex/grid sizing · multi-column stacks at narrow viewports · no min-width exceeding small viewports.
4. **Responsive tables:** `overflow-x: auto` as small-screen fallback; better options — hide non-critical columns (`display: { xs: 'none', md: 'table-cell' }`) or card/expandable-row layouts on mobile.
5. **RTL + responsive together:** MUI breakpoints respect direction automatically; never CSS left/right positioning; test each breakpoint in BOTH directions.
6. **Testing:** Playwright viewport configs at lg (1280px) and md (768px); verify no horizontal scroll at 320px; both directions per viewport.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Fixed pixel-width containers | maxWidth / fluid widths |
| Horizontal scroll on key flows | Reflow; overflow-x only for data tables |
| Mobile-first when users are desktop | Desktop-first |
| Ignoring 320px reflow | WCAG requires it |

## Cross-References

`mui-styling.md` · `accessibility-standards.md` · `table-patterns.md`
