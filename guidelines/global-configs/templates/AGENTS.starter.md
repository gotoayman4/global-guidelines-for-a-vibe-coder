# AGENTS.md — Project Constitution

**Purpose:** This file contains ALL extracted rules inline — no external file references.
The rules are self-contained and work in any AI tool without permission issues.
For deeper context, a `_guidelines/` mirror is available in this project (run `sync-guidelines.ps1` to create/refresh it).

**Guideline source:** `D:\WebApps\global-guidelines-for-a-vibe-coder`
**How to use:** Search for `[FILL]` and replace with project-specific values.

---

## Security (Always Load — DO NOT REMOVE)

### SQL Injection Prevention
ALL database queries MUST use parameterized statements. NEVER concatenate strings into SQL.
→ Source: `02-engineering-practices/security-engineering.md`

### Secrets Management
NEVER hardcode secrets, tokens, API keys, or credentials in source files. Environment variables only. Pre-commit hooks MUST scan for secret patterns.
→ Source: `03-git-and-ci/environment-management.md`

### Input Validation
ALL user input MUST be validated at system boundaries (API controllers, DTOs). Use class-validator + ValidationPipe. Trust no client-side validation.
→ Source: `02-engineering-practices/error-handling-philosophy.md`

### Authentication Code Review
Authentication code MUST receive 100% human review. No exceptions.
→ Source: `02-engineering-practices/security-engineering.md`

### Dependency Audit
Dependencies MUST be audited on every AI PR. Verify package existence, latest stable version, and known vulnerabilities. AI hallucinates package names and suggests stale versions — training data is inherently outdated. Search the web or npm registry for the current latest stable version before installing any package. Never accept "AI version X is latest" — verify. Pin to older versions only when documented in an ADR (compatibility, RTL regression, undocumented breaking changes, ecosystem lag).
→ Source: `00-ai-fundamentals/ai-security-governance.md`

### CORS
NEVER use `origin: '*'`. Configure an explicit CORS whitelist from day one.
→ Source: `00-ai-fundamentals/ai-security-governance.md`

### Security Headers
Security headers (CSP, HSTS, X-Frame-Options) MUST be configured. They are mandatory, not optional.
→ Source: `02-engineering-practices/security-engineering.md`

### File Upload MIME Validation (Magic-Byte)
ALL file upload endpoints MUST verify MIME type by reading magic bytes from the file buffer, not by trusting client-supplied `Content-Type` headers. Use `file-type` package (CommonJS-compatible version, `file-type@16.5.4` for Node.js). Reject uploads whose detected MIME type does not match the allowed whitelist.
→ Source: `02-engineering-practices/file-upload-security.md`

---

## Testing (Always Load)

### Regression Tests for Bug Fixes
Every bug fix MUST include a regression test that reproduces the bug and verifies the fix.
→ Source: `02-engineering-practices/testing-patterns.md`

### Tests for Critical and High-Risk Code
New code that touches critical flows (auth, payments, permissions, data persistence, core workflows) MUST include corresponding tests. Code at service boundaries (API contracts, database queries, form validation) SHOULD include integration tests. Simple UI rendering, pass-through code, and experimental prototypes MAY skip tests. Optimize for regression risk, not coverage percentage.
→ Source: `02-engineering-practices/testing-philosophy.md`

### Tests Before or With Code, Not After
For critical and high-risk features, write behavioral tests first based on requirements/PRD (test-first). For all other code, write tests in the same iteration as implementation. NEVER defer tests to a later sprint — tests written after features mirror bugs instead of defining correct behavior.
→ Source: `02-engineering-practices/testing-philosophy.md`

### Critical Flow E2E Coverage
Critical workflow chains MUST have E2E coverage covering both happy path and failure path.
→ Source: `02-engineering-practices/testing-patterns.md`

### Test Behavior, Not Implementation
Tests MUST verify behavior (what the code does), not implementation (how it does it). Do not test internal function calls, state shape, or private methods.
→ Source: `02-engineering-practices/testing-philosophy.md`

### No Code Without Test Verification
Every line of AI-generated code is unverified until tests pass. "It compiled, so it works" is false.
→ Source: `00-ai-fundamentals/ai-collaboration-mindset.md`

### Agent Verification Loop — Evidence Before "Done" (Cost-Tiered)
The agent MUST NOT report a task complete without executing verification itself. Verification is RATIONED BY COST — LLM-driven screen capture/vision/GUI automation is the most expensive instrument and is NOT routine:
- **Tier 1 (default, every change):** automated tests — unit + integration against real temp data, type-check, lint, contract/i18n parity. Primary evidence.
- **Tier 2 (slice/milestone completions):** programmatic headless E2E (e.g., Playwright `_electron`) asserting DOM/data/DB — no screenshots, no vision.
- **Tier 3 (rare exception only):** visual/interactive verification via screen capture + vision analysis or GUI automation — reserved for milestone exit/RTL-LTR layout sign-off of NEW screens, defects tests cannot observe, or explicit user request. Never per-change; never loop captures.
Selection rule: before any Tier-3 check ask "can a test or DB query assert this?" If yes, write the test instead. Change-type minimums still apply: UI work → dev server + page load + RTL and LTR check; forms → valid AND invalid submit; APIs → real request; logic → tests written AND passing; bug fixes → regression test reproducing then passing. Report format: WHAT was verified, HOW (exact command), RESULT — plus anything NOT verified. NEVER claim tests pass without running them; NEVER present predictions as observations.
→ Source: `02-engineering-practices/agent-verification-loop.md`

### Normalization Functions Require Exhaustive Tests
Every normalization/mapping function (e.g., role code normalization, enum mapping) MUST have exhaustive parameterized tests covering: every valid input, every deprecated alias, empty/whitespace/invalid inputs, and case variations. Use `it.each()` or equivalent for exhaustive coverage.
→ Source: `02-engineering-practices/testing-patterns.md`

### Pre-Commit Hooks Mandatory
Every project MUST have pre-commit hooks (husky + lint-staged) running: ESLint, TypeScript type-check, and formatting. Hooks MUST be configured in `package.json` and installed automatically after `npm install`. No commits without passing hooks.
→ Source: `03-git-and-ci/git-workflow-strategy.md`

---

## Git (Load for All Code Changes)

### Commit After Every Working Increment
Commit after every working increment. Granular commits = cheap rollbacks. NEVER commit broken code "to save progress" — use stash or WIP branches.
→ Source: `03-git-and-ci/git-workflow-strategy.md`

### Descriptive Commit Messages
Commit messages MUST be descriptive with type and scope (conventional commit format). Future you and future AI need the context.
→ Source: `03-git-and-ci/git-workflow-strategy.md`

### Revert Broken AI Output Immediately
Do not debug-in-place. Revert broken AI output immediately and regenerate with better constraints.
→ Source: `03-git-and-ci/git-workflow-strategy.md`

### Checkpoint Before Major AI Operations
Always commit a checkpoint before running major AI operations. Always have a rollback point.
→ Source: `03-git-and-ci/git-workflow-strategy.md`

### No Branch Requirement for New Features
Adding new features or making changes does NOT require creating a new branch or worktree. Work on the current branch unless the team's workflow explicitly requires otherwise.
→ Source: `03-git-and-ci/git-workflow-strategy.md`

### Protect Main Branch
Main branch MUST always be deployable. Use branch protection rules. Agents should never force-push to main.
→ Source: `03-git-and-ci/git-workflow-strategy.md`

---

## Architecture (Load for New Features)

### File Size Limit
Files MUST NOT exceed 500 lines (plan for 300). Any file exceeding 500 lines after implementation MUST be refactored into smaller modules before proceeding. Enforced by ESLint `max-lines` rule. Only applies to source code — documentation, config, and generated files are excluded.
→ Source: `02-engineering-practices/file-organization.md`

### Layer Separation
NEVER put business logic in UI components. API calls, data transformations, and state management belong in services/hooks layers, not in JSX.
→ Source: `04-architecture/backend-architecture.md`

### Pagination for Lists
Every list endpoint MUST support pagination. No exceptions for lists that could exceed 50 items.
→ Source: `04-architecture/api-design-standards.md`

### AI-Readable Code Documentation
Code comments in this project serve the NEXT AI session, not human readers. Use the ICDC framework:
- **INTENT:** What is this code supposed to do? (always for non-trivial functions)
- **CONSTRAINT:** What must this code NOT violate? (security, business rules, performance)
- **DECISION:** Why was this approach chosen over alternatives? (when non-obvious)
- **CAVEAT:** What edge cases or surprising behaviors exist? (when behavior may surprise)
Every file MUST start with a file-level comment providing context for an AI agent seeing it for the first time. Every exported function MUST have JSDoc/TSDoc with what it does, parameters, return value, and side effects. NEVER restate what the code does — comments add CONTEXT the code itself cannot express.
→ Source: `02-engineering-practices/ai-code-documentation.md`

### One Source of Truth Per State Type
Server state in data-fetching library (React Query / SWR). Form state in form library. NEVER duplicate state across stores.
→ Source: `04-architecture/state-management.md`

### Error Responses with Machine-Readable Codes
Error responses MUST include a machine-readable `code` field. NEVER expose stack traces in API responses.
→ Source: `04-architecture/api-design-standards.md`

### Vertical Slice Development
Build one complete feature from UI → API → Database before starting the next. Never build by horizontal layers (all models first, then all routes, then all pages). The first increment must be a fully working end-to-end feature, however thin.
→ Source: `01-workflow-methodology/development-workflow.md`

### SWR / React Query Key Convention — Raw Tuples Only
ALL data-fetching query keys, mutations, and cache invalidations MUST use a consistent raw tuple format: `['entity', params] as const`. NEVER use stringified JSON keys, path strings, or loose arrays. This enables reliable wildcard cache invalidations. Centralize key constants in a shared file (e.g., `src/constants/swrKeys.ts` or `src/constants/queryKeys.ts`).
→ Source: `04-architecture/state-management.md`

### Router API — Data Router Only
Use the framework's data router API exclusively. For React Router: `createBrowserRouter`, never `<BrowserRouter>`. The data router API is required for native `useBlocker`, `useNavigation`, loaders, and actions. Custom navigation-blocking workarounds are forbidden — use the framework's native blocker instead.
→ Source: `04-architecture/router-architecture.md`

### Batch Fetch Parallelism Cap
When fetching paginated data across multiple pages concurrently, cap parallelism at 4 simultaneous requests. Never fire unbounded concurrent requests. Extract a shared utility (e.g., `fetchAllPages<T>()`) for reuse.
→ Source: `02-engineering-practices/performance-optimization.md`

### Import Hygiene ESLint Rules
ESLint MUST enforce: `import-x/no-duplicates` (no duplicate imports from same package) and `import-x/order` (consistent import ordering). Use inline `type` keyword for type-only imports from the same package: `import { foo, type Bar } from 'module'`. Fix violations immediately.
→ Source: `02-engineering-practices/file-organization.md`

### Code Duplication Detection
AI MUST proactively detect and flag duplicated logic across files during every session. When the same mapping, validation, or transformation logic appears in 2+ files, extract to a shared utility immediately. Do not wait for a refactoring pass — deduplicate in the same iteration.
→ Source: `02-engineering-practices/code-duplication-prevention.md`

---

## Design & UX (Load for UI Work)

### Apply Interaction Design Heuristics
Every UI decision MUST align with Nielsen's 10 Usability Heuristics. Before shipping any interface: (1) every action produces visible feedback (no silent operations), (2) prevent errors before handling them (validate early, constrain inputs), (3) don't make users remember — show options, labels, and state persistently, (4) always provide an escape (Cancel/Undo on every dialog and destructive action), (5) speak the user's language — never expose internal jargon or error codes in the UI.
→ Source: `02-engineering-practices/ux-design-principles.md`

### Handle All Four States
Every data-dependent component MUST handle: loading, error, empty, and success states. No component renders without handling all four.
→ Source: `06-frontend-patterns/loading-and-empty-states.md`

### Visual Consistency Through Design Tokens
All styling MUST use design tokens (theme.palette or CSS custom properties). Never raw hex colors, pixel values, or font families in components. Enforce via linting.
→ Source: `06-frontend-patterns/visual-design-principles.md`

### Shared Components Over Raw Primitives
Use application shared components (StandardTable, PageHeader, StandardDialog) over raw library primitives. Every shared component handles all four states and is tested in both RTL and LTR.
→ Source: `04-architecture/frontend-architecture.md`

### Visual Hierarchy and Spacing
High contrast for important elements (CTAs, errors), low contrast for structural elements. All spacing and sizing follows an 8px-based mathematical scale. Maximum 2 typefaces. Body text 16px+. Never convey information through color alone — always pair with text, icons, or patterns.
→ Source: `06-frontend-patterns/visual-design-principles.md`

### Incremental Adoption for Existing Projects
Design system adoption MUST NOT block feature development. New features use design system components exclusively. Existing code migrates when touched for other reasons (Strangler Fig pattern). Track adoption metrics; set quarterly improvement targets.
→ Source: `08-governance/design-system-governance.md`

---

## AI Collaboration (Load for Every Session)

### AI Output is Draft, Not Final
First AI output is ALWAYS a draft. Treat as draft. Iterate at least once. Accepting first output without review is an anti-pattern.
→ Source: `00-ai-fundamentals/ai-collaboration-mindset.md`

### Specify Acceptance Criteria
Every prompt MUST include acceptance criteria: "This is correct when [specific verifiable conditions]."
→ Source: `00-ai-fundamentals/ai-collaboration-mindset.md`

### Reference Existing Files
Always point AI at 2-3 existing files as pattern templates. Without references, AI invents its own inconsistent patterns.
→ Source: `00-ai-fundamentals/prompt-engineering-patterns.md`

### Fresh Session Per Feature
Use a fresh AI session per feature. 100-message threads produce inconsistent, constraint-violating output.
→ Source: `00-ai-fundamentals/context-management-strategy.md`

### AI Has No Concept of Correctness
"The AI said it's correct" is dangerous. AI predicts plausible tokens, not truth. Verify every claim, especially about APIs and versions.
→ Source: `00-ai-fundamentals/ai-collaboration-mindset.md`

### No Silent TODOs or Placeholders
NEVER generate TODO, FIXME, HACK, or placeholder comments in production code without explicit user permission. If a feature cannot be implemented fully, state the gap in the AI response — not silently in a code comment. Acceptable escape hatch: reference a tracker issue number and throw a descriptive error for unimplemented paths.
→ Source: `00-ai-fundamentals/ai-collaboration-mindset.md`

### Web Search Escalation
If you fail to solve a problem after 2 attempts, STOP guessing. Search the web or consult up-to-date documentation before making a 3rd attempt. State: "I failed twice. Searching for current documentation before retrying."
→ Source: `00-ai-fundamentals/ai-collaboration-mindset.md`

### Output Efficiency — Minimize Code in Chat
The developer does not read code. Do NOT echo code blocks in chat responses. Describe WHAT changed in plain language (1-2 sentences) and WHERE (file path + line range). Use file edit tools directly — never paste code back in chat. Only show code when the user explicitly asks "show me the code."
→ Source: `00-ai-fundamentals/ai-collaboration-mindset.md`

---

## RTL & Arabic (Always Active — All Projects Are Bilingual)

**All projects in this organization are bilingual (English + Arabic) by default. These rules always apply.**

### Arabic-First Architecture
Arabic support is an architectural requirement, NOT a localization afterthought. Every component, page, and feature MUST be designed for bidirectional text from day one. Direction at multiple levels: UI shell, workspace, editor document, paragraph, and inline span.
→ Source: `05-stack-guides/rtl-tech-stack.md`

### Logical CSS Properties Exclusively
Use logical CSS properties everywhere in UI chrome: Tailwind `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `border-s`, `rounded-s`. NEVER use physical properties (`ml-*`, `pl-*`, `left-*`, `right-*`, `text-left`) in UI chrome. Lint rule enforced.
→ Source: `02-engineering-practices/bidirectional-design-principles.md`

### Mirroring With Intent
Navigation, breadcrumbs, pagination, timelines, and directional icons MUST mirror in RTL. Logos, numbers, code, non-directional icons MUST NOT mirror. Directional icons use `rtl:rotate-180` or equivalent.
→ Source: `02-engineering-practices/bidirectional-design-principles.md`

### Arabic Typography Rules
Arabic text requires: line-height 1.6–1.8 (not 1.4), minimum font-weight 400 (never 300), zero letter-spacing (tracking disconnects cursive letters), no opacity on text blocks (causes jagged rendering in Firefox), no `word-break: break-all`.
→ Source: `02-engineering-practices/bidirectional-design-principles.md`

### Portal Direction Inheritance
Portal components (Dialog, Popover, DropdownMenu, Tooltip, Select, Menu, Drawer, overlay wrappers from React Portal, Radix, MUI, Ariakit, or Headless UI) do NOT inherit `dir` from the document. Every portal-based component MUST receive an explicit `dir` prop. This is the #1 RTL regression source.
→ Source: `05-stack-guides/rtl-tech-stack.md`

### Numeral Policy
Use Western Arabic numerals (0 1 2 3 4 5 6 7 8 9) for UI chrome by default. Do not globally forbid Arabic-Indic numerals (٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩); writing, publishing, education, legal, religious, archival, and institution-specific products may allow user-selectable numeral styles. Use `Intl.NumberFormat` with explicit numbering systems such as `ar-u-nu-latn` or `ar-u-nu-arab`.
→ Source: `02-engineering-practices/bidirectional-design-principles.md`

### RTL-Compliant Tech Stack
Use latest stable libraries with proven RTL support. MUI 9+ remains a fully valid, production-tested option — it is NOT deprecated. Tailwind CSS v4 + shadcn/ui (initialized with `--rtl`, Nova/base-ui style) + @base-ui/react + @radix-ui/react-direction DirectionProvider + React Aria is an alternative for products needing custom visual identity, code ownership, or zero-runtime RTL. In ANY stack: use logical CSS properties (Tailwind: `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`; MUI Emotion: `marginInlineStart`/`paddingInlineEnd`/etc. or direction-aware `sx` props). Never use physical direction properties (`left`/`right`/`margin-left`/etc.) in UI chrome. Portal components (Dialog, Popover, Menu) must receive explicit `dir` in both MUI and shadcn. Run tests in both LTR and RTL. Run `npx rtlify-ai check` for automated RTL auditing.
→ Source: `05-stack-guides/rtl-tech-stack.md`

### Bilingual UI — All Text Uses i18n Keys
All user-facing strings MUST use i18n keys. No hardcoded English or Arabic strings in components. Every visible text element must reference a translation key. This applies to labels, buttons, placeholders, error messages, titles, and tooltips.
→ Source: `05-stack-guides/rtl-tech-stack.md`

### LTR/RTL Testing Before Commit
Every page MUST be tested in both LTR (English) and RTL (Arabic) modes before committing. Visual regression in either direction is a bug. Dual-direction E2E tests are mandatory.
→ Source: `05-stack-guides/rtl-tech-stack.md`

---

## Performance (Load for Performance-Sensitive Features)

### Profile Before Optimizing
NEVER optimize without measurement. Profile first. Optimize only measured bottlenecks.
→ Source: `02-engineering-practices/performance-optimization.md`

### Make It Work → Make It Clean → Make It Fast
Optimize only after correctness and cleanliness are established. Never optimize prematurely.
→ Source: `02-engineering-practices/performance-optimization.md`

### Performance Budgets
Set and enforce budgets: LCP < 2.5s, bundle < 200KB gzipped, API p95 < 500ms. Reject PRs that increase bundle >10%.
→ Source: `02-engineering-practices/performance-optimization.md`

---

## Session Bootstrap

1. Read this AGENTS.md — always
2. Read WORLD.md for product intent guardrails
3. For UI/UX work: also load `_guidelines/02-engineering-practices/ux-design-principles.md`, `_guidelines/02-engineering-practices/bidirectional-design-principles.md`, `_guidelines/06-frontend-patterns/visual-design-principles.md`
4. Look up task type in `_guidelines/_index/MASTER_INDEX.md` (mirrored by `sync-guidelines.ps1`)
5. Load primary guideline files per task-type table
6. Apply compact extracts when context is tight (<20K tokens)

---

## ═══════════════════════════════════════════════════════
## PROJECT-SPECIFIC SECTION — CUSTOMIZE BELOW THIS LINE
## Remove this section header when done.
## ═══════════════════════════════════════════════════════

## Stack (Pin exact versions — do NOT use ranges)

**Before filling this table, search the web or npm registry for the latest stable version of each package.** AI training data is stale — never trust AI-suggested version numbers without verification.

| Layer                | Technology            | Version          |
|----------------------|-----------------------|------------------|
| Frontend framework   | [FILL]                | [FILL]           |
| Language             | [FILL]                | [FILL]           |
| Build tool           | [FILL]                | [FILL]           |
| UI component library | [FILL]                | [FILL]           |
| Backend framework    | [FILL]                | [FILL]           |
| Database             | [FILL]                | [FILL]           |
| Auth                 | [FILL]                | [FILL]           |
| Hosting              | [FILL]                | [FILL]           |

Versions may be pinned to older major releases only when the project has a documented ADR justifying the pin (compatibility constraint, Arabic RTL regression, undocumented breaking changes, ecosystem lag).

## Forbidden Dependencies and Patterns

- Do not suggest: [FILL — e.g., Next.js, Tailwind, Redux]
- [FILL — additional forbidden items]

## Project-Specific Mandates

### Shared Components (if applicable)
- [FILL — e.g., "Use StandardTable for all data tables"]
- [FILL]

### Design System Tokens (if applicable)
- [FILL — e.g., "Use theme.palette.* tokens, never hex values"]

### API Design
- All endpoints under: [FILL — e.g., /api/v1/]
- Response envelope: [FILL — e.g., { data, pagination?, error? }]

### [FILL — Additional sections as needed for your project]

---

## Build & Validation Commands

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
Never introduce TypeScript `any` casts, `eslint-disable` suppressions, or `@ts-ignore` without a comment explaining why.

---

## AI Response Format (Vibe Coder Optimized)

Since the developer (vibe coder) cannot read code, AI MUST optimize responses for behavioral understanding:
- Describe WHAT changed in plain language (1-2 sentences), not HOW
- Specify WHERE: file path + line range
- Use file edit tools directly — never paste code blocks in chat
- Only show code when the developer explicitly asks "show me the code"
- When describing errors, translate technical messages into plain language
- When describing changes, compare before/after behavior, not before/after code

---

## Forbidden Patterns

- No `console.log` in production code
- No `!important` in CSS
- No TypeScript `any` without a comment explaining why
- No inline styles when design system tokens exist
- No hardcoded UI strings — all text MUST use i18n keys (every project is bilingual)
- No `// TODO`, `// FIXME`, `// HACK` without explicit permission — state gaps in the AI response instead
- No placeholder or filler content in UI (no "lorem ipsum", no "test test test")
- No physical CSS direction properties (`ml-*`, `pl-*`, `left-*`, `right-*`, `text-left`) in UI chrome — use logical properties (`ms-*`, `ps-*`, `start-*`, `text-start`)
- No raw hex colors, pixel values, or font families in components — use design tokens
- No `letter-spacing` / `tracking-*` on Arabic text — disconnects cursive letters
- No opacity / `rgba()` transparency on Arabic text blocks — causes jagged rendering in Firefox
- No portal components (Dialog, Popover, DropdownMenu) without explicit `dir` prop
- No custom navigation-blocking workarounds — use the framework's native blocker (React Router: `useBlocker` with `createBrowserRouter`)
- No stringified JSON or path strings as data-fetching cache keys — use raw tuples `['entity', params] as const`
- No trusting client-supplied `Content-Type` for file uploads — verify MIME via magic-byte inspection (`file-type` package)

## How to Use This File

1. **Run** `sync-guidelines.ps1` from this repo to mirror guidelines into `_guidelines/` (skip if already done)
2. **Create** this file as `AGENTS.md` in your project root (all rules are inline — no external file references needed)
3. **Search for `[FILL]`** and replace ALL occurrences with project-specific values
4. **Review** the global rules above — remove any that don't apply to your stack
5. **Add** any project-specific rules in the designated section
6. **Commit** to Git. Treat this file as code — changes go through review.
7. **Never let AI modify this file without human approval.**

## Maintenance

- **Quarterly:** Audit rules against source guidelines. Re-extract outdated rules.
- **When guidelines change:** Check if extracted rules need updating.
- **When stack changes:** Update the Stack table and review all rules.
- **Source of truth:** Central repo at `D:\WebApps\global-guidelines-for-a-vibe-coder\` — run `sync-guidelines.ps1` to refresh `_guidelines/`

---

**Cross-References (in `_guidelines/` mirror):**
- Authority hierarchy: `_guidelines/08-governance/ai-governance-framework.md`
- Loading strategy: `_guidelines/_index/RETRIEVAL_RULES.md`
- Design principles: `_guidelines/02-engineering-practices/ux-design-principles.md`, `_guidelines/02-engineering-practices/bidirectional-design-principles.md`
- Design governance: `_guidelines/08-governance/design-system-governance.md`
