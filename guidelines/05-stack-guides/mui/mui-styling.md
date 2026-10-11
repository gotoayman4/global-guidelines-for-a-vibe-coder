---
status: "Normative"
scope: "Stack (MUI 7+ / 9+)"
tags: [mui, styling, theme]
---

# MUI Styling Guide (v7 & v9)

**Version:** Covers MUI 7 (legacy) and MUI 9 (new). Do NOT generate MUI v5/v6 patterns. Items marked **v9** apply only to MUI 9+; prefer v9-compatible APIs in v7 too.
**Tags:** `#mui` `#styling` `#theme` `#sx` `#emotion` `#dark-mode`
---

## Directives

1. **Styling priority:** `sx` prop for one-off instance styles → `styled()` for reusable variants/pseudo-classes → theme `styleOverrides` for app-wide component defaults. Never inline `style={{}}`, CSS modules, Tailwind, or custom className strings in MUI projects.
2. **Theme-aware values always:** `'primary.main'` not `'#1976d2'`; MUI spacing units (`mb: 2` not `marginBottom:'16px'`). Hardcoded hex forbidden — dark mode breaks.
3. **v9 breaking rules (apply in v7 too for forward compatibility):**
   - System props REMOVED (`<Box mt={2}>`, `<Typography fontWeight={600}>`) — values silently leak to the DOM. Move into `sx`.
   - Legacy `*Props` pass-throughs removed (`PaperProps`, `InputProps`, `TransitionProps`) — use `slots`/`slotProps` (`slotProps.paper`, `slotProps.input`).
   - Combined `.Mui*` selector classes deleted (`.MuiTabs-flexContainer`, `.MuiAlert-standardError`) — use v9 names (`.MuiTabs-list`, `.MuiAlert-colorError`) or styleOverrides `variants`.
4. **TextField label + placeholder overlap:** always add `slotProps={{ inputLabel: { shrink: true } }}` when both are set. Native selects combine with `slotProps={{ select: { native: true }, … }}`. **v9 Autocomplete:** spread params first — `slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps.inputLabel, shrink: true } }}`.
5. **Dark mode from day one:** CSS-variables scheme switching (`cssVariables: true` + `colorSchemes`) for zero-flash toggle; both palettes pass WCAG AA (4.5:1 text, 3:1 large); preference persisted.
6. **Design tokens over magic numbers:** shared tokens file (`PAGE_HEADER = { mb: 4, borderRadius: 3 }`, …) — no scattered literals.
7. **Typography variants:** page title `h4`/h1 weight 700 (one per page) · subtitle `body1` text.secondary · section headers `h6` w600 · field labels `subtitle2`. No skipped heading levels.
8. **Responsive:** desktop-first; primary targets `lg` ≥1280 and `md` ≥768; `sx={{ display: { xs: 'block', md: 'flex' } }}`; data tables may fall back to `overflow-x: auto`.
9. **Performance:** modular imports (`@mui/material/Button`, never root barrel for size-critical paths); `React.memo` only when profiled; stabilize expensive `sx` objects with `useMemo`.
10. **RTL:** logical properties / direction-aware sx only (see `mui-rtl-bidirectional.md` for full setup).

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Inline style objects | `sx` |
| Hardcoded hex | `theme.palette.*` |
| System props on components | Inside `sx` |
| Legacy `*Props` | `slotProps` |
| Per-component `createTheme` | Single theme + ThemeProvider |

## Cross-References

`./mui-rtl-bidirectional.md` · `../react/react-architecture.md` · `../../02-engineering-practices/accessibility-standards.md`
