# MUI RTL & Bidirectional UI Guide (v7 & v9)

**Status:** Normative
**Scope:** Stack (MUI 7+ / 9+ RTL)
**Version:** Covers MUI 7 (legacy projects) and MUI 9 (new projects). Do NOT generate MUI v5/v6 RTL patterns. Items marked **v9** apply only to MUI 9+; prefer v9-compatible APIs in v7 code too.
**Token Tier:** Medium (~1,200 tokens)
**Tags:** `#mui` `#rtl` `#i18n` `#bidirectional` `#arabic` `#emotion`
**Last Updated:** 2026-08-26

---

## Directives

1. **The three must-do steps (non-negotiable):** ① `<html dir>` set synchronously before React mounts (inline script in index.html reading localStorage/browser locale) · ② `createTheme({ direction: 'rtl' })` · ③ Emotion cache with `@mui/stylis-plugin-rtl` wrapped in `CacheProvider`.
2. **Runtime toggle updates THREE things atomically:** `document.documentElement.dir` + `theme.direction` + active Emotion cache — plus i18n language switch if used. Create two STABLE caches (LTR/RTL) as module singletons; never recreate per render. Persist choice in localStorage/server.
3. **Logical CSS only:** `marginInlineStart`, `paddingInlineEnd`, `insetInlineStart/End`, or MUI's direction-aware `sx`. Never hardcoded `margin-left/right`, `left/right`, `text-align: left`.
4. **i18n:** react-i18next; all user-visible strings from translation files — never hardcoded in JSX. Load MUI locale (pickers, DataGrid) on language change. Centralize date/locale helpers — no scattered `toLocaleDateString()`.
5. **Numerals:** Western Arabic (0–9) in both languages. **v9:** override `TablePagination` labels with `Intl.NumberFormat('ar-u-nu-latn')` (locale default yields Eastern digits).
6. **Fonts per direction:** Tajawal/Cairo for Arabic, Inter/system for Latin — declared via `html[dir]` selectors.
7. **Portals may not inherit dir:** set globally on `<html>` (recommended); where needed pass explicit dir via `slotProps={{ paper: { dir } }}` (both v7/v9 — legacy `PaperProps` removed in v9).
8. **Icon mirroring:** directional SVG icons are NOT auto-mirrored — conditional L/R variants or `style={{ transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none' }}`.
9. **Accessibility:** `lang` on `<html>` always; tab order follows visual RTL order; mixed content wrapped in `lang="ar"`; dual-calendar pickers label both calendars accessibly.

## Known Pitfalls

| Pitfall | Fix |
|---|---|
| TextField label overlaps placeholder | `slotProps={{ inputLabel: { shrink: true } }}` |
| **v9:** Autocomplete custom slotProps drops input ref | Spread first: `slotProps={{ ...params.slotProps, inputLabel: { ...params.slotProps.inputLabel, shrink: true } }}` |
| **v9:** Dialog `disableEscapeKeyDown` removed | Handle `reason === 'escapeKeyDown'` inside `onClose` |

## Canonical Pattern

```typescript
// src/utils/emotionCache.ts — stable singletons
export const cacheLtr = createCache({ key: 'muiltr', stylisPlugins: [prefixer] });
export const cacheRtl = createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] });
// DirectionRoot: useMemo theme per dir → <CacheProvider value={cache}><ThemeProvider>…
```

## Cross-References

`./mui-styling.md` · `../react/react-architecture.md` · `../../02-engineering-practices/accessibility-standards.md` · `../playwright/playwright-e2e.md`
