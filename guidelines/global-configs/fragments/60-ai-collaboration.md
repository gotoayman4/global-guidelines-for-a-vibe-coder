## AI Collaboration (Load for Every Session)

- **AI Output is Draft, Not Final.** Iterate when the first output misses the acceptance criteria.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Acceptance Criteria + Pattern References.** Every prompt states "correct when [verifiable conditions]" (vibe MAY compress to 3 bullets). Point at existing files as patterns when the convention is not obvious from the tree.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Fresh Session Per Feature.** Long threads produce constraint-violating output. Transfer via a 3-sentence handoff, not chat history.
  → Source: `00-ai-fundamentals/context-management-strategy.md`
- **AI Has No Concept of Correctness.** Verify every claim, especially APIs and versions. After 2 failed attempts, STOP and search the web.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **No Silent TODOs or Placeholders.** NEVER generate TODO/FIXME/HACK/placeholder comments without explicit permission — state gaps in the response.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Output Efficiency.** Report WHAT changed (1–2 sentences) and WHERE (path + lines); no code blocks unless asked.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Docs Change on Triggers Only.** A trigger-table match (`documentation-strategy.md`) updates the fact's one home in the same iteration and reports `Docs: updated <file>`; a non-trigger writes nothing. Irreversible decisions (auth, schema, pins, scope reversals) get an ADR; the commit message records everything else.
  → Source: `07-documentation/documentation-strategy.md`
- **One Home Per Fact.** The doc set is `AGENTS.md` + `WORLD.md` + `README.md` (+ `docs/AI_ARCHITECTURE.md` on demand) — never an "AI context" copy; a new doc retires one. Each canonical list lives in one file; others link (`npm run docs:census` fails a restated fact). History lives in `docs/changelog/<YYYY>-Q<n>.md`, not in always-read files.
  → Source: `07-documentation/documentation-strategy.md`
