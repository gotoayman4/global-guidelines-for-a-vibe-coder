# AGENTS.md — Project Constitution

**Purpose:** The always-loaded rules for this project, self-contained. Deeper guidance lives in the `_guidelines/` mirror and is read only when a task needs it.

**Guideline source:** `{{GUIDELINES_ROOT}}` (the sync script expands this token automatically)
**Rule precedence:** Security rules override all others. When two rules conflict, the more restrictive wins. When a rule is ambiguous, ask the user — never guess.

## Speed Mode (Declared in WORLD.md)

- **Mode Scales Ceremony, Never Security.** `mode: vibe | standard | guarded` in WORLD.md (undeclared = `standard`) scales the read budget before the first edit (≤40K / ≤90K / ≤160K tokens), planning depth (vibe: 3-bullet intent, no plan gate) and the per-push gate. Never scaled: security, honest evidence, reverting broken output, the ship boundary (critical flows LTR+RTL, full pipeline green). Auth, payments, schema and destructive data changes are planned in every mode. Detail: `_guidelines/01-workflow-methodology/speed-tiered-workflow.md`.
  → Source: `01-workflow-methodology/speed-tiered-workflow.md`
