# WORLD.md — Product Intent Guardrail

**Purpose:** Define what this project exists to do — and what it must NOT become. This file prevents AI (and humans) from adding features that violate the product vision.

**Source:** `global-configs/templates/WORLD.starter.md`
**How to use:** Search for `[FILL]` and replace with project-specific values. Copy to your project root and commit. Reference from AGENTS.md / CLAUDE.md as the product intent guardrail.

---

## Freshness

**Last Updated:** [FILL: YYYY-MM-DD] | **Commit:** [FILL: short SHA] | **Change:** [FILL: one line]

> Agent MUST update this header in the SAME iteration as a scope/guardrail change. Then report `Docs: updated WORLD.md`. (Only `WORLD.md` and `docs/AI_ARCHITECTURE.md` carry this header — `AGENTS.md` and `README.md` change on a trigger and git dates them.)

## Speed Mode

- **mode:** `vibe` — `vibe | standard | guarded` per `_guidelines/01-workflow-methodology/speed-tiered-workflow.md`
- **Set:** [FILL: date + reason]. Default is `vibe` until first ship; revisit at every milestone.
- **Transition log:**
  - [FILL: YYYY-MM-DD — mode change + reason]

---

## What This Project Is

[FILL: 2-3 paragraphs describing the core purpose. What problem does it solve? Who are the users? What is the primary value proposition?]

---

## Core Domains (What We Build)

- [FILL: domain 1 — brief description]
- [FILL: domain 2 — brief description]
- [FILL: domain 3 — brief description]
- [FILL: domain 4 — brief description]
- [FILL: domain 5 — brief description]

---

## What This Project Is NOT (Guardrails)

These are the boundaries. AI must not suggest features that cross these lines.

### NOT: [Category 1]
- [FILL — e.g., "This is not a mobile app. No React Native, no mobile-first designs."]
- [FILL]

### NOT: [Category 2]
- [FILL — e.g., "This is not a real-time collaboration tool. No WebSocket, no live cursors."]
- [FILL]

### NOT: [Category 3]
- [FILL — e.g., "This is not a social platform. No feeds, no comments, no user profiles."]
- [FILL]

### NOT: [Category 4]
- [FILL]
- [FILL]

---

## Explicitly Out-of-Scope Features

These features have been specifically considered and rejected. AI must not re-propose them.

| Feature | Reason for Rejection | Date Decided |
|----------|----------------------|--------------|
| [FILL]   | [FILL]               | [FILL]       |
| [FILL]   | [FILL]               | [FILL]       |
| [FILL]   | [FILL]               | [FILL]       |

---

## Target Users

| Role | Description | Primary Needs |
|------|-------------|---------------|
| [FILL] | [FILL] | [FILL] |
| [FILL] | [FILL] | [FILL] |
| [FILL] | [FILL] | [FILL] |

---

## Non-Functional Priorities (Ranked)

1. [FILL — e.g., "Data integrity — no data loss under any circumstances"]
2. [FILL — e.g., "Accessibility — WCAG 2.1 AA compliance for both RTL and LTR"]
3. [FILL — e.g., "Performance — sub-2.5s LCP, sub-200KB bundles"]
4. [FILL]
5. [FILL]

---

## Scale Expectations

| Metric | Current | 12-Month Projection | 24-Month Projection |
|--------|---------|---------------------|--------------------|
| Active users | [FILL] | [FILL] | [FILL] |
| Records (primary entity) | [FILL] | [FILL] | [FILL] |
| Requests/day | [FILL] | [FILL] | [FILL] |

---

## Technology Constraints (Non-Negotiable)

- [FILL — e.g., "Must use PostgreSQL. No MongoDB, no Firestore."]
- [FILL — e.g., "Must deploy on [platform]. No [alternative platform]."]
- [FILL — e.g., "Must support both RTL (Arabic) and LTR (English)."]
- [FILL — e.g., "Must use design tokens for all styling. No raw hex colors."]
- **Billing ceiling** (only if the backend bills per operation — Firestore, DynamoDB, serverless functions):
  [FILL — the actual daily read/write/delete and download quotas, plus WHERE they were read: Console or CLI,
  with a date. A ceiling copied from a template is a guess; re-measure it, and name the database edition —
  a Standard-edition database does not necessarily bill like a legacy free tier.]
- **Headroom rule:** [FILL — e.g., "any single flow projected >30% of a daily quota is refactored or blocked
  before merge"]. **State the check that enforces it, or mark it advisory:** a ceiling with no failing test
  is a promise the next session has to remember, and a green gate does not mean cost is under control.
- **Prune / archive trigger:** [FILL — the measured condition that starts pruning or archiving, e.g.
  "storage bytes > 60% of ceiling" or "collection > N documents", plus who reads the number and when]. A
  scale row in this file is the place a cost decision gets made *before* the invoice, so keep it beside the
  projection table above rather than in a runbook nobody opens.
- [FILL]

---

## Security Model & Trust Boundaries (Optional — Add if project has auth)

Describe how authentication, authorization, and data access controls work:

- **Authentication:** [FILL — e.g., "Enforced by Supabase Auth JWT verification"]
- **Role-Based Access Control (RBAC):** [FILL — e.g., "Users can have multiple roles. Roles guard endpoint access"]
- **Active Role Selection:** [FILL — if applicable, explain how frontend supplies active role to backend]
- **RBAC Trust Boundary:** [FILL — how does backend validate claimed roles against DB?]
- **Database Row-Level Security (RLS):** [FILL — if using Supabase/PostgreSQL RLS]
- **File Upload MIME Validation:** [FILL — mandatory: verify MIME via magic-byte inspection, not client headers. Use `file-type@16.5.4` for Node.js]

---

## Data Freshness Policy (Optional — Add if project uses SWR/React Query)

- **Cache Keys:** [FILL — e.g., "ALL query keys use raw tuple format: `['entity', params] as const`. Key constants are centralized in `src/constants/swrKeys.ts`."]
- **Mutate After Mutations:** [FILL — e.g., "Every data mutation MUST call `mutate()` on affected cache keys AFTER success."]
- **Stale-While-Revalidate:** [FILL — describe SWR/React Query global config]
- **Polling:** [FILL — disabled by default; enable only for dashboards with documented interval]
- **Parallel Fetch Cap:** [FILL — e.g., "Batch fetches capped at 4 concurrent requests via shared `fetchAllPages<T>()` utility"]

---

## Maintenance

- **When:** Update WORLD.md when product scope changes, new out-of-scope decisions are made, or scale expectations change.
- **Who:** Product owner or lead developer. Not AI.
- **Review:** Quarterly alongside guideline review.
- **How AI uses this:** Before suggesting any feature, AI checks WORLD.md for guardrail violations. Features that cross NOT boundaries are rejected automatically.

---

**Cross-References:**
- Product intent guardrail specification: `01-workflow-methodology/planning-and-scoping.md`
- Governance framework: `08-governance/ai-governance-framework.md`
- Bidirectional design principles: `02-engineering-practices/bidirectional-design-principles.md`
- UX design principles: `02-engineering-practices/ux-design-principles.md`
