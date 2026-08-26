# Design System Governance — Consistency at Scale

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~700 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `frontend-architecture.md`, `ux-design-principles.md`, `visual-design-principles.md`, `bidirectional-design-principles.md`

---

A design system is a living product, not a one-time build. Applies to MUI, shadcn/ui + Tailwind, or custom systems.

## Directives

1. **Design tokens = single source of truth.** No raw hex/pixel/font values in components — colors from `theme.palette.*` or CSS custom properties, spacing from scale tokens, dark-mode values in the same token definitions. Lint-ban raw CSS values in components.
2. **Shared components over raw primitives:** `StandardTable` over DataGrid, `PageHeader` over ad-hoc headers, one shared dialog. Every shared component handles all four states, is tested in RTL and LTR, and has Storybook stories for all variants.
3. **Component-driven consistency:** same action = same label/behavior everywhere · one dialog implementation, not three · same state = same presentation (every empty state identical, every error offers Retry) · same data type = same format (dates/currency/numbers) · identical patterns in Arabic and English UI.
4. **Living product:** semantic versioning (breaking API change = major bump) · migration guides with before/after · public changelog · deprecation warnings removed after one major cycle · token budget reviewed by a designated maintainer against bloat.
5. **Incremental adoption (Strangler Fig):** new features use design-system components exclusively; existing code migrates when touched for other reasons. NEVER block feature development for a migration. Track token-vs-raw adoption percentage with quarterly targets. Lint rules start as warnings and graduate to errors.
6. **Tokens cover every mode:** separate Arabic/Latin typography tokens selected by `lang`; direction-aware (logical) spacing; light+dark defined together; directional icons via a centralized flip utility — never separate icon sets.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Raw hex in components | Token imports + lint ban |
| Duplicate component implementations | Shared components |
| Big-bang migration | Strangler Fig, adopt-in-flow |
| Unmaintained system | Versioning + changelog + maintainer |
| Token bloat | Contribution review / budget |
| Overriding shared component internals | Public API (props/slots) only |

## Cross-References

`frontend-architecture.md` · `ux-design-principles.md` · `../05-stack-guides/mui/mui-styling.md`
