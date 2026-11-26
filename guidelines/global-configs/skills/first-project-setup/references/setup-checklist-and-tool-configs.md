# Project Setup — Tool Configs & Checklist Reference

Companion reference for `first-project-setup`.

---

## Per-Tool Configuration Notes

Modern late-2026 coding tools (Antigravity, Codex CLI, Cursor, Windsurf, GitHub Copilot, OpenCode, Kilo Code, and Claude Code v2.1.277+ fallback) natively recognize root `AGENTS.md` and `.agents/skills/`. Use tool-specific files only as pointers or when an installed tool requires them:

| Tool | Config / Target | Template / Notes |
|---|---|---|
| **Claude Code** | `CLAUDE.md` | `global-configs/templates/CLAUDE.starter.md` (imports `@AGENTS.md` inside managed markers so Claude Code never skips `AGENTS.md`) |
| **Gemini CLI / Antigravity** | `GEMINI.md` (or `~/.gemini/settings.json`) | `global-configs/templates/GEMINI.md.template` (imports `@AGENTS.md`), or set `"context": { "fileName": ["AGENTS.md", "GEMINI.md"] }` in `~/.gemini/settings.json` (avoid double-loading both if `@AGENTS.md` is present) |
| **GitHub Copilot / VS Code** | `.vscode/settings.json` + `.github/copilot-instructions.md` | `chat.useAgentsMdFile: true` + `copilot-instructions.starter.md` |
| **opencode** | `opencode.json` | `global-configs/templates/opencode.json.template` (prepends `AGENTS.md`) |
| **Kilo / Cursor / Trae / Windsurf / Qoder** | Only if the tool directory exists (`.cursor/`, `.trae/`, `.windsurf/`, etc.) | `sync-manifest.json` `detect` gates optional legacy templates |

---

## Setup Completion Checklist

```markdown
## Project Setup — [Project Name]

### Prerequisites & App
- [ ] Node.js >=22, Git, and editor/AI tool verified
- [ ] App scaffolded (`npm create vite@latest` or chosen stack) and dev server verified

### Constitution & Sync
- [ ] `sync-guidelines.ps1` (or `npm run new:project`) run — `_guidelines/` and `_skills/` synced
- [ ] `AGENTS.md`, `WORLD.md` (`mode` + `capabilities` set), and `README.md` created; `[FILL]`s completed
- [ ] Tool pointers configured (without duplicating rules outside `AGENTS.md`)

### Lint, Types & Local CI Hooks
- [ ] Strict TypeScript (`strict: true`) + ESLint `max-lines` (`400`) configured (opt-in starter presets: `tsconfig.strict.base.json.template`, `eslint.guardrails.mjs.template`)
- [ ] `npx husky init`, `.husky/pre-commit` (`lint-staged` + secret scan), `.husky/pre-push` (branches on `read-mode.js`: `vibe` / `standard` / `guarded` + `audit:gate` + clean-tree)
- [ ] Every guard declares `@tier always | standard+ | ship` and no hook requires real secrets
- [ ] Initial and constitution commits made; remote pushed cleanly

### First Feature Plan
- Feature: [one-sentence vertical slice]
- Files to create/modify: [list]
- Verification: [smoke / behavioral check]
```
