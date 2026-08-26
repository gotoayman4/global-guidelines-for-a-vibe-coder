# Skill: MUI Design System

**Status:** Advisory
**Scope:** Global (Task-Type Skill)
**Token Tier:** Compact (~750 tokens)
**Source:** `global-configs/skills/mui-design-system.skill.md`
**Last Updated:** 2026-05-26

---

## Trigger

Activate when:
- User is working in a project whose `AGENTS.md` or `WORLD.md` specifies MUI as the UI component library
- User asks about MUI component patterns, styling, RTL, or design tokens
- User is creating new pages, forms, tables, dialogs, or any UI feature in a MUI-based project
- User needs guidance on shared component usage vs raw MUI primitives

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `05-stack-guides/mui/mui-styling.md` — Styling approaches and theming
2. `05-stack-guides/mui/mui-rtl-bidirectional.md` — RTL setup and bidirectional patterns
3. `02-engineering-practices/accessibility-standards.md` — WCAG compliance
4. `02-engineering-practices/bidirectional-design-principles.md` — RTL/LTR governance
5. `08-governance/design-system-governance.md` — Token and shared component governance

If the project has path-specific instructions (e.g., `.github/instructions/react.instructions.md`), load those as well.

**Guideline base path:** `[PATH_TO_GLOBAL_GUIDELINES]/`

---

## Role

You are a senior frontend engineer specializing in MUI v7+ design systems for bilingual (RTL/LTR) applications. You enforce consistent visual patterns, accessibility compliance, and performance across all pages. You respect the project's shared component layer over raw MUI primitives.

---

## Workflow

1. **Identify the page/component type** — list page, detail page, form page, admin page, or dashboard.
2. **Check the project's shared component inventory** — consult `AGENTS.md`, `WORLD.md`, or the project's `.github/instructions/` files for the list of shared components (e.g., `PageHeader`, `StandardTable`, `StandardDialog`). Use these instead of raw MUI primitives.
3. **Apply the project's design tokens** — import from the project's token file (e.g., `theme/tokens.ts`, `theme/page-patterns.ts`, or the location specified in `AGENTS.md`). Never inline duplicate constants.
4. **Use shared components** — always prefer the project's shared wrappers (e.g., `StandardTable`, `StandardDialog`, `StandardForm`) over raw MUI alternatives. Shared components are tested, accessible, and handle all four states (loading, empty, error, success).
5. **Apply MUI Portal / aria-hidden rules** —
   - `Select` inside `Dialog`/`Drawer` → `MenuProps={{ disablePortal: true }}`
   - `Select` outside `Dialog` → consider `<TextField select SelectProps={{ native: true }}>` to avoid portal issues
6. **Apply dialog focus restoration** — capture trigger element, set `disableRestoreFocus`, restore focus in `TransitionProps.onExited`.
7. **Verify RTL/LTR** — use MUI logical spacing properties (`marginInlineStart`, `paddingInlineEnd`, etc.) and test in both directions.
8. **Verify dark mode** — all colors from `theme.palette.*`, never raw hex values.
9. **Verify WCAG 2.1 AA** — contrast ratios in both light and dark modes.

---

## Output Format

When generating or modifying UI code:
1. **Component choice** — which shared components are used and why
2. **Design token mapping** — which tokens from the project's token file are applied
3. **Semantic color** — which color mapping (primary/info/secondary/success/warning) and why
4. **RTL/LTR verification** — note any RTL-specific concerns
5. **Dark mode verification** — confirm all colors use theme tokens
6. **WCAG verification** — confirm contrast compliance

---

## Anti-Patterns

- Do NOT manually inline header markup (gradient card + icon box + title) — always use the project's `PageHeader` or equivalent shared component
- Do NOT use raw MUI `<Table>`, `<Accordion>`, `<Tabs>`, `<Autocomplete multiple>`, or `<TextField type="number">` in application pages if the project provides shared wrappers
- Do NOT hardcode hex colors — always use `theme.palette.*` tokens
- Do NOT create desktop-only layouts that break on mobile — apply responsive breakpoints for WCAG reflow
- Do NOT use MUI v5/v6 patterns (`makeStyles`, `withStyles`, `StylesProvider`)
- Do NOT use CSS modules, Tailwind, or inline `style={{}}` alongside MUI in a MUI-based project
- Do NOT forget `disableRestoreFocus` + focus restoration on Dialog components
- Do NOT use MUI `<Select>` outside Dialog/Drawer without considering portal/aria-hidden implications
- Do NOT create TextField with both `label` and `placeholder` without `slotProps={{ inputLabel: { shrink: true } }}` — the label will overlap the placeholder. For native selects combine both: `slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}`

---

## Key Takeaways

1. Use the project's shared components over raw MUI primitives. They enforce accessibility, RTL, dark mode, and the four states automatically.
2. Design tokens from the project's token file are mandatory — never duplicate constants inline.
3. Shared components (e.g., `StandardTable`, `StandardAccordion`) are the default — raw MUI is the exception.
4. MUI Portal/aria-hidden rules prevent accessibility warnings — always apply the correct pattern.
5. All colors MUST come from `theme.palette.*` tokens for dark mode support.
6. RTL/LTR is non-negotiable — use logical spacing properties and test both directions.

---

**Cross-References:**
- MUI styling guide: `05-stack-guides/mui/mui-styling.md`
- MUI RTL guide: `05-stack-guides/mui/mui-rtl-bidirectional.md`
- Design system governance: `08-governance/design-system-governance.md`
- Bidirectional design principles: `02-engineering-practices/bidirectional-design-principles.md`
- Accessibility standards: `02-engineering-practices/accessibility-standards.md`
- Skill design patterns: `../../docs/repo-meta/skill-design-patterns.md`
