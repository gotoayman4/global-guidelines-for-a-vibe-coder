## RTL & Arabic (Always Active — All Projects Are Bilingual)

- **Arabic-First Architecture.** Design every component for bidirectional text from day one — direction handled at shell, document, paragraph and inline-span levels. Arabic support is architectural, not a localization afterthought.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Logical CSS in UI Chrome.** Use logical properties (`ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`; `marginInlineStart`). Physical properties are forbidden except in explicit LTR contexts (code, math, URLs, emails). Lint-enforced.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Direction: portals inherit `<html>`; a typed field starts on the UI side; i18n Keys; Dual-Direction Test.** Portals inherit `direction` from `<html>` — set explicit `dir` only where direction differs. A free-text `dir="auto"` field starts in the UI language's direction while empty and follows the value once typed (an empty `auto` field resolves LTR). All user-facing strings use i18n keys. vibe: one direction per iteration, both at milestone; standard/guarded: dual-direction E2E before commit.
  → Source: `05-stack-guides/rtl-tech-stack.md`
