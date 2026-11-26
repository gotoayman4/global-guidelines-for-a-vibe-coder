# Global Guidelines for Vibe Coders

Centralized development guidelines + sync tools for AI-assisted coding projects. Domain-specific rules for architecture, frontend, accessibility, RTL, testing, security, git, and workflow methodology.

## Structure

```
guidelines/
  _index/            — MASTER_INDEX.md, RETRIEVAL_RULES.md, GLOSSARY.md, AGENT_BOOT_PROTOCOL.md
  00-ai-fundamentals/   — mindset, context management, prompt patterns
  01-workflow-methodology/ — planning, speed modes, debugging, refactoring
  02-engineering-practices/ — UX, accessibility, testing, security, performance
  03-git-and-ci/         — git workflow, local CI, CI/CD, environment management
  04-architecture/      — frontend/backend/database/API/state/router patterns
  05-stack-guides/      — React, TypeScript, MUI, shadcn, NestJS, Supabase, Playwright, Vite, Electron, RTL
  06-frontend-patterns/ — forms, tables, dialogs, notifications, responsive, visual design
  07-documentation/     — documentation strategy, ADR template
  08-governance/        — AI governance, design system governance
  global-configs/
    templates/   — starter files for AGENTS.md, WORLD.md, README.md, tool configs
    fragments/   — single-source rule sections; rendered into templates/AGENTS.starter.md
    scripts/     — sync writers (GuidelineSync.psm1, sync-guidelines.ps1, sync-all.js), guards
                   (check-*.js, audit-*.js), generators (render-*.js, plan-skills.js,
                   inject-skills-block.js), scaffolders (new-*.js), and
                   setup-global-references.ps1 — run `npm run` with no argument for the full list
    skills/      — one <name>/SKILL.md directory per skill (code-review, refactoring, security-audit, …)
docs/          — repo-meta standards, human-readable guides, and dated decisions/proposals (`docs/decisions/`)
sync-manager.cmd / sync-manager.ps1  — WinForms GUI: one-click project sync
.githooks/     — the local pre-push gate (`git config core.hooksPath .githooks`); no cloud CI
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
.\sync-manager.cmd
```
GUI tool — browse to project, click Sync (or double-click `sync-manager.cmd`, or run `powershell -File sync-manager.ps1`). Mirrors `_guidelines/`, installs starter files, tool configs, and skills.

**CLI (the same setup as the GUI, scriptable):**
```
powershell -File <path-to-repo>\guidelines\global-configs\scripts\sync-guidelines.ps1 -ProjectPath <project>
```
The CLI performs the **same project setup as the GUI** — it mirrors `_guidelines/`, installs the
starter files (`AGENTS.md`, `WORLD.md`, …), installs tool configs and the stack-filtered skills, and
updates the global tool configs. Two switches narrow it; neither is the default:

| Switch | Effect |
|---|---|
| `-SourceOnly` | Skip the **global** tool configs (opencode, Windsurf, Cursor, Qoder, VS Code) — project setup only |
| `-GlobalOnly` | Skip everything **project-local** — the mirror, starter files and skills — and write only the global tool configs |

Also available: `-DryRun` (preview, write nothing), `-Backup` (dated backup before overwriting),
`-NoMirrorDelete` (copy without deleting), `-RestoreBackup <timestamp>`.

> **Note:** `npm run sync:all` drives this CLI for every project in `sync-projects.json`, non-interactively.
> It stamps `lastSynced` only after the CLI exits 0 **and** the delivered mirror hashes equal to the
> source, and it exits 1 if any project fails. The batch runs the **project-side** sync (`-SourceOnly`) —
> the machine-global configs are identical for every project and are not what `check-sync-drift.js`
> verifies. Pass `--with-global-configs` (or set `SYNC_WITH_GLOBAL_CONFIGS=1`) to include them.
> A batch `--dry-run` runs each project's mirror preflight and writes nothing, so a project command that
> still names a retired source script is reported before a real sync is attempted.

## Commands

> This table covers the day-to-day commands. `package.json` §scripts is the complete inventory — it
> also carries `validate:standard`, `docs:check`, `guard:paths`, `guard:mode`, `guard:ship`,
> `sync:drift`, `audit:friction`, `benchmark:reform` and `benchmark:check`.

| Command | What it does |
|---|---|
| `npm run validate` | Full integrity gate (runs on every push via the local pre-push hook). See `package.json` §scripts for the authoritative step chain. |
| `npm run audit` | Verifies extracted rules in starter templates still match their source guideline files. |
| `npm run check-links` | Checks internal links across all `.md` files. |
| `npm run check-index` | Verifies every file is registered in `guidelines/_index/MASTER_INDEX.md`. |
| `npm run render:starters` | Regenerates `templates/AGENTS.starter.md` from `global-configs/fragments/`. |
| `npm run render:index` | Regenerates the `MASTER_INDEX.md` category tables, skills table, and cross-reference graph from each file's front-matter + `## Cross-References` footer. |
| `npm run check-drift` | Fails if `AGENTS.starter.md` was hand-edited or exceeds its token budget. |
| `npm run check-index-drift` | Fails if `MASTER_INDEX.md` was hand-edited — regenerate it instead. |
| `npm run render:skills` | Regenerates `global-configs/skills/INDEX.md` — the `Skill → Load when → Applies to` trigger inventory — from each skill's front-matter. |
| `npm run check-skills-drift` | Fails if `skills/INDEX.md` was hand-edited — regenerate it instead. |
| `npm run plan:skills` | Prints which skills belong in which project and why, from each project's stack profile (no argument = the whole fleet; `--apply` writes). |
| `npm run docs:census` | Fails if a canonical fact (stack table, commands block, forbidden-pattern list, "How to Change Safely") appears in more than one mandated project doc — one home per fact; also fails a per-document changelog archive or a resurrected `AI_CONTEXT.md` / `ARCHITECTURE_INDEX.md`. |
| `npm run guard:tiers` | Reads every guard's `@tier` docblock and reports the gate set — an `always` guard the gate never reaches is a failure. |
| `npm run status:projects` | Reports which rules each synced project's `AGENTS.md` is missing (informational, never fails). |
| `npm run sync:all` | Batch-syncs every project in `sync-projects.json` via `sync-guidelines.ps1` (non-interactive; project-side only — `--with-global-configs` adds the machine-global tool configs; updates `lastSynced` only on verified delivery; exits 1 if any fail). |
| `npm run validate:fast` | Quick integrity pass (`check-links` + `check-index` only). |
| `npm run test:scripts` | Runs the Node test suite for `global-configs/scripts` helpers. |
| `npm run new:guideline` | Scaffolds a guideline file (front-matter + `## Cross-References`) and re-renders `MASTER_INDEX.md` (use `-- --dry-run` first). |
| `npm run new:project` | Bootstraps starter files into a project path (`-- <path> [--mode vibe\|standard\|guarded]`). |

## Speed Modes

Projects declare a process mode in `WORLD.md` (`vibe | standard | guarded`) — see
`guidelines/01-workflow-methodology/speed-tiered-workflow.md`. The mode is a **loop-speed
setting, not a lifecycle stage**: a starter begins at `vibe`, `vibe` and `standard` keep
shipping, and a release does not change the declared mode. A project that declares no mode is
assumed `standard`. Modes scale context, plan, test depth and the per-push gate (`vibe`:
`gate:fast` + the `always` guards; `standard`: lint + type-check + the full suite; `guarded`:
that chain + the build + the path-aware extras). Security, honesty, and the ship boundary —
whose extra depth is set by the release class, `pilot` or `production` — apply in every mode.

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

**4. Adding a rule costs budget.** The always-loaded constitution is capped (see `maxTokens` and `maxCoreTokens`
in `fragments/manifest.json`, estimated at chars/4 and enforced by `npm run check-drift`).
A new rule must retire, narrow, or demote an existing one; detail that isn't needed every session
belongs in a guideline file under `guidelines/0X-*`, reached via the `_guidelines/` mirror, not
inlined.

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

Covered by `npm run validate` — see the Commands table above. Every check runs on
every push via the local pre-push hook (`git config core.hooksPath .githooks`).

## How to Change Something Safely

- **Adding a guideline:** `npm run new:guideline <category> <slug>` (front-matter + `## Cross-References` are scaffolded and the index re-renders automatically) → update the matching fragment (and template) if normative → `npm run validate`
- **Updating a guideline:** edit file → update matching fragment in `global-configs/fragments/` → `npm run render:starters` → `npm run render:index` (if front-matter or footers changed) → run `npm run validate`
- **Adding a skill:** create `global-configs/skills/<name>/SKILL.md` with `name` + `description` front-matter (and `metadata.status`/`scope`/`tags`) → `npm run render:index` and `npm run render:skills` → `npm run validate` (the sync-manifest skills glob `skills/*/SKILL.md` picks it up)
- **Changing templates:** edit fragments, never the generated `AGENTS.starter.md` → render → validate
