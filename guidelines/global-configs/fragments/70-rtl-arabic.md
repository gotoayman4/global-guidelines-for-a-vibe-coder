## RTL & Arabic (Always Active — All Projects Are Bilingual)

**All projects in this organization are bilingual (English + Arabic) by default. These rules always apply — in every speed mode.**

- **Arabic-First Architecture.** Design every component for bidirectional text from day one — direction handled at UI shell, workspace, document, paragraph, and inline span levels. Arabic support is architectural, not a localization afterthought.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Logical CSS Properties Exclusively.** UI chrome uses only logical properties (Tailwind `ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`; Emotion `marginInlineStart` etc.). NEVER physical (`ml-*`, `pl-*`, `left`, `right`, `text-left`). Lint-enforced.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Portal `dir` + i18n Keys + Dual-Direction Test.** Every portal component (Dialog, Popover, DropdownMenu, Tooltip, Select, Menu, Drawer) gets an explicit `dir` prop — the #1 RTL regression. All user-facing strings use i18n keys — no hardcoded text. Pages are tested LTR and RTL before commit (standard/guarded: dual-direction E2E; vibe: both directions at milestone). Arabic typography: line-height 1.6–1.8, no `letter-spacing`, no text opacity, no `break-all`; Western numerals by default; mirror nav/breadcrumbs/pagination/timelines only. Full detail: `_guidelines/05-stack-guides/rtl-tech-stack.md`.
  → Source: `05-stack-guides/rtl-tech-stack.md`
