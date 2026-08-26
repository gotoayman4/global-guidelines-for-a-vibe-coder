# Bidirectional Design Principles — Arabic-First, RTL-Native UX

**Status:** Normative
**Scope:** Global — All Projects (Bilingual by Default)
**Token Tier:** Full (~1,200 tokens)
**Last Updated:** 2026-08-26
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
7. **Portal components do NOT inherit `dir`:** DialogContent, PopoverContent, DropdownMenuContent, TooltipContent, SelectContent, SheetContent all need explicit `dir` props. This is the #1 production RTL regression; fixing it has zero LTR impact.
8. **Dual-direction testing mandatory:** E2E in both directions; Storybook RTL+LTR stories for every shared component; visual regression per direction; manual QA checklist (forms align RTL, tables scroll RTL, dialogs positioned correctly, icons flipped correctly, bidi content clean).

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
| Portal without dir prop | Explicit dir always |
| Testing only in LTR | Dual-direction mandatory |

## Cross-References

- **Depends on:** `rtl-tech-stack.md`, `accessibility-standards.md`
- **Extended by:** `../05-stack-guides/mui/mui-rtl-bidirectional.md`, `../05-stack-guides/shadcn/shadcn-rtl-bidirectional.md`
