---
status: "Normative"
scope: "Global"
tags: [performance, profiling, caching]
---

# Performance Optimization — Measure First, Optimize Later

---

AI has two opposing pathologies: over-optimization (caching/memoization/Web Workers for 10 users) and under-optimization (N+1 queries, unvirtualized lists, whole-library imports). The cure for both: **measure first.**

## Directives

1. **Order: correctness → clarity → performance.** Only optimize when measurement proves need.
2. **Never optimize without data:** current performance (timing/profiling) · specific measurable target · bottleneck identified by profiler, not guess. "The dashboard renders in 2.3s; the /api/metrics endpoint takes 1.8s — get it under 200ms," not "optimize the dashboard."
3. **Optimize late:** clean straightforward code first; profile under realistic load; the code that's actually slow is rarely what you think.
4. **Real AI performance issues worth fixing immediately:**
   - **N+1 queries** — queries inside loops; fix with JOINs/eager loading/batching.
   - **Missing pagination** — every list endpoint paginates (`?page=1&limit=20`); no exceptions past ~50 potential items.
   - **Unvirtualized long lists** — virtualize >100 items (`react-window`).
   - **Whole-library imports** — modular/tree-shakeable imports only.
   - **Unlazy-loaded routes/images** — `React.lazy` per route; `loading="lazy"` + dimensions on images.
5. **Enforced budgets** (reject PRs exceeding them): LCP < 2.5s · bundle < 200KB gzipped · API p95 < 500ms · bundle growth <10% per PR.
6. **Frontend-specific patterns** (memoization rules, code splitting, virtualization details): see `react-performance.md`.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Caching layers before users exist | Delay complexity |
| Optimizing without profiling data | Measure first |
| N+1 query loops | JOIN / batch load |
| Accepting AI performance claims | Demand numbers |

## Cross-References

`react-performance.md` · `testing-patterns.md`
