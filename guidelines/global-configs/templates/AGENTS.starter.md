# AGENTS.md — Project Constitution

**Purpose:** This file contains ALL extracted rules inline — no external file references. The rules are self-contained and work in any AI tool without permission issues. For deeper context, a `_guidelines/` mirror is available in this project (see "How to Use This File").

**Guideline source:** `{{GUIDELINES_ROOT}}` (the sync script expands this token automatically)
**How to use:** Search for `[FILL]` and replace with project-specific values.
**Rule precedence:** Security rules override all others. When two rules conflict, the more restrictive wins. When a rule is ambiguous, ask the user — never guess.

## Speed Mode (Declared in WORLD.md)

- **Mode Scales Ceremony, Never Security.** `mode: vibe | standard | guarded` in WORLD.md (the scaffolded template declares `vibe` until first ship; an UNDECLARED project is assumed `standard`, never `vibe`). The mode scales what a session **reads** (≤40K / ≤90K / ≤160K tokens before the first edit), how many steering files a trigger writes (1 / 2 / full set), and what the per-push gate runs (`gate:fast` + `always` guards / full pipeline / full + path extras). vibe = 3-bullet intent, no plan gate, one-line reports. Never scaled: security, no fake evidence, revert-broken-output, the decision record, and the ship boundary (critical flows LTR+RTL, full pipeline green). Escalation is automatic on evidence, and a slice carries **one** escalation class — a second unrelated class is a second slice. Detail: `_guidelines/01-workflow-methodology/speed-tiered-workflow.md`.
  → Source: `01-workflow-methodology/speed-tiered-workflow.md`

## Security (Always Load — DO NOT REMOVE)

- **SQL Injection Prevention.** ALL database queries MUST use parameterized statements. NEVER concatenate strings into SQL.
  → Source: `02-engineering-practices/security-engineering.md`
- **Secrets Management.** NEVER hardcode secrets, tokens, API keys, or credentials in source files. Environment variables only. Pre-commit hooks MUST scan for secret patterns.
  → Source: `03-git-and-ci/environment-management.md`
- **Input Validation.** ALL user input MUST be validated at system boundaries (API controllers, DTOs). Trust no client-side validation.
  → Source: `02-engineering-practices/error-handling-philosophy.md`
- **Authentication Code Review.** Auth code gets the highest scrutiny in EVERY mode: AI self-review + an automated auth-flow test at each milestone, plus an independent fresh-session AI review before shipping any auth change. Security never relaxes; no human reviewer is required.
  → Source: `02-engineering-practices/security-engineering.md`
- **Dependency Audit and Version Pinning.** AI-suggested package names/versions are unverified — before installing any NEW dep or major bump, verify latest stable via web/npm (skip re-search for versions already verified here). Pin older majors only with an ADR.
  → Source: `00-ai-fundamentals/ai-security-governance.md`
- **CORS.** NEVER use `origin: '*'`. Configure an explicit CORS whitelist from day one.
- **Security Headers.** Security headers (CSP, HSTS, X-Frame-Options) MUST be configured. They are mandatory, not optional.
  → Source: `02-engineering-practices/security-engineering.md`
- **File Upload MIME Validation (Magic-Byte).** ALL file upload endpoints MUST verify MIME type by reading magic bytes from the file buffer, not by trusting client-supplied `Content-Type` headers (use `file-type`, pinned in the project's `package.json`). Reject uploads whose detected type is not on the allowlist.
  → Source: `02-engineering-practices/file-upload-security.md`

## Testing (Always Load — depth by mode)

- **Mode Sets Test Depth.** vibe: smoke per iteration + regression only when the same path bites twice or at milestone — no suite. standard: behavioral tests on critical/high-risk code, regression every fix, integration at boundaries. guarded: full pyramid + critical-flow E2E before ship. Ship boundary (ALL modes): login/payments/permissions/persistence verified by automated E2E against the deployed target, LTR and RTL. Docs-subject guards (parity/drift/freshness/budget) run in the **docs lane**, never the app suite's hot lane. Full matrix: `speed-tiered-workflow.md`.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Behavioral Tests Only.** Tests assert inputs → outputs — never internals, spies, or call counts. standard/guarded: written first for critical features, same-iteration otherwise, never deferred past a sprint; a regression test with every fix.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **No Code Without Verification + Evidence Before "Done".** Every change is unverified until exercised — "it compiled" is false; NEVER claim tests pass without running them, or present predictions as observations. Tiers: 0 trivial = lint + one line; 1 tests (standard+ default) = tests/type-check/lint/parity; 2 milestone = headless E2E on DOM/data/DB (no screenshots); 3 rare = visual, sign-off or untestable layout only. Report WHAT/HOW/RESULT + anything NOT verified. The project's `type-check` is the type verdict — an editor/language-server diagnostic is a cache, not evidence. Detail: `agent-verification-loop.md`.
  → Source: `02-engineering-practices/agent-verification-loop.md`
- **Pre-Commit + Pre-Push Gates + Two Loops + Receipts.** Hooks (husky + lint-staged): lint, type-check, format on every commit. The pre-push gate is the **declared mode's** gate: `gate:fast` + the `always` guard tier in vibe; the full pipeline `[FILL — e.g., npm run lint && npm run type-check && npm test -- --run && npm run build]` in standard/guarded. Both add the dependency-audit wrapper (a bare `npm audit` exiting 0 on an unreachable registry is forbidden) and the clean-tree check; `--no-verify` forbidden in every mode; hooks MUST NOT need real secrets. Guards declare a tier (`always` | `standard+` | `ship`) and the ship boundary runs all of them. A release escalation runs on a **release override** the hook reads (branch/tag/env) — the declared mode in `WORLD.md` changes only when the steady state changes. Routine slices do not run `gate:receipt`; generate one full receipt at milestone/release exit, after final code, and add `--e2e` when that boundary requires the matrix. A receipt is a bounded summary — investigation logs are `scratch/`, never committed. `gate:receipt` writes `docs/gate-receipts/<UTC-stamp>.md` (strip ANSI; clean-tree informational only). A cached gate step is keyed on the content it reads and marked `cached (<key>)` in the receipt; a receipt that caches nothing prints `cached: none`. Detail: `local-ci-strategy.md`.
  → Source: `03-git-and-ci/local-ci-strategy.md`

## Git (Load for All Code Changes)

- **Commit Every Working Increment; Never Broken Code.** Granular commits = cheap rollbacks — stash/WIP for unfinished work, never end a session uncommitted (vibe MAY batch micro-edits). Conventional format with type+scope — one sentence or split it. Session scratch (probes, captured logs, patch files) lives in ONE gitignored directory — `scratch/` — and staging is by path, never `git add -A`, in a tree that can hold scratch. Checkpoint-commit before major multi-file AI operations. Revert broken AI output (a wrong approach, not a failing check) and regenerate with better constraints; stop after two failed fixes.
- **No Branch Mandate; Protect Main.** Single-agent work stays on the current branch (parallel agents get their own; merge sequentially with self-review between merges). Main MUST stay deployable: branch protection, no force-push, green local gate before merge. Env files never committed — `.env` gitignored, `.env.example` committed.

## Architecture (Load for New Features)

- **File Size Limit.** Files SHOULD NOT exceed 400 lines — plan for ~300. At 400, record as debt; split before the NEXT feature touches the file (or a scheduled pass) — do not stall the current change mid-slice.
  → Source: `02-engineering-practices/file-organization.md`
- **Layer Separation.** NEVER put business logic in UI components — API calls, transforms, and state live in services/hooks layers.
  → Source: `04-architecture/backend-architecture.md`
- **Pagination for Lists.** Every list endpoint MUST support pagination — no exceptions past 50 items.
  → Source: `04-architecture/api-design-standards.md`
- **AI-Readable Code Documentation (ICDC).** Headers and JSDoc/TSDoc only where purpose, constraints, or a public contract are not inferable from the name or signature. Non-trivial code carries INTENT / CONSTRAINT / DECISION / CAVEAT. NEVER restate what the code does — comments add CONTEXT only.
  → Source: `02-engineering-practices/ai-code-documentation.md`
- **One Source of Truth Per State Type.** Server state in the data-fetching library (React Query / SWR), form state in the form library — NEVER duplicate across stores. Query keys are raw tuples `['entity', params] as const` — never stringified JSON or path strings; centralize key constants.
  → Source: `04-architecture/state-management.md`
- **Error Responses with Machine-Readable Codes.** Responses MUST include a machine-readable `code` field. NEVER expose stack traces in API responses.
  → Source: `04-architecture/api-design-standards.md`
- **Vertical Slice Development.** Build one complete feature UI → API → Database before starting the next. Never build by horizontal layers; the first increment is a working end-to-end feature, however thin.
  → Source: `01-workflow-methodology/development-workflow.md`
- **Stack Conventions (React).** Data router API only — `createBrowserRouter`, never `<BrowserRouter>`; native `useBlocker`, no custom nav-blocking. Cap concurrent page fetches at 4. Detail: `_guidelines/04-architecture/router-architecture.md`.
  → Source: `04-architecture/router-architecture.md`
- **Code Duplication Detection.** Same mapping/validation/transformation in 2+ files → extract to a shared utility in the same iteration; never wait for a refactoring pass.
  → Source: `02-engineering-practices/code-duplication-prevention.md`

## Design & UX (Load for UI Work)

- **Heuristics + Four States + Tokens.** Every UI aligns with Nielsen's 10 heuristics (visible feedback, error prevention, escape hatch, user's language — no jargon/error codes in UI). Every data-dependent component handles loading, error, empty, success. Design tokens only (theme.palette / CSS custom properties), lint-enforced. Shared components (StandardTable, PageHeader, StandardDialog) over raw primitives — each handles all four states, tested RTL+LTR. Detail: `_guidelines/02-engineering-practices/ux-design-principles.md`, `_guidelines/06-frontend-patterns/visual-design-principles.md`.
  → Source: `02-engineering-practices/ux-design-principles.md`
- **Incremental Adoption.** Design-system adoption MUST NOT block feature work: new features use shared components exclusively; existing code migrates when touched (Strangler Fig); quarterly adoption targets.
  → Source: `08-governance/design-system-governance.md`

## AI Collaboration (Load for Every Session)

- **AI Output is Draft, Not Final.** Treat first AI output as a draft; iterate WHEN it misses acceptance criteria.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Speed Is a Metric, Not a Vibe.** Record intent → first running slice each iteration. Correct-but-slow is a defect like fast-and-broken-auth — scale ceremony with WORLD.md mode; never scale security or honesty.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Acceptance Criteria + Pattern References.** Every prompt states "correct when [verifiable conditions]" (vibe MAY compress to 3 bullets for small work) and points at 2–3 existing files as pattern templates.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Fresh Session Per Feature.** One fresh session per feature — 100-message threads produce constraint-violating output. Transfer via a 3-sentence handoff, not chat history.
  → Source: `00-ai-fundamentals/context-management-strategy.md`
- **AI Has No Concept of Correctness.** AI predicts plausible tokens, not truth — verify every claim, especially APIs and versions. After 2 failed attempts, STOP and search the web.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **No Silent TODOs or Placeholders.** NEVER generate TODO/FIXME/HACK/placeholder comments without explicit permission — state gaps in the response. Escape hatch: tracker issue number + descriptive error on unimplemented paths.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Output Efficiency.** Describe WHAT changed (1–2 sentences) and WHERE (path + lines); compare behavior, not code; no code blocks unless asked. Edit files directly.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Docs Line Fires on Triggers Only.** Trigger-table match (`documentation-strategy.md`) → update steering the same iteration and report `Docs: updated <files>`; non-trigger → NO Docs line, silence is correct, a padded `N/A` is ceremony. **Breadth scales with the mode** (vibe writes the record only); the decision record never scales. Missing a real trigger is a violation.
  → Source: `07-documentation/documentation-strategy.md`
- **One Home Per Fact.** The mandated doc set is `AGENTS.md` + `WORLD.md` + `README.md` (+ `docs/AI_ARCHITECTURE.md` on demand) — never add a compressed "AI context"/index copy; a new doc retires one. Each canonical list lives in exactly one file; every other site links, and `npm run docs:census` fails on a restated fact. Always-read files keep change logs in one dated archive per quarter (`docs/changelog/<YYYY>-Q<n>.md`), not inline.
  → Source: `07-documentation/documentation-strategy.md`
- **Reference Machine Output, Never Transcribe.** Verification numbers go into artifacts (`docs/gate-receipts/…`) and are cited by path — hand-copied figures decay silently.
  → Source: `07-documentation/documentation-strategy.md`
- **Globalize Lessons.** A mistake worth never repeating becomes a proposal in `guidelines-proposals/YYYY-MM-DD-<slug>.md` naming the event, the preventing rule, the target guideline, **and the guard that fails if the lesson is unlearned** — a lesson with no failing check is a wish, not a control.
  → Source: `07-documentation/documentation-strategy.md`

## Skills

<!-- BEGIN generated:skills-block — written by sync-guidelines.ps1, do not edit inside -->
Your stack's skills are delivered at `_skills/<name>/SKILL.md` — a filtered copy of the upstream
set, refreshed by the sync. This block is the inventory: one row per skill, with the trigger that
activates it. **Read it before a task.**
**One store per skill.** A hand-maintained copy of a delivered skill in a native store
(`.qoder/skills/`, `.claude/skills/`, …) shadows `_skills/` and cannot follow upstream. A native
store holds only what the corpus does not ship; a generated adapter for a tool that cannot read
`_skills/` is build output — a tracked script refreshes it and nobody edits it by hand.
<!-- END generated:skills-block -->

## RTL & Arabic (Always Active — All Projects Are Bilingual)

**All projects in this organization are bilingual (English + Arabic) by default. These rules always apply — in every speed mode.**

- **Arabic-First Architecture.** Design every component for bidirectional text from day one — direction handled at UI shell, workspace, document, paragraph, and inline span levels. Arabic support is architectural, not a localization afterthought.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Logical CSS Properties Exclusively.** UI chrome uses only logical properties (Tailwind `ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`; Emotion `marginInlineStart`). NEVER physical (`ml-*`, `pl-*`, `left`, `right`, `text-left`). Lint-enforced.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Portal `dir` + i18n Keys + Dual-Direction Test.** Portals escape the React parent but inherit `direction` from `<html>` — set explicit `dir` only where direction differs. All user-facing strings use i18n keys. Direction testing scales with mode: **vibe** = one direction per iteration, both at milestone; **standard/guarded** = dual-direction E2E before commit (logical-properties lint always-on). Visual checks are Tier-3 rare. Arabic typography + numerals: `_guidelines/05-stack-guides/rtl-tech-stack.md`.
  → Source: `05-stack-guides/rtl-tech-stack.md`

## Performance (Load for Performance-Sensitive Features)

- **Profile Before Optimizing.** NEVER optimize without measurement — only measured bottlenecks. Work → Clean → Fast; never premature.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Budgets at Review Time.** Enforce at PR/milestone (not every edit): LCP < 2.5s, bundle < 200KB gz, API p95 < 500ms; reject PRs growing bundle >10%.
  → Source: `02-engineering-practices/performance-optimization.md`

## Reference & Project Setup

### Session Bootstrap

**Budget the read before you start** — the declared mode's context cap (`_guidelines/01-workflow-methodology/speed-tiered-workflow.md` §The Context Budget). The chain below is a menu, not a checklist: name the 2–4 files THIS task needs.

1. Read this AGENTS.md — always
2. Read WORLD.md — note `mode`; it scales how much you read, how many steering files a trigger writes, and what the per-push gate runs
3. UI/UX work: also load `_guidelines/02-engineering-practices/bidirectional-design-principles.md`
4. Need a file you cannot name? Look up the task type in `_guidelines/_index/MASTER_INDEX.md`

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
npm run gate:fast    # lint + type-check + changed tests — edit loop; the pre-push gate in vibe
# gate receipt: full-gate output → docs/gate-receipts/<UTC-stamp>.md (a real run; cite the path)
```

Before suggesting any code change, verify it would pass `lint` and `type-check`.

### Forbidden Patterns Quick Scan

- No `console.log` in production · no `!important` · no TS `any`/`eslint-disable`/`@ts-ignore` without why · no inline styles when tokens exist · no hardcoded UI strings (i18n keys — bilingual) · no `// TODO`/`FIXME`/`HACK` without permission · no lorem/placeholder UI · no physical direction CSS — logical only · no raw hex/pixel/font-family — tokens only · no `letter-spacing`/text opacity on Arabic · no portal needing `dir` (differs from document / context-only stack) without one · no custom nav-blocking workarounds · no non-tuple cache keys · no trusting client `Content-Type` (magic-byte) · no prose line >400 chars (table rows never wrap).

### How to Use This File

1. **Mirror** the guidelines into `_guidelines/` — `npm run sync:all` (or `pwsh -File guidelines\global-configs\scripts\sync-guidelines.ps1 -ProjectPath .` from the central repo). **An existing mirror is never assumed current:** `npm run sync:drift` compares the mirror against the source hash and fails on drift. "Skip if the mirror exists" is how a project runs last month's rules.
2. **Create** as `AGENTS.md` in the project root; **search `[FILL]`** and replace ALL; set `mode` in WORLD.md.
3. **Review** global rules — remove any that don't apply; add project mandates. **Commit.** AI may freely ADD, narrow, or retire rules; only a MAJOR change to AGENTS.md (removing/editing a global baseline rule, or the security section) needs an explicit recorded owner decision — governance, not code review.

### Maintenance

- **Quarterly:** re-extract outdated rules; measure the reading budget (`npm run docs:boot`) — the chain must fit the mode cap (`npm run docs:boot:strict`); files >25% dated history get history relocated, not hand-trimmed. Run `npm run audit:friction` and work the ranked list.
- **When guidelines or stack change:** refresh extracted rules + Stack table; the central repo is the source of truth — re-sync `_guidelines/` (`npm run sync:drift` fails until you do).

**Cross-References (in `_guidelines/`):** Authority: `08-governance/ai-governance-framework.md` · Loading: `_index/RETRIEVAL_RULES.md` · Modes: `01-workflow-methodology/speed-tiered-workflow.md` · Design: `02-engineering-practices/ux-design-principles.md`, `02-engineering-practices/bidirectional-design-principles.md` · Governance: `08-governance/design-system-governance.md`
