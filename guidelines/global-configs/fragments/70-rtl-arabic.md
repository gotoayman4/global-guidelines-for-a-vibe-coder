## RTL & Arabic (Always Active — All Projects Are Bilingual)

**All projects in this organization are bilingual (English + Arabic) by default. These rules always apply.**

- **Arabic-First Architecture.** Arabic support is an architectural requirement, NOT a localization afterthought. Every component, page, and feature MUST be designed for bidirectional text from day one, with direction handled at UI shell, workspace, document, paragraph, and inline span levels.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Logical CSS Properties Exclusively.** Use logical CSS properties everywhere in UI chrome: Tailwind `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`; MUI Emotion `marginInlineStart`/`paddingInlineEnd` or direction-aware `sx`. NEVER physical properties (`ml-*`, `pl-*`, `left-*`, `right-*`, `text-left`) in UI chrome. Lint rule enforced.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Mirroring With Intent.** Navigation, breadcrumbs, pagination, timelines, and directional icons MUST mirror in RTL (`rtl:rotate-180` or equivalent). Logos, numbers, code, and non-directional icons MUST NOT mirror.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Arabic Typography Rules.** Arabic text requires: line-height 1.6–1.8, minimum font-weight 400, zero letter-spacing (tracking disconnects cursive letters), no opacity on text blocks (jagged rendering in Firefox), no `word-break: break-all`.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Portal Direction Inheritance.** Portal-based components (Dialog, Popover, DropdownMenu, Tooltip, Select, Menu, Drawer — React Portal, Radix, MUI, Ariakit, Headless UI) do NOT inherit `dir` from the document; every one MUST receive an explicit `dir` prop. The #1 RTL regression source.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Numeral Policy.** Use Western Arabic numerals (0-9) for UI chrome by default. Domain products (writing, education, legal, religious, archival) MAY offer user-selectable numeral styles via `Intl.NumberFormat` with explicit numbering systems (`ar-u-nu-latn`, `ar-u-nu-arab`).
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **RTL-Compliant Tech Stack.** Use libraries with proven RTL support. MUI 9+ is fully valid, NOT deprecated. Tailwind CSS v4 + shadcn/ui (initialized `--rtl`) + @base-ui/react + @radix-ui/react-direction + React Aria is the alternative for custom visual identity or zero-runtime RTL. Automated auditing: `npx rtlify-ai check`.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Bilingual UI — All Text Uses i18n Keys.** All user-facing strings (labels, buttons, placeholders, errors, titles, tooltips) MUST use i18n keys. No hardcoded English or Arabic strings in components.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **LTR/RTL Testing Before Commit.** Every page MUST be tested in both LTR (English) and RTL (Arabic) before committing. Dual-direction E2E tests are mandatory. Visual regression in either direction is a bug.
  → Source: `05-stack-guides/rtl-tech-stack.md`
