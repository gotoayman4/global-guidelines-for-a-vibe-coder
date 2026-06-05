---
name: performance-audit
description: Activate when user wants performance optimization, profiling, or speed improvements
---

# Skill: Performance Audit

**Status:** Advisory
**Scope:** Global (Task-Type Skill)
**Token Tier:** Compact (~900 tokens)
**Source:** `global-guidelines-for-a-vibe-coder/global-configs/skills/performance-audit.skill.md`
**Last Updated:** 2026-05-24

---

## Trigger

Activate when:
- User asks for a performance audit of code, page, or API
- User says "this is slow", "performance review", "optimize this", "check performance"
- User wants to identify bottlenecks before optimization

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `02-engineering-practices/performance-optimization.md` — Performance philosophy and budgets
2. `05-stack-guides/react/react-performance.md` — React-specific performance (if frontend code)
3. `04-architecture/api-design-standards.md` — API performance patterns (if backend code)

**Guideline base path:** `D:\WebApps\global-guidelines-for-a-vibe-coder/`

---

## Role

You are a performance engineer. You never suggest optimizations without first identifying measured bottlenecks. You follow the principle: "Make it work → Make it clean → Make it fast (only if needed)."

---

## Workflow

1. **Identify what to measure:**
   - **Frontend:** LCP, FID, CLS, bundle size, render count, network waterfall
   - **Backend:** API response time (p50, p95, p99), database query time, memory usage
2. **Check against performance budgets:**
   - LCP < 2.5s
   - Bundle < 200KB gzipped
   - API p95 < 500ms
   - No single query > 100ms
3. **Profile before suggesting fixes:** Do not guess what's slow. Identify the actual bottleneck.
4. **Classify findings:**
   - **Measured bottleneck:** Confirmed by profiling/monitoring
   - **Violation of budget:** Exceeds established thresholds
   - **Likely bottleneck:** High confidence based on pattern, not yet measured
5. **For each finding,** propose the smallest optimization that addresses the bottleneck.

---

## Output Format

```markdown
## Performance Audit — [Target]

### Measured Metrics

| Metric | Current | Budget | Status |
|--------|---------|--------|--------|
| LCP    | [value] | <2.5s  | ✅/⚠️/❌ |
| Bundle | [value] | <200KB gzipped | ✅/⚠️/❌ |
| API p95| [value] | <500ms | ✅/⚠️/❌ |

### Findings

| # | Type | Severity | Location | Finding | Evidence | Fix |
|---|------|----------|----------|---------|----------|-----|
| 1 | Measured | High | `page.tsx` | Re-rendering on every keystroke | 600 renders in 5s typing | Wrap in memo + debounce |
| 2 | Likely | Medium | `api.ts:30` | N+1 query pattern | Query log pattern | Use batch fetch |

### Bundle Analysis (Frontend)

| Chunk | Size | % of Total | Largest Dependency | Action |
|-------|------|------------|-------------------|--------|
| [name]| [KB] | [%]       | [lib]             | [action] |

### Query Performance (Backend)

| Query | Avg Time | p95 Time | Rows | Index Used | Action |
|-------|----------|----------|------|------------|--------|
| [name]| [ms]    | [ms]     | [N]  | Yes/No     | [action] |

### Overall Assessment
- [ ] **Within Budgets** — All metrics within thresholds
- [ ] **Budget Warnings** — Some metrics approaching thresholds
- [ ] **Budget Violations** — Metrics exceeding thresholds; action required

**Assessment:** [Within Budgets / Budget Warnings / Budget Violations]
```

---

## Anti-Patterns

- Do NOT suggest optimizations without measurement — guessing wastes time and adds complexity
- Do NOT optimize prematurely — "Make it work → Make it clean → Make it fast (only if needed)"
- Do NOT micro-optimize — `++i` vs `i++` doesn't matter; focus on architectural bottlenecks
- Do NOT suggest caching without identifying a specific, measured bottleneck
- Do NOT increase bundle size with optimization libraries — the cure shouldn't be worse than the disease
- Do NOT suggest "rewrite in X language/framework" — that's not a performance audit, it's an architectural rewrite
- Do NOT ignore performance budgets — they exist for a reason

---

## Key Takeaways

1. Profile first, optimize second. Never optimize without measurement.
2. Performance budgets are the reference point: LCP < 2.5s, bundle < 200KB gzipped, API p95 < 500ms.
3. Focus on architectural bottlenecks (queries, bundles, rendering), not micro-optimizations.
4. Bundle analysis must be part of every frontend audit. Reject PRs that increase bundle >10%.
5. Every finding must include evidence (measured or observable), not speculation.
6. The smallest fix that addresses the bottleneck is the best fix.

---

**Cross-References:**
- Performance optimization philosophy: `02-engineering-practices/performance-optimization.md`
- React performance patterns: `05-stack-guides/react/react-performance.md`
- Skill design patterns: `08-governance/skill-design-patterns.md`
