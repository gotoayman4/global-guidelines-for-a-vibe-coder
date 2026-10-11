---
status: "Normative"
scope: "Global"
tags: [mindset, philosophy, anti-patterns]
---

# AI Collaboration Mindset — The Vibe Coder's Foundation

---

## Core Principles

1. **AI is a junior engineer; you are the senior.** Infinite speed, zero judgment. It confidently produces plausible-but-wrong code. Never delegate judgment — only execution.
2. **Speed is a first-class metric alongside accuracy.** Time from intent to first running slice is measured every iteration, not guessed — a process that is correct but slow is a defect, same as a fast process that ships broken auth. Scale ceremony with the mode (`speed-tiered-workflow.md`); never scale security or honesty.
3. **Own the specification.** Specification quality is the single biggest output lever: happy path · boundaries (what NOT) · constraints · acceptance criteria · failure states.
4. **Vertical slices, not horizontal layers** — one complete feature UI→DB at a time.
5. **Tests are behavioral contracts,** not implementation verification. Depth follows mode: smoke + regression-on-second-bite in vibe; full pyramid at the ship boundary.
6. **All AI output is a draft.** AI gets syntax right ~95%, business logic ~60%. The gap is your responsibility.
7. **Control context aggressively** — see `context-management-strategy.md`.
8. **Limit blast radius:** small isolated changes; commit frequently; never >3–5 files per change without a self-review pass (vibe MAY batch micro-edits into one conventional commit — never end a session uncommitted).
9. **Use AI to reason, not just generate:** edge-case discovery, trade-off analysis, design review.
10. **Iterate prompts:** first attempts are drafts; refine constraints based on observed output.
11. **Know when NOT to use AI:** manual is faster for simple well-known patterns; security-critical code gets maximum scrutiny regardless — AI self-review plus automated auth-flow tests.

## Core Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Silent regression** — passes tests, breaks undocumented expectations | Tests BEFORE generation define the contract |
| **Architectural entropy** — locally optimal, globally incoherent | ADRs + review for architectural fit + proactive refactor |
| **False confidence** — compiles, looks professional, still wrong | Never trust without explicit verification of edge cases |
| **Silent TODOs** — untracked placeholders ship incomplete | Prohibit TODO generation in rules; eslint no-warning-comments; tracker-issue references |
| **Cross-file duplication** — same logic forked across files | Search before writing new logic; extract shared utilities immediately (`code-duplication-prevention.md`) |
| **Pattern drift** — inconsistent conventions across sessions | Always reference 2–3 existing files as pattern templates |

## Paradigm Choice

**AI-as-Tool** (sequential prompts, human integrates): small tasks, fixes, learning — start here.
**AI-as-Orchestrator** (goal-driven delegation to sub-agents, gates): large multi-file features — fails catastrophically without specification hygiene (see `ai-agent-orchestration.md`).

## Honesty Directives (Anti-Sycophancy)

1. Refuse to validate without evidence — no "looks good" without running tests or checking a spec.
2. Resist manufactured urgency — name the trade-off exactly once ("shipping without X may break Y"), then comply. No repeated warnings, no apologies.
3. Say "I do not know" / "I need to verify X" instead of inventing plausible answers.
4. Match verification depth to risk: trivial → syntax check; logic → manual trace; concurrency → written scenario.
5. No restated-code comments — WHY only, when non-obvious.
6. Surface hidden architectural trade-offs in the response; never bury them.

## Anti-Patterns

| Anti-Pattern | Why Dangerous |
|---|---|
| "The AI said it's correct" | Predicts tokens, not truth |
| Prompting without constraints | Bloated, wrong output |
| Accepting code without tests | Unverified until proven |
| "It compiled, so it works" | Syntax ≠ logic ≠ security |
| Trusting AI-suggested versions | Training data stale — verify via web |
| Treating AI as a search engine | Hallucinates facts/APIs |

## Cross-References

`speed-tiered-workflow.md` · `prompt-engineering-patterns.md` · `context-management-strategy.md` · `ai-agent-orchestration.md` · `ai-security-governance.md`
