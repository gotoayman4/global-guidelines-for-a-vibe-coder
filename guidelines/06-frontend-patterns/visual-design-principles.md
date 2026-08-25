# Visual Design Principles — Hierarchy, Depth, Color, and Typography

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,800 tokens)
**Last Updated:** 2026-05-26
**Cross-References:** `bidirectional-design-principles.md`, `accessibility-standards.md`, `ux-design-principles.md`, `icon-usage.md`

---

## Purpose

Define the visual design principles that guide the look and feel of every interface. These principles govern hierarchy, spacing, depth, color, and typography across all products, regardless of UI framework. They ensure visual coherence, accessibility, and a professional appearance. Based on validated visual design rules (Anthony Hobday, 2024) and augmented for Arabic-first bilingual UIs.

---

## Principle 1: Visual Hierarchy Through Contrast

Important elements MUST have higher visual contrast than secondary elements. The user's eye should be guided to the most important action or information first.

**Implementation:**
- **High contrast:** Primary CTAs, active states, critical information, error messages
- **Medium contrast:** Secondary buttons, input borders, section headers
- **Low contrast:** Structural elements (card borders, dividers, backgrounds), disabled states
- Never use pure black (`#000`) on pure white (`#fff`) — uncomfortably high contrast causes eye strain. Use near-black (`#111`, `#1a1a1a`) and near-white (`#fafafa`, `#f5f5f5`)
- In dark mode: elements closer to the user (modals, popovers) SHOULD be lighter than background elements
- Icons paired with text SHOULD have lower contrast than the text they accompany — use reduced opacity or a lighter color token

**Existing projects:** No code change needed if using design tokens. Adjust token values for primary/secondary contrast ratios. Audit: do your CTAs actually stand out more than your secondary buttons?

---

## Principle 2: Intentional Spacing — Mathematical Scale

All spacing and sizing MUST follow a consistent mathematical scale. Arbitrary pixel values produce visual incoherence.

**Implementation:**
- Use an 8px base grid (multiples of 8: 4, 8, 12, 16, 24, 32, 48, 64, 96)
- Design tokens for spacing: `--space-xs: 4px`, `--space-sm: 8px`, `--space-md: 16px`, `--space-lg: 24px`, `--space-xl: 32px`, `--space-2xl: 48px`, `--space-3xl: 64px`
- In containers: outer padding (element to container edge) MUST be equal to or greater than inner padding (between elements inside the container)
- Spacing SHOULD be measured between points of high visual contrast (text baseline to text baseline, not container edge to container edge)
- For horizontal grids: 12 columns preferred (divisible into 1, 2, 3, 4 columns)

**Existing projects:** Audit your spacing tokens. If you already have an 8px-based spacing scale, you're compliant. If not, migrate as part of your next design token refresh.

---

## Principle 3: Optical Alignment Over Mathematical Alignment

When mathematical alignment looks wrong to the eye, use optical alignment instead. Some shapes (triangles, circles, Arabic letterforms) have visual centers different from their mathematical centers.

**Implementation:**
- Center-aligned icons inside buttons: optically nudge if the icon shape causes visual imbalance
- Arabic text in centered layouts: Arabic letterforms are asymmetric; mathematical centering may look left-heavy
- Rounded containers with nested content: inner corner radius = outer corner radius − padding distance
- Elements with visual weight: arrange in descending visual weight order (heaviest first). If against an edge, heaviest element goes on the outer edge

**Existing projects:** No systematic fix needed. Apply as-you-touch. Most applicable to centered hero sections, icon+label buttons, and nested cards.

---

## Principle 4: Depth Consistency

Use ONE depth technique consistently throughout an interface. Do not mix shadows, borders, and flat design within the same visual hierarchy layer.

**Implementation:**
- **Shadows:** If you use shadows for elevation, use them everywhere elevation matters. Shadow blur = 2 × shadow distance. Objects closer to the user have lighter surfaces and more diffuse shadows.
- **Borders:** If you use borders for separation, use borders everywhere. No mixing shadows and borders on the same hierarchy level.
- **Flat hierarchy:** If you use flat design with background color shifts for depth, use that exclusively.
- **Dark mode:** Do NOT use box-shadows in dark interfaces — shadows are invisible against dark backgrounds. Use lighter surface colors for elevated elements instead.
- Container brightness difference from background: within 12% for dark mode, within 7% for light mode (HSB brightness).

**Existing projects:** Audit: do your cards use shadows while your modals use borders? Pick one depth system and migrate as you touch components.

---

## Principle 5: Typography Hierarchy

Font usage MUST follow a deliberate hierarchy. Typography communicates structure before users read a single word.

**Implementation:**
- **Maximum 2 typefaces** per product (one for UI, one for content/editor). Monospace for code blocks is exempt. Additional typefaces dilute the visual identity
- **Body text:** 16px minimum. Below 16px readability degrades for all users
- **Line length:** 60–80 characters for body text. Lines too long lose the reader; lines too short cause excessive eye movement
- **Font weight hierarchy:** 400 for body, 500 for emphasis, 600–700 for headings. Never skip a weight level
- **Line height:** 1.4–1.5 for Latin body text; 1.6–1.8 for Arabic body text. Larger text (headings) uses tighter line height
- **Letter spacing:** Larger text (headings) uses slightly tighter tracking. Smaller text (captions, labels) uses slightly looser tracking. Arabic text always at 0 tracking
- Headings SHOULD use a distinct weight (600+) and size jump from body, not just bold text at the same size

**Existing projects:** Define your type scale as design tokens. Audit: are you using more than 2 typefaces? Reduce as part of your next visual refresh.

---

## Principle 6: Simple on Complex / Complex on Simple

Avoid placing complex visual elements on complex backgrounds. Either the foreground is simple and the background complex, or the background is simple and the foreground complex. Never complex on complex.

**Implementation:**
- Simple-on-simple is acceptable but may look plain — add visual interest elsewhere
- Complex-on-complex MUST be avoided — causes visual clutter and cognitive overload
- **Simple:** flat colors, minimal detail, single font weight, no gradients
- **Complex:** gradients, images, patterns, multi-layered shadows, overlapping elements

**Existing projects:** Audit pages with background gradients or images. Ensure text and interactive elements on those backgrounds are maximally simple (flat color, no shadows, no gradients on text).

---

## Principle 7: Color Accessibility

Color MUST never be the sole means of conveying information. Every color-coded element MUST have a secondary indicator.

**Implementation:**
- Error states: red text + warning icon + message text (not just red border)
- Success states: green text + checkmark icon + message text
- Status indicators: colored dot + text label (never dot alone)
- Links: underlined or otherwise visually distinct from body text (not just color)
- Charts and graphs: use patterns, labels, or shapes in addition to color
- Color palette: every color in the palette SHOULD have a distinct brightness value (not just a different hue) to remain distinguishable by users with color vision deficiency
- Test with color blindness simulators (Coblis, Chrometric)

**Existing projects:** Audit every place where color alone conveys meaning. Add text labels, icons, or patterns. This is a content/additive change; no functional regression possible.

---

## Principle 8: Deliberate Everything

Every visual property in the design MUST be intentional. If someone asks why a pixel value, color, or spacing is what it is, you MUST have an answer.

**Implementation:**
- Design tokens for every visual property — no raw values in components
- Spacing: use the scale (Principle 2)
- Colors: use theme palette tokens, never raw hex values
- Typography: use the defined type scale (Principle 5)
- Every element SHOULD be aligned with at least one other element on the page
- No orphan margins, padding, or font sizes that don't come from the design system

**Existing projects:** Enforce via linting rules that ban raw CSS values in components. This is a governance change rather than a visual one. Implement incrementally as part of your design token adoption.

---

## Incremental Adoption Strategy

### For New Projects (Greenfield)
All 8 principles are mandatory. Design tokens and spacing scales are defined before the first component is built. Visual review is part of every PR.

### For Existing Projects (Brownfield)

| Phase | Principles | Approach |
|---|---|---|
| **Phase 1** (zero regression risk) | #7 Color Accessibility, #8 Deliberate Everything | Add text labels/icons to color-only indicators. Adopt design tokens. Purely additive or governance changes. |
| **Phase 2** (design token changes) | #1 Visual Hierarchy, #2 Spacing Scale | Adjust contrast ratios, define spacing tokens. May shift layouts slightly — test visually. |
| **Phase 3** (per-component) | #3 Optical Alignment, #4 Depth, #5 Typography, #6 Simple/Complex | Apply as-you-touch. Each component gets full visual compliance when refactored or redesigned. |

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Raw hex colors in components** | Inconsistent palette; dark mode breaks; design tokens ignored | Use theme tokens exclusively; lint against raw hex values |
| **Pure black on pure white** | Eye strain; uncomfortable contrast; inaccessible to some users | Near-black + near-white; reduce contrast to comfortable levels |
| **Color as the only indicator** | ~10% of males can't distinguish; all users fail in grayscale/accessibility modes | Always pair color with text, icon, or pattern |
| **Mixing depth techniques** (shadows + borders + flat) | Interface looks inconsistent and unprofessional | Pick one depth system per product; use it consistently |
| **More than 2 typefaces** | Visual confusion; weakens brand identity | Maximum 2: one UI, one content/editor |
| **Arbitrary spacing values** (7px, 13px, 23px) | Visual incoherence; elements don't align | Use 8px-based mathematical scale |
| **Complex on complex** (text on gradient image with shadow) | Visual clutter; text illegible; cognitive overload | Simplify foreground or background; never both complex |

---

## Key Takeaways

1. Visual hierarchy guides attention: high contrast for important elements, low contrast for structural elements.
2. All spacing and sizing follows an 8px-based mathematical scale. No arbitrary pixel values.
3. Use one depth technique consistently (shadows OR borders OR flat). Never mix.
4. Maximum 2 typefaces. Body text 16px+. Line length 60–80 characters. Arabic line-height 1.6+.
5. Never convey information through color alone. Always pair with text, icons, or patterns.
6. Use near-black and near-white, never pure black/white. Reduce eye strain while maintaining accessible contrast.
7. Every visual property must be deliberate. Design tokens are the single source of truth — no raw values.

---

## Cross-References

- **Depends on:** `accessibility-standards.md` — color contrast ratios, focus indicators, screen-reader compatibility
- **Depends on:** `bidirectional-design-principles.md` — Arabic typography rules (line-height, weight, tracking)
- **Applied by:** `ux-design-principles.md` — visual hierarchy supports Aesthetic and Minimalist Design (Heuristic #8)
- **Governed by:** `design-system-governance.md` — design tokens enforce visual consistency at scale
- **Extended by:** `responsive-design.md` — visual principles applied across breakpoints
