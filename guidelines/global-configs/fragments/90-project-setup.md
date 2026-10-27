## Reference & Project Setup

### Session Bootstrap

Read `AGENTS.md` and `WORLD.md` (intent + `mode`) — always; `README.md` when the project is new to you. Then name the 2–4 files THIS task needs, inside the mode's read budget. `_guidelines/_index/MASTER_INDEX.md` is a lookup for a file you cannot name, not a required read. UI work also loads `_guidelines/02-engineering-practices/bidirectional-design-principles.md`.

### Stack (Pin exact versions — do NOT use ranges)

**Search the web or npm registry for the latest stable version before filling this table — AI-suggested versions are unverified.** Versions already verified here need no re-search.

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

### Build & Validation Commands

```bash
# [FILL with project-specific commands]
npm run dev          # start dev server
npm run build        # production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm test             # unit tests
npm run test:e2e     # E2E tests
npm run gate:fast    # lint + type-check + changed tests — the edit loop; the pre-push gate in vibe
```

### Forbidden Patterns Quick Scan

No `console.log` in production · no `!important` · no TS `any`/`eslint-disable`/`@ts-ignore` without why · no inline styles when tokens exist · no hardcoded UI strings (i18n keys) · no `TODO`/`FIXME`/`HACK` without permission · no placeholder UI · no physical-direction CSS · no raw hex/pixel/font-family · no `letter-spacing`/text opacity on Arabic · no custom nav-blocking · no non-tuple cache keys.

### How to Use This File

1. **Mirror** the guidelines into `_guidelines/` with `npm run sync:all` (`npm run sync:drift` fails when the mirror is behind the source); **create** this file as `AGENTS.md` in the project root; replace every `[FILL]`; set `mode` in WORLD.md.
2. **Review** global rules — remove any that don't apply; add project mandates; commit. AI may freely add, narrow, or retire rules; a MAJOR change (removing a global baseline rule, or editing the security section) needs an explicit recorded owner decision.

**Cross-References (in `_guidelines/`):** Authority: `08-governance/ai-governance-framework.md` · Loading: `_index/RETRIEVAL_RULES.md` · Modes: `01-workflow-methodology/speed-tiered-workflow.md` · Design: `02-engineering-practices/ux-design-principles.md`
