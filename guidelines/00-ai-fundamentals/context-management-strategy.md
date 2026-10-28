---
status: "Normative"
scope: "Global"
tags: [context, tokens, efficiency]
---

# Context Management Strategy — Optimizing AI Attention

---

Context windows exceed 1M tokens in 2026 — the constraint is no longer "will it fit?" but "will the AI attend to the right things?" More capacity enables sloppier input, and sloppier input degrades output: constraints buried mid-conversation get lost, rules compliance slips after ~50 messages, mid-window tasks suffer "lost in the middle." Context is about *reach*, not *density*.

## Directives

1. **Progressive disclosure:** load only what the task needs, expand on demand — ① task trigger (prompt + active file) → ② direct dependencies (component + imports + test + guideline; 3–8 files) → ③ context dependencies (parents, contracts, types) → ④ deep dive (full modules; architecture reviews only). Never pre-load everything.
2. **Session hygiene:** attention degrades with conversation length — excellent at 1–15 messages, degrading at 30–50, poor beyond 50. Fresh session per major feature; transfer only essential context.
3. **Handoff pattern replaces history:** three sentences beat 40 messages —
   ```
   Previous: Implemented JWT auth in /src/auth/jwt.ts. Tests pass.
   Current: Add role-based authorization on top. Read /src/auth/jwt.ts first.
   ```
4. **Explicit file tagging always** (`@file` mentions or explicit paths) + explicit non-goals ("do NOT modify any other files"). AI searching a large repo picks wrong files, outdated versions, or wrong modules.
5. **Token budgets by task size:** quick fix → the one primary file, named directly (`MASTER_INDEX.md` only when you cannot name it) · complex feature → full primary + compact secondary · default to compact extracts; load full versions only when stuck.
6. **Compact extract format when context is tight:** Core Principles (numbered) + Anti-Patterns table only — skip purpose, examples, rationale (~200–500 tokens per file).
7. **Budget the mandatory chain, not just the prompt.** Every project has reading it cannot skip: its `AGENTS.md` (rules) and `WORLD.md` (intent + mode). `README.md` is orientation for a newcomer; plan documents are sprint artifacts, not boot reading. Those files are paid per session, so their growth is a tax, not a storage problem.
   Measure them (`node _guidelines/global-configs/scripts/measure-boot-budget.js .` → characters, `chars/4` tokens, and how much of each file is dated history), then hold the line: an always-read file MUST NOT carry its own change log (relocate it to dated archives and keep the pointer — see `documentation-strategy.md`), and an index states where things are, never what they say.
   The command is report-only by default; `--strict` enforces thresholds and missing files in an explicit authoritative list, while an entirely missing corpus is a data error in either mode.
   **The budget is per mode, and the reading list is a menu.** `speed-tiered-workflow.md` owns the numbers (`vibe ≤40K`, `standard ≤90K`, `guarded ≤160K` tokens before the first edit) and the split between the chain — the `every session` floor a mode cap governs — and the menu, which is ratcheted rather than budgeted; `07-documentation/documentation-strategy.md` §The Mandated Doc Set owns which documents are `every session`. A session names the 2–4 files its task needs rather than reading the whole list because the list is mandated. Reading past the cap is allowed and must be recorded in one line — an unrecorded overshoot is the tax nobody sees.
8. **A budget is a number with a guard.** The knowledge base budgets its own always-loaded constitution (`global-configs/fragments/manifest.json` → `maxTokens`, enforced by `render-agents-starter.js --check`), so a rule added to the constitution must retire a rule somewhere. Give the project's constitution the same treatment.
   "It feels long" is not a measurement, and an unenforced budget is the same bloat with a number next to it. Keep the guard non-vacuous:
   `guidelines/global-configs/scripts/tests/measure-boot-budget.test.js` proves valid input, missing-file diagnostics, strict failure, and a deliberately broken threshold fixture.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Dumping the whole codebase into context | Progressive disclosure |
| One 80-message thread across five features | Fresh session per feature |
| Copying conversation history into new sessions | Handoff summary |
| Letting the AI search for files | Explicit file tags |
| Loading full guidelines for small tasks | Compact extracts |
| A mandated boot file that grew for a year and was never measured | Budget it, then move its history out |
| A "quick reference" copy of a table that already exists | Link the canonical file; a second copy is a second document to maintain |

## Cross-References

`ai-collaboration-mindset.md` · `prompt-engineering-patterns.md` · `documentation-strategy.md` (what leaves an always-read document) · `workflow-friction-audit.md` (the scheduled measurement) · MASTER_INDEX.md token tiers
