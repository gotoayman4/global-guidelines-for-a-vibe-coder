# MUI v7+ Styling Guide

**Status:** Normative  
**Scope:** Stack (MUI v7+)  
**Version:** MUI 7+ (latest stable). Do NOT generate code for MUI v5 or v6 patterns.
**Token Tier:** Medium (~1,800 tokens)  
**Tags:** `#mui` `#styling` `#theme` `#sx` `#emotion` `#dark-mode`

---

## Purpose

This guide defines the styling conventions for React applications using MUI v7+ with Emotion. It establishes how to style components consistently, leverage the theme system, support dark mode, and avoid common pitfalls with CSS-in-JS. ALWAYS use MUI 7+ APIs — never fall back to v5/v6 patterns.

---

## Styling Approaches (In Priority Order)

### 1. `sx` Prop — For One-Off Styles

Use the `sx` prop for styles that are specific to a single component instance:

```tsx
<Button sx={{ backgroundColor: 'primary.main', mb: 2 }}>
  Click Me
</Button>
```

**When to use:**
- One-off responsive styles
- Quick overrides of default MUI styles
- Styles that won't be reused elsewhere

**Rules:**
- Use theme-aware values (`'primary.main'`, not `'#1976d2'`)
- Use MUI spacing units (`mb: 2`, not `marginBottom: '16px'`)
- Never write hardcoded color hex values

### 2. `styled()` — For Reusable Styled Components

Use `styled()` from `@mui/material/styles` when the same styles appear in multiple places:

```tsx
const CustomButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  '&:hover': { backgroundColor: theme.palette.primary.dark },
}));
```

**When to use:**
- Reusable component variants
- Components with pseudo-class styles (`:hover`, `:focus`)
- Wrapper components that need consistent styling

### 3. Theme `styleOverrides` — For Global Component Defaults

For changing MUI component defaults globally, use theme overrides:

```tsx
const theme = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});
```

**When to use:**
- Changing MUI defaults across the entire app
- Enforcing design system consistency

---

## Theming & Customization

### Theme Structure

```typescript
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#f50057' },
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system',
  },
  direction: 'ltr', // or 'rtl'
});
```

### Dark Mode

- MUI v7 supports CSS variables-based color scheme switching — use this for zero-flash dark/light toggle.
- **Never hardcode colors** — always reference `theme.palette.*` tokens.
- Both light and dark palettes must pass WCAG 2.1 AA contrast (4.5:1 text, 3:1 large text/UI).
- User theme preference should be persisted via the user profile or localStorage.

### Design Tokens

Centralize repeated design values in a shared tokens file:

```typescript
// src/theme/page-patterns.ts
export const PAGE_HEADER = { mb: 4, borderRadius: 3 };
export const FORM_CARD = { maxWidth: 560, borderRadius: 3 };
export const ICON_BOX = { p: 1.5, borderRadius: 2 };
```

This avoids magic numbers scattered across components.

---

## What to Avoid

| Anti-Pattern | Why | Use Instead |
|---|---|---|
| Inline `style={{}}` objects | Not theme-aware, no pseudo-classes | `sx` prop |
| CSS modules / Tailwind | Breaks MUI consistency | `sx` or `styled()` |
| Custom `className` strings | Bypasses theme system | `sx` or `styled()` |
| Hardcoded `#RRGGBB` values | Breaks dark mode, hard to maintain | `theme.palette.*` tokens |
| Manual `createTheme()` per component | Fragments the theme | Single theme with `ThemeProvider` |
| Raw hex colors for icon backgrounds | Doesn't respect palette | Semantic color tokens |
| TextField with both `label` and `placeholder` without `inputLabel: { shrink: true }` | Label overlaps placeholder text visually | Add `slotProps={{ inputLabel: { shrink: true } }}`. For native selects: `slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}`. For Autocomplete: add to renderInput TextField. |

---

## RTL & Bidirectional Styling

- Default layout direction is RTL (`dir="rtl"`). Components must render correctly in RTL without manual overrides.
- Never hardcode `margin-left`/`margin-right`/`padding-left`/`padding-right` pixel values — use logical CSS properties or MUI `sx` shorthand that respects direction.
- Use `useTheme().direction` to conditionally adjust layout when LTR adjustments are needed.
- Icons should auto-flip with RTL via `@mui/stylis-plugin-rtl`.

---

## Typography Standards

Use consistent typography variants across the app:

| Element | Variant | Usage |
|---|---|---|
| Page titles | `h4`, `component="h1"`, `fontWeight: 700` | One per page |
| Page subtitles | `body1`, `color="text.secondary"` | Below page title |
| Section headers | `h6`, `fontWeight: 600` | Within cards |
| Card/table labels | `subtitle2`, `color="text.secondary"` | Field labels |

**Rule:** One `<h1>` per page. Don't skip heading levels.

---

## Responsive Design

- **Primary targets:** `lg` (≥1280px, desktop) and `md` (≥768px, laptop/tablet).
- Use desktop-first breakpoint logic: `sx={{ display: { xs: 'block', md: 'flex' } }}`.
- Complex data tables may use `overflow-x: auto` as a small-screen fallback.
- MUI's `Grid`, `Box`, and breakpoint utilities should handle all responsive behavior.

---

## Performance Considerations

- Use modular imports to reduce bundle size: `import Button from '@mui/material/Button'` instead of importing the entire library.
- Wrap expensive child components in `React.memo()` only when profiling confirms unnecessary re-renders.
- Stabilize `sx` objects with `useMemo` if they're recomputed on every render with heavy calculations.

---

## Key Takeaways

1. **`sx` for one-offs, `styled()` for reused styles** — clear separation of intent.
2. **Never hardcode colors** — always reference `theme.palette.*` tokens.
3. **Design tokens over magic numbers** — centralize repeated values.
4. **Dark mode from day one** — it's harder to retrofit.
5. **Logical CSS for RTL safety** — avoid directional physical properties.
6. **Modular imports** — keep bundle size small.
7. **Label + Placeholder overlap** — always add `slotProps={{ inputLabel: { shrink: true } }}` when a TextField has both `label` and `placeholder` to prevent visual overlap.

---

## Cross-References

- [MUI RTL & Bidirectional Guide](./mui-rtl-bidirectional.md) — full RTL/LTR setup
- [React Architecture](../react/react-architecture.md) — component structure
- [React Performance](../react/react-performance.md) — memoization and optimization
- [Accessibility Standards](../../02-engineering-practices/accessibility-standards.md) — WCAG compliance and color contrast
- [Frontend Architecture](../../04-architecture/frontend-architecture.md) — UI/logic separation
