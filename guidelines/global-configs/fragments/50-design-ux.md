## Design & UX (Load for UI Work)

- **Heuristics + Four States + Tokens.** Every UI aligns with Nielsen's 10 heuristics (visible feedback, error prevention, escape hatch, user's language — no jargon/error codes in UI). Every data-dependent component handles loading, error, empty, success. Design tokens only (theme.palette / CSS custom properties), lint-enforced. Shared components (StandardTable, PageHeader, StandardDialog) over raw primitives — each handles all four states, tested RTL+LTR. Detail: `_guidelines/02-engineering-practices/ux-design-principles.md`, `_guidelines/06-frontend-patterns/visual-design-principles.md`.
  → Source: `02-engineering-practices/ux-design-principles.md`
- **Incremental Adoption.** Design-system adoption MUST NOT block feature work: new features use shared components exclusively; existing code migrates when touched (Strangler Fig); quarterly adoption targets.
  → Source: `08-governance/design-system-governance.md`
