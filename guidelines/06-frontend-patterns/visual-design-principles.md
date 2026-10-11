---
status: "Normative"
scope: "Global"
tags: [visual, hierarchy, color, typography, depth]
---

# Visual Design Principles — Hierarchy, Depth, Color, and Typography

---

## Directives

1. **Hierarchy through contrast:** high contrast for primary CTAs/active states/errors; medium for secondary controls; low for structural elements and disabled states. Never pure black on pure white — use near-black (#111/#1a1a1a) + near-white (#fafafa). Dark mode: elevated surfaces lighter than background.
2. **8px mathematical spacing scale:** 4, 8, 16, 24, 32, 48, 64, 96 as design tokens (`--space-xs`…`--space-3xl`). No arbitrary pixel values. Outer padding ≥ inner padding. 12-column grids preferred.
3. **Optical over mathematical alignment** when the eye disagrees: asymmetric shapes (Arabic letterforms, icons) optically nudged; nested corner radius = outer radius − padding; heaviest visual weight at the outer edge.
4. **ONE depth technique per product** — all shadows, or all borders, or flat color shifts; never mixed in one hierarchy layer. Shadow blur = 2× distance. NO box-shadows in dark mode (invisible) — use lighter surface colors instead.
5. **Typography hierarchy:** max 2 typefaces (UI + content/editor; monospace exempt) · body ≥16px · line length 60–80 chars · weights 400 body / 500 emphasis / 600–700 headings, never skipping levels · line-height 1.4–1.5 Latin, 1.6–1.8 Arabic · headings need a size jump, not just bold · Arabic always zero tracking (see `bidirectional-design-principles.md`).
6. **Simple on complex, complex on simple — never complex on complex:** flat foreground on gradient/image backgrounds; no gradients/shadows on text over imagery.
7. **Color is never the sole indicator:** errors = red text + icon + message; statuses = dot + label; links visually distinct beyond color; charts add patterns/labels; palette colors differ in brightness, not just hue; test with color-blindness simulators.
8. **Deliberate everything:** every visual property from design tokens — raw hex values, off-scale spacing, orphan font sizes forbidden. Enforce with linting. Every element aligns with at least one other.

## Adoption

New projects: tokens + spacing scale defined before the first component; visual review in every PR. Existing projects: ① color-accessibility fixes + token adoption (zero risk) → ② contrast ratios + spacing scale → ③ optical alignment, depth, typography per component as touched.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Raw hex values in components | Theme tokens + lint rule |
| Pure black/white | Near-black/near-white |
| Color-only indicators | Pair with text/icon/pattern |
| Mixed depth techniques | One system per product |
| >2 typefaces | Max 2 |
| Arbitrary spacing (7px, 13px) | 8px scale |
| Complex-on-complex | Simplify one side |

## Cross-References

- **Depends on:** `accessibility-standards.md`, `bidirectional-design-principles.md`
- **Governed by:** `design-system-governance.md`
- **Extended by:** `responsive-design.md`
