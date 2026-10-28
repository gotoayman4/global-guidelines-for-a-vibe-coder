# Lean Reform Benchmark — 2026-10-28

**Subject:** the model this repo delivers to downstream projects — the starter templates and the
guideline corpus — not this repo's own `AGENTS.md`.
**Baseline:** `ec55a54` (last pre-reform commit). **After:** the working tree, re-measured after the
release-class and gate-ladder work recorded in `SHIP_CLASS_AND_GATE_DECISION_2026-10-28.md`.
**Instrument:** `npm run benchmark:reform` (`--json`, `--check`, `--fleet`).

This closes the benchmark still open in `LEAN_OPERATING_MODEL_DECISION_2026-10-27.md` §3: 18
representative tasks, before/after on reading cost and on the two measurable preconditions of
first-run correctness — the rule is still present, and the file that carries it is still reachable.

## Method

| Axis | What is measured | Honest limit |
|---|---|---|
| Cost | Tokens at chars/4 for the reading chain and the task's guideline file | An estimate, not a tokenizer count |
| Rule retention | A distinctive rule phrase in each task file, matched at the before ref **and** in the working tree | Proves the text survived; not a live-agent run |
| Reach | The task file appears in `MASTER_INDEX.md`; a mapped skill has a front-matter `name` + `description` | A textual reachability check, not a scored first-file choice |
| Before data | Read with `git show ec55a54:<path>` | The baseline cannot drift with uncommitted edits |
| After data | The working tree — the state about to ship | A later commit does not invalidate this ref |

**Two cost bands are reported.** The narrow band is the mandated doc set: pre-reform,
`documentation-strategy.md` marked `AGENTS.md`, `WORLD.md` and `README.md` `every session`; after,
only `AGENTS.md` and `WORLD.md` are mandatory. The wide band adds the retrieval procedure the old
`AGENT_BOOT_PROTOCOL.md` prescribed — `MASTER_INDEX.md`, `RETRIEVAL_RULES.md` and the protocol
itself. Reporting only the wide band would overstate the gain; reporting only the narrow band would
hide the retrieval tax the reform removed.

## 1. Reading-chain cost

| Phase | Before | After |
|---|---:|---:|
| Constitution (`AGENTS.starter.md`) | 5,477 | 3,926 |
| Intent + mode (`WORLD.starter.md`) | 1,794 | 1,741 |
| Orientation (`README.starter.md`, every session before) | 566 | — |
| Retrieval layer (index + retrieval rules + boot protocol) | 14,413 | — |
| **Full chain** | **22,250** | **5,667** |
| **Declared every-session set only** | **7,837** | **5,667** |

Full chain: **−16,583 tokens (−74.5%)**. Declared set: **−2,170 tokens (−27.7%)**.

The constitution's last change was a narrowing, not a trim: the pre-push sentence now names which
mode runs the build, which cost 15 tokens (3,911 → 3,926). A rule that was wrong is worth 15 tokens;
the report does not round it away.

The 74.5% is not a claimed per-session saving for every agent: an agent that already knew which file
it needed might skip the index even under the old doctrine. It is the size of the reading the
pre-reform doctrine **prescribed** when a mirror was present, which is the chain the reform was
written to remove.

## 2. Task results — 18 representative requests

`Before` and `After` are the chain plus the task's guideline file. `File` is that file alone, so the
column shows which documents the reform actually trimmed rather than attributing every delta to the
chain.

| Task | Request | Before | After | Δ | File before → after | Rule | Index |
|---|---|---:|---:|---:|---|---|---|
| plan-feature | Add a feature end-to-end | 23,381 | 6,811 | −16,570 | 1,131 → 1,144 | ✓ | ✓ |
| write-tests | Add tests for this service | 23,992 | 7,377 | −16,615 | 1,742 → 1,710 | ✓ | ✓ |
| debug-bug | The login is broken — debug it | 22,980 | 6,397 | −16,583 | 730 → 730 | ✓ | ✓ |
| code-review | Review this diff before I push | 23,903 | 7,320 | −16,583 | 1,653 → 1,653 | ✓ | ✓ |
| refactor | Refactor this module without changing behavior | 22,816 | 6,233 | −16,583 | 566 → 566 | ✓ | ✓ |
| security-audit | Audit this app for security holes | 23,600 | 7,017 | −16,583 | 1,350 → 1,350 | ✓ | ✓ |
| performance | The list page is slow — optimize it | 22,749 | 6,166 | −16,583 | 499 → 499 | ✓ | ✓ |
| electron-update | Ship an auto-updating Electron release | 33,617 | 17,091 | −16,526 | 11,367 → 11,424 | ✓ | ✓ |
| arabic-pdf | Export an Arabic invoice to PDF | 27,027 | 10,444 | −16,583 | 4,777 → 4,777 | ✓ | ✓ |
| firestore-cost | Our Firestore bill is too high | 26,098 | 9,483 | −16,615 | 3,848 → 3,816 | ✓ | ✓ |
| supabase-auth | Add Supabase auth and RLS to this table | 22,883 | 6,300 | −16,583 | 633 → 633 | ✓ | ✓ |
| rtl-ui | Make this dashboard Arabic/RTL | 23,471 | 6,888 | −16,583 | 1,221 → 1,221 | ✓ | ✓ |
| accessibility | Check keyboard accessibility | 22,813 | 6,230 | −16,583 | 563 → 563 | ✓ | ✓ |
| forms | Build this settings form | 22,962 | 6,379 | −16,583 | 712 → 712 | ✓ | ✓ |
| design-system | Adopt the design system tokens | 22,858 | 6,275 | −16,583 | 608 → 608 | ✓ | ✓ |
| local-ci | Run CI locally before push | 28,632 | 10,807 | −17,825 | 6,382 → 5,140 | ✓ | ✓ |
| docs-steering | Update the steering docs | 28,557 | 10,568 | −17,989 | 6,307 → 4,901 | ✓ | ✓ |
| speed-mode | Declare vibe mode and scale the process | 25,643 | 9,415 | −16,228 | 3,393 → 3,748 | ✓ | ✓ |

**18/18 rules retained. 18/18 task files still indexed. 9/9 mapped skills still loadable.**

Two workflow documents were trimmed by the reform itself (`local-ci-strategy.md` −1,242,
`documentation-strategy.md` −1,406); most domain files were left untouched, which is why their
task-level saving is the chain delta. **`speed-tiered-workflow.md` grew +355** — the release-class
and gate-ladder doctrine added on 2026-10-28 costs more than the trimming saved. That is the
measurement, not a rounding error: the mode rules are the ones a project acts on every push, so
they are the last place to economise. Two other files grew slightly (`development-workflow.md` +13,
`electron-auto-update.md` +57), and `testing-philosophy.md` fell −32 when its duplicate guard-tier
table was retired — a reform that only deletes is not a reform, it is an amputation.

On the **narrow** band, subtract 14,413 from every before total: the per-task saving is then 2,170
tokens plus whatever that task's file lost or gained. The security, testing, RTL and data rules the
tasks test are unchanged.

## 3. Fleet — the benchmark cannot deliver what a project has not adopted

Read-only, from `sync-projects.json`:

| Project | Current chain | Floor (AGENTS+WORLD) | Navigation | Files |
|---|---:|---:|---:|---:|
| Programs-and-courses-management-system | 32,888 | 16,410 | 16,478 | 6 |
| midad | 29,085 | 13,154 | 15,931 | 6 |
| property-management-app | 32,658 | 17,029 | 15,629 | 6 |
| Evaluator-v4 | 29,365 | 14,117 | 15,248 | 6 |
| alsael1 | 30,316 | 13,820 | 16,496 | 6 |
| gs-coordinator-helper | 42,095 | 25,389 | 16,706 | 6 |
| Graduate-Affairs-Management-System-GAMS | 31,831 | 16,066 | 15,765 | 6 |

Every project still carries the pre-reform shape: roughly **16K tokens of README + mirror index
pages** on top of a constitution. The floor column is not a projection — it is each project's
**current** `AGENTS.md` + `WORLD.md`, which are 11.9K–25.4K tokens because they predate the lean
starter. The central after chain is 5,667 tokens; closing the remaining gap is a re-sync and an
`AGENTS.md` adoption, which the owner decision assigns to each project's own slice.

**Migration state measured in this session.** The sync preflight currently blocks five of the seven
projects because their own `package.json` commands still name scripts this reform retired:

- P&C, midad, property-management-app, Evaluator-v4: `check-decision-index.js`, `check-doc-breadth.js`
- GAMS: the same two plus `slice-close.js`
- alsael1, gs-coordinator-helper: preflight passes

No downstream repository was edited. The block is the intended safety behaviour: the preflight
refuses to deliver a mirror whose commands cannot run, and the fix belongs to each project's slice.

## 4. What this justifies — and what it does not

**Justified by these numbers:**

- The mandated reading chain is 74.5% smaller on the full reading, 27.7% smaller on the narrowest
  defensible reading.
- The reform removed retrieval ceremony without losing a single benchmarked rule, index entry, or
  mapped skill.
- Two of the largest workflow documents were trimmed, and the one that grew did so because the
  release-class rules had to be written down; domain guidance stayed intact.

**Not justified:**

- **Live first-run correctness.** No agent was run against these 18 prompts. Rule retention is a
  necessary precondition, not proof that an agent opens the right file first. That run is still the
  stronger test and remains unrun.
- **A per-session saving for every downstream project.** Projects keep their old `AGENTS.md` and
  mirror until their own slice re-syncs; the fleet table shows the gap, not a delivered saving.
- **That the 22,250-token figure is what every agent actually read.** It is the prescribed chain at
  its widest. The narrow band is 7,837 — both are reported above.

**Known cost of the reform:** five projects are blocked at the sync preflight until their hooks stop
naming retired scripts. That is a deliberate, visible migration cost, not a silent failure.

## Reproduce

```bash
npm run benchmark:reform            # report only
npm run benchmark:reform -- --check # exit 1 if a rule, file, index entry or skill regressed
npm run benchmark:reform -- --fleet # add the read-only project chains
npm run benchmark:reform -- --json  # machine-readable results
```

The `--check` mode is a regression gate for future reforms; the default is report-only, because a
rule phrase is a proxy and a failed proxy should be read before it blocks a release.

## Cross-References

- Decision this closes: `LEAN_OPERATING_MODEL_DECISION_2026-10-27.md`
- Cost instrument for a project's own chain: `guidelines/global-configs/scripts/measure-boot-budget.js`
- Doctrine measured: `guidelines/07-documentation/documentation-strategy.md` §The Mandated Doc Set,
  `guidelines/01-workflow-methodology/speed-tiered-workflow.md` §The Context Budget
- Instrument: `guidelines/global-configs/scripts/benchmark-reform.js`
