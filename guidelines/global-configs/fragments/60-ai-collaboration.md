## AI Collaboration (Load for Every Session)

- **AI Output is Draft, Not Final.** Treat first AI output as a draft; iterate WHEN it misses acceptance criteria — a correct first output needs no forced second pass.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Speed Is a Metric, Not a Vibe.** Record intent → first running slice each iteration. Correct-but-slow is a defect like fast-and-broken-auth — scale ceremony with WORLD.md mode; never scale security or honesty.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Acceptance Criteria + Pattern References.** Every prompt states "correct when [verifiable conditions]" (vibe MAY compress to 3 intent bullets for small non-critical work) and points at 2–3 existing files as pattern templates — without references, AI invents inconsistent patterns.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Fresh Session Per Feature.** One fresh session per feature — 100-message threads produce constraint-violating output. Transfer via a 3-sentence handoff, not chat history.
  → Source: `00-ai-fundamentals/context-management-strategy.md`
- **AI Has No Concept of Correctness.** AI predicts plausible tokens, not truth — verify every claim, especially APIs and versions. After 2 failed attempts, STOP and search the web before a 3rd.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **No Silent TODOs or Placeholders.** NEVER generate TODO/FIXME/HACK/placeholder comments without explicit permission — state gaps in the response. Escape hatch: tracker issue number + descriptive error on unimplemented paths.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Output Efficiency.** Describe WHAT changed (1–2 plain sentences) and WHERE (path + lines); compare behavior, not code; never paste code blocks unless asked. Edit files directly.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Docs Line Fires on Triggers Only.** Trigger-table match (endpoint, table, env var, dependency, auth/RBAC, shared component, convention, guardrail) → update steering docs same-iteration and report `Docs: updated <files>`. Non-trigger → NO Docs line; silence is correct, a padded `N/A` is ceremony. Missing a real trigger is a violation.
  → Source: `07-documentation/documentation-strategy.md`
- **Boot Files Carry No History; One Copy Per Rule.** Always-read files keep change logs in dated archives (`docs/changelog/<doc>-<YYYY>-Q<n>.md`) behind a pointer heading (relocate verbatim; ~50-word entries, ≤400-char lines). Each canonical list lives in exactly one file — every other site links; parity tests guard the copies.
  → Source: `07-documentation/documentation-strategy.md`
- **Reference Machine Output, Never Transcribe.** Verification numbers go into artifacts (`docs/gate-receipts/…`) and are cited by path — hand-copied figures decay silently.
  → Source: `07-documentation/documentation-strategy.md`
- **Globalize Lessons.** Mistakes worth never repeating become proposals in `guidelines-proposals/YYYY-MM-DD-<slug>.md` (event, preventing rule, target file) — never session-only; reviewed at sync time.
  → Source: `01-workflow-methodology/development-workflow.md`
