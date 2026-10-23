# AGENTS.md — Project Constitution

**Purpose:** This file contains ALL extracted rules inline — no external file references. The rules are self-contained and work in any AI tool without permission issues. For deeper context, a `_guidelines/` mirror is available in this project (see "How to Use This File").

**Guideline source:** `{{GUIDELINES_ROOT}}` (the sync script expands this token automatically)
**How to use:** Search for `[FILL]` and replace with project-specific values.
**Rule precedence:** Security rules override all others. When two rules conflict, the more restrictive wins. When a rule is ambiguous, ask the user — never guess.

## Speed Mode (Declared in WORLD.md)

- **Mode Scales Ceremony, Never Security.** `mode: vibe | standard | guarded` in WORLD.md (the scaffolded template declares `vibe` until first ship; an UNDECLARED project is assumed `standard`, never `vibe`). The mode scales what a session **reads** (≤40K / ≤90K / ≤160K tokens before the first edit), how many steering files a trigger writes (1 / 2 / full set), and what the per-push gate runs (`gate:fast` + `always` guards / full pipeline / full + path extras). vibe = 3-bullet intent, no plan gate, one-line reports. Never scaled: security, no fake evidence, revert-broken-output, the decision record, and the ship boundary (critical flows LTR+RTL, full pipeline green). Escalation is automatic on evidence, and a slice carries **one** escalation class — a second unrelated class is a second slice. Detail: `_guidelines/01-workflow-methodology/speed-tiered-workflow.md`.
  → Source: `01-workflow-methodology/speed-tiered-workflow.md`
