---
status: "Normative"
scope: "Global"
tags: [icons, svg, accessibility, rtl, consistency]
---

# Icon Usage — Selection, Sizing, and Consistency

---

## Directives

1. **One library per project:** Lucide for new non-MUI projects; MUI Icons when on MUI. NEVER font-based icon sets (Font Awesome, Material font icons — no tree-shaking, FOIT, RTL misalignment). Custom SVGs only when the library lacks an icon; store raw in `src/assets/icons/`.
2. **Size scale (design tokens):** xs 12 · sm 16 · md 20 (default) · lg 24 · xl 32 · 2xl 48. Button icons match text height (16/20/24). Icon-only buttons: ≥24px icon + padding to reach 44×44px touch target. Resize via library `size` prop or tokens — never arbitrary CSS width/height.
3. **Icon + label:** icon on the START side using logical properties (`ms-*`); spacing via consistent gap token (6–8px). Same icon for the same concept everywhere — never UserIcon here and PersonIcon there.
4. **Weight consistency:** outlined for default states, filled for active/selected; never mix weights within one UI section.
5. **RTL mirroring:** directional icons (chevrons, arrows, undo/redo) MUST flip (`rtl:rotate-180` in Tailwind; conditional `scaleX(-1)` in MUI). Non-directional (home, search, settings, user, plus, bell, mail, play/pause) MUST NOT flip. Never separate LTR/RTL icon sets. Directional arrows are the #1 RTL regression — audit them.
6. **Accessibility — every icon gets exactly one of:** ① interactive → `aria-label` on the parent button/link; ② standalone informative → visible tooltip + aria-label; ③ decorative with adjacent text label → `aria-hidden="true"` on the SVG. Icon-only controls need BOTH tooltip and aria-label. Status icons pair with visible text — never color+icon alone.
7. **Tooltips:** show on hover AND focus; short action-oriented text (1–5 words); logical placement; never nested; never the only accessible name.
8. **Color/theming:** semantic color tokens only — no raw hex; paired icons inherit text color unless carrying status meaning; disabled = disabled token at full opacity; hover/active states on interactive icons; never mix fill into stroke-based libraries.
9. **SVG hygiene:** consume library icons as components — NEVER `<img src>`. Custom SVGs: `currentColor`, `viewBox` (no fixed width/height attrs), SVGO-optimized.

## Canonical Pattern

```tsx
// Decorative icon with label
<Button><SaveIcon aria-hidden="true" /><span>{t('save')}</span></Button>
// Standalone icon button
<button aria-label={t('deleteItem')}>
  <Tooltip content={t('deleteItem')}><TrashIcon aria-hidden="true" /></Tooltip>
</button>
```

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Two libraries in one project | One primary library |
| Arbitrary resizing | Size scale tokens |
| Missing accessible name | The three-method rule |
| Flipping non-directional / not flipping directional | RTL mirror rules |
| Font-based icons | SVG libraries only |
| Same concept, different icons | One icon per concept |

## Cross-References

Governed by `bidirectional-design-principles.md`, `accessibility-standards.md`, `design-system-governance.md`; stack specifics in `rtl-tech-stack.md`.
