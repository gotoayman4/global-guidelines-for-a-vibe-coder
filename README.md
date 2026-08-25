# Global Guidelines for Vibe Coders

Centralized development guidelines + sync tools for AI-assisted coding projects. Domain-specific rules for architecture, frontend, accessibility, RTL, testing, security, git, and workflow methodology.

## Structure

```
guidelines/
  _index/            — MASTER_INDEX.md, RETRIEVAL_RULES.md, GLOSSARY.md, AGENT_BOOT_PROTOCOL.md
  00-ai-fundamentals/   — mindset, setup, beginner guide
  01-workflow-methodology/ — planning, debugging, refactoring
  02-engineering-practices/ — UX, accessibility, testing, security
  03-git-and-ci/         — git workflow, CI templates
  04-architecture/      — patterns, decision records
  05-stack-guides/      — React, MUI, shadcn, RTL, NestJS, Supabase
  06-frontend-patterns/ — shared components, page patterns
  07-documentation/     — writing standards, changelog
  08-governance/        — AI governance, design system governance, classification
  global-configs/
    templates/   — starter files for AGENTS.md, CLAUDE.md, WORLD.md, etc.
    scripts/     — setup-global-references.ps1, sync-guidelines.ps1, audit-rules.js
    skills/      — .skill.md files for code-review, refactoring, security-audit, etc.
sync-manager.cmd / sync-manager.ps1  — WinForms GUI: one-click project sync
```

## Quick Start

**Per-machine (once):**
```
powershell -File guidelines\global-configs\scripts\setup-global-references.ps1
```
Sets up global AGENTS.md, VS Code AI settings, and symlinks for tools.

**Per-project (every project):**
```
powershell -File sync-manager.cmd
```
GUI tool — browse to project, click Sync. Mirrors `_guidelines/`, installs starter files, tool configs, and skills.

**CLI (mirrors `_guidelines/` + global tool configs only):**
```
powershell -File <path-to-repo>\guidelines\global-configs\scripts\sync-guidelines.ps1
```
> **Note:** The CLI does not install starter files (`AGENTS.md`, `WORLD.md`, etc.) or project skills.
> Use `sync-manager.cmd` (GUI) for a full project setup.

## How It Works

Each project gets a self-contained `_guidelines/` mirror and inline starter files with extracted rules — no external file dependencies. Agents read from the project-local copy, avoiding sandbox/permission issues.

For details, see `guidelines/_index/RETRIEVAL_RULES.md` and `guidelines/_index/MASTER_INDEX.md`.
