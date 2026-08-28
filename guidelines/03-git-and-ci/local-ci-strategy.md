# Local CI Strategy — Free, Cloud-Independent Quality Gates

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~750 tokens)
**Last Updated:** 2026-08-28
**Cross-References:** `ci-cd-philosophy.md`, `git-workflow-strategy.md`, `environment-management.md`

---

CI does not require a cloud CI provider. Cloud Actions minutes are a paid quota that runs out; the local machine is free, always available, and already runs the same commands. All CI gates execute locally by default — no cloud CI service is required for any project to be compliant.

## The Three Tiers of Local CI

| Tier | When it runs | What it covers |
|---|---|---|
| **A — Pre-commit hooks** | Every commit | Staged-file lint, type check, format (`husky` + `lint-staged`) |
| **B — Pre-push gate** | Before every push | The full Minimum Pipeline (see `ci-cd-philosophy.md`) |
| **C — act (optional)** | On demand | Validates existing `.github/workflows` files locally via Docker |

## Tier B — The Pre-Push Gate (Mandatory)

Before every push, run the full pipeline locally. This gate replaces the cloud CI gate: a push that has not passed it is a violation, the same as merging on a red pipeline.

1. Install husky once per project: `npx husky init`, then define `.husky/pre-push`:
   ```sh
   npm run lint && npm run typecheck && npm run test -- --run && npm run build
   ```
   Map each step to the project's actual script names (`[FILL]` in starter templates). Add `npm audit --audit-level=high` and a `git status --porcelain` clean-tree check to match the Minimum Pipeline.
2. **Skip is forbidden:** `git push --no-verify` is forbidden exactly like `--no-verify` on commit hooks. If the gate is slow, fix the gate (cache, narrower test scope) — never skip it.
3. **Fail fast locally:** the gate runs in seconds-to-minutes, not queue-minutes — iterate freely, push only green.

## Tier C — act (Optional)

If a project still carries `.github/workflows/*.yml` files (e.g., inherited from a team or a fork), validate them locally without spending cloud minutes:

```sh
act push                          # run the push workflow locally
act -j <job> --secret-file .secrets   # job-scoped run with local secrets
```

Requires Docker Desktop. Some marketplace actions fail locally — treat act as a smoke test for workflow syntax and step order, not as authoritative. Never register cloud runners or purchase Actions minutes to make a workflow pass; migrate the gate into the pre-push hook instead.

## Secrets & Environment Rules for Local CI

- Local hooks run with full machine access: **never** read or require real secrets in hooks. Hooks use only public config, `.env` (gitignored), or dummy values.
- A "CI secret" no longer exists as a platform concept — every secret is a local `.env` secret governed by `environment-management.md`.
- The clean-working-tree gate (`git status --porcelain` must be empty post-build) runs in the pre-push hook, not in a cloud job.

## When a Team Demands Cloud CI

Local CI is the default; a team may add a cloud pipeline **in addition**, never instead. Even then, the local pre-push gate stays mandatory — cloud status checks become a confirmation layer, not the first line of defense.

## Cross-References

`ci-cd-philosophy.md` · `git-workflow-strategy.md` · `environment-management.md` · `cost-optimization-strategy.md`
