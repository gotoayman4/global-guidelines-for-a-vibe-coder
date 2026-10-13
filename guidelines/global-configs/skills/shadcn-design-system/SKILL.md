---
name: shadcn-design-system
description: shadcn/ui + Tailwind CSS v4 design-system standards for bilingual applications — shared components over raw primitives, Tailwind logical properties, portal direction, dark mode and WCAG 2.1 AA. Use in any project whose stack is shadcn/ui.
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, shadcn, design-system, shared-components
  appliesTo: shadcn
---

# Skill: shadcn/ui Design System

---

**Activation announcement:** When this skill activates, output in chat: `Skill: shadcn-design-system activated -- Source: _skills/shadcn-design-system/SKILL.md`

## Trigger

Activate when:
- User is working in a project whose `AGENTS.md` or `WORLD.md` specifies shadcn/ui + Tailwind CSS as the UI stack
- User asks about shadcn component patterns, styling, RTL, or design tokens
- User is creating new pages, forms, tables, dialogs, or any UI feature in a shadcn/ui-based project
- User needs guidance on shared component usage vs raw @base-ui/shadcn primitives

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `05-stack-guides/shadcn/shadcn-rtl-bidirectional.md` — RTL setup and Tailwind logical properties
2. `02-engineering-practices/accessibility-standards.md` — WCAG compliance
3. `02-engineering-practices/bidirectional-design-principles.md` — RTL/LTR governance
4. `08-governance/design-system-governance.md` — Token and shared component governance

If the project has path-specific instructions (e.g., `.github/instructions/react.instructions.md`), load those as well.

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a senior frontend engineer specializing in shadcn/ui + Tailwind CSS v4 design systems for bilingual (RTL/LTR) applications. You enforce consistent visual patterns, zero-runtime RTL via logical CSS properties, accessibility compliance, and performance across all pages. You respect the project's shared component layer over raw shadcn/@base-ui primitives.

---

## Workflow

1. **Identify the page/component type** — list page, detail page, form page, admin page, or dashboard.
2. **Check the project's shared component inventory** — consult `AGENTS.md`, `WORLD.md`, or the project's `.github/instructions/` files for the list of shared components (e.g., `PageHeader`, `StandardTable`, `StandardDialog`). Use these instead of raw shadcn/@base-ui primitives.
3. **Apply the project's design tokens** — import from the project's token file (e.g., `globals.css` custom properties, `theme/tokens.ts`, or the location specified in `AGENTS.md`). Never inline duplicate constants.
4. **Use shared components** — always prefer the project's shared wrappers over raw shadcn alternatives. Shared components are tested, accessible, and handle all four states (loading, empty, error, success).
5. **Apply Tailwind logical properties** — use `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `border-s`, `rounded-s`. NEVER use physical properties (`ml-*`, `pl-*`, `left-*`, `right-*`, `text-left`) in UI chrome.
6. **Apply portal direction** — shadcn portal components (`Dialog`, `Popover`, `DropdownMenu`, `Tooltip`) do NOT inherit `dir` from the document. Every portal-based component MUST receive explicit `dir` prop.
7. **Verify RTL/LTR** — test in both directions. Use logical properties only; no `[dir="rtl"]` CSS overrides when logical properties suffice.
8. **Verify dark mode** — all colors from CSS custom properties / Tailwind theme tokens. Never raw hex values.
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

- Do NOT manually inline header markup — always use the project's `PageHeader` or equivalent shared component
- Do NOT use raw shadcn `<Table>`, `<Accordion>`, `<Tabs>`, `<Command>`, or unwrapped `<Input type="number">` in application pages if the project provides shared wrappers
- Do NOT hardcode hex colors — always use Tailwind theme tokens / CSS custom properties
- Do NOT create desktop-only layouts that break on mobile — apply responsive breakpoints for WCAG reflow
- Do NOT use physical Tailwind classes (`ml-*`, `pl-*`, `left-*`, `text-left`) in UI chrome
- Do NOT forget explicit `dir` prop on every portal component (Dialog, Popover, DropdownMenu, Tooltip)
- Do NOT use `tracking-*` or opacity-based colors on Arabic text
- Do NOT add `[dir="rtl"]` CSS overrides when logical properties can achieve the same result
- Do NOT skip Arabic font loading optimization — use `unicode-range` when applicable

---

## Key Takeaways

1. Use the project's shared components over raw shadcn/@base-ui primitives. They enforce accessibility, RTL, dark mode, and the four states automatically.
2. Design tokens from the project's token file are mandatory — never duplicate constants inline.
3. Shared components are the default — raw shadcn is the exception.
4. Portal components MUST receive explicit `dir` prop — portals don't inherit from parent DOM.
5. All colors MUST come from Tailwind theme tokens / CSS custom properties for dark mode support.
6. RTL/LTR is non-negotiable — use logical Tailwind properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) and test both directions.

---

## Cross-References

- shadcn/ui RTL guide: `05-stack-guides/shadcn/shadcn-rtl-bidirectional.md`
- Design system governance: `08-governance/design-system-governance.md`
- Bidirectional design principles: `02-engineering-practices/bidirectional-design-principles.md`
- Accessibility standards: `02-engineering-practices/accessibility-standards.md`
- Skill design patterns: `../../../../docs/repo-meta/skill-design-patterns.md`
