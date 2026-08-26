---
name: firebase-firestore-practices
description: Activate when working with Firebase and Cloud Firestore — data modeling, SDK usage, queries, security rules, indexes, Cloud Functions triggers, or emulator testing
---

# Skill: Firebase & Firestore Practices

**Status:** Advisory
**Scope:** Global (Task-Type Skill)
**Token Tier:** Compact (~900 tokens)
**Source:** `global-configs/skills/firebase-firestore-practices.skill.md`
**Last Updated:** 2026-08-17

---

**Activation announcement:** When this skill activates, output in chat: `Skill: firebase-firestore-practices activated -- Source: _skills/firebase-firestore-practices.skill.md`

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
- **Cost impact:** [est. added reads/writes/deletes per day — cross-reference `firestore-cost-optimization` skill]

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

---

## Key Takeaways

1. Edition detection first; official skill references at `.agents/skills/firebase-firestore/` for deep detail.
2. Modular SDK imports only; rules with `validate()` + auth checks; parity across mirrored rules files.
3. Counters via `FieldValue.increment`; batch writes; idempotent triggers; batched scheduled cleanup.
4. Composite queries require explicit indexes; unbounded queries are a bug.
5. Every data decision has a cost impact — see `firestore-cost-optimization` skill for quotas and decision rules.

---

**Cross-References:**
- Cost rules: `global-configs/skills/firestore-cost-optimization.skill.md`
- Security rules auditing: `.agents/skills/firebase-security-rules-auditor/`
- Security engineering: `02-engineering-practices/security-engineering.md`
- Emulator testing: `02-engineering-practices/testing-philosophy.md`
- Skill design patterns: `../../docs/repo-meta/skill-design-patterns.md`
