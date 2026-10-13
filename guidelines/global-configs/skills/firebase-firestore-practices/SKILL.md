---
name: firebase-firestore-practices
description: Firebase and Cloud Firestore engineering practices — data modelling, modular SDK usage, queries and indexes, least-privilege security rules, Cloud Functions triggers, and emulator testing. Use when writing or reviewing any Firestore data layer, rules file or trigger.
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, firebase, firestore, rules, practices
  appliesTo: firebase, firestore
---

# Skill: Firebase & Firestore Practices

---

**Activation announcement:** When this skill activates, output in chat: `Skill: firebase-firestore-practices activated -- Source: _skills/firebase-firestore-practices/SKILL.md`

## Trigger

Activate when:
- Writing or reviewing Firestore data models, queries, indexes, or security rules
- Using Firebase SDKs (web client, admin SDK in Cloud Functions)
- Implementing Firestore triggers (`onCreate`, `onUpdate`) or scheduled functions
- Setting up emulator-based testing or Firebase project configuration

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `02-engineering-practices/security-engineering.md` — auth/authorization for security rules
2. `02-engineering-practices/testing-philosophy.md` — emulator-based behavioral testing
3. `02-engineering-practices/cost-optimization-strategy.md` — cost cross-cut (every pattern below has a cost impact)

For SDK-level detail, consult the official Firebase documentation (https://firebase.google.com/docs/firestore) after identifying the database edition — **progressive disclosure**: read only the needed section.

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a Firebase engineer. You follow Firebase's official best practices, always identify the database edition first (Standard vs. Enterprise), write least-privilege security rules, and keep cost impact visible in every data decision. You never trust client input without `validate()` in rules.

---

## Workflow

1. **Identify the instance edition** (`npx -y firebase-tools@latest firestore:databases:get <id>`); read the matching official reference guide before writing code.
2. **Data modeling:** docs ≤1 MiB; use subcollections for one-to-many; denormalize derived aggregates (e.g. participant counters at `sessions/{sessionId}/counters/participants`); centralize path construction in one place (`FirestorePaths.cs`-style helper) — never scatter raw path strings.
3. **SDK usage:** modular, tree-shaken imports (`import { doc, getDoc } from "firebase/firestore"`) — never the monolithic `firebase` import. Keep raw business logic out of components (services layer).
4. **Queries:** single-field indexes are automatic; composite queries need an entry in `firestore.indexes.json`; always `limit()`; check rules before code for reads.
5. **Writes:** use `WriteBatch`/transactions; `FieldValue.increment` for counters; `serverTimestamp()` for times; idempotent writes where triggers may retry.
6. **Security rules (canonical file):** validate every write with `request.resource.data`, check `request.auth`, reject wildcard `allow write: if true`. If a project mirrors rules across directories (e.g. `firebase/firestore.rules` and `alsael-web/firestore.rules`), keep them in 100% parity.
7. **Cloud Functions:** event triggers must be idempotent (retries are normal); scheduled cleanup functions delete expired data in batches (≤500); keep triggers lean — each trigger run bills reads/writes.
8. **Emulator testing:** run Firestore emulator for behavioral tests; never hit production for tests.

---

## Output Format

For changes touching Firestore, report:

- **Edition detected:** [Standard / Enterprise]
- **Data model delta:** [collections/subcollections/fields changed]
- **Rules impact:** [validate/auth checks added]
- **Index impact:** [new composite indexes, if any]
- **Cost impact:** COUNTED, never described — `+N reads per view open`, `+M writes per action`, `+K deletes
  per cleanup run`, and the worst-case daily figure beside the quota that was **read from the live project**
  (cross-reference `firestore-cost-optimization` skill, incl. its "Enforced by" section). "This adds a few
  reads" is not a number and cannot be checked; if the count is unknown, say `unknown — not measured` rather
  than writing prose that reads like an estimate.

---

## Anti-Patterns

- Do NOT write SDK code without identifying the database edition first
- Do NOT use the monolithic `import "firebase"` — bundle size and startup cost
- Do NOT scatter Firestore path strings — centralize them
- Do NOT read-modify-write for counters/aggregates — use `FieldValue.increment`
- Do NOT deploy rules permitting wildcard writes, or rule changes without parity check across mirrored copies
- Do NOT deploy composite queries without adding the index to `firestore.indexes.json`
- Do NOT trigger heavy read/write work per-invocation in Cloud Functions without batching
- Do NOT run tests against production — use the emulator
- Do NOT write UI code that reads Firestore directly — keep it in services/hooks/stores
- Do NOT state a cost impact as an adjective ("cheap", "a few reads") — the line exists to be arithmetic
- Do NOT add a realtime listener where a one-shot read serves: it is the #1 read-budget killer, and in
  projects that adopted the static ban in `firestore-cost-optimization` → "Enforced by" it fails `lint`

---

## Key Takeaways

1. Edition detection first; official skill references at `.agents/skills/firebase-firestore/` for deep detail.
2. Modular SDK imports only; rules with `validate()` + auth checks; parity across mirrored rules files.
3. Counters via `FieldValue.increment`; batch writes; idempotent triggers; batched scheduled cleanup.
4. Composite queries require explicit indexes; unbounded queries are a bug — in an adopting project the
   bounded-read census turns that sentence into a failing test, not a style preference.
5. Every data decision has a cost impact — see `firestore-cost-optimization` skill for quotas and decision
   rules, and report it counted (reads/view-open, writes/action), never as prose.

---

## Cross-References

- Cost rules: `global-configs/skills/firestore-cost-optimization/SKILL.md`
- Security rules auditing: `.agents/skills/firebase-security-rules-auditor/`
- Security engineering: `02-engineering-practices/security-engineering.md`
- Emulator testing: `02-engineering-practices/testing-philosophy.md`
- Skill design patterns: `../../../../docs/repo-meta/skill-design-patterns.md`
