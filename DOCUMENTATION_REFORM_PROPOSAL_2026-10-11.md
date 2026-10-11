# Documentation Reform Proposal — Cutting the Paperwork, Enforcing One Source of Truth

**Date:** 2026-10-11
**Scope:** Central guidelines repo + every downstream project it syncs into
**Status:** Applied in phases (R1–R3, R7–R10 shipped; R4–R6 deferred — see §Implementation status)
**Method:** Measured by reading the mandated doc set, the sync manifest, the fragments pipeline, and grepping the repo for duplicate canonical facts. Every number below is re-measurable; the command is given inline.

---

## Verdict

The guidelines already *preach* single-source-of-truth — `documentation-strategy.md` Directive 7 ("One canonical copy per rule"), `workflow-friction-audit.md` ("Count copies of every canonical list"), `context-management-strategy.md` Directive 8 ("A budget is a number with a guard"). **The problem is that the guidelines do not apply that doctrine to the set of documents they mandate.**

The result is a per-project steering set of **5+ hand-maintained files** that restate the same facts (stack table, commands, "how to change safely", project description, cross-references, freshness headers), plus a repo-side **fragments pipeline** that keeps a second copy of every rule, policed by a 4-step ritual on every rule change.

This proposal removes the duplicates, deletes the two documents that exist only to be compressed copies of other documents, generates the indexes that are currently hand-maintained, and adds guards so the set cannot regrow.

**Headline win:** the always-read boot chain drops from **3 files / ~8,750 tokens** to **2 files / ~6,750 tokens**, the number of hand-maintained steering files drops from **5+ to 3**, and a trigger-table change stops being a two-file write.

---

## Implementation status (2026-10-11)

**Shipped**

| Ref | Change | Where |
|---|---|---|
| R1 | Deleted `AI_CONTEXT.starter.md`; onboarding folded into the new `README.starter.md` | `global-configs/templates/` |
| R2 | Deleted `ARCHITECTURE_INDEX.starter.md`; navigation = README links + search | `global-configs/templates/` |
| — | New `README.starter.md` — the single home for what-this-is, structure, quick start | `global-configs/templates/README.starter.md` |
| — | `How to Change Safely` given its one home in `AI_ARCHITECTURE.starter.md` | `global-configs/templates/AI_ARCHITECTURE.starter.md` |
| R3 | Trigger table rewritten to **one file per row** | `07-documentation/documentation-strategy.md` |
| R3 | Added §The Mandated Doc Set (the five-document table + the "do not recreate" note) | `07-documentation/documentation-strategy.md` |
| R7 | Ratchet flipped: "prefer additive / deprecate in place" → "retire or replace" | repo `AGENTS.md`, `docs/repo-meta/guideline-authoring-standards.md` |
| R8 | Canonical-list rule stated once, in `guideline-authoring-standards.md` | `docs/repo-meta/` |
| R9 | Boot-chain budget held at 5,000; the doc-set rule was added by **narrowing** five existing rules | `global-configs/fragments/60-ai-collaboration.md` |
| R10 | New `check-doc-census.js` guard + test; wired into `npm run validate` as `docs:census` | `global-configs/scripts/` |
| — | Boot protocol, retrieval rules, `sync-manifest.json`, `sync-manager.ps1` fallback, `bump-freshness.js`, `check-docs-freshness.js`, `measure-boot-budget.js`, `audit-rules.js`, `MASTER_INDEX.md`, repo `README.md` all rewired | see `git diff` |
| — | `new-project.js` now scaffolds `README.md` and prints the reformed next-steps | `global-configs/scripts/new-project.js` |

**Deferred, with reason**

| Ref | Change | Why deferred |
|---|---|---|
| R4 | Retire the per-file metadata block (`Status/Scope/Token Tier/Last Updated/Cross-References`) from 100+ guideline files | Mechanical but wide; needs its own pass so a 100-file diff can be reviewed independently. The census guard covers the drift risk meanwhile. |
| R5 | Generate `MASTER_INDEX` category tables + cross-ref graph | Needs tags/token tiers moved into file front-matter first; that is R4's job. Hand-authored prose in the index is small and low-risk for now. |
| R6 | Collapse the `fragments/` pipeline | Re-read on implementation: the fragments are a legitimate **compiled extract** (`rule-extraction-methodology.md`), and `check-drift` already guarantees the template matches them. The real duplication was `AI_CONTEXT.md`, now deleted. Collapsing fragments would remove the compiled-extract layer the doctrine requires, so R6 is withdrawn as a net-negative. |

**New-app outcome.** `npm run new:project` now produces `AGENTS.md` + `WORLD.md` + `README.md` (plus `docs/AI_ARCHITECTURE.md` on demand) — three always-read files instead of four, with no duplicated facts, and `npm run docs:census` fails the gate if a canonical fact is ever restated into a second mandated doc.

---

## 1. What the guidelines actually mandate (measured)

### 1.1 The per-project steering set

From `guidelines/global-configs/sync-manifest.json` + `07-documentation/documentation-strategy.md`:

| Doc | Created by sync? | Size (template) | Tokens (chars/4) | Loaded |
|---|---|---|---|---|
| `AGENTS.md` | required | 20,239 chars | ~5,060 | **every session** |
| `WORLD.md` | required | 6,772 chars | ~1,693 | **every session** |
| `docs/AI_CONTEXT.md` | optional | 2,069 chars | target ≤2,000 | **every session** ("always loaded") |
| `docs/AI_ARCHITECTURE.md` | optional | 2,228 chars | — | on demand |
| `ARCHITECTURE_INDEX.md` | optional | 1,953 chars | — | on demand |
| `DEVTOOLS.md` | optional | 2,679 chars | — | on demand |
| `README.md` | not synced | — | — | on demand |
| `docs/adr/*.md` | manual | — | — | on demand |
| `docs/changelog/*.md` | manual | — | — | on demand |
| `docs/gate-receipts/*.md` | machine | — | — | cited |
| `guidelines-proposals/*.md` | manual | — | — | reviewed at sync |
| `.github/copilot-instructions.md` | optional | tiny | — | pointer only |

Reproduce the boot-chain measurement:

```bash
wc -c guidelines/global-configs/templates/AGENTS.starter.md \
      guidelines/global-configs/templates/WORLD.starter.md \
      guidelines/global-configs/templates/AI_CONTEXT.starter.md
# chars/4 ≈ tokens
```

**The always-read boot chain today = AGENTS.md + WORLD.md + AI_CONTEXT.md ≈ 8,750 tokens before any task work begins.** Every kilobyte added to any of these is paid by every session of every project.

### 1.2 The repo-side pipeline

| Artifact | Size | Purpose | Cost |
|---|---|---|---|
| `fragments/*.md` | 21,265 chars | second copy of every constitution rule | every rule change = edit fragment → render → validate → commit (2 files, 4 steps) |
| `_index/MASTER_INDEX.md` | 34,392 chars (~8,600 tok) | category tables + token counts + task table + **cross-reference graph** | hand-maintained; the cross-ref graph duplicates each file's own `Cross-References` section |
| `_index/GLOSSARY.md` | 22,223 chars | terminology | hand-maintained |
| per-file header block | on 100+ files | `Status / Scope / Token Tier / Last Updated / Cross-References` | hand-typed 100×; `bump-freshness.js` exists only to nudge them |

---

## 2. The duplication ledger (measured)

Each row is a canonical fact that exists in more than one *live, hand-maintained* place inside a synced project.

| Fact | Live copies | Evidence (grep) | Cost |
|---|---|---|---|
| **Stack versions table** | **2** — `AGENTS.md` §Stack, `AI_CONTEXT.md` §Stack | `grep -rl "Pin exact versions\|Pinned — Do NOT Use Ranges"` → fragment 90, AGENTS.starter, AI_CONTEXT.starter | version bump = 2 writes, guaranteed to drift |
| **Build/validation commands** | **2** — `AGENTS.md` §Build & Validation Commands, `AI_CONTEXT.md` §Commands | grep `## Commands` / `Build & Validation Commands` | command change = 2 writes |
| **"How to Change Safely"** | **3** — `AI_CONTEXT.md`, `ARCHITECTURE_INDEX.md`, and the trigger table names `AI_ARCHITECTURE.md`'s copy | `grep -rl "How to Change Safely\|How to Change Something Safely"` → documentation-strategy, AI_CONTEXT.starter, ARCHITECTURE_INDEX.starter, README | 3 writes per convention change |
| **"What this project is"** | **3** — `README.md`, `WORLD.md` §What This Project Is, `AI_CONTEXT.md` §What This Is | read | 3 writes per scope change |
| **Freshness header** (`Last Updated / Commit / Change`) | **5 steering docs + 44 guideline files** | `grep -rl "Last Updated:" --include=*.md` → 44 files | 44+ hand-typed dates |
| **Trigger list** | **3 lists + 2 prose restatements** | `grep -rl "Trigger Table\|trigger table"` → documentation-strategy (canonical), speed-tiered-workflow, workflow-friction-audit; restated in fragment `60-ai-collaboration.md` and `AGENTS.starter.md` | a new trigger = 5 edits |
| **Cross-reference list** | **2** — each file's `Cross-References` + `MASTER_INDEX.md` §Cross-Reference Graph | MASTER_INDEX lines 303–385 | link edit = 2 writes |
| **Forbidden patterns** | **≥5 lists** | `grep -rli "forbidden pattern"` → AGENTS.md, documentation-strategy, file-upload-security, ci-cd-philosophy, router-architecture, ai-governance-framework | a new forbidden pattern = 5+ edits |

**The trigger table makes duplication a rule.** `documentation-strategy.md` line 73 says a stack bump must update *"AGENTS.md Stack table + AI_CONTEXT.md"* — i.e. the guidelines *instruct* the agent to write the same fact twice, in the same document set that also declares "one canonical copy per rule."

---

## 3. Root causes

1. **The "compressed companion" anti-pattern.** `AI_CONTEXT.md` is defined as a *compressed* `AI_ARCHITECTURE.md`; `AI_ARCHITECTURE.md` restates `AGENTS.md` mandates. Compressing a document does not stop it from being a second copy — it just makes the drift harder to see.
2. **Hand-maintained indexes.** `MASTER_INDEX.md`'s cross-reference graph and `ARCHITECTURE_INDEX.md` are navigation that already exists as `→ See also` / `Cross-References` inside each file. Two hand-kept views of the same edges.
3. **A trigger table that mandates multi-file writes.** See §2. The table is the mechanism by which duplication becomes policy.
4. **Per-file metadata typed by hand.** `Status / Scope / Token Tier / Last Updated / Cross-References` on 100+ files. All of it is derivable — from the file, the folder, or `git`.
5. **"Prefer additive; deprecate rather than remove"** (`AGENTS.md` §No Breaking Changes). A one-way ratchet: the doc set can only grow. Nothing has ever been deleted.
6. **The fragments pipeline.** A deliberate compiled second copy of every rule. The `audit-rules.js` + `render` + `check-drift` machinery exists *only* because the second copy exists.

---

## 4. Reform principles

- **P1 — One question, one file.** A document earns its place only by answering a question no other document answers.
- **P2 — State it once, link everywhere.** This is already the doctrine; apply it to the mandated doc *set*, not just to rules inside files.
- **P3 — Indexes are generated, never hand-written.** If a human types a list of files or edges, it will rot.
- **P4 — The boot chain is a hard budget.** ≤2 files, ≤6,000 tokens, guarded. A new always-read doc requires retiring one.
- **P5 — Deletion is a first-class action.** Retire or replace; remove the old copy in the same commit. No deprecate-in-place.
- **P6 — Metadata is derived, not typed.** `Last Updated` comes from git; `Scope` from the folder; `Token Tier` from a generated table.

---

## 5. Target document set (per project)

| Doc | The one question it answers | Action |
|---|---|---|
| `AGENTS.md` | "What are the binding rules?" | **KEEP** — sole home for stack table, commands, forbidden patterns |
| `WORLD.md` | "What must this product NOT become?" | **KEEP** — strip the scale/security/data-freshness boilerplate that restates AGENTS/AI_ARCHITECTURE |
| `README.md` | "What is this, and how do I run it?" | **KEEP** — sole home for project description, structure tree, quick start |
| `docs/AI_ARCHITECTURE.md` | "Where does subsystem X live; what's the API?" | **KEEP** (on-demand) — registry facts only, no restated mandates |
| `docs/AI_CONTEXT.md` | — (duplicate) | **DELETE** — fold its 3-sentence summary into README; point the bootstrap at README + WORLD |
| `ARCHITECTURE_INDEX.md` | "Which docs exist?" | **DELETE** — replaced by README links (+ a *generated* index if truly needed) |
| `DEVTOOLS.md` | "What are these tool dirs?" | **DEMOTE** — the gitignore block moves to `.gitignore` comments; keep the file only if a project has ≥3 tool dirs |
| `docs/adr/*.md` | "Why did we decide X?" | **KEEP** |
| `docs/changelog/*.md` | history | **KEEP** (append-only) |
| `docs/gate-receipts/*.md` | evidence | **KEEP** (machine-written) |
| `guidelines-proposals/*.md` | lessons | **KEEP** |
| `.github/copilot-instructions.md` | pointer | **KEEP** — this is the pattern to imitate: it *links*, it does not copy |

**Result:** 5+ hand-maintained steering docs → 3 (`AGENTS.md`, `WORLD.md`, `README.md`) + one on-demand reference (`AI_ARCHITECTURE.md`).

---

## 6. Concrete changes

| # | Change | Touches |
|---|---|---|
| **R1** | **Delete `AI_CONTEXT.md`.** Move its 3-sentence summary + structure tree into `README.md`; update `AGENT_BOOT_PROTOCOL.md` Step 1 and `RETRIEVAL_RULES.md` to point at README + WORLD. Boot chain: 3 files → 2. | sync-manifest, documentation-strategy, AGENT_BOOT_PROTOCOL, RETRIEVAL_RULES, README |
| **R2** | **Delete `ARCHITECTURE_INDEX.md`.** If an index is still wanted, **generate** it (`npm run docs:index`) from file front-matter; never hand-edit. | sync-manifest, ARCHITECTURE_INDEX.starter |
| **R3** | **Make the trigger table a one-file write.** `"AGENTS.md Stack table + AI_CONTEXT.md"` → `"AGENTS.md Stack table"`. Same for commands (`AGENTS.md` only). | documentation-strategy §Trigger Table |
| **R4** | **Retire the per-file metadata block.** Keep `Status` inline; drop `Scope` / `Token Tier` / `Last Updated` / `Cross-References` from the header (derive them). Kills 44+ hand-typed dates and the reason `bump-freshness.js` exists. | all `guidelines/0X-*` files, guideline-authoring-standards |
| **R5** | **Generate the two indexes.** `MASTER_INDEX`'s category tables, token counts, and cross-reference graph → generated from front-matter + `→ See also` links. Hand-edit only the prose intro. | MASTER_INDEX.md + new `scripts/render-index.js` |
| **R6** | **Collapse the fragments pipeline.** Preferred: the rule text lives *once* — in the fragment — and the guideline file holds the WHY plus a link; `AGENTS.starter.md` renders from fragments (already does). Delete rule prose that duplicates the fragment. This removes `audit-rules.js`'s reason to exist. | fragments/, render-agents-starter, audit-rules |
| **R7** | **Flip the ratchet.** Change "Prefer additive; deprecate rather than remove" → "Retire or replace; remove the superseded copy in the same commit." | AGENTS.md §No Breaking Changes |
| **R8** | **Consolidate the forbidden-pattern lists** to one canonical list (`AGENTS.md` §Forbidden Patterns); every other site links. | 6 files |
| **R9** | **Cap the boot chain by retiring rules**, not by compressing them; wire the cap into `validate`. | fragments/manifest.json, check-drift |
| **R10** | **Add a doc-set census guard** — fails if a canonical fact (stack table, commands block, trigger table, project description) appears in more than one mandated project doc. | new `scripts/check-doc-census.js` |

---

## 7. Migration plan

- **Phase 0 — Baseline.** Add `npm run docs:census` in report-only mode; record today's duplicate counts (§2) as the before-number.
- **Phase 1 — Delete the pure duplicates.** R1 + R2 (AI_CONTEXT, ARCHITECTURE_INDEX). Update sync-manifest, the boot protocol, retrieval rules, and the trigger table in one commit.
- **Phase 2 — Generate the indexes.** R5 (+ R2's optional generated index). One script, one guard.
- **Phase 3 — Collapse the fragments.** R6. This is the largest single maintenance win.
- **Phase 4 — Retire the metadata.** R4 + R7.
- **Phase 5 — Lock it in.** R10 + R9 wired into `npm run validate`, so the doc set cannot regrow silently.

Each phase is independently shippable; downstream projects pick it up on the next sync.

---

## 8. Guards (so it cannot regrow)

| Guard | Fails when |
|---|---|
| `docs:census` | a canonical fact appears in >1 mandated project doc |
| boot-budget hard cap | AGENTS.md + WORLD.md exceeds the ceiling (already have `measure-boot-budget.js`; add a failing threshold) |
| doc-set allowlist | a new always-read steering doc is added without retiring one |
| generated-index drift | `MASTER_INDEX` / `docs/INDEX` differs from `render-index.js` output (mirrors the existing `check-drift`) |

These mirror the constitution's own token-budget rule ("a new rule MUST retire one") — the same discipline, applied to the document set.

---

## 9. What we deliberately keep

- **`AGENTS.md`** — the self-contained constitution is genuinely load-bearing and correctly designed (inline rules, no external dependency).
- **`WORLD.md`** — answers a question nothing else answers: what the product must *not* become.
- **`AI_ARCHITECTURE.md`** — the subsystem/API/migration registry holds facts that do not belong in a rules file.
- **ADRs, changelog archives, gate receipts, proposals** — immutable or machine-written; not hand-maintained prose, so they cost nothing per session.
- **`copilot-instructions.md`** — the pointer pattern is the model for everything else: *link, don't copy*.

---

## 10. Risks & trade-offs

| Risk | Mitigation |
|---|---|
| Deleting `AI_CONTEXT.md` removes the "compressed onboarding" for external tools | `AGENTS.md` is already self-contained; the `copilot-instructions.md` pointer already routes tools to it. The summary moves to `README.md`. |
| Generated indexes rot if the script rots | A drift guard fails when output ≠ rendered (the pattern already used by `check-drift`). |
| Downstream projects have already filled `AI_CONTEXT.md` | Mark it deprecated, not force-deleted; drop it from `sync-manifest` and the boot protocol so new projects never create it. |
| Phase 3 (fragments) touches the most machinery | Ship it last, behind its own guard, after Phases 1–2 have proven the pattern. |

---

## Appendix — reproduce every number

```bash
# boot-chain size (chars/4 ≈ tokens)
wc -c guidelines/global-configs/templates/AGENTS.starter.md \
      guidelines/global-configs/templates/WORLD.starter.md \
      guidelines/global-configs/templates/AI_CONTEXT.starter.md

# duplicate canonical facts
grep -rl "Pin exact versions\|Pinned — Do NOT Use Ranges" --include=*.md .
grep -rl "How to Change Safely\|How to Change Something Safely" --include=*.md .
grep -rl "Trigger Table\|trigger table" --include=*.md .
grep -rli "forbidden pattern" --include=*.md .
grep -rl "Last Updated:" --include=*.md | wc -l

# repo-side second copies
cat guidelines/global-configs/fragments/*.md | wc -c
wc -c guidelines/_index/MASTER_INDEX.md guidelines/_index/GLOSSARY.md
```
