---
status: "Normative"
scope: "Global"
tags: [frontend, spa, components]
---

# Frontend Architecture — Structuring UI Applications

---

## Directives

1. **Separate UI from logic:** components render only; stateful logic/side effects in hooks; business logic/validation in services; API calls through a dedicated API layer. Structurally enforced via the standard layout:
   ```
   src/
   ├── components/{ui,layout,features/<domain>}/
   ├── hooks/
   ├── services/        # api.ts, auth.ts, validation.ts
   ├── types/  utils/
   └── pages/
   ```
2. **One component, one responsibility.** Plan 300 lines per file; 400 is a soft ceiling — record it as debt and split before the next feature touches the file (or in a scheduled refactor pass); do not stall the current change mid-slice. ESLint `max-lines` warns; source only (docs/config/generated excluded).
3. **Composition over inheritance:** children/render props/slots; no class inheritance or HOC chains.
4. **Centralize business logic:** one `validation.ts`, not validation copy-pasted across forms.
5. **Explicit data flow:** props down, events up; global state accessed only via well-known hooks (`useAuth()`); side effects contained in hooks with clear dependency arrays. No implicit/magical data flow.
6. **Routing in one place;** route-level components lazy-loaded (`React.lazy`); protected routes via wrapper component, not inline checks; typed route params.
7. **State placement:** server state → React Query · local UI state → useState/useReducer · global UI → Context/Zustand sparingly · form → React Hook Form. NEVER server state in Redux/Zustand/Context (stale-data bugs — AI does this by default).
8. Every data-dependent component handles loading/error/empty/success.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Monolithic components | Split at 400 (plan 300, land under 300) |
| Logic in render | Hooks + services |
| Inline fetch in components | API service layer |
| Prop drilling >3 levels | Context or composition |
| Server state in global store | React Query |
| Missing four states | Always handle all four |

## Cross-References

`state-management.md` · `file-organization.md` · `react-architecture.md` · `design-system-governance.md` · `api-design-standards.md`
