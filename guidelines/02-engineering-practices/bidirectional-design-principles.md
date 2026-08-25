# Bidirectional Design Principles — Arabic-First, RTL-Native UX

**Status:** Normative
**Scope:** Global — All Projects (Bilingual by Default)
**Token Tier:** Full (~2,200 tokens)
**Last Updated:** 2026-05-26
**Cross-References:** `rtl-tech-stack.md`, `accessibility-standards.md`, `ux-design-principles.md`, `frontend-architecture.md`, `visual-design-principles.md`, `icon-usage.md`

---

## Purpose

Define the universal design principles for building interfaces that support bidirectional (RTL + LTR) text. These principles are **not stack-specific** — they apply whether you use MUI, shadcn/ui + Tailwind, or a custom design system. Arabic-first means Arabic is a first-class architectural requirement, not a localization afterthought. Bilingual-by-default means every feature, page, and component MUST be designed for bidirectional text from the start.

**Scope clarification:** `bidirectional-design-principles.md` provides design heuristics and architectural guidance. `rtl-tech-stack.md` provides implementation commands, CSS rules, and tooling. When a rule appears in both files, `rtl-tech-stack.md` takes precedence on implementation specifics (exact CSS classes, exact tool commands, exact test procedures), while this file governs the design rationale.

---

## Principle 1: Bidirectional-First Architecture

Arabic support MUST NOT be treated as a post-development localization layer. The application architecture MUST assume both RTL and LTR from day one.

**Implementation:**
- Set `<html dir="rtl" lang="ar">` as the default for Arabic-first products; toggle to LTR for English
- Maintain a single `AppDirection` state (`"rtl" | "ltr"`) as the source of truth
- Direction MUST be set before first render to prevent flicker (inline script in `<head>`, not React `useEffect`)
- Every component MUST be tested in both directions; no component is "complete" until it works in both
- For academic/research products: support independent direction at UI shell, workspace, editor document, paragraph, and inline span levels

**Existing projects:** Start by ensuring `<html dir>` is set correctly and toggles with language. Audit for hardcoded LTR assumptions (the most common source of RTL regressions). Fix flicker by moving direction logic to an inline script.

**Rationale (from chat with GPT.md):** "Arabic support is not just translation. It affects typography, spacing, line height, panel layout, icon direction, keyboard navigation, document editing, footnotes, citations, compile/export preview."

---

## Principle 2: Logical Properties Exclusively

All UI chrome styling MUST use CSS logical properties. Physical directional properties (left/right) MUST NOT appear in component styles except in explicitly LTR-only contexts (code blocks, mathematical formulas, URLs, email addresses).

**Implementation:**
- Tailwind: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`, `border-s`, `border-e`, `rounded-s`, `rounded-e`
- CSS: `margin-inline-start`, `margin-inline-end`, `padding-inline-start`, `padding-inline-end`, `inset-inline-start`, `inset-inline-end`, `border-inline-start`, `border-inline-end`
- MUI (sx prop): `marginInlineStart`, `paddingInlineEnd` — or rely on MUI's built-in RTL-aware `sx` shorthand

**Forbidden classes/properties in UI chrome:**
```
ml-*, mr-*, pl-*, pr-*, left-*, right-*
text-left, text-right
rounded-l, rounded-r
border-l, border-r
margin-left, margin-right, padding-left, padding-right
```

**Existing projects:** Run `npx rtlify-ai check` to detect violations. Fix systematically — start with layout components (sidebar, header, navigation), then forms, then tables. This is the single highest-impact RTL change; even partial adoption prevents layout breaks.

---

## Principle 3: Mirroring With Intent

Interface elements that represent navigation, progression, or sequence MUST mirror in RTL. Elements that represent physical objects, data, or non-directional concepts MUST NOT mirror.

**Mirror (in RTL):**
- Navigation sidebars and menus
- Breadcrumbs
- Step indicators and progress bars
- Drawer positions
- Timeline direction
- Next/Previous arrows and pagination
- Document tree indentation
- Panel docking sides
- Tab order (visual right-to-left)

**Do NOT mirror (in RTL):**
- Numbers and numerals (intrinsic LTR)
- Code snippets, mathematical formulas, URLs, email addresses
- Charts with fixed axes (unless axis direction is meaningful in RTL)
- Logos and brand marks
- Icons representing non-directional concepts (home, search, settings, user)
- Document page previews (unless explicitly required)
- Media (images, video) unless directionally relevant

**Directional icon handling:**
```tsx
// Icons that represent direction MUST flip in RTL
<ChevronLeft className="rtl:rotate-180" />
<ArrowBack className="rtl:rotate-180" />

// Icons that don't represent direction MUST NOT flip
<HomeIcon />  // no flip
<SearchIcon /> // no flip
```

**Existing projects:** Create an icon audit spreadsheet. Categorize every icon as directional or non-directional. Fix directional icons with a centralized utility or wrapper. Never create separate LTR/RTL icon sets.

---

## Principle 4: Arabic Typography as Default

Arabic text requires different typographic treatment than Latin text. Latin typography rules MUST NOT be blindly applied to Arabic.

**Implementation:**
- **Line height:** 1.6–1.8 for Arabic body text and UI (vs. 1.4–1.5 for Latin). Arabic diacritics and ascenders/descenders require more vertical space
- **Font weight:** Minimum 400 for Arabic body text. Never use 300 or lighter — Arabic letterforms become illegible at thin weights
- **Letter spacing:** MUST be zero for Arabic text. `tracking-*` and `letter-spacing` disconnect cursive letters and make text illegible
- **Text rendering:** Never use `opacity` or `rgba()` transparency on Arabic text blocks — causes jagged rendering of connected glyphs in Firefox. Use opaque color tokens from the theme instead
- **Word breaking:** Never use `word-break: break-all` on Arabic content — tears mid-ligature words. Use `overflow-wrap: break-word` if wrapping is necessary
- **Underline offset:** At least 4px for Arabic links — prevents dot clipping on dotted letters (ب, ت, ث, etc.)

**Font stack (minimum):**
```css
--font-ui-ar: 'Tajawal', 'Cairo', 'IBM Plex Sans Arabic', 'Noto Sans Arabic', sans-serif;
--font-editor-ar: 'Amiri', 'Scheherazade New', 'Noto Naskh Arabic', serif;
--font-ui-latin: 'Inter', system-ui, sans-serif;
```

**Existing projects:** Add `[lang="ar"] { letter-spacing: 0; line-height: 1.65; }` to your global CSS. Fix any use of `opacity` on Arabic text blocks by replacing with opaque theme tokens. This is a CSS-only change.

---

## Principle 5: Dual-Direction Content Density

Arabic text is typically 20-30% shorter in character count than equivalent English text. Layouts MUST gracefully accommodate both without breaking, truncating, or creating excessive white space.

**Implementation:**
- Use `min-width` and `max-width` constraints on text containers instead of fixed widths
- Design labels, buttons, and navigation items to handle 30% length variance
- Tables: prefer fluid columns with min-width constraints over fixed-width columns
- Truncation: provide tooltips with full text for truncated items
- For academic UIs: editor and preview panes must handle paragraphs of varying length in both languages

**Existing projects:** Audit the tightest UI spaces (navigation, button groups, table header cells). Test with both Arabic and English content. Add `min-width` constraints where text currently overflows.

---

## Principle 6: Direction at Multiple Levels

Direction is not a single global toggle. In bilingual applications, direction MUST be supported independently at multiple levels.

**Implementation:**
| Level | Direction Support |
|---|---|
| Application shell | RTL / LTR (global toggle) |
| Workspace / page | RTL / LTR (inherits from shell, overridable) |
| Editor document | RTL / LTR (independent of UI direction) |
| Paragraph | RTL / LTR (user-authored content) |
| Inline span | Bidi-aware (`bdi`, `dir="auto"`) |
| Footnote / citation | RTL / LTR (follows content direction) |

**For user-authored content:**
```html
<!-- Auto-detect direction from content -->
<div dir="auto">{userContent}</div>

<!-- Isolate mixed-direction content -->
<p>User <bdi>{userName}</bdi> posted a comment</p>
```

**Existing projects:** Ensure user-generated content containers use `dir="auto"`. This is an attribute-only change with zero visual impact on LTR content and immediate improvement for RTL content.

---

## Principle 7: Portal Direction Inheritance

Portal-rendered components (Dialogs, Popovers, Dropdowns, Tooltips, Command palettes) do NOT automatically inherit `dir` from the document. They MUST receive explicit `dir` props.

**Implementation:**
```tsx
// Every portal-based component MUST receive explicit dir
<DialogContent dir={direction}>...</DialogContent>
<PopoverContent dir={direction}>...</PopoverContent>
<DropdownMenuContent dir={direction}>...</DropdownMenuContent>
<TooltipContent dir={direction}>...</TooltipContent>
<SelectContent dir={direction}>...</SelectContent>
<SheetContent dir={direction}>...</SheetContent>
```

**DirectionProvider from @radix-ui/react-direction (shadcn/ui projects):**
```tsx
import { DirectionProvider } from "@/components/ui/direction";

<DirectionProvider direction={direction}>
  {children}
</DirectionProvider>
```

**Existing projects:** This is the most common RTL regression in production. Audit every portal-based component. Missing `dir` props cause Arabic text to render LTR inside RTL dialogs. Fixing this has zero impact on LTR modes.

---

## Principle 8: Dual-Direction Testing is Mandatory

Every component and every feature MUST be tested in both RTL and LTR. A component is not complete until it passes both.

**Implementation:**
- E2E tests MUST run in both directions (see `playwright-e2e.md`)
- Storybook stories MUST include RTL and LTR variants for every shared component
- Visual regression tests MUST capture both directions
- Manual QA checklist per feature:
  - [ ] Renders correctly with `dir="rtl"` and `lang="ar"`
  - [ ] Renders correctly with `dir="ltr"` and `lang="en"`
  - [ ] Forms align right-to-left, labels precede inputs
  - [ ] Tables scroll right-to-left, column order mirrors correctly
  - [ ] Dialogs and menus appear in correct position
  - [ ] Navigation and breadcrumbs flow right-to-left
  - [ ] Directional icons are flipped, non-directional are not
  - [ ] Mixed Arabic/English content renders without bidi glitches

**Existing projects:** Add RTL variants to E2E test suites first. Add RTL Storybook stories as you touch each component. Run `npx rtlify-ai check` in CI/CD.

---

## Incremental Adoption Strategy

### For New Projects (Greenfield)
All 8 principles are mandatory from project initialization. Initialize with `pnpm dlx shadcn@latest init --rtl` (or MUI RTL theme setup). First commit MUST include logical properties linting and portal direction testing.

### For Existing Projects (Brownfield)

| Phase | Principles | Approach |
|---|---|---|
| **Phase 1** (zero regression risk) | #2 Logical Properties, #7 Portal Direction | Add `eslint` rule for logical properties. Add `dir` prop to portal components. Content/attribute changes only. |
| **Phase 2** (low risk) | #6 Multi-Level Direction, #5 Content Density | Add `dir="auto"` to user-content containers. Add min-width constraints. CSS/attribute changes. |
| **Phase 3** (moderate, per-component) | #3 Mirroring, #4 Typography, #8 Testing | Fix icons, add Arabic typography rules, add RTL tests. Touch each component once. |
| **Phase 4** (architectural) | #1 Bidirectional-First | Only relevant if the product is currently English-only with no RTL infrastructure. Full architectural commitment. |

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Treating Arabic as translation only** | UI breaks in RTL; layout, icons, typography all wrong | Bidirectional-first architecture from Principle 1 |
| **Physical CSS in UI chrome** (`ml-4`, `pr-2`) | Layout breaks when `dir` changes; margins on wrong side | Use logical properties exclusively (Principle 2) |
| **Not mirroring directional icons** | Forward/back arrows point the wrong way in RTL; users confused | Directional icons MUST flip; non-directional MUST NOT (Principle 3) |
| **`tracking-*` or `letter-spacing` on Arabic** | Cursive letters disconnect; text becomes illegible | `[lang="ar"] { letter-spacing: 0 }` (Principle 4) |
| **Opacity on Arabic text** | Jagged, broken glyph rendering in Firefox | Use opaque theme tokens; never apply alpha to Arabic text blocks (Principle 4) |
| **Fixed-width containers for text** | Arabic text overflows or English text leaves excessive whitespace | Fluid widths with min/max constraints (Principle 5) |
| **Portal components without `dir` prop** | Dialog content renders LTR inside RTL app (most common regression) | Every portal receives explicit `dir` (Principle 7) |
| **Testing only in LTR** | RTL bugs ship to production; Arabic users get broken UI | Dual-direction testing mandatory (Principle 8) |

---

## Key Takeaways

1. Arabic-first is an architectural requirement, not a localization task. Build for bidirectional from day one.
2. Use CSS logical properties exclusively in UI chrome. Never `ml-*`, `pl-*`, `left-*`, `right-*`. Always `ms-*`, `ps-*`, `start-*`, `end-*`.
3. Mirror with intent: navigation, progression, and sequence elements mirror. Logos, code, numbers, and non-directional icons do not.
4. Arabic typography is different: line-height 1.6+, weight 400+, no tracking, no opacity, no `break-all`.
5. Every component is incomplete until tested in both RTL and LTR. Portal components do NOT inherit `dir` — pass it explicitly.
6. Support direction at multiple levels: UI shell, workspace, document, paragraph, inline span.
7. Prevent first-paint flicker: set `document.documentElement.dir` via inline `<script>` before React mounts.

---

## Cross-References

- **Depends on:** `rtl-tech-stack.md` — stack-specific RTL implementation (CSS, fonts, numerals, testing tooling)
- **Depends on:** `accessibility-standards.md` — WCAG requirements for bidirectional UIs
- **Extended by:** `../05-stack-guides/mui/mui-rtl-bidirectional.md` — MUI-specific RTL configuration
- **Extended by:** `../05-stack-guides/shadcn/shadcn-rtl-bidirectional.md` — shadcn/ui + Tailwind RTL configuration
- **Extended by:** `visual-design-principles.md` — hierarchy, depth, and color principles that apply in both directions
- **Applied by:** `ux-design-principles.md` — interaction heuristics in bidirectional contexts
- **Applied by:** `frontend-architecture.md` — component patterns that support bidirectional layouts
