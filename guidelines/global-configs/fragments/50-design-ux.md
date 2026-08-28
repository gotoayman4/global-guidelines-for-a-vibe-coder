## Design & UX (Load for UI Work)

- **Apply Interaction Design Heuristics.** Every UI decision MUST align with Nielsen's 10 Usability Heuristics: visible feedback for every action, prevent errors before handling them, show options and state persistently, always provide an escape (Cancel/Undo), and speak the user's language — never expose internal jargon or error codes in the UI.
  → Source: `02-engineering-practices/ux-design-principles.md`
- **Handle All Four States.** Every data-dependent component MUST handle loading, error, empty, and success states.
  → Source: `06-frontend-patterns/loading-and-empty-states.md`
- **Visual Consistency Through Design Tokens.** All styling MUST use design tokens (theme.palette or CSS custom properties). Enforce via linting.
  → Source: `06-frontend-patterns/visual-design-principles.md`
- **Shared Components Over Raw Primitives.** Use application shared components (StandardTable, PageHeader, StandardDialog) over raw library primitives; every shared component handles all four states and is tested in both RTL and LTR.
  → Source: `04-architecture/frontend-architecture.md`
- **Visual Hierarchy and Spacing.** High contrast for important elements, low for structural. 8px-based spacing scale. Max 2 typefaces, body text 16px+. Never convey information through color alone — always pair with text, icons, or patterns.
  → Source: `06-frontend-patterns/visual-design-principles.md`
- **Incremental Adoption for Existing Projects.** Design system adoption MUST NOT block feature development: new features use design system components exclusively; existing code migrates when touched (Strangler Fig). Track adoption metrics with quarterly targets.
  → Source: `08-governance/design-system-governance.md`
