# AGENTS.md — Project Constitution

**Purpose:** This file contains ALL extracted rules inline — no external file references. The rules are self-contained and work in any AI tool without permission issues. For deeper context, a `_guidelines/` mirror is available in this project (see "How to Use This File").

**Guideline source:** `{{GUIDELINES_ROOT}}` (the sync script expands this token automatically)
**How to use:** Search for `[FILL]` and replace with project-specific values.
**Rule precedence:** Security rules override all others. When two rules conflict, the more restrictive one wins. When a rule is ambiguous for your situation, ask the user — never guess.

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
- **File Upload MIME Validation (Magic-Byte).** ALL file upload endpoints MUST verify MIME type by reading magic bytes from the file buffer, not by trusting client-supplied `Content-Type` headers (use `file-type@16.5.4` for Node.js). Reject uploads whose detected type is not on the allowlist.
  → Source: `02-engineering-practices/file-upload-security.md`

## Testing (Always Load)

- **Regression Tests for Bug Fixes.** Every bug fix MUST include a regression test that reproduces the bug and verifies the fix.
  → Source: `02-engineering-practices/testing-patterns.md`
- **Tests for Critical and High-Risk Code.** New code touching critical flows (auth, payments, permissions, data persistence, core workflows) MUST include tests. Service boundaries SHOULD include integration tests. Simple UI rendering, pass-through code, and prototypes MAY skip tests. Optimize for regression risk, not coverage percentage.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Tests Before or With Code, Not After.** For critical and high-risk features, write behavioral tests first from requirements/PRD. For all other code, write tests in the same iteration as implementation. NEVER defer tests to a later sprint — tests written after features mirror bugs instead of defining correct behavior.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **Critical Flow E2E Coverage.** Critical workflow chains MUST have E2E coverage for both happy path and failure path.
  → Source: `02-engineering-practices/testing-patterns.md`
- **Test Behavior, Not Implementation.** Tests MUST verify behavior (what the code does), not implementation (how). Do not test internal function calls, state shape, or private methods.
  → Source: `02-engineering-practices/testing-philosophy.md`
- **No Code Without Test Verification.** Every line of AI-generated code is unverified until tests pass. "It compiled, so it works" is false.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Agent Verification Loop — Evidence Before "Done" (Cost-Tiered).** The agent MUST NOT report a task complete without executing verification itself. Verification is RATIONED BY COST — LLM-driven screen capture/vision/GUI automation is the most expensive instrument and is NOT routine: Tier 1 (default, every change) = automated tests, type-check, lint, contract/i18n parity. Tier 2 (slice/milestone completions) = programmatic headless E2E asserting DOM/data/DB — no screenshots, no vision. Tier 3 (rare exception) = visual/interactive verification, only for milestone exit/RTL-LTR sign-off of NEW screens, defects tests cannot observe, or explicit user request. Before any Tier-3 check ask: "can a test or DB query assert this?" If yes, write the test instead. Report WHAT was verified, HOW, RESULT — plus anything NOT verified. NEVER claim tests pass without running them; NEVER present predictions as observations.
  → Source: `02-engineering-practices/agent-verification-loop.md`
- **Normalization Functions Require Exhaustive Tests.** Every normalization/mapping function MUST have exhaustive parameterized tests: every valid input, every deprecated alias, empty/whitespace/invalid inputs, and case variations (`it.each()` or equivalent).
  → Source: `02-engineering-practices/testing-patterns.md`
- **Pre-Commit Hooks Mandatory.** Every project MUST have pre-commit hooks (husky + lint-staged) running lint, type-check, and formatting, installed automatically after `npm install`. No commits without passing hooks.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **Local CI — Pre-Push Gate Mandatory.** CI runs locally; no cloud CI provider required. Every project MUST have a pre-push hook running the full pipeline: `[FILL — e.g., npm run lint && npm run type-check && npm test -- --run && npm run build]`, plus `npm audit --audit-level=high` and a clean-tree check. `git push --no-verify` is forbidden. If the gate is slow, optimize the gate — never skip it. Hooks MUST NOT require real secrets.
  → Source: `03-git-and-ci/local-ci-strategy.md`

## Git (Load for All Code Changes)

- **Commit After Every Working Increment.** Granular commits = cheap rollbacks. NEVER commit broken code "to save progress" — use stash or WIP branches.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **Descriptive Commit Messages.** Conventional commit format with type and scope. Future you and future AI need the context.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **Revert Broken AI Output Immediately.** Do not debug-in-place. Revert broken AI output and regenerate with better constraints.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **Checkpoint Before Major AI Operations.** Always commit a checkpoint before running major AI operations that could modify multiple files.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **No Branch Requirement for New Features.** Work on the current branch unless the team's workflow explicitly requires otherwise. Branches are a team-workflow choice, not an AI mandate.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **Protect Main Branch.** Main branch MUST always be deployable. Use branch protection rules. Agents never force-push to main.
  → Source: `03-git-and-ci/git-workflow-strategy.md`

## Architecture (Load for New Features)

- **File Size Limit.** Files MUST NOT exceed 400 lines — plan new files for ~300. When a file reaches 400, refactor it down to under 300 (not merely under 400) before proceeding. Enforced by ESLint `max-lines`. Applies to source code only; docs, config, and generated files are excluded.
  → Source: `02-engineering-practices/file-organization.md`
- **Layer Separation.** NEVER put business logic in UI components. API calls, data transformations, and state management belong in services/hooks layers.
  → Source: `04-architecture/backend-architecture.md`
- **Pagination for Lists.** Every list endpoint MUST support pagination. No exceptions for lists that could exceed 50 items.
  → Source: `04-architecture/api-design-standards.md`
- **AI-Readable Code Documentation.** Code comments serve the NEXT AI session. Use ICDC: INTENT (what should this do), CONSTRAINT (what it must NOT violate), DECISION (why this approach, when non-obvious), CAVEAT (surprising edge cases). Every file starts with a file-level context comment; every exported function has JSDoc/TSDoc. NEVER restate what the code does — comments add CONTEXT the code cannot express.
  → Source: `02-engineering-practices/ai-code-documentation.md`
- **One Source of Truth Per State Type.** Server state lives in the data-fetching library (React Query / SWR), form state in the form library. NEVER duplicate state across stores.
  → Source: `04-architecture/state-management.md`
- **Error Responses with Machine-Readable Codes.** Error responses MUST include a machine-readable `code` field. NEVER expose stack traces in API responses.
  → Source: `04-architecture/api-design-standards.md`
- **Vertical Slice Development.** Build one complete feature UI → API → Database before starting the next. Never build by horizontal layers. The first increment is a working end-to-end feature, however thin.
  → Source: `01-workflow-methodology/development-workflow.md`
- **SWR / React Query Key Convention — Raw Tuples Only.** ALL query keys, mutations, and cache invalidations use raw tuple format: `['entity', params] as const`. NEVER stringified JSON, path strings, or loose arrays. Centralize key constants in a shared file.
  → Source: `04-architecture/state-management.md`
- **Router API — Data Router Only.** Use the framework's data router API exclusively (`createBrowserRouter` for React Router, never `<BrowserRouter>`) — required for native `useBlocker`, loaders, and actions. Custom navigation-blocking workarounds are forbidden.
  → Source: `04-architecture/router-architecture.md`
- **Batch Fetch Parallelism Cap.** When fetching paginated data across pages concurrently, cap parallelism at 4 simultaneous requests. Extract a shared `fetchAllPages<T>()` utility.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Import Hygiene ESLint Rules.** ESLint MUST enforce `import-x/no-duplicates` and `import-x/order`. Use inline `type` for type-only imports from the same package. Fix violations immediately.
  → Source: `02-engineering-practices/file-organization.md`
- **Code Duplication Detection.** When the same mapping, validation, or transformation logic appears in 2+ files, extract to a shared utility in the same iteration — do not wait for a refactoring pass.
  → Source: `02-engineering-practices/code-duplication-prevention.md`

## Design & UX (Load for UI Work)

- **Apply Interaction Design Heuristics.** Every UI decision MUST align with Nielsen's 10 Usability Heuristics: visible feedback for every action, prevent errors before handling them, show options and state persistently, always provide an escape (Cancel/Undo), and speak the user's language — never expose internal jargon or error codes in the UI.
  → Source: `02-engineering-practices/ux-design-principles.md`
- **Handle All Four States.** Every data-dependent component MUST handle loading, error, empty, and success states.
  → Source: `06-frontend-patterns/loading-and-empty-states.md`
- **Visual Consistency Through Design Tokens.** All styling MUST use design tokens (theme.palette or CSS custom properties). Enforce via linting.
  → Source: `06-frontend-patterns/visual-design-principles.md`
- **Shared Components Over Raw Primitives.** Use application shared components (StandardTable, PageHeader, StandardDialog) over raw library primitives; every shared component handles all four states and is tested in both RTL and LTR.
  → Source: `04-architecture/frontend-architecture.md`
- **Visual Hierarchy and Spacing.** High contrast for important elements, low for structural. 8px-based spacing scale. Max 2 typefaces, body text 16px+. Never convey information through color alone — always pair with text, icons, or patterns.
  → Source: `06-frontend-patterns/visual-design-principles.md`
- **Incremental Adoption for Existing Projects.** Design system adoption MUST NOT block feature development: new features use design system components exclusively; existing code migrates when touched (Strangler Fig). Track adoption metrics with quarterly targets.
  → Source: `08-governance/design-system-governance.md`

## AI Collaboration (Load for Every Session)

- **AI Output is Draft, Not Final.** First AI output is ALWAYS a draft. Iterate at least once. Accepting first output without review is an anti-pattern.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Specify Acceptance Criteria.** Every prompt MUST include acceptance criteria: "This is correct when [specific verifiable conditions]."
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Reference Existing Files.** Always point AI at 2-3 existing files as pattern templates. Without references, AI invents its own inconsistent patterns.
  → Source: `00-ai-fundamentals/prompt-engineering-patterns.md`
- **Fresh Session Per Feature.** Use a fresh AI session per feature. 100-message threads produce inconsistent, constraint-violating output.
  → Source: `00-ai-fundamentals/context-management-strategy.md`
- **AI Has No Concept of Correctness.** "The AI said it's correct" is dangerous. AI predicts plausible tokens, not truth. Verify every claim, especially about APIs and versions.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **No Silent TODOs or Placeholders.** NEVER generate TODO, FIXME, HACK, or placeholder comments in production code without explicit permission. State gaps in the AI response instead. Escape hatch: reference a tracker issue number and throw a descriptive error for unimplemented paths.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Web Search Escalation.** If you fail to solve a problem after 2 attempts, STOP guessing. Search the web or consult current documentation before a 3rd attempt, and say so.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Output Efficiency — Vibe Coder Optimized.** The developer cannot read code. Describe WHAT changed in plain language (1-2 sentences) and WHERE (file path + line range); compare before/after behavior, not code; translate error messages into plain language. Use file edit tools directly — NEVER paste code blocks in chat unless the developer explicitly asks "show me the code".
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Docs-Decision Before "Done".** Every task MUST end with `Docs: updated <files> | N/A (<reason>)`. Trigger-changes (new endpoint, table, env var, dependency, auth/RBAC, shared component, convention, guardrail) MUST update steering docs in the same iteration — stale docs mislead the next session worse than missing docs.
  → Source: `07-documentation/documentation-strategy.md`
- **Globalize Lessons.** When you discover a mistake worth never repeating, write it as a proposal in `guidelines-proposals/YYYY-MM-DD-<slug>.md` (what happened, the preventing rule, target guideline file). NEVER store the lesson only in the session. Proposals are reviewed at sync time.
  → Source: `01-workflow-methodology/development-workflow.md`

## RTL & Arabic (Always Active — All Projects Are Bilingual)

**All projects in this organization are bilingual (English + Arabic) by default. These rules always apply.**

- **Arabic-First Architecture.** Arabic support is an architectural requirement, NOT a localization afterthought. Every component, page, and feature MUST be designed for bidirectional text from day one, with direction handled at UI shell, workspace, document, paragraph, and inline span levels.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Logical CSS Properties Exclusively.** Use logical CSS properties everywhere in UI chrome: Tailwind `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`; MUI Emotion `marginInlineStart`/`paddingInlineEnd` or direction-aware `sx`. NEVER physical properties (`ml-*`, `pl-*`, `left-*`, `right-*`, `text-left`) in UI chrome. Lint rule enforced.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Mirroring With Intent.** Navigation, breadcrumbs, pagination, timelines, and directional icons MUST mirror in RTL (`rtl:rotate-180` or equivalent). Logos, numbers, code, and non-directional icons MUST NOT mirror.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Arabic Typography Rules.** Arabic text requires: line-height 1.6–1.8, minimum font-weight 400, zero letter-spacing (tracking disconnects cursive letters), no opacity on text blocks (jagged rendering in Firefox), no `word-break: break-all`.
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **Portal Direction Inheritance.** Portal-based components (Dialog, Popover, DropdownMenu, Tooltip, Select, Menu, Drawer — React Portal, Radix, MUI, Ariakit, Headless UI) do NOT inherit `dir` from the document; every one MUST receive an explicit `dir` prop. The #1 RTL regression source.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Numeral Policy.** Use Western Arabic numerals (0-9) for UI chrome by default. Domain products (writing, education, legal, religious, archival) MAY offer user-selectable numeral styles via `Intl.NumberFormat` with explicit numbering systems (`ar-u-nu-latn`, `ar-u-nu-arab`).
  → Source: `02-engineering-practices/bidirectional-design-principles.md`
- **RTL-Compliant Tech Stack.** Use libraries with proven RTL support. MUI 9+ is fully valid, NOT deprecated. Tailwind CSS v4 + shadcn/ui (initialized `--rtl`) + @base-ui/react + @radix-ui/react-direction + React Aria is the alternative for custom visual identity or zero-runtime RTL. Automated auditing: `npx rtlify-ai check`.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **Bilingual UI — All Text Uses i18n Keys.** All user-facing strings (labels, buttons, placeholders, errors, titles, tooltips) MUST use i18n keys. No hardcoded English or Arabic strings in components.
  → Source: `05-stack-guides/rtl-tech-stack.md`
- **LTR/RTL Testing Before Commit.** Every page MUST be tested in both LTR (English) and RTL (Arabic) before committing. Dual-direction E2E tests are mandatory. Visual regression in either direction is a bug.
  → Source: `05-stack-guides/rtl-tech-stack.md`

## Performance (Load for Performance-Sensitive Features)

- **Profile Before Optimizing.** NEVER optimize without measurement. Optimize only measured bottlenecks.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Make It Work → Make It Clean → Make It Fast.** Optimize only after correctness and cleanliness are established. Never optimize prematurely.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Performance Budgets.** Enforce budgets: LCP < 2.5s, bundle < 200KB gzipped, API p95 < 500ms. Reject PRs that increase bundle >10%.
  → Source: `02-engineering-practices/performance-optimization.md`

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
