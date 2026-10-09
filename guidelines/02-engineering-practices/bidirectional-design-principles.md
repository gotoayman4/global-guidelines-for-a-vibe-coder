# Bidirectional Design Principles — Arabic-First, RTL-Native UX

**Status:** Normative
**Scope:** Global — All Projects (Bilingual by Default)
**Token Tier:** Full (~1,200 tokens)
**Last Updated:** 2026-09-24
**Cross-References:** `rtl-tech-stack.md`, `accessibility-standards.md`, `ux-design-principles.md`, `frontend-architecture.md`, `visual-design-principles.md`, `icon-usage.md`

---

**Division of authority:** this file governs design rationale; `rtl-tech-stack.md` governs implementation specifics (exact CSS, commands, tooling). Arabic is a first-class architectural requirement — every feature MUST be bidirectional from the start, never a localization layer.

## Directives

1. **Bidirectional-first architecture:** single `AppDirection` state ('rtl' | 'ltr'); direction set before first render via inline script (never React useEffect); `<html dir lang>` correct from first paint; every component tested both directions before it's "complete".
2. **Logical properties exclusively:** Tailwind `ms-* me-* ps-* pe-* start-* end-* text-start text-end border-s border-e rounded-s rounded-e`; CSS `margin-inline-start`, `padding-inline-end`, etc.; MUI sx `marginInlineStart`. Physical classes (`ml-* mr-* pl-* pr-* left-* right-* text-left text-right rounded-l/r border-l/r`) FORBIDDEN in UI chrome except explicit LTR contexts (code blocks, math, URLs, emails).
3. **Mirror with intent:** mirror navigation, breadcrumbs, step indicators, drawers, timelines, next/prev arrows, tree indentation, tab order. Do NOT mirror numbers, code/math/URLs/emails, logos, non-directional icons (home/search/settings), media unless directionally relevant. Directional icons flip (`rtl:rotate-180`); never maintain separate icon sets.
4. **Arabic typography defaults:** line-height 1.6–1.8 · font-weight ≥400 (never 300) · letter-spacing MUST be 0 on Arabic · NO opacity/rgba on Arabic text blocks (jagged glyphs in Firefox) · no `word-break: break-all` (use `overflow-wrap: break-word`) · underline-offset ≥4px.
5. **Dual-direction content density:** Arabic text runs 20–30% shorter than English — use min/max-width constraints not fixed widths; labels/buttons tolerate ±30% length; fluid table columns; tooltips carry truncated full text.
6. **Direction at multiple levels:** app shell → workspace/page → editor document → paragraph → inline span (`bdi` / `dir="auto"`). User-authored content containers always `dir="auto"`.
7. **Overlays and the ancestor they actually inherit from:** portal content renders outside the subtree that declared it, so it inherits nothing from its React parent — but it does inherit `direction` from `<html>`, which is its DOM ancestor. If the app owns direction on `document.documentElement` and sets it before first paint, portal content inherits it and needs no `dir` prop; it needs one exactly where its direction must DIFFER from the page's (a quoted extract, a code block, an embedded foreign document) or where the stack carries direction in a React context only (see the stack guide). Decide per stack, record which the project uses, and never state this as unconditional. (A blanket "portals never inherit" is false for document-driven stacks and was the source of a six-sprint false finding — see the portal-direction proposal.)
8. **Dual-direction testing scales with mode (see `speed-tiered-workflow.md`):** always-on cheap gate = logical-properties lint. vibe = run one direction per iteration, both directions at the milestone/ship boundary. standard/guarded = dual-direction E2E before commit; Storybook RTL+LTR stories for shared components (standard/guarded — not vibe). Visual regression per direction is a milestone/ship-boundary activity, never routine — routine direction checks use lint + programmatic dual-direction E2E (DOM/data assertions, no screenshots).

## Adoption

New projects: all principles from initialization (`pnpm dlx shadcn@latest init --rtl` or MUI RTL theme); logical-property linting + portal tests in the first commit. Existing projects: Phase ① logical properties + portal dir (zero risk) → ② `dir="auto"` + width constraints → ③ icons + typography + tests per component → ④ architectural (only if currently English-only).

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Arabic as post-hoc translation | Bidirectional-first architecture |
| Physical CSS in chrome | Logical properties |
| Un-flipped directional icons | Mirror with intent |
| `tracking-*` / opacity on Arabic | Zero spacing, opaque tokens |
| Fixed-width text containers | min/max constraints |
| Portal whose direction must differ from the document (or context-only stack) without `dir` | Explicit `dir` where the mechanism requires it; document-driven stacks inherit from `<html>` |
|| Testing only in LTR | Dual-direction per mode — lint always-on, E2E dual-direction at commit (standard/guarded) or milestone (vibe) |

## Cross-References

- **Depends on:** `rtl-tech-stack.md`, `accessibility-standards.md`
- **Extended by:** `../05-stack-guides/mui/mui-rtl-bidirectional.md`, `../05-stack-guides/shadcn/shadcn-rtl-bidirectional.md`
