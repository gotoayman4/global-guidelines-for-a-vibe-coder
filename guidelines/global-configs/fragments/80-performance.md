## Performance (Load for Performance-Sensitive Features)

- **Profile Before Optimizing.** NEVER optimize without measurement. Optimize only measured bottlenecks.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Make It Work → Make It Clean → Make It Fast.** Optimize only after correctness and cleanliness are established. Never optimize prematurely.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Performance Budgets.** Enforce budgets: LCP < 2.5s, bundle < 200KB gzipped, API p95 < 500ms. Reject PRs that increase bundle >10%.
  → Source: `02-engineering-practices/performance-optimization.md`
