---
name: firestore-cost-optimization
description: Activate when optimizing Firebase/Firestore costs, minimizing reads/writes/deletes, staying within free-tier quotas, or reducing hosting download volume
---

# Skill: Firestore Cost Optimization

**Status:** Advisory
**Scope:** Global (Task-Type Skill)
**Token Tier:** Compact (~900 tokens)
**Source:** `global-configs/skills/firestore-cost-optimization.skill.md`
**Last Updated:** 2026-08-17

---

**Activation announcement:** When this skill activates, output in chat: `Skill: firestore-cost-optimization activated -- Source: _skills/firestore-cost-optimization.skill.md`

## Trigger

Activate when:
- User says "this is expensive", "reduce Firestore costs", "free tier", "quota", "read/write budget"
- Adding, refactoring, or reviewing any Firestore read/write/delete path (listeners, queries, counters, cleanup jobs)
- Reviewing Firebase Hosting cache strategy or bundle download size
- User states cost is a priority over performance/speed

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `02-engineering-practices/cost-optimization-strategy.md` — global cost philosophy ("default to free, justify every expense")
2. If SDK-level detail is needed, read the official skill references at `.agents/skills/firebase-firestore/` (progressive disclosure — only the needed reference file)

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a Firebase cost engineer. **Every read, write, and delete is billed** — assume the Spark (free) tier unless the user says otherwise. Cost beats performance and speed wherever the tradeoff is bearable. If a change adds $0 cost but adds latency, that is fine. If it saves cost but adds latency, prefer the cost-saving change unless it breaks a documented UX requirement.

---

## Workflow

1. **Inventory every data flow** touching Firestore: listeners, one-shot reads, writes, deletes, triggers. Classify each as **hot** (real-time, per-session) or **cold** (one-shot, per-action).
2. **Apply the decision rules:**

| Data need | Cost-correct choice |
|---|---|
| Real-time requirement | ONE unified `onSnapshot` on a single document/collection — never nested listeners per child item |
| One-shot data | `getDoc`/`getDocs` — a listener is a perpetual read budget |
| Periodic refresh | Adaptive polling with backoff (e.g. 10–30s) — latency is cheaper than a live connection; only poll while the view is visible |
| Counters / participant counts | `FieldValue.increment` on a dedicated counter document — never read-modify-write |
| Bulk writes | `WriteBatch` (≤500 ops) — never a loop of individual `set` calls |
| Bulk deletes (TTL cleanup) | Batched server-side deletes (admin SDK, 500/batch) in a scheduled function — never per-item client deletes |
| Derived/aggregate data | Store denormalized aggregates, update on write — avoid fan-out reads that re-derive the same numbers |
| Static/reference data | Fetch once and cache locally for the session — do not re-query on every render |
| Queries | Always bounded (`limit`) and filtered — never collection-wide scans |

3. **Budget check:** Estimate worst-case daily ops per flow, sum them, and compare:
   - Spark (free) tier: **50,000 reads/day, 20,000 writes/day, 20,000 deletes/day**, 1 GiB storage
   - Hosting: 10 GB storage, **360 MB/day download**, 10 GB/month (Spark)
   - Blaze rates (if on paid): $0.06/100K reads, $0.18/100K writes, $0.02/100K deletes
   - Keep headroom: flag any flow consuming >30% of a daily quota.
4. **Hosting download:** verify cache-control headers on immutable assets (long `max-age`, `immutable`) and check bundle size — every byte shipped is billed download.
5. **Output the audit table** (below). State the estimated daily ops and verdict per flow.

---

## Output Format

```markdown
## Firestore Cost Audit — [Scope]

### Quota Baseline
- Reads/day: [X] / 50,000 (Spark) — [%]
- Writes/day: [X] / 20,000 — [%]
- Deletes/day: [X] / 20,000 — [%]
- Hosting download/day: [X] MB / 360 MB — [%]

### Data Flows

| # | Flow | Type | Ops/day | Est. Cost | Verdict | Fix |
|---|------|------|---------|-----------|---------|-----|
| 1 | [flow] | listener/one-shot/write/delete | [N] | [$0 / ~$x] | ✅/⚠️/❌ | [action] |

### Recommendations
- [ ] Single unified listener instead of N nested listeners
- [ ] Replace polling with adaptive backoff / pause when hidden
- [ ] Counters via FieldValue.increment
- [ ] Batch writes / scheduled batched deletes
- [ ] Long cache-control on immutable hosting assets
```

---

## Anti-Patterns

- Do NOT add a second listener where one unified subscription serves the view — listeners are the #1 read-budget killer
- Do NOT poll at fixed high frequency; use adaptive backoff and pause when off-screen
- Do NOT read-modify-write counters — use `FieldValue.increment`
- Do NOT loop client-side deletes — batch them server-side
- Do NOT run collection-wide queries without `limit`/filters
- Do NOT re-query static data on every render — fetch once, cache locally
- Do NOT ship unbundled assets without long `max-age` cache headers
- Do NOT optimize latency at the expense of reads without user approval — cost wins when tradeoffs are bearable

---

## Key Takeaways

1. Spark free tier: 50K reads, 20K writes, 20K deletes/day; Hosting 360 MB/day download. These are hard budgets.
2. One unified subscription beats many narrow listeners, every time.
3. Adaptive polling (10–30s) is a valid, cost-correct pattern when real-time isn't required.
4. Counters = `FieldValue.increment`; bulk work = batches; cleanup = scheduled server-side batched deletes.
5. Cost beats speed where the tradeoff is bearable — default to the free path.

---

**Cross-References:**
- Cost philosophy: `02-engineering-practices/cost-optimization-strategy.md`
- SDK/query reference (progressive disclosure): `.agents/skills/firebase-firestore/`
- Conflict resolution: `global-configs/skills/performance-audit.skill.md` (when cost and speed conflict, cost wins unless UX is measurably broken)
- Skill design patterns: `08-governance/skill-design-patterns.md`
