# AI_CONTEXT.md — Compressed AI Onboarding (Always Loaded)

**Purpose:** High-signal overview a brand-new AI agent reads at session start. Compressed companion to `docs/AI_ARCHITECTURE.md` (detailed reference).

**Source:** `global-configs/templates/AI_CONTEXT.starter.md`
**How to use:** Copy to `docs/AI_CONTEXT.md` in your project root. Replace every `[FILL]`. Keep under 100 lines / ~2,000 tokens — detail belongs in `docs/AI_ARCHITECTURE.md`, not here.

---

## Freshness

**Last Updated:** [FILL: YYYY-MM-DD] | **Commit:** [FILL: short SHA] | **Change:** [FILL: one line]

> Agent MUST update this header + the affected row/table in the SAME iteration as the code change. Then report `Docs: updated docs/AI_CONTEXT.md`.

## What This Is

[FILL: 2-3 sentences — what the app does, who uses it, primary value.]

## Stack (Pinned — Do NOT Use Ranges)

| Layer | Technology | Version |
|---|---|---|
| Frontend | [FILL] | [FILL] |
| Backend | [FILL] | [FILL] |
| Database | [FILL] | [FILL] |
| Auth | [FILL] | [FILL] |
| Hosting | [FILL] | [FILL] |

## Structure

```text
[FILL: 10-20 line tree of dirs that matter, e.g. src/components src/services src/pages/api]
```

## Critical Constraints (MUST NOT Violate)

- [FILL: e.g., "NEVER bypass RLS — all queries via authenticated client"]
- [FILL: e.g., "ALL UI strings via i18n keys — no hardcoded text"]
- [FILL: e.g., "Query keys are raw tuples `['entity', params] as const`"]

## How to Change Safely

- **[FILL: Domain A]:** [FILL: what to read first, e.g., read AI_ARCHITECTURE §2 + copy existing service]
- **[FILL: Domain B]:** [FILL: what to read first]

## Commands

```bash
[FILL: e.g., npm run dev / npm run lint / npm run type-check / npm test]
```

## Detailed Refs (Load On Demand)

- Architecture: `docs/AI_ARCHITECTURE.md`
- Index: `docs/ARCHITECTURE_INDEX.md`
- Product guardrails: `WORLD.md`

## Maintenance

- Update in the SAME iteration as the code (Trigger table in `07-documentation/documentation-strategy.md`).
- Non-trigger change: leave this file, report `Docs: N/A (<reason>)`.
