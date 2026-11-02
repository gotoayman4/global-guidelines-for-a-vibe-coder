## Design & UX (Load for UI Work)

- **Heuristics + Four States + Tokens.** Follow Nielsen's 10 heuristics (visible feedback, error prevention, escape hatch, user language — no jargon/codes in UI). Handle loading, error, empty, success in every data component. Design tokens only (lint-enforced); prefer project shared components (e.g., StandardTable, PageHeader, StandardDialog when present) over raw primitives.
  → Source: `02-engineering-practices/ux-design-principles.md`
- **Incremental Adoption.** Design-system adoption MUST NOT block feature work: new features use shared components; existing code migrates when touched (Strangler Fig).
  → Source: `08-governance/design-system-governance.md`
