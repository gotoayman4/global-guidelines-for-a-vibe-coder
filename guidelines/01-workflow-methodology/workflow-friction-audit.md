---
status: "Normative"
scope: "Global"
tags: [workflow, friction, measurement, token-budget, gate, audit]
---

# Workflow Friction Audit — Measuring Where Agent Time Actually Goes

---

## Purpose

A time-and-motion audit of the agent workflow itself: where the minutes of a session actually go, and which of them are self-inflicted. Run it when a project that started fast has become slow and the code is not the suspect. Load after `development-workflow.md`; the output is a ranked fix list, not a refactor.

## Why This Is a Separate Audit

Correctness gates measure whether the product works. Nothing in a normal toolchain measures whether the **process** still pays for itself — so a workflow rots incrementally, each step looking reasonable in isolation: a six-figure-token boot chain, a full gate run after every edit, a change log eating a third of a file every session must read, the same table restated in four documents.

The cost never appears as a failing test, so it is never prioritised. That is why it needs its own audit and its own measurement script, not a paragraph of advice.

## When to Run

| Symptom | Likely bucket |
|---|---|
| A session spends more turns re-reading docs than editing code | Boot chain |
| The gate takes minutes and is run dozens of times per slice | Loop tiering |
| Steering-doc edits are the biggest single diff in the commit | Documented-vs-executed ratio |
| Two files state the same rule differently; nobody knows which wins | Missing single source of truth |
| "Tests pass" claims are re-verified by hand | Evidence not machine-written |
| A guard fails the day an unrelated improvement lands | Guard written against the old shape |
| **The project follows rules the central repo replaced weeks ago** | Delivery drift — the mirror was never compared |
| **A lesson was written up and never became a rule** | Proposal with no control |

## Method

**Run the instrument, not the method by hand.** `npm run audit:friction -- <projectRoot> --write` measures all four buckets in one pass and writes `docs/friction/<YYYY-MM-DD>.md`; `--json` emits the same numbers for a script, and `--check-cadence` exits 1 when the newest artifact is older than 35 days. A method with no command behind it is advice, and advice is not run on a schedule.

1. **Measure the reading budget, do not estimate it.** The instrument reports boot-chain tokens per file and the chain total against the cap `speed-tiered-workflow.md` owns, and flags a mandated file that is simply absent. `node _guidelines/global-configs/scripts/measure-boot-budget.js <projectRoot>` prints the same table with per-file detail (characters, `chars/4` tokens, longest paragraph, longest table row, dated-history share); the default is report-only so optional downstream files can be absent, and `--strict` fails an incomplete authoritative list.
   The executable non-vacuity guard is `guidelines/global-configs/scripts/tests/measure-boot-budget.test.js`; it must cover a clean corpus, missing inputs, history bodies, invalid flags, and a deliberately failing fixture.
   **Read every row, including the files you expected to be clean.** The heaviest history is usually in the document nobody calls a change log, and its shape may not be a `| YYYY-MM-DD |` row at all — a per-slice bold ledger (`**Change (previous):** …`) is counted when three or more entries occur in one section, not when unrelated sections are combined.
   A long line is two findings: a long paragraph is a formatting accident (wrap it), a long table row is a shape error (prose does not belong in a cell).
2. **Time the gate and classify each step by trigger frequency** — per edit, per slice, per push, per milestone. A step that runs on every edit but only detects what a per-push run also detects is mis-tiered, not slow. Give it a tier (`local-ci-strategy.md` §Guard Tiers) instead of arguing about it.
3. **Bucket the last 5 sessions** into: reading, editing, running, re-running, and *writing prose about what ran*. The last bucket is the one teams miss — transcribing a test count into a document is pure overhead, and it goes stale on the next commit. The instrument reports the aggregate of it as **doc lines per code line** over the last 40 commits; above ~0.5, the paperwork is competing with the code. Record **intent → first running slice (minutes)** per iteration: the speed metric from `speed-tiered-workflow.md` — a mode that feels fast but measures slow is misconfigured.
4. **Count copies of every canonical list** (trigger table, gate steps, forbidden patterns, version table). Every copy above one is a future divergence; one project measured three copies of a single trigger table, each stating a different set of triggers.
5. **Grep for hand-copied machine output** in docs: numbers of tests, coverage percentages, audit counts, build sizes. Each one is a claim that will be wrong without failing anything. **Then check the delivery**: is the project's `_guidelines/` mirror the current source? `npm run sync:drift` compares content hashes and fails on drift — a stale mirror means every other number here was measured against rules the project is not running.
6. **Rank fixes by repeated cost** (frequency × minutes), not by severity language. A 90-second tax paid 40 times a day outranks a 20-minute job done twice a month.

## Cadence

The audit is a **scheduled act**, not a reflex: monthly, as an automation, writing its artifact. `npm run audit:friction -- . --write --check-cadence` is the whole job. A project that has never written one has no evidence about its own process — which is the state every project is in until the first run.

## Fix Classes

| Finding | Fix | Detail |
|---|---|---|
| Always-read doc carries its own history | Relocate to dated archives, leave a pointer heading that keeps the old anchor | `documentation-strategy.md` §History |
| Prose stuffed into a table cell (rows of thousands of characters) | The prose leaves the table; the table stays a lookup | `documentation-strategy.md` §Directives 11 |
| Rule restated in N files | One canonical copy; every other site links | Guards refuse the restatement |
| Full gate per edit | Add a fast loop (lint + type-check + changed tests); keep the full gate per push | `local-ci-strategy.md` §Two Loops |
| Machine numbers in prose | Write a receipt artifact; prose cites its path | `local-ci-strategy.md` §Receipts |
| Minutes-long suite on every push | Make the step path-aware; keep the path list in the hook | `local-ci-strategy.md` |
| Guard that fails on an improvement | The guard follows the change in the same iteration, and gains a non-vacuity probe | `documentation-strategy.md` §Guards |
| Project runs a stale copy of the rules | Compare content hashes on every run; record the hash the sync delivered | `documentation-strategy.md` §Delivery, `npm run sync:drift` |
| A lesson with no failing check | The proposal names its target file **and** the guard | `documentation-strategy.md` §Guards, `npm run audit:friction` |

## Do Not

- **Never fix friction by skipping or weakening a gate that guards critical stability** (security, honesty of evidence, ship-boundary critical-flow checks, the full pre-push pipeline). Optimize the gate, tier it, or scope it by path — a fast workflow you cannot trust at ship time is not fast, it is deferred.
- **Process steps that guard nothing at the current mode's risk tier MAY be deferred or dropped** — recorded as a one-line accepted risk in the mode's trade-offs table (`speed-tiered-workflow.md`). If nobody can name what the step protects *right now*, its cost is pure tax.
- **Never bulk-rewrite history** to make a document smaller. Relocate it verbatim and prove the move against `git show HEAD:<path>`.
- **Never add a fifth copy of a list** to "make it easier to find". The pointer is the copy.
- **Never delete a guard because it went red** on the day the mandated improvement landed; that is the guard telling you it never covered the new shape.

## Anti-Patterns

| Anti-Pattern | Why It Fails / Consequence | Fix |
|---|---|---|
| "The workflow feels slow" with no numbers | Guesses target the wrong bucket; effort spent on a step nobody waits for | Measure chars, seconds, and turns first |
| Optimising the one-off cost | A 20-minute twice-a-month job is not the bottleneck | Rank by frequency × duration |
| Adding more onboarding docs to fix slow onboarding | Grows the boot chain that caused it | Move history out; add a pointer |
| Making the gate shorter by removing steps | Loses the coverage it existed for | Tier it: fast loop + per-push full gate |
| Recording verification results by hand | Goes stale silently, and reads as evidence | Machine-written receipt, cited by path |

## Key Takeaways

1. Audit the process on a schedule, with an instrument — `npm run audit:friction -- . --write --check-cadence`, monthly. No correctness gate will ever report it as a failure.
2. Measure tokens, seconds, and intent → first running slice — a felt bottleneck and the real one are usually different files, and the measurement's own heuristics need auditing too.
3. Tier every verification step by how often it must run and what the current mode's risk tier needs; the full gate is per push or per ship boundary, the loop is per edit, accepted-risk steps may be dropped with a note.
4. One canonical copy per rule; the guard refuses restatements instead of rewarding them.
5. Machine output is referenced, never transcribed — including the steering writes themselves.
6. **Check delivery before you check anything else.** A project running a stale mirror has measured every other number against the wrong rules.
7. Rank fixes by repeated cost. Small taxes paid often are the whole debt.

---

## Cross-References

- **Depends on:** `development-workflow.md` — the workflow being audited, `speed-tiered-workflow.md` — mode and speed metric, `context-management-strategy.md` — token budgets
- **Extended by:** `documentation-strategy.md` — the document-hygiene fixes, `local-ci-strategy.md` — the gate-tier and receipt fixes
- **Applied by:** `performance-audit.skill.md` (code performance is the sibling audit — different subject, same method)
