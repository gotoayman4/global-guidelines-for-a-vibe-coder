# AI_ARCHITECTURE.md — Detailed Technical Reference (On Demand)

**Purpose:** Deep reference for all subsystems. Agents load sections of this file per task — it is NOT read whole every session (that is `README.md` + `AGENTS.md`).

**Source:** `global-configs/templates/AI_ARCHITECTURE.starter.md`
**How to use:** Copy to `docs/AI_ARCHITECTURE.md` in your project root. Replace every `[FILL]`. One row per subsystem/endpoint — tables over prose.

---

## Freshness

**Last Updated:** [FILL: YYYY-MM-DD] | **Commit:** [FILL: short SHA] | **Change:** [FILL: one line]

> **Written, never typed:** `npm run slice:close` derives all three facts and rewrites this line in place. The affected table still changes in the same iteration as the code — that is prose, and prose is written deliberately, not copied from a stale header.

## Subsystems

| Subsystem | Location | Responsibility | MUST NOT |
|---|---|---|---|
| [FILL: e.g., orders] | [FILL: e.g., src/services/orders/] | [FILL: one line] | [FILL: e.g., "no direct DB from UI"] |
| [FILL] | [FILL] | [FILL] | [FILL] |

## Data Flow

[FILL: 3-5 bullets — e.g., "UI → hook → service → API → DB; cache invalidated via mutate() on X".]

## API Registry

| Method + Path | Auth | Request | Response | Errors (`code`) |
|---|---|---|---|---|
| [FILL: e.g., GET /api/v1/orders] | [FILL] | [FILL] | [FILL] | [FILL] |
| [FILL] | [FILL] | [FILL] | [FILL] | [FILL] |

## Data & Migrations

- **Schema:** [FILL: e.g., tables + who owns them]
- **Migrations:** [FILL: e.g., tool + directory, latest applied]
- **Seed/demo data:** [FILL or "none"]

## Cross-Cutting Rules

- **Auth/RBAC:** [FILL: e.g., "JWT via X; roles checked in Y, never in UI alone"]
- **i18n/RTL:** [FILL: e.g., "all strings via keys; logical CSS only; portals get explicit dir"]
- **Cache:** [FILL: e.g., "raw tuple keys; mutate() after every mutation; batch cap 4"]

## How to Change Safely

Per domain: what to read first, then the pattern to copy. This is the one home for this table — other docs link here instead of restating it.

| Domain | Read first | Then |
|---|---|---|
| [FILL: e.g., orders] | [FILL: this file §Subsystems + an existing service] | [FILL: copy `src/services/orders/`] |
| [FILL] | [FILL] | [FILL] |

## Decisions (ADRs)

| ADR | Decision | Consequence for Agents |
|---|---|---|
| [FILL: e.g., docs/adr/001-postgres.md] | [FILL: one line] | [FILL: e.g., "do not propose Mongo"] |

## Maintenance

- Update in the SAME iteration as the code (Trigger table in `07-documentation/documentation-strategy.md`).
- New subsystem/endpoint/table = new row here + header bump, same commit.
- Non-trigger change: leave this file, report `Docs: N/A (<reason>)`.
