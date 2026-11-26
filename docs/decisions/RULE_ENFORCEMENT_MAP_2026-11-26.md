# Rule Enforcement Map (Generated Templates, Hooks, Scripts & Prose)

**Date:** 2026-11-26  
**Source checked:** `guidelines/global-configs/templates/AGENTS.starter.md` (rendered from `global-configs/fragments/`)  
**Scope:** Classifies every always-loaded constitution rule by its real enforcement mechanism so projects do not mistake prose rules—or partial lint setups—for deterministic enforcement.

---

## Summary by Enforcement Layer

| Enforcement Layer | What It Deterministically Blocks | Delivered Artifacts |
|---|---|---|
| **Git & Agent Hooks** | Destructive git/rm commands, `--no-verify`, `git add -A`, staged/written secrets, `.env`/key file reads (opt-in `--full`), fast post-edit syntax/secret errors (opt-in `--full`) | `guard-command.js`, `guard-file-access.js`, `scan-secrets.js`, `install-guardrails.js` |
| **TypeScript & ESLint (Opt-In Zero-Dep)** | Unsafe `any`/unchecked index access, files >400 lines (warn), `TODO`/`FIXME`/`HACK` comments, `<BrowserRouter>`, physical CSS keys in JSX `style`/`sx` | `templates/tsconfig.strict.base.json.template`, `templates/eslint.guardrails.mjs.template` |
| **Repo / Fleet Scripts** | Index drift, broken links, starter drift/token budget, doc duplication, guard-tier wiring gaps, boot-chain token/byte bloat, project mirror/skill drift | `check-*.js`, `audit-rules.js`, `measure-boot-budget.js`, `gate-receipt.js` |
| **External Toolchain (Project Opt-In)** | Physical properties in `.css`/`.scss` (**Stylelint**), Tailwind physical utility classes (`ml-*`/`pl-*` via **eslint-plugin-better-tailwindcss**), bundle limits, SAST | Documented per stack below |
| **Eval Scenarios + Behavioral E2E / Integration** | Prompt-injection resistance, fake-package guard, dual-direction RTL/LTR DOM, auth/IDOR checks, escalation discipline | `evals/scenarios.json`, `score-compliance.js`, Playwright / Rules tests |
| **Prose-Only (Judgment / Code Review)** | Vertical slicing, architectural boundary intent, layer separation where no path-import rule fits, honest summary reporting | `code-review`, `security-audit`, `architect` skills |

> **Critical boundary (no false-confidence lint):** Stylelint inspects CSS/SCSS only; JSX `style`/`sx` props require ESLint AST rules (`eslint.guardrails.mjs.template`); Tailwind `ml-*`/`pl-*` strings require `eslint-plugin-better-tailwindcss`. Installing only one leaves the others unchecked.

> **Pruning rule (owner decision 2026-11-26):** Security, data-integrity, and safety rules are permanently exempt from pruning regardless of live eval pass rates; only process/style reminders may be demoted to on-demand docs after measured proof (`npm run eval:score`).

---

## Complete Constitution Rule Map

### Speed Mode (`00-speed.md`)

| Rule | Layer | Mechanism & Gap / Boundary |
|---|---|---|
| **Mode Scales Ceremony, Never Security** | Script + Eval | `read-mode.js` routes per-push hook mode and falls back missing mode to `standard`; `measure-boot-budget.js` measures boot tokens/bytes; `evals/scenarios.json` (`unknown-mode-fallback`) tests unknown-mode behavior. Security non-scaling remains eval/review enforced. |

### Security (`10-security.md`) & Web Security (`12-security-web.md`)

| Rule | Layer | Mechanism & Gap / Boundary |
|---|---|---|
| **Injection Prevention** | SAST (opt-in) / Prose + Tests | Parameterized SQL, XSS escaping, path containment, and SSRF allowlists require project integration tests and optional SAST (Semgrep/CodeQL); zero-dep ESLint cannot verify dataflow taint. |
| **Untrusted Content Is Data** | Eval + Prose | Prompt-injection resistance is tested via `evals/scenarios.json` (`prompt-injection`); runtime judgment cannot be enforced by lint. |
| **Secrets Management** | Git Hook + Harness Hook + Eval | Pre-commit `scan-secrets.js` scans staged additions; `install-guardrails.js --full` adds `guard-file-access.js` to block `.env`/key `Read`/`Edit`/`Write` calls and scan writes/post-edits. `evals/scenarios.json` (`secret-in-code`). |
| **Input Validation** | Eval + Integration Tests + Prose | `evals/scenarios.json` (`input-validation`) plus schema/DTO negative boundary tests (`400`/`422`). |
| **Authorization & Tenant Isolation (IDOR/BOLA)** | Integration / Rules Tests + Prose | Cross-tenant negative tests and Firestore/DB rules unit tests (`firebase-firestore-practices`); static lint cannot prove authorization predicates. |
| **Authentication Code Review** | Ship E2E + Fresh-Session Review | Requires fresh-session AI review and automated auth-flow E2E before ship; no automated trigger checks session freshness across chat threads. |
| **Dependency Audit and Version Pinning** | Lockfile / `npm audit` + Eval | Committed lockfile + `npm audit` in CI/milestone checks; package existence check covered by `evals/scenarios.json` (`fake-package`). |
| **Production Safety** | Harness Hook (partial) + Prose | `guard-command.js` blocks destructive shell git/`rm` patterns; production DB/deploy CLI commands remain prose unless a project extends `guard-command` rules. |
| **CORS, Headers & Sessions** | Integration / Header Probe Tests | Asserted against live/preview HTTP responses (`agent-verification-loop.md`), never config text alone. |
| **File Upload MIME Validation (Magic-Byte)** | Integration Tests + Prose | Verified by uploading a spoofed extension/MIME fixture in API boundary tests. |

### Testing (`20-testing.md`)

| Rule | Layer | Mechanism & Gap / Boundary |
|---|---|---|
| **Mode Sets Test Depth** | Git Hook + Script | `read-mode.js` drives per-push scope (`vibe` -> `gate:fast`, `standard` -> suite, `guarded` -> suite + build); `gate-receipt.js` (`check-ship-receipt.js`) records milestone/ship runs; Playwright E2E coverage is project-authored. |
| **Behavioral Tests Only** | Prose / Code Review + Eval | Avoiding implementation-detail spies (`toHaveBeenCalledTimes` internals) is reviewed by `test-generation` / `code-review`; not lint-enforced by default. |
| **Evidence Before "Done"** | Eval + Harness Hook | `evals/scenarios.json` (`evidence-before-done`, `fake-verification`); `--full` PostToolUse `guard-file-access.js --post-edit` catches JS syntax and JSON errors immediately after edits. |
| **Gates** | Harness Hook + Script Gate | `guard-command.js` blocks `--no-verify`; `check-guard-tiers.js` verifies `@tier` wiring; `local-ci-strategy` pre-push enforces mode gate. |

### Git (`30-git.md`)

| Rule | Layer | Mechanism & Gap / Boundary |
|---|---|---|
| **Commit Every Working Increment; Never Broken Code** | Harness Hook + Eval + Prose | `guard-command.js` blocks `git add -A`; `evals/scenarios.json` (`two-failed-fixes`) checks stop/revert escalation; commit granularity is prose. |
| **Destructive Git Safety & Protect Main** | Harness Hook + Pre-Commit | `guard-command.js` blocks `git reset --hard`, `git checkout --`, `git clean -f`, force push, and `--no-verify`; `.env` is protected by `.gitignore` + `guard-file-access.js` (`--full`). |

### Architecture (`40-architecture.md`), API (`42-api.md`) & Frontend (`45-frontend-architecture.md`)

| Rule | Layer | Mechanism & Gap / Boundary |
|---|---|---|
| **File Size Limit** | **ESLint (Opt-In Template)** | `eslint.guardrails.mjs.template` sets `max-lines` warning at `400` lines (skipping blanks and comments), matching the non-blocking "record debt, split next touch" rule. |
| **Layer Separation & Schema Safety** | Project Lint (opt-in) + Migration Review | UI-to-DB import bans require project-specific `no-restricted-imports` paths; additive migration safety is review/DB-test enforced. |
| **Comments Add Context, Not Narration** | Prose | Judgment rule; no reliable lint separates non-obvious "why" comments from narration. |
| **Vertical Slice Development** | Prose + Skill | Tracked via `implementation-plan` skill; process sequencing cannot be linted. |
| **Search Before Creating (No Duplication)** | Prose + Skills | Enforced at review/cleanup time via `code-review` and `codebase-cleanup`; cross-file AST clone detection (e.g. `jscpd`) is optional. |
| **Pagination & Error Responses** | API Integration Tests + Prose | Tested via API contract assertions (`code` field present, no `stack`, bounded page size). |
| **One Source of Truth Per State Type** | Project Lint + Prose | Banned legacy state libraries can be added to project `no-restricted-imports`; query-key centralization and concurrency caps (<=4) are prose/review. |
| **Stack Conventions (When React)** | **ESLint (Opt-In Template)** | `eslint.guardrails.mjs.template` restricts `<BrowserRouter>` JSX syntax and `BrowserRouter`/`HashRouter` imports from `react-router-dom`. |

### Design & UX (`50-design-ux.md`)

| Rule | Layer | Mechanism & Gap / Boundary |
|---|---|---|
| **Heuristics + Four States + Tokens** | UI Tests + Project Lint | Loading/error/empty/success states are checked in component/E2E tests; hard-coded hex colors require project-level regex rules because styling engines vary (MUI `theme.palette` vs Tailwind tokens). |
| **Incremental Adoption** | Prose | Strangler Fig migration discipline during feature work (`design-system-governance.md`). |

### AI Collaboration (`60-ai-collaboration.md`)

| Rule | Layer | Mechanism & Gap / Boundary |
|---|---|---|
| **Read Before Edit & Surgical Scope** | Eval + Prose | `evals/scenarios.json` (`unrequested-refactor`); scope restraint relies on session discipline. |
| **Self-Derived Acceptance Criteria** | Prose | Pre-edit condition framing in agent workflow. |
| **Verify, Escalate & Report** | **ESLint (Opt-In Template)** + Eval | `eslint.guardrails.mjs.template` enables `no-warning-comments` (`error` on `TODO`/`FIXME`/`HACK`); `evals/scenarios.json` covers `silent-todo`, `two-failed-fixes`, `flake-confirmation`. |
| **Docs on Triggers; One Home Per Fact** | Script Gate (central) / Prose (projects) | Central repo runs `npm run docs:census`; project chains run `measure-boot-budget.js` for size/byte advisories and milestone strictness. |

### RTL & Arabic (`70-rtl-arabic.md`)

| Rule | Layer | Mechanism & Gap / Boundary |
|---|---|---|
| **Arabic-First Architecture** | Prose + Skills | Architectural design rule (`rtl-tech-stack.md`, DOCX/PDF/Excel RTL skills). |
| **Logical CSS in UI Chrome** | **ESLint (Opt-In JSX)** + Stylelint (CSS) + Tailwind Plugin + Eval | `eslint.guardrails.mjs.template` forbids physical CSS properties (`marginLeft`/`paddingRight`/corner radii) inside JSX `style`/`sx` objects. `.css`/`.scss` files require Stylelint (`stylelint-use-logical`); Tailwind utilities (`ml-*`/`pl-*`) require `eslint-plugin-better-tailwindcss`; `evals/scenarios.json` (`physical-direction`). |
| **Direction, i18n Keys & Dual-Direction Test** | E2E + i18n Parity Script | Automated i18n key parity checks and dual-direction Playwright E2E checks (`dir="rtl"` & `dir="ltr"`). |

### Performance (`80-performance.md`)

| Rule | Layer | Mechanism & Gap / Boundary |
|---|---|---|
| **Profile Before Optimizing** | Prose + Skill | `performance-audit` skill enforces measurement before optimization. |
| **Budgets at Review Time** | Milestone CI Checks + TypeScript | Bundle size and LCP/p95 timing belong at milestone/PR checks; `tsconfig.strict.base.json.template` enforces strict TypeScript baselines (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`) with zero dependencies. |
