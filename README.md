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
    templates/   — starter files for AGENTS.md, WORLD.md, tool configs
    scripts/     — setup-global-references.ps1, sync-guidelines.ps1, audit-rules.js
    skills/      — .skill.md files for code-review, refactoring, security-audit, etc.
sync-manager.cmd / sync-manager.ps1  — WinForms GUI: one-click project sync
.github/workflows/       — CI validation (audit + links + index on every push/PR)
```

## Quick Start

**Per-machine (once):**
```
powershell -File guidelines\global-configs\scripts\setup-global-references.ps1
```
Sets up global AGENTS.md, VS Code AI settings, and symlinks for tools. Symlinks require an elevated shell (or Windows Developer Mode).

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

## AI Tool Directories & .gitignore Patterns

If an AI tool creates artifact directories in this repo, gitignore them:

```gitignore
.kilocode/
.qoder/
.qodo/
.trae/
.windsurf/
```

Already ignored: `sync-projects.json`, `opencode.json` (machine-specific), `REPO_AUDIT_REPORT_*.md`, `node_modules/`.

## Validation

```bash
npm run validate       # audit + check-links + check-index (CI enforces on main)
```

## How to Change Something Safely

- **Adding a guideline:** create file → register in `guidelines/_index/MASTER_INDEX.md` → add cross-references → update matching starter template if normative
- **Updating a guideline:** edit file → update matching starter template → run `npm run validate`
- **Adding a skill:** create `.skill.md` → register in MASTER_INDEX.md → verify sync-manifest skills glob picks it up
- **Changing templates:** update template → run validation
