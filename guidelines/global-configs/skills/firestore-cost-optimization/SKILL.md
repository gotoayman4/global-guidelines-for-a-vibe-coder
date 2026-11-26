---
name: firestore-cost-optimization
description: Firestore and Firebase Hosting cost control — minimising reads, writes and deletes, staying inside the free tier, and cutting hosting download volume. Use when a backend bills per operation, when setting up or deploying a Firebase project, or when a bill or a quota is a concern.
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, firestore, firebase, cost, quota
  appliesTo: firebase, firestore
  trigger: Firebase bill or quota, per-operation billing, deploy Firebase project, cut reads or writes
---

# Skill: Firestore Cost Optimization

The tactics below are judgment; the three bans in **Enforced by** are gate-checked in adopting projects. Name which kind a rule is so sessions never confuse optional advice with a failing gate.

---

## Trigger

Activate when:
- User says "this is expensive", "reduce Firestore costs", "free tier", "quota", "read/write budget"
- Adding, refactoring, or reviewing any Firestore read/write/delete path (listeners, queries, counters, cleanup)
- Reviewing Firebase Hosting cache strategy or bundle download size
- Setting up or deploying any Firebase/Firestore project (`first-project-setup` and `deploy-production` fire this at setup and deploy time)
- User states cost beats performance/speed

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:
1. `02-engineering-practices/cost-optimization-strategy.md` — global cost philosophy ("default to free, justify every expense")
2. Official Firestore skill references at `.agents/skills/firebase-firestore/` (on demand)

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a Firebase cost engineer. **Every read, write, and delete is billed** — assume the Spark (free) tier unless told otherwise. Prefer cost-saving choices over latency unless a documented UX requirement forbids it.

---

## Workflow

1. **Inventory every data flow** touching Firestore: listeners, one-shot reads, writes, deletes, triggers. Classify each as **hot** (real-time, per-session) or **cold** (one-shot, per-action).
2. **Apply the decision rules:**

| Data need | Cost-correct choice |
|---|---|
| Real-time requirement | ONE unified `onSnapshot` on a single doc/collection — never nested per-child listeners |
| One-shot data | `getDoc`/`getDocs` — a listener is a perpetual read budget |
| Periodic refresh | Adaptive polling with backoff (10–30s) only while visible |
| Counters / totals | `FieldValue.increment` on a dedicated counter doc — never read-modify-write |
| Bulk writes | `WriteBatch` (≤500 ops) — never loops of individual `set` calls |
| Bulk deletes (TTL) | Batched server-side deletes (admin SDK, 500/batch) in a scheduled function |
| Derived/aggregate data | Store denormalized aggregates, update on write — avoid fan-out reads |
| Static/reference data | Fetch once and cache locally for the session |
| Queries | Always bounded (`limit`) and filtered — never collection-wide scans |

3. **Verify live quota baseline before quoting percentages:** read the live project (Console or pinned CLI) and note the database edition (`Standard` vs `Enterprise` — do not assume legacy Spark ceilings apply blindly). 2026-08 Spark reference baseline: **50,000 reads/day, 20,000 writes/day, 20,000 deletes/day**, Hosting **360 MB/day** download (10 GB/month); Blaze rates: $0.06/100K reads, $0.18/100K writes, $0.02/100K deletes. Flag any flow >30% of a daily quota.
4. **Hosting download & cache headers:** read [`references/hosting-and-report-template.md`](references/hosting-and-report-template.md) when reviewing Hosting bandwidth, `firebase.json` `headers`, Google Fonts vs self-hosted fonts, or bundle chunking (paste-ready headers live in `global-configs/templates/firebase-hosting-headers.json.template`).
5. **Output the audit table** using the report template in [`references/hosting-and-report-template.md`](references/hosting-and-report-template.md).

---

## Enforced by (three static bans on existing steps)

Central rule 17 (`02-engineering-practices/security-engineering.md`) applies to spend as well as auth:

| Ban | Instrument | Gate step |
|---|---|---|
| Realtime listener where a one-shot read serves | `no-restricted-syntax` over the listener family | `lint` |
| Collection read with no `limit()` and no recorded exception | Data-layer bounded-read census | `test` |
| Read site appearing/vanishing/moving without a decision | Census with pinned totals | `test` |

**Not covered by these bans (verify via dated Console artifact):** write/delete volume, per-row client deletes, hosting download bytes, bundle size, >30%-of-quota headroom, and live quota numbers.

**Guard snippet:** paste-ready ESLint rule and bounded-read census skeleton live in [`references/guard-snippet.md`](references/guard-snippet.md) — measure live sites before pinning totals.

---

## Anti-Patterns

- Do NOT add nested or duplicate listeners where one unified subscription serves the view
- Do NOT poll at fixed high frequency; use adaptive backoff and pause when hidden
- Do NOT read-modify-write counters — use `FieldValue.increment`
- Do NOT loop client-side deletes — batch server-side
- Do NOT run collection-wide queries without `limit`/filters, or re-query static data every render
- Do NOT add font `Cache-Control` rules without checking the build output, or blame Google Fonts CDN bytes on Firebase Hosting
- Do NOT apply `immutable` to unhashed `public/` assets (`**/*.@(js|css)`) — scope to hashed bundler output (`**/assets/*`)

---

## Key Takeaways

1. Always verify quotas and database edition live before computing headroom percentages.
2. Listeners are the #1 read-budget killer — enforce listener bans in `lint` and unbounded reads in `test`.
3. Counters = `FieldValue.increment`; bulk ops = `WriteBatch` / scheduled server cleanup.
4. Hosting bandwidth wins come from `no-store` on the HTML shell catch-all (`**`) followed by `immutable` on hashed `**/assets/*` — not from moving Google Fonts.

---

## Cross-References

- Cost philosophy: `02-engineering-practices/cost-optimization-strategy.md`
- Why declared controls need failing checks: `02-engineering-practices/security-engineering.md`
- Where checks run: `03-git-and-ci/local-ci-strategy.md`
- Hosting headers template: `global-configs/templates/firebase-hosting-headers.json.template`
- SDK/query reference: `.agents/skills/firebase-firestore/`
- Performance tradeoff skill: `global-configs/skills/performance-audit/SKILL.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repository only; not delivered with this skill)
