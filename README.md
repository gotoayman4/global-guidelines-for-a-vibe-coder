# Global Guidelines for Vibe Coders

Centralized development guidelines + sync tools for AI-assisted coding projects. Domain-specific rules for architecture, frontend, accessibility, RTL, testing, security, git, and workflow methodology.

## Structure

```
guidelines/
  _index/            — MASTER_INDEX.md, RETRIEVAL_RULES.md, GLOSSARY.md, AGENT_BOOT_PROTOCOL.md
  00-ai-fundamentals/   — mindset, setup, beginner guide
  01-workflow-methodology/ — planning, speed modes, debugging, refactoring
  02-engineering-practices/ — UX, accessibility, testing, security
  03-git-and-ci/         — git workflow, CI templates
  04-architecture/      — patterns, decision records
  05-stack-guides/      — React, MUI, shadcn, RTL, NestJS, Supabase
  06-frontend-patterns/ — shared components, page patterns
  07-documentation/     — writing standards, changelog
  08-governance/        — AI governance, design system governance, classification
  global-configs/
    templates/   — starter files for AGENTS.md, WORLD.md, tool configs
    fragments/   — single-source rule sections; rendered into templates/AGENTS.starter.md
    scripts/     — setup-global-references.ps1, sync-guidelines.ps1, audit-rules.js, render-agents-starter.js, check-project-freshness.js, new-guideline.js, new-project.js, bump-freshness.js
    skills/      — .skill.md files for code-review, refactoring, security-audit, etc.
sync-manager.cmd / sync-manager.ps1  — WinForms GUI: one-click project sync
.github/workflows/       — optional cloud workflows (CI is local by default — see 03-git-and-ci/local-ci-strategy.md)
```

## Quick Start

**Per-machine (once):**
```
powershell -File guidelines\global-configs\scripts\setup-global-references.ps1
git config core.hooksPath .githooks   # enable the local CI pre-push gate (runs npm run validate)
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

## Commands

| Command | What it does |
|---|---|
| `npm run validate` | Full integrity gate: audit + check-links + check-index + check-drift. Runs on every push (local pre-push hook). |
| `npm run audit` | Verifies extracted rules in starter templates still match their source guideline files. |
| `npm run check-links` | Checks internal links across all `.md` files. |
| `npm run check-index` | Verifies every file is registered in `guidelines/_index/MASTER_INDEX.md`. |
| `npm run render:starters` | Regenerates `templates/AGENTS.starter.md` from `global-configs/fragments/`. |
| `npm run check-drift` | Fails if `AGENTS.starter.md` was hand-edited or exceeds its token budget. |
| `npm run status:projects` | Reports which rules each synced project's `AGENTS.md` is missing (informational, never fails). |
| `npm run sync:all` | Batch-syncs every project in `sync-projects.json` via `sync-guidelines.ps1` (non-interactive; updates `lastSynced`; exits 1 if any fail). |
| `npm run validate:fast` | Quick integrity pass (audit + check-index + check-drift; skips full link crawl). |
| `npm run test:scripts` | Runs the Node test suite for `global-configs/scripts` helpers. |
| `npm run new:guideline` | Scaffolds a guideline file + MASTER_INDEX row (use `-- --dry-run` first). |
| `npm run new:project` | Bootstraps starter files into a project path (`-- <path> [--mode vibe\|standard\|guarded]`). |
| `npm run bump:freshness` | Refreshes `Last Updated:` headers (`-- --check` to report staleness only). |

## Speed Modes

Projects declare a process mode in `WORLD.md` (`vibe | standard | guarded`) — see
`guidelines/01-workflow-methodology/speed-tiered-workflow.md`. Default is `vibe` until the
first ship; when WORLD.md is silent, assume `standard`. Modes scale plan/test/docs ceremony
only — security, honesty, and the ship-boundary gate apply in every mode.

## The Single-Source Pipeline (how the rules are maintained)

One rule lives in exactly one place, and everything else is generated or synced from it.
Read this section before editing any rule — it exists so that drift between copies is
mechanically impossible, and so that you don't have to remember how it works.

**1. Rule text lives in fragments.** Each `##` section of the project constitution lives in
`guidelines/global-configs/fragments/<section>.md`, one rule per `- **Title.** body` bullet
with a `→ Source:` link to the guideline it came from. Section order and the token budget
are defined in `fragments/manifest.json`.

**2. The starter template is generated output.** `templates/AGENTS.starter.md` is produced by
`npm run render:starters` — NEVER hand-edit it. `npm run check-drift` (part of `validate`)
fails if the template and the fragments diverge.

**3. Changing a rule:**
```
edit the fragment  →  npm run render:starters  →  npm run validate  →  commit fragment + template together
```

**4. Adding a rule costs budget.** The always-loaded constitution is capped (~5,000 tokens,
estimated at chars/4 — see `maxTokens` in `fragments/manifest.json`). A new rule must retire,
narrow, or demote an existing one; detail that isn't needed every session belongs in a
guideline file under `guidelines/0X-*`, reached via the `_guidelines/` mirror, not inlined.

**5. Downstream projects own their copy.** `sync-manager` creates a project's `AGENTS.md`
once (create-if-missing) and never overwrites it — the project may have filled `[FILL]`
placeholders or removed non-applicable rules. Over time projects fall behind the central
constitution. Run `npm run status:projects` to see exactly which sections and rules each
project is missing, then review/refresh via `sync-manager.cmd`.

**6. Lessons flow back up.** Downstream agents write lessons-learned as proposals in
`<project-root>/guidelines-proposals/YYYY-MM-DD-<slug>.md` (kept outside `_guidelines/`
so mirror re-syncs can't wipe them). Review them at sync time; promote accepted lessons
into the central guideline + fragment. This is the only path a project lesson has to
become a global rule.

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

Covered by `npm run validate` — see the Commands table above. All four checks run on
every push via the local pre-push hook (`git config core.hooksPath .githooks`).

## How to Change Something Safely

- **Adding a guideline:** `npm run new:guideline` (or create file) → register in `guidelines/_index/MASTER_INDEX.md` → add cross-refs → update matching fragment (and template) if normative
- **Updating a guideline:** edit file → update matching fragment in `global-configs/fragments/` → `npm run render:starters` → run `npm run validate`
- **Adding a skill:** create `.skill.md` → register in MASTER_INDEX.md → verify sync-manifest skills glob picks it up
- **Changing templates:** edit fragments, never the generated `AGENTS.starter.md` → render → validate
