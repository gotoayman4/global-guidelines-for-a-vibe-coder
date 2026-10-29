---
status: "Normative"
scope: "Global"
tags: [ci-cd, local-ci, pre-push, cost, husky, gate-receipt, path-aware]
control: "guard:tiers"
---

# Local CI Strategy — Free, Cloud-Independent Quality Gates

---

CI does not require a cloud CI provider. Cloud Actions minutes are a paid quota that runs out; the local machine is free, always available, and already runs the same commands. All CI gates execute locally by default — no cloud CI service is required for any project to be compliant.

## The Three Tiers of Local CI

| Tier | When it runs | What it covers |
|---|---|---|
| **A — Pre-commit hooks** | Every commit | Staged-file lint, type check, format (`husky` + `lint-staged`) |
| **B — Pre-push gate** | Before every push | **The declared mode's** gate — see §Which Gate Runs. `ci-cd-philosophy.md` owns the full pipeline's *construction*; the mode decides how much of it a push runs |
| **C — act (optional)** | On demand | Validates existing `.github/workflows` files locally via Docker |

## The Loop Inside Tier A and Tier B (Mandatory in Practice)

The two named tiers are the boundaries; almost all agent time is spent between them. Without an intermediate loop, the developer runs the multi-minute gate after every edit (and starts skipping it) or runs it only at the end (and debugs a pile of breakage at once). Define both scripts in `package.json`:

| Script | Contents | Cost | When |
|---|---|---|---|
| `gate:fast` | `lint` + `type-check` + `test -- --run --changed` (only tests touched by the diff) | seconds | After every edit batch, during the slice |
| the pre-push hook | **the declared mode's gate**: `gate:fast` plus the `always` guard tier, the dependency audit and the clean-tree check in every mode; the rest per `speed-tiered-workflow.md` §The Gate Scales With the Mode | seconds (vibe) to minutes | Once, before the push |

- **`gate:fast` has two roles, and only one is evidence.** Run ad hoc after an edit batch, it is a convenience that moves cheap failures earlier — never cited as evidence of "verified". Run *as the declared pre-push hook* in `vibe`, it **is** that mode's gate: its result may be reported as the per-push gate result, and no further. What a mode defers — `vibe`: the full suite, the build, the ship-tier guards; `standard`: the build — is deferred to the **ship boundary**, which runs the full pipeline in every mode. Nothing is skipped; it is *deferred to a named boundary*.
- `--changed` trusts the diff to name the dependents. Anything a shared file can break without appearing in the diff (contracts, i18n parity, path-scoped suites) is exactly what the full gate is for.

## Which Gate Runs — the Mode Decides

The gate's *construction* is fixed here; **how much of it runs is the declared mode's decision**. The mode-to-gate mapping has one home — `speed-tiered-workflow.md` §The Gate Scales With the Mode — and it is not restated here: a second copy is how the `guarded` ship-boundary cell came to contradict the owner file.

`--no-verify` is forbidden in every mode. Deferring a step to the ship boundary is not skipping it — it is running it where it can still catch something, instead of forty times where it cannot. **A step that runs on every edit but only detects what a per-push run also detects is mis-tiered, not slow** (`workflow-friction-audit.md`).

## Guard Tiers — a Guard Declares When It Must Run

A suite whose every test runs on every push grows without bound, because its cost becomes a function of the repo's age rather than its risk. Give each guard a tier in its own file-level docblock — `@tier always | standard+ | ship` — and let the gate derive the set from the guards themselves:

| Tier | Runs | Belongs here |
|---|---|---|
| `always` | every push, in every mode | security controls, honesty guards, structural invariants — cheap and non-negotiable |
| `standard+` | `standard`/`guarded` pushes, plus any `vibe` slice whose mode escalated | contract and parity guards |
| `ship` | the ship boundary, in every mode | critical-flow E2E, the deny matrix, the full suite |

The tier is declared in the guard's own file-level docblock, and **`npm run guard:tiers` is the control**: it fails a guard with no `@tier`, a guard no npm script runs, an `always` guard the gate never reaches, and a `ship` guard the `vibe` chain reaches. A `standard+` guard the gate does not reach is *reported, never failed* — three guards in this repo are milestone- or fleet-scoped by design, and naming them is what makes that a decision instead of an accident. **Derive the set from the guards themselves** — a list kept by hand in the hook is a list that goes stale, and it fails in the direction nobody notices. Measured when the control was written (2026-10-12): 9 guards, 1 tier declared, 3 reached by the gate.

**The `standard+` tier needs a command, or it is a tier nobody can enter.** `npm run validate` is the repo's always-run gate (both `always` guards plus four `standard+` ones). The three `standard+` guards it does not reach are run on their own before a milestone exit — `npm run docs:check` (documentation freshness), `npm run status:projects` (project freshness) and `npm run sync:drift` (delivered mirror) — and `npm run guard:tiers` names that set, so the obligation is visible rather than remembered. They are deliberately **not** folded into `validate`: that would make `always` and `standard+` one tier and delete the distinction the `@tier` field exists to express. A project's pre-push hook derives its own `standard+` set from the guards themselves (§Tier B).

## Suite Scope — the Same Derivation One Level Down

A step that runs forty suites is a set, and a set with no selection rule makes that step's cost a function of the repo's age again (§Guard Tiers). Each suite declares in its own header docblock what it can possibly observe — `@scope <path-glob>`, repeatable — and the runner derives the selection from the declarations, exactly as the hook derives the guard set:

- **An undeclared or unparseable scope SELECTS the suite.** The default is more coverage, never less. A filter that reads "I could not parse this" as "nothing matched" deletes coverage and stays green — exit-0-on-empty-output again, one level down.
- **The path trigger decides *whether* the step runs; the scope decides *which of its suites* run.** Both read what the files themselves declare, so neither list can go stale in the hook.
- **A partial run reports its population.** The artifact prints the scope it selected and the count *within that scope*. A subset that reports the fleet-wide figure — `45/45 green` after twelve ran — is a false measurement, and every prose that later cites the receipt propagates the lie.
- **A scope line is a claim about what a suite can detect**, so the first run that skips anything prints the skipped list and a human reads it. Adding declarations is not a speed win until somebody has looked at what they exclude.

This repo has no suite to scope, so the control lives in the project's runner — and the control it MUST carry is a test proving that an unreadable declaration SELECTS the suite. A scope parser without that test is the wish this file outlaws elsewhere.

## Tier B — The Pre-Push Gate (Mandatory)

Before every push, run that mode's gate locally. This gate replaces the cloud CI gate: a push that has not passed it is a violation, the same as merging on a red pipeline.

1. Install husky once per project: `npx husky init`, then define `.husky/pre-push`. **The hook branches on the declared `mode`** — it is not the full pipeline unconditionally:

   ```sh
   if [ "$MODE" = "vibe" ]; then
     run_step gate:fast               # lint + type-check + changed tests
     # always-tier guards: run the project's derived set here (§Guard Tiers)
   else
     run_step lint
     run_step type-check
     run_step test -- --run           # the full suite — a mode defers the BUILD, never the suite
     if [ "$MODE" = "guarded" ]; then
       run_step build
       # path-triggered extras: run each only when its subtree changed
     fi
   fi
   run_step audit:gate                # every mode
   # release push only (GS_RELEASE_GATE / .release-override): run_step guard:ship -- --class "$RELEASE_CLASS"
   # clean-tree, content-based (rule 4) — every mode
   ```

   The `vibe` branch MUST NOT call the full suite (`npm test -- --run`): `gate:fast` already runs the tests the diff touches, and the suite is a ship-boundary step. The `standard` branch MUST NOT call the build: every release builds the artifact it deploys, so a build break surfaces at the ship boundary, never in front of a user. `guarded` adds the build and the path-aware extras — it is the mode chosen where an unbuilt artifact must not reach the merge. Each step goes through the `run_step` helper (the scaffold writes it), never an `&&` chain: a chain reports a generic npm failure and cannot name the required script that is missing.

   Map each step to the project's actual script names (`[FILL]` in starter templates). Read the mode from `WORLD.md` (the sole owner of the value) rather than hard-coding a second copy of it. **Writing the full pipeline unconditionally is the defect this branch exists to prevent:** it makes `vibe` pay `standard`'s cost on every push, and a project then "fixes" the slowness by skipping the gate — the one outcome that is forbidden.
2. **The hook header comment is the normative list.** Write the step order once, as a `# Order: a → b → c` comment at the top of `.husky/pre-push`; every other document links to it. Measured in production: two hand-kept copies of one step list had already drifted apart.
3. **The dependency audit runs through the project's own wrapper** (`npm run audit:gate`), never a bare `npm audit`. A bare `npm audit` that cannot reach the registry reports nothing and exits 0 — an unreachable registry MUST exit non-zero, never a silent pass.
   The wrapper owns the reasoned, expiring allowlist (each entry: why, what, review-by date) and the npm flags its sandbox needs: `npm audit` inside a lifecycle script needs script execution disabled, so pin that env var in the wrapper, not in the developer's shell.
4. **Clean-tree check:** the working tree must be clean after the gate (after the build, in `guarded`), decided on content — `git diff --quiet HEAD` plus untracked `git ls-files --others --exclude-standard` — never on git's stat cache, which reports a file as modified when its worktree blob matches the index. It belongs in the hook, not a cloud job.
5. **Conditional steps, two conditions.** A step that takes minutes and protects a subtree (E2E over the data layer, the desktop shell's IPC tests) runs only when that subtree changed; a step whose tier is `ship` runs only at the ship boundary. Put the trigger in the hook **next to the step it gates**, so trigger and check cannot drift apart. A security-relevant pin is not a convenience: if it is the only place a check runs, it stays in the gate.
6. **Skip is forbidden:** `git push --no-verify` is forbidden exactly like `--no-verify` on commit hooks. If the gate is slow, fix the gate (tier it, scope it by path or mode, cache it) — never skip it. **A required step whose npm script is missing FAILS the gate with a message**, in every mode — the `vibe` branch requires `gate:fast`; `standard` requires `lint`, `type-check` and `test`; `guarded` also requires `build`. Skipping it and reporting green is how a project with no `build` script ships unbuilt code under a passing gate.
7. **Fail fast locally:** the gate runs in seconds-to-minutes, not queue-minutes — iterate freely with `gate:fast`, push only green.

## Gate Receipts — Evidence Is an Artifact, Not a Sentence

`npm run gate:receipt -- --class pilot|production` runs the boundary chain and writes `docs/gate-receipts/<UTC-stamp>.md`: timestamp, branch/commit, release class, per-step result, and one verdict line. `new-project.js` seeds a working `scripts/gate-receipt.js` (lint → type-check → full suite → build → audit wrapper, plus `test:e2e` for `production` or `--e2e`; a missing script FAILS the receipt, and the first failure stops the run). Steering prose then **cites the file path** and copies nothing (see `documentation-strategy.md`). An echo-only placeholder is not a receipt — it writes no evidence. **A release push is checked against it:** the hook runs the `ship`-tier `check-ship-receipt.js`, which passes only when the newest receipt says PASS, is at least as deep as the class being shipped, and describes this code (its commit is HEAD, or only `docs/gate-receipts/` changed since).

**Cadence — a receipt is a boundary artifact, not an iteration check.** Routine slices use the fast loop and the declared pre-push gate; do not run `gate:receipt` after every slice or edit batch. Run it once at a milestone or release exit, after the code is final and committed. Add `--e2e` when that boundary requires the end-to-end matrix. This changes only how often the full evidence artifact is generated: it does not defer or remove any per-push, path-triggered, or other security check. If a record cites full-gate figures, cite a receipt from the exact tree those figures describe; never reuse a stale receipt or imply that a fast-loop result proves the full gate. The wrapper cannot run the critical-flow checks (LTR and RTL) or rollback readiness — it says so in the receipt, and those need the project's own evidence.

Rules for the instrument:

- **Strip ANSI escapes** from captured output before parsing or writing it. A tool that colorizes for a terminal writes `\e[32m105 passed` into the artifact — unreadable to a reader and unparseable by a guard.
- **The seeded wrapper refuses a dirty tree**, because a receipt must describe one commit. A project-owned receipt that tolerates one must mark any step that cannot be green before the commit (a clean-tree check) as informational: print what it found, keep it out of the verdict and the exit code.
- **Nested npm inherits the parent's env.** A step that shells out to `npm run …` must re-apply the wrapper's own env handling (the audit case above), or it fails for reasons that have nothing to do with the code.
- **Receipts are append-only and dated.** Never rewrite one to make a slice look green; the next run writes a new file.
- **A receipt is a bounded summary, never a pasted tool log.** Per-step exit codes, key figures, and the verdict are the artifact. The raw logs of an investigation — repro dumps, repeat-run captures, contention traces — are session scratch: they belong to the gitignored `scratch/` home, never to `docs/gate-receipts/` and never to a commit. A hundred-kilobyte `.txt` committed as "evidence" is a log file wearing a receipt's name, and the guards that police receipts then inherit a corpus nobody should have committed.
- Cite only a receipt that exists and whose verdict is GREEN; a pointer to a file the gate never wrote is a false record.
- **A cached step is keyed on content and says it was cached.** Memoising a gate step is legitimate only where the step's signal is a function of the content the key covers — a tree hash (`git write-tree`) for anything that walks the working tree, a lockfile hash for the dependency audit — never a timestamp, an mtime heuristic, or "the last run was recent". **The audit key expires:** its real input is the advisory database, which changes while the lockfile does not, so a cache may shortcut the loop and the ship boundary re-audits regardless of the key. The receipt records the key and marks the step `cached (<key>)`, so a cached green is distinguishable from a run green. **A step whose soundness was never measured at the gate is not eligible:** the loop may cache a step freely, a gate caches only what has been measured sound where it runs. A receipt that caches nothing prints `cached: none` — the absence of that line is what a silent cache looks like.
- **A gate that cannot run is not a gate.** Any step whose pass depends on an external tool exits a distinct code when the tool never executed, and is verified through its real invocation path (hook → `npm run` → child), never only by running the underlying command by hand. Nested invocations inherit the parent toolchain's exported config; where a child refuses an inherited key, sanitize the child environment explicitly and document which keys were dropped and why dropping them cannot weaken the check. Exit-0 with unparsed, empty, or absent output is a failure, not a pass.
- **A step that cannot START is not a step that found nothing.** On a Windows host where a filesystem filter driver intercepts them, libuv's *synchronous pipe* path (`execSync`, `execFileSync`, piped `spawnSync`) returns `EBUSY` while async `spawn` and `stdio:'ignore'` both succeed. A harness built on the sync forms therefore fails to *collect* rather than to *fail*, and its empty output reads as a pass. Capture a child through the async path or an inherited file handle (`global-configs/scripts/lib/run-sync.js` exists for exactly this), and give a start failure its own exit code — never an empty result set.
- **Never surface a single tool field as the whole error.** Print the tool's machine-readable code plus its human summary, with a fallback for blank values — a formatter that can emit `""` leaves the operator nothing to act on.
- **A tool that writes into the project must ignore what it writes.** The `clean-tree` step fails on an untracked path, so a scratch directory a sync tool creates and forgets to ignore blocks a documented gate in every project it touches. Keep the ignored set in **one** place and derive it — `sync-manifest.json` declares a `gitignoreEntry` per section and each writer reads that set — because four hand-kept copies of one list is how `.guidelines-backups/` came to be in none of them. Test the set against the paths the writers actually build, so the next one added fails at the moment it is written.
- **A session's scratch has one ignored home.** The clause above covers what a *tool* writes; the same failure has a second author. A working session writes probes, captured logs, patch files and one-off analysis scripts, and root-level scatter does three kinds of damage at once: `clean-tree` trips on the ones nobody ignored, `git add -A` commits the ones somebody did, and the next session reads them as documents. Put them in one gitignored directory (`scratch/`), have every writer add its own path to the ignored set — the same derivation as above — and **stage by path, never `-A`**, in a tree that can hold scratch. Scratch is never evidence: it belongs in no receipt and no record.
- **A tool must not rewrite a file whose content it did not change.** An unconditional write turns a no-op sync into a diff, and a diff is a review the next reader pays for. When merging into a project file — `.vscode/settings.json`, a per-tool rule file — compare first and write nothing when every value already matches. This is not only tidiness: the write path is host-dependent, so a run under a different shell reformats as it writes. `ConvertTo-Json` on Windows PowerShell 5.1 emits a BOM, a 4-space indent, `":  "` and no trailing newline, while 7.x emits clean 2-space — and `sync-all.js` spawns the 5.1 host, so the noise is guaranteed on every fleet run. Measured 2026-10-12: four projects showed a 24-line diff for a file whose values never changed.

## Closing a Slice — the Commit Is the Record

A slice closes with its commit; there is no close-out command. The commit message states the change in one sentence, a trigger-table match updates the fact's one home in the same iteration, and an irreversible decision gets an ADR written in the same pass. At a milestone or release exit, cite the boundary receipt by path when the record needs full-gate figures. What was retired on 2026-10-27: the derived decision number, the per-slice changelog entry written by a script, machine-written freshness headers, and the three-site ADR index — each derived a fact the repository already records, and none of them caught a wrong answer.

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
- The clean-working-tree gate (content-based — `git diff --quiet HEAD` plus untracked `git ls-files --others --exclude-standard`, rule 4) runs in the pre-push hook in every mode, not in a cloud job — and stays out of any pre-commit artifact's verdict (see Gate Receipts).

## When a Team Demands Cloud CI

Local CI is the default; a team may add a cloud pipeline **in addition**, never instead. Even then, the local pre-push gate stays mandatory — cloud status checks become a confirmation layer, not the first line of defense.

## Cross-References

`ci-cd-philosophy.md` · `git-workflow-strategy.md` · `environment-management.md` · `cost-optimization-strategy.md` · `documentation-strategy.md` (receipts are cited, never copied) · `workflow-friction-audit.md` (how to find a mis-tiered gate)
