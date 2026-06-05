# WORLD.md — Product Intent Guardrail

**Purpose:** Define what this project exists to do — and what it must NOT become. This file prevents AI (and humans) from adding features that violate the product vision.

**Source:** `global-guidelines-for-a-vibe-coder/global-configs/templates/WORLD.starter.md`
**How to use:** Copy to your project root, fill in, commit. Reference from AGENTS.md / CLAUDE.md as the product intent guardrail.

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
- [FILL]

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
