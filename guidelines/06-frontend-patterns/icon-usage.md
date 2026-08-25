# Icon Usage — Selection, Sizing, and Consistency

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,800 tokens)
**Last Updated:** 2026-06-13
**Cross-References:** `visual-design-principles.md`, `bidirectional-design-principles.md`, `accessibility-standards.md`, `design-system-governance.md`, `rtl-tech-stack.md`

---

## Purpose

Define a consistent, maintainable approach to icon usage across all projects. Icons are a primary visual communication tool — inconsistency in size, library choice, direction handling, or accessibility degrades UI quality faster than most design elements.

---

## Icon Library Selection

### Recommended Libraries

| Library | Type | Best For | Bundle Impact |
|---|---|---|---|
| **Lucide** | SVG (tree-shakeable) | shadcn/ui, Tailwind projects | ~2KB per icon (tree-shaken) |
| **MUI Icons** (`@mui/icons-material`) | SVG (Material Design) | MUI-based projects | ~3KB per icon (tree-shaken) |
| **Phosphor Icons** | SVG (6 weights) | Custom design systems | ~2.5KB per icon (tree-shaken) |

### Selection Rules

- **Prefer Lucide** for new projects not on MUI — best tree-shaking, active maintenance, RTL-appropriate set
- **Prefer MUI Icons** when already on MUI — eliminates a second icon dependency
- **Never** use Font Awesome, Material Icons (font version), or any font-based icon set — font icons lack tree-shaking, misalign in RTL, and cause FOIT
- **Never** bundle two full icon libraries — pick one primary library per project
- **Custom SVG icons** are acceptable only when the library set lacks a needed icon; store in `src/assets/icons/` as raw SVGs, not JSX components

---

## Sizing

### Standard Size Scale

| Token | Size | Usage |
|---|---|---|
| `--icon-xs` | 12×12px | Inline with small text, table cell indicators |
| `--icon-sm` | 16×16px | Inline with body text, menu items |
| `--icon-md` | 20×20px | Default for most UI (buttons, inputs, list items) |
| `--icon-lg` | 24×24px | Standalone icon buttons, section headers |
| `--icon-xl` | 32×32px | Empty states, feature cards, dialogs |
| `--icon-2xl` | 48×48px | Hero sections, large feature illustrations |

### Rules

- Icons inside buttons MUST match the button's text height — 16px for small buttons, 20px for default, 24px for large
- Icons with text labels MUST NOT be larger than the text they accompany — unless the icon is the primary visual (empty states, feature cards)
- Icon-only buttons MUST use `--icon-lg` (24×24) minimum for touch targets — smaller icons need invisible padding to meet 44×44px touch target
- Never use CSS `width`/`height` to arbitrarily resize — use the library's `size` prop or the defined tokens

---

## Consistency Patterns

### Icon + Label

- Icons SHOULD appear on the **start side** of labels (left in LTR, right in RTL) — always use `ms-*` logical properties
- Icon + label spacing MUST be a consistent token: `gap-1.5` (6px) or `gap-2` (8px)
- Icon-only UI is acceptable ONLY when the icon is universally understood AND a tooltip or `aria-label` is provided

### Icon Usage by Context

| Context | Size | Placement |
|---|---|---|
| **Button** | --icon-md (20px) | Start side of label |
| **Menu item** | --icon-sm (16px) | Start side of label |
| **Table cell** | --icon-xs (12px) or --icon-sm (16px) | Start side of text |
| **Input/field** | --icon-sm (16px) | Start side of field |
| **Section header** | --icon-lg (24px) | Start side of heading |
| **Alert/banner** | --icon-md (20px) | Start side of message |
| **Toolbar action** | --icon-md (20px) | Centered, icon-only |
| **Tag/chip** | --icon-xs (12px) | Start side of label |

### Icon Selection Rules

- Use the **same icon** for the same concept everywhere — never use `UserIcon` in one place and `PersonIcon` in another for the same "user" concept
- Prefer **filled** icons over outlined for active/selected states
- Prefer **outlined** icons over filled for default/resting states
- Never mix icon weights within the same UI section — if Lucide default weight is used, don't import Phosphor bold-weight icons in the same feature

---

## RTL/LTR Handling

### Directional vs Non-Directional

| Type | Examples | RTL Behavior |
|---|---|---|
| **Directional** | `ChevronLeft/Right`, `ArrowForward/Back`, `ArrowUp/Down` in pagination context, `Undo/Redo` | MUST flip (`transform: scaleX(-1)` or `rtl:rotate-180`) |
| **Non-directional** | `Home`, `Search`, `Settings`, `User`, `Plus`, `Minus`, `Bell`, `Mail`, `Calendar`, `Camera`, `Edit`, `Trash`, `Download`, `Upload` (cloud arrow), `Play`, `Pause`, `Volume` | MUST NOT flip |

### Implementation

```tsx
// Directional: flip in RTL
<ChevronLeft className="rtl:rotate-180" />

// Non-directional: never flip
<HomeIcon />
<SearchIcon />
```

- Use `rtl:rotate-180` for Tailwind-based projects
- Use `style={{ transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none' }}` for MUI
- Never create separate LTR/RTL icon sets — one icon source with conditional transform is the rule
- Audit all directional icons during implementation — forward/backward arrows are the #1 RTL regression

---

## Accessibility

### Every Icon Needs One of These

| Priority | Method | When |
|---|---|---|
| **1** | `aria-label` on the icon's parent button/link | Icon is interactive (button, link, toggle) |
| **2** | Built-in tooltip with visible text | Icon is standalone with no visible label |
| **3** | `aria-hidden="true"` on the `<svg>` | Icon has a visible adjacent text label |

### Rules

- Decorative icons (paired with text labels) MUST have `aria-hidden="true"` — the text label is the accessible name
- Informative icons (standalone, carrying meaning) MUST have an `aria-label` or tooltip
- Icon buttons MUST pass both: `aria-label="[action]"` on the button AND `aria-hidden="true"` on the icon SVG
- Status indicator icons (success checkmark, error warning) MUST be paired with visible text — color + icon alone is insufficient

```tsx
// ✅ Correct: decorative icon with visible label
<Button>
  <SaveIcon aria-hidden="true" />
  <span>{t('save')}</span>
</Button>

// ✅ Correct: standalone icon button
<button aria-label={t('deleteItem')}>
  <TrashIcon aria-hidden="true" />
</button>

// ❌ Wrong: no accessible name
<button><TrashIcon /></button>
```

---

## Tooltips

### When to Use Tooltips on Icons

- Icon-only buttons and controls always need tooltips
- Non-obvious icon meanings always need tooltips — if a developer has to guess what the icon represents, a tooltip is required
- Obvious icons (hamburger menu, magnifying glass search) in familiar contexts may omit tooltips

### Tooltip Rules

- Tooltip MUST show on hover AND on focus (keyboard users)
- Tooltip MUST NOT be the only accessible name — `aria-label` on the interactive element is the authoritative name
- Tooltip text MUST be short (1-5 words) and action-oriented ("Delete item", not "Click here to delete the selected item")
- Tooltip placement: below the icon for LTR/RTL neutral, or use logical placement (`bottom-start`)
- Never nest tooltips inside tooltips — one tooltip per interactive element

```tsx
// ✅ Correct: tooltip + aria-label
<Tooltip content={t('deleteItem')}>
  <button aria-label={t('deleteItem')}>
    <TrashIcon aria-hidden="true" />
  </button>
</Tooltip>
```

---

## Color and Theming

- Icons MUST use semantic color tokens, never raw hex values
- Icons paired with text MUST match the text color (inherit from parent) — unless the icon carries status meaning (success green, error red)
- Disabled icons MUST use the disabled color token at full opacity — not reduced opacity on a non-disabled token
- Interactive icons (buttons, toggles) MUST have hover and active color states defined
- Never use `fill` and `stroke` inconsistently — if an icon library uses stroke-based icons (Lucide), never add fills to them

---

## SVG Best Practices

- All library-provided SVG icons should be consumed as components — not as `<img src="...">` or inline raw SVG
- Custom SVG icons MUST:
  - Use `currentColor` for `fill` and `stroke` attributes (inherits from CSS)
  - Have `viewBox` set, never `width`/`height` as fixed attributes (let CSS/size prop control dimensions)
  - Be optimized (remove metadata, editor cruft, unused groups) — use SVGO during build
- Never use `<img>` tags for SVG icons — they can't be styled, they block CSS-based theming, and they don't inherit color

---

## Anti-Patterns

| Anti-Pattern | Why It Fails | Fix |
|---|---|---|
| **Two icon libraries in one project** | Unnecessary bundle weight, inconsistent visual language | Pick one primary library |
| **Arbitrary icon resizing** | Visual inconsistency, misalignment with text | Use the defined size scale |
| **Icon without aria-label or tooltip** | Inaccessible for screen reader users | Every icon must have one of the three accessibility methods |
| **Flipping non-directional icons in RTL** | Home/search/settings look wrong mirrored | Only flip directional icons (arrows, chevrons) |
| **Not flipping directional icons in RTL** | Forward/back arrows point wrong direction | Always flip directional icons in RTL |
| **Icon fonts (Font Awesome, etc.)** | No tree-shaking, FOIT, RTL misalignment | Use SVG-based icon libraries only |
| **Same concept, different icons** | Confusing visual language (UserIcon vs PersonIcon) | One icon per concept, enforced in design system |
| **Color-only meaning** | Inaccessible for colorblind users | Always pair icon color change with text or shape change |
| **Nesting icon inside button without aria-label** | Button has no accessible name | Always add `aria-label` to icon-only buttons |

---

## Key Takeaways

1. **One library per project.** Prefer Lucide for new projects, MUI Icons for MUI projects. Never font-based icon sets.
2. **Standard size scale:** xs (12), sm (16), md (20), lg (24), xl (32), 2xl (48). Icons in buttons match text height.
3. **RTL:** Directional icons flip (`rtl:rotate-180`), non-directional icons stay. One icon source, conditional transform.
4. **Accessibility:** Every icon needs one of: `aria-label` (interactive), tooltip (standalone), or `aria-hidden="true"` (decorative with text label).
5. **Icon-only controls** must have both a tooltip and an `aria-label`.
6. **Same icon for same concept** across the entire application — enforce via design system component wrappers.
7. **Custom SVGs** use `currentColor`, `viewBox`, and SVGO optimization — stored as raw SVGs in `src/assets/icons/`.
8. **Color tokens** for icon theming, never raw hex values.

---

## Cross-References

- **Extended by:** `visual-design-principles.md` — optical alignment of icons with text
- **Governed by:** `bidirectional-design-principles.md` — directional icon mirroring rules
- **Governed by:** `accessibility-standards.md` — WCAG icon requirements
- **Governed by:** `design-system-governance.md` — icon tokens and shared component wrappers
- **Stack-specific:** `rtl-tech-stack.md` — RTL flip patterns per framework
- **Stack-specific:** `mui-rtl-bidirectional.md` — MUI icon mirroring techniques
- **Stack-specific:** `shadcn-rtl-bidirectional.md` — shadcn/ui + Lucide icon mirroring
