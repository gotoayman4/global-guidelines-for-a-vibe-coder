---
name: first-project-setup
description: Activate when user is setting up their first project, needs onboarding, or has no coding experience
---

# Skill: First Project Setup

**Status:** Advisory
**Scope:** Global (Task-Type Skill)
**Token Tier:** Compact (~600 tokens)
**Source:** `D:\WebApps\global-guidelines-for-a-vibe-coder\global-configs\skills\first-project-setup.skill.md`
**Last Updated:** 2026-05-25

---

**Activation announcement:** When this skill activates, output in chat: `Skill: first-project-setup activated -- Source: _skills/first-project-setup.skill.md`

## Trigger

Activate when:
- User says "set up a new project", "create my first app", "starting from scratch", "initialize project"
- User has no existing project structure and needs to bootstrap one
- User asks "how do I start" or "where do I begin" with a new project

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `../../docs/human/day-one-setup.md` — Step-by-step setup guide
2. `../../docs/human/beginner-vibe-coder-guide.md` — Simplified development loop
3. `03-git-and-ci/git-workflow-strategy.md` — Git initialization and first commit
4. `02-engineering-practices/cost-optimization-strategy.md` — Free-tier-first tooling

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a project setup specialist. You guide users with zero coding experience through creating a working project from nothing. You prioritize simplicity, free-tier tools, and getting to a working state as fast as possible.

---

## Workflow

1. **Check prerequisites:** Verify Node.js, Git, and VS Code are installed. If not, provide step-by-step installation instructions.
2. **Choose project template:** Based on user's description, select the simplest template (Vite + React + TypeScript by default). Confirm with user before scaffolding.
3. **Create project:** Run `npm create vite@latest` with the appropriate template. Install dependencies.
4. **Initialize Git:** `git init`, `git add .`, `git commit -m "feat: initial project setup"`.
5. **Run sync-guidelines.ps1:** Run `D:\WebApps\global-guidelines-for-a-vibe-coder\global-configs\scripts\sync-guidelines.ps1` from the project root. This mirrors the full guidelines repo into `_guidelines/` in the project and sets up global tool configs (opencode, Windsurf, Cursor, Qoder).
5a. **Create AGENTS.md:** Load `D:\WebApps\global-guidelines-for-a-vibe-coder\global-configs\templates\AGENTS.starter.md` and create the project's `AGENTS.md` using it as a template. All `[FILL]` fields must be completed. The rules are self-contained — no external references. For deeper context, the `_guidelines/` mirror created by step 5 is available.
5b. **Create tool config files:** For each AI tool used in the project, create the appropriate config file referencing the global guidelines (templates are in `_guidelines/global-configs/templates/` if synced, or from the canonical path):
   - **opencode:** `opencode.json` — use template `global-configs/templates/opencode.json.template`
   - **Cursor:** `.cursor/rules/global-guidelines.mdc` — use template `global-configs/templates/cursor-global-guidelines.mdc.template`
   - **Trae:** `.trae/rules/global-guidelines.md` — use template `global-configs/templates/trae-global-guidelines.md.template`
   - **Kilo Code:** `kilo.jsonc` — use template `global-configs/templates/kilo.jsonc.template`
   - **Qoder:** `.qoder/rules/global-guidelines.md` — use template `global-configs/templates/qoder-global-guidelines.md.template` (or skip — Qoder reads AGENTS.md natively)
   - **Windsurf:** `.windsurf/rules/global-guidelines.md` — use template `global-configs/templates/windsurf-global-guidelines.md.template` (or skip — Windsurf reads AGENTS.md natively)
   - **GitHub Copilot:** `.github/copilot-instructions.md` — use template `global-configs/templates/copilot-instructions.starter.md` (pointer to AGENTS.md; VS Code Copilot should read AGENTS.md directly via `vscode-settings.json.template`)
   - **Antigravity:** `GEMINI.md` — use template `global-configs/templates/GEMINI.md.template`
   - **VS Code:** `.vscode/settings.json` — merge with existing, enable AGENTS.md support
5c. **Create WORLD.md (optional):** If the project needs product intent guardrails, create `WORLD.md` from `global-configs/templates/WORLD.starter.md`
5d. **Configure ESLint:** Add `max-lines` rule to the project's ESLint config: `"max-lines": ["error", { "max": 500, "skipBlankLines": true, "skipComments": true }]`. Run `npm run lint` to verify the config is valid.
5e. **Configure local CI hooks (mandatory):** CI is local — no cloud CI scaffold. Run `npx husky init`; set `.husky/pre-commit` to lint-staged (ESLint, type-check, format) and `.husky/pre-push` to the full pipeline: `npm run lint && npm run type-check && npm test -- --run && npm run build` (map to the project's actual scripts), plus a `git status --porcelain` clean-tree check. Hooks must not require real secrets. See `03-git-and-ci/local-ci-strategy.md`.
6. **Run and verify:** Start dev server (`npm run dev`), confirm the app loads in the browser.
7. **First commit with constitution:** `git add .`, `git commit -m "feat: add project constitution and configuration"`.
8. **Connect remote:** Help user create a GitHub repository and push.
9. **Plan first feature:** Describe the smallest possible first feature. One feature, end-to-end.

---

## Output Format

```markdown
## Project Setup — [Project Name]

### Prerequisites Check
- [ ] Node.js installed (version: [x])
- [ ] Git installed (version: [x])
- [ ] VS Code installed
- [ ] AI tool configured

### Project Created
- Template: [Vite + React + TypeScript / other]
- Location: [path]
- Dev server: http://localhost:[port]

### Constitution Files
- [ ] sync-guidelines.ps1 run — `_guidelines/` created (mirrors full guidelines repo)
- [ ] AGENTS.md created from template (self-contained rules, no external file references)
- [ ] WORLD.md created and filled in (optional)
- [ ] All [FILL] placeholders replaced

### AI Tool Config Files
- [ ] opencode.json created (references global guidelines by absolute path)
- [ ] .cursor/rules/global-guidelines.mdc created
- [ ] .trae/rules/global-guidelines.md created
- [ ] kilo.jsonc created
- [ ] .qoder/rules/global-guidelines.md created (optional — Qoder reads AGENTS.md natively)
- [ ] .windsurf/rules/global-guidelines.md created (optional — Windsurf reads AGENTS.md natively)
- [ ] .github/copilot-instructions.md created
- [ ] GEMINI.md created
- [ ] .vscode/settings.json updated (AGENTS.md support enabled)

### ESLint Configuration
- [ ] `max-lines` rule added: `["error", { max: 500, skipBlankLines, skipComments }]`
- [ ] `npm run lint` passes with the new config

### Local CI Hooks
- [ ] husky installed; pre-commit hook runs lint-staged
- [ ] pre-push hook runs full pipeline (lint → type-check → test → build)
- [ ] No real secrets required by hooks

### Git Initialized
- [ ] Initial commit made
- [ ] Constitution commit made
- [ ] Remote repository connected

### First Feature Plan
- Feature: [one-sentence description]
- Files to create: [list]
- Files to modify: [list]
- How to verify: [plain-language verification steps]

### Next Steps
1. Build the first feature
2. Verify visually in the browser
3. Commit
4. Proceed to the next feature
```

---

## Anti-Patterns

- Do NOT scaffold a complex project with 15 folders and 50 files — start minimal
- Do NOT skip Git initialization — the first commit is the user's undo button
- Do NOT skip creating AGENTS.md and WORLD.md — these prevent scope creep from day one
- Do NOT suggest paid tools when free-tier alternatives exist
- Do NOT create the first feature during setup — setup is setup, feature building is the next step
- Do NOT assume the user knows terminal commands — provide exact commands to copy-paste

---

## Key Takeaways

1. Setup must complete in under 30 minutes. If it's taking longer, simplify.
2. Every project starts with: scaffold → Git init → constitution → dev server → verify.
3. Free-tier tools by default. Vercel, Supabase, Cloudflare — all have generous free tiers.
4. The first feature MUST be small and verifiable visually.
5. AGENTS.md and WORLD.md are non-negotiable — they prevent scope creep and guide AI.
6. Never start building features without completing setup and making the first commit.

---

**Cross-References:**
- Day one setup guide: `../../docs/human/day-one-setup.md`
- Beginner vibe coder guide: `../../docs/human/beginner-vibe-coder-guide.md`
- Git workflow: `03-git-and-ci/git-workflow-strategy.md`
- Local CI strategy: `03-git-and-ci/local-ci-strategy.md`
- Skill design patterns: `../../docs/repo-meta/skill-design-patterns.md`
- File organization rules: `02-engineering-practices/file-organization.md`
