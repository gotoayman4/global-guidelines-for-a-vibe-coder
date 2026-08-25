# Design System Governance — Consistency at Scale

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,600 tokens)
**Last Updated:** 2026-05-26
**Cross-References:** `frontend-architecture.md`, `ux-design-principles.md`, `visual-design-principles.md`, `icon-usage.md`

---

## Purpose

Define how design systems are governed, maintained, and enforced across products and teams. These principles apply whether using MUI, shadcn/ui + Tailwind, or a custom internal design system. A design system is a living product — not a one-time build. It requires ongoing maintenance, versioning, and adoption strategy.

---

## Principle 1: Design Tokens as Single Source of Truth

Every visual property in the application MUST derive from a design token. Raw values (hex colors, pixel sizes, font families) MUST NOT appear in components.

**Implementation:**
- Colors: import from `theme.palette.*` (MUI) or CSS custom properties / Tailwind config (shadcn/ui)
- Spacing: use spacing scale tokens, never raw pixel values
- Typography: use typography tokens for font family, size, weight, line-height
- Shadows, borders, radius: all from design tokens
- Dark mode: tokens MUST define both light and dark values; components never hardcode mode-specific styles
- Lint rule: ban raw CSS values in component files. Enforce token imports

**Rationale:** Design tokens enable global visual changes without touching components. A brand color change updates one token file instead of 200+ components. Dark mode is a token toggle, not a component rewrite.

**Existing projects:** If design tokens already exist, enforce compliance via linting. If not, extract the most-repeated values (primary color, spacing scale, font stack) into tokens first. Replace raw values in components incrementally.

---

## Principle 2: Shared Components Over Raw Primitives

Application-specific shared components MUST be used instead of raw UI library primitives. This enforces consistent behavior, accessibility, and visual treatment across every usage.

**Implementation:**
- `StandardTable` over raw MUI `DataGrid` or shadcn `Table`
- `PageHeader` over ad-hoc header markup on every page
- `StandardAccordion`, `StandardDialog`, `StandardForm` over library primitives
- Every shared component MUST handle: loading, empty, error, and success states (see `frontend-architecture.md`)
- Shared components MUST be tested in both RTL and LTR (see `bidirectional-design-principles.md`)
- Shared components MUST have Storybook stories showing all variants and states

**Existing projects:** Identify the top 10 most-used UI patterns in your codebase. Create shared components for them one at a time. Replace raw usage as you touch each area. Do not attempt a big-bang migration.

---

## Principle 3: Component-Driven Consistency

Users learn one pattern, and it works everywhere. Internal consistency reduces cognitive load and builds user confidence.

**Implementation:**
- Same action = same label, same behavior: every "Save" button across the app behaves identically
- Same pattern = same component: don't have three different dialog implementations. Use one shared dialog
- Same state = same presentation: every empty state looks and behaves the same. Every error state offers Retry
- Same data type = same display format: dates, currencies, and numbers format identically everywhere
- Consistency applies across both languages: the Arabic UI and English UI MUST have the same interaction patterns (see `ux-design-principles.md` Heuristic #4)

**Existing projects:** Run a consistency audit: pick 3 common patterns (dialogs, empty states, confirmation flows). Count how many different implementations exist. Consolidate to the shared component. Repeat for next 3 patterns.

---

## Principle 4: Design System as Living Product

The design system requires a dedicated maintainer, versioning, migration guides, and a feedback loop. It is never "done."

**Implementation:**
- **Versioning:** Semantic versioning for the design system. Breaking changes (component API changes) = major version bump
- **Migration guides:** Every breaking change includes a migration guide with before/after examples
- **Changelog:** Public changelog documenting what changed, why, and when
- **Deprecation path:** Deprecated components marked with console warnings in development; removed after one major version cycle
- **Contribution process:** Clear process for proposing, reviewing, and adding new components or patterns
- **Token budget:** The design system team (or designated maintainer) reviews additions to prevent bloat. Every new token must justify its existence

**Existing projects:** Assign one person as design system maintainer (can be part-time). Start with a changelog. Add deprecation warnings. Formalize versioning as the system matures.

---

## Principle 5: Incremental Adoption Over Big-Bang Migration

Design system adoption MUST NOT block feature development. Adopt incrementally as you touch each area of the codebase.

**Implementation:**
- **Strangler Fig pattern:** New features use design system components exclusively. Existing code migrates when touched for other reasons
- **Adoption metrics:** Track percentage of components using design tokens vs. raw values. Set quarterly improvement targets
- **No "stop the world" migrations:** Never pause feature development for a design system migration. Adopt in flow
- **Lint-driven adoption:** Add lint rules that warn (not error) on raw values. Graduate to errors after the team has addressed most warnings

**Existing projects:** This principle IS the strategy for existing projects. Start with lint warnings. Migrate as-you-touch. Track progress with adoption metrics.

---

## Principle 6: Tokens Cover Both Directions

Design tokens MUST define values for both RTL and LTR, both Arabic and Latin typography, and both light and dark modes. No token is direction-specific or mode-specific.

**Implementation:**
- Typography tokens: separate `--font-ar` and `--font-latin` tokens; components use the correct token based on `lang` attribute
- Spacing tokens: logical (direction-aware) by default
- Color tokens: define light and dark mode values in the same token definition
- Icon tokens: direction-aware icons reference a centralized flip utility, not separate LTR/RTL icon sets
- See `bidirectional-design-principles.md` for full direction governance

**Existing projects:** Add Arabic typography tokens if not present. Ensure dark mode tokens exist. Existing spacing tokens that are already logical (viewports) don't need changes.

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Raw hex colors in components** | Brand color change requires editing 100+ files; dark mode breaks | Enforce design token imports; lint ban on raw hex values |
| **Duplicate component implementations** | Bug fixed in one place, still broken in another; inconsistent UX | Shared components over raw primitives (Principle 2) |
| **Big-bang design system migration** | Feature development stalls; migration drags for months | Incremental adoption (Principle 5); Strangler Fig pattern |
| **Unmaintained design system** (no versioning, no changelog) | Components drift from the system; nobody trusts it | Design system as living product (Principle 4) |
| **Adding tokens without review** | Bloated token set; 50 shades of the same color; decision paralysis | Token budget and contribution review process |
| **Design system only in LTR** | Arabic UI uses different patterns, breaking consistency | Tokens cover both directions (Principle 6) |
| **Overriding shared component internals** | Component breaks when design system updates; local overrides create fork | Only override via the component's public API (props, slots) |

---

## Key Takeaways

1. Design tokens are the single source of truth. No raw values in components. No exceptions.
2. Shared application components over raw library primitives. One implementation, tested once, used everywhere.
3. Consistency is a UX investment. Users learn once, apply everywhere. Reduces cognitive load.
4. The design system is a living product: versioned, maintained, with migration guides and a feedback loop.
5. Adopt incrementally. Never block feature work for design system migration. Strangler Fig pattern.
6. Design tokens cover RTL + LTR, Arabic + Latin, light + dark. No token is single-mode.
7. Lint rules enforce compliance. Start with warnings; graduate to errors as adoption increases.

---

## Cross-References

- **Depends on:** `frontend-architecture.md` — component architecture principles that the design system enforces
- **Depends on:** `bidirectional-design-principles.md` — direction-aware tokens and RTL/LTR consistency
- **Applied by:** `ux-design-principles.md` — Consistency and Standards heuristic (#4)
- **Applied by:** `visual-design-principles.md` — visual properties governed by design tokens
- **Extended by:** `../05-stack-guides/mui/mui-styling.md` — MUI-specific token and theme implementation
- **Extended by:** `../05-stack-guides/shadcn/shadcn-rtl-bidirectional.md` — shadcn/ui token and CSS custom property implementation
