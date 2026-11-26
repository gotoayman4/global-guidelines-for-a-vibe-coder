---
name: first-project-setup
description: Zero-to-running project bootstrap for a first-time vibecoder. Use when starting a new project from scratch or when the user asks how to begin. Covers scaffolding, Git, the constitution files, the local CI hooks, and the first feature.
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, setup, beginner, onboarding
  appliesTo: any
  trigger: start a new project from scratch, how do I begin, set up my first project
---

# Skill: First Project Setup

---

## Trigger

Activate when:
- User says "set up a new project", "create my first app", "starting from scratch", "initialize project"
- User asks "how do I start" or "where do I begin" with a new project
- **The backend bills per operation** (Firebase/Firestore, DynamoDB, serverless functions): also activate `firestore-cost-optimization` (or the platform's cost skill) at setup time — fill the ceiling/headroom/prune lines in `WORLD.md` before writing the first document.

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from available guides (central-only human guides are optional; do not search for them in `_guidelines/`):
1. `docs/human/day-one-setup.md` (central repo only)
2. `docs/human/beginner-vibe-coder-guide.md` (central repo only)
3. `03-git-and-ci/git-workflow-strategy.md` — Git initialization and first commit
4. `02-engineering-practices/cost-optimization-strategy.md` — Free-tier-first tooling

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a project setup specialist guiding users with zero coding experience from nothing to a working, guarded repository as fast as possible using free-tier tools.

---

## Workflow

1. **Check prerequisites:** Verify Node.js (`>=22`), Git, and VS Code (or the user's editor/CLI). Give exact install steps if missing.
2. **Choose stack & scaffold:** Pick the simplest free-tier stack (Vite + React + TypeScript by default), confirm with user, scaffold (`npm create vite@latest`), and install dependencies.
3. **Initialize Git:** `git init`, stage files by path (or initial commit on clean scaffold), commit `"feat: initial project setup"`.
4. **Sync guidelines & bootstrap constitution:**
   - Run `npm run new:project -- <projectPath> [--mode vibe]` from the central repo (or run `<central-repo>/guidelines/global-configs/scripts/sync-guidelines.ps1 -ProjectPath .`) to mirror `_guidelines/`, `_skills/`, `.agents/skills/`, `.claude/skills/`, and install `AGENTS.md`, `WORLD.md`, `README.md`, `CLAUDE.md` (`@AGENTS.md`), `.husky/pre-push`, `scripts/audit-gate.js`, `scripts/gate-receipt.js`, and guardrail hooks.
   - Replace every `[FILL]` in `AGENTS.md`, `WORLD.md` (set `mode` and `capabilities`), and `README.md`.
   - For tool pointer details (Claude Code, Gemini CLI `context.fileName`, Antigravity, Copilot, Cursor, opencode), read [`references/setup-checklist-and-tool-configs.md`](references/setup-checklist-and-tool-configs.md).
5. **Configure lint, strict types & local CI hooks:**
   - Ensure TypeScript `strict: true` and ESLint `max-lines` (`400`, skipping blank lines & comments; plan files for ~300 lines). Opt-in preset templates exist under `global-configs/templates/` (`tsconfig.strict.base.json.template`, `eslint.guardrails.mjs.template`).
   - Run `npx husky init`; ensure `.husky/pre-commit` runs `lint-staged` + secret scan (`scan-secrets.js`), and `.husky/pre-push` uses `read-mode.js` to branch by `mode` (`vibe`: `gate:fast` + `always` tier; `standard`: `lint` + `type-check` + full suite; `guarded`: adds `build` + path extras), followed by `audit:gate`, `guard:ship` on release overrides (`GS_RELEASE_GATE=pilot|production` or `.release-override`), and the content-based clean-tree check (`local-ci-strategy.md` §Tier B).
   - Every project guard declares `@tier always | standard+ | ship` in its docblock so the gate derives the set automatically.
6. **Verify & commit:** Start `npm run dev`, verify app loads, run `npm run lint` / `npm run type-check`, commit constitution files, connect remote, and define the smallest vertical slice as the first feature.
7. **Report** using the checklist in [`references/setup-checklist-and-tool-configs.md`](references/setup-checklist-and-tool-configs.md).

---

## Anti-Patterns

- Do NOT scaffold 15 folders and 50 files before the first working screen — start minimal
- Do NOT skip Git initialization, `AGENTS.md`, or `WORLD.md`
- Do NOT leave `[FILL]` placeholders or copy-paste rules into pointer files (`CLAUDE.md`, `copilot-instructions.md`)
- Do NOT write a pre-push hook that runs the full pipeline unconditionally in `vibe` mode, or uses `grep` instead of `read-mode.js`
- Do NOT suggest paid tools when free-tier equivalents serve
- Do NOT start building features during setup — finish setup, verify, commit, then plan the first vertical slice

---

## Key Takeaways

1. Setup completes in under 30 minutes: scaffold → Git init → sync + constitution → lint/hooks → dev server verify → commit.
2. Free-tier tools and local CI hooks by default.
3. Mode scales inner-loop speed (`vibe` starts light), while security, `@tier always` guards, and the ship boundary never relax.
4. Keep `AGENTS.md` + `WORLD.md` + `README.md` as the clean three-file doc foundation.

---

## Cross-References

- Day one setup guide: `docs/human/day-one-setup.md` (central repo only; not delivered with this skill)
- Beginner vibe coder guide: `docs/human/beginner-vibe-coder-guide.md` (central repo only; not delivered with this skill)
- Git workflow: `03-git-and-ci/git-workflow-strategy.md`
- Local CI strategy: `03-git-and-ci/local-ci-strategy.md`
- File organization rules: `02-engineering-practices/file-organization.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repo only; not delivered with this skill)
