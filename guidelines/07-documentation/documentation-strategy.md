---
status: "Normative"
scope: "Global"
tags: [documentation, strategy, maintenance, changelog-archives, single-source, line-length]
---

# Documentation Strategy — Knowledge Persistence for AI and Humans

---

Documentation is the memory layer of vibe coding: AI sessions start with zero context, models change across sessions, and human understanding of generated code is partial. Good documentation cuts AI onboarding from 10+ messages to 1–2. Depth scales with the declared mode (`speed-tiered-workflow.md`): triggers always fire; vibe defers non-trigger prose to the milestone.

## The Mandated Doc Set — One Home Per Fact

The steering set is deliberately small. Each document owns exactly one question; no fact lives in two of them. Adding a document to this set requires retiring one (same ratchet as the constitution's token budget).

| Document | The one question it answers | Loaded |
|---|---|---|
| `AGENTS.md` | What are the binding rules? (stack table, commands, forbidden patterns) | every session |
| `WORLD.md` | What must this product NOT become? (intent guardrail + `mode`) | every session |
| `README.md` | What is this, and how do I run it? (description, structure, quick start) | every session |
| `docs/AI_ARCHITECTURE.md` | Where does subsystem X live; what is the API? (registry) | on demand |
| `docs/adr/NNN-name.md` | Why was X decided? | on demand |

**Deleted, deliberately — do not recreate them:** a `docs/AI_CONTEXT.md` "compressed onboarding" and an `ARCHITECTURE_INDEX.md` "document index". Each was a second copy of facts already owned above (stack table, commands, "how to change safely", the project description, the file list). A compressed copy is still a copy: it drifts, and because it is *always loaded* it taxes every session twice. Onboarding is served by `README.md`; navigation is served by the links in `README.md` and by search.

## Required Documentation Files

1. **README.md** — the single home for the project description, structure tree, and Quick Start (`npm install` → `cp .env.example .env` → `npm run dev`), plus links to the other four documents. A new session (or human) understands the project in under 5 minutes; nothing here is restated elsewhere.
2. **WORLD.md** — product intent guardrail: what the project is and must NOT become (template in `planning-and-scoping.md`). Referenced in every major prompt. Sole owner of the declared `mode`.
3. **AGENTS.md** — the constitution. Sole owner of the stack table, the build/validation commands, and the forbidden-pattern list. Every other document links here instead of repeating them.
4. **docs/AI_ARCHITECTURE.md** — the subsystem / API / migration registry: facts that do not belong in a rules file and are loaded per task, not per session.
5. **ADRs (`docs/adr/NNN-name.md`)** for significant architectural decisions — prevent AI from reversing decisions in future sessions. Two depths: **ADR-lite** (3 lines — Context · Decision · Date; for reversible or low-stakes calls in vibe/standard mode, one file per decision still) and **full ADR** (the format below; required for irreversible decisions and every ADR in guarded mode). Format:
   ```markdown
   # ADR 001: Use PostgreSQL as Primary Database
   ## Status: Accepted (2026-05-24)
   ## Context: Need relational DB for users/orders/inventory; considered Postgres/MySQL/Mongo.
   ## Decision: PostgreSQL — JSON support, RLS for multi-tenant isolation, deep AI training data.
   ## Consequences: requires PG expertise; RLS adds query complexity; strong ecosystem.
   ```
   ADR-lite:
   ```markdown
   # ADR 012: Zustand over Redux (lite)
   ## Status: Accepted (2026-09-22)
   ## Context/Decision: <50 users, no devtools need — Zustand; revisit if team >3 or time-travel needed.
   ```
6. **Inline code comments** follow `ai-code-documentation.md` (ICDC framework) — persistent context for the next AI session.

## Directives

1. Update documentation in the SAME iteration as the code change (workflow Phase 8) — stale docs mislead future sessions worse than missing docs.
2. Write for a reader with zero context: every doc states purpose, constraints, and pointers to related files.
3. Keep README's stack versions pinned and current when the stack changes.
4. **Every task ends with a Docs-Decision only when the Trigger table fires:** a matching trigger requires `Docs: updated <files>` in the same iteration. Non-trigger changes report no Docs line — silence is the correct non-trigger response; a padded `N/A (<reason>)` on every trivial edit is ceremony, not safety. Missing a real trigger is a violation, same as "Done" with no verification.
5. Steering docs are AI-first: imperative tables and bullets, MUST/SHOULD per RFC 2119, no prose paragraphs. Humans are not the audience.
6. **A working document does not carry its own history.** Any file inside the mandated boot chain keeps its change log in dated archives (see below). History is on-demand reading; a boot file is read before every edit, so every kilobyte of accumulated past in it is paid by every session.
7. **One canonical copy per rule.** Each list (trigger table, gate steps, forbidden patterns, version table) exists in exactly one file; every other site names the file and links. A restated list is not redundancy, it is a second document that no one edits — measure how many copies exist before adding a "summary". This governs the mandated doc set too (§The Mandated Doc Set): every fact belongs to exactly one of those documents, and adding a document to the set requires retiring one. `npm run docs:census` fails the gate if a canonical fact appears in more than one mandated doc.
8. **Machine output is referenced, never transcribed.** Verification numbers (test counts, coverage, audit results, bundle size, file size) are written by a command into an artifact, and prose cites the artifact's path. A hand-copied number is a claim that decays silently on the next commit. When a number genuinely must sit in prose, it carries the command that re-measures it and the date it was
   measured, or it is rounded to a precision that survives the drift — a precise figure with no provenance is the worst kind, because it reads as checked.
9. **A claim about the docs is a test.** Anything steering docs assert about themselves (a step list, a next-D number, a pointer, a date that must be current) is asserted by a parity guard in the test suite, with a non-vacuity probe and a reversal proof — otherwise the document drifts exactly where it claimed it would not.
   The boot-budget contract is guarded by `guidelines/global-configs/scripts/tests/measure-boot-budget.test.js`: report-only mode surfaces optional missing files,
   `--strict` fails an incomplete authoritative list, and an entirely missing corpus returns a data error.
10. **A guard follows the improvement.** When a mandated hygiene change lands (history moved to archives), the guards that read the old shape are updated in the same iteration: a guard that punishes hygiene gets deleted, and the repo loses both.
11. **A long line is two different bugs.** A long *paragraph* is a formatting accident — insert hard newlines at word boundaries (≤400 characters) and it becomes skimmable in a diff, an editor, and a screen reader, with the byte content unchanged. A long *table row* cannot be wrapped without breaking the table, so the finding is not the length: it is that prose is living in a cell. Move the prose
    to a paragraph or an archive; leave the table a lookup.

## History Lives in Dated Archives

1. **Location and name:** `docs/changelog/<doc>-<YYYY>-Q<n>.md`, one file per quarter, newest file holding the newest entries. A new quarter starts a new file; old files are never edited.
2. **The live file keeps a pointer heading** that preserves the section's old anchor (`## 4. …` stays `## 4. …`), states the archive path as a literal repo-relative path, and stops. Nothing else lives there.
3. **Entry format:** one `### YYYY-MM-DD — <scope>` heading per entry, ~50 words for a routine change: what changed, what guard proves it, where the detail lives (ADR, PRD section, commit). Long entries are reserved for reversals and incidents — a document whose every entry is long has no signal left.
   **Wrap every entry:** no line over 400 characters. A single-line bullet is unreadable in a diff, an editor, and a screen reader.
4. **Relocation is a move, not a rewrite.** Proves out: extract every dated row from the pre-change version (`git show HEAD:<path>`) and assert each one still appears verbatim in the union of live doc + archives. A "tidied up" history is a destroyed history — the rows are the record of decisions, and the append-only rule exists so a reversal can be cited.
5. **Measure before acting:** `node _guidelines/global-configs/scripts/measure-boot-budget.js . --history-warn 25` prints tokens per boot file, the share of each that is dated history, and the longest paragraph and longest table row. Act on >25%, not on a feeling.
6. **Read every row of the measurement, not the two files you expected.** History hides in shapes a "change log" regex will not see: a `## Freshness` section that grows one bold-ledger entry per slice is a change log, and a section-aware detector must count it even when no line starts with `| YYYY-MM-DD |`.
   One repo moved the two change logs everyone knew about and left a third document 74% history.

## Guards for Steering Claims

- **Non-vacuity probe:** every guard asserts that its own corpus is non-empty and that a deliberately broken input fails it. A guard that reads zero files passes forever.
- **Informational steps stay informational:** a check that cannot be green before the commit exists (clean working tree) never decides the verdict of a pre-commit artifact.
- **Immutable records are exempt:** ADRs and dated reports carry their date in their name or their status line; making them look "current" destroys the reason they exist.

## Trigger Table (When Docs MUST Change)

Each trigger names **exactly one file** — the single home of that fact. A change that appears to need two writes means one document is repeating a fact it should link to; fix the duplication, never do the double write.

| Trigger | The one file that changes |
|---|---|
| New dependency or stack version bump | `AGENTS.md` §Stack |
| New or changed build / lint / test / gate command | `AGENTS.md` §Build & Validation Commands |
| New endpoint, table, migration, or env var | `docs/AI_ARCHITECTURE.md` |
| Auth / RBAC change | `docs/AI_ARCHITECTURE.md` §Cross-Cutting (+ an ADR if it is a decision) |
| New shared component, convention, or forbidden pattern | `AGENTS.md` §Project-Specific Mandates |
| New subsystem | `docs/AI_ARCHITECTURE.md` §Subsystems |
| New top-level directory or a change to the project's purpose | `README.md` §Structure / §What this is |
| Scope / guardrail reversal | `WORLD.md` — AI proposes a `Proposed Update` block, human approves, then agent applies |

Non-trigger (typo, formatting, internal refactor with no contract change, test-only): leave docs, report no Docs line. Mode check: vibe additionally defers non-trigger README/API prose to the milestone; triggers fire in every mode.

## Freshness Header

Only the docs that go stale silently carry a header: `WORLD.md` and `docs/AI_ARCHITECTURE.md` take `**Last Updated:** YYYY-MM-DD | **Commit:** short SHA | **Change:** one line`. Bump it in the same commit as the behavior change.

`AGENTS.md` and `README.md` do not carry one — they change only on a trigger and git already dates them. A header that is merely PRESENT is not fresh: a guard compares it against the newest dated entry in the document's own history (live text plus the archives it points at), so a slice landed without a marker is caught rather than re-asked by the next session.

## Drift Check (Warn-Only)

`npm run docs:check` flags trigger-like diffs with no steering-doc change in the same commit. It NEVER fails — it warns. Run it before pushing; treat a warning as a prompt to re-run the Docs-Decision, not as a gate.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Trigger change with no Docs line | Same iteration as code |
| Padded `Docs: N/A` on every non-trigger edit | Silence is the non-trigger response |
| Decisions living only in chat history | ADRs (lite for reversible, full for irreversible) |
| Stale stack versions | Pin in `AGENTS.md` §Stack + update on change |
| A second always-loaded doc that restates the first (an "AI context" copy) | Delete it — the facts have one home (`README.md` + `AGENTS.md`) |
| A hand-maintained index of documents | Links in `README.md` + search; an index is a second list to keep current |
| A trigger row that names two files | One file per row — the second site links, it does not repeat |
| An always-read doc whose change log is a third of its size | Dated archive + pointer heading |
| The same table restated in four files "for convenience" | One canonical copy; the rest link |
| A verification count typed into a paragraph | Machine-written receipt, cited by path |
| Bulk-rewriting history to shrink a file | Relocate verbatim; prove against `git show HEAD:` |
| A guard that fails when the mandated improvement lands | Fix the guard in the same iteration; add a non-vacuity probe |
| Entry per date that pastes the whole design argument | ~50 words + a pointer to the ADR/PRD section |
| A paragraph that runs to thousands of characters on one line | Wrap at word boundaries, ≤400 chars — the content is unchanged |
| A table cell holding a paragraph | The prose leaves the table; the table stays a lookup |
| A precise figure in prose with no way to re-measure it | Cite the artifact, or carry the command + date, or round it |

## Cross-References

- **Depends on:** `speed-tiered-workflow.md` — mode-scaled doc depth, `context-management-strategy.md` — why an always-read file has a reading budget
- **Extended by:** `workflow-friction-audit.md` — the scheduled audit that finds the boot-chain bloat
- **Applied by:** `local-ci-strategy.md` — the gate receipts this policy refuses to let anyone hand-copy
