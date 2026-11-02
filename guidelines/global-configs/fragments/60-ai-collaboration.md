## AI Collaboration (Load for Every Session)

- **Read Before Edit & Surgical Scope.** Read target files and 1–2 sibling files to match local conventions before editing; NEVER guess imports, signatures, or schemas. Touch only task-required files — no drive-by refactors, unrequested formatting, or unrelated dependency bumps.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Self-Derived Acceptance Criteria.** State "correct when [verifiable conditions]" (`vibe`: 3 brief bullets inline) before editing; if the prompt is terse, derive them from codebase context and proceed.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Verify, Escalate & Report.** Verify every API and version claim. After 2 failed fix attempts, STOP guessing and search the web. NEVER leave TODO/FIXME/HACK/placeholder comments without permission — state gaps in the response. Report WHAT changed and WHERE (path + lines), no code blocks unless asked; offer a 3-sentence handoff when a thread grows long.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Docs on Triggers; One Home Per Fact.** A trigger-table match (`documentation-strategy.md`) updates the fact's one home in the same iteration (`Docs: updated <file>`); non-triggers write nothing. Irreversible decisions (auth, schema, pins, scope reversals) get an ADR. Doc set is `AGENTS.md` + `WORLD.md` + `README.md` (+ `docs/AI_ARCHITECTURE.md` on demand) — never an "AI context" copy; history lives in `docs/changelog/<YYYY>-Q<n>.md`.
  → Source: `07-documentation/documentation-strategy.md`
