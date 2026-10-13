# Global Guidelines — Content Tree

This is the synced content of the **Global Guidelines for Vibe Coders** repository.
Projects that ran `sync-guidelines.ps1` (CLI) or `sync-manager.cmd` (GUI) receive this
entire directory as `_guidelines/` in their project root.

**You are here:** `<repo-root>/guidelines/` in the central repo, or `_guidelines/` in a downstream project.

## Start Here

1. [`_index/MASTER_INDEX.md`](_index/MASTER_INDEX.md) — complete file registry, task-type routing, dependency graph
2. [`_index/AGENT_BOOT_PROTOCOL.md`](_index/AGENT_BOOT_PROTOCOL.md) — session initialization procedure
3. [`_index/RETRIEVAL_RULES.md`](_index/RETRIEVAL_RULES.md) — loading strategies and token budgets
4. [`_index/GLOSSARY.md`](_index/GLOSSARY.md) — terminology reference

## Layout

| Directory | Content |
|---|---|
| `_index/` | Entry points and navigation |
| `00-ai-fundamentals/` | AI mindset, setup, prompt engineering |
| `01-workflow-methodology/` | Planning, debugging, refactoring, workflow-friction audits |
| `02-engineering-practices/` | UX, accessibility, testing, security, performance |
| `03-git-and-ci/` | Git workflow, local CI strategy, CI/CD, environment management |
| `04-architecture/` | Frontend/backend/database/API/state/router patterns |
| `05-stack-guides/` | React, TypeScript, MUI, shadcn, NestJS, Supabase, Playwright, Vite, RTL |
| `06-frontend-patterns/` | Forms, tables, dialogs, notifications, responsive, visual design |
| `07-documentation/` | Documentation strategy, authoring standards, ADR template |
| `08-governance/` | AI governance, rule extraction, classification, design-system governance |
| `global-configs/templates/` | Starter files for AGENTS.md, CLAUDE.md, WORLD.md, tool configs |
| `global-configs/skills/` | `<name>/SKILL.md` skill directories installed to project `_skills/` |
| `global-configs/scripts/` | Sync tooling and validation scripts |

## For AI Agents in Downstream Projects

- **Your project's `AGENTS.md` is the constitution — read it first.** It is self-contained
  and user-owned; the sync tool never overwrites it.
- **Propose, don't hoard.** When you discover a mistake worth never repeating, write it to
  `<project-root>/guidelines-proposals/YYYY-MM-DD-<slug>.md` (what happened, the rule that
  would prevent it, which guideline file it belongs under). Do not keep lessons only in the
  session — this is the path for a project lesson to become a global rule.
- **Template provenance:** `global-configs/templates/AGENTS.starter.md` is generated in the
  central repo from `global-configs/fragments/` (fragments are not mirrored downstream). Never
  hand-edit the template in the central repo; never re-extract rules from it here — your
  project's own `AGENTS.md` is the local truth.

**Note:** In the central repo, validation runs from the repo root via `npm run validate`
(scripts resolve paths relative to `guidelines/global-configs/scripts/`).
