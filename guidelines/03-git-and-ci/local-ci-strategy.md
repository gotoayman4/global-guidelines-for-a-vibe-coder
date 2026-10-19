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
| the pre-push hook | **the declared mode's gate** (§Which Gate Runs): `gate:fast` + the `always` guard tier in `vibe`; the full pipeline in `standard`/`guarded` | seconds (vibe) to minutes | Once, before the push |

- **`gate:fast` has two roles, and only one is evidence.** Run ad hoc after an edit batch, it is a convenience that moves cheap failures earlier — never cited as evidence of "verified". Run *as the declared pre-push hook* in `vibe`, it **is** that mode's gate: its result may be reported as the per-push gate result, and no further. What `vibe` defers — the full suite, the build, the ship-tier guards — it defers to the **ship boundary**, which runs the full pipeline in every mode. Nothing is skipped; it is *deferred to a named boundary*.
- `--changed` trusts the diff to name the dependents. Anything a shared file can break without appearing in the diff (contracts, i18n parity, path-scoped suites) is exactly what the full gate is for.

## Which Gate Runs — the Mode Decides

The gate's *construction* is fixed; **how much of it runs is the declared mode's decision** (`speed-tiered-workflow.md` §The Gate Scales With the Mode):

| Mode | Per push | At the ship boundary |
|---|---|---|
| `vibe` | `gate:fast` + the `always` guard tier | the full pipeline |
| `standard` | the full pipeline | the full pipeline |
| `guarded` | the full pipeline + the path-aware extras | the full pipeline |

`--no-verify` is forbidden in all three. Deferring a step to the ship boundary is not skipping it — it is running it where it can still catch something, instead of forty times where it cannot. **A step that runs on every edit but only detects what a per-push run also detects is mis-tiered, not slow** (`workflow-friction-audit.md`).

## Guard Tiers — a Guard Declares When It Must Run

A suite whose every test runs on every push grows without bound, because its cost becomes a function of the repo's age rather than its risk. Give each guard a tier in its own file-level docblock — `@tier always | standard+ | ship` — and let the gate derive the set from the guards themselves:

| Tier | Runs | Belongs here |
|---|---|---|
| `always` | every push, in every mode | security controls, honesty guards, structural invariants — cheap and non-negotiable |
| `standard+` | `standard`/`guarded` pushes, plus any `vibe` slice whose mode escalated | contract and parity guards |
| `ship` | the ship boundary, in every mode | critical-flow E2E, the deny matrix, the full suite |

The tier is declared in the guard's own file-level docblock, and **`npm run guard:tiers` is the control**: it fails a guard with no `@tier`, a guard no npm script runs, an `always` guard the gate never reaches, and a `ship` guard the `vibe` chain reaches. A `standard+` guard the gate does not reach is *reported, never failed* — six guards in this repo are milestone- or fleet-scoped by design, and naming them is what makes that a decision instead of an accident. **Derive the set from the guards themselves** — a list kept by hand in the hook is a list that goes stale, and it fails in the direction nobody notices. Measured when the control was written (2026-10-12): 9 guards, 1 tier declared, 3 reached by the gate.

**The `standard+` tier needs a command, or it is a tier nobody can enter.** `npm run validate` is the `always` gate — every push, in every mode. A repo whose only two commands are `validate:fast` and `validate` has no way to run its `standard+` guards at all: they pass `guard:tiers` (which reports them, as designed), they run in downstream projects, and they never once execute against this repo's own corpus. That is not a tier, it is a directory listing. `npm run validate:standard` closes it — it runs the four `standard+` guards in this repo:

| Guard | What it checks here |
|---|---|
| `guard:gate-wording` | the retired gate phrasings are absent and the canonical statements present, across the corpus |
| `guard:decisions` | the ADR index agrees with the ADR files — reports "not applicable" where a repo keeps no `docs/adr/`, and exits 0 |
| `guard:breadth` | a commit that changed product source wrote no more steering files than the mode allows; a source-free commit is exempt |
| `docs:check` | a trigger-like change landed alongside its steering doc — warn-only, never fails |

Measured 2026-10-13 before the command existed: all four passed against this repo, so the gap was reachability rather than a hidden failure. Run it before a milestone exit, or whenever a change touches the decision record, the steering-doc set, or gate wording. It is deliberately **not** part of `validate`: folding it in would make `always` and `standard+` the same tier and delete the distinction the `@tier` field exists to express.

## Tier B — The Pre-Push Gate (Mandatory)

Before every push, run that mode's gate locally. This gate replaces the cloud CI gate: a push that has not passed it is a violation, the same as merging on a red pipeline.

1. Install husky once per project: `npx husky init`, then define `.husky/pre-push`. **The hook branches on the declared `mode`** — it is not the full pipeline unconditionally:

   ```sh
   # mode = vibe      → the fast loop + the always tier
   npm run gate:fast && npm run test -- --run
   # mode = standard  → the full pipeline
   npm run lint && npm run type-check && npm test -- --run && npm run build
   # mode = guarded   → the full pipeline + the path-aware extras
   ```

   Map each step to the project's actual script names (`[FILL]` in starter templates). Read the mode from `WORLD.md` (the sole owner of the value) rather than hard-coding a second copy of it. **Writing the full pipeline unconditionally is the defect this branch exists to prevent:** it makes `vibe` pay `standard`'s cost on every push, and a project then "fixes" the slowness by skipping the gate — the one outcome that is forbidden.
2. **The hook header comment is the normative list.** Write the step order once, as a `# Order: a → b → c` comment at the top of `.husky/pre-push`; the constitution restates it (and a guard compares the two token-for-token), every other document links to it. Measured in production: two hand-kept copies of one step list had already drifted apart.
3. **The dependency audit runs through the project's own wrapper** (`npm run audit:gate`), never a bare `npm audit`. A bare `npm audit` that cannot reach the registry reports nothing and exits 0 — an unreachable registry MUST exit non-zero, never a silent pass.
   The wrapper owns the reasoned, expiring allowlist (each entry: why, what, review-by date) and the npm flags its sandbox needs: `npm audit` inside a lifecycle script needs script execution disabled, so pin that env var in the wrapper, not in the developer's shell.
4. **Clean-tree check:** `git status --porcelain` must be empty after the build. It belongs in the hook, not a cloud job.
5. **Conditional steps, two conditions.** A step that takes minutes and protects a subtree (E2E over the data layer, the desktop shell's IPC tests) runs only when that subtree changed; a step whose tier is `ship` runs only at the ship boundary. Put the trigger in the hook **next to the step it gates**, so trigger and check cannot drift apart. A security-relevant pin is not a convenience: if it is the only place a check runs, it stays in the gate.
6. **Skip is forbidden:** `git push --no-verify` is forbidden exactly like `--no-verify` on commit hooks. If the gate is slow, fix the gate (tier it, scope it by path or mode, cache it) — never skip it.
7. **Fail fast locally:** the gate runs in seconds-to-minutes, not queue-minutes — iterate freely with `gate:fast`, push only green.

## Gate Receipts — Evidence Is an Artifact, Not a Sentence

A project-owned `npm run gate:receipt` runs the same steps and writes `docs/gate-receipts/<UTC-stamp>.md`: timestamp, branch/commit, per-step exit code and key figures, and one verdict line. Steering prose then **cites the file path** and copies nothing (see `documentation-strategy.md`). An echo-only placeholder is not a receipt — it writes no evidence. Rules for the instrument:

- **Strip ANSI escapes** from captured output before parsing or writing it. A tool that colorizes for a terminal writes `\e[32m105 passed` into the artifact — unreadable to a reader and unparseable by a guard.
- **A step that cannot be green before the commit is informational.** The receipt is written while the work is still dirty, so a clean-tree check would make every honest receipt RED. Mark it informational, print what it found, keep it out of the verdict and the exit code.
- **Nested npm inherits the parent's env.** A step that shells out to `npm run …` must re-apply the wrapper's own env handling (the audit case above), or it fails for reasons that have nothing to do with the code.
- **Receipts are append-only and dated.** Never rewrite one to make a slice look green; the next run writes a new file.
- A guard asserts the cited receipts exist and their verdict is GREEN, and `slice:close --receipt` refuses to write a pointer to a file that was never written — so a citation cannot rot into a lie.
- **A gate that cannot run is not a gate.** Any step whose pass depends on an external tool exits a distinct code when the tool never executed, and is verified through its real invocation path (hook → `npm run` → child), never only by running the underlying command by hand. Nested invocations inherit the parent toolchain's exported config; where a child refuses an inherited key, sanitize the child environment explicitly and document which keys were dropped and why dropping them cannot weaken the check. Exit-0 with unparsed, empty, or absent output is a failure, not a pass.
- **Never surface a single tool field as the whole error.** Print the tool's machine-readable code plus its human summary, with a fallback for blank values — a formatter that can emit `""` leaves the operator nothing to act on.
- **A tool that writes into the project must ignore what it writes.** The `clean-tree` step fails on an untracked path, so a scratch directory a sync tool creates and forgets to ignore blocks a documented gate in every project it touches. Keep the ignored set in **one** place and derive it — `sync-manifest.json` declares a `gitignoreEntry` per section and each writer reads that set — because four hand-kept copies of one list is how `.guidelines-backups/` came to be in none of them. Test the set against the paths the writers actually build, so the next one added fails at the moment it is written.
- **A tool must not rewrite a file whose content it did not change.** An unconditional write turns a no-op sync into a diff, and a diff is a review the next reader pays for. When merging into a project file — `.vscode/settings.json`, a per-tool rule file — compare first and write nothing when every value already matches. This is not only tidiness: the write path is host-dependent, so a run under a different shell reformats as it writes. `ConvertTo-Json` on Windows PowerShell 5.1 emits a BOM, a 4-space indent, `":  "` and no trailing newline, while 7.x emits clean 2-space — and `sync-all.js` spawns the 5.1 host, so the noise is guaranteed on every fleet run. Measured 2026-10-12: four projects showed a 24-line diff for a file whose values never changed.

## Slice Close — the Steering Writes Are Derived Too

A receipt proves the gate ran. The rest of what a slice owes — the changelog entry, the decision number, the freshness line — was still typed by hand, and a hand-typed derived fact decays. `npm run slice:close` writes them from the repository's own state:

```sh
npm run slice:close -- --title "the login form gains a Retry" --doc AGENTS.md --receipt docs/gate-receipts/<stamp>.md
```

| It writes | Derived from |
|---|---|
| `docs/changelog/<YYYY>-Q<n>.md` — the dated entry | today's date · `git rev-parse --short HEAD` · `--title` |
| the next decision number, `D<max+1>` | the numbers already present in the docs **and** the archives — never a counter kept in a file |
| the freshness line on `WORLD.md` / `docs/AI_ARCHITECTURE.md` | the same date and SHA, when the slice's `--doc` names that file and it carries one |

**`--adr` adds the decision's three sites, because all three restate what the repository already knows:**

| It writes | Derived from |
|---|---|
| `docs/adr/<NNN>-<slug>.md` — the lite ADR, header filled | the derived number, the date, `--title`; the **body is `--why`, authored by the caller** |
| the row in `docs/adr/README.md`'s index table | the number, the file name, the title, the depth |
| the row in the decisions log (`docs/PRD.md` §24, or `docs/DECISIONS.md`) | the number, the title, `--why` |

`--why` is **required** with `--adr`: the reasoning is the one part this script must not invent, and a row without it is a placeholder. A **full-depth ADR is authored by the agent** and passed with `--adr-file` — the script then adds the two rows and leaves the file byte-identical. Measured motivation: a project recorded 50 decisions and hand-wrote 100 index rows, each of which is a copy of a fact already in the ADR (`GAMS_WORKFLOW_SPEED_ANALYSIS_2026-10-12.md` §2.4).

`npm run guard:decisions` (`check-decision-index.js`) is the control: it fails when an ADR file has no index row, when a row points at a file that does not exist, and when the same ADR is listed twice. An ADR whose decision is not yet in the log is a **warning** — work in flight must not fail the gate — and becomes a failure under `--strict` at a milestone exit.

`npm run guard:breadth` (`check-doc-breadth.js`) is the control on the other side of §Record vs Ritual: a slice that changes product source may write only as many steering files as `WORLD.md`'s mode allows, and a commit that changes no source is a **ritual commit** and is exempt, because the full set is its job. The breadth and the file set are read from `documentation-strategy.md` §Trigger Table, so the guard follows an edit to the column instead of restating it — and a table it cannot read is reported as vacuous, never as a pass.

`--duration <minutes>` records **intent → first running slice** in the entry (`**Intent→slice:** 42m`). `speed-tiered-workflow.md` §Absolute Rules 5 mandates the measurement and nothing captured it; an unmeasured slice records nothing rather than a fabricated `0m`.

`--dry-run` prints the plan and writes nothing; `--decision` overrides the derived number when a concurrent session took it. **Prose stays human:** the acceptance body and the ADR's `--why`. Everything else is a fact the repository already knows — and a fact a machine writes cannot be forgotten, mistyped, or raced.

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
