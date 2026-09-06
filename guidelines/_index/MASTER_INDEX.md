# Master Index — Global Guidelines for Vibe Coders

**Purpose:** Single source of truth for every guideline document in this knowledge base.
AI agents and humans use this index to discover, load, and navigate the guideline system.

**Last Updated:** 2026-08-26

**Loading note:** Projects that ran `sync-guidelines.ps1` have a `_guidelines/` mirror in their root.
If you see `_guidelines/` in the project, use `_guidelines/_index/MASTER_INDEX.md` and
prefix all file references with `_guidelines/` — these paths are inside the project and
guaranteed to be readable.

```mermaid
flowchart TD
    subgraph "00 — AI Fundamentals (Mindset & Setup)"
        A1[ai-collaboration-mindset.md] --> A3[multi-tool-workflows.md]
        A3 --> A4[multi-tool-workflows.md]
    end

    subgraph "01 — Workflow Methodology"
        B1[planning-and-scoping.md] --> B2[development-workflow.md]
        B2 --> B3[debugging-with-ai.md]
        B2 --> B4[refactoring-strategy.md]
    end

    subgraph "02 — Engineering Practices"
        C1[ux-design-principles.md] --> C2[bidirectional-design-principles.md]
        C2 --> C3[accessibility-standards.md]
        C1 --> C4[testing-philosophy.md]
        C4 --> C5[testing-patterns.md]
        C1 --> C6[security-engineering.md]
    end

    subgraph "05 — Stack Guides"
        D1[rtl-tech-stack.md] --> D2[mui-rtl-bidirectional.md]
        D1 --> D3[shadcn-rtl-bidirectional.md]
        D2 --> D4[react-architecture.md]
        D3 --> D4
    end

    subgraph "08 — Governance"
        E1[ai-governance-framework.md] --> E3[AGENTS.starter.md]
    end

    "00 — AI Fundamentals (Mindset & Setup)" --> "01 — Workflow Methodology"
    "01 — Workflow Methodology" --> "02 — Engineering Practices"
    "02 — Engineering Practices" --> "05 — Stack Guides"
    "05 — Stack Guides" --> "08 — Governance"
```

---

## Index by Category

### 00 — AI Fundamentals

| File | Status | Scope | Tokens (Full) | Tags |
|---|---|---|---|---|
| [ai-collaboration-mindset.md](../00-ai-fundamentals/ai-collaboration-mindset.md) | Normative | Global | ~2,500 | `#mindset` `#philosophy` `#anti-patterns` |
| [prompt-engineering-patterns.md](../00-ai-fundamentals/prompt-engineering-patterns.md) | Normative | Global | ~2,000 | `#prompting` `#templates` `#context` |
| [context-management-strategy.md](../00-ai-fundamentals/context-management-strategy.md) | Normative | Global | ~1,800 | `#context` `#tokens` `#efficiency` |
| [ai-agent-orchestration.md](../00-ai-fundamentals/ai-agent-orchestration.md) | Normative | Global | ~2,200 | `#agents` `#orchestration` `#parallel` |
| [ai-security-governance.md](../00-ai-fundamentals/ai-security-governance.md) | Normative | Global | ~2,000 | `#security` `#governance` `#owasp` |
| [multi-tool-workflows.md](../00-ai-fundamentals/multi-tool-workflows.md) | Normative | Global | ~1,800 | `#multi-tool` `#cursor` `#copilot` `#claude` |

### 01 — Workflow Methodology

| File | Status | Scope | Tokens (Full) | Tags |
|---|---|---|---|---|
| [development-workflow.md](../01-workflow-methodology/development-workflow.md) | Normative | Global | ~2,200 | `#workflow` `#process` `#lifecycle` |
| [planning-and-scoping.md](../01-workflow-methodology/planning-and-scoping.md) | Normative | Global | ~2,000 | `#planning` `#scoping` `#prd` |
| [debugging-with-ai.md](../01-workflow-methodology/debugging-with-ai.md) | Normative | Global | ~1,800 | `#debugging` `#troubleshooting` `#error` |
| [code-review-workflow.md](../01-workflow-methodology/code-review-workflow.md) | Advisory | Global | ~1,500 | `#review` `#quality` `#collaboration` |
| [refactoring-strategy.md](../01-workflow-methodology/refactoring-strategy.md) | Normative | Global | ~1,800 | `#refactoring` `#maintenance` `#technical-debt` |

### 02 — Engineering Practices

| File | Status | Scope | Tokens (Full) | Tags |
|---|---|---|---|---|
| [testing-philosophy.md](../02-engineering-practices/testing-philosophy.md) | Normative | Global | ~2,500 | `#testing` `#philosophy` `#contracts` |
| [testing-patterns.md](../02-engineering-practices/testing-patterns.md) | Normative | Global | ~2,800 | `#testing` `#patterns` `#unit` `#integration` `#e2e` |
| [ai-code-documentation.md](../02-engineering-practices/ai-code-documentation.md) | Normative | Global | ~1,800 | `#documentation` `#comments` `#ai-context` `#icdc` |
| [error-handling-philosophy.md](../02-engineering-practices/error-handling-philosophy.md) | Normative | Global | ~2,000 | `#error` `#contracts` `#recovery` |
| [performance-optimization.md](../02-engineering-practices/performance-optimization.md) | Normative | Global | ~2,200 | `#performance` `#profiling` `#caching` |
| [accessibility-standards.md](../02-engineering-practices/accessibility-standards.md) | Normative | Global | ~1,800 | `#a11y` `#wcag` `#aria` |
| [ux-design-principles.md](../02-engineering-practices/ux-design-principles.md) | Normative | Global | ~2,800 | `#ux` `#heuristics` `#cognition` `#nielsen` |
| [bidirectional-design-principles.md](../02-engineering-practices/bidirectional-design-principles.md) | Normative | Global | ~2,200 | `#rtl` `#bidirectional` `#arabic` `#design` |
| [security-engineering.md](../02-engineering-practices/security-engineering.md) | Normative | Global | ~2,000 | `#security` `#auth` `#xss` `#csp` |
| [file-upload-security.md](../02-engineering-practices/file-upload-security.md) | Normative | Global | ~700 | `#security` `#file-upload` `#mime` `#magic-byte` |
| [agent-verification-loop.md](../02-engineering-practices/agent-verification-loop.md) | Normative | Global | ~900 | `#verification` `#agent` `#testing` `#evidence` `#done-criteria` `#cost-control` |
| [cost-optimization-strategy.md](../02-engineering-practices/cost-optimization-strategy.md) | Normative | Global | ~2,000 | `#cost` `#hosting` `#tokens` `#free-tier` |
| [file-organization.md](../02-engineering-practices/file-organization.md) | Normative | Global | ~1,200 | `#files` `#organization` `#modularity` `#limits` |
| [code-duplication-prevention.md](../02-engineering-practices/code-duplication-prevention.md) | Normative | Global | ~600 | `#deduplication` `#dry` `#code-smells` `#ai` |

### 03 — Git & CI/CD

| File | Status | Scope | Tokens (Full) | Tags |
|---|---|---|---|---|
| [git-workflow-strategy.md](../03-git-and-ci/git-workflow-strategy.md) | Normative | Global | ~1,500 | `#git` `#branching` `#commits` |
| [ci-cd-philosophy.md](../03-git-and-ci/ci-cd-philosophy.md) | Normative | Global | ~1,800 | `#ci-cd` `#pipelines` `#automation` |
| [local-ci-strategy.md](../03-git-and-ci/local-ci-strategy.md) | Normative | Global | ~750 | `#ci-cd` `#local-ci` `#pre-push` `#cost` `#husky` |
| [environment-management.md](../03-git-and-ci/environment-management.md) | Normative | Global | ~1,500 | `#environments` `#secrets` `#config` |

### 04 — Architecture

| File | Status | Scope | Tokens (Full) | Tags |
|---|---|---|---|---|
| [frontend-architecture.md](../04-architecture/frontend-architecture.md) | Normative | Global | ~2,200 | `#frontend` `#spa` `#components` |
| [backend-architecture.md](../04-architecture/backend-architecture.md) | Normative | Global | ~2,200 | `#backend` `#rest` `#services` |
| [database-architecture.md](../04-architecture/database-architecture.md) | Normative | Global | ~2,000 | `#database` `#sql` `#schema` |
| [state-management.md](../04-architecture/state-management.md) | Normative | Global | ~1,800 | `#state` `#caching` `#react` |
| [api-design-standards.md](../04-architecture/api-design-standards.md) | Normative | Global | ~2,000 | `#api` `#rest` `#contracts` |
| [router-architecture.md](../04-architecture/router-architecture.md) | Normative | Global | ~500 | `#router` `#react-router` `#createBrowserRouter` `#useBlocker` |
| [monorepo-strategy.md](../04-architecture/monorepo-strategy.md) | Advisory | Global | ~1,500 | `#monorepo` `#workspace` `#structure` |

### 05 — Stack Guides

| File | Status | Scope | Tokens (Full) | Tags |
|---|---|---|---|---|
| [react-architecture.md](../05-stack-guides/react/react-architecture.md) | Normative | Stack (React) | ~2,500 | `#react` `#hooks` `#components` |
| [react-performance.md](../05-stack-guides/react/react-performance.md) | Normative | Stack (React) | ~2,000 | `#react` `#performance` `#memo` |
| [react-testing.md](../05-stack-guides/react/react-testing.md) | Normative | Stack (React) | ~2,000 | `#react` `#testing` `#rtl` |
| [typescript-conventions.md](../05-stack-guides/typescript/typescript-conventions.md) | Normative | Stack (TypeScript) | ~1,800 | `#typescript` `#types` `#strict` |
| [nestjs-architecture.md](../05-stack-guides/nestjs/nestjs-architecture.md) | Normative | Stack (NestJS) | ~2,000 | `#nestjs` `#backend` `#modules` |
| [supabase-database.md](../05-stack-guides/supabase/supabase-database.md) | Normative | Stack (Supabase) | ~2,600 | `#supabase` `#postgresql` `#rls` `#grants` `#postgrest` |
| [supabase-auth.md](../05-stack-guides/supabase/supabase-auth.md) | Normative | Stack (Supabase) | ~1,600 | `#supabase` `#auth` `#jwt` `#grants` |
| [mui-styling.md](../05-stack-guides/mui/mui-styling.md) | Normative | Stack (MUI) | ~1,800 | `#mui` `#styling` `#theme` |
| [mui-rtl-bidirectional.md](../05-stack-guides/mui/mui-rtl-bidirectional.md) | Normative | Stack (MUI) | ~2,000 | `#mui` `#rtl` `#i18n` `#bidirectional` |
| [shadcn-rtl-bidirectional.md](../05-stack-guides/shadcn/shadcn-rtl-bidirectional.md) | Normative | Stack (shadcn/ui) | ~2,800 | `#shadcn` `#tailwind` `#rtl` `#i18n` `#bidirectional` `#radix` `#base-ui` `#logical-properties` |
| [playwright-e2e.md](../05-stack-guides/playwright/playwright-e2e.md) | Normative | Stack (Playwright) | ~1,800 | `#playwright` `#e2e` `#testing` |
| [vite-configuration.md](../05-stack-guides/vite/vite-configuration.md) | Normative | Stack (Vite) | ~1,200 | `#vite` `#build` `#bundler` |
| [rtl-tech-stack.md](../05-stack-guides/rtl-tech-stack.md) | Normative | Global (RTL) | ~2,000 | `#rtl` `#arabic` `#bidirectional` `#numerals` |

### 06 — Frontend Patterns

| File | Status | Scope | Tokens (Full) | Tags |
|---|---|---|---|---|---|
| [form-patterns.md](../06-frontend-patterns/form-patterns.md) | Normative | Global | ~2,200 | `#forms` `#validation` `#multi-step` |
| [table-patterns.md](../06-frontend-patterns/table-patterns.md) | Normative | Global | ~1,500 | `#tables` `#pagination` `#sorting` |
| [dialog-patterns.md](../06-frontend-patterns/dialog-patterns.md) | Normative | Global | ~1,500 | `#dialogs` `#modals` `#focus` |
| [notification-patterns.md](../06-frontend-patterns/notification-patterns.md) | Normative | Global | ~1,500 | `#notifications` `#toast` `#snackbar` |
| [loading-and-empty-states.md](../06-frontend-patterns/loading-and-empty-states.md) | Advisory | Global | ~1,200 | `#loading` `#empty` `#ux` |
| [responsive-design.md](../06-frontend-patterns/responsive-design.md) | Normative | Global | ~1,500 | `#responsive` `#breakpoints` `#layout` |
| [visual-design-principles.md](../06-frontend-patterns/visual-design-principles.md) | Normative | Global | ~1,800 | `#visual` `#hierarchy` `#color` `#typography` `#depth` |
| [icon-usage.md](../06-frontend-patterns/icon-usage.md) | Normative | Global | ~1,800 | `#icons` `#svg` `#accessibility` `#rtl` `#consistency` |

### 07 — Documentation

| File | Status | Scope | Tokens (Full) | Tags |
|---|---|---|---|---|
| [documentation-strategy.md](../07-documentation/documentation-strategy.md) | Advisory | Global | ~1,500 | `#documentation` `#strategy` `#maintenance` |
| [adr-template.md](../07-documentation/adr-template.md) | Advisory | Global | ~800 | `#adr` `#decisions` `#template` |

### 08 — Governance

| File | Status | Scope | Tokens (Full) | Tags |
|---|---|---|---|---|
| [ai-governance-framework.md](../08-governance/ai-governance-framework.md) | Normative | Global | ~2,000 | `#governance` `#hierarchy` `#authority` |
| [design-system-governance.md](../08-governance/design-system-governance.md) | Normative | Global | ~1,600 | `#design-system` `#tokens` `#components` `#consistency` |

### _index — Repository Navigation

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [MASTER_INDEX.md](MASTER_INDEX.md) | Normative | Global | ~500 | `#index` `#navigation` `#master` |
| [RETRIEVAL_RULES.md](RETRIEVAL_RULES.md) | Normative | Global | ~600 | `#retrieval` `#loading` `#tokens` `#strategy` |
| [GLOSSARY.md](GLOSSARY.md) | Advisory | Global | ~400 | `#glossary` `#terminology` `#reference` |
| [AGENT_BOOT_PROTOCOL.md](AGENT_BOOT_PROTOCOL.md) | Normative | Global | ~500 | `#boot` `#session` `#initialization` `#protocol` |

### Global Configs — Reusable Configuration Artifacts

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [AGENTS.starter.md](../global-configs/templates/AGENTS.starter.md) | Starter | Global | ~6,000 | `#template` `#rules` `#agents` |
| [copilot-instructions.starter.md](../global-configs/templates/copilot-instructions.starter.md) | Starter | Global | ~50 | `#template` `#rules` `#copilot` |
| [WORLD.starter.md](../global-configs/templates/WORLD.starter.md) | Starter | Global | ~1,300 | `#template` `#product-intent` `#guardrail` |
| [WORLD.example.md](../global-configs/templates/WORLD.example.md) | Reference | Global | ~1,200 | `#template` `#product-intent` `#example` |
| [DEVTOOLS.starter.md](../global-configs/templates/DEVTOOLS.starter.md) | Starter | Global | ~600 | `#template` `#devtools` `#gitignore` |
| [ARCHITECTURE_INDEX.starter.md](../global-configs/templates/ARCHITECTURE_INDEX.starter.md) | Starter | Global | ~400 | `#template` `#architecture` `#navigation` `#index` |
| [AI_CONTEXT.starter.md](../global-configs/templates/AI_CONTEXT.starter.md) | Starter | Global | ~800 | `#template` `#ai-context` `#onboarding` |
| [AI_ARCHITECTURE.starter.md](../global-configs/templates/AI_ARCHITECTURE.starter.md) | Starter | Global | ~800 | `#template` `#architecture` `#reference` |
| [code-review.skill.md](../global-configs/skills/code-review.skill.md) | Skill | Global | ~800 | `#skill` `#review` `#quality` |
| [test-generation.skill.md](../global-configs/skills/test-generation.skill.md) | Skill | Global | ~750 | `#skill` `#testing` `#generation` |
| [refactoring.skill.md](../global-configs/skills/refactoring.skill.md) | Skill | Global | ~750 | `#skill` `#refactoring` `#maintenance` |
| [security-audit.skill.md](../global-configs/skills/security-audit.skill.md) | Skill | Global | ~900 | `#skill` `#security` `#owasp` |
| [performance-audit.skill.md](../global-configs/skills/performance-audit.skill.md) | Skill | Global | ~900 | `#skill` `#performance` `#optimization` |
| [first-project-setup.skill.md](../global-configs/skills/first-project-setup.skill.md) | Skill | Global | ~600 | `#skill` `#setup` `#beginner` `#onboarding` |
| [inno-setup.skill.md](../global-configs/skills/inno-setup.skill.md) | Skill | Global | ~700 | `#skill` `#inno-setup` `#installer` `#windows` |
| [deploy-production.skill.md](../global-configs/skills/deploy-production.skill.md) | Skill | Global | ~650 | `#skill` `#deploy` `#production` `#hosting` |
| [debug-without-code.skill.md](../global-configs/skills/debug-without-code.skill.md) | Skill | Global | ~600 | `#skill` `#debugging` `#noncoder` `#visual` |
| [rtl-shadcn-setup.skill.md](../global-configs/skills/rtl-shadcn-setup.skill.md) | Skill | Global | ~800 | `#skill` `#rtl` `#shadcn` `#tailwind` `#setup` `#arabic` |
| [mui-design-system.skill.md](../global-configs/skills/mui-design-system.skill.md) | Skill | Global | ~750 | `#skill` `#mui` `#design-system` `#shared-components` |
| [shadcn-design-system.skill.md](../global-configs/skills/shadcn-design-system.skill.md) | Skill | Global | ~750 | `#skill` `#shadcn` `#design-system` `#shared-components` |
| [unsaved-changes-protection.skill.md](../global-configs/skills/unsaved-changes-protection.skill.md) | Skill | Global | ~750 | `#skill` `#forms` `#ux` `#dirty-state` |
| [implementation-plan.skill.md](../global-configs/skills/implementation-plan.skill.md) | Skill | Global | ~900 | `#skill` `#planning` `#execution` `#checklist` |
| [architect.skill.md](../global-configs/skills/architect.skill.md) | Skill | Global | ~850 | `#skill` `#architecture` `#design` `#stress-test` |
| [tiptap-tailwind-reset.skill.md](../global-configs/skills/tiptap-tailwind-reset.skill.md) | Skill | Global | ~700 | `#skill` `#tiptap` `#tailwind` `#rich-text` `#css` |
| [bidirectional-docx-rtl.skill.md](../global-configs/skills/bidirectional-docx-rtl.skill.md) | Skill | Global | ~900 | `#skill` `#docx` `#rtl` `#bidirectional` `#arabic` |
| [docx-per-paragraph-language.skill.md](../global-configs/skills/docx-per-paragraph-language.skill.md) | Skill | Global | ~1,000 | `#skill` `#docx` `#language` `#paragraph` `#spell-check` |
| [firestore-cost-optimization.skill.md](../global-configs/skills/firestore-cost-optimization.skill.md) | Skill | Global | ~900 | `#skill` `#firestore` `#firebase` `#cost` `#quota` |
| [firebase-firestore-practices.skill.md](../global-configs/skills/firebase-firestore-practices.skill.md) | Skill | Global | ~900 | `#skill` `#firebase` `#firestore` `#rules` `#practices` |
| [audit-rules.js](../global-configs/scripts/audit-rules.js) | Script | Global | ~300 | `#script` `#automation` `#drift-detection` |
| [sync-guidelines.ps1](../global-configs/scripts/sync-guidelines.ps1) | Script | Global | ~1,800 | `#script` `#sync` `#project-setup` |
| [setup-global-references.ps1](../global-configs/scripts/setup-global-references.ps1) | Script | Global | ~1,200 | `#script` `#setup` `#global-config` |
| [GuidelineSync.psm1](../global-configs/scripts/GuidelineSync.psm1) | Script | Global | ~1,400 | `#script` `#module` `#sync` `#shared` |
| [render-agents-starter.js](../global-configs/scripts/render-agents-starter.js) | Script | Global | ~150 | `#script` `#render` `#single-source` `#drift-detection` `#token-budget` |
| [check-project-freshness.js](../global-configs/scripts/check-project-freshness.js) | Script | Global | ~150 | `#script` `#report` `#drift-detection` `#sync` |

### Scripts & Sync Tools

| File | Status | Scope | Tokens | Tags |
|---|---|---|---|---|
| [sync-manager.ps1](../../sync-manager.ps1) | Script | Global | ~1,200 | `#script` `#sync` `#gui` `#project-setup` |
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
| **Implementation planning** | implementation-plan.skill, planning-and-scoping | development-workflow, ai-governance-framework |
| **Architecture design & review** | architect.skill, frontend-architecture, backend-architecture | database-architecture, state-management, api-design-standards |
| **Bug fixing** | debugging-with-ai, error-handling-philosophy, agent-verification-loop | testing-patterns, ai-code-documentation |
| **Any feature completion** | agent-verification-loop | testing-patterns |
| **Writing or reviewing code comments** | ai-code-documentation | testing-philosophy, documentation-strategy |
| **File upload implementation** | file-upload-security, security-engineering | error-handling-philosophy, api-design-standards |
| **Router / navigation setup** | router-architecture, frontend-architecture | react-architecture |
| **Code duplication / deduplication** | code-duplication-prevention, testing-patterns | ai-collaboration-mindset |
| **CI/CD setup** | local-ci-strategy, ci-cd-philosophy, git-workflow-strategy, environment-management | — |
| **Code review** | code-review-workflow, ai-security-governance | testing-philosophy, ux-design-principles |
| **Refactoring** | refactoring-strategy, testing-philosophy | performance-optimization, visual-design-principles |
| **RTL/i18n support** | rtl-tech-stack, bidirectional-design-principles, accessibility-standards | frontend-architecture, mui-rtl-bidirectional only when MUI is selected, shadcn-rtl-bidirectional only when shadcn/ui is selected |
| **Performance optimization** | performance-optimization, react-performance | testing-patterns |
| **Form-heavy UI** | form-patterns, react-architecture, ux-design-principles | notification-patterns, dialog-patterns |
| **Security audit** | security-engineering, ai-security-governance | error-handling-philosophy |
| **Firestore cost optimization** | firestore-cost-optimization.skill.md, cost-optimization-strategy | performance-optimization (conflict: cost wins) |
| **Firebase/Firestore development** | firebase-firestore-practices.skill.md, security-engineering | firestore-cost-optimization.skill.md, testing-philosophy |
| **AI governance setup** | ai-governance-framework | design-system-governance |
| **New project bootstrap** | planning-and-scoping, frontend-architecture, backend-architecture, git-workflow-strategy, bidirectional-design-principles, design-system-governance | monorepo-strategy, environment-management |
| **Rules file setup** | AGENTS.starter.md, ai-governance-framework | — |
| **Skill installation** | code-review.skill.md, test-generation.skill.md, refactoring.skill.md | security-audit.skill.md, performance-audit.skill.md |
| **Windows installer** | inno-setup.skill | security-engineering, cost-optimization-strategy |
| **Production deployment** | deploy-production.skill, git-workflow-strategy | ci-cd-philosophy, local-ci-strategy, environment-management |
| **First project setup** | first-project-setup.skill | planning-and-scoping, git-workflow-strategy, design-system-governance |
| **Cost optimization** | cost-optimization-strategy, context-management-strategy | — |
| **RTL/Arabic setup** | rtl-tech-stack, bidirectional-design-principles, accessibility-standards | mui-rtl-bidirectional only when MUI is selected; shadcn-rtl-bidirectional only when shadcn/ui is selected |
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

### 00-ai-fundamentals
- `ai-collaboration-mindset.md` → depends on: none
- `code-duplication-prevention.md` → depends on: `ai-collaboration-mindset.md`, referenced by: `ai-collaboration-mindset.md`
- `prompt-engineering-patterns.md` → depends on: `ai-collaboration-mindset.md`
- `context-management-strategy.md` → depends on: `ai-collaboration-mindset.md`
- `ai-agent-orchestration.md` → depends on: `context-management-strategy.md`
- `ai-security-governance.md` → depends on: `ai-collaboration-mindset.md`, referenced by: `security-engineering.md`
- `multi-tool-workflows.md` → depends on: `ai-agent-orchestration.md`, `ai-collaboration-mindset.md`

### 01-workflow-methodology
- `development-workflow.md` → depends on: `ai-collaboration-mindset.md`
- `planning-and-scoping.md` → depends on: `development-workflow.md`
- `debugging-with-ai.md` → depends on: `development-workflow.md`, `error-handling-philosophy.md`
- `code-review-workflow.md` → depends on: `development-workflow.md`
- `refactoring-strategy.md` → depends on: `development-workflow.md`, `testing-philosophy.md`

### 02-engineering-practices
- `testing-philosophy.md` → depends on: `ai-collaboration-mindset.md`
- `testing-patterns.md` → depends on: `testing-philosophy.md`
- `error-handling-philosophy.md` → depends on: `api-design-standards.md`; informed by: `ux-design-principles.md`
- `performance-optimization.md` → depends on: none
- `accessibility-standards.md` → depends on: none
- `ux-design-principles.md` → depends on: `accessibility-standards.md`, extended by: `frontend-architecture.md`, `bidirectional-design-principles.md`, `form-patterns.md`, `dialog-patterns.md`, `notification-patterns.md`, `loading-and-empty-states.md`, `error-handling-philosophy.md`
- `bidirectional-design-principles.md` → depends on: `rtl-tech-stack.md`, `accessibility-standards.md`, extended by: `../05-stack-guides/mui/mui-rtl-bidirectional.md`, `../05-stack-guides/shadcn/shadcn-rtl-bidirectional.md`, `visual-design-principles.md`, `ux-design-principles.md`, `frontend-architecture.md`
- `security-engineering.md` → depends on: `ai-security-governance.md`
- `file-upload-security.md` → depends on: `security-engineering.md`, `error-handling-philosophy.md`
- `agent-verification-loop.md` → depends on: `testing-patterns.md`; referenced by: `AGENTS.starter.md`
- `cost-optimization-strategy.md` → depends on: `context-management-strategy.md`, `development-workflow.md`
- `file-organization.md` → depends on: none; referenced by: `implementation-plan.skill.md`

### 04-architecture
- `frontend-architecture.md` → depends on: `state-management.md`; governed by: `design-system-governance.md`
- `backend-architecture.md` → depends on: `api-design-standards.md`, `database-architecture.md`
- `database-architecture.md` → depends on: none
- `state-management.md` → depends on: none
- `api-design-standards.md` → depends on: `error-handling-philosophy.md`
- `router-architecture.md` → depends on: `frontend-architecture.md`
- `monorepo-strategy.md` → depends on: `frontend-architecture.md`, `backend-architecture.md`

### 05-stack-guides
- All stack guides → depend on: corresponding `04-architecture` files
- `react-*` files → cross-reference: `form-patterns.md`, `table-patterns.md`
- `typescript-conventions.md` → cross-reference: `nestjs-architecture.md`, `api-design-standards.md`
- `nestjs-architecture.md` → cross-reference: `supabase-database.md`, `supabase-auth.md`, `backend-architecture.md`
- `supabase-*` files → cross-reference: `database-architecture.md`, `security-engineering.md`
- `mui-styling.md` → cross-reference: `mui-rtl-bidirectional.md`, `accessibility-standards.md`
- `mui-rtl-bidirectional.md` → cross-reference: `accessibility-standards.md`, `playwright-e2e.md`
- `shadcn-rtl-bidirectional.md` → cross-reference: `rtl-tech-stack.md`, `accessibility-standards.md`, `playwright-e2e.md`
- `playwright-e2e.md` → cross-reference: `testing-philosophy.md`, `testing-patterns.md`, `react-testing.md`
- `vite-configuration.md` → cross-reference: `react-architecture.md`, `mui-styling.md`
- `rtl-tech-stack.md` → cross-reference: `../05-stack-guides/mui/mui-rtl-bidirectional.md` when MUI is selected; `../05-stack-guides/shadcn/shadcn-rtl-bidirectional.md` when shadcn/ui is selected; depends on: `accessibility-standards.md`; governed by: `bidirectional-design-principles.md`; extended by: `bidirectional-design-principles.md`

### 06-frontend-patterns
- `form-patterns.md` → depends on: `react-architecture.md`, `typescript-conventions.md`, `ux-design-principles.md`, `error-handling-philosophy.md`
- `table-patterns.md` → cross-reference: `api-design-standards.md`, `loading-and-empty-states.md`
- `dialog-patterns.md` → cross-reference: `form-patterns.md`, `notification-patterns.md`
- `notification-patterns.md` → cross-reference: `error-handling-philosophy.md`, `accessibility-standards.md`
- `loading-and-empty-states.md` → cross-reference: `table-patterns.md`, `react-performance.md`
- `responsive-design.md` → cross-reference: `mui-styling.md`, `mui-rtl-bidirectional.md`, `accessibility-standards.md`
- `visual-design-principles.md` → depends on: `accessibility-standards.md`, `bidirectional-design-principles.md`
- `icon-usage.md` → depends on: `visual-design-principles.md`, `bidirectional-design-principles.md`, `accessibility-standards.md`, `design-system-governance.md`

### 07-documentation
- `documentation-strategy.md` → depends on: none
- `adr-template.md` → depends on: `documentation-strategy.md`

### 08-governance
- `ai-governance-framework.md` → depends on: none
- `design-system-governance.md` → depends on: `frontend-architecture.md`, `bidirectional-design-principles.md`, `ux-design-principles.md`, `visual-design-principles.md`

### global-configs
- All starter templates → extracted from: `00-08` guideline categories
- All skill files → depend on: the skill's own Load Guidelines section
- `audit-rules.js` → implements the extraction methodology (see docs/repo-meta/)
- `sync-guidelines.ps1` → depends on: `GuidelineSync.psm1`
- `setup-global-references.ps1` → depends on: `opencode.json.template`
- `GuidelineSync.psm1` → depends on: `sync-manifest.json`
- All tool config templates → copied into project or tool config directories by `sync-guidelines.ps1` and `sync-manager.ps1`
