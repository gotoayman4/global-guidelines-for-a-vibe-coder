---
status: "Normative"
scope: "Stack (MUI 9+ / 7 legacy)"
tags: [mui, styling, theme, theming]
---

# MUI Styling Guide (v9; v7 legacy)

**Version:** Covers MUI 9 (primary) and MUI 7 (legacy). Do NOT generate MUI v5/v6 patterns. Items marked **v9** apply only to MUI 9+; prefer v9-compatible APIs in v7 too.
**Tags:** `#mui` `#styling` `#theme` `#theming` `#sx` `#emotion` `#dark-mode`
---

## Directives

1. **Styling priority:** `sx` prop for one-off instance styles → `styled()` for reusable variants/pseudo-classes → theme `components.*.styleOverrides`/`variants` for app-wide defaults → `GlobalStyles`/`CssBaseline` for raw HTML and global selectors only. Never inline `style={{}}`, CSS modules, Tailwind, or custom className strings in MUI projects.
2. **Theme-aware values always:** `'primary.main'` not `'#1976d2'`; MUI spacing units (`mb: 2` not `marginBottom:'16px'`). Hardcoded hex forbidden — dark mode breaks.
3. **v9 breaking rules (apply in v7 too for forward compatibility):**
   - System props REMOVED (`<Box mt={2}>`, `<Typography fontWeight={600}>`) — values silently leak to the DOM. Move into `sx`.
   - Legacy `*Props` pass-throughs removed (`PaperProps`, `InputProps`, `TransitionProps`) — use `slots`/`slotProps` (`slotProps.paper`, `slotProps.input`). A component-specific prop still declared in the v9 typings (`Select`'s `MenuProps`/`SelectDisplayProps`) is not legacy — use it where no slot exists.
   - Combined `.Mui*` selector classes deleted (`.MuiTabs-flexContainer`, `.MuiAlert-standardError`) — use v9 names (`.MuiTabs-list`, `.MuiAlert-colorError`) or styleOverrides `variants`.
   - Typography emits **no color classes** — `colorTextSecondary`, `colorInherit` and the rest are gone; only variant/align/noWrap classes remain. A `.MuiTypography-color*` selector silently matches nothing; set ink with `sx`, `styleOverrides`, or `variants`.
   - `Select` has **no `slotProps` prop** — `MenuProps` and `SelectDisplayProps` are its public pass-throughs (`TextField`'s `select` slot is typed as `SelectProps`, so `slotProps.select.MenuProps` works there).
4. **TextField label + placeholder overlap:** always add `slotProps={{ inputLabel: { shrink: true } }}` when both are set. Native selects combine with `slotProps={{ select: { native: true }, … }}`. **v9 Autocomplete:** spread params first — `slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps.inputLabel, shrink: true } }}`.
5. **Dark mode from day one:** `colorSchemes` + `cssVariables: true` (see §Theming) for zero-flash switching; both palettes pass WCAG AA (4.5:1 text, 3:1 large); preference persisted. Check every semantic `.main` as **ink on both surfaces**, not only as a fill — a hue that works as a button background (`#D97706`, `#0D9488`, `#0284C7`) can fail as text. Darken the semantic token rather than pinning a `contrastText`.
6. **Design tokens over magic numbers:** shared tokens file (`PAGE_HEADER = { mb: 4, borderRadius: 3 }`, …) — no scattered literals.
7. **Typography variants:** page title `h4`/h1 weight 700 (one per page) · subtitle `body1` text.secondary · section headers `h6` w600 · field labels `subtitle2`. No skipped heading levels.
8. **Responsive:** desktop-first; primary targets `lg` ≥1280 and `md` ≥768; `sx={{ display: { xs: 'block', md: 'flex' } }}`; data tables may fall back to `overflow-x: auto`.
9. **Performance and imports:** one-level imports (`@mui/material/Button`) rather than the root barrel; one import convention per project, not a mix. The theme is not tree-shakable — a heavy one-off customization is usually a component, not a theme override. `React.memo` only when profiled; stabilize expensive `sx` objects with `useMemo`.
10. **RTL:** logical properties / direction-aware sx only (see `mui-rtl-bidirectional.md` for full setup).

## Theming (v9)

1. **One theme module.** `src/theme/` exports a single `createTheme` result; `ThemeProvider` wraps the app once and `CssBaseline` sits inside it. Compose derived tokens in documented steps — `createTheme` the base, then `createTheme(theme, overrides)` using the result. For independent option objects, merge explicitly and pass one object: multiple arguments are not a formal merge API, even though the runtime deep-merges them.
2. **Color schemes, not `palette.mode` toggles.** `createTheme({ cssVariables: true, colorSchemes: { light: { palette }, dark: { palette } } })`; `useColorScheme()` toggles, and `ThemeProvider` handles storage and tab sync (`storageManager`, `disableTransitionOnChange`, `noSsr`). Render `InitColorSchemeScript` before app content in SSR frameworks to prevent the first-paint flash. With `cssVariables: true`, `colorSchemeSelector` defaults to `'media'` — under it the painted scheme follows the OS and `setMode()` has no visible effect. When the app offers its own toggle, set `'class'` or `'data'`; `'data'` emits `[data-dark]` / `[data-light]`, so a pre-paint script must set that attribute or the first paint flashes.
3. **Access tokens correctly.** With CSS variables enabled prefer `theme.vars.*` in style callbacks; use `theme.applyStyles('dark', { … })` for scheme-specific styles instead of branching on `theme.palette.mode`. Never pass a custom `vars` key — it is reserved.
4. **Token map.** Palette (semantic colors), typography (rem scale), spacing (`theme.spacing`), shape, breakpoints, zIndex, transitions, and `components` (`defaultProps`/`styleOverrides`/`variants`). Feed the project's token file into `createTheme`; sub-`body1` sizes used at call sites come from a typed scale in that file (`compact` / `body` / `micro`), never `0.8125rem` literals. Custom theme keys get `declare module '@mui/material/styles'` augmentation for `Theme`/`ThemeOptions` so components read the theme, not ad-hoc constants.
5. **Typography is configured.** Adjust `theme.typography` variants rather than per-component font sizes; `responsiveFontSizes(theme)` when the scale must adapt across breakpoints.
6. **High contrast is a theme enhancer, applied last.** `enhanceHighContrast(createTheme(...))` merges MUI's per-component `@media (forced-colors: active)` overrides as arrays, so it must wrap the **result** of `createTheme`, not appear among its options; wrap every derived theme handed to a nested `ThemeProvider` too, or that subtree silently loses the HCM overrides. Pass CSS system color keywords, and still meet WCAG AA in the normal schemes.
7. **Global CSS has one home.** Hoist `<GlobalStyles styles={…} />` to a module constant or extend `MuiCssBaseline.styleOverrides`; do not add a global `.css` file. Emotion emits `CssBaseline` globals before component classes, so a global rule that must beat a component's own declaration (hiding app chrome in print, resetting a component's display) needs `!important` — use it sparingly and keep a structural test reading the same source.
8. **A scoped derived theme is not a second theme.** A nested `ThemeProvider` is legitimate for a real scope — dialog-safe `MuiSelect` defaults, a pinned light print sheet — provided the theme is derived from the outer one (`createTheme(theme, overrides)`) and cached per outer theme (a `WeakMap`), never created per render. One **global** theme module remains the rule.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Inline style objects | `sx` |
| Hardcoded hex | `theme.palette.*` / `theme.vars.*` |
| System props on components | Inside `sx` |
| Legacy `*Props` | `slotProps` |
| Per-component `createTheme` / second **global** theme | One theme module; a scoped derived theme is cached per outer theme (`createTheme(theme, overrides)` + `WeakMap`) |
| `CssVarsProvider` | v9 `ThemeProvider` + `cssVariables: true` |
| Global `.css` reset / bare `.Mui-error` selector | `CssBaseline`/`GlobalStyles`; scope state selectors |
| A global rule expected to outrank component CSS | `!important` only for print/override chrome-hide, asserted by a structural test |
| Branching on `theme.palette.mode` for scheme styles | `theme.applyStyles('dark', …)` |
| CSS filter for high contrast | `enhanceHighContrast(theme)`, wrapped around the `createTheme` result |
| `.MuiTypography-color*` selector (v9 emits no color classes) | `sx={{ color }}` / `styleOverrides` / `variants` |
| `slotProps` on `Select` (no such prop) | `MenuProps` / `SelectDisplayProps`; `disablePortal` for selects in dialogs |
| Semantic `.main` verified only as a fill | Check it as ink on both surfaces; darken the token, don't pin `contrastText` |

## Cross-References

`./mui-rtl-bidirectional.md` · `../../08-governance/design-system-governance.md` · `../react/react-architecture.md` · `../../02-engineering-practices/accessibility-standards.md`
