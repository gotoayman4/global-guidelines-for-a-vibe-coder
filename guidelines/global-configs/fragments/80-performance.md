## Performance (Load for Performance-Sensitive Features)

- **Profile Before Optimizing.** NEVER optimize without measurement — only measured bottlenecks. Work → Clean → Fast; never premature.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Budgets at Review Time.** Enforce at PR/milestone (not every edit): LCP < 2.5s, bundle < 200KB gz, API p95 < 500ms; reject PRs growing bundle >10%.
  → Source: `02-engineering-practices/performance-optimization.md`
