# Lean Operating Model — Owner Decision

**Date:** 2026-10-27
**Decision class:** MAJOR change to the exported constitution and to this repo's `AGENTS.md` (global baseline rules removed or narrowed). Recorded here as the explicit owner decision `AGENTS.md` §Maintenance requires. The owner's instruction was: *"implement your recommendation to the repo"*, given after the audit summarised in §1.
**Scope:** `guidelines/` (fragments, `_index/`, workflow and documentation guidelines), `global-configs/scripts/`, `global-configs/templates/`, repo `AGENTS.md`.
**Status:** Applied in the commits that follow this file; `npm run validate` exits 0 after the last of them.

---

## 1. What the audit found

The repo's purpose is to make downstream AI coding agents faster, cheaper and more accurate. Measured against that:

- **Always-loaded instructions were the dominant cost.** Downstream boot chains measured 15K–28K tokens before the first edit (chars/4 estimate across the seven registered projects). The exported constitution alone sat at ~5,480 of a 5,500-token budget, and a third of it described *process about process*: receipts, decision numbers, write-breadth, activation logs.
- **Published evidence does not support large context files.** arXiv 2602.11988 ("Evaluating AGENTS.md") found that repository context files did not generally improve task success and raised inference cost by more than 20%; LLM-generated files lowered success slightly. Vendor skill guidance (Anthropic, Red Hat) converges on the same shape: a short entry point, progressive disclosure, specialist knowledge loaded on demand.
- **Several guards verified bookkeeping, not software.** Skill-activation receipts, derived decision numbers kept equal across three sites, a per-commit write-breadth cap, and regex checks over guideline prose each consumed push time and agent attention while proving nothing about the product. Meanwhile the scaffolded pre-push hook *skipped* a missing `test` or `build` script and reported the gate green.
- **The corpus contradicted itself.** `AGENT_BOOT_PROTOCOL.md` forbade skipping `MASTER_INDEX.md`; `RETRIEVAL_RULES.md` said the index is not a required read. The index labelled itself ~500 tokens while measuring ~11,300. Planning rules mandated 2–3 alternatives and a split above five files regardless of the change.

## 2. The decision

Keep what makes agents correct — security rules, behavioural testing, verification evidence, the mode-scaled gate, stack-specific knowledge, one-command sync. Remove what only makes them *busy*.

### Retired (rule and tool together — never a superseded copy left in place)

| Retired | Why |
|---|---|
| Skill-activation receipt (`Skill: <name> activated` announcement, `docs/skill-activations.log`, `npm run skills:activations`, `check-skill-activations.js`) | A log of which file an agent opened is bookkeeping about reading; it caught nothing a wrong answer would not. |
| Routine decision record: derived D-numbers, `npm run slice:close`, per-slice changelog entry, machine-written freshness lines, the three-site ADR rule and `guard:decisions` | Commit messages are the routine record and git dates files. ADRs remain for irreversible decisions (auth, schema, dependency pins, scope reversals) as plain markdown. |
| Write-breadth guard (`guard:breadth`, `check-doc-breadth.js`) and the "1 / 2 / full set" steering-write columns | Counting markdown files per commit is a proxy for a proxy. The trigger table keeps **one home per fact**; the mode no longer dictates how many files a trigger touches. |
| Gate-wording regex guard (`guard:gate-wording`) | A prose regex over the corpus is a meta-guard with false positives; `docs:census` already enforces one home per canonical fact. |
| "A lesson ships with a control" mandate, "Speed is a metric — record intent → first slice", "Reference machine output, never transcribe" as always-loaded rules | Good advice, wrong tier. Detail moves to the guideline that owns it; the constitution stops carrying it. |
| ">5 files requires splitting", mandatory 2–3 approaches, mandatory 2–3 pattern files | Replaced by: split when the change cannot be summarised in one sentence; propose alternatives when the choice is not obvious; reference existing files when conventions are not obvious from the tree. |
| "One escalation class per slice" | Escalation stays evidence-driven; counting classes per slice added a rule with no measurable benefit. |

### Changed

- **Constitution budget 5,500 → 4,000 tokens** (`fragments/manifest.json` `maxTokens`, enforced by `check-drift`); the rendered starter measures ~3,990, down from ~5,480. What remains is mostly the project's own Stack table and `[FILL]` mandates.
- **Boot chain:** `AGENTS.md` + `WORLD.md` always; `README.md` for orientation; `MASTER_INDEX.md` only to find a file the task needs. `AGENT_BOOT_PROTOCOL.md` and `RETRIEVAL_RULES.md` say the same thing.
- **Scaffolded pre-push hook:** in `standard`/`guarded` a required step whose npm script is missing **fails** with a message, instead of being skipped and reported green. `vibe` keeps `gate:fast`.
- **`WORLD.starter.md`:** carries intent, constraints and scale only; implementation policy (MIME verification, cache-key shape, fetch caps) lives in `AGENTS.md`/guidelines and is linked, not restated.
- **`validate:standard`** becomes `docs:check` (warn-only) alone.

### Kept unchanged

Security fragment; behavioural-testing and verification-evidence rules; mode-scaled gate (`gate:fast` in vibe, full pipeline otherwise, release override); `docs:census` (one home per fact, quarterly archive); `check-drift` / `check-index-drift` / `check-skills-drift`; `sync:drift`; `guard:tiers`; `guard:mode`; RTL/Arabic rules; the skills corpus and its stack-fit delivery.

## 3. What is not in this decision

- Downstream project hooks (`GAMS`, `property-management-app`) remain as they are; conforming them is each project's own slice.
- No skill content was removed. The skills' *delivery* and the always-loaded instructions around them changed.
- The benchmark recommended by the audit (12–20 representative tasks, before/after on cost and first-run correctness) is still to be run; this decision ships the leaner model so there is something to measure.
