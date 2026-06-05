# shadcn/ui + Tailwind CSS v4 — RTL & Bidirectional UI Guide

**Status:** Normative
**Scope:** Stack (shadcn/ui + Tailwind CSS v4)
**Version:** shadcn/ui latest (RTL support since Jan 2026), Tailwind CSS v4
**Token Tier:** Full (~2,800 tokens)
**Last Updated:** 2026-05-26
**Tags:** `#shadcn` `#tailwind` `#rtl` `#i18n` `#bidirectional` `#arabic` `#radix` `#base-ui` `#logical-properties`

---

## Purpose

This guide defines how to build and maintain a bidirectional (RTL/LTR) web UI using **Tailwind CSS v4 + shadcn/ui (Nova/base-ui style) + @base-ui/react + React Aria**. It covers project initialization, first-paint flicker prevention, logical CSS conventions, portal direction handling, icon mirroring, Arabic typography, accessibility, testing, and performance — all essential for Arabic-first applications.

---

## Why This Stack Over MUI for RTL

This section explains when and why to choose shadcn/ui over MUI. **MUI 7+ remains a fully valid, production-tested RTL option** — this guide exists alongside `mui/mui-rtl-bidirectional.md`, not in replacement of it. The choice depends on your product's needs:

| Dimension | MUI + stylis-plugin-rtl | Tailwind v4 + shadcn/ui RTL |
|---|---|---|
| **RTL mechanism** | Runtime CSS-in-JS flipping via stylis plugin | Browser-native CSS logical properties |
| **Runtime overhead** | ~50–100ms per re-render (stylis processing) | Zero (browser handles mirroring) |
| **CSS output** | ~1.6x CSS volume (duplicated rules) | 1x (single logical rule serves both directions) |
| **Code ownership** | Black-box npm dependency | shadcn copies source into your project |
| **Visual aesthetic** | Material Design–opinionated | Unopinionated — full design control |
| **Built-in complex widgets** | DataGrid, Date/Time Pickers, Charts, Tree View | Must build or find alternatives |
| **Upfront engineering** | Low (full component library out of box) | Higher (build internal design system from primitives) |
| **Escape hatches** | `/* @noflip */` directives scattered in code | Explicit choice: logical (`ms-4`) vs physical (`ml-4`) |
| **Direction switching** | Requires Emotion cache swap + theme rebuild | Single `document.documentElement.dir` change |
| **Arabic typography** | Fights Material defaults | Full control via Tailwind tokens |
| **Production maturity** | Years of enterprise RTL usage | shadcn RTL: Jan 2026 (new but well-tested) |

**Choose shadcn/ui when:** You need custom visual identity (academic IDEs, publishing tools, editors), full component source ownership, zero-runtime RTL, or designs that must break away from Material Design aesthetics.

**Choose MUI when:** You need a complete component ecosystem out of the box (DataGrid, DatePickers, Charts), faster initial delivery, enterprise dashboard patterns, or your team already has MUI expertise. MUI's RTL support is mature and battle-tested with years of production Arabic usage.

**Both are valid choices.** Record the decision in the project PRD or an ADR.

---

## Project Initialization

### New Project (Recommended)

```bash
# Create with Next.js template and RTL enabled from start
pnpm dlx shadcn@latest create --template next --rtl

# Or initialize in existing project
pnpm dlx shadcn@latest init --rtl
```

### Existing Project Migration

```bash
# Migrate all components to logical classes
pnpm dlx shadcn@latest migrate rtl

# Migrate a specific path
pnpm dlx shadcn@latest migrate rtl ./src/components/ui
```

### Required Dependencies

```json
{
  "dependencies": {
    "tailwindcss": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "lucide-react": "latest",
    "@radix-ui/react-direction": "latest",
    "@react-aria/i18n": "latest"
  }
}
```

---

## Direction Management — Avoiding First-Paint Flicker

### The Non-Negotiable Rules

```
REQUIRE:
- <html> MUST have both lang and dir attributes before first paint
- DirectionProvider MUST wrap the entire application
-Portal components MUST receive explicit dir when nested
- Direction toggle MUST update document.documentElement.dir, not just React state

FORBID:
- Setting dir only in React (it's too late — browser already painted)
- Assuming portal components inherit dir from parent DOM tree
- Using physical CSS classes (ml-*, pl-*, left-*, right-*, text-left, text-right)
```

### Inline Script for Flicker Prevention

Place BEFORE `<body>` in `index.html`:

```html
<script>
  (function(){
    try {
      var saved = localStorage.getItem('app-dir');
      if (saved === 'rtl' || saved === 'ltr') {
        document.documentElement.setAttribute('dir', saved);
      } else {
        var lang = (navigator.language || '').toLowerCase();
        document.documentElement.setAttribute('dir',
          (lang.startsWith('ar') || lang.startsWith('he') || lang.startsWith('fa') || lang.startsWith('ur'))
            ? 'rtl' : 'ltr'
        );
      }
    } catch(e) {}
  })();
</script>
```

### Root Layout with DirectionProvider + I18nProvider

```tsx
import { DirectionProvider } from "@/components/ui/direction";
import { I18nProvider } from "@react-aria/i18n";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <I18nProvider locale="ar-SA">
          <DirectionProvider direction="rtl">
            {children}
          </DirectionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
```

### Runtime Direction Toggle

```tsx
function DirectionToggle() {
  const [dir, setDir] = useState<"rtl" | "ltr">(() =>
    (document.documentElement.dir as "rtl" | "ltr") || "rtl"
  );

  const toggle = () => {
    const next = dir === "rtl" ? "ltr" : "rtl";
    document.documentElement.dir = next;
    document.documentElement.lang = next === "rtl" ? "ar" : "en";
    localStorage.setItem("app-dir", next);
    setDir(next);
  };

  return <Button onClick={toggle}>تبديل الاتجاه</Button>;
}
```

---

## Logical CSS Properties — The Core Convention

Tailwind v4 generates logical property equivalents. These MUST be used in all components:

### Mapping Table

| Physical (FORBIDDEN) | Logical (REQUIRED) | CSS Property |
|---|---|---|
| `ml-4` | `ms-4` | `margin-inline-start` |
| `mr-4` | `me-4` | `margin-inline-end` |
| `pl-4` | `ps-4` | `padding-inline-start` |
| `pr-4` | `pe-4` | `padding-inline-end` |
| `left-0` | `start-0` | `inset-inline-start` |
| `right-0` | `end-0` | `inset-inline-end` |
| `text-left` | `text-start` | `text-align: start` |
| `text-right` | `text-end` | `text-align: end` |
| `rounded-l` | `rounded-s` | `border-start-start-radius` + `border-end-start-radius` |
| `rounded-r` | `rounded-e` | `border-start-end-radius` + `border-end-end-radius` |
| `border-l` | `border-s` | `border-inline-start` |
| `border-r` | `border-e` | `border-inline-end` |

### Exception: When Physical Classes Are Allowed

Physical classes (non-logical) are ONLY permitted in these contexts:

```
ALLOWED:
- Code blocks, code snippets, and pre-formatted text (dir="ltr")
- URLs and email addresses (dir="ltr")
- Phone numbers (dir="ltr")
- Mathematical formulas
- LTR-only content sections explicitly marked dir="ltr"
- Logos and brand marks whose direction must not change

FORBIDDEN anywhere else:
- Any UI chrome, layout, or component styling
```

---

## Portal Component RTL Handling

Portal-based components render outside the React tree into `document.body` and DO NOT inherit `dir` from parents.

### Known Issue: tw-animate-css

The `tw-animate-css` package has an open bug (#67) where logical slide animation selectors break in RTL. **Workaround**: pass `dir` explicitly on all portal content:

```tsx
// ALL portal components must receive explicit dir
<DialogContent dir="rtl">...</DialogContent>
<PopoverContent dir="rtl">...</PopoverContent>
<DropdownMenuContent dir="rtl">...</DropdownMenuContent>
<TooltipContent dir="rtl">...</TooltipContent>
<SheetContent dir="rtl">...</SheetContent>
<SelectContent dir="rtl">...</SelectContent>
<CommandDialog dir="rtl">...</CommandDialog>
<HoverCardContent dir="rtl">...</HoverCardContent>
<ContextMenuContent dir="rtl">...</ContextMenuContent>
```

### Nested Portals

When a portal component (Popover) is inside another portal (Dialog), BOTH need `dir`:

```tsx
<DialogContent dir="rtl">
  <Popover>
    <PopoverTrigger>خيارات</PopoverTrigger>
    <PopoverContent dir="rtl">...</PopoverContent>
  </Popover>
</DialogContent>
```

### Component Acceptance Criteria

No portal-based component is accepted unless:
- It renders correctly in Arabic RTL mode
- Content alignment follows the container direction
- Focus management works in RTL tab order
- It passes keyboard navigation testing in both directions

---

## Icon Mirroring

### Rules

| Icon Type | RTL Behavior | Implementation |
|---|---|---|
| Directional (arrows, chevrons, back/forward, next/prev) | MUST flip | `className="rtl:rotate-180"` |
| Non-directional (home, search, settings, user, plus) | MUST NOT flip | No transform |
| Text-related (bullet list, indent, outdent, blockquote) | Auto-flip with direction | Browser handles via logical properties |
| Logos and brand marks | MUST NOT flip | Physical positioning allowed |

### Directional Icon Pattern

```tsx
import { ChevronLeft, ArrowLeft, ChevronRight } from "lucide-react";

// Pattern: use the logical-direction variant and rotate in RTL
<ChevronLeft className="rtl:rotate-180" />
<ArrowLeft className="rtl:rotate-180" />

// Alternative: use ChevronRight in LTR, rotate in RTL
<ChevronRight className="ltr:rotate-180" />
```

---

## Arabic Typography

### Font Stack

```css
@theme {
  --font-sans: "Tajawal", "Noto Sans Arabic", ui-sans-serif, system-ui, sans-serif;
  --font-heading: "Cairo", "Tajawal", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --font-serif: "Amiri", "Scheherazade New", "Noto Naskh Arabic", serif;
}
```

### Typography Rules

```
REQUIRE:
- Arabic line-height 1.6–1.8 (vs 1.4–1.5 for Latin) to accommodate diacritics
- Minimum font-weight 400 for Arabic body text (300 is too thin)
- No letter-spacing (tracking-*) on Arabic text — it disconnects cursive letters
- No opacity/alpha on Arabic text — causes jagged rendering in Firefox
- text-underline-offset >= 4px for Arabic links (prevents dot clipping)

FORBIDDEN:
- tracking-* utilities on elements with Arabic content
- word-break: break-all on Arabic text — tears mid-ligature words
- text-black/50 or similar opacity on Arabic text blocks
- Latin-only font stacks without Arabic fallbacks
```

### Direction-Specific Typography

```css
[lang="ar"] {
  line-height: 1.75;
  letter-spacing: 0;
}

[lang="en"] {
  line-height: 1.5;
}

/* Editor / long-form reading */
.editor-content[dir="rtl"] {
  font-family: var(--font-serif);
  line-height: 1.9;
}
```

### Arabic Font Loading Optimization

Arabic fonts are 3–5x larger than Latin fonts. Use `unicode-range` to split:

```css
@font-face {
  font-family: "Tajawal";
  src: url("/fonts/Tajawal-Regular.woff2") format("woff2");
  unicode-range: U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF;
  font-weight: 400;
}
```

---

## Bidirectional Text Handling

### Mixing Arabic and English in Content

```tsx
// LTR content inside RTL sentence — wrap with dir="ltr"
<p>
  اقرأ المزيد عن{" "}
  <span dir="ltr" lang="en">React Server Components</span>{" "}
  في الوثائق
</p>

// Unknown-direction user content — use <bdi> or dir="auto"
<p>
  المستخدم <bdi>{userName}</bdi> أضاف تعليقاً
</p>

// Numbers inside Arabic text — wrap with <bdi>
<p>
  سجل <bdi>{userCount.toLocaleString("en")}</bdi> مستخدمين جدد
</p>
```

### LTR-Only Inputs in RTL Pages

```tsx
{/* Email, URL, phone inputs must stay LTR even in RTL pages */}
<Input dir="ltr" type="email" placeholder="user@example.com" />
<Input dir="ltr" type="url" placeholder="https://example.com" />
<Input dir="ltr" type="tel" placeholder="+966 50 000 0000" />
```

### Mixed Direction at Multiple Levels

The application MUST support direction at multiple granularity levels:

| Level | Direction | Example |
|---|---|---|
| App shell | `rtl` | Entire UI chrome |
| Workspace panel | `rtl` | Sidebar, inspector |
| Editor document | `rtl` or `ltr` | Per-document direction |
| Paragraph | `rtl` or `ltr` | Per-paragraph override |
| Inline span | `bdi` / `dir="auto"` | Mixed Arabic-English |
| LTR-only inputs | `ltr` | Email, URL, phone, code |

---

## Internationalization with React Aria

### I18nProvider Setup

```tsx
import { I18nProvider, useLocale } from "@react-aria/i18n";

function App() {
  return (
    <I18nProvider locale="ar-SA">
      <AppContent />
    </I18nProvider>
  );
}

function AppContent() {
  const { locale, direction } = useLocale();
  return (
    <html lang={locale} dir={direction}>
      {/* app content */}
    </html>
  );
}
```

### Date Formatting

```tsx
import { useDateFormatter } from "@react-aria/i18n";

function DateDisplay({ date }: { date: Date }) {
  const gregorianFormatter = useDateFormatter({ dateStyle: "long" });
  const hijriFormatter = useDateFormatter({
    dateStyle: "long",
    calendar: "islamic-umalqura", // Umm al-Qura — Saudi standard
  });

  return (
    <div>
      <p>{gregorianFormatter.format(date)}</p>
      <p className="text-muted-foreground">{hijriFormatter.format(date)}</p>
    </div>
  );
}
```

### Number Formatting with Numeral Control

```tsx
import { useNumberFormatter } from "@react-aria/i18n";

function FormattedNumber({ value }: { value: number }) {
  // UI chrome: Western Arabic numerals (0-9)
  const westernFormatter = useNumberFormatter({ numberingSystem: "latn" });
  // Document output: Arabic-Indic numerals (٠١٢٣)
  const easternFormatter = useNumberFormatter({ numberingSystem: "arab" });

  return <span>{westernFormatter.format(value)}</span>;
}
```

### React Aria Locale Support

Arabic is supported: `ar-AE` (United Arab Emirates). Override as needed: `ar-SA`, `ar-EG`, etc.

Supported features:
- Localized date/number formatting
- Right-to-left mirroring
- RTL keyboard navigation
- Hijri calendar via `@internationalized/date`

---

## Automated RTL Auditing

```bash
# Install RTL detection tool
npx rtlify-ai init

# Check for violations (integrate into CI)
npx rtlify-ai check

# Auto-fix simple violations
npx rtlify-ai fix
```

CI Integration:

```yaml
# GitHub Actions
- name: RTL Audit
  run: npx rtlify-ai check
```

---

## Testing RTL

### Storybook RTL Setup

```tsx
// .storybook/preview.tsx
import { DirectionProvider } from "@/components/ui/direction";

export const globalTypes = {
  direction: {
    name: "Direction",
    defaultValue: "ltr",
    toolbar: {
      items: [
        { value: "ltr", title: "LTR (English)" },
        { value: "rtl", title: "RTL (Arabic)" },
      ],
    },
  },
};

export const decorators = [
  (Story, context) => {
    const isRTL = context.globals.direction === "rtl";
    return (
      <DirectionProvider direction={isRTL ? "rtl" : "ltr"}>
        <div dir={isRTL ? "rtl" : "ltr"} lang={isRTL ? "ar" : "en"}>
          <Story />
        </div>
      </DirectionProvider>
    );
  },
];
```

### Playwright E2E — Dual Direction

```ts
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: "chromium-rtl", use: { locale: "ar-SA", timezoneId: "Asia/Riyadh" } },
    { name: "chromium-ltr", use: { locale: "en-US" } },
  ],
});
```

```ts
test("page renders correctly in RTL", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  // Sidebar must be on the right in RTL
  const sidebar = page.locator("aside, .sidebar").first();
  const box = await sidebar.boundingBox();
  expect(box!.x).toBeGreaterThan(0);
});
```

### Visual Regression

```ts
test("visual regression — RTL", async ({ page }) => {
  await page.goto("/ar");
  await expect(page).toHaveScreenshot("page-rtl.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });
});
```

### Manual RTL Checklist

- [ ] All pages render correctly with `dir="rtl"`
- [ ] Forms align right-to-left with labels preceding inputs
- [ ] Tables scroll right-to-left
- [ ] Portal components (Dialog, Popover, DropdownMenu, Select, Sheet) appear in correct position
- [ ] Navigation and breadcrumbs flow right-to-left
- [ ] Focus order follows visual right-to-left flow
- [ ] Directional icons are flipped, non-directional are not
- [ ] Arabic typography: correct font, line-height, no letter-spacing, no opacity on text
- [ ] Mixed RTL/LTR content renders bidi-correctly (English in Arabic sentences, Arabic in English sentences)
- [ ] Email/URL/phone inputs remain LTR-aligned in RTL pages
- [ ] Numbers use correct numeral system per context

---

## Performance

### Why Logical Properties Win

| Approach | CSS Output | Runtime Cost |
|---|---|---|
| CSS Logical Properties (this stack) | 1x | 0ms |
| stylis-plugin-rtl (MUI) | ~1.6x | ~50–100ms per re-render |
| RTLCSS (post-build) | 2x | 0ms (build-time overhead) |

CSS logical properties use a **single rule** that the browser mirrors natively. No duplication, no runtime CSS generation, no `/* @noflip */` escape hatches.

### Performance Rules

```
REQUIRE:
- Lazy-load Arabic fonts with unicode-range to avoid loading unused glyphs
- Use CSS logical properties — never [dir="rtl"] selector overrides (each adds selector evaluation cost)
- Profile portal component rendering in RTL mode — nested portals can cascade re-renders

FORBIDDEN:
- scaleX(-1) on large numbers of elements (creates stacking context per element)
- [dir="rtl"] CSS overrides when logical properties can be used instead
- Arabic font files loaded without unicode-range subsetting
```

---

## Accessibility for Arabic UIs

### Non-Negotiable Requirements

```
REQUIRE:
- <html lang="ar" dir="rtl"> — both attributes mandatory
- All interactive elements have accessible labels in the user's language
- Focus order follows visual right-to-left flow
- Skip-to-content link appears on the right side in RTL
- Screen reader announcements use correct Arabic voice (lang="ar" wrappers for mixed content)
- Tab order in RTL follows visual order — verify with keyboard navigation
- Form error icons on the inline-start side (right in RTL)
- Toggle switches flip on/off direction in RTL

FORBIDDEN:
- Mirroring audio/video player controls (play, volume, fullscreen are universal, not directional)
- Adding tabindex to override natural DOM order
```

### Screen Reader Testing Matrix

| Screen Reader | Platform | Arabic Support |
|---|---|---|
| NVDA + Firefox | Windows | Good with `lang="ar"` |
| JAWS | Windows | Requires Arabic voice pack |
| VoiceOver + Safari | macOS/iOS | Native Arabic voice — excellent |
| TalkBack | Android | Good support |

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Physical CSS classes** (`ml-4`, `pr-6`, `left-0`, `text-left`) | Layout breaks in RTL — margins/spacing on wrong side | Use logical classes (`ms-4`, `pe-6`, `start-0`, `text-start`) |
| **Portal components without `dir` prop** | Content renders LTR inside RTL-page portals | Always pass `dir="rtl"` to DialogContent, PopoverContent, etc. |
| **`tracking-*` on Arabic text** | Arabic cursive letters disconnect, text becomes illegible | `[lang="ar"] { letter-spacing: 0 }` |
| **`text-black/50` (opacity) on Arabic** | Jagged rendering of connected glyphs (especially Firefox) | Use opaque color tokens instead |
| **`word-break: break-all` on Arabic** | Words torn mid-ligature | `word-break: normal` on `[lang="ar"]` |
| **Arabic text without LTR fallback font** | Latin characters in Arabic context render in ugly default fallback | Include both Arabic and Latin fonts in stack |
| **Auto-flipping non-directional icons** | Home/search/settings icons look wrong in RTL | Only flip directional icons (arrows, chevrons) |
| **`dir` set only in React (not in HTML)** | First paint shows LTR layout before React mounts (flicker) | Inline script in `<head>` sets `dir` before first paint |
| **Skipping RTL testing** | RTL UI silently broken until Arabic users complain | Run all E2E tests in both directions; Storybook RTL mode |
| **Hardcoded strings instead of i18n** | Cannot switch UI language | Use `react-i18next` or `next-intl` with translation keys |
| **Forgetting `I18nProvider` + `DirectionProvider`** | Dates/numbers not localized; portal components lose direction | Wrap root layout with both providers |
| **Relying on auto-flip for everything** | Numbers, code blocks, logos incorrectly mirrored | Use physical classes in explicit LTR-only contexts |
| **No RTL Storybook story per component** | Components not visually tested in RTL before PR merge | Every shared component MUST have Arabic RTL + English LTR stories |

---

## Key Takeaways

1. **Use logical CSS properties exclusively.** `ms-*`, `ps-*`, `start-*`, `text-start`, `border-s`, `rounded-s` — never `ml-*`, `pl-*`, `left-*`, `text-left`.
2. **Prevent first-paint flicker** with an inline `<script>` that sets `document.documentElement.dir` before React mounts.
3. **Wrap the app in `DirectionProvider` + `I18nProvider`** — @base-ui/react (via Radix DirectionProvider context) handles portal direction inheritance; React Aria handles dates/numbers/locale.
4. **Pass `dir` explicitly to ALL portal content** (DialogContent, PopoverContent, DropdownMenuContent, SheetContent, etc.) — portals do not inherit from parent DOM.
5. **Arabic typography has specific rules:** no `tracking-*`, no opacity on text, line-height 1.6–1.8, minimum font-weight 400, underline offset ≥ 4px.
6. **Wrap LTR content in RTL sentences** with `<bdi>`, `<span dir="ltr">`, or `<span dir="auto">`.
7. **Test every component in both directions.** Storybook RTL mode + Playwright dual-direction projects are mandatory.
8. **Zero runtime RTL overhead** — CSS logical properties are handled natively by the browser. No stylis plugin, no duplicate CSS, no escape hatches.
9. **shadcn/ui RTL is production-ready since Jan 2026** — monitor `tw-animate-css` issue #67 for portal slide animations.
10. **React Aria `I18nProvider`** handles Arabic dates, numbers, calendars, and RTL keyboard navigation in one API.

---

## Cross-References

- **Depends on:** `rtl-tech-stack.md` — general RTL tech stack requirements
- **Depends on:** `accessibility-standards.md` — WCAG requirements for bidirectional UIs
- **Extended by:** `mui-rtl-bidirectional.md` — MUI RTL approach for comparison (when MUI is preferred)
- **Applied by:** `playwright-e2e.md` — E2E testing in both directions
- **Applied by:** `frontend-architecture.md` — component patterns for RTL
- **Applied by:** `responsive-design.md` — responsive layout patterns

---

## Quick-Start Production Template

```bash
pnpm dlx shadcn@latest create --template next --rtl
pnpm add @react-aria/i18n @internationalized/date
```

```tsx
// app/layout.tsx
import { Noto_Sans_Arabic } from "next/font/google";
import { DirectionProvider } from "@/components/ui/direction";
import { I18nProvider } from "@react-aria/i18n";

const fontArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-sans",
  weight: ["400", "500", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={fontArabic.variable}>
      <body>
        <I18nProvider locale="ar-SA">
          <DirectionProvider direction="rtl">
            {children}
          </DirectionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
```
