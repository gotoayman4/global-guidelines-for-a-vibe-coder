## RTL & Arabic (Bilingual UI — Requires `bilingual`)
<!-- requires: bilingual -->

- **Arabic-First Architecture.** Unless `WORLD.md` declares a single-language/LTR-only tool, design every UI component for bidirectional text from day one — direction handled at shell, document, paragraph and inline-span levels.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Logical CSS in UI Chrome.** Use logical properties (`ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`; `marginInlineStart`). Physical properties are forbidden except in explicit LTR contexts (code, math, URLs, emails). Lint-enforced.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Direction, i18n Keys & Dual-Direction Test.** Portals inherit `direction` from `<html>`. Free-text `dir="auto"` fields start in UI direction while empty and follow typed text. User-facing strings use i18n keys. `vibe`: one direction per iteration, both at milestone; `standard`/`guarded`: dual-direction E2E before commit.
  → Source: `05-stack-guides/rtl-tech-stack.md`
