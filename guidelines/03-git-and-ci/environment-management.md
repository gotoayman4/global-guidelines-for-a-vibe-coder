---
status: "Normative"
scope: "Global"
tags: [environments, secrets, config]
---

# Environment Management — Configuration, Secrets, and Environments

---

## Directives

1. **Everything environment-specific comes from environment variables — never hardcoded.** URLs, keys, connection strings, feature flags. AI hardcodes production URLs by default; reject it (`import.meta.env.VITE_API_URL`, not a literal).
2. **Secrets never in code, comments, tests, docs, or prompts.** `.env` gitignored + agent-ignored (`.cursorignore`/`.claudeignore`) · `.env.example` committed with placeholders · different secrets per environment (a dev key leak must never compromise production) · CI gates run locally (see `local-ci-strategy.md`), so hooks MUST NOT require real secrets — use only gitignored `.env` values or dummies · pre-commit secret scanning (git-secrets/talisman). A committed secret is rotated immediately.
3. **Same stack across all environments.** Development and production MUST use the same database engine and runtime — SQLite-dev/Postgres-prod is a recipe for environment-specific SQL bugs. Staging mirrors production config; staging DB is isolated, not a production copy.
4. **Environment profiles:**
   - **Development:** debug on, seeded test data, relaxed rate limits, isolated services
   - **Staging:** production mirror, isolated data, full monitoring
   - **Production:** debug OFF, minimal logging (no PII/secrets), strict rate limiting, CORS restricted to production domains, automated backups
5. **Specify the environment when asking AI to generate configuration** ("generate for STAGING; use env vars; no hardcoded connection strings").
6. **AI tool artifact hygiene:** auto-generated tool directories (`.kilocode/`, `.qoder/`, `.qodo/`, `.trae/`, `.windsurf/`, `playwright-report/`, `test-results/`, `uploads/`) are gitignored. Only commit explicitly shared team configs (e.g., `.vscode/extensions.json`).
7. **Clean-working-tree gate (pre-push hook):** after build, fail the gate if `git status --porcelain` is non-empty — catches misplaced build outputs, tool-created files, accidental source modifications. Runs locally in the pre-push gate, not in a cloud job.
8. **An empty value in git config can mean "clear the chain."** `credential.helper =` (blank) is not "unset" — it resets the accumulated helper list from higher-precedence files and can silently disable a system credential manager. Diagnose auth-shaped failures with `git config --show-origin --get-all credential.helper`; prove recovery with a NON-INTERACTIVE `git ls-remote`. Never let an agent edit global git config without the owner's explicit authorization — an authorization decision, not a code review — and record the fix in a runbook instead.

## Setup Checklist (new project)

.env.example committed · .env gitignored · agents blocked from .env · pre-push gate configured for the declared mode · hooks run without real secrets · distinct keys per environment · staging DB isolated · pre-commit secret scan · AI tool dirs in .gitignore · clean-tree check in pre-push gate.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Hardcoded configuration | Environment variables |
| Committed .env files | .gitignore + secret-scanning hook |
| Same secrets across environments | Distinct keys, rotate |
| Production secrets in AI prompts | Never paste them |
| Different DB engine per environment | Same engine everywhere |

## Cross-References

`git-workflow-strategy.md` · `ci-cd-philosophy.md` · `security-engineering.md` · `local-ci-strategy.md`
