# Project Setup — Tool Configs & Checklist Reference

Companion reference for `first-project-setup`.

---

## Per-Tool Configuration Notes

Active tools for this workflow (**Antigravity**, **GitHub Copilot**, **Qoder**, and **ZCode**) read root `AGENTS.md` and standard Agent Skills folders directly (`sync-manifest.json` retires unused `opencode`, `kilo`, `Gemini CLI`, `Cursor`, `Trae`, `Windsurf`, and `Claude Code` adapters per owner decision 2026-11-26):

| Tool | Config / Target | Template / Notes |
|---|---|---|
| **Antigravity** | `AGENTS.md` + `.agents/skills/` + `~/.agents/skills/` | Direct root `AGENTS.md` + `## Skills` inventory + marker-scoped native skill stores |
| **GitHub Copilot / VS Code** | `.vscode/settings.json` + `.github/copilot-instructions.md` | `chat.useAgentsMdFile: true` + `copilot-instructions.starter.md` |
| **Qoder** | `qoder-global-guidelines.md` + `~/.qoder/skills/` | `global-configs/templates/qoder-global-guidelines.md.template` (points to `AGENTS.md`) |
| **ZCode** | `~/.zcode/skills/` | Stack-agnostic global pool synced via `sync-global-skills.js` |

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
