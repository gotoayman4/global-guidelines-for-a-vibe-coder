---
status: "Normative"
scope: "Global"
tags: [speed, modes, vibe, standard, guarded, ceremony, ship-boundary, release-class, context-budget, escalation]
---

# Speed-Tiered Workflow — Vibe / Standard / Guarded Modes

---

Speed is a first-class metric alongside accuracy: when a loop feels slow, the fix starts from a measurement of where the minutes went, never from adding ceremony. One process does not fit a throwaway prototype and a payment system — a declared mode scales **context, plan, test, verification, steering and gate** ceremony. The ship boundary, not every loop iteration, is where quality hardens — and the release class sets how hard (§Release Classes).

## Mode Declaration

The project declares its current mode in `WORLD.md` (`mode: vibe | standard | guarded`). **The mode is a loop-speed setting, not a lifecycle stage.** It measures how much ceremony the steady inner loop pays; it is not a statement that the app is unshipped. A project MAY run `vibe` or `standard` after its first release — most apps ship early for live testing or a pilot, and that release does not change what the loop should cost. A starter defaults to `vibe`; a release never changes that line — the release override deepens the boundary push, not the declared mode. A project with no declared mode is assumed `standard`: its stage is unknown, so it must not silently receive the loosest tier (`global-configs/scripts/read-mode.js` — the shared reader; exit 2 means the caller runs the full chain). Record the reason for a steady-state mode change in its commit message, not as history in `WORLD.md`.

### Capability Declaration

Mode scales *process*; **capabilities** scale *which rule modules a project loads*. `WORLD.md` §Capabilities declares what the project IS — ``- **capabilities:** `web-ui, api, database, uploads, bilingual` `` (backticked, a list item in that section; `none` = universal core only). The sync (`inject-constitution-block.js`, reader `global-configs/scripts/lib/capabilities.js`) delivers an optional AGENTS.md module — Design & UX, Frontend Architecture, API Design, Web Security, RTL & Arabic, Performance — only when a capability it requires is declared; each fragment names its requirement in a `<!-- requires: … -->` line. **An undeclared (or all-unknown) declaration delivers every module**: the safe wrong answer is more rules, never fewer. Security, Testing, Git, Architecture core and AI Collaboration are universal and never gated. A rule needed by every session belongs in the universal core; a rule needed by one kind of project is gated.

**Path-scoped delivery (optional).** `npm run rules:paths -- <project> --apply` (`generate-path-rules.js`) renders the same gated fragments as native path-scoped rule files — `.claude/rules/*.md` (`paths:`), `.cursor/rules/*.mdc` (`globs:`), `.github/instructions/*.instructions.md` (`applyTo:`) — so a tool loads a module only while a matching file is in play. Files are marker-stamped; hand-written files of the same name are never overwritten, and only generated files are pruned. It is not part of the sync: run it where a project wants the module off the always-on path.

**Guardrail hooks.** Rules an agent can ignore become hooks it cannot: `npm run guardrails:install -- <project>` (`install-guardrails.js`) merges a Claude Code PreToolUse hook running `guard-command.js` (blocks `reset --hard`, `--no-verify`, force-push, `git add -A`, broad `rm -rf`; override one rule with `GUARD_ALLOW=<rule-id>`) and creates a `.husky/pre-commit` running `scan-secrets.js` on the staged diff (`secretscan:allow` marks a documented example). Both call the synced `_guidelines/` mirror and no-op until it exists. New projects get them from `new-project.js`.

**Measuring compliance.** `global-configs/evals/scenarios.json` holds rule-violation prompts (secret in code, destructive git, prompt injection, fake package, silent TODO, physical CSS direction…). Run them with the agent under test, record `{output, diff, commands}` per id, and score with `npm run eval:score -- results.json` (`score-compliance.js`). Score before and after a rule change; a drop in pass rate is a regression. It scores recorded runs — it does not drive a live model.

**The `_guidelines/` mirror costs nothing at boot.** It is gitignored, so gitignore-respecting agent search skips it, and no boot chain reads it unless a rule's `→ Source:` link is followed on demand — a decision recorded in lieu of restructuring the sync.

## The Mode Matrix

**A mode that does not change how much you read, how deeply you plan and test, or what the gate runs is a label, not a mode.** Every row below is a cost a session actually pays — not a description of how carefully it thinks.

| Dimension | vibe | standard | guarded |
|---|---|---|---|
| **Context** — mandatory boot-chain cap | **≤25K** | **≤60K** | **≤120K** |
| **Plan** | 3-bullet intent; no plan gate | feature plan for non-trivial; AI reviews | standard plan + architecture review |
| **Tests** | smoke run + regression test only when a bug bites twice or at milestone | behavioral tests with code; regression every fix | full pyramid + critical-flow E2E before ship |
| **Verification** | run it once + one-line report at the cheapest sufficient tier | evidence table by change type | full evidence for the whole change (security depth is never mode-scaled — Absolute Rule 1) |
| **Steering writes** | one home per trigger (identical in every mode); an ADR only for an irreversible decision | same | same |
| **Gate** — per push | **`gate:fast`** + the `always` guard tier | lint + type-check + the full suite | that chain + the build + the path-aware extras |
| **Commits** | conventional; related micro-edits MAY batch | every working increment | every working increment |

## The Context Budget — the row most projects ignore

The reading a session does before its first edit is the largest single cost it pays, and until this row existed no gate measured it. Budget it:

1. **Pick, do not hoard.** Name the 2–4 files the task needs. The reading list is a *menu*, not a checklist — reading all of it because it is mandated is the tax, not the safety.
2. **Two quantities — the chain and the menu — and only the chain is budgeted.** The **chain** is what `07-documentation/documentation-strategy.md` §The Mandated Doc Set marks `every session`: the floor a session cannot skip, and the only thing a mode cap governs. The **menu** is everything else the project carries — the spec, the roadmap, the runbooks, the ADR index — read by choice; it is ratcheted (rule 4), never budgeted, because a budget that also covers what you read by choice measures a library rather than a session. `node _guidelines/global-configs/scripts/measure-boot-budget.js <projectRoot>` reports both and charges `--max-tokens` to the chain alone; `--files` declares a project's own floor.
3. **Exceeding the cap is allowed, not free.** A session MAY read past its mode's budget; it MUST then record one line naming what it read and why the task needed it. An unrecorded overshoot is a violation; a recorded one is a decision.
4. **A cap that only rises is not a cap.** Re-base a file's cap only against its live measurement, and freeze the menu total as a high-water mark that may not be raised without retiring something. A ratchet pointed at a monotonic document — a living PRD, a roadmap that only appends — is a growth curve with a number next to it.
5. **The cap is enforced at the milestone, never mid-slice.** `node _guidelines/global-configs/scripts/measure-boot-budget.js . --max-tokens <the mode's cap> --strict` exits non-zero when the chain is over. Wire it as an npm script (`docs:boot:strict`) and make it a **milestone-exit criterion**: during a slice the instrument stays report-only, because a document overrun must not block a working increment — but a chain that has outgrown its cap is a decision the project owes, and at the exit it is paid. A measured overrun with no failing check is a number nobody acts on: a reference project read **14K tokens** at session start while its menu weighed **51K**, and the only figure anyone ever quoted was their **65K sum** — against the then-40K vibe cap. The wrong quantity was measured, so neither was ever fixed and no guard was wired for either (measured 2026-10-12).

## The Gate Scales With the Mode

`local-ci-strategy.md` owns how the gate is built; this file owns **how much of it runs**. One hook, three behaviours, and `--no-verify` forbidden in all three:

| Mode | What the hook runs per push | What it defers to the ship boundary |
|---|---|---|
| vibe | `gate:fast` (lint + type-check + the changed tests) + every guard in the `always` tier | the full suite, the ship-tier e2e, the build |
| standard | lint + type-check + the full suite | the build (the release builds anyway), the ship-tier e2e |
| guarded | standard's chain + the build + the path-aware extras | the ship-tier e2e |

The hook reads the declared `mode`, so a project changes its per-push cost by changing its mode — a dated, recorded act, not a hand-edit to the hook. **The build is the one pipeline step a push may defer without exposing a user to an unbuilt artifact:** every release builds, and deploys what it built, so a build break in `standard` surfaces at the ship boundary — never in front of a user. `guarded` keeps the build per push: it is the mode chosen where a broken artifact must be found before the merge lands, not at the next release. **Removing a check is never the optimisation**: the optimisation is running each check at the frequency its trigger actually needs (`workflow-friction-audit.md`).

**Receipt cadence is separate from gate cadence.** A full `gate:receipt` is a milestone or release artifact, never a per-slice one; `local-ci-strategy.md` §Gate Receipts owns what it records and when it runs.

## Release Classes — Shipping Does Not Change the Mode

Most apps ship long before they are final: a first deploy to test in the live environment, a demo, an internal pilot, a beta. Escalating the declared mode at each of those turns the mode into a lifecycle label that flips twice a week, and it stops measuring what it exists to measure — the loop's speed. The declared mode and the release class are separate decisions:

| Class | What it is | The boundary it owes |
|---|---|---|
| **pilot** | live testing, a demo, an internal/beta release — real users, non-final stakes | the full pipeline (lint → type-check → full suite → build) + automated E2E for **login/auth and permissions** (and pilot-exposed flows) on the deployed target, LTR (and RTL when `bilingual`) |
| **production** | the final/public launch users depend on | the pilot chain + every `ship`-tier guard (the full critical-flow E2E matrix: **login/auth, payments, permissions, and persistence**) + the path-aware extras + rollback readiness |

- **The declared mode does not change because you shipped.** A `vibe` or `standard` project ships a pilot from its declared mode; the class sets the boundary's depth, and the boundary runs in every mode.
- **Record the class at the release, not in `WORLD.md`:** the release tag, the commit message, or the gate receipt says `pilot` or `production`. The class describes one release; `WORLD.md` describes the steady loop.
- **A production release does not make the project permanently `guarded`.** After it ships, the loop returns to the declared mode. Escalate the declared mode on evidence about the loop — repeated silent regressions — never because a release happened.
- **Nothing is skipped — it is paid at the boundary.** A `vibe` loop defers the suite to the boundary; a `standard` loop defers the build. Both run there before a user sees the release.

## Absolute Rules (All Modes)

1. **Security never relaxes.** SQLi prevention, secrets, input validation, auth review, CORS, security headers, and magic-byte upload checks apply identically in every mode.
2. **No fake evidence.** NEVER claim tests pass without running them; NEVER present predictions as observations.
3. **Ship boundary hardens quality — the release class sets the depth.** Before any release or milestone exit: `pilot` releases verify **login/auth and permissions** (plus exposed pilot flows) via automated E2E in LTR (and RTL when `bilingual`), and **the full pipeline is green** — whatever the mode, and whatever the inner loop ran. A `production` release adds the full 4-flow critical-flow E2E matrix (login/auth, payments, permissions, persistence), the path-aware extras, and rollback readiness. A vibe loop may be loose; a ship may not.
4. **Fix the change; revert the approach.** A failing check on a sound change is fixed and re-run. After two failed fixes, follow the canonical stop → revert or stash if the approach is wrong → search official docs/web when unclear → regenerate with clearer constraints sequence (`agent-verification-loop.md` §Loop Steps). Never make a third blind attempt.
5. **Speed is measured, not felt.** If a mode feels slow, measure where the minutes went (reading, gate, rework) before adding or removing ceremony (`workflow-friction-audit.md`).

## Mode Transitions

Escalation is **automatic and evidence-based**. The table distinguishes permanent project changes from temporary slice verification. A slice escalation leaves the declared mode unchanged; state its trigger in the verification report.

| Trigger | Action |
|---|---|
| First release — pilot or production | nothing to `WORLD.md` — ship through the ship boundary at the class's depth (§Release Classes); the declared mode does not change |
| A `production` release | run the boundary at guarded depth; the declared mode still does not change |
| Same bug path bites twice | add the regression test immediately, regardless of mode |
| Auth, payments, or permissions touched | run that change's verification at guarded tier even while the loop runs in vibe |
| A `ship`-tier guard owns a changed path | run that guard set for this slice, in any mode |
| The same test file fails twice in one slice | escalate the slice to `standard`; say so in one line |
| Repeated silent regressions | escalate the project; run `workflow-friction-audit.md` |

### A Release Escalation Is an Override, Not an Edit

A release exit owes the full chain in two ways, and neither edits `WORLD.md`: the release process runs the boundary chain and writes the evidence (`npm run gate:receipt -- --class pilot|production` — the seeded `scripts/gate-receipt.js`, `local-ci-strategy.md` §Gate Receipts), and the push that carries the release runs through a **release override the gate reads** — `GS_RELEASE_GATE=pilot|production` or a gitignored `.release-override` marker holding the class — instead of editing the declared `mode` and editing it back a day later. A `pilot` override lifts `vibe` to the standard chain; a `production` override runs the guarded chain (the build per push, for that push); a deeper declared mode is untouched. On a release push the hook then runs the `ship`-tier `check-ship-receipt.js`, which passes only when the newest receipt says PASS, is at least as deep as the class being shipped, and describes this code (`Commit` is `HEAD`, or only `docs/gate-receipts/` changed since that commit; project-owned wrappers adding a `git write-tree` provenance hash verify that hash too per `local-ci-strategy.md`). The declared mode changes only when the project's **steady state** changes; a lift that lasts one release is an override. A project that flip-flops its declared mode every release pays two boot-file edits and a hook-behavior change per release, and its mode line stops meaning anything.

**The commit records a mode change; `WORLD.md` states the current mode and release override.** Git supplies the date and history. A separate transition log is not required (`documentation-strategy.md` §What Gets Recorded, and Where).

## Accepted Trade-offs by Mode

| Mode | Accepted risk | Absorbed by |
|---|---|---|
| vibe | no suite → silent regressions between milestones | milestone critical-flow checks; regression-on-second-bite |
| vibe | the fast loop can pass what the full pipeline would catch | the ship boundary runs the full pipeline; nothing is *skipped*, it is *deferred* to a named boundary |
| standard | a build break surfaces at the ship boundary, not on the push | every release builds, and deploys what it built |
| standard | slower inner loop than vibe | `gate:fast` two-loop pattern |
| guarded | slowest loop | path-aware gates keep unrelated subtrees fast |

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Flip-flopping the declared mode for every release — or escalating it to ship | ship through the ship boundary at the release class's depth, with the release override; the mode is a loop-speed choice, not a lifecycle stage |
| Treating a pilot as a lower-quality release | a pilot owes the full pipeline + critical-flow checks (LTR, and RTL when `bilingual`); only the class's extra depth differs |
| guarded ceremony on a throwaway spike | demote to vibe — the ceremony protects nothing here |
| Treating mode as an excuse to skip security or honesty rules | Absolute Rules apply in every mode |
| Mode declared at bootstrap, never revisited | revisit at every milestone; record the change |
| A per-slice write to a plan document (PRD/ROADMAP/sprint plan) | plan docs close at the sprint boundary; a slice's record is its commit message (`planning-and-scoping.md`) |
| **A vibe session that reads the entire guideline corpus or duplicates steering facts** | Read the two mandatory steering files, then only task-relevant material; write each fact in its one home |
| **Reading everything "because the bootstrap mandates it"** | The on-demand corpus is a menu; name the files the task needs |
| **A cap re-based upward every time its file grows** | re-base only against live measurement; freeze the chain total |

## Key Takeaways

1. Declare the mode; let it scale context, plan, tests, verification, steering and gate — never security or honesty.
2. The mode is a loop-speed setting, not a lifecycle stage: `vibe` and `standard` keep shipping, and the release class — pilot or production — sets how hard the boundary checks.
3. The ship boundary is the hard quality gate; the loop inside is where speed is won.
4. Budget the reading and give every fact one home — that is most of the difference between a fast mode and a relabelled slow one.
5. Escalate on evidence, and measure where the minutes went before changing the process.

---

## Cross-References

- **Depends on:** `development-workflow.md` — the loop this scales, `documentation-strategy.md` — trigger table, `context-management-strategy.md` — the reading budget
- **Extended by:** `testing-philosophy.md`, `agent-verification-loop.md` — mode-scoped depth
- **Applied by:** `workflow-friction-audit.md` — speed measurement, `local-ci-strategy.md` — the gate this file sizes, `ai-collaboration-mindset.md` — speed as a metric
