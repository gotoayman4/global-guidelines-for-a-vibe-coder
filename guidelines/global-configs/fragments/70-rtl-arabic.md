## RTL & Arabic (Always Active — All Projects Are Bilingual)

**All projects in this organization are bilingual (English + Arabic) by default. These rules always apply — in every speed mode.**

- **Arabic-First Architecture.** Design every component for bidirectional text from day one — direction handled at UI shell, workspace, document, paragraph, and inline span levels. Arabic support is architectural, not a localization afterthought.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Logical CSS Properties Exclusively.** UI chrome uses only logical properties (Tailwind `ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`; Emotion `marginInlineStart`). NEVER physical (`ml-*`, `pl-*`, `left`, `right`, `text-left`). Lint-enforced.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Portal `dir` + i18n Keys + Dual-Direction Test.** Portals escape the React parent but inherit `direction` from `<html>` — set explicit `dir` only where direction differs. All user-facing strings use i18n keys. Direction testing scales with mode: **vibe** = one direction per iteration, both at milestone; **standard/guarded** = dual-direction E2E before commit (logical-properties lint always-on). Visual checks are Tier-3 rare. Arabic typography + numerals: `_guidelines/05-stack-guides/rtl-tech-stack.md`.
  → Source: `05-stack-guides/rtl-tech-stack.md`
