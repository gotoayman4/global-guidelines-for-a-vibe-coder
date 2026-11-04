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
   - Legacy `*Props` pass-throughs removed (`PaperProps`, `InputProps`, `TransitionProps`) — use `slots`/`slotProps` (`slotProps.paper`, `slotProps.input`).
   - Combined `.Mui*` selector classes deleted (`.MuiTabs-flexContainer`, `.MuiAlert-standardError`) — use v9 names (`.MuiTabs-list`, `.MuiAlert-colorError`) or styleOverrides `variants`.
4. **TextField label + placeholder overlap:** always add `slotProps={{ inputLabel: { shrink: true } }}` when both are set. Native selects combine with `slotProps={{ select: { native: true }, … }}`. **v9 Autocomplete:** spread params first — `slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps.inputLabel, shrink: true } }}`.
5. **Dark mode from day one:** `colorSchemes` + `cssVariables: true` (see §Theming) for zero-flash switching; both palettes pass WCAG AA (4.5:1 text, 3:1 large); preference persisted.
6. **Design tokens over magic numbers:** shared tokens file (`PAGE_HEADER = { mb: 4, borderRadius: 3 }`, …) — no scattered literals.
7. **Typography variants:** page title `h4`/h1 weight 700 (one per page) · subtitle `body1` text.secondary · section headers `h6` w600 · field labels `subtitle2`. No skipped heading levels.
8. **Responsive:** desktop-first; primary targets `lg` ≥1280 and `md` ≥768; `sx={{ display: { xs: 'block', md: 'flex' } }}`; data tables may fall back to `overflow-x: auto`.
9. **Performance and imports:** one-level imports (`@mui/material/Button`) rather than the root barrel; one import convention per project, not a mix. The theme is not tree-shakable — a heavy one-off customization is usually a component, not a theme override. `React.memo` only when profiled; stabilize expensive `sx` objects with `useMemo`.
10. **RTL:** logical properties / direction-aware sx only (see `mui-rtl-bidirectional.md` for full setup).

## Theming (v9)

1. **One theme module.** `src/theme/` exports a single `createTheme` result; `ThemeProvider` wraps the app once and `CssBaseline` sits inside it. Compose derived tokens in documented steps — `createTheme` the base, then `createTheme(theme, overrides)` using the result. For independent option objects, merge explicitly and pass one object: multiple arguments are not a formal merge API, even though the runtime deep-merges them.
2. **Color schemes, not `palette.mode` toggles.** `createTheme({ cssVariables: true, colorSchemes: { light: { palette }, dark: { palette } } })`; `useColorScheme()` toggles, and `ThemeProvider` handles storage and tab sync (`storageManager`, `disableTransitionOnChange`, `noSsr`). Render `InitColorSchemeScript` before app content in SSR frameworks to prevent the first-paint flash.
3. **Access tokens correctly.** With CSS variables enabled prefer `theme.vars.*` in style callbacks; use `theme.applyStyles('dark', { … })` for scheme-specific styles instead of branching on `theme.palette.mode`. Never pass a custom `vars` key — it is reserved.
4. **Token map.** Palette (semantic colors), typography (rem scale), spacing (`theme.spacing`), shape, breakpoints, zIndex, transitions, and `components` (`defaultProps`/`styleOverrides`/`variants`). Feed the project's token file into `createTheme`; custom theme keys get `declare module '@mui/material/styles'` augmentation for `Theme`/`ThemeOptions` so components read the theme, not ad-hoc constants.
5. **Typography is configured.** Adjust `theme.typography` variants rather than per-component font sizes; `responsiveFontSizes(theme)` when the scale must adapt across breakpoints.
6. **High contrast is a theme enhancer.** `enhanceHighContrast(createTheme())` adds `@media (forced-colors: active)` overrides for Windows High Contrast; pass CSS system color keywords, and still meet WCAG AA in the normal schemes.
7. **Global CSS has one home.** Hoist `<GlobalStyles styles={…} />` to a module constant or extend `MuiCssBaseline.styleOverrides`; do not add a global `.css` file.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Inline style objects | `sx` |
| Hardcoded hex | `theme.palette.*` / `theme.vars.*` |
| System props on components | Inside `sx` |
| Legacy `*Props` | `slotProps` |
| Per-component `createTheme` / second `ThemeProvider` | One theme module + `ThemeProvider` |
| `CssVarsProvider` | v9 `ThemeProvider` + `cssVariables: true` |
| Global `.css` reset / bare `.Mui-error` selector | `CssBaseline`/`GlobalStyles`; scope state selectors |
| Branching on `theme.palette.mode` for scheme styles | `theme.applyStyles('dark', …)` |
| CSS filter for high contrast | `enhanceHighContrast(theme)` |

## Cross-References

`./mui-rtl-bidirectional.md` · `../../08-governance/design-system-governance.md` · `../react/react-architecture.md` · `../../02-engineering-practices/accessibility-standards.md`
