# Local-Only CI Amendment (no cloud Actions) — Global Guidelines & Steering Files

## Model being codified — 100% free, local machine does all CI
- **Tier A — Pre-commit hooks**: husky + lint-staged (eslint/tsc/prettier on staged files) — already mandated, reframed as CI layer 1.
- **Tier B — Pre-push gate (new mandatory gate)**: before every push, run the Minimum Pipeline locally — `lint → typecheck → test → build` + clean-working-tree check. This **replaces** the cloud CI gate: the pipeline IS still the definition of done, it just executes on the dev machine.
- **Tier C — act (optional)**: nektos/act in Docker for validating existing `.github/workflows` files locally. Documented as optional; **no cloud Actions minutes ever required**.
- Cloud CI is removed from all mandated flows. Branch-protection wording changes from "required status checks" to local-gate + optional manual review.

## File changes

### 1. New guideline: `guidelines/03-git-and-ci/local-ci-strategy.md`
Primary deliverable: the three-tier local model, pre-push gate setup (husky `pre-push` hook example, cross-platform incl. Windows/Git Bash), `act` optional section, secrets rules (never in local hooks; env vars only), and `→ See also` cross-refs to `ci-cd-philosophy.md`, `git-workflow-strategy.md`, `environment-management.md`.

### 2. Amend existing guidelines
- `guidelines/03-git-and-ci/ci-cd-philosophy.md` — pipeline execution is local by default; remove cloud-CI assumption from the Minimum Pipeline definition.
- `guidelines/03-git-and-ci/git-workflow-strategy.md` — pre-push gate mandate; branch protection without cloud status checks.
- `guidelines/03-git-and-ci/environment-management.md` — "CI clean-tree gate" and secrets wording reworded for local execution.
- `guidelines/02-engineering-practices/cost-optimization-strategy.md` — replace "GitHub Actions free CI" line with the local-only model.

### 3. Templates & skills
- `guidelines/global-configs/templates/AGENTS.starter.md` — add mandatory local-CI rule + pre-push command block (project-specific scripts as `[FILL]`).
- `guidelines/global-configs/templates/DEVTOOLS.starter.md` — reframe `.github/` entry (workflows optional; local hooks are the CI).
- `guidelines/global-configs/skills/deploy-production.skill.md` — local gates as pre-deploy verification.
- `guidelines/global-configs/skills/first-project-setup.skill.md` — replace any CI scaffold step with local hooks setup; no Actions workflow scaffold.

### 4. Index & docs
- `guidelines/_index/MASTER_INDEX.md` — register `local-ci-strategy.md` (`#ci-cd #local-ci #cost`), update CI/CD task-recipe rows.
- `guidelines/_index/GLOSSARY.md` — add "local CI", "pre-push gate", "act".
- `guidelines/_index/RETRIEVAL_RULES.md` — retrieval hint: quota/CI-cost/deployment-gate questions → local-ci-strategy.
- Root `README.md`, `guidelines/README.md` — describe local CI as the CI model.

### 5. This repo's own CI (make it comply with its own rule)
- Remove `.github/workflows/validate-guidelines.yml` (it consumes Actions minutes on every push).
- Add a `pre-push` git hook (or husky) running `npm run validate` — matches the existing AGENTS.md rule "run validate before pushing".
- Note for you (manual, outside repo): if branch protection on main requires the old status check, remove that requirement in GitHub repo settings.

### 6. Verification & commits
- `npm run validate` after each logical group; granular conventional commits (`feat(ci): add local-ci-strategy guideline`, `docs(ci): local-only execution model`, `chore(ci): replace cloud workflow with pre-push validate hook`, etc.).
- Per AGENTS.md maintenance note, the root `AGENTS.md` itself is only touched if you approve it (one-line update to the Commands section mentioning the pre-push hook).
