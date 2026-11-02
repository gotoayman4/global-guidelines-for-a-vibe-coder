## AI Collaboration (Load for Every Session)

- **Read Before Edit & Surgical Scope.** Read target files and 1–2 sibling files to match local conventions before editing; NEVER guess imports, signatures, or schemas. Touch only task-required files — no drive-by refactors, unrequested formatting, or unrelated dependency bumps.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Self-Derived Acceptance Criteria.** State "correct when [verifiable conditions]" (`vibe`: 3 brief bullets inline) before editing. If the prompt is terse, derive criteria from codebase context and proceed — iterate if first output misses them.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Fresh Session Per Feature.** Long threads degrade constraint compliance. Transfer via a 3-sentence handoff, not chat history.
  → Source: `00-ai-fundamentals/context-management-strategy.md`
- **Verify APIs & Web Escalation.** Verify every API and version claim. After 2 failed fix attempts, STOP guessing and search the web.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **No Silent TODOs & Output Efficiency.** NEVER generate TODO/FIXME/HACK/placeholder comments without permission — state gaps in the response. Report WHAT changed (1–2 sentences) and WHERE (path + lines); no code blocks unless asked.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Docs Change on Triggers Only.** A trigger-table match (`documentation-strategy.md`) updates the fact's one home in the same iteration (`Docs: updated <file>`); non-triggers write nothing. Irreversible decisions (auth, schema, pins, scope reversals) get an ADR; commits record the rest.
  → Source: `07-documentation/documentation-strategy.md`
- **One Home Per Fact.** Doc set is `AGENTS.md` + `WORLD.md` + `README.md` (+ `docs/AI_ARCHITECTURE.md` on demand) — never an "AI context" copy; a new doc retires one. Canonical lists live in one file (`npm run docs:census` when wired checks this); history lives in `docs/changelog/<YYYY>-Q<n>.md`.
  → Source: `07-documentation/documentation-strategy.md`
