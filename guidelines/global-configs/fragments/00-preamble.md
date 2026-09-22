# AGENTS.md — Project Constitution

**Purpose:** This file contains ALL extracted rules inline — no external file references. The rules are self-contained and work in any AI tool without permission issues. For deeper context, a `_guidelines/` mirror is available in this project (see "How to Use This File").

**Guideline source:** `{{GUIDELINES_ROOT}}` (the sync script expands this token automatically)
**How to use:** Search for `[FILL]` and replace with project-specific values.
**Rule precedence:** Security rules override all others. When two rules conflict, the more restrictive one wins. When a rule is ambiguous for your situation, ask the user — never guess.

## Speed Mode (Declared in WORLD.md)

- **Mode Scales Ceremony, Never Security.** `mode: vibe | standard | guarded` in WORLD.md (default `vibe` until first ship). vibe = 3-bullet intent, no plan gate, smoke + regression-on-second-bite, one-line reports, Docs line on triggers only. standard/guarded = full depth. Absolute everywhere: security rules, no fake evidence, revert-broken-output, critical-flow checks LTR+RTL before any ship, full pre-push gate. Record intent → first running slice each iteration; escalate mode when the same bug bites twice. Detail: `_guidelines/01-workflow-methodology/speed-tiered-workflow.md`.
  → Source: `01-workflow-methodology/speed-tiered-workflow.md`
