---
status: "Normative"
scope: "Global"
tags: [documentation, strategy, maintenance, changelog-archives, single-source, line-length]
control: "guard:breadth"
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

## Delivery — a Mirror Is a Copy That Owes a Check

A project consumes this doc set through a `_guidelines/` mirror. A mirror is a copy, and a copy that nothing compares drifts in silence — measured once at 19 days and **105 of 105 files behind**, while the registry tracking the fleet reported that project `synced`.

- **Compare content, not dates.** `npm run sync:drift` hashes the mirror against the source and fails on any difference; `npm run sync:all` records the source hash it delivered. A `lastSynced` timestamp says when someone *tried*; the hash says what *arrived*. Only the sync writes a hash — a hash written by anything else stops meaning "this content was delivered".
- **"Skip if the mirror exists" is not a rule.** An existing mirror is precisely the thing that needs checking; it is the stale one.
- **A missing mandated document is a failure, not a note.** An instrument that reports an absent `README.md` while the build stays green is telling you the doc set can silently lose a member.
- **A mirrored file may not link outside the mirror.** `../../x.md` resolves here and lands in the project's own
  root there: the link is legal in the source and dead in every copy, and the project cannot fix content it does
  not own. Write the name and its central location; write a path only when it resolves inside the mirror.
  `check-links.js` fails the run on it (`MIRROR ESCAPE`, printing how many mirrored links it judged so a green
  line cannot be vacuous). The class recurred twice before the guard existed — `_index/MASTER_INDEX.md` →
  repo-root `sync-manager.ps1` (recorded 2026-10-11), then a skill → `docs/repo-meta/skill-design-patterns.md`
  (added 2026-10-12, unnoticed until one project's known-red count became two). The same arithmetic applies to
  the **second** delivery, `_skills/`: a skill is copied flat there, so a mirror-relative cross-reference is dead
  in that placement too, even while it is valid in `_guidelines/`.

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

## Scoped Rule Files

Agent harnesses load directory-scoped rule files (`.qoder/rules/`, `src/.qoder/rules/`, `backend/.qoder/rules/`) on demand, and a project's Session Bootstrap tells every session to read them. They are hand-authored, not delivered by the sync, so they rot where nothing checks them: measured 2026-10-21 in one project, eight of ten were untracked — present on the disk that wrote the sentence, absent from every clone — and the copy in another still described a UI major that had moved twice.

1. **A rule file points at the mirror, never at an absolute path.** The source line reads `_guidelines/` (or the guide's repo-relative path); a drive-letter path is readable on one machine and nowhere else.
2. **A rule file owns no fact another document already owns.** Versions, gate commands and bundle ceilings are linked to their owner (`AGENTS.md` §Stack, §Build & Validation Commands, the budget script itself) — a copied number is a second home, and the copy is the one nobody edits.
3. **Every path the Session Bootstrap names is committed.** An untracked target is an instruction no clone can obey; `npm run guard:paths` fails when a named file resolves nowhere or git does not carry it.

## Directives

1. Update documentation in the SAME iteration as the code change (workflow Phase 8) — stale docs mislead future sessions worse than missing docs. The **breadth** of the update scales with the declared mode (§Trigger Table); the **record** never does (§Record vs Ritual).
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
    to a paragraph or an archive; leave the table a lookup. `measure-boot-budget.js` reports both as **advisories** — never fatal, in any mode — because readability does not break a build, and a gate that fails a milestone exit over a 500-character paragraph is a gate people delete. A fact that must not drift belongs in a guard (directive 9); a sentence that reads badly belongs in a note.

## History Lives in Dated Archives

1. **One archive per quarter, not one per document:** `docs/changelog/<YYYY>-Q<n>.md`, newest file holding the newest entries. A new quarter starts a new file; old files are never edited.
   A per-document archive (`prd-2026-Q4.md`, `roadmap-2026-Q4.md`, `agents-2026-Q4.md`) writes one event four times — the "one canonical copy" violation this document outlaws for *rules*, applied to *events*. The event names its doc in a `**Doc:**` column instead.
2. **The live file keeps a pointer heading** that preserves the section's old anchor (`## 4. …` stays `## 4. …`), states the archive path as a literal repo-relative path, and stops. Nothing else lives there.
3. **Entry format:** one `### YYYY-MM-DD — D<n> · <title>` heading, then one bullet carrying the derived facts — `**Mode:** … · **Doc:** … · **Commit:** … · **Receipt:** …`. `npm run slice:close` writes the whole entry. Prose is added only for a reversal or an incident, and only in addition to the derived line.
   **Wrap every entry:** no line over 400 characters. A single-line bullet is unreadable in a diff, an editor, and a screen reader.
4. **Relocation is a move, not a rewrite.** Proves out: extract every dated row from the pre-change version (`git show HEAD:<path>`) and assert each one still appears verbatim in the union of live doc + archives. A "tidied up" history is a destroyed history — the rows are the record of decisions, and the append-only rule exists so a reversal can be cited.
5. **Measure before acting:** `node _guidelines/global-configs/scripts/measure-boot-budget.js . --history-warn 25` prints tokens per boot file, the share of each that is dated history, and the longest paragraph and longest table row. Act on >25%, not on a feeling.
6. **Read every row of the measurement, not the two files you expected.** History hides in shapes a "change log" regex will not see: a `## Freshness` section that grows one bold-ledger entry per slice is a change log, and a section-aware detector must count it even when no line starts with `| YYYY-MM-DD |`.
   One repo moved the two change logs everyone knew about and left a third document 74% history.

## Guards for Steering Claims

- **Non-vacuity probe:** every guard asserts that its own corpus is non-empty, that the population it read **is the population it expected**, and that a deliberately broken input fails it. A guard that reads zero files passes forever, and a guard whose corpus silently shrinks passes louder: a harness whose file glob stopped matching reports `0 of 0 passed` and exits 0. Assert a floor or the count the artifact names — never `> 0`. (The mechanism behind one such disappearance is documented in `local-ci-strategy.md` §Gate Receipts: a sync-pipe subprocess capture that fails to *collect* rather than to *fail* took 986 tests out of a green run.)
- **A lesson ships with a control.** A proposal in `guidelines-proposals/` names the event, the preventing rule, the target guideline, **and the guard that fails if the lesson is unlearned**. A proposal without a named control is a wish; `npm run audit:friction` reports how many of them there are, so the number is visible rather than assumed.
- **A decision has three sites, and a guard keeps them equal.** `slice:close --adr` writes the ADR header, the row in `docs/adr/README.md`'s index and the row in the decisions log; `check-decision-index.js` fails when an ADR file is unlisted, when a row points at a file that does not exist, or when one ADR is listed twice. An ADR whose decision is not yet in the log is a **warning** — work in flight must not fail the gate — and a failure under `--strict` at a milestone exit. Numbering gaps are legitimate and are never reported: a guard that demanded contiguity would force a project to invent a decision it did not make.
- **The mode binds the breadth, and a guard proves it.** §Trigger Table declares the per-mode write breadth; `npm run guard:breadth` fails a **work slice** that exceeds it. A commit that changes no product source is a **ritual commit** and is exempt — the milestone is where the full set belongs (§Record vs Ritual), so the guard never fails one, and a naive per-commit cap would fail a third of healthy history. The breadth is read from this file's own table, so the guard follows an edit to the column instead of contradicting it; the counted file set is that table's canonical homes **plus** the project's own markdown surface, because counting only the canonical four let a slice through that wrote its PRD, ROADMAP and acceptance criteria on every push — the ritual the mode exists to scale. A table it cannot read is reported as vacuous, never as a pass, and an undeclared mode reads as `standard` — never the loosest one.
- **Meta-guards are budgeted.** A guard whose subject is another document is a tax paid on every push to check prose about prose. Keep them under **5% of the suite**, give each a non-vacuity probe, and prefer **one** `docs:verify` that regenerates every derived fact and diffs it — the `check-index-drift` pattern — over a parity guard per document. Six pairwise parity guards are six things to fix the day a document's shape changes, and a guard that punishes hygiene gets deleted.
- **Informational steps stay informational:** a check that cannot be green before the commit exists (clean working tree) never decides the verdict of a pre-commit artifact.
- **Immutable records are exempt:** ADRs and dated reports carry their date in their name or their status line; making them look "current" destroys the reason they exist.

## Trigger Table (When Steering MUST Change)

Each row names the **one home** that keeps the fact findable in that mode; higher modes add the supporting site the column names, never a second copy of the same fact. A change that appears to need two equally authoritative writes in one mode means one document is repeating a fact it should link to; fix the duplication, never do the double write.

| Trigger | vibe — 1 write | standard — 2 writes | guarded |
|---|---|---|---|
| New dependency or stack version bump | `AGENTS.md` §Stack | + the migration/rollback note | + an ADR if the pin is a decision |
| New or changed build / lint / test / gate command | `AGENTS.md` §Build & Validation Commands | + `README.md` §Quick Start if the developer path changed | + an ADR for a gate-structure change |
| New endpoint, table, migration, or env var | `docs/AI_ARCHITECTURE.md` — its registry row | + the contract/version note | + an ADR |
| Auth / RBAC change | `docs/AI_ARCHITECTURE.md` §Cross-Cutting | + the deny-matrix proof | **+ an ADR in every mode** — auth is always a decision |
| New shared component, convention, or forbidden pattern | `AGENTS.md` §Project-Specific Mandates | + `docs/AI_ARCHITECTURE.md` if it owns a subsystem | + an ADR |
| New subsystem | `docs/AI_ARCHITECTURE.md` §Subsystems | + `README.md` §Structure | + an ADR |
| New top-level directory, or a change to the project's purpose | `README.md` §Structure / §What this is | + `WORLD.md` if scope moved | + an ADR |
| Scope / guardrail reversal | `WORLD.md` — the `Proposed Update` block | + `README.md` if the description moved | **+ an ADR in every mode** |

Non-trigger (typo, formatting, internal refactor with no contract change, test-only): leave steering alone, report no Docs line. `vibe` additionally defers non-trigger README/API prose to the milestone. Triggers fire in every mode; only their **breadth** scales.

## Record vs Ritual — What Scales, What Never Does

Two different things hide under the word "documentation", and only one of them may scale with the mode:

| | The **record** | The **ritual** |
|---|---|---|
| What it is | the decision number, its one-line entry, the receipt path | the §20.7 pointer, the freshness header, the second and third file, the full steering set |
| Why it exists | so the next session can find out *why* — and so a reversal can be cited | so the fact is reachable from every entry point |
| Scales with mode? | **No — every mode writes it.** It is one line, and it is the project's memory | **Yes** — `vibe` writes 1 file, `standard` 2, `guarded` the full set |
| Cost of skipping it | the reason is lost permanently; the next session re-litigates a settled question | the fact is still findable from its one home; a reader takes one more hop |

A mode that removes the **record** is not fast, it is amnesiac. A mode that keeps every **ritual** is not safe, it is slow. The failure this table exists to prevent is a `vibe` slice writing five steering files (the ritual, un-scaled) while leaving no decision entry (the record, skipped) — the worst of both.

**The decision number is derived, never counted.** The next number is `max(existing) + 1`, computed by the tooling at slice close from the numbers already **recorded** in the project — decision docs read from the committed tree, the archive from disk, so the record a slice is writing cannot raise the number it is claiming and a rerun is a no-op. Do not maintain a counter in a document: a hand-kept counter needs its own parity guard, and two concurrent sessions take the same number. A line that DECLARES the next unclaimed number (`- Next D-number: **D40**`) is an earmark, not a counter: the tool takes the higher of it and `max(existing) + 1`, so it can only move the number forward, a stale earmark is harmless because the derived maximum outranks it, and the slice that consumes the reservation updates the line. See `local-ci-strategy.md` §Slice Close.

## Freshness — Written, Never Typed

`WORLD.md` and `docs/AI_ARCHITECTURE.md` carry `**Last Updated:** YYYY-MM-DD | **Commit:** short SHA | **Change:** one line` **because a machine writes it**. `npm run slice:close` derives all three facts from the repository — the date, the short SHA, the slice title — and rewrites the line in place **only when the slice names that document with `--doc`**. Bumping every freshness doc on every slice would make the line mean "some slice closed", not "this document changed". Typing a derived fact by hand is the exact failure mode this document exists to prevent: the referenced project ran a header-bumping script that wrote `**Commit:** nosha` for months, and nothing failed.

`AGENTS.md` and `README.md` carry none — they change only on a trigger and git already dates them. A freshness line that no script writes is worse than no line at all: it reads as checked.

Staleness is **derived, not asserted**: compare `git log -1 --format=%ad` on the file against the newest dated entry in the document's own history (live text plus the archives it points at). That comparison needs no marker in the document, so a slice that forgot to bump a header has nowhere to hide.

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
| **A `vibe` slice writing five steering files** | Breadth scales with the mode; `vibe` writes **one** steering file, and the record is written separately in every mode |
| **A slice that skipped the decision entry to save time** | The record is one line and never scales — skipping it is amnesia, not speed |
| **A hand-maintained "next number" counter in a document** | Derive `max(existing) + 1`; a counter races between concurrent sessions |
| **A mode declared, but the same six-file write in every mode** | `npm run guard:breadth` binds the write to the breadth column, or the mode is decoration |
| **A freshness line typed by hand** | `npm run slice:close` writes it; a marker no script writes reads as checked |
| **One event written into four per-document archives** | One archive per quarter + a `**Doc:**` column |

## Cross-References

- **Depends on:** `speed-tiered-workflow.md` — mode-scaled doc depth, `context-management-strategy.md` — why an always-read file has a reading budget
- **Extended by:** `workflow-friction-audit.md` — the scheduled audit that finds the boot-chain bloat
- **Applied by:** `local-ci-strategy.md` — the gate receipts this policy refuses to let anyone hand-copy
