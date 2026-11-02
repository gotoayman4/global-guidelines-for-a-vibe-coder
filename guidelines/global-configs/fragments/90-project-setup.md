## Reference & Project Setup

### Session Bootstrap

Read `AGENTS.md` and `WORLD.md` (intent + `mode` + `capabilities`) — always; `README.md` when the project is new to you. Then load only task-relevant files on demand. `_guidelines/_index/MASTER_INDEX.md` is a lookup for a file you cannot name, not a required read. UI work also loads `_guidelines/02-engineering-practices/bidirectional-design-principles.md` when `bilingual`.

**Existing project (brownfield):** derive the Stack table and Build commands yourself from `package.json`, the lockfile, config files and CI — do not ask the user and do not web-search versions already pinned there. Fill each `[FILL]` you can prove, mark the rest `unknown`, and commit. **New project:** pick the stack with the user, then verify versions on the web.

### Stack (Pin exact versions — do NOT use ranges)

**Versions come from the manifest/lockfile (existing project) or a web/npm lookup (new project) — AI-suggested versions are unverified.** Versions already verified here need no re-search. Rows that do not apply: write `n/a`.

| Layer                | Technology | Version |
|----------------------|------------|---------|
| Node.js              | [FILL]     | [FILL]  |
| Package manager      | [FILL]     | [FILL]  |
| Frontend framework   | [FILL]     | [FILL]  |
| Language             | [FILL]     | [FILL]  |
| Build tool           | [FILL]     | [FILL]  |
| UI component library | [FILL]     | [FILL]  |
| Backend framework    | [FILL]     | [FILL]  |
| Database             | [FILL]     | [FILL]  |
| Auth                 | [FILL]     | [FILL]  |
| Hosting              | [FILL]     | [FILL]  |

### Forbidden Patterns and Dependencies

- Do not suggest: [FILL — e.g., Next.js, Tailwind, Redux]
- [FILL — additional forbidden items]

### Project-Specific Mandates

- Shared Components (if applicable): [FILL — e.g., "Use StandardTable for all data tables"]
- Design System Tokens (if applicable): [FILL — e.g., "Use theme.palette.* tokens, never hex values"]
- API Design — endpoints under: [FILL — e.g., /api/v1/]; response envelope: [FILL — e.g., { data, pagination?, error? }]
- [FILL — Additional sections as needed for your project]

### Build & Validation Commands

```bash
# [FILL with project-specific commands — only ones that exist in this project]
npm run dev          # start dev server
npm run build        # production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm test             # unit tests
npm run test:e2e     # E2E tests
npm run gate:fast    # lint + type-check + changed tests — the edit loop; the pre-push gate in vibe
```

### Known Gotchas (Agent-Maintained)

Append one line when you lose time to a non-obvious project fact (`- <fact> — why — YYYY-MM-DD`); verify before adding, delete when obsolete, keep ≤15 lines. Facts derivable from the code do not belong here.

- [FILL — none yet]

### How to Use This File

1. **Mirror & Sync:** Run `npm run sync:all` (or `sync-guidelines.ps1`). The `generated:constitution-core` and `generated:skills-block` regions above refresh on sync; this `## Reference & Project Setup` section is project-owned and never overwritten. Replace every `[FILL]` and set `mode` and `capabilities` in `WORLD.md`.
2. **Customize:** Add project mandates above; commit. AI may change project-specific rules; a MAJOR change (removing/editing a global baseline rule, changing security, or altering authority) needs an explicit recorded owner decision.

**Cross-References (in `_guidelines/`):** Authority: `08-governance/ai-governance-framework.md` · Loading: `_index/RETRIEVAL_RULES.md` · Modes: `01-workflow-methodology/speed-tiered-workflow.md` · Design: `02-engineering-practices/ux-design-principles.md`
