---
name: mui-design-system
description: Activate when a project's stack is MUI (v9; v7 legacy) — design-system standards for bilingual (RTL/LTR) apps: theme composition and color schemes, shared components over raw primitives, design tokens, portal and aria rules, dialog focus restoration, high-contrast mode and WCAG 2.1 AA.
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, mui, design-system, shared-components
  appliesTo: mui
  trigger: MUI project, MUI component or theme, MUI dialog, RTL with MUI
---

# Skill: MUI Design System

---

## Trigger

Activate when:
- User is working in a project whose `AGENTS.md` or `WORLD.md` specifies MUI as the UI component library
- User asks about MUI component patterns, styling, theming, color schemes, RTL, or design tokens
- User is creating new pages, forms, tables, dialogs, or any UI feature in a MUI-based project
- User needs guidance on shared component usage vs raw MUI primitives

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `05-stack-guides/mui/mui-styling.md` — Styling layers, theme composition, color schemes, tokens
2. `05-stack-guides/mui/mui-rtl-bidirectional.md` — RTL setup and bidirectional patterns
3. `02-engineering-practices/accessibility-standards.md` — WCAG compliance
4. `02-engineering-practices/bidirectional-design-principles.md` — RTL/LTR governance
5. `08-governance/design-system-governance.md` — Token and shared component governance

If the project has path-specific instructions (e.g., `.github/instructions/react.instructions.md`), load those as well.

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a senior frontend engineer specializing in MUI 9 (v7 legacy) design systems for bilingual (RTL/LTR) applications. You enforce consistent visual patterns, accessibility compliance, and performance across all pages. You respect the project's shared component layer over raw MUI primitives.

---

## Workflow

1. **Identify the page/component type** — list page, detail page, form page, admin page, or dashboard.
2. **Check the project's shared component inventory** — consult `AGENTS.md`, `WORLD.md`, or the project's `.github/instructions/` files for the list of shared components (e.g., `PageHeader`, `StandardTable`, `StandardDialog`). Use these instead of raw MUI primitives.
3. **Apply the project's design tokens** — import from the project's token file (e.g., `theme/tokens.ts`, `theme/page-patterns.ts`, or the location specified in `AGENTS.md`). Theme configuration lives in ONE module: `createTheme` + `colorSchemes` + `cssVariables: true`; add brand tokens via TypeScript module augmentation. Never inline duplicate constants or call `createTheme` per component.
4. **Use shared components** — always prefer the project's shared wrappers (e.g., `StandardTable`, `StandardDialog`, `StandardForm`) over raw MUI alternatives. Shared components are tested, accessible, and handle all four states (loading, empty, error, success).
5. **Apply MUI Portal / aria-hidden rules** —
   - `Select` inside `Dialog`/`Drawer` → `slotProps={{ menu: { disablePortal: true } }}`
   - `Select` outside `Dialog` → consider `<TextField select slotProps={{ select: { native: true } }}>` to avoid portal issues
6. **Apply dialog focus restoration** — capture trigger element, set `disableRestoreFocus`, restore focus in `slotProps={{ transition: { onExited } }}`.
7. **Verify RTL/LTR** — use MUI logical spacing properties (`marginInlineStart`, `paddingInlineEnd`, etc.) and test in both directions. A free-text field is not verified until its EMPTY state is: `dir="auto"` is value-derived, so an empty field resolves LTR on an RTL page and the caret starts on the wrong side. Give it the UI language's direction while empty and `auto` once typed — one shared helper, passed through `slotProps={{ htmlInput: { dir } }}`.
8. **Verify dark mode and high contrast** — all colors from `theme.palette.*` or `theme.vars.*`, never raw hex values. Use `colorSchemes` + `useColorScheme()` rather than a manual `palette.mode` toggle; use `theme.applyStyles('dark', …)` for scheme-specific styles and `enhanceHighContrast(theme)` for Windows forced-colors.
9. **Verify WCAG 2.1 AA** — contrast ratios in both light and dark modes.

---

## Output Format

When generating or modifying UI code:
1. **Component choice** — which shared components are used and why
2. **Design token mapping** — which tokens from the project's token file are applied
3. **Semantic color** — which color mapping (primary/info/secondary/success/warning) and why
4. **RTL/LTR verification** — note any RTL-specific concerns
5. **Dark mode and high-contrast verification** — confirm all colors use theme tokens and `enhanceHighContrast` is applied when forced-colors support is required
6. **WCAG verification** — confirm contrast compliance

---

## Anti-Patterns

- Do NOT manually inline header markup (gradient card + icon box + title) — always use the project's `PageHeader` or equivalent shared component
- Do NOT use raw MUI `<Table>`, `<Accordion>`, `<Tabs>`, `<Autocomplete multiple>`, or `<TextField type="number">` in application pages if the project provides shared wrappers
- Do NOT hardcode hex colors — always use `theme.palette.*` or `theme.vars.*` tokens
- Do NOT create desktop-only layouts that break on mobile — apply responsive breakpoints for WCAG reflow
- Do NOT use legacy MUI patterns (`makeStyles`, `withStyles`, `StylesProvider`, `CssVarsProvider`)
- Do NOT use CSS modules, Tailwind, or inline `style={{}}` alongside MUI in a MUI-based project
- Do NOT call `createTheme` per component or add a second `ThemeProvider` — one theme module, composed in steps
- Do NOT add a global `.css` reset or bare `.Mui-*` state selector — use `CssBaseline`/`GlobalStyles` and scope state selectors to the component root
- Do NOT build dark mode by branching on `theme.palette.mode` where `theme.applyStyles('dark', …)` works, and never fake high contrast with CSS filters
- Do NOT forget `disableRestoreFocus` + focus restoration on Dialog components
- Do NOT use MUI `<Select>` outside Dialog/Drawer without considering portal/aria-hidden implications
- Do NOT create TextField with both `label` and `placeholder` without `slotProps={{ inputLabel: { shrink: true } }}` — the label will overlap the placeholder. For native selects combine both: `slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}`

---

## Key Takeaways

1. Use the project's shared components over raw MUI primitives. They enforce accessibility, RTL, dark mode, and the four states automatically.
2. Design tokens from the project's token file are mandatory — never duplicate constants inline.
3. One theme module: `createTheme` + `colorSchemes` + `cssVariables: true`; `useColorScheme()` for the toggle, `theme.applyStyles()` for scheme styles, `enhanceHighContrast()` for forced colors.
4. Shared components (e.g., `StandardTable`, `StandardAccordion`) are the default — raw MUI is the exception.
5. MUI Portal/aria-hidden rules prevent accessibility warnings — always apply the correct pattern.
6. All colors MUST come from `theme.palette.*` or `theme.vars.*` tokens for dark mode support.
7. RTL/LTR is non-negotiable — use logical spacing properties, test both directions, and make a text field's EMPTY state part of the test: an empty `dir="auto"` field resolves LTR on an RTL page, so it starts on the UI language's side and turns `auto` once typed.

---

## Cross-References

- MUI styling guide: `05-stack-guides/mui/mui-styling.md`
- MUI RTL guide: `05-stack-guides/mui/mui-rtl-bidirectional.md`
- Design system governance: `08-governance/design-system-governance.md`
- Bidirectional design principles: `02-engineering-practices/bidirectional-design-principles.md`
- Accessibility standards: `02-engineering-practices/accessibility-standards.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repository only; not delivered with this skill)
