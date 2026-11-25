# Ship Classes and a Lighter Per-Push Gate — Owner Decision

**Date:** 2026-10-28
**Decision class:** Doctrine and scaffold change, including one exported constitution line: the `20-testing` fragment's pre-push sentence said `standard`/`guarded` both ran the build per push, so it was narrowed to the ladder in §2.2 and `AGENTS.starter.md` re-rendered. This record **supersedes one line** of `LEAN_OPERATING_MODEL_DECISION_2026-10-27.md` §2 "Kept unchanged": the entry that described the gate as "`gate:fast` in vibe, full pipeline otherwise". The owner's instruction was:

> *"review again the speed modes to allow using vibe or standard modes even after shipping the app, because most of the time the app is shipped for live testing or in pilot, so we need to differenciate between initial shipping and final shipping. also review what standard/guarded run per push find opportunities to make this lighter and faster."*

**Scope:** `speed-tiered-workflow.md`, `local-ci-strategy.md`, `ci-cd-philosophy.md`, `workflow-friction-audit.md`, `_index/GLOSSARY.md`, `fragments/20-testing.md` → `AGENTS.starter.md`, `WORLD.starter.md` / `WORLD.example.md`, `new-project.js` + tests, `check-mode-conformance.js` + tests, the `first-project-setup` and `deploy-production` skills.
**Status:** applied in the working tree; `npm run validate` exits 0.

---

## 1. The problem

- **The doctrine tied the declared mode to the lifecycle.** It said a starter begins at `vibe` "until its first ship/milestone", and the transition table escalated the project at the first ship. Most apps ship early — a live test, a demo, a pilot, a beta — and that moment carries non-final stakes. Escalating there makes the mode a lifecycle label that flips with every release, and it stops measuring what it exists to measure: the inner loop's speed. The release override existed, but the doctrine still framed the first ship as an escalation.
- **`standard` and `guarded` both ran the full pipeline on every push.** The build is the slowest step, and it is the one whose failure the release catches anyway: every release builds the artifact it deploys. Paying it per push in `standard` bought nothing a type-check + suite push did not already catch before the release.

## 2. The decision

### 2.1 A release has a class; a mode is not a lifecycle stage

Two classes, recorded per release in the release tag, the deploy commit or the gate receipt — **never in `WORLD.md`**:

| Class | What it is | The boundary it owes |
|---|---|---|
| `pilot` | live testing, demo, internal/beta release | full pipeline (lint → type-check → full suite → build) + critical-flow checks LTR and RTL on the exposed flows |
| `production` | the final/public launch | the pilot chain + every `ship`-tier guard (full critical-flow E2E matrix) + path-aware extras + rollback readiness |

The declared mode does not change because a release happened. A `vibe` or `standard` project ships a pilot from its declared mode. A production release runs at guarded depth for that release, then the loop returns to the declared mode. Escalate the declared mode only on loop evidence (repeated silent regressions) — never because something shipped.

### 2.2 The per-push ladder

| Mode | Per push | Deferred to the ship boundary |
|---|---|---|
| `vibe` | `gate:fast` + every `always`-tier guard | the full suite, the build, the ship-tier e2e |
| `standard` | lint + type-check + the full suite | the build, the ship-tier e2e |
| `guarded` | standard's chain + the build + the path-aware extras | the ship-tier e2e |

The dependency audit and the content-based clean-tree check run in **every** mode. The build is the one step a push may defer because the release always builds the artifact it deploys — a build break surfaces at the ship boundary, never in front of a user. `guarded` keeps it per push by definition: it is the mode chosen where an unbuilt artifact must not reach the merge.

### 2.3 Scaffold and guard

- `.husky/pre-push` is generated with a three-branch shape (`vibe` / non-vibe / nested `guarded`), every step through the `run_step` helper. `standard` no longer requires a `build` script; `guarded` does.
- `check-mode-conformance.js` evaluates **reachability** under `MODE=vibe` across nested `if` / `elif` / `else` frames, with `=` / `!=` polarity and three-valued logic. A step behind a nested `guarded` test is not charged to `vibe`; a step in an unevaluable mode branch is.

## 3. Rejected optimisations — recorded so they are not re-proposed

| Rejected | Why |
|---|---|
| Diff-scope the `standard` suite (`--changed`) | contracts, i18n parity and path-scoped suites break without appearing in the diff; that gap is exactly what `standard` exists to catch |
| Cache the dependency audit on a lockfile hash with no expiry | the advisory database changes while the lockfile does not; a cache may shortcut the loop, and the ship boundary re-audits regardless of the key |
| Trigger the build on "build inputs changed" in the hook | pre-push runs after the commit, and identifying the pushed files needs a reliable remote base the hook does not have; the release builds anyway |
| Drop the suite from `standard` too | it is the one per-push check that catches behavioural regressions before a release; without it `standard` would run nothing the type checker does not |

## 4. What does not change

Security depth and honesty rules in every mode; the dependency audit and clean-tree in every mode; the full pipeline at the ship boundary in every mode; `--no-verify` forbidden; guard tiers (`always` / `standard+` / `ship`) and `guard:tiers`; the release-override mechanism. The constitution keeps its security, testing-depth and evidence rules — only the pre-push sentence was narrowed to state which mode runs the build.

## 5. Verification

- `npm run validate` — audit, link/index/skills drift, census, guard tiers, mode conformance, script tests.
- New tests: `standard` runs lint + type-check + suite and **not** the build; `guarded` adds the build; a nested `guarded` build is not charged to `vibe`; an `elif` chain is evaluated branch by branch; the scaffold's own hook conforms.
- The lean benchmark is re-measured after this change; figures live in `LEAN_REFORM_BENCHMARK_2026-10-28.md` and are reproduced with `npm run benchmark:reform --json`.
