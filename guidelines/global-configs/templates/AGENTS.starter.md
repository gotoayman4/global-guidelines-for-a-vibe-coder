# AGENTS.md — Project Constitution

**Purpose:** This file contains ALL extracted rules inline — no external file references. The rules are self-contained and work in any AI tool without permission issues. For deeper context, a `_guidelines/` mirror is available in this project (see "How to Use This File").

**Guideline source:** `{{GUIDELINES_ROOT}}` (the sync script expands this token automatically)
**How to use:** Search for `[FILL]` and replace with project-specific values.
**Rule precedence:** Security rules override all others. When two rules conflict, the more restrictive one wins. When a rule is ambiguous for your situation, ask the user — never guess.

## Speed Mode (Declared in WORLD.md)

- **Mode Scales Ceremony, Never Security.** `mode: vibe | standard | guarded` in WORLD.md (default `vibe` until first ship). vibe = 3-bullet intent, no plan gate, smoke + regression-on-second-bite, one-line reports, Docs line on triggers only. standard/guarded = full depth. Absolute everywhere: security rules, no fake evidence, revert-broken-output, critical-flow checks LTR+RTL before any ship, full pre-push gate. Record intent → first running slice each iteration; escalate mode when the same bug bites twice. Detail: `_guidelines/01-workflow-methodology/speed-tiered-workflow.md`.
  → Source: `01-workflow-methodology/speed-tiered-workflow.md`

## Security (Always Load — DO NOT REMOVE)

- **SQL Injection Prevention.** ALL database queries MUST use parameterized statements. NEVER concatenate strings into SQL.
  → Source: `02-engineering-practices/security-engineering.md`
- **Secrets Management.** NEVER hardcode secrets, tokens, API keys, or credentials in source files. Environment variables only. Pre-commit hooks MUST scan for secret patterns.
  → Source: `03-git-and-ci/environment-management.md`
- **Input Validation.** ALL user input MUST be validated at system boundaries (API controllers, DTOs). Trust no client-side validation.
  → Source: `02-engineering-practices/error-handling-philosophy.md`
- **Authentication Code Review.** Authentication code MUST receive 100% human review. No exceptions.
  → Source: `02-engineering-practices/security-engineering.md`
- **Dependency Audit and Version Pinning.** Dependencies MUST be audited on every AI PR. AI-suggested package names and versions are unverified — search the web or npm registry for the current latest stable before installing. Pin to older majors only with a documented ADR.
  → Source: `00-ai-fundamentals/ai-security-governance.md`
- **CORS.** NEVER use `origin: '*'`. Configure an explicit CORS whitelist from day one.
  → Source: `00-ai-fundamentals/ai-security-governance.md`
- **Security Headers.** Security headers (CSP, HSTS, X-Frame-Options) MUST be configured. They are mandatory, not optional.
  → Source: `02-engineering-practices/security-engineering.md`
- **File Upload MIME Validation (Magic-Byte).** ALL file upload endpoints MUST verify MIME type by reading magic bytes from the file buffer, not by trusting client-supplied `Content-Type` headers (use `file-type` — the version pinned in the project's `package.json`). Reject uploads whose detected type is not on the allowlist.
  → Source: `02-engineering-practices/file-upload-security.md`

## Testing (Always Load — depth by mode)

- **Mode Sets Test Depth.** vibe: smoke per iteration + regression only when the same path bites twice or at milestone — no suite while iterating. standard: behavioral tests on critical/high-risk code, regression every fix, integration at boundaries. guarded: full pyramid + critical-flow E2E before ship. Ship boundary (ALL modes): login/payments/permissions/persistence verified — automated E2E **or a dated human pass on the deployed target** — LTR and RTL before any release (sandbox test policy restricts *tests*, not the boundary). Full matrix: `speed-tiered-workflow.md`.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Behavioral Tests Only; First/With Code in standard/guarded.** Tests assert inputs → outputs — never internals, spies, call counts. standard/guarded: behavioral tests first for critical features, same-iteration otherwise, NEVER deferred past a sprint; regression test with every fix; exhaustive `it.each()` on normalization/mapping functions. vibe exempt until milestone/second-bite.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **No Code Without Verification + Evidence Before "Done".** Every change is unverified until exercised (smoke/vibe, tests/standard+, Tier 0 lint for trivial edits) — "it compiled" is false; NEVER claim tests pass without running them or present predictions as observations. Cost tiers: Tier 0 trivial = lint + one line; Tier 1 default = tests/type-check/lint/parity; Tier 2 milestone = headless E2E on DOM/data/DB (no screenshots); Tier 3 rare = visual/vision only for sign-off, untestable layout, or explicit request. Report WHAT/HOW/RESULT + anything NOT verified. Detail: `agent-verification-loop.md`.
  → Source: `02-engineering-practices/agent-verification-loop.md`
- **Pre-Commit + Pre-Push Gates + Two Loops + Receipts.** Hooks (husky + lint-staged): lint, type-check, format on every commit — no commits without them. Pre-push full pipeline `[FILL — e.g., npm run lint && npm run type-check && npm test -- --run && npm run build]` + dependency-audit wrapper (bare `npm audit` exiting 0 on unreachable registry is forbidden — wrapper MUST exit non-zero) + clean-tree check; `--no-verify` forbidden; hooks MUST NOT need real secrets. Define `gate:fast` (lint + type-check + diff-scoped tests) for the edit loop — never citable as evidence; path-aware slow steps stay in the gate. `gate:receipt` writes `docs/gate-receipts/<UTC-stamp>.md` (strip ANSI; clean-tree step informational only). Detail: `local-ci-strategy.md`.
  → Source: `03-git-and-ci/local-ci-strategy.md`

## Git (Load for All Code Changes)

- **Commit Every Working Increment; Never Broken Code.** Granular commits = cheap rollbacks — stash/WIP for unfinished work, never end a session uncommitted (vibe MAY batch micro-edits). Conventional format with type+scope — one sentence or split it. Checkpoint-commit before any major multi-file AI operation. Revert broken AI output immediately — regenerate with better constraints, never debug-in-place.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **No Branch Mandate; Protect Main.** Single-agent work stays on the current branch (parallel agents get their own; merge sequentially with review). Main MUST stay deployable: branch protection, no force-push, green local gate before merge. Env files never committed — `.env` gitignored, `.env.example` committed.
  → Source: `03-git-and-ci/git-workflow-strategy.md`

## Architecture (Load for New Features)

- **File Size Limit.** Files MUST NOT exceed 400 lines — plan for ~300; at 400, refactor down under 300 before proceeding. ESLint `max-lines`; source only (docs/config/generated excluded).
  → Source: `02-engineering-practices/file-organization.md`
- **Layer Separation.** NEVER put business logic in UI components — API calls, transforms, and state live in services/hooks layers.
  → Source: `04-architecture/backend-architecture.md`
- **Pagination for Lists.** Every list endpoint MUST support pagination — no exceptions past 50 items.
  → Source: `04-architecture/api-design-standards.md`
- **AI-Readable Code Documentation (ICDC).** Every file starts with a file-level context comment; every exported symbol has JSDoc/TSDoc. Non-trivial code carries INTENT / CONSTRAINT / DECISION / CAVEAT as needed. NEVER restate what the code does — comments add CONTEXT only.
  → Source: `02-engineering-practices/ai-code-documentation.md`
- **One Source of Truth Per State Type.** Server state in the data-fetching library (React Query / SWR), form state in the form library — NEVER duplicate across stores. Query keys are raw tuples `['entity', params] as const` — never stringified JSON or path strings; centralize key constants.
  → Source: `04-architecture/state-management.md`
- **Error Responses with Machine-Readable Codes.** Responses MUST include a machine-readable `code` field. NEVER expose stack traces in API responses.
  → Source: `04-architecture/api-design-standards.md`
- **Vertical Slice Development.** Build one complete feature UI → API → Database before starting the next. Never build by horizontal layers; the first increment is a working end-to-end feature, however thin.
  → Source: `01-workflow-methodology/development-workflow.md`
- **Stack Conventions (React projects).** Data router API only (`createBrowserRouter`, never `<BrowserRouter>`; native `useBlocker`, no custom nav-blocking workarounds). Cap concurrent page fetches at 4 (`fetchAllPages<T>()` shared). ESLint enforces `import-x/no-duplicates` and `import-x/order`; inline `type` for type-only imports. Detail: `_guidelines/04-architecture/router-architecture.md`, `_guidelines/02-engineering-practices/performance-optimization.md`.
  → Source: `04-architecture/router-architecture.md`
- **Code Duplication Detection.** Same mapping/validation/transformation in 2+ files → extract to a shared utility in the same iteration; never wait for a refactoring pass.
  → Source: `02-engineering-practices/code-duplication-prevention.md`

## Design & UX (Load for UI Work)

- **Heuristics + Four States + Tokens.** Every UI aligns with Nielsen's 10 heuristics (visible feedback, error prevention, escape hatch, user's language — no jargon/error codes in UI). Every data-dependent component handles loading, error, empty, success. Design tokens only (theme.palette / CSS custom properties), lint-enforced. Shared components (StandardTable, PageHeader, StandardDialog) over raw primitives — each handles all four states, tested RTL+LTR. Detail: `_guidelines/02-engineering-practices/ux-design-principles.md`, `_guidelines/06-frontend-patterns/visual-design-principles.md`.
  → Source: `02-engineering-practices/ux-design-principles.md`
- **Incremental Adoption.** Design-system adoption MUST NOT block feature work: new features use shared components exclusively; existing code migrates when touched (Strangler Fig); quarterly adoption targets.
  → Source: `08-governance/design-system-governance.md`

## AI Collaboration (Load for Every Session)

- **AI Output is Draft, Not Final.** First AI output is ALWAYS a draft — iterate at least once; accepting first output without review is an anti-pattern.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Speed Is a Metric, Not a Vibe.** Record intent → first running slice each iteration. Correct-but-slow is a defect like fast-and-broken-auth — scale ceremony with WORLD.md mode; never scale security or honesty.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Acceptance Criteria + Pattern References.** Every prompt states "correct when [verifiable conditions]" (vibe MAY compress to 3 intent bullets for small non-critical work) and points at 2–3 existing files as pattern templates — without references, AI invents inconsistent patterns.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Fresh Session Per Feature.** One fresh session per feature — 100-message threads produce constraint-violating output. Transfer via a 3-sentence handoff, not chat history.
  → Source: `00-ai-fundamentals/context-management-strategy.md`
- **AI Has No Concept of Correctness.** AI predicts plausible tokens, not truth — verify every claim, especially APIs and versions. After 2 failed attempts, STOP and search the web before a 3rd.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **No Silent TODOs or Placeholders.** NEVER generate TODO/FIXME/HACK/placeholder comments without explicit permission — state gaps in the response. Escape hatch: tracker issue number + descriptive error on unimplemented paths.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Output Efficiency.** Describe WHAT changed (1–2 plain sentences) and WHERE (path + lines); compare behavior, not code; never paste code blocks unless asked. Edit files directly.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Docs Line Fires on Triggers Only.** Trigger-table match (endpoint, table, env var, dependency, auth/RBAC, shared component, convention, guardrail) → update steering docs same-iteration and report `Docs: updated <files>`. Non-trigger → NO Docs line; silence is correct, a padded `N/A` is ceremony. Missing a real trigger is a violation.
  → Source: `07-documentation/documentation-strategy.md`
- **Boot Files Carry No History; One Copy Per Rule.** Always-read files keep change logs in dated archives (`docs/changelog/<doc>-<YYYY>-Q<n>.md`) behind a pointer heading (relocate verbatim; ~50-word entries, ≤400-char lines). Each canonical list lives in exactly one file — every other site links; parity tests guard the copies.
  → Source: `07-documentation/documentation-strategy.md`
- **Reference Machine Output, Never Transcribe.** Verification numbers go into artifacts (`docs/gate-receipts/…`) and are cited by path — hand-copied figures decay silently.
  → Source: `07-documentation/documentation-strategy.md`
- **Globalize Lessons.** Mistakes worth never repeating become proposals in `guidelines-proposals/YYYY-MM-DD-<slug>.md` (event, preventing rule, target file) — never session-only; reviewed at sync time.
  → Source: `01-workflow-methodology/development-workflow.md`

## RTL & Arabic (Always Active — All Projects Are Bilingual)

**All projects in this organization are bilingual (English + Arabic) by default. These rules always apply — in every speed mode.**

- **Arabic-First Architecture.** Design every component for bidirectional text from day one — direction handled at UI shell, workspace, document, paragraph, and inline span levels. Arabic support is architectural, not a localization afterthought.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Logical CSS Properties Exclusively.** UI chrome uses only logical properties (Tailwind `ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`; Emotion `marginInlineStart` etc.). NEVER physical (`ml-*`, `pl-*`, `left`, `right`, `text-left`). Lint-enforced.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Portal `dir` + i18n Keys + Dual-Direction Test.** Portals escape the React parent but inherit `direction` from `<html>` — explicit `dir` only where direction differs from the page or the stack keeps direction in React context only. All user-facing strings use i18n keys — no hardcoded text. Pages tested LTR and RTL before commit (standard/guarded: dual-direction E2E; vibe: both directions at milestone). Arabic typography: line-height 1.6–1.8, no `letter-spacing`, no text opacity, no `break-all`; Western numerals by default; mirror nav/breadcrumbs/pagination/timelines only. Detail: `_guidelines/05-stack-guides/rtl-tech-stack.md`.
  → Source: `05-stack-guides/rtl-tech-stack.md`

## Performance (Load for Performance-Sensitive Features)

- **Profile Before Optimizing.** NEVER optimize without measurement — only measured bottlenecks. Work → Clean → Fast; never premature.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Budgets at Review Time.** Enforce at PR/milestone (not every edit): LCP < 2.5s, bundle < 200KB gz, API p95 < 500ms; reject PRs growing bundle >10%.
  → Source: `02-engineering-practices/performance-optimization.md`

## Reference & Project Setup

### Session Bootstrap

1. Read this AGENTS.md — always
2. Read WORLD.md — note `mode` (`vibe | standard | guarded`); it scales plan/test/docs/verification depth (`_guidelines/01-workflow-methodology/speed-tiered-workflow.md`)
3. UI/UX work: also load `_guidelines/02-engineering-practices/ux-design-principles.md`, `_guidelines/02-engineering-practices/bidirectional-design-principles.md`, `_guidelines/06-frontend-patterns/visual-design-principles.md`
4. Look up task type in `_guidelines/_index/MASTER_INDEX.md`; load primary files per the table; compact extracts when context <20K tokens

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
npm run gate:fast    # lint + type-check + changed tests — the loop between edits, NOT evidence
npm run gate:receipt # full gate → docs/gate-receipts/<UTC-stamp>.md (cited by path, never copied)
```

Before suggesting any code change, verify it would pass `lint` and `type-check`.

### Forbidden Patterns Quick Scan

- No `console.log` in production · no `!important` · no TS `any`/`eslint-disable`/`@ts-ignore` without why · no inline styles when tokens exist · no hardcoded UI strings (i18n keys — bilingual) · no `// TODO`/`FIXME`/`HACK` without permission · no lorem/placeholder UI · no physical direction CSS — logical only · no raw hex/pixel/font-family — tokens only · no `letter-spacing`/text opacity on Arabic · no portal needing `dir` (differs from document / context-only stack) without one · no custom nav-blocking workarounds · no non-tuple cache keys · no trusting client `Content-Type` (magic-byte) · no prose line >400 chars (table rows never wrap).

### How to Use This File

1. **Mirror** guidelines into `_guidelines/` — downstream: `npm run sync-guidelines`; central repo: `pwsh -File guidelines\global-configs\scripts\sync-guidelines.ps1 -ProjectPath .` Skip if mirror exists.
2. **Create** as `AGENTS.md` in the project root; **search `[FILL]`** and replace ALL; set `mode` in WORLD.md.
3. **Review** global rules — remove any that don't apply; add project mandates. **Commit.** Never let AI modify this file without human approval.

### Maintenance

- **Quarterly:** re-extract outdated rules; measure the boot chain (`node _guidelines/global-configs/scripts/measure-boot-budget.js .`) — boot files over budget or >25% dated history get history relocated, not hand-trimmed (`--strict` only with an authoritative `--files` list).
- **When guidelines or stack change:** refresh extracted rules + Stack table; source of truth is the central repo — re-sync `_guidelines/`.

**Cross-References (in `_guidelines/`):** Authority: `08-governance/ai-governance-framework.md` · Loading: `_index/RETRIEVAL_RULES.md` · Modes: `01-workflow-methodology/speed-tiered-workflow.md` · Design: `02-engineering-practices/ux-design-principles.md`, `02-engineering-practices/bidirectional-design-principles.md` · Governance: `08-governance/design-system-governance.md`
