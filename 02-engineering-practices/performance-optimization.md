# Performance Optimization — Measure First, Optimize Later

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,000 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `ai-collaboration-mindset.md`

---

## Purpose

Define the performance optimization strategy for AI-assisted development. AI often optimizes imaginary bottlenecks and introduces complexity in the name of performance. This document ensures performance work is evidence-based and cost-effective.

---

## The Performance Problem with AI

AI has two opposing performance pathologies:

1. **Over-optimization:** AI adds caching, memoization, code splitting, and Web Workers for features that will serve 10 users. This introduces complexity without measurable benefit.
2. **Under-optimization:** AI generates N+1 queries, renders large lists without virtualization, and loads entire libraries for single functions. This creates real performance problems.

**The solution:** Measure before optimizing. Never accept AI's performance claims without data.

---

## Golden Rules

### Rule 1: Correctness First, Clarity Second, Performance Third

A working, understandable application serves users. A "performant" application that's broken or unmaintainable serves nobody.

**Optimization order:**
1. Make it work (correctness)
2. Make it clean (maintainability)
3. Make it fast (performance — only if measurement proves it's needed)

### Rule 2: Never Optimize Without Measurement

AI often optimizes imaginary bottlenecks. Demand evidence:

```
Instead of: "Optimize the dashboard for performance."
Use: "The dashboard renders in 2.3s (Lighthouse). The bottleneck is the /api/metrics 
endpoint (1.8s response time). Optimize this endpoint to respond in under 200ms."
```

**Required measurements before optimization:**
- What is the current performance? (Timing, profiling data)
- What is the target performance? (Specific, measurable goal)
- What is the bottleneck? (Profilers, not guesses)

### Rule 3: Optimize Late, Not Early

Premature optimization is the root of many AI-generated problems. AI adds caching layers, memoization wrappers, and complex state management "for performance" before the application has users.

**Principle:** Write clean, straightforward code first. Profile under realistic load. Optimize only the measured bottlenecks. The code that's actually slow is rarely the code you think is slow.

---

## Common AI Performance Issues (That ARE Worth Fixing)

### 1. N+1 Queries (Database)

AI frequently queries inside loops, creating N+1 problems.

**Detection:** Database query logs show repeated identical queries with different IDs.

**Fix:** Use JOINs, eager loading, or batch queries.
```typescript
// BAD (N+1): AI generates this frequently
const users = await db.query('SELECT * FROM users');
for (const user of users) {
  user.posts = await db.query('SELECT * FROM posts WHERE user_id = $1', [user.id]);
}

// GOOD: Single query with JOIN or batch load
const usersWithPosts = await db.query(`
  SELECT u.*, json_agg(p.*) as posts 
  FROM users u LEFT JOIN posts p ON u.id = p.user_id 
  GROUP BY u.id
`);
```

### 2. Missing Pagination

AI returns all records by default. For lists with more than 50 items, this is a problem.

**Rule:** Every list endpoint must support pagination: `?page=1&limit=20`. No exceptions for lists that could grow beyond 50 items.

### 3. Unoptimized Rendering (React)

AI generates components that re-render unnecessarily or render large lists without virtualization.

**Fix:** `React.memo` for expensive pure components. Virtualization (`react-window`, MUI's `VirtualizedList`) for lists >100 items. But only after measuring that rendering is actually slow.

### 4. Large Bundle Sizes

AI imports entire libraries for single functions.

```typescript
// BAD: Imports entire lodash
import _ from 'lodash';
const result = _.debounce(fn, 300);

// GOOD: Tree-shakeable import
import debounce from 'lodash/debounce';
const result = debounce(fn, 300);
```

---

## Performance Measurement Toolkit

| What to Measure | Tool | When |
|---|---|---|
| Web performance (LCP, FCP, TBT) | Lighthouse, Web Vitals | Before and after optimization |
| React render performance | React DevTools Profiler | When components feel sluggish |
| API response times | Server logging, APM tools | On every significant endpoint |
| Database query performance | EXPLAIN ANALYZE, query logs | When queries feel slow |
| Bundle size | webpack-bundle-analyzer, rollup-plugin-visualizer | Before production builds |
| Memory leaks | Chrome DevTools Memory profiler | When app slows over time |

---

## Performance Acceptance Criteria

When asking AI to optimize, provide measurable targets:

```
Acceptance criteria for performance optimization:
- Lighthouse Performance score: >90 (currently 65)
- /api/metrics response time p95: <200ms (currently 1.8s)
- Dashboard render time: <1s (currently 2.3s)
- Bundle size: <200KB gzipped (currently 450KB)
- No new dependencies added
- All existing tests must pass
```

---

## Anti-Patterns in Performance Work

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Optimizing without measurement** | Wasted complexity; may not fix the real bottleneck | Profile first; optimize only measured issues |
| **Premature optimization** | Complex code for problems that don't exist | Make it work → Make it clean → Make it fast (only if needed) |
| **AI-suggested caching everywhere** | Stale data bugs; cache invalidation complexity | Cache only when measurement shows a specific bottleneck |
| **Micro-optimizations** | `++i` vs `i++` discussions waste time | Focus on architectural performance (queries, bundle, rendering) |
| **Ignoring bundle size** | 2MB JavaScript for a landing page | Bundle analysis in CI; reject PRs that increase bundle >10% |
| **No performance budgets** | Performance degrades gradually, invisibly | Set and enforce budgets: LCP <2.5s, bundle <200KB, API p95 <500ms |

---

## Key Takeaways

1. Correctness first, clarity second, performance third.
2. Never optimize without measurement. AI optimizes imaginary bottlenecks.
3. The most common AI performance issues: N+1 queries, missing pagination, huge bundles.
4. Set measurable acceptance criteria for every optimization task.
5. Performance budgets prevent invisible degradation.
6. Optimize late. Simplicity has performance benefits of its own.

---

## Cross-References

- **Depends on:** `ai-collaboration-mindset.md` — "Delay Complexity" principle
- **Applied by:** `react-performance.md` — React-specific performance patterns
- **Applied by:** `backend-architecture.md` — backend performance considerations
