## Performance (Load for Performance-Sensitive Features)
<!-- requires: web-ui, api -->

- **Profile Before Optimizing.** NEVER optimize without measurement — only measured bottlenecks. Work → Clean → Fast; never premature.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Budgets at Review Time.** Enforce at PR/milestone (not every edit): web LCP < 2.5s, bundle < 200KB gz, API p95 < 500ms; flag any change growing the bundle >10%.
  → Source: `02-engineering-practices/performance-optimization.md`
<!-- END generated:constitution-core -->
