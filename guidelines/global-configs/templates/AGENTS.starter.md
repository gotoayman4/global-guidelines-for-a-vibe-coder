# AGENTS.md — Project Constitution

**Purpose:** The always-loaded rules for this project, self-contained. Deeper guidance lives in the `_guidelines/` mirror and is read only when a task needs it.

**Guideline source:** `{{GUIDELINES_ROOT}}` (the sync script expands this token automatically)
**Rule precedence:** Security rules override all others. When two rules conflict, the more restrictive wins. When a rule is ambiguous, ask the user — never guess.

## Speed Mode (Declared in WORLD.md)

- **Mode Scales Ceremony, Never Security.** `mode: vibe | standard | guarded` in WORLD.md (undeclared = `standard`) scales the read budget before the first edit (≤40K / ≤90K / ≤160K tokens), planning depth (vibe: 3-bullet intent, no plan gate) and the per-push gate. Never scaled: security, honest evidence, reverting broken output, the ship boundary (critical flows LTR+RTL, full pipeline green). Auth, payments, schema and destructive data changes are planned in every mode. Detail: `_guidelines/01-workflow-methodology/speed-tiered-workflow.md`.
  → Source: `01-workflow-methodology/speed-tiered-workflow.md`

## Security (Always Load — DO NOT REMOVE)

- **SQL Injection Prevention.** ALL database queries MUST use parameterized statements. NEVER concatenate strings into SQL.
  → Source: `02-engineering-practices/security-engineering.md`
- **Secrets Management.** NEVER hardcode secrets, tokens, API keys, or credentials in source files. Environment variables only. Pre-commit hooks MUST scan for secret patterns.
  → Source: `03-git-and-ci/environment-management.md`
- **Input Validation.** ALL user input MUST be validated at system boundaries (API controllers, DTOs). Trust no client-side validation.
  → Source: `02-engineering-practices/error-handling-philosophy.md`
- **Authentication Code Review.** Auth code gets the highest scrutiny in EVERY mode: AI self-review, an automated auth-flow test at each milestone, and an independent fresh-session AI review before shipping any auth change. No human reviewer is required.
  → Source: `02-engineering-practices/security-engineering.md`
- **Dependency Audit and Version Pinning.** Before installing any NEW dependency or major bump, verify the latest stable version via web/npm — AI-suggested names and versions are unverified. Pin older majors only with an ADR.
  → Source: `00-ai-fundamentals/ai-security-governance.md`
- **CORS.** NEVER use `origin: '*'`. Configure an explicit CORS whitelist from day one.
- **Security Headers.** CSP, HSTS and X-Frame-Options MUST be configured — mandatory, not optional.
  → Source: `02-engineering-practices/security-engineering.md`
- **File Upload MIME Validation (Magic-Byte).** ALL upload endpoints MUST detect MIME type from the file's magic bytes (`file-type`, pinned), never from the client `Content-Type`; reject types not on the allowlist.
  → Source: `02-engineering-practices/file-upload-security.md`

## Testing (Always Load — depth by mode)

- **Mode Sets Test Depth.** vibe: smoke-run each iteration; a regression test when the same path breaks twice or at a milestone. standard: behavioral tests on critical/high-risk code, a regression test with every fix, integration at boundaries. guarded: full pyramid + critical-flow E2E before ship. Ship boundary in ALL modes: login, payments, permissions and persistence verified by automated E2E against the deployed target, LTR and RTL.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Behavioral Tests Only.** Tests assert inputs → outputs — never internals, spies, or call counts. Review AI-written assertions: they pass when the logic is wrong.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Evidence Before "Done".** A change is unverified until exercised — "it compiled" is false. NEVER claim a check passed without running it. Report WHAT ran, the RESULT, and anything NOT verified. The project's `type-check` is the type verdict, not an editor diagnostic. Detail: `agent-verification-loop.md`.
  → Source: `02-engineering-practices/agent-verification-loop.md`
- **Pre-Commit + Pre-Push Gates.** Hooks (husky + lint-staged) lint, type-check and format on every commit. The pre-push gate is the declared mode's: `gate:fast` in vibe; `[FILL — e.g., npm run lint && npm run type-check && npm test -- --run && npm run build]` in standard/guarded, plus the dependency-audit wrapper and the clean-tree check. A required step whose script is missing FAILS the gate — never skipped as green. `--no-verify` is forbidden; hooks MUST NOT need real secrets. A release exit runs the full gate via the release override and writes one receipt to `docs/gate-receipts/<UTC-stamp>.md`. Detail: `local-ci-strategy.md`.
  → Source: `03-git-and-ci/local-ci-strategy.md`

## Git (Load for All Code Changes)

- **Commit Every Working Increment; Never Broken Code.** Granular commits = cheap rollbacks — stash/WIP for unfinished work; never end a session uncommitted (vibe MAY batch micro-edits). Conventional format with type+scope; if the commit cannot be summarised in one sentence, split it. Session scratch (probes, logs, patches) lives in the gitignored `scratch/`; stage by path, never `git add -A`. Checkpoint-commit before multi-file AI operations. Revert a wrong approach and regenerate with better constraints; stop after two failed fixes.
- **No Branch Mandate; Protect Main.** Single-agent work stays on the current branch (parallel agents get their own; merge sequentially). Main MUST stay deployable: branch protection, no force-push, green local gate before merge. `.env` gitignored, `.env.example` committed.

## Architecture (Load for New Features)

- **File Size Limit.** Files SHOULD NOT exceed 400 lines — plan for ~300. At 400, record as debt and split before the NEXT feature touches the file; do not stall the current change.
  → Source: `02-engineering-practices/file-organization.md`
- **Layer Separation.** NEVER put business logic in UI components — API calls, transforms, and state live in services/hooks layers.
  → Source: `04-architecture/backend-architecture.md`
- **Pagination for Lists.** Every list endpoint MUST support pagination — no exceptions past 50 items.
  → Source: `04-architecture/api-design-standards.md`
- **Comments Add Context, Not Narration.** Headers and JSDoc only where purpose, constraints, or a public contract are not inferable from the name or signature. NEVER restate what the code does.
  → Source: `02-engineering-practices/ai-code-documentation.md`
- **One Source of Truth Per State Type.** Server state in the data-fetching library (React Query / SWR), form state in the form library — NEVER duplicated across stores. Query keys are raw tuples `['entity', params] as const`; centralize key constants. Cap concurrent page fetches at 4.
  → Source: `04-architecture/state-management.md`
- **Error Responses with Machine-Readable Codes.** Responses MUST include a machine-readable `code` field. NEVER expose stack traces in API responses.
  → Source: `04-architecture/api-design-standards.md`
- **Vertical Slice Development.** Build one complete feature UI → API → Database before starting the next; never by horizontal layers.
  → Source: `01-workflow-methodology/development-workflow.md`
- **Stack Conventions (React).** Data router API only — `createBrowserRouter`, never `<BrowserRouter>`; native `useBlocker`, no custom nav-blocking. Detail: `_guidelines/04-architecture/router-architecture.md`.
  → Source: `04-architecture/router-architecture.md`
- **Code Duplication Detection.** Same mapping/validation/transformation in 2+ files → extract to a shared utility in the same iteration.
  → Source: `02-engineering-practices/code-duplication-prevention.md`

## Design & UX (Load for UI Work)

- **Heuristics + Four States + Tokens.** Every UI follows Nielsen's 10 heuristics (visible feedback, error prevention, escape hatch, user's language — no jargon or error codes in UI). Every data-dependent component handles loading, error, empty, success. Design tokens only, lint-enforced. Shared components (StandardTable, PageHeader, StandardDialog) over raw primitives. Detail: `_guidelines/02-engineering-practices/ux-design-principles.md`.
  → Source: `02-engineering-practices/ux-design-principles.md`
- **Incremental Adoption.** Design-system adoption MUST NOT block feature work: new features use shared components exclusively; existing code migrates when touched (Strangler Fig).
  → Source: `08-governance/design-system-governance.md`

## AI Collaboration (Load for Every Session)

- **AI Output is Draft, Not Final.** Iterate when the first output misses the acceptance criteria.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Acceptance Criteria + Pattern References.** Every prompt states "correct when [verifiable conditions]" (vibe MAY compress to 3 bullets). Point at existing files as patterns when the convention is not obvious from the tree.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Fresh Session Per Feature.** Long threads produce constraint-violating output. Transfer via a 3-sentence handoff, not chat history.
  → Source: `00-ai-fundamentals/context-management-strategy.md`
- **AI Has No Concept of Correctness.** Verify every claim, especially APIs and versions. After 2 failed attempts, STOP and search the web.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **No Silent TODOs or Placeholders.** NEVER generate TODO/FIXME/HACK/placeholder comments without explicit permission — state gaps in the response.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Output Efficiency.** Report WHAT changed (1–2 sentences) and WHERE (path + lines); no code blocks unless asked.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Docs Change on Triggers Only.** A trigger-table match (`documentation-strategy.md`) updates the fact's one home in the same iteration and reports `Docs: updated <file>`; a non-trigger writes nothing. Irreversible decisions (auth, schema, pins, scope reversals) get an ADR; the commit message records everything else.
  → Source: `07-documentation/documentation-strategy.md`
- **One Home Per Fact.** The doc set is `AGENTS.md` + `WORLD.md` + `README.md` (+ `docs/AI_ARCHITECTURE.md` on demand) — never an "AI context" copy; a new doc retires one. Each canonical list lives in one file; others link (`npm run docs:census` fails a restated fact). History lives in `docs/changelog/<YYYY>-Q<n>.md`, not in always-read files.
  → Source: `07-documentation/documentation-strategy.md`

## Skills

<!-- BEGIN generated:skills-block — written by sync-guidelines.ps1, do not edit inside -->
Your stack's skills are delivered at `_skills/<name>/SKILL.md` — a filtered copy of the upstream
set, refreshed by the sync. After the first sync this block holds the inventory: one row per skill
with the trigger that activates it. **Scan it when a task starts; open a skill only when its row matches.**
Never keep a hand-maintained copy of a delivered skill in a native store — it shadows `_skills/`.
<!-- END generated:skills-block -->

## RTL & Arabic (Always Active — All Projects Are Bilingual)

- **Arabic-First Architecture.** Design every component for bidirectional text from day one — direction handled at shell, document, paragraph and inline-span levels. Arabic support is architectural, not a localization afterthought.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Logical CSS Properties Exclusively.** Only logical properties (Tailwind `ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`; Emotion `marginInlineStart`). NEVER `ml-*`, `pl-*`, `left`, `right`, `text-left`. Lint-enforced.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Portal `dir` + i18n Keys + Dual-Direction Test.** Portals inherit `direction` from `<html>` — set explicit `dir` only where direction differs. All user-facing strings use i18n keys. vibe: one direction per iteration, both at milestone; standard/guarded: dual-direction E2E before commit. Typography + numerals: `_guidelines/05-stack-guides/rtl-tech-stack.md`.
  → Source: `05-stack-guides/rtl-tech-stack.md`

## Performance (Load for Performance-Sensitive Features)

- **Profile Before Optimizing.** NEVER optimize without measurement — only measured bottlenecks. Work → Clean → Fast; never premature.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Budgets at Review Time.** Enforce at PR/milestone (not every edit): LCP < 2.5s, bundle < 200KB gz, API p95 < 500ms; reject PRs growing bundle >10%.
  → Source: `02-engineering-practices/performance-optimization.md`

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
