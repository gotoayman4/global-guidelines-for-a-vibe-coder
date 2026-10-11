# README.md — Project Overview

**Purpose:** The single home for "what this project is and how to run it". This is the only place the project description, the directory map, and the quick-start live — every other document links here instead of restating it.

**Source:** `global-configs/templates/README.starter.md`
**How to use:** Copy to your project root as `README.md`. Replace every `[FILL]`. Keep it under ~120 lines — detail belongs in the linked documents, not here.

---

## What this is

[FILL: 2-3 sentences — the problem it solves, who uses it, the primary value. No feature list; that belongs in the roadmap.]

- **Product intent & guardrails (what it must NOT become):** `WORLD.md`
- **Binding rules for AI agents and humans:** `AGENTS.md`
- **Subsystem / API / migration reference (loaded on demand):** `docs/AI_ARCHITECTURE.md`
- **Decisions and their reasons:** `docs/adr/`

## Quick start

```bash
npm install
cp .env.example .env     # [FILL: required keys]
npm run dev              # [FILL: dev server URL]
```

The full command list — build, lint, type-check, tests, and the gates — lives in `AGENTS.md` §Build & Validation Commands. It is not repeated here.

## Structure

```text
[FILL: 10-20 line tree of the directories that matter, e.g.
src/
  components/   shared UI
  services/     API + data access
  pages/        route entry points
docs/           steering docs (AI_ARCHITECTURE, adr/)
]
```

## Documentation map

| Document | Answers | Read |
|---|---|---|
| `AGENTS.md` | What are the binding rules? | every session |
| `WORLD.md` | What must this product not become? | every session |
| `docs/AI_ARCHITECTURE.md` | Where does subsystem X live; what is the API? | on demand |
| `docs/adr/*.md` | Why was X decided? | on demand |

There is deliberately no second "AI context" or "architecture index" file: a compressed copy of another document is a second copy to maintain, and it drifts. If you are looking for something and it is not above, search the repo — do not add a new index.

## Maintenance

- Update the "What this is" paragraph when the product's purpose changes (rarely).
- Keep the structure tree in step with the top-level directories.
- The stack table, commands, and rules do **not** live here — see `AGENTS.md`.
