# MUI 7+ RTL & Bidirectional UI Guide

**Status:** Normative  
**Scope:** Stack (MUI 7+ RTL)  
**Version:** MUI 7+ (latest stable). Do NOT generate code for MUI v5 or v6 RTL patterns.
**Token Tier:** Medium (~2,200 tokens)  
**Tags:** `#mui` `#rtl` `#i18n` `#bidirectional` `#arabic` `#emotion`

---

## Purpose

This guide defines how to build and maintain a bidirectional (RTL/LTR) web UI in a React + TypeScript app styled with MUI. It covers first-paint flicker prevention, runtime toggling, Emotion cache setup, internationalization, logical CSS, and icon mirroring — all essential for Arabic/English applications.

---

## The 3 Must-Do Steps for Reliable MUI RTL

You must implement **all three** for consistent behavior:

1. **Set the HTML `dir` attribute early** — preferably before React mounts, to prevent first-paint flicker.
2. **Set `theme.direction`** in MUI's theme: `createTheme({ direction: 'rtl' })`.
3. **Use Emotion cache with Stylis RTL plugin** and wrap the app in `CacheProvider` so generated CSS mirrors correctly.

---

## Avoiding First-Paint Flicker

To prevent a flash of LTR content before React sets RTL, set `<html dir>` synchronously in `index.html` using a tiny inline script:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <script>
      (function(){
        try {
          const saved = localStorage.getItem('app-dir');
          if (saved === 'rtl' || saved === 'ltr') {
            document.documentElement.setAttribute('dir', saved);
          } else {
            const lang = (navigator.language || '').toLowerCase();
            if (lang.startsWith('ar') || lang.startsWith('he') || lang.startsWith('fa'))
              document.documentElement.setAttribute('dir', 'rtl');
            else
              document.documentElement.setAttribute('dir', 'ltr');
          }
        } catch(e) { /* ignore */ }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

This ensures the correct direction is present on the first paint and avoids layout flicker.

---

## Runtime LTR/RTL Toggle (Zero-Flicker)

Key points for runtime direction switching:

- Persist choice in `localStorage` (or via server/DB for logged-in users).
- **Do not** recreate Emotion caches every render — create two stable caches (LTR/RTL) and reuse them.
- Update three things together when toggling: `document.documentElement.dir`, `theme.direction`, and the active Emotion cache.
- If using `react-i18next`, switch the language at the same time so translated strings, date formats, and number formats update consistently.

---

## Emotion Caches & ThemeProvider

Place caches in a module so they're stable singletons:

```typescript
// src/utils/emotionCache.ts
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from '@mui/stylis-plugin-rtl';

export const cacheLtr = createCache({ key: 'muiltr', stylisPlugins: [prefixer] });
export const cacheRtl = createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] });
```

```tsx
// src/DirectionRoot.tsx
function DirectionRoot({ children }: { children: React.ReactNode }) {
  const [dir, setDir] = useState<Dir>(() =>
    (localStorage.getItem('app-dir') as Dir) ||
    (document.documentElement.dir as Dir) ||
    'rtl'
  );

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    localStorage.setItem('app-dir', dir);
    i18n.changeLanguage(dir === 'rtl' ? 'ar' : 'en');
  }, [dir]);

  const theme = useMemo(() => createTheme({
    direction: dir,
    typography: {
      fontFamily: dir === 'rtl'
        ? 'Tajawal, Cairo, system-ui, -apple-system'
        : 'Inter, system-ui, -apple-system'
    }
  }), [dir]);

  const cache = dir === 'rtl' ? cacheRtl : cacheLtr;

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </CacheProvider>
  );
}
```

Wrap your app in `DirectionRoot` in `main.tsx`.

---

## Internationalization

### Translation Strings

- Use `react-i18next` for translations and language switching.
- All user-visible strings must come from translation files — never hardcode Arabic or English text in JSX.
- Switch language and `dir` at the same time for consistency.

### MUI Locales

For MUI components (Date Pickers, Data Grid), load and pass the corresponding MUI locale to the theme or component props when the language changes.

### Numerals

- Use **Western Arabic numerals (`0–9`)** in both Arabic and English UI for dates, counts, and numeric labels.
- Reuse shared date/locale helpers from a centralized utility file — never scatter direct `toLocaleDateString()` / `toLocaleString()` calls or hardcoded locale tags across components.

---

## Styling Guidelines: Logical CSS

- Prefer CSS logical properties: `marginInlineStart`, `paddingInlineEnd`, `insetInlineStart`, etc. These mirror automatically in RTL/LTR.
- Never hardcode `margin-left`/`margin-right`/`padding-left`/`padding-right` — use MUI `sx` shorthand that respects direction.

### Fonts

Bundle appropriate fonts for each direction:

```css
@font-face { /* Tajawal — Arabic body */ }
@font-face { /* Cairo — Arabic headings */ }
html[dir='rtl'] body { font-family: 'Tajawal', 'Cairo', system-ui; }
html[dir='ltr'] body { font-family: 'Inter', system-ui; }
```

---

## Portals (Dialog/Menu) and `dir` Inheritance

Portals render outside the React tree and may not inherit `dir`. Strategies:

1. Set `dir` on `<html>` globally (recommended).
2. Add `dir` explicitly to MUI portals via `container` or `PaperProps={{ dir }}` where needed.

---

## Icon Mirroring

Directional SVG icons are not auto-mirrored. Options:

- Conditionally render L/R variants (preferred for precise control).
- Use `style={{ transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none' }}` on the icon component.

---

## Accessibility for Bilingual Apps

- Set `lang` attribute on `<html>`: `<html lang="ar">` or `<html lang="en">` depending on the language.
- Screen readers must announce content in the correct reading direction.
- Tab order in RTL layouts must follow visual order (right-to-left). Verify with keyboard navigation.
- Arabic text mixed with English content must use `lang="ar"` wrappers so screen readers use the correct voice.
- Date pickers showing both Hijri and Gregorian calendars must have accessible labels for both.

---

## Common RTL Pitfalls

| Pitfall | Why It Breaks | Fix |
|---|---|---|
| Hardcoded `margin-left` for spacing | Doesn't flip in RTL | Use `marginInlineStart` or MUI `sx` direction-aware shorthand |
| English-only font stack | Arabic text renders in fallback fonts | Use directional font stacks |
| CSS `left`/`right` positioning | Doesn't mirror in RTL | Use `insetInlineStart`/`insetInlineEnd` |
| `text-align: left` hardcoded | Doesn't flip | Use `textAlign` from MUI theme or omit (inherits from direction) |
| Forgetting Emotion RTL cache | Styles don't mirror | Always use `stylis-plugin-rtl` in RTL cache |

---

## Key Takeaways

1. **The three must-do steps are non-negotiable** — HTML `dir`, `theme.direction`, and Emotion RTL cache.
2. **Prevent first-paint flicker** with the inline `<script>` in `index.html`.
3. **Stable Emotion caches** — create two, reuse them, never recreate per render.
4. **Logical CSS over physical properties** — automatic mirroring.
5. **i18n + direction switch together** — language, direction, and cache must update atomically.
6. **Western Arabic numerals everywhere** — consistency in both languages.
7. **Test both directions** — RTL is the default; LTR must also work perfectly.

---

## Cross-References

- [MUI Styling Guide](./mui-styling.md) — general MUI styling conventions
- [React Architecture](../react/react-architecture.md) — component patterns
- [Accessibility Standards](../../02-engineering-practices/accessibility-standards.md) — WCAG compliance
- [Playwright E2E Testing](../playwright/playwright-e2e.md) — testing both RTL and LTR
- [Responsive Design](../../06-frontend-patterns/responsive-design.md) — layout patterns
