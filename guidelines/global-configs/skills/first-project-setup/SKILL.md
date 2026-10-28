---
name: first-project-setup
description: Zero-to-running project bootstrap for a first-time vibecoder. Use when starting a new project from scratch or when the user asks how to begin. Covers scaffolding, Git, the constitution files, the local CI hooks, and the first feature.
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, setup, beginner, onboarding
---

# Skill: First Project Setup

---

## Trigger

Activate when:
- User says "set up a new project", "create my first app", "starting from scratch", "initialize project"
- User has no existing project structure and needs to bootstrap one
- User asks "how do I start" or "where do I begin" with a new project
- **The backend bills per operation** (Firebase/Firestore, DynamoDB, serverless functions): fire
  `firestore-cost-optimization` (or the platform's cost skill) **here**, not only when someone says "this is
  expensive". A billing ceiling is a setup decision — fill the ceiling/headroom/prune lines in `WORLD.md`
  before the first document is written, and note where the quota numbers were read (Console/CLI + date).

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from the available guides below. Central-only human guides are optional; do not search for them in the downstream mirror.

1. `docs/human/day-one-setup.md` (central repository only; not delivered with this skill) — Step-by-step setup guide
2. `docs/human/beginner-vibe-coder-guide.md` (central repository only; not delivered with this skill) — Simplified development loop
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
5. **Run sync-guidelines.ps1:** From the project root, run `<central repo>/guidelines/global-configs/scripts/sync-guidelines.ps1` — the machine's global agent config names the central repo path; in the guidelines repo itself the script is `guidelines/global-configs/scripts/sync-guidelines.ps1`. This mirrors the full guidelines repo into `_guidelines/` in the project and sets up global tool configs (opencode, Windsurf, Cursor, Qoder).
5a. **Create AGENTS.md:** Load `<central repo>/guidelines/global-configs/templates/AGENTS.starter.md` (or `_guidelines/global-configs/templates/AGENTS.starter.md` after step 5) and create the project's `AGENTS.md` using it as a template. All `[FILL]` fields must be completed. The rules are self-contained — no external references. For deeper context, the `_guidelines/` mirror created by step 5 is available.
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
5c. **Create WORLD.md and README.md (both mandated):** the doc set is `AGENTS.md` + `WORLD.md` + `README.md`, plus `docs/AI_ARCHITECTURE.md` on demand. Create `WORLD.md` from `_guidelines/global-configs/templates/WORLD.starter.md` and declare the mode — an undeclared mode is assumed `standard`, which is the safe default, not the fast one. Create `README.md` from `_guidelines/global-configs/templates/README.starter.md`: what the project is, its structure, and Quick Start. A missing member is a failure, not a note.
5d. **Configure ESLint:** Add `max-lines` rule to the project's ESLint config: `"max-lines": ["error", { "max": 400, "skipBlankLines": true, "skipComments": true }]`. Plan new files for ~300 lines; at 400, record the deeper <300 refactor as debt and split before the NEXT feature touches the file. Run `npm run lint` to verify the config is valid.
5e. **Configure local CI hooks (mandatory):** CI is local — no cloud CI scaffold. Run `npx husky init`; set `.husky/pre-commit` to lint-staged (ESLint, type-check, format), and make `.husky/pre-push` **branch on the declared mode** in `WORLD.md` §Speed Mode: `vibe` runs `gate:fast` + the `always` guard tier and defers the full pipeline to the ship boundary; `standard` runs lint + type-check + the full suite and defers the build to the ship boundary (every release builds, and deploys what it built); `guarded` adds the build and the path-aware extras per push. Map each step to the project's actual scripts. Every branch adds the dependency-audit wrapper and a content-based clean-tree check. Hooks must not require real secrets. **Read the mode with the SHIPPED reader** (`_guidelines/global-configs/scripts/read-mode.js`, or a vendored `scripts/read-mode.js`) — never with a grep in the hook: a grep is a second reader of `WORLD.md`, and a second reader is a second opinion that drifts (the shipped one matched `- **Transition mode:**` and read a `vibe` out of a sentence about something else). **An unreadable mode FAILS SAFE to the full chain** — a mode nobody can parse must never buy a cheaper gate. **A hook that runs the full pipeline unconditionally is the defect `local-ci-strategy.md` §Tier B names** — it makes `vibe` pay `standard`'s cost on every push, and the project then "fixes" it by skipping the gate. **A release or milestone exit escalates through an OVERRIDE the hook reads** (an env var such as `GS_RELEASE_GATE=1`, or a gitignored marker file, lifting `vibe` → `standard`) — never by editing `WORLD.md` back and forth; the declared mode changes only when the steady state changes, and the override can never make a gate cheaper. **A release does not change the mode:** a `vibe` or `standard` project ships a `pilot` (live testing, demo, beta) from its declared mode; the release class is recorded in the tag or commit. See `03-git-and-ci/local-ci-strategy.md`.
5f. **Declare a tier on every guard (mandatory):** each guard states its own tier in a file-level docblock (`@tier always | standard+ | ship`), and the pre-push hook **derives the set it runs from the guards** — keyed on the declared mode — rather than listing steps by hand. `always` = security, honesty and structural invariants (every push, every mode); `standard+` = contract and parity guards; `ship` = critical-flow E2E and the deny matrix. A hand-kept step list is a list that goes stale, and it fails in the direction nobody notices. See `03-git-and-ci/local-ci-strategy.md` §Guard Tiers.
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
- [ ] WORLD.md created, mode declared (mandatory)
- [ ] README.md created from template (description, structure, Quick Start)
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
- [ ] `max-lines` rule added: `["error", { max: 400, skipBlankLines, skipComments }]` (plan 300; at 400, split before the NEXT feature touches it)
- [ ] `npm run lint` passes with the new config

### Local CI Hooks
- [ ] husky installed; pre-commit hook runs lint-staged
- [ ] pre-push hook branches on the declared mode (`vibe`: `gate:fast` + the `always` tier; `standard`: lint + type-check + the full suite; `guarded`: that chain + the build and the path-aware extras), with a release override (env var / marker file) that lifts `vibe` → `standard` for a release exit instead of editing `WORLD.md`
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

## Cross-References

- Day one setup guide: `docs/human/day-one-setup.md` (central repository only; not delivered with this skill)
- Beginner vibe coder guide: `docs/human/beginner-vibe-coder-guide.md` (central repository only; not delivered with this skill)
- Git workflow: `03-git-and-ci/git-workflow-strategy.md`
- Local CI strategy: `03-git-and-ci/local-ci-strategy.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repository only; not delivered with this skill)
- File organization rules: `02-engineering-practices/file-organization.md`
