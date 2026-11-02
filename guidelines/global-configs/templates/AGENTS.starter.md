# AGENTS.md — Project Constitution

**Purpose:** Always-loaded project rules, self-contained. Deeper guidance in `_guidelines/` loads on demand.

**Guideline source:** `{{GUIDELINES_ROOT}}` (expanded by sync)
**Rule precedence:** Security overrides all. More restrictive rule wins on conflict. Inspect local codebase patterns first; ask the user only when product intent, security, or destructive scope is ambiguous.

<!-- BEGIN generated:constitution-core — written by sync-guidelines.ps1, do not edit inside -->
## Speed Mode (Declared in WORLD.md)

- **Mode Scales Ceremony, Never Security.** `mode: vibe | standard | guarded` in WORLD.md (undeclared = `standard`) scales pre-edit read budget (≤40K / ≤90K / ≤160K tokens), planning depth (`vibe`: 3-bullet inline intent, no plan gate, straight to code) and per-push gate. Never scaled: security, honest evidence, reverting broken output, ship boundary (critical flows LTR+RTL, full pipeline green). Auth, payments, schema and destructive data changes are planned in every mode. Detail: `_guidelines/01-workflow-methodology/speed-tiered-workflow.md`.
  → Source: `01-workflow-methodology/speed-tiered-workflow.md`

## Security (Always Load — DO NOT REMOVE)

- **SQL Injection Prevention.** ALL database queries MUST use parameterized statements. NEVER concatenate strings into SQL.
  → Source: `02-engineering-practices/security-engineering.md`
- **Secrets Management.** NEVER hardcode secrets, tokens, API keys, or credentials. Environment variables only; pre-commit hooks scan for secret patterns.
  → Source: `03-git-and-ci/environment-management.md`
- **Input Validation.** Validate ALL user input at system boundaries (API controllers, DTOs). Trust no client validation.
  → Source: `02-engineering-practices/error-handling-philosophy.md`
- **Authorization & Tenant Isolation (IDOR/BOLA).** Enforce server-side ownership/role checks (or DB RLS) on EVERY read/write — never trust client IDs, roles, or hidden UI.
  → Source: `02-engineering-practices/security-engineering.md`
- **Authentication Code Review.** Highest scrutiny in EVERY mode: AI self-review, automated auth-flow test at milestones, and independent fresh-session AI review before shipping auth changes. No human reviewer required.
  → Source: `02-engineering-practices/security-engineering.md`
- **Dependency Audit and Version Pinning.** Before installing any NEW dependency or major bump, verify latest stable version via web/npm — AI-suggested versions are unverified. Pin older majors only with an ADR.
  → Source: `00-ai-fundamentals/ai-security-governance.md`
- **CORS & Security Headers.** NEVER use `origin: '*'`; configure explicit CORS whitelist from day one. CSP, HSTS and X-Frame-Options are mandatory.
  → Source: `02-engineering-practices/security-engineering.md`
- **File Upload MIME Validation (Magic-Byte).** Upload endpoints MUST detect MIME from magic bytes (e.g., `file-type` pinned), never client `Content-Type`; reject non-allowlisted types.
  → Source: `02-engineering-practices/file-upload-security.md`

## Testing (Always Load — depth by mode)

- **Mode Sets Test Depth.** `vibe`: smoke-run each iteration; regression test when a path breaks twice or at milestone. `standard`: behavioral tests on critical/high-risk code, regression test every fix, integration at boundaries. `guarded`: full pyramid + critical-flow E2E before ship. Ship boundary in ALL modes: login, payments, permissions and persistence verified by automated E2E on deployed target (LTR+RTL when bilingual).
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Behavioral Tests Only.** Assert inputs → outputs — never internals, spies, or call counts. `standard`/`guarded`: tests first for critical features, same iteration otherwise. Verify AI assertions catch real logic flaws.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Evidence Before "Done".** Unverified until exercised — "it compiled" is false. NEVER claim a check passed without running it. Report WHAT ran, RESULT, and what was NOT verified. `type-check` is the type verdict, not editor diagnostics.
  → Source: `02-engineering-practices/agent-verification-loop.md`
- **Pre-Commit + Pre-Push Gates.** Commits (husky + lint-staged) lint, type-check and format. Pre-push runs `always` guards, `audit:gate`, clean-tree check, plus the mode gate (`vibe`: `gate:fast` — falling back to available `lint`/`type-check` during day-0 scaffolding; `standard`: lint + type-check + suite, deferring build to ship; `guarded`: adds build + path-aware extras). In `standard`/`guarded` and releases, missing required scripts FAIL the gate. `--no-verify` is forbidden; hooks need no real secrets. Release exits use the release override and write `docs/gate-receipts/<UTC-stamp>.md`.
  → Source: `03-git-and-ci/local-ci-strategy.md`

## Git (Load for All Code Changes)

- **Commit Every Working Increment; Never Broken Code.** Granular commits = cheap rollbacks — stash/WIP unfinished work; never end uncommitted (`vibe` MAY batch micro-edits). Conventional `type(scope): summary` (split if >1 sentence). Scratch files live in gitignored `scratch/`; stage by path, never `git add -A`. Checkpoint before multi-file edits. Revert broken approaches after two failed fixes.
- **Destructive Git Safety & Protect Main.** NEVER run `git reset --hard`, `git checkout --`, or `git clean -f` on dirty trees without stashing or explicit user permission. Single-agent work stays on current branch (parallel agents branch + merge sequentially). Main stays deployable: branch protection, no force-push, green local gate. `.env` gitignored, `.env.example` committed.

## Architecture (Load for New Features)

- **File Size Limit.** Files SHOULD NOT exceed 400 lines (target ~300). At 400, record debt and split before the NEXT feature touches it; do not stall current work.
  → Source: `02-engineering-practices/file-organization.md`
- **Layer Separation & Schema Safety.** NEVER put business logic in UI components — API calls, transforms, and state live in services/hooks. Schema changes MUST be additive via migrations; NEVER edit applied migrations or run destructive drops without user approval.
  → Source: `04-architecture/backend-architecture.md`
- **Pagination & Error Responses.** List endpoints MUST paginate (no exceptions past 50 items). Error responses MUST include a machine-readable `code` field and NEVER expose stack traces.
  → Source: `04-architecture/api-design-standards.md`
- **Comments Add Context, Not Narration.** Headers/JSDoc only where purpose, constraints, or contracts are not inferable from names/signatures. NEVER restate code.
  → Source: `02-engineering-practices/ai-code-documentation.md`
- **One Source of Truth Per State Type.** When using React Query / SWR, keep server state there and form state in the form library — never duplicate in stores. Centralize tuple query keys `['entity', params] as const`; cap concurrent page fetches at 4.
  → Source: `04-architecture/state-management.md`
- **Vertical Slice Development.** Build one complete feature UI → API → Database before starting the next; never horizontal layers.
  → Source: `01-workflow-methodology/development-workflow.md`
- **Stack Conventions (When React).** Data router API only (`createBrowserRouter`, never `<BrowserRouter>`); native `useBlocker`, no custom nav-blocking. Detail: `_guidelines/04-architecture/router-architecture.md`.
  → Source: `04-architecture/router-architecture.md`
- **Search Before Creating (No Duplication).** Search existing utilities, hooks, types, and components before creating new ones. Extract logic repeated in 2+ files to a shared utility in the same iteration.
  → Source: `02-engineering-practices/code-duplication-prevention.md`

## Design & UX (Load for UI Work)

- **Heuristics + Four States + Tokens.** Follow Nielsen's 10 heuristics (visible feedback, error prevention, escape hatch, user language — no jargon/codes in UI). Handle loading, error, empty, success in every data component. Design tokens only (lint-enforced); prefer project shared components (e.g., StandardTable, PageHeader, StandardDialog when present) over raw primitives.
  → Source: `02-engineering-practices/ux-design-principles.md`
- **Incremental Adoption.** Design-system adoption MUST NOT block feature work: new features use shared components; existing code migrates when touched (Strangler Fig).
  → Source: `08-governance/design-system-governance.md`

## AI Collaboration (Load for Every Session)

- **Read Before Edit & Surgical Scope.** Read target files and 1–2 sibling files to match local conventions before editing; NEVER guess imports, signatures, or schemas. Touch only task-required files — no drive-by refactors, unrequested formatting, or unrelated dependency bumps.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Self-Derived Acceptance Criteria.** State "correct when [verifiable conditions]" (`vibe`: 3 brief bullets inline) before editing. If the prompt is terse, derive criteria from codebase context and proceed — iterate if first output misses them.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Fresh Session Per Feature.** Long threads degrade constraint compliance. Transfer via a 3-sentence handoff, not chat history.
  → Source: `00-ai-fundamentals/context-management-strategy.md`
- **Verify APIs & Web Escalation.** Verify every API and version claim. After 2 failed fix attempts, STOP guessing and search the web.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **No Silent TODOs & Output Efficiency.** NEVER generate TODO/FIXME/HACK/placeholder comments without permission — state gaps in the response. Report WHAT changed (1–2 sentences) and WHERE (path + lines); no code blocks unless asked.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Docs Change on Triggers Only.** A trigger-table match (`documentation-strategy.md`) updates the fact's one home in the same iteration (`Docs: updated <file>`); non-triggers write nothing. Irreversible decisions (auth, schema, pins, scope reversals) get an ADR; commits record the rest.
  → Source: `07-documentation/documentation-strategy.md`
- **One Home Per Fact.** Doc set is `AGENTS.md` + `WORLD.md` + `README.md` (+ `docs/AI_ARCHITECTURE.md` on demand) — never an "AI context" copy; a new doc retires one. Canonical lists live in one file (`npm run docs:census` when wired checks this); history lives in `docs/changelog/<YYYY>-Q<n>.md`.
  → Source: `07-documentation/documentation-strategy.md`

## RTL & Arabic (Always Active — Bilingual UI Default)

- **Arabic-First Architecture.** Unless `WORLD.md` declares a single-language/LTR-only tool, design every UI component for bidirectional text from day one — direction handled at shell, document, paragraph and inline-span levels.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Logical CSS in UI Chrome.** Use logical properties (`ms-*`/`me-*`/`ps-*`/`pe-*`/`start-*`/`end-*`/`text-start`; `marginInlineStart`). Physical properties are forbidden except in explicit LTR contexts (code, math, URLs, emails). Lint-enforced.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Direction, i18n Keys & Dual-Direction Test.** Portals inherit `direction` from `<html>`. Free-text `dir="auto"` fields start in UI direction while empty and follow typed text. User-facing strings use i18n keys. `vibe`: one direction per iteration, both at milestone; `standard`/`guarded`: dual-direction E2E before commit.
  → Source: `05-stack-guides/rtl-tech-stack.md`

## Performance (Load for Performance-Sensitive Features)

- **Profile Before Optimizing.** NEVER optimize without measurement — only measured bottlenecks. Work → Clean → Fast; never premature.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Budgets at Review Time.** Enforce at PR/milestone (not every edit): web LCP < 2.5s, bundle < 200KB gz, API p95 < 500ms; reject PRs growing bundle >10%.
  → Source: `02-engineering-practices/performance-optimization.md`
<!-- END generated:constitution-core -->

## Skills

<!-- BEGIN generated:skills-block — written by sync-guidelines.ps1, do not edit inside -->
Your stack's skills are delivered at `_skills/<name>/SKILL.md` — a filtered copy of the upstream
set, refreshed by the sync. After the first sync this block holds the inventory: one row per skill
with the trigger that activates it. **Scan it when a task starts; open a skill only when its row matches.**
Never keep a hand-maintained copy of a delivered skill in a native store — it shadows `_skills/`.
<!-- END generated:skills-block -->

## Reference & Project Setup

### Session Bootstrap

Read `AGENTS.md` and `WORLD.md` (intent + `mode`) — always; `README.md` when the project is new to you. Then load only task-relevant files on demand. `_guidelines/_index/MASTER_INDEX.md` is a lookup for a file you cannot name, not a required read. UI work also loads `_guidelines/02-engineering-practices/bidirectional-design-principles.md`.

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
# [FILL with project-specific commands]
npm run dev          # start dev server
npm run build        # production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm test             # unit tests
npm run test:e2e     # E2E tests
npm run gate:fast    # lint + type-check + changed tests — the edit loop; the pre-push gate in vibe
```

### How to Use This File

1. **Mirror & Sync:** Run `npm run sync:all` (or `sync-guidelines.ps1`). The `generated:constitution-core` and `generated:skills-block` regions above refresh on sync; this `## Reference & Project Setup` section is project-owned and never overwritten. Replace every `[FILL]` and set `mode` in `WORLD.md`.
2. **Customize:** Add project mandates above; commit. AI may change project-specific rules; a MAJOR change (removing/editing a global baseline rule, changing security, or altering authority) needs an explicit recorded owner decision.

**Cross-References (in `_guidelines/`):** Authority: `08-governance/ai-governance-framework.md` · Loading: `_index/RETRIEVAL_RULES.md` · Modes: `01-workflow-methodology/speed-tiered-workflow.md` · Design: `02-engineering-practices/ux-design-principles.md`
