# Local CI Strategy — Free, Cloud-Independent Quality Gates

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,800 tokens)
**Last Updated:** 2026-09-24
**Cross-References:** `ci-cd-philosophy.md`, `git-workflow-strategy.md`, `environment-management.md`, `documentation-strategy.md`, `workflow-friction-audit.md`

---

CI does not require a cloud CI provider. Cloud Actions minutes are a paid quota that runs out; the local machine is free, always available, and already runs the same commands. All CI gates execute locally by default — no cloud CI service is required for any project to be compliant.

## The Three Tiers of Local CI

| Tier | When it runs | What it covers |
|---|---|---|
| **A — Pre-commit hooks** | Every commit | Staged-file lint, type check, format (`husky` + `lint-staged`) |
| **B — Pre-push gate** | Before every push | The full Minimum Pipeline (see `ci-cd-philosophy.md`) |
| **C — act (optional)** | On demand | Validates existing `.github/workflows` files locally via Docker |

## The Loop Inside Tier A and Tier B (Mandatory in Practice)

The two named tiers are the boundaries; almost all agent time is spent between them. Without an intermediate loop, the developer runs the multi-minute gate after every edit (and starts skipping it) or runs it only at the end (and debugs a pile of breakage at once). Define both scripts in `package.json`:

| Script | Contents | Cost | When |
|---|---|---|---|
| `gate:fast` | `lint` + `type-check` + `test -- --run --changed` (only tests touched by the diff) | seconds | After every edit batch, during the slice |
| the pre-push hook | the full pipeline | minutes | Once, before the push — never replaced by `gate:fast` |

- The fast loop is a convenience, **never** a gate: it is not evidence, and a claim of "verified" MUST NOT cite it. Its whole purpose is to move the cheap failures earlier.
- `--changed` trusts the diff to name the dependents. Anything a shared file can break without appearing in the diff (contracts, i18n parity, path-scoped suites) is exactly what the full gate is for.

## Tier B — The Pre-Push Gate (Mandatory)

Before every push, run the full pipeline locally. This gate replaces the cloud CI gate: a push that has not passed it is a violation, the same as merging on a red pipeline.

1. Install husky once per project: `npx husky init`, then define `.husky/pre-push`:
   ```sh
   npm run lint && npm run typecheck && npm run test -- --run && npm run build
   ```
   Map each step to the project's actual script names (`[FILL]` in starter templates).
2. **The hook header comment is the normative list.** Write the step order once, as a `# Order: a → b → c` comment at the top of `.husky/pre-push`; the constitution restates it (and a guard compares the two token-for-token), every other document links to it. Measured in production: two hand-kept copies of one step list had already drifted apart.
3. **The dependency audit runs through the project's own wrapper** (`npm run audit:gate`), never a bare `npm audit`. A bare `npm audit` that cannot reach the registry reports nothing and exits 0 — an unreachable registry MUST exit non-zero, never a silent pass.
   The wrapper owns the reasoned, expiring allowlist (each entry: why, what, review-by date) and the npm flags its sandbox needs: `npm audit` inside a lifecycle script needs script execution disabled, so pin that env var in the wrapper, not in the developer's shell.
4. **Clean-tree check:** `git status --porcelain` must be empty after the build. It belongs in the hook, not a cloud job.
5. **Path-aware steps:** a step that takes minutes and protects a subtree (E2E over the data layer, the desktop shell's IPC tests) runs only when that subtree changed. Put the path list in the hook next to the step it gates, so the trigger and the check cannot drift apart. A security-relevant pin is not a convenience: if it is the only place a check runs, it stays in the gate.
6. **Skip is forbidden:** `git push --no-verify` is forbidden exactly like `--no-verify` on commit hooks. If the gate is slow, fix the gate (tier it, scope it by path, cache it) — never skip it.
7. **Fail fast locally:** the gate runs in seconds-to-minutes, not queue-minutes — iterate freely with `gate:fast`, push only green.

## Gate Receipts — Evidence Is an Artifact, Not a Sentence

`npm run gate:receipt` runs the same steps and writes `docs/gate-receipts/<UTC-stamp>.md`: timestamp, branch/commit, per-step exit code and key figures, and one verdict line. Steering prose then **cites the file path** and copies nothing (see `documentation-strategy.md`). Rules for the instrument:

- **Strip ANSI escapes** from captured output before parsing or writing it. A tool that colorizes for a terminal writes `\e[32m105 passed` into the artifact — unreadable to a reader and unparseable by a guard.
- **A step that cannot be green before the commit is informational.** The receipt is written while the work is still dirty, so a clean-tree check would make every honest receipt RED. Mark it informational, print what it found, keep it out of the verdict and the exit code.
- **Nested npm inherits the parent's env.** A step that shells out to `npm run …` must re-apply the wrapper's own env handling (the audit case above), or it fails for reasons that have nothing to do with the code.
- **Receipts are append-only and dated.** Never rewrite one to make a slice look green; the next run writes a new file.
- A guard asserts the cited receipts exist and their verdict is GREEN — so a citation cannot rot into a lie about a file that was never written.
- **A gate that cannot run is not a gate.** Any step whose pass depends on an external tool exits a distinct code when the tool never executed, and is verified through its real invocation path (hook → `npm run` → child), never only by running the underlying command by hand. Nested invocations inherit the parent toolchain's exported config; where a child refuses an inherited key, sanitize the child environment explicitly and document which keys were dropped and why dropping them cannot weaken the check. Exit-0 with unparsed, empty, or absent output is a failure, not a pass.
- **Never surface a single tool field as the whole error.** Print the tool's machine-readable code plus its human summary, with a fallback for blank values — a formatter that can emit `""` leaves the operator nothing to act on.

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
- The clean-working-tree gate (`git status --porcelain` must be empty post-build) runs in the pre-push hook, not in a cloud job — and stays out of any pre-commit artifact's verdict (see Gate Receipts).

## When a Team Demands Cloud CI

Local CI is the default; a team may add a cloud pipeline **in addition**, never instead. Even then, the local pre-push gate stays mandatory — cloud status checks become a confirmation layer, not the first line of defense.

## Cross-References

`ci-cd-philosophy.md` · `git-workflow-strategy.md` · `environment-management.md` · `cost-optimization-strategy.md` · `documentation-strategy.md` (receipts are cited, never copied) · `workflow-friction-audit.md` (how to find a mis-tiered gate)
