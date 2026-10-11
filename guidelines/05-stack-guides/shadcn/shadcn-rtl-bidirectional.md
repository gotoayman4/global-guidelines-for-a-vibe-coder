---
status: "Normative"
scope: "Stack (shadcn/ui + Tailwind CSS v4)"
tags: [shadcn, tailwind, rtl, i18n, bidirectional, radix, base-ui, logical-properties]
---

# shadcn/ui + Tailwind CSS v4 — RTL & Bidirectional UI Guide

**Version:** shadcn/ui latest (RTL support since Jan 2026), Tailwind CSS v4
**Tags:** `#shadcn` `#tailwind` `#rtl` `#i18n` `#bidirectional` `#arabic` `#radix` `#base-ui` `#logical-properties`

---

## When to Choose This Stack

Choose shadcn/ui when you need custom visual identity, full component source ownership, or zero-runtime RTL. Choose MUI when you need the complete widget ecosystem (DataGrid, DatePickers, Charts) out of the box — MUI 7+ RTL is mature and equally valid. Record the decision in a PRD/ADR.

| Dimension | shadcn/ui + Tailwind v4 | MUI + stylis-plugin-rtl |
|---|---|---|
| RTL mechanism | Browser-native logical properties | Runtime CSS-in-JS flipping |
| Runtime overhead | 0 | ~50–100ms per re-render |
| CSS output | 1x | ~1.6x (duplicated rules) |
| Complex widgets | Build yourself | Included |

---

## Directives

1. Logical CSS classes ONLY in UI chrome: `ms-* me-* ps-* pe-* start-* end-* text-start text-end rounded-s rounded-e border-s border-e`. Physical classes (`ml-* pl-* left-* right-* text-left text-right`) FORBIDDEN — allowed only inside explicit LTR contexts: code blocks, URLs, emails, phone numbers, math, logos.
2. `<html>` MUST carry both `lang` and `dir` before first paint — inline script in `<head>` reads localStorage/browser locale and sets `document.documentElement.dir`. Setting dir only in React is forbidden (too late; browser already painted).
3. `DirectionProvider` MUST wrap the entire app; `I18nProvider locale="ar-SA"` for dates/numbers/locale. Direction toggle MUST update `document.documentElement.dir`, not just React state.
4. ALL portal-based components MUST receive explicit `dir` (DialogContent, PopoverContent, DropdownMenuContent, TooltipContent, SheetContent, SelectContent, CommandDialog, HoverCardContent, ContextMenuContent) — portals escape both the `DirectionProvider` and the React parent, so a context-only stack loses direction at the portal. Nested portals each need their own `dir`.
5. Icon mirroring: directional icons (arrows, chevrons, back/forward) MUST flip via `className="rtl:rotate-180"`. Non-directional (home, search, settings), logos, media-player controls MUST NOT flip.
6. Arabic typography: line-height 1.6–1.8 · font-weight ≥400 · NO letter-spacing/tracking (disconnects cursive letters) · NO opacity on Arabic text blocks (jagged in Firefox) · no `word-break: break-all` · underline-offset ≥4px on links. Font stack MUST include Arabic fallbacks; load Arabic fonts with `unicode-range` subsetting (they are 3–5x larger than Latin).
7. Mixed content: wrap LTR spans inside RTL sentences (`<span dir="ltr" lang="en">`); unknown-direction user content in `<bdi>`; email/URL/phone inputs forced `dir="ltr"` even on RTL pages.
8. Every component MUST be tested in BOTH directions before merge, scaled by mode (see `speed-tiered-workflow.md`): vibe = one direction per iteration, both at the milestone/ship boundary; standard/guarded = dual-direction before commit. Always-on cheap gate = logical-properties lint (an ESLint rule forbidding physical properties — cross-platform, unlike `rtlify-ai`, which is POSIX-only and scans 0 files on Windows). Storybook direction toolbar + Playwright dual projects (`chromium-rtl` ar-SA / `chromium-ltr` en-US) for standard/guarded. Visual regression per direction is a milestone/ship-boundary activity, never routine — routine checks use DOM/data assertions, no screenshots.
9. All user-facing strings via i18n keys (react-i18next / next-intl). Numbers: Western numerals for UI chrome via `useNumberFormatter({ numberingSystem: "latn" })`; Hijri dates via `calendar: "islamic-umalqura"` when needed.
10. Accessibility in RTL: focus/tab order follows visual right-to-left flow; skip-link appears on the right; form error icons on inline-start side; toggles flip direction; NEVER mirror media controls; NEVER add tabindex to override DOM order.
11. Performance: use logical properties instead of `[dir="rtl"]` selector overrides; never scaleX(-1) on many elements; profile portal rendering in RTL.

---

## Canonical Patterns

Flicker prevention (before `<body>`):

```html
<script>
(function(){try{var s=localStorage.getItem('app-dir');
if(s==='rtl'||s==='ltr'){document.documentElement.setAttribute('dir',s);}
else{var l=(navigator.language||'').toLowerCase();
document.documentElement.setAttribute('dir',(l.startsWith('ar')||l.startsWith('he')||l.startsWith('fa')||l.startsWith('ur'))?'rtl':'ltr');}}catch(e){}})();
</script>
```

Root layout:

```tsx
<html lang="ar" dir="rtl">
  <body>
    <I18nProvider locale="ar-SA">
      <DirectionProvider direction="rtl">{children}</DirectionProvider>
    </I18nProvider>
  </body>
</html>
```

Portal with explicit dir:

```tsx
<DialogContent dir="rtl">
  <Popover><PopoverContent dir="rtl">...</PopoverContent></Popover>
</DialogContent>
```

Init/migrate:

```bash
pnpm dlx shadcn@latest create --template next --rtl   # new project
pnpm dlx shadcn@latest migrate rtl                    # existing project
npm run lint:rtl                                      # CI audit — logical-properties ESLint rule (cross-platform)
```

---

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Physical CSS classes | Logical classes |
| Portal without `dir` prop | Explicit dir always |
| `tracking-*` on Arabic | `[lang="ar"] { letter-spacing: 0 }` |
| Opacity on Arabic text | Opaque color tokens |
| `word-break: break-all` on Arabic | `normal` |
| Auto-flipping all icons | Flip directional only |
| dir set only in React | Inline script pre-paint |
| Skipping dual-direction testing | Dual-direction per mode: lint always-on; E2E both directions at commit (standard/guarded) or milestone (vibe) |

---

## Cross-References

- **Depends on:** `rtl-tech-stack.md`, `accessibility-standards.md`
- **Extended by:** `../mui/mui-rtl-bidirectional.md` (MUI alternative)
- **Applied by:** `playwright-e2e.md`, `frontend-architecture.md`, `responsive-design.md`
