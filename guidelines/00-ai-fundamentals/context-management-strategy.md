# Context Management Strategy — Optimizing AI Attention

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~800 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `ai-collaboration-mindset.md`, `prompt-engineering-patterns.md`

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
5. **Token budgets by task size:** quick fix → MASTER_INDEX + one compact primary file · complex feature → full primary + compact secondary · default to compact extracts; load full versions only when stuck.
6. **Compact extract format when context is tight:** Core Principles (numbered) + Anti-Patterns table only — skip purpose, examples, rationale (~200–500 tokens per file).

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Dumping the whole codebase into context | Progressive disclosure |
| One 80-message thread across five features | Fresh session per feature |
| Copying conversation history into new sessions | Handoff summary |
| Letting the AI search for files | Explicit file tags |
| Loading full guidelines for small tasks | Compact extracts |

## Cross-References

`ai-collaboration-mindset.md` · `prompt-engineering-patterns.md` · MASTER_INDEX.md token tiers
