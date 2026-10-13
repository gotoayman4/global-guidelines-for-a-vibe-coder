---
status: "Normative"
scope: "Global — All Projects (Bilingual by Default)"
tags: [rtl, arabic, bidirectional, numerals]
---

# RTL Tech Stack — Arabic-Optimized Development

---

**Bilingual-first:** All projects are English + Arabic by default. Every feature MUST be designed bidirectional from the start.

## Directives

1. **Numerals:** UI chrome defaults to Western Arabic (0–9) via `new Intl.NumberFormat('ar-u-nu-latn')`. Do NOT globally forbid Arabic-Indic numerals: writing/publishing/education/legal/religious products may define a per-context numeral policy (chrome = Western; user content = preserve-as-typed; documents = product default; search = normalize internally). Never mix systems in one control.
2. **Version verification:** before pinning any RTL-critical package, verify the latest stable version via web/npm. Pin older majors only with an ADR (documented RTL regression, no migration guide, or plugin lag).
3. **UI foundation choice is free but must be proven and recorded:** MUI 7+ (mature, complete widgets, stylis runtime flip) OR shadcn/ui + Tailwind v4 + @base-ui/react (zero-runtime logical properties, source ownership) OR custom design system. Record in PRD/ADR. Existing MUI apps are NOT recommended to migrate solely for RTL performance.
4. **Logical CSS everywhere in UI chrome:** Tailwind `ms-* me-* ps-* pe-* start-* end-* text-start text-end border-s rounded-s`; Emotion/styled-components `margin-inline-start`, `padding-inline-end`, `border-inline-start`. Physical properties (`ml-* pl-* left-* right-* text-left`) FORBIDDEN outside explicit LTR contexts (code, URLs, emails, phone numbers, math, logos).
5. **Single direction state** ('rtl'/'ltr') applied BEFORE first render (inline script sets `document.documentElement.dir`) — never hardcoded 'ltr', never dir set only in React.
6. **Portal `dir` is per-stack, not global.** Portals escape the React parent; they still inherit `direction` from `<html>` when the app owns direction on `document.documentElement`. Pass explicit `dir` where direction must differ from the page, or where the stack keeps direction in a React context only (e.g. shadcn `DirectionProvider` without `documentElement.dir`). Record which the project uses.
7. **Icons:** directional (arrows, chevrons) MUST flip (`rtl:rotate-180` or centralized scaleX(-1) helper); non-directional (home, search, settings), logos, media controls MUST NOT flip. Never maintain separate LTR/RTL icon sets.
8. **Fonts:** always Arabic + Latin fallbacks (Tajawal/Cairo/Noto Sans Arabic for UI; Noto Naskh/Amiri for long-form). Load with `unicode-range` subsetting (Arabic fonts are 3–5x larger). Arabic typography: line-height 1.6–1.8 · weight ≥400 · NO tracking/letter-spacing · NO opacity on Arabic text · underline-offset ≥4px · no break-all.
9. **Dates/numbers/currency ALWAYS via Intl formatters or React Aria I18nProvider** — never manual strings. Hijri: `calendar: "islamic-umalqura"`.
10. **i18n keys for all user-facing strings** (react-i18next / next-intl); URL strategy `/en/*` and `/ar/*`.
11. **Testing scales with mode (see `../01-workflow-methodology/speed-tiered-workflow.md`):** always-on cheap gate = logical-properties lint (cross-platform ESLint rule — unlike `rtlify-ai`, which is POSIX-only and scans 0 files on Windows). vibe = one direction per iteration, both directions at the milestone/ship boundary; standard/guarded = dual Playwright projects (ar-SA + en-US) before commit, Storybook direction toolbar for shared components. Visual regression is a milestone/ship-boundary activity, never routine.

---

## Canonical Patterns

```javascript
new Intl.NumberFormat('ar-u-nu-latn').format(1234)   // "1,234" UI chrome
new Intl.NumberFormat('ar-u-nu-arab').format(1234)   // "١٬٢٣٤" when policy allows
new Intl.DateTimeFormat('ar-SA', { year:'numeric', month:'long', day:'numeric' })
```

```css
body { font-family: 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', sans-serif; }
[lang="ar"] { line-height: 1.75; letter-spacing: 0; }
```

```bash
pnpm dlx shadcn@latest init --rtl   # if shadcn chosen
npm run lint:rtl                    # CI gate — logical-properties ESLint rule (cross-platform)
```

---

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Physical CSS properties | Logical properties exclusively |
| Accidental numeral mixing | Per-context numeral policy via Intl |
| Hardcoded direction | Single state applied pre-render |
| No RTL testing | Dual-direction E2E per mode — lint always-on; both directions at commit (standard/guarded) or milestone (vibe) |
| Latin-only font stack | Arabic fallbacks included |
| Flipping non-directional icons | Directional only |
| Manual date/number formatting | Intl formatters |
| `tracking-*` / opacity on Arabic | letter-spacing 0; opaque tokens |
| Portal needing `dir` (differs from document / context-only stack) without one | Set `dir` where the mechanism requires it; document-driven stacks inherit from `<html>` |

---

## Cross-References

- **Extended by:** `mui/mui-rtl-bidirectional.md`, `shadcn/shadcn-rtl-bidirectional.md`
- **Depends on:** `accessibility-standards.md`
- **Governed by:** `../02-engineering-practices/bidirectional-design-principles.md`
