## Reference & Project Setup

### Session Bootstrap

1. Read this AGENTS.md — always
2. Read WORLD.md — note `mode` (`vibe | standard | guarded`); it scales plan/test/docs/verification depth (`_guidelines/01-workflow-methodology/speed-tiered-workflow.md`)
3. UI/UX work: also load `_guidelines/02-engineering-practices/bidirectional-design-principles.md` (design rules; ux/visual are on-demand via MASTER_INDEX)
4. Look up task type in `_guidelines/_index/MASTER_INDEX.md`; load primary files per the table; compact extracts when context <20K tokens

### Stack (Pin exact versions — do NOT use ranges)

**Before filling this table, search the web or npm registry for the latest stable version of each package — AI-suggested version numbers are unverified.** Versions already verified in this project need no re-search.

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

### Forbidden Dependencies and Patterns

- Do not suggest: [FILL — e.g., Next.js, Tailwind, Redux]
- [FILL — additional forbidden items]

### Project-Specific Mandates

- Shared Components (if applicable): [FILL — e.g., "Use StandardTable for all data tables"]
- Design System Tokens (if applicable): [FILL — e.g., "Use theme.palette.* tokens, never hex values"]
- API Design — endpoints under: [FILL — e.g., /api/v1/]; response envelope: [FILL — e.g., { data, pagination?, error? }]
- [FILL — Additional sections as needed for your project]

### Build & Validation Commands

```bash
# [FILL with project-specific commands]
npm run dev          # start dev server
npm run build        # production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm test             # unit tests
npm run test:e2e     # E2E tests
npm run gate:fast    # lint + type-check + changed tests — the loop between edits, NOT evidence
npm run gate:receipt # full gate → docs/gate-receipts/<UTC-stamp>.md (cited by path, never copied)
```

Before suggesting any code change, verify it would pass `lint` and `type-check`.

### Forbidden Patterns Quick Scan

- No `console.log` in production · no `!important` · no TS `any`/`eslint-disable`/`@ts-ignore` without why · no inline styles when tokens exist · no hardcoded UI strings (i18n keys — bilingual) · no `// TODO`/`FIXME`/`HACK` without permission · no lorem/placeholder UI · no physical direction CSS — logical only · no raw hex/pixel/font-family — tokens only · no `letter-spacing`/text opacity on Arabic · no portal needing `dir` (differs from document / context-only stack) without one · no custom nav-blocking workarounds · no non-tuple cache keys · no trusting client `Content-Type` (magic-byte) · no prose line >400 chars (table rows never wrap).

### How to Use This File

1. **Mirror** guidelines into `_guidelines/` — downstream: `npm run sync-guidelines`; central repo: `pwsh -File guidelines\global-configs\scripts\sync-guidelines.ps1 -ProjectPath .` Skip if mirror exists.
2. **Create** as `AGENTS.md` in the project root; **search `[FILL]`** and replace ALL; set `mode` in WORLD.md.
3. **Review** global rules — remove any that don't apply; add project mandates. **Commit.** AI may freely ADD project rules/mandates; REMOVING or EDITING an existing global (baseline) rule requires explicit human approval.

### Maintenance

- **Quarterly:** re-extract outdated rules; measure the boot chain (`node _guidelines/global-configs/scripts/measure-boot-budget.js .`) — boot files over budget or >25% dated history get history relocated, not hand-trimmed (`--strict` only with an authoritative `--files` list).
- **When guidelines or stack change:** refresh extracted rules + Stack table; source of truth is the central repo — re-sync `_guidelines/`.

**Cross-References (in `_guidelines/`):** Authority: `08-governance/ai-governance-framework.md` · Loading: `_index/RETRIEVAL_RULES.md` · Modes: `01-workflow-methodology/speed-tiered-workflow.md` · Design: `02-engineering-practices/ux-design-principles.md`, `02-engineering-practices/bidirectional-design-principles.md` · Governance: `08-governance/design-system-governance.md`
