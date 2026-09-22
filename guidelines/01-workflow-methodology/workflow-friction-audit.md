# Workflow Friction Audit — Measuring Where Agent Time Actually Goes

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,800 tokens)
**Last Updated:** 2026-09-22
**Cross-References:** `documentation-strategy.md`, `local-ci-strategy.md`, `context-management-strategy.md`

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

## Method

1. **Measure the reading budget, do not estimate it.** For every file the bootstrap list mandates: characters, `chars/4` tokens, line count, longest paragraph, longest table row, dated-history share. `node _guidelines/global-configs/scripts/measure-boot-budget.js <projectRoot>` prints the table and flags anything over threshold. Report the numbers; do not restate them in a document afterwards.
   The default is report-only so optional downstream files can be absent; add `--strict` when `--files` names an authoritative chain, where any missing file fails and an entirely missing corpus is a data error.
   The executable non-vacuity guard is `guidelines/global-configs/scripts/tests/measure-boot-budget.test.js`; it must cover a clean corpus, missing inputs, history bodies, invalid flags, and a deliberately failing fixture.
   **Read every row, including the files you expected to be clean.** The heaviest history is usually in the document nobody calls a change log, and its shape may not be a `| YYYY-MM-DD |` row at all — a per-slice bold ledger (`**Change (previous):** …`) is counted when three or more entries occur in one section, not when unrelated sections are combined.
   A long line is two findings: a long paragraph is a formatting accident (wrap it), a long table row is a shape error (prose does not belong in a cell).
2. **Time the gate and classify each step by trigger frequency** — per edit, per slice, per push, per milestone. A step that runs on every edit but only detects what a per-push run also detects is mis-tiered, not slow.
3. **Bucket the last 5 sessions** into: reading, editing, running, re-running, and *writing prose about what ran*. The last bucket is the one teams miss — transcribing a test count into a document is pure overhead, and it goes stale on the next commit.
4. **Count copies of every canonical list** (trigger table, gate steps, forbidden patterns, version table). Every copy above one is a future divergence; one project measured three copies of a single trigger table, each stating a different set of triggers.
5. **Grep for hand-copied machine output** in docs: numbers of tests, coverage percentages, audit counts, build sizes. Each one is a claim that will be wrong without failing anything.
6. **Rank fixes by repeated cost** (frequency × minutes), not by severity language. A 90-second tax paid 40 times a day outranks a 20-minute job done twice a month.

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

## Do Not

- **Never fix friction by skipping or weakening a gate.** Optimize the gate, tier it, or scope it by path — a fast workflow you cannot trust is not fast, it is deferred.
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

1. Audit the process on a schedule; no correctness gate will ever report it as a failure.
2. Measure tokens and seconds — a felt bottleneck and the real one are usually different files, and the measurement's own heuristics need auditing too.
3. Tier every verification step by how often it must run; the full gate is per push, the loop is per edit.
4. One canonical copy per rule; the guard refuses restatements instead of rewarding them.
5. Machine output is referenced, never transcribed.
6. Rank fixes by repeated cost. Small taxes paid often are the whole debt.

---

## Cross-References

- **Depends on:** `development-workflow.md` — the workflow being audited, `context-management-strategy.md` — token budgets
- **Extended by:** `documentation-strategy.md` — the document-hygiene fixes, `local-ci-strategy.md` — the gate-tier and receipt fixes
- **Applied by:** `performance-audit.skill.md` (code performance is the sibling audit — different subject, same method)
