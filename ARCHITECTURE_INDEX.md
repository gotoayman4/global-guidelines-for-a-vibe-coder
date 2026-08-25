# ARCHITECTURE_INDEX.md — Document Navigation Index

**Purpose:** Single entry point for finding key structural, technical, and reference documents in this guidelines repository.

---

## Quick Links

| Document | Location | Content |
|---|---|---|
| **Project Constitution** | `AGENTS.md` | Non-negotiable rules for AI agents |
| **Product Intent Guardrail** | `WORLD.md` | What this repo is / is NOT |
| **Master Index** | `_index/MASTER_INDEX.md` | Complete file registry with descriptions |
| **Retrieval Rules** | `_index/RETRIEVAL_RULES.md` | Loading strategies for AI agents |
| **Glossary** | `_index/GLOSSARY.md` | Terminology reference |
| **CLAUDE.md** | `CLAUDE.md` | Claude Code instructions |
| **Dev Tools Reference** | `DEVTOOLS.md` | AI tool config directory inventory |
| **README** | `README.md` | Project overview and quick start |

## Domain Directories

| Directory | Content |
|---|---|
| `guidelines/00-ai-fundamentals/` | AI mindset, setup, beginner guide, prompt engineering |
| `guidelines/01-workflow-methodology/` | Planning, debugging, refactoring |
| `guidelines/02-engineering-practices/` | UX, accessibility, testing, security, performance |
| `guidelines/03-git-and-ci/` | Git workflow, CI templates, environment management |
| `guidelines/04-architecture/` | Patterns, ADRs, state management, API design |
| `guidelines/05-stack-guides/` | React, MUI, shadcn, RTL, NestJS, Supabase |
| `guidelines/06-frontend-patterns/` | Shared components, page patterns, visual design |
| `guidelines/07-documentation/` | Writing standards, changelog |
| `guidelines/08-governance/` | AI governance, design system governance, classification |

## Global Configs

| Location | Purpose |
|---|---|
| `guidelines/global-configs/templates/` | Starter files (16 templates for AGENTS, WORLD, CLAUDE, etc.) |
| `guidelines/global-configs/skills/` | .skill.md files (18 specialized AI skills) |
| `guidelines/global-configs/scripts/` | Sync tooling and validation scripts |

## Sync Tooling

| File | Purpose |
|---|---|
| `sync-manager.ps1` | GUI tool for syncing guidelines to projects |
| `sync-manager.cmd` | Batch launcher for sync-manager.ps1 |
| `sync-projects.json` | Saved project list (gitignored) |
| `opencode.json` | Generated per-project tool config (gitignored) |

## How to Change Something Safely

- **Adding a new guideline:** Create file → register in MASTER_INDEX.md → add cross-references → optionally create/update starter template
- **Updating a guideline:** Edit file → update matching starter template → update MASTER_INDEX summary if needed → run `npm run validate`
- **Adding a skill:** Create `.skill.md` → register in MASTER_INDEX.md → link in relevant templates
- **Changing templates:** Update template → verify `sync-manager.ps1` fallback manifest matches → run validation

## Maintenance

Update this index whenever:
- A new domain directory is added
- Major structural changes occur
- New tooling is introduced
