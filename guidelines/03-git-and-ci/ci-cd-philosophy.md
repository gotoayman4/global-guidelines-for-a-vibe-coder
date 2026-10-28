---
status: "Normative"
scope: "Global"
tags: [ci-cd, pipelines, automation]
---

# CI/CD Philosophy — Automated Quality Gates for AI-Generated Code

---

CI is the first reviewer of every AI-generated change — it catches what a quick eyeball misses and never gets tired. Every AI-generated PR passes automated gates before merge.

**Execution is local by default.** The pipeline runs on the dev machine — pre-commit hooks for staged files, and a mandatory pre-push gate that runs **the declared mode's share of the pipeline** (`local-ci-strategy.md` §Which Gate Runs). No cloud CI provider or paid Actions minutes are required; see `local-ci-strategy.md`.

## The Minimum Pipeline (in order)

The order below is fixed; **how much of it a push runs is the declared mode's decision** — the mapping has one home in `speed-tiered-workflow.md` §The Gate Scales With the Mode — and the ship boundary runs all of it in every mode. The **release class** sets the boundary's depth: a `pilot` (live testing, demo, beta) runs this pipeline plus critical-flow checks in LTR and RTL; a `production` release adds the ship-tier E2E matrix, the path-aware extras and rollback readiness (`speed-tiered-workflow.md` §Release Classes).

```
PUSH (pre-push gate, local) → LINT → TYPE CHECK → TEST → BUILD → SECURITY SCAN → CLEAN TREE → DEPLOY PREVIEW
```

| Gate | Command | Catches |
|---|---|---|
| Lint | `eslint . --max-warnings 0` + `prettier --check` | Style violations, forbidden patterns |
| Type check | `tsc --noEmit` | Type errors AI misses |
| Tests | full suite: `vitest run --coverage` + `playwright test` | Silent regressions |
| Build | `vite build` | Import errors, config issues |
| Security | `npm audit --audit-level=high` + secret scan | Vulnerable deps, hardcoded secrets |
| Clean tree | fail if `git diff --quiet HEAD` or `git ls-files --others --exclude-standard` reports anything after the gate — decided on content, never on `git status --porcelain`'s stat cache | Tool/build artifact pollution |
| Deploy preview | staging/preview environment | Issues only visible when running |

## Pipeline Design Principles

1. **Fail fast:** order fastest → slowest; don't run tests on a lint failure.
2. **Block merge on ANY gate failure.** No exceptions, no "fix later."
3. **Same pipeline for AI and human code** — no AI shortcut.
4. **At the ship boundary, the pipeline IS the executable definition of done:** "Is this ready?" = "Did the full pipeline pass?" Inside an iterating slice, the mode's gate is the per-push definition; whatever that gate defers — `vibe` defers the full suite and the build, `standard` only the build — the ship boundary runs it. Deferred, never skipped.

## AI-Specific Additions

- **Dependency verification:** AI hallucinates packages — verify new deps exist on npm (`npm ls`, `npm view`) in the pipeline.
- **Coverage thresholds:** prevent tautological AI tests from passing meaninglessly.
- **Bundle-size budget:** fail the build when bundle exceeds limits — AI adds dependencies without considering impact.

## Deployment Progression

Development: auto-deploy on push to main · Staging: PR preview environments mirroring production · Production: **gated — deploy only from a green pipeline with a tested rollback; never auto-deploy a red gate.**

Rollback readiness is mandatory: reversible migrations (tested down-migrations), documented+tested rollback procedure, monitoring alerts live before deploy.

## Cross-References

`git-workflow-strategy.md` · `environment-management.md` · `testing-philosophy.md` · `local-ci-strategy.md`
