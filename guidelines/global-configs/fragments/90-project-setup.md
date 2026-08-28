## Reference & Project Setup

### Session Bootstrap

1. Read this AGENTS.md — always
2. Read WORLD.md for product intent guardrails
3. For UI/UX work: also load `_guidelines/02-engineering-practices/ux-design-principles.md`, `_guidelines/02-engineering-practices/bidirectional-design-principles.md`, `_guidelines/06-frontend-patterns/visual-design-principles.md`
4. Look up task type in `_guidelines/_index/MASTER_INDEX.md`
5. Load primary guideline files per task-type table
6. Apply compact extracts when context is tight (<20K tokens)

### Stack (Pin exact versions — do NOT use ranges)

**Before filling this table, search the web or npm registry for the latest stable version of each package. AI-suggested version numbers are unverified.**

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
```

Before suggesting any code change, verify it would pass `lint` and `type-check`.

### Forbidden Patterns Quick Scan

- No `console.log` in production code
- No `!important` in CSS
- No TypeScript `any` casts, `eslint-disable` suppressions, or `@ts-ignore` without a comment explaining why
- No inline styles when design system tokens exist
- No hardcoded UI strings — all text MUST use i18n keys (every project is bilingual)
- No `// TODO`, `// FIXME`, `// HACK` without explicit permission — state gaps in the AI response instead
- No placeholder or filler content in UI (no "lorem ipsum", no "test test test")
- No physical CSS direction properties (`ml-*`, `pl-*`, `left-*`, `right-*`, `text-left`) in UI chrome — use logical properties
- No raw hex colors, pixel values, or font families in components — use design tokens
- No `letter-spacing` / `tracking-*` on Arabic text — disconnects cursive letters
- No opacity / `rgba()` transparency on Arabic text blocks — causes jagged rendering in Firefox
- No portal components (Dialog, Popover, DropdownMenu) without explicit `dir` prop
- No custom navigation-blocking workarounds — use the framework's native blocker
- No stringified JSON or path strings as data-fetching cache keys — use raw tuples
- No trusting client-supplied `Content-Type` for file uploads — verify MIME via magic-byte inspection

### How to Use This File

1. **Mirror** the central guidelines into `_guidelines/`: downstream projects run `npm run sync-guidelines`; from the central repo itself run `pwsh -File guidelines\global-configs\scripts\sync-guidelines.ps1 -ProjectPath .`. Skip if `_guidelines/` already exists.
2. **Create** this file as `AGENTS.md` in your project root (all rules are inline — no external file references needed)
3. **Search for `[FILL]`** and replace ALL occurrences with project-specific values
4. **Review** the global rules above — remove any that don't apply to your stack
5. **Add** any project-specific rules in the designated section
6. **Commit** to Git. Treat this file as code — changes go through review.
7. **Never let AI modify this file without human approval.**

### Maintenance

- **Quarterly:** Audit rules against source guidelines; re-extract outdated rules.
- **When guidelines change:** Check if extracted rules need updating.
- **When stack changes:** Update the Stack table and review all rules.
- **Source of truth:** Central repo (see Guideline source at top) — refresh `_guidelines/` via the sync script.

**Cross-References (in `_guidelines/` mirror):** Authority hierarchy: `_guidelines/08-governance/ai-governance-framework.md` · Loading strategy: `_guidelines/_index/RETRIEVAL_RULES.md` · Design principles: `_guidelines/02-engineering-practices/ux-design-principles.md`, `_guidelines/02-engineering-practices/bidirectional-design-principles.md` · Design governance: `_guidelines/08-governance/design-system-governance.md`
