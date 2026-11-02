# AGENTS.md — Project Constitution

**Purpose:** Always-loaded project rules, self-contained. Deeper guidance in `_guidelines/` loads on demand. Read `## Reference & Project Setup` (stack, commands, mandates) first — it is project-specific and outranks the generic rules below it.

**Guideline source:** `{{GUIDELINES_ROOT}}` (expanded by sync)
**Rule precedence:** Security overrides all, then project mandates, then these rules; on conflict the stricter rule wins, except that `mode` scales process only (see Speed Mode). Inspect local codebase patterns first. Ask the user only when product intent, security, or destructive scope is ambiguous — otherwise proceed and state the assumption. Optional modules (web, API, RTL) are included per WORLD.md `## Capabilities`.

<!-- BEGIN generated:constitution-core — written by sync-guidelines.ps1, do not edit inside -->
## Speed Mode (Declared in WORLD.md)

- **Mode Scales Ceremony, Never Security.** `mode: vibe | standard | guarded` in WORLD.md (undeclared = `standard`) scales pre-edit read budget (≤40K / ≤90K / ≤160K tokens), planning depth (`vibe`: 3-bullet inline intent, no plan gate, straight to code) and per-push gate. Never scaled: security, honest evidence, reverting broken output, ship boundary (critical flows LTR+RTL, full pipeline green). Auth, payments, schema and destructive data changes are planned in every mode. Detail: `_guidelines/01-workflow-methodology/speed-tiered-workflow.md`.
  → Source: `01-workflow-methodology/speed-tiered-workflow.md`
