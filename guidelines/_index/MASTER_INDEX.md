# Master Index — Global Guidelines for Vibe Coders

**Purpose:** Single source of truth for every guideline document in this knowledge base.
AI agents and humans use this index to discover, load, and navigate the guideline system.

**Loading note:** Projects that ran `sync-guidelines.ps1` have a `_guidelines/` mirror in their root.
If you see `_guidelines/` in the project, use `_guidelines/_index/MASTER_INDEX.md` and
prefix all file references with `_guidelines/` — these paths are inside the project and
guaranteed to be readable.

**Generated regions.** The category tables, the skills table, and the cross-reference graph
sit between `GENERATED` markers and are produced by `npm run render:index` from each file's
YAML front-matter (`status` / `scope` / `tags`) and its `## Cross-References` footer.
Never hand-edit inside a marker — edit the file and re-render. `npm run check-index-drift`
fails the gate on divergence. Token counts are computed (characters ÷ 4), never stored, so
they cannot go stale. The four small auxiliary tables — `_index`, `Global Configs`,
`Scripts & Sync Tools`, `Tool Config Templates` — cover non-guideline artifacts (scripts,
JSON, `_index` pages) that carry no front-matter, and stay hand-written.

---

## Index by Category

<!-- GENERATED:index-tables — run `npm run render:index` -->

### 00 — AI Fundamentals

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [ai-agent-orchestration.md](../00-ai-fundamentals/ai-agent-orchestration.md) | Normative | Global | ~755 | `#agents` `#orchestration` `#parallel` |
| [ai-collaboration-mindset.md](../00-ai-fundamentals/ai-collaboration-mindset.md) | Normative | Global | ~1119 | `#mindset` `#philosophy` `#anti-patterns` |
| [ai-security-governance.md](../00-ai-fundamentals/ai-security-governance.md) | Normative | Global | ~906 | `#security` `#governance` `#owasp` |
| [context-management-strategy.md](../00-ai-fundamentals/context-management-strategy.md) | Normative | Global | ~1380 | `#context` `#tokens` `#efficiency` |
| [multi-tool-workflows.md](../00-ai-fundamentals/multi-tool-workflows.md) | Normative | Global | ~677 | `#multi-tool` `#cursor` `#copilot` `#claude` |
| [prompt-engineering-patterns.md](../00-ai-fundamentals/prompt-engineering-patterns.md) | Normative | Global | ~628 | `#prompting` `#templates` `#context` |

### 01 — Workflow Methodology

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [code-review-workflow.md](../01-workflow-methodology/code-review-workflow.md) | Advisory | Global | ~1660 | `#review` `#quality` `#ai-only` `#verification` |
| [debugging-with-ai.md](../01-workflow-methodology/debugging-with-ai.md) | Normative | Global | ~730 | `#debugging` `#troubleshooting` `#error` |
| [development-workflow.md](../01-workflow-methodology/development-workflow.md) | Normative | Global | ~1172 | `#workflow` `#process` `#lifecycle` |
| [planning-and-scoping.md](../01-workflow-methodology/planning-and-scoping.md) | Normative | Global | ~818 | `#planning` `#scoping` `#prd` |
| [refactoring-strategy.md](../01-workflow-methodology/refactoring-strategy.md) | Normative | Global | ~566 | `#refactoring` `#maintenance` `#technical-debt` |
| [speed-tiered-workflow.md](../01-workflow-methodology/speed-tiered-workflow.md) | Normative | Global | ~4694 | `#speed` `#modes` `#vibe` `#standard` `#guarded` `#ceremony` `#ship-boundary` `#release-class` `#context-budget` `#escalation` |
| [workflow-friction-audit.md](../01-workflow-methodology/workflow-friction-audit.md) | Normative | Global | ~2623 | `#workflow` `#friction` `#measurement` `#token-budget` `#gate` `#audit` |

### 02 — Engineering Practices

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [accessibility-standards.md](../02-engineering-practices/accessibility-standards.md) | Normative | Global | ~563 | `#a11y` `#wcag` `#aria` |
| [agent-verification-loop.md](../02-engineering-practices/agent-verification-loop.md) | Normative | Global | ~2763 | `#verification` `#agent` `#testing` `#evidence` `#done-criteria` `#cost-control` |
| [ai-code-documentation.md](../02-engineering-practices/ai-code-documentation.md) | Normative | Global | ~851 | `#documentation` `#comments` `#ai-context` `#icdc` |
| [bidirectional-design-principles.md](../02-engineering-practices/bidirectional-design-principles.md) | Normative | Global — All Projects (Bilingual by Default) | ~1435 | `#rtl` `#bidirectional` `#arabic` `#design` |
| [code-duplication-prevention.md](../02-engineering-practices/code-duplication-prevention.md) | Normative | Global | ~991 | `#deduplication` `#dry` `#code-smells` `#ai` |
| [cost-optimization-strategy.md](../02-engineering-practices/cost-optimization-strategy.md) | Normative | Global | ~974 | `#cost` `#hosting` `#tokens` `#free-tier` |
| [error-handling-philosophy.md](../02-engineering-practices/error-handling-philosophy.md) | Normative | Global | ~711 | `#error` `#contracts` `#recovery` |
| [file-organization.md](../02-engineering-practices/file-organization.md) | Normative | Global | ~565 | `#files` `#organization` `#modularity` `#limits` |
| [file-upload-security.md](../02-engineering-practices/file-upload-security.md) | Normative | Global | ~888 | `#security` `#file-upload` `#mime` `#magic-byte` |
| [performance-optimization.md](../02-engineering-practices/performance-optimization.md) | Normative | Global | ~499 | `#performance` `#profiling` `#caching` |
| [security-engineering.md](../02-engineering-practices/security-engineering.md) | Normative | Global | ~1350 | `#security` `#auth` `#xss` `#csp` |
| [testing-patterns.md](../02-engineering-practices/testing-patterns.md) | Normative | Global | ~1181 | `#testing` `#patterns` `#unit` `#integration` `#e2e` |
| [testing-philosophy.md](../02-engineering-practices/testing-philosophy.md) | Normative | Global | ~1717 | `#testing` `#philosophy` `#contracts` |
| [ux-design-principles.md](../02-engineering-practices/ux-design-principles.md) | Normative | Global | ~932 | `#ux` `#heuristics` `#cognition` `#nielsen` |

### 03 — Git & CI/CD

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [ci-cd-philosophy.md](../03-git-and-ci/ci-cd-philosophy.md) | Normative | Global | ~892 | `#ci-cd` `#pipelines` `#automation` |
| [environment-management.md](../03-git-and-ci/environment-management.md) | Normative | Global | ~934 | `#environments` `#secrets` `#config` |
| [git-workflow-strategy.md](../03-git-and-ci/git-workflow-strategy.md) | Normative | Global | ~809 | `#git` `#branching` `#commits` |
| [local-ci-strategy.md](../03-git-and-ci/local-ci-strategy.md) | Normative | Global | ~6324 | `#ci-cd` `#local-ci` `#pre-push` `#cost` `#husky` `#gate-receipt` `#path-aware` |

### 04 — Architecture

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [api-design-standards.md](../04-architecture/api-design-standards.md) | Normative | Global | ~595 | `#api` `#rest` `#contracts` |
| [backend-architecture.md](../04-architecture/backend-architecture.md) | Normative | Global | ~575 | `#backend` `#rest` `#services` |
| [database-architecture.md](../04-architecture/database-architecture.md) | Normative | Global | ~585 | `#database` `#sql` `#schema` |
| [frontend-architecture.md](../04-architecture/frontend-architecture.md) | Normative | Global | ~564 | `#frontend` `#spa` `#components` |
| [monorepo-strategy.md](../04-architecture/monorepo-strategy.md) | Advisory | Global | ~413 | `#monorepo` `#workspace` `#structure` |
| [router-architecture.md](../04-architecture/router-architecture.md) | Normative | Global | ~849 | `#router` `#react-router` `#createBrowserRouter` `#useBlocker` |
| [state-management.md](../04-architecture/state-management.md) | Normative | Global | ~577 | `#state` `#caching` `#react` |

### 05 — Stack Guides

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [arabic-rtl-pdf-generation.md](../05-stack-guides/arabic-rtl-pdf-generation.md) | Normative | Global — Web and Electron Apps (Arabic PDF output) | ~4777 | `#rtl` `#arabic` `#pdf` `#chromium` `#electron` `#print` `#bidi` `#fonts` `#paged-media` `#accessibility` |
| [electron-auto-update.md](../05-stack-guides/electron/electron-auto-update.md) | Normative | Stack (Electron) | ~11424 | `#electron` `#auto-update` `#release` `#github-releases` `#netlify` `#code-signing` `#changelog` |
| [outlook-integration.md](../05-stack-guides/electron/outlook-integration.md) | Normative | Stack (Electron — Windows Outlook) | ~12295 | `#electron` `#outlook` `#microsoft-graph` `#com-automation` `#powershell` `#email` `#calendar` `#ipc` |
| [mui-rtl-bidirectional.md](../05-stack-guides/mui/mui-rtl-bidirectional.md) | Normative | Stack (MUI 7+ / 9+ RTL) | ~953 | `#mui` `#rtl` `#i18n` `#bidirectional` |
| [mui-styling.md](../05-stack-guides/mui/mui-styling.md) | Normative | Stack (MUI 9+ / 7 legacy) | ~2165 | `#mui` `#styling` `#theme` `#theming` |
| [nestjs-architecture.md](../05-stack-guides/nestjs/nestjs-architecture.md) | Normative | Stack (NestJS) | ~703 | `#nestjs` `#backend` `#modules` |
| [playwright-e2e.md](../05-stack-guides/playwright/playwright-e2e.md) | Normative | Stack (Playwright) | ~711 | `#playwright` `#e2e` `#testing` |
| [react-architecture.md](../05-stack-guides/react/react-architecture.md) | Normative | Stack (React) | ~648 | `#react` `#hooks` `#components` |
| [react-performance.md](../05-stack-guides/react/react-performance.md) | Normative | Stack (React) | ~587 | `#react` `#performance` `#memo` |
| [react-testing.md](../05-stack-guides/react/react-testing.md) | Normative | Stack (React) | ~834 | `#react` `#testing` `#rtl` |
| [rtl-tech-stack.md](../05-stack-guides/rtl-tech-stack.md) | Normative | Global — All Projects (Bilingual by Default) | ~1535 | `#rtl` `#arabic` `#bidirectional` `#numerals` |
| [shadcn-rtl-bidirectional.md](../05-stack-guides/shadcn/shadcn-rtl-bidirectional.md) | Normative | Stack (shadcn/ui + Tailwind CSS v4) | ~1631 | `#shadcn` `#tailwind` `#rtl` `#i18n` `#bidirectional` `#radix` `#base-ui` `#logical-properties` |
| [supabase-auth.md](../05-stack-guides/supabase/supabase-auth.md) | Normative | Stack (Supabase Auth) | ~633 | `#supabase` `#auth` `#jwt` `#grants` |
| [supabase-database.md](../05-stack-guides/supabase/supabase-database.md) | Normative | Stack (Supabase / PostgreSQL) | ~974 | `#supabase` `#postgresql` `#rls` `#grants` `#postgrest` |
| [typescript-conventions.md](../05-stack-guides/typescript/typescript-conventions.md) | Normative | Stack (TypeScript) | ~614 | `#typescript` `#types` `#strict` |
| [vite-configuration.md](../05-stack-guides/vite/vite-configuration.md) | Normative | Stack (Vite) | ~549 | `#vite` `#build` `#bundler` |

### 06 — Frontend Patterns

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [dialog-patterns.md](../06-frontend-patterns/dialog-patterns.md) | Normative | Global | ~560 | `#dialogs` `#modals` `#focus` |
| [form-patterns.md](../06-frontend-patterns/form-patterns.md) | Normative | Global | ~712 | `#forms` `#validation` `#multi-step` |
| [icon-usage.md](../06-frontend-patterns/icon-usage.md) | Normative | Global | ~789 | `#icons` `#svg` `#accessibility` `#rtl` `#consistency` |
| [loading-and-empty-states.md](../06-frontend-patterns/loading-and-empty-states.md) | Advisory | Global | ~445 | `#loading` `#empty` `#ux` |
| [notification-patterns.md](../06-frontend-patterns/notification-patterns.md) | Normative | Global | ~474 | `#notifications` `#toast` `#snackbar` |
| [responsive-design.md](../06-frontend-patterns/responsive-design.md) | Normative | Global | ~448 | `#responsive` `#breakpoints` `#layout` |
| [table-patterns.md](../06-frontend-patterns/table-patterns.md) | Normative | Global | ~537 | `#tables` `#pagination` `#sorting` |
| [visual-design-principles.md](../06-frontend-patterns/visual-design-principles.md) | Normative | Global | ~751 | `#visual` `#hierarchy` `#color` `#typography` `#depth` |

### 07 — Documentation

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [adr-template.md](../07-documentation/adr-template.md) | Advisory | Global | ~357 | `#adr` `#decisions` `#template` |
| [documentation-strategy.md](../07-documentation/documentation-strategy.md) | Normative | Global | ~4990 | `#documentation` `#strategy` `#maintenance` `#changelog-archives` `#single-source` `#line-length` |

### 08 — Governance

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [ai-governance-framework.md](../08-governance/ai-governance-framework.md) | Normative | Global | ~1143 | `#governance` `#hierarchy` `#authority` |
| [design-system-governance.md](../08-governance/design-system-governance.md) | Normative | Global | ~608 | `#design-system` `#tokens` `#components` `#consistency` |

<!-- /GENERATED -->

### _index — Repository Navigation

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [MASTER_INDEX.md](MASTER_INDEX.md) | Normative | Global | ~11,100 — a lookup, never a full read | `#index` `#navigation` `#master` |
| [RETRIEVAL_RULES.md](RETRIEVAL_RULES.md) | Normative | Global | ~2,050 | `#retrieval` `#loading` `#tokens` `#strategy` |
| [GLOSSARY.md](GLOSSARY.md) | Advisory | Global | ~6,250 | `#glossary` `#terminology` `#reference` |
| [AGENT_BOOT_PROTOCOL.md](AGENT_BOOT_PROTOCOL.md) | Normative | Global | ~825 | `#boot` `#session` `#initialization` `#protocol` |

### Global Configs — Templates & Scripts

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [AGENTS.starter.md](../global-configs/templates/AGENTS.starter.md) | Starter | Global | ~5,000 | `#template` `#rules` `#agents` |
| [copilot-instructions.starter.md](../global-configs/templates/copilot-instructions.starter.md) | Starter | Global | ~50 | `#template` `#rules` `#copilot` |
| [CLAUDE.starter.md](../global-configs/templates/CLAUDE.starter.md) | Starter | Global | ~70 | `#template` `#rules` `#claude` `#pointer` `#entry-point` |
| [WORLD.starter.md](../global-configs/templates/WORLD.starter.md) | Starter | Global | ~1,300 | `#template` `#product-intent` `#guardrail` |
| [WORLD.example.md](../global-configs/templates/WORLD.example.md) | Reference | Global | ~1,200 | `#template` `#product-intent` `#example` |
| [DEVTOOLS.starter.md](../global-configs/templates/DEVTOOLS.starter.md) | Starter | Global | ~600 | `#template` `#devtools` `#gitignore` |
| [README.starter.md](../global-configs/templates/README.starter.md) | Starter | Global | ~500 | `#template` `#readme` `#overview` `#single-source` |
| [AI_ARCHITECTURE.starter.md](../global-configs/templates/AI_ARCHITECTURE.starter.md) | Starter | Global | ~800 | `#template` `#architecture` `#reference` |
| [firebase-hosting-headers.json.template](../global-configs/templates/firebase-hosting-headers.json.template) | Template | Global | ~410 | `#template` `#firebase` `#hosting` `#cache-control` `#fonts` |
| [tsconfig.strict.base.json.template](../global-configs/templates/tsconfig.strict.base.json.template) | Template | Global | ~100 | `#template` `#typescript` `#strict` `#lint` |
| [eslint.guardrails.mjs.template](../global-configs/templates/eslint.guardrails.mjs.template) | Template | Global | ~350 | `#template` `#eslint` `#guardrail` `#rtl` `#react-router` |
| [audit-rules.js](../global-configs/scripts/audit-rules.js) | Script | Global | ~300 | `#script` `#automation` `#drift-detection` |
| [sync-guidelines.ps1](../global-configs/scripts/sync-guidelines.ps1) | Script | Global | ~1,800 | `#script` `#sync` `#project-setup` |
| [sync-all.js](../global-configs/scripts/sync-all.js) | Script | Global | ~150 | `#script` `#sync` `#batch` `#fleet` `#project-setup` |
| [setup-global-references.ps1](../global-configs/scripts/setup-global-references.ps1) | Script | Global | ~1,200 | `#script` `#setup` `#global-config` |
| [GuidelineSync.psm1](../global-configs/scripts/GuidelineSync.psm1) | Script | Global | ~1,400 | `#script` `#module` `#sync` `#shared` |
| [render-agents-starter.js](../global-configs/scripts/render-agents-starter.js) | Script | Global | ~150 | `#script` `#render` `#single-source` `#drift-detection` `#token-budget` |
| [render-index.js](../global-configs/scripts/render-index.js) | Script | Global | ~250 | `#script` `#render` `#index` `#single-source` `#drift-detection` |
| [render-skills-index.js](../global-configs/scripts/render-skills-index.js) | Script | Global | ~2,100 (run it; read it only to change it) | `#script` `#render` `#skills` `#triggers` `#single-source` `#drift-detection` |
| [inject-skills-block.js](../global-configs/scripts/inject-skills-block.js) | Script | Global | ~2,300 (run it; read it only to change it) | `#script` `#skills` `#inject` `#markers` `#generated-block` `#single-source` `#idempotent` |
| [inject-constitution-block.js](../global-configs/scripts/inject-constitution-block.js) | Script | Global | ~1,600 (run it; read it only to change it) | `#script` `#constitution` `#inject` `#markers` `#generated-block` `#single-source` `#idempotent` |
| [patch-tool-configs.js](../global-configs/scripts/patch-tool-configs.js) | Script | Global | ~4,500 (run it; read it only to change it) | `#script` `#sync` `#tool-config` `#entry-point` `#markers` `#idempotent` `#single-source` |
| [plan-skills.js](../global-configs/scripts/plan-skills.js) | Script | Global | ~2,000 (run it; read it only to change it) | `#script` `#skills` `#selection` `#stack` `#dry-run` `#fleet` |
| [lib/front-matter.js](../global-configs/scripts/lib/front-matter.js) | Script | Global | ~800 (run it; read it only to change it) | `#script` `#front-matter` `#shared` `#single-source` `#mirror-safe` |
| [lib/tech-tokens.js](../global-configs/scripts/lib/tech-tokens.js) | Script | Global | ~1,300 (run it; read it only to change it) | `#script` `#skills` `#vocabulary` `#shared` `#single-source` `#mirror-safe` |
| [lib/stack-profile.js](../global-configs/scripts/lib/stack-profile.js) | Script | Global | ~3,700 (run it; read it only to change it) | `#script` `#skills` `#stack` `#declared-vs-measured` `#shared` `#mirror-safe` |
| [lib/plan-skills.js](../global-configs/scripts/lib/plan-skills.js) | Script | Global | ~2,300 (run it; read it only to change it) | `#script` `#skills` `#selection` `#fit-rule` `#shared` `#mirror-safe` |
| [lib/run-sync.js](../global-configs/scripts/lib/run-sync.js) | Script | Global | ~250 | `#script` `#subprocess` `#portability` `#windows` `#ebusy` |
| [lib/shell-code.js](../global-configs/scripts/lib/shell-code.js) | Script | Global | ~450 | `#script` `#hook` `#comments` `#shared` `#single-source` |
| [lib/project-mode.js](../global-configs/scripts/lib/project-mode.js) | Script | Global | ~50 | `#script` `#mode` `#world-md` `#shared` `#single-source` |
| [lib/context-caps.js](../global-configs/scripts/lib/context-caps.js) | Script | Global | ~50 | `#script` `#token-budget` `#shared` `#single-source` `#mirror-safe` |
| [read-mode.js](../global-configs/scripts/read-mode.js) | Script | Global | ~50 (run it; read it only to change it) | `#script` `#mode` `#speed-mode` `#gate` `#shared` `#single-source` |
| [audit-gate.js](../global-configs/scripts/audit-gate.js) | Script | Global | ~250 (run it; read it only to change it) | `#script` `#audit` `#dependencies` `#gate` `#allowlist` |
| [gate-receipt.js](../global-configs/scripts/gate-receipt.js) | Script | Global | ~1,900 (run it; read it only to change it) | `#script` `#gate` `#receipt` `#ship-boundary` `#release-class` |
| [measure-boot-budget.js](../global-configs/scripts/measure-boot-budget.js) | Script | Global | ~2,600 (run it; read it only to change it) | `#script` `#measurement` `#token-budget` `#changelog-history` `#steering-docs` |
| [benchmark-reform.js](../global-configs/scripts/benchmark-reform.js) | Script | Global | ~5,600 (run it; read it only to change it) | `#script` `#measurement` `#benchmark` `#reform` `#rule-retention` `#token-budget` |
| [check-project-freshness.js](../global-configs/scripts/check-project-freshness.js) | Script | Global | ~150 | `#script` `#report` `#drift-detection` `#sync` |
| [check-docs-freshness.js](../global-configs/scripts/check-docs-freshness.js) | Script | Global | ~300 | `#script` `#documentation` `#drift-detection` `#warn-only` |
| [check-doc-census.js](../global-configs/scripts/check-doc-census.js) | Script | Global | ~250 | `#script` `#documentation` `#single-source` `#census` `#gate` |
| [new-guideline.js](../global-configs/scripts/new-guideline.js) | Script | Global | ~250 | `#script` `#scaffold` `#guideline` `#master-index` |
| [new-project.js](../global-configs/scripts/new-project.js) | Script | Global | ~350 | `#script` `#bootstrap` `#starter` `#speed-mode` |
| [check-sync-drift.js](../global-configs/scripts/check-sync-drift.js) | Script | Global | ~300 | `#script` `#sync` `#drift-detection` `#content-hash` `#gate` `#delivery` |
| [audit-friction.js](../global-configs/scripts/audit-friction.js) | Script | Global | ~450 | `#script` `#audit` `#friction` `#measurement` `#cadence` `#boot-budget` |
| [check-guard-tiers.js](../global-configs/scripts/check-guard-tiers.js) | Script | Global | ~4,400 (run it; read it only to change it) | `#script` `#guard` `#tiers` `#gate` `#derived` `#single-source` |
| [check-agents-paths.js](../global-configs/scripts/check-agents-paths.js) | Script | Global | ~3,000 (run it; read it only to change it) | `#script` `#guard` `#bootstrap` `#tracked-ness` `#portability` `#gate` |
| [check-mode-conformance.js](../global-configs/scripts/check-mode-conformance.js) | Script | Global | ~250 (run it; read it only to change it) | `#script` `#guard` `#mode` `#speed-mode` `#gate` `#fleet` |
| [check-ship-receipt.js](../global-configs/scripts/check-ship-receipt.js) | Script | Global | ~1,600 (run it; read it only to change it) | `#script` `#guard` `#ship` `#receipt` `#release-class` `#gate` |
| [check-fleet-staleness.js](../global-configs/scripts/check-fleet-staleness.js) | Script | Global | ~250 (run it; read it only to change it) | `#script` `#fleet` `#staleness` `#report-only` `#delivery` |
| [sync-global-skills.js](../global-configs/scripts/sync-global-skills.js) | Script | Global | ~350 | `#script` `#skills` `#global-pool` `#stack-agnostic` `#marker-scoped` `#delivery` |
| [sync-project-adapters.js](../global-configs/scripts/sync-project-adapters.js) | Script | Global | ~350 | `#script` `#skills` `#adapter` `#stack-scoped` `#marker-scoped` `#delivery` |
| [guard-command.js](../global-configs/scripts/guard-command.js) | Script | Global | ~300 (run it; read it only to change it) | `#script` `#guardrail` `#hook` `#destructive-commands` `#pre-tool-use` |
| [guard-file-access.js](../global-configs/scripts/guard-file-access.js) | Script | Global | ~350 (run it; read it only to change it) | `#script` `#guardrail` `#hook` `#secrets` `#pre-tool-use` `#post-tool-use` |
| [scan-secrets.js](../global-configs/scripts/scan-secrets.js) | Script | Global | ~250 (run it; read it only to change it) | `#script` `#guardrail` `#secrets` `#pre-commit` |
| [install-guardrails.js](../global-configs/scripts/install-guardrails.js) | Script | Global | ~250 | `#script` `#guardrail` `#hook` `#project-setup` `#idempotent` |
| [migrate-agents-to-managed.js](../global-configs/scripts/migrate-agents-to-managed.js) | Script | Global | ~250 | `#script` `#migration` `#agents-md` `#backup` |
| [generate-path-rules.js](../global-configs/scripts/generate-path-rules.js) | Script | Global | ~250 | `#script` `#path-scoped` `#rules` `#cursor` `#claude` `#copilot` `#capabilities` |
| [score-compliance.js](../global-configs/scripts/score-compliance.js) | Script | Global | ~150 | `#script` `#eval` `#compliance` `#scenarios` `#measurement` |
| [scenarios.json](../global-configs/evals/scenarios.json) | Data | Global | ~1,200 | `#eval` `#compliance` `#scenarios` |
| [INDEX.md](../global-configs/skills/INDEX.md) | Generated | Global | ~1,500 | `#skills` `#index` `#triggers` `#generated` `#single-source` |

<!-- GENERATED:index-skills — run `npm run render:index` -->

### Skills — Task-Activated

> **This table is the upstream corpus, not a project's skill set.** A project receives only the
> skills that fit its stack; the authoritative inventory for a project is the `## Skills` block in
> its own `AGENTS.md`, which names every skill it was delivered and the trigger for each. A row
> whose `Applies to` does not cover the project's stack is **not applicable** — skip it rather
> than adapting it.

| File | Status | Scope | Applies to | Tokens | Tags |
|---|---|---|---|---|---|
| [arabic-rtl-pdf-export/SKILL.md](../global-configs/skills/arabic-rtl-pdf-export/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1179 | `#skill` `#pdf` `#rtl` `#arabic` `#chromium` `#print` `#bidi` `#fonts` `#paged-media` |
| [architect/SKILL.md](../global-configs/skills/architect/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1924 | `#skill` `#architecture` `#design` `#stress-test` |
| [bidirectional-docx-rtl/SKILL.md](../global-configs/skills/bidirectional-docx-rtl/SKILL.md) | Advisory | Global (Task-Type Skill) | `docx` | ~1021 | `#skill` `#docx` `#rtl` `#bidirectional` `#arabic` |
| [bilingual-styled-excel-export/SKILL.md](../global-configs/skills/bilingual-styled-excel-export/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1837 | `#skill` `#excel` `#xlsx` `#export` `#rtl` `#arabic` `#bilingual` `#spreadsheet` `#styling` `#workbook` |
| [code-review/SKILL.md](../global-configs/skills/code-review/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1382 | `#skill` `#review` `#quality` |
| [codebase-cleanup/SKILL.md](../global-configs/skills/codebase-cleanup/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~866 | `#skill` `#cleanup` `#dead-code` `#duplication` `#maintenance` |
| [debug-without-code/SKILL.md](../global-configs/skills/debug-without-code/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1398 | `#skill` `#debugging` `#noncoder` `#visual` |
| [deploy-production/SKILL.md](../global-configs/skills/deploy-production/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1959 | `#skill` `#deploy` `#production` `#hosting` |
| [docx-per-paragraph-language/SKILL.md](../global-configs/skills/docx-per-paragraph-language/SKILL.md) | Advisory | Global (Task-Type Skill) | `docx` | ~1107 | `#skill` `#docx` `#language` `#paragraph` `#spell-check` |
| [electron-auto-update/SKILL.md](../global-configs/skills/electron-auto-update/SKILL.md) | Advisory | Global (Task-Type Skill) | `electron` | ~1518 | `#skill` `#electron` `#auto-update` `#release` `#github-releases` `#code-signing` |
| [firebase-emulator-windows-console/SKILL.md](../global-configs/skills/firebase-emulator-windows-console/SKILL.md) | Advisory | Global (Task-Type Skill) | `firebase` | ~927 | `#skill` `#firebase` `#emulator` `#windows` `#testing` `#java` `#node` `#console` |
| [firebase-firestore-practices/SKILL.md](../global-configs/skills/firebase-firestore-practices/SKILL.md) | Advisory | Global (Task-Type Skill) | `firebase` `firestore` | ~1709 | `#skill` `#firebase` `#firestore` `#rules` `#practices` |
| [firestore-cost-optimization/SKILL.md](../global-configs/skills/firestore-cost-optimization/SKILL.md) | Advisory | Global (Task-Type Skill) | `firebase` `firestore` | ~1685 | `#skill` `#firestore` `#firebase` `#cost` `#quota` |
| [first-project-setup/SKILL.md](../global-configs/skills/first-project-setup/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1485 | `#skill` `#setup` `#beginner` `#onboarding` |
| [implementation-plan/SKILL.md](../global-configs/skills/implementation-plan/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1160 | `#skill` `#planning` `#execution` `#checklist` |
| [inno-setup/SKILL.md](../global-configs/skills/inno-setup/SKILL.md) | Advisory | Global (Task-Type Skill) | `inno-setup` | ~1625 | `#skill` `#inno-setup` `#installer` `#windows` |
| [mui-design-system/SKILL.md](../global-configs/skills/mui-design-system/SKILL.md) | Advisory | Global (Task-Type Skill) | `mui` | ~2442 | `#skill` `#mui` `#design-system` `#shared-components` |
| [outlook-integration/SKILL.md](../global-configs/skills/outlook-integration/SKILL.md) | Advisory | Global (Task-Type Skill) | `electron` | ~1838 | `#skill` `#electron` `#outlook` `#microsoft-graph` `#com-automation` `#powershell` `#email` `#calendar` |
| [performance-audit/SKILL.md](../global-configs/skills/performance-audit/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1286 | `#skill` `#performance` `#optimization` |
| [refactoring/SKILL.md](../global-configs/skills/refactoring/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~988 | `#skill` `#refactoring` `#maintenance` |
| [rtl-shadcn-setup/SKILL.md](../global-configs/skills/rtl-shadcn-setup/SKILL.md) | Advisory | Global (Task-Type Skill) | `shadcn` `tailwind` | ~2192 | `#skill` `#rtl` `#shadcn` `#tailwind` `#setup` `#arabic` |
| [security-audit/SKILL.md](../global-configs/skills/security-audit/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1370 | `#skill` `#security` `#owasp` |
| [shadcn-design-system/SKILL.md](../global-configs/skills/shadcn-design-system/SKILL.md) | Advisory | Global (Task-Type Skill) | `shadcn` | ~1555 | `#skill` `#shadcn` `#design-system` `#shared-components` |
| [test-generation/SKILL.md](../global-configs/skills/test-generation/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1038 | `#skill` `#testing` `#generation` |
| [tiptap-tailwind-reset/SKILL.md](../global-configs/skills/tiptap-tailwind-reset/SKILL.md) | Advisory | Global (Task-Type Skill) | `tailwind` `tiptap` | ~1899 | `#skill` `#tiptap` `#tailwind` `#rich-text` `#css` |
| [unsaved-changes-protection/SKILL.md](../global-configs/skills/unsaved-changes-protection/SKILL.md) | Advisory | Global (Task-Type Skill) | — *stack-agnostic* | ~1378 | `#skill` `#forms` `#ux` `#dirty-state` |

<!-- /GENERATED -->

### Scripts & Sync Tools

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| `sync-manager.ps1` — central repo root, **not mirrored** (named, never linked: a `../../` path escapes `_guidelines/` in every downstream project) | Script | Global | ~1,200 | `#script` `#sync` `#gui` `#project-setup` |
| [sync-manifest.json](../global-configs/sync-manifest.json) | Config | Global | ~300 | `#config` `#sync` `#manifest` |

### Tool Config Templates

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [opencode.json.template](../global-configs/templates/opencode.json.template) | Template | Global | ~50 | `#template` `#opencode` `#tool-config` |
| [kilo.jsonc.template](../global-configs/templates/kilo.jsonc.template) | Template | Global | ~30 | `#template` `#kilo` `#tool-config` |
| [GEMINI.md.template](../global-configs/templates/GEMINI.md.template) | Template | Global | ~50 | `#template` `#gemini` `#tool-config` |
| [vscode-settings.json.template](../global-configs/templates/vscode-settings.json.template) | Template | Global | ~150 | `#template` `#vscode` `#tool-config` |
| [cursor-global-guidelines.mdc.template](../global-configs/templates/cursor-global-guidelines.mdc.template) | Template | Global | ~80 | `#template` `#cursor` `#tool-config` |
| [windsurf-global-guidelines.md.template](../global-configs/templates/windsurf-global-guidelines.md.template) | Template | Global | ~80 | `#template` `#windsurf` `#tool-config` |
| [trae-global-guidelines.md.template](../global-configs/templates/trae-global-guidelines.md.template) | Template | Global | ~80 | `#template` `#trae` `#tool-config` |
| [qoder-global-guidelines.md.template](../global-configs/templates/qoder-global-guidelines.md.template) | Template | Global | ~80 | `#template` `#qoder` `#tool-config` |

---

## Task-Type → Recommended Files

| Task Type | Primary Files | Secondary Files |
|---|---|---|
| **React feature development** | react-architecture, react-performance, testing-patterns | form-patterns, error-handling-philosophy, ux-design-principles |
| **Backend API development** | backend-architecture, nestjs-architecture, api-design-standards | supabase-database, error-handling-philosophy |
| **Database design** | database-architecture, supabase-database, supabase-auth | api-design-standards |
| **E2E testing** | testing-philosophy, testing-patterns, playwright-e2e | accessibility-standards |
| **Project planning** | planning-and-scoping, development-workflow | frontend-architecture, backend-architecture, bidirectional-design-principles |
| **Implementation planning** | implementation-plan/SKILL.md, planning-and-scoping | development-workflow, ai-governance-framework |
| **Architecture design & review** | architect/SKILL.md, frontend-architecture, backend-architecture | database-architecture, state-management, api-design-standards |
| **Bug fixing** | debugging-with-ai, error-handling-philosophy, agent-verification-loop | testing-patterns, ai-code-documentation |
| **Any feature completion** | agent-verification-loop | testing-patterns |
| **Writing or reviewing code comments** | ai-code-documentation | testing-philosophy, documentation-strategy |
| **Docs / steering update** | documentation-strategy, ai-code-documentation | agent-verification-loop, ai-governance-framework |
| **Workflow friction / slow agent loop** | workflow-friction-audit, context-management-strategy | local-ci-strategy, documentation-strategy, cost-optimization-strategy |
| **File upload implementation** | file-upload-security, security-engineering | error-handling-philosophy, api-design-standards |
| **Router / navigation setup** | router-architecture, frontend-architecture | react-architecture |
| **Code duplication / deduplication** | code-duplication-prevention, testing-patterns | ai-collaboration-mindset |
| **CI/CD setup** | local-ci-strategy, ci-cd-philosophy, git-workflow-strategy, environment-management | workflow-friction-audit |
| **Code review** | code-review-workflow, ai-security-governance | testing-philosophy, ux-design-principles |
| **Refactoring** | refactoring-strategy, testing-philosophy | performance-optimization, visual-design-principles |
| **RTL/i18n support** | rtl-tech-stack, bidirectional-design-principles, accessibility-standards | frontend-architecture, mui-rtl-bidirectional only when MUI is selected, shadcn-rtl-bidirectional only when shadcn/ui is selected |
| **Performance optimization** | performance-optimization, react-performance | testing-patterns |
| **Form-heavy UI** | form-patterns, react-architecture, ux-design-principles | notification-patterns, dialog-patterns |
| **Security audit** | security-engineering, ai-security-governance | error-handling-philosophy |
| **Firestore cost optimization** | firestore-cost-optimization (skill), cost-optimization-strategy | performance-optimization (conflict: cost wins) |
| **Firebase/Firestore development** | firebase-firestore-practices (skill), security-engineering | firestore-cost-optimization (skill), testing-philosophy |
| **AI governance setup** | ai-governance-framework | design-system-governance |
| **New project bootstrap** | planning-and-scoping, speed-tiered-workflow, frontend-architecture, backend-architecture, git-workflow-strategy, bidirectional-design-principles, design-system-governance | monorepo-strategy, environment-management |
| **Choose speed mode / scale ceremony** | speed-tiered-workflow | development-workflow, testing-philosophy, agent-verification-loop, documentation-strategy |
| **Milestone / ship prep** | speed-tiered-workflow, agent-verification-loop | testing-philosophy, local-ci-strategy |
| **Rules file setup** | AGENTS.starter.md, ai-governance-framework | — |
| **Skill installation** | code-review (skill), test-generation (skill), refactoring (skill) | security-audit (skill), performance-audit (skill) |
| **Windows installer** | inno-setup (skill) | security-engineering, cost-optimization-strategy |
| **Electron auto-update / desktop release** | electron-auto-update (skill), ci-cd-philosophy, security-engineering | electron-auto-update, environment-management, cost-optimization-strategy, error-handling-philosophy |
| **Production deployment** | deploy-production (skill), git-workflow-strategy | ci-cd-philosophy, local-ci-strategy, environment-management |
| **First project setup** | first-project-setup (skill) | planning-and-scoping, git-workflow-strategy, design-system-governance |
| **Cost optimization** | cost-optimization-strategy, context-management-strategy | — |
| **RTL/Arabic setup** | rtl-tech-stack, bidirectional-design-principles, accessibility-standards | mui-rtl-bidirectional only when MUI is selected; shadcn-rtl-bidirectional only when shadcn/ui is selected |
| **Arabic PDF export / print** | arabic-rtl-pdf-generation, rtl-tech-stack | bidirectional-design-principles, accessibility-standards, testing-patterns |
| **Multi-tool setup** | multi-tool-workflows, ai-agent-orchestration | — |
| **UI/UX design review** | ux-design-principles, visual-design-principles, icon-usage | accessibility-standards, bidirectional-design-principles, design-system-governance |
| **Design system setup** | design-system-governance, visual-design-principles, icon-usage | frontend-architecture, bidirectional-design-principles |

---

## Document Lifecycle States

| State | Meaning | AI Behavior |
|---|---|---|
| **Normative** | Binding guidance — must be followed | Load and enforce strictly |
| **Advisory** | Recommended patterns — adapt as needed | Load for reference, override with project-specific rules |
| **Archived** | Retained for historical reference only | Do not load unless explicitly requested |

---

## Cross-Reference Graph

Derived from each file's `## Cross-References` footer. A file with no footer renders as
`no cross-references` — add one to the file, not to this index.

<!-- GENERATED:index-graph — run `npm run render:index` -->

### 00-ai-fundamentals
- `ai-agent-orchestration.md` → see also: `context-management-strategy.md`, `prompt-engineering-patterns.md`, `ai-governance-framework.md`
- `ai-collaboration-mindset.md` → see also: `speed-tiered-workflow.md`, `prompt-engineering-patterns.md`, `context-management-strategy.md`, `ai-agent-orchestration.md`, `ai-security-governance.md`
- `ai-security-governance.md` → depends on: `ai-collaboration-mindset.md` · applied by: `ai-agent-orchestration.md` · extended by: `security-engineering.md`, `ai-governance-framework.md`
- `context-management-strategy.md` → see also: `ai-collaboration-mindset.md`, `prompt-engineering-patterns.md`, `documentation-strategy.md`, `workflow-friction-audit.md`
- `multi-tool-workflows.md` → see also: `ai-agent-orchestration.md`, `context-management-strategy.md`, `cost-optimization-strategy.md`
- `prompt-engineering-patterns.md` → see also: `ai-collaboration-mindset.md`, `context-management-strategy.md`, `development-workflow.md`, `ai-agent-orchestration.md`

### 01-workflow-methodology
- `code-review-workflow.md` → depends on: `development-workflow.md`, `security-engineering.md`, `testing-philosophy.md` · applied by: `agent-verification-loop.md`, `speed-tiered-workflow.md`
- `debugging-with-ai.md` → see also: `development-workflow.md`, `error-handling-philosophy.md`, `agent-verification-loop.md`
- `development-workflow.md` → see also: `speed-tiered-workflow.md`, `planning-and-scoping.md`, `testing-patterns.md`, `code-review-workflow.md`, `refactoring-strategy.md`, `debugging-with-ai.md`, `ai-collaboration-mindset.md`
- `planning-and-scoping.md` → see also: `development-workflow.md`, `ai-collaboration-mindset.md`, `frontend-architecture.md`, `backend-architecture.md`
- `refactoring-strategy.md` → see also: `development-workflow.md`, `testing-patterns.md`, `file-organization.md`, `code-duplication-prevention.md`
- `speed-tiered-workflow.md` → depends on: `development-workflow.md`, `documentation-strategy.md`, `context-management-strategy.md` · extended by: `testing-philosophy.md`, `agent-verification-loop.md` · applied by: `workflow-friction-audit.md`, `local-ci-strategy.md`, `ai-collaboration-mindset.md`
- `workflow-friction-audit.md` → depends on: `development-workflow.md`, `speed-tiered-workflow.md`, `context-management-strategy.md` · extended by: `documentation-strategy.md`, `local-ci-strategy.md`

### 02-engineering-practices
- `accessibility-standards.md` → see also: `icon-usage.md`, `form-patterns.md`, `playwright-e2e.md`
- `agent-verification-loop.md` → depends on: `speed-tiered-workflow.md`, `testing-patterns.md`, `local-ci-strategy.md` · applied by: `debugging-with-ai.md`, `AGENTS.starter.md`
- `ai-code-documentation.md` → see also: `documentation-strategy.md`, `ai-collaboration-mindset.md`, `typescript-conventions.md`, `context-management-strategy.md`
- `bidirectional-design-principles.md` → depends on: `rtl-tech-stack.md`, `accessibility-standards.md` · extended by: `mui-rtl-bidirectional.md`, `shadcn-rtl-bidirectional.md`
- `code-duplication-prevention.md` → governed by: `file-organization.md` · applied by: `ai-collaboration-mindset.md`
- `cost-optimization-strategy.md` → see also: `context-management-strategy.md`, `multi-tool-workflows.md`, `local-ci-strategy.md`
- `error-handling-philosophy.md` → depends on: `api-design-standards.md` · applied by: `ai-security-governance.md`, `debugging-with-ai.md`, `security-engineering.md`
- `file-organization.md` → see also: `frontend-architecture.md`
- `file-upload-security.md` → depends on: `security-engineering.md`, `error-handling-philosophy.md` · applied by: `api-design-standards.md`
- `performance-optimization.md` → see also: `react-performance.md`, `testing-patterns.md`
- `security-engineering.md` → depends on: `ai-security-governance.md`, `error-handling-philosophy.md` · applied by: `code-review-workflow.md`, `api-design-standards.md`
- `testing-patterns.md` → see also: `testing-philosophy.md`, `agent-verification-loop.md`, `playwright-e2e.md`
- `testing-philosophy.md` → see also: `speed-tiered-workflow.md`, `testing-patterns.md`, `agent-verification-loop.md`, `refactoring-strategy.md`
- `ux-design-principles.md` → depends on: `accessibility-standards.md` · extended by: `frontend-architecture.md`, `bidirectional-design-principles.md` · applied by: `form-patterns.md`, `dialog-patterns.md`, `notification-patterns.md`, `loading-and-empty-states.md`, `error-handling-philosophy.md` · governed by: `design-system-governance.md`

### 03-git-and-ci
- `ci-cd-philosophy.md` → see also: `git-workflow-strategy.md`, `environment-management.md`, `testing-philosophy.md`, `local-ci-strategy.md`
- `environment-management.md` → see also: `git-workflow-strategy.md`, `ci-cd-philosophy.md`, `security-engineering.md`, `local-ci-strategy.md`
- `git-workflow-strategy.md` → see also: `ci-cd-philosophy.md`, `environment-management.md`, `development-workflow.md`, `local-ci-strategy.md`
- `local-ci-strategy.md` → see also: `ci-cd-philosophy.md`, `git-workflow-strategy.md`, `environment-management.md`, `cost-optimization-strategy.md`, `documentation-strategy.md`, `workflow-friction-audit.md`

### 04-architecture
- `api-design-standards.md` → see also: `backend-architecture.md`, `error-handling-philosophy.md`, `frontend-architecture.md`
- `backend-architecture.md` → see also: `api-design-standards.md`, `database-architecture.md`, `nestjs-architecture.md`, `error-handling-philosophy.md`
- `database-architecture.md` → see also: `backend-architecture.md`, `supabase-database.md`, `api-design-standards.md`
- `frontend-architecture.md` → see also: `state-management.md`, `file-organization.md`, `react-architecture.md`, `design-system-governance.md`, `api-design-standards.md`
- `monorepo-strategy.md` → see also: `frontend-architecture.md`, `backend-architecture.md`
- `router-architecture.md` → governed by: `frontend-architecture.md` · extended by: `react-architecture.md`
- `state-management.md` → see also: `frontend-architecture.md`, `react-architecture.md`, `form-patterns.md`

### 05-stack-guides
- `arabic-rtl-pdf-generation.md` → depends on: `rtl-tech-stack.md`, `bidirectional-design-principles.md` · see also: `accessibility-standards.md`, `security-engineering.md`, `testing-patterns.md`, `performance-optimization.md`
- `electron-auto-update.md` → depends on: `security-engineering.md`, `ci-cd-philosophy.md` · applied by: `environment-management.md` · see also: `cost-optimization-strategy.md`, `bidirectional-design-principles.md`, `documentation-strategy.md`
- `outlook-integration.md` → depends on: `electron-auto-update.md`, `security-engineering.md`, `file-upload-security.md`, `rtl-tech-stack.md`, `bidirectional-design-principles.md` · applied by: `error-handling-philosophy.md` · see also: `testing-patterns.md`, `agent-verification-loop.md`, `typescript-conventions.md`, `adr-template.md`, `environment-management.md`
- `mui-rtl-bidirectional.md` → see also: `mui-styling.md`, `react-architecture.md`, `accessibility-standards.md`, `playwright-e2e.md`
- `mui-styling.md` → see also: `mui-rtl-bidirectional.md`, `design-system-governance.md`, `react-architecture.md`, `accessibility-standards.md`
- `nestjs-architecture.md` → see also: `typescript-conventions.md`, `backend-architecture.md`, `api-design-standards.md`, `supabase-database.md`
- `playwright-e2e.md` → see also: `mui-rtl-bidirectional.md`, `testing-patterns.md`, `accessibility-standards.md`
- `react-architecture.md` → extended by: `react-performance.md`, `react-testing.md` · depends on: `frontend-architecture.md`, `state-management.md`
- `react-performance.md` → depends on: `react-architecture.md`, `performance-optimization.md`
- `react-testing.md` → see also: `testing-patterns.md`, `testing-philosophy.md`, `playwright-e2e.md`
- `rtl-tech-stack.md` → extended by: `mui-rtl-bidirectional.md`, `shadcn-rtl-bidirectional.md`, `arabic-rtl-pdf-generation.md` · depends on: `accessibility-standards.md` · governed by: `bidirectional-design-principles.md`
- `shadcn-rtl-bidirectional.md` → depends on: `rtl-tech-stack.md`, `accessibility-standards.md` · extended by: `mui-rtl-bidirectional.md` · applied by: `playwright-e2e.md`, `frontend-architecture.md`, `responsive-design.md`
- `supabase-auth.md` → see also: `supabase-database.md`, `nestjs-architecture.md`, `security-engineering.md`
- `supabase-database.md` → see also: `supabase-auth.md`, `database-architecture.md`, `nestjs-architecture.md`, `security-engineering.md`
- `typescript-conventions.md` → see also: `nestjs-architecture.md`, `react-architecture.md`, `api-design-standards.md`
- `vite-configuration.md` → see also: `mui-rtl-bidirectional.md`, `react-performance.md`

### 06-frontend-patterns
- `dialog-patterns.md` → see also: `form-patterns.md`, `notification-patterns.md`, `accessibility-standards.md`
- `form-patterns.md` → see also: `react-architecture.md`, `typescript-conventions.md`, `error-handling-philosophy.md`, `accessibility-standards.md`, `notification-patterns.md`
- `icon-usage.md` → see also: `bidirectional-design-principles.md`, `accessibility-standards.md`, `design-system-governance.md`, `rtl-tech-stack.md`
- `loading-and-empty-states.md` → see also: `table-patterns.md`, `form-patterns.md`, `error-handling-philosophy.md`
- `notification-patterns.md` → see also: `form-patterns.md`, `error-handling-philosophy.md`, `dialog-patterns.md`
- `responsive-design.md` → see also: `mui-styling.md`, `accessibility-standards.md`, `table-patterns.md`
- `table-patterns.md` → see also: `form-patterns.md`, `loading-and-empty-states.md`, `notification-patterns.md`, `api-design-standards.md`
- `visual-design-principles.md` → depends on: `accessibility-standards.md`, `bidirectional-design-principles.md` · governed by: `design-system-governance.md` · extended by: `responsive-design.md`

### 07-documentation
- `adr-template.md` → see also: `documentation-strategy.md`
- `documentation-strategy.md` → depends on: `speed-tiered-workflow.md`, `context-management-strategy.md` · extended by: `workflow-friction-audit.md` · applied by: `local-ci-strategy.md` · supersedes: `LEAN_OPERATING_MODEL_DECISION_2026-10-27.md`

### 08-governance
- `ai-governance-framework.md` → see also: `ai-security-governance.md`, `planning-and-scoping.md`
- `design-system-governance.md` → see also: `frontend-architecture.md`, `ux-design-principles.md`, `mui-styling.md`

<!-- /GENERATED -->

### global-configs

Hand-written: these artifacts carry no `## Cross-References` footer.

- All starter templates → extracted from: `00-08` guideline categories
- All skill files → depend on: the skill's own Load Guidelines section
- `audit-rules.js` → implements the extraction methodology (see docs/repo-meta/)
- `sync-guidelines.ps1` → depends on: `GuidelineSync.psm1`
- `sync-all.js` → depends on: `sync-guidelines.ps1`, `sync-projects.json`
- `setup-global-references.ps1` → depends on: `opencode.json.template`
- `GuidelineSync.psm1` → depends on: `sync-manifest.json`
- All tool config templates → copied into project or tool config directories by `sync-guidelines.ps1` and `sync-manager.ps1`
