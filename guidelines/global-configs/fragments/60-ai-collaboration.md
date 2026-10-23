## AI Collaboration (Load for Every Session)

- **AI Output is Draft, Not Final.** Treat first AI output as a draft; iterate WHEN it misses acceptance criteria.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Speed Is a Metric, Not a Vibe.** Record intent → first running slice each iteration. Correct-but-slow is a defect like fast-and-broken-auth — scale ceremony with WORLD.md mode; never scale security or honesty.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Acceptance Criteria + Pattern References.** Every prompt states "correct when [verifiable conditions]" (vibe MAY compress to 3 bullets for small work) and points at 2–3 existing files as pattern templates.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Fresh Session Per Feature.** One fresh session per feature — 100-message threads produce constraint-violating output. Transfer via a 3-sentence handoff, not chat history.
  → Source: `00-ai-fundamentals/context-management-strategy.md`
- **AI Has No Concept of Correctness.** AI predicts plausible tokens, not truth — verify every claim, especially APIs and versions. After 2 failed attempts, STOP and search the web.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **No Silent TODOs or Placeholders.** NEVER generate TODO/FIXME/HACK/placeholder comments without explicit permission — state gaps in the response. Escape hatch: tracker issue number + descriptive error on unimplemented paths.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Output Efficiency.** Describe WHAT changed (1–2 sentences) and WHERE (path + lines); compare behavior, not code; no code blocks unless asked. Edit files directly.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Docs Line Fires on Triggers Only.** Trigger-table match (`documentation-strategy.md`) → update steering the same iteration and report `Docs: updated <files>`; non-trigger → NO Docs line, silence is correct, a padded `N/A` is ceremony. **Breadth scales with the mode** (vibe writes the record only); the decision record never scales. Missing a real trigger is a violation.
  → Source: `07-documentation/documentation-strategy.md`
- **One Home Per Fact.** The mandated doc set is `AGENTS.md` + `WORLD.md` + `README.md` (+ `docs/AI_ARCHITECTURE.md` on demand) — never add a compressed "AI context"/index copy; a new doc retires one. Each canonical list lives in exactly one file; every other site links, and `npm run docs:census` fails on a restated fact. Always-read files keep change logs in one dated archive per quarter (`docs/changelog/<YYYY>-Q<n>.md`), not inline.
  → Source: `07-documentation/documentation-strategy.md`
- **Reference Machine Output, Never Transcribe.** Verification numbers go into artifacts (`docs/gate-receipts/…`) and are cited by path — hand-copied figures decay silently.
  → Source: `07-documentation/documentation-strategy.md`
- **Globalize Lessons.** A mistake worth never repeating becomes a proposal in `guidelines-proposals/YYYY-MM-DD-<slug>.md` naming the event, the preventing rule, the target guideline, **and the guard that fails if the lesson is unlearned** — a lesson with no failing check is a wish, not a control.
  → Source: `07-documentation/documentation-strategy.md`
