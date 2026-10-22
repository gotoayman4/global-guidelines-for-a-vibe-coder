---
status: "Normative"
scope: "Global"
tags: [planning, scoping, prd]
---

# Planning and Scoping — Building the Right Thing

---

The most expensive vibe-coding mistake is building the wrong thing very quickly. Plan at five levels, descending only as needed: Vertical Slice → Vision (WORLD.md) → Roadmap → Feature Plan → Task Plan.

## Directives

1. **Vertical slice first:** identify the thinnest complete end-to-end feature (UI → API → DB) before any other planning. Horizontal layering (all models → all services → all UI) is forbidden — nothing integrates until the end.
2. **WORLD.md before code:** sovereign purpose, style/vibe, explicit out-of-scope boundaries, core data model, pinned stack. Reference it in every major prompt — it prevents agents from filling gaps with generic defaults and scope creep.
3. **Prioritized roadmap:** P0 (MVP must-have) / P1 / P2 / WON'T DO. NEVER start P1 while P0 incomplete.
4. **Feature plan before non-trivial code (standard/guarded; `vibe` uses the 3-bullet intent in `speed-tiered-workflow.md`):** user story · acceptance criteria (verifiable) · architecture approach with rationale · affected files (create/modify/delete) · data/API/UI changes · testing strategy · risks + mitigations · rollback plan. Flow: AI proposes plan(s) → AI reviews simplicity/conventions/hidden complexity → record the choice → only then code.
5. **Task plan per iteration:** single one-sentence objective · explicit file lists · files to read first · constraints · acceptance criteria · 15–60 min scope.
6. **Prefer boring technology:** React + Vite/Next.js · Express or FastAPI · PostgreSQL · Prisma/TypeORM · Tailwind/MUI · Vitest + Playwright. Avoid frameworks <3 months old, niche languages, bleeding-edge everything.
7. **Verify versions before pinning:** search web/npm for the current latest stable; never trust AI-suggested versions (training cutoff). Older pins only with documented ADR reason: compatibility constraint · Arabic RTL regression · unadopted major (zero training data) · platform lock-in · ecosystem lag.
8. **Delay complexity until proven necessary:** microservices, CQRS/event sourcing, advanced caching, plugin systems, elaborate abstractions.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| No WORLD.md | Create before any code |
| Building P1 before P0 | Strict priority order |
| Skipping the plan phase | Plan → review → implement |
| Horizontal layering | Vertical slices |
| Exotic technology | Boring stacks |
| Over-engineering day one | Delay complexity |

## Cross-References

`development-workflow.md` · `ai-collaboration-mindset.md` · `frontend-architecture.md` · `backend-architecture.md`
