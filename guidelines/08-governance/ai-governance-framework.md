---
status: "Normative"
scope: "Global"
tags: [governance, hierarchy, authority]
---

# AI Governance Framework — Authority Hierarchy and Control

---

## Authority Hierarchy (highest → lowest)

```
1. User's explicit prompt (session-level)
2. Project rules file (AGENTS.md / .cursor/rules/)
3. Global Normative guidelines
4. Global Advisory guidelines
5. IDE/agent defaults · model training defaults
```
Higher overrides lower. Guideline conflicts resolve: Normative > Advisory, Specific > General, Newer > Older; if still unclear, the more restrictive rule wins and the conflict is recorded. Security mandates (Normative) should not be overridden without an explicit, recorded override.

## Classification Tiers

| Tier | Binding | Violation |
|---|---|---|
| **Normative** | MUST follow | Error — AI refuses or flags |
| **Advisory** | SHOULD follow | Warning — note and justify |
| **Archived** | Do NOT load | Historical only |

## Governance Mechanisms

1. **Project rules file = constitution:** exact stack versions, forbidden patterns, security mandates, conventions. Committed to Git. AI MAY freely ADD, narrow, or retire project-specific rules. The ONE human gate: a **MAJOR** change to the constitution — removing or editing an existing global/baseline rule, or changing the security section — requires explicit human approval. Additions and narrowing never do.
2. **WORLD.md product guardrail:** what the project is and must NOT become (see `planning-and-scoping.md`).
3. **MCP governance** (full detail in `ai-security-governance.md`): whitelist tools per agent · separate credentials per environment · no production write for background agents · review destructive calls.
4. **A declared control owes a check.** Any rule whose failure mode is "the document drifted" or "someone forgot to update it" is a claim, not a control, until a machine can fail it (`documentation-strategy.md` §Guards for Steering Claims). Meta-guards — checks whose subject is another document — are budgeted at under **5% of the suite**, each carrying a non-vacuity probe; prefer one regenerate-and-diff (`docs:verify`) over a parity guard per document.
5. **Derive, never type, a fact a tool can compute.** Counters, freshness lines, changelog entries and decision numbers are produced by `npm run slice:close`; a hand-typed derived fact decays silently and reads as checked (`local-ci-strategy.md` §Slice Close).

## Contradiction Protocol (MANDATORY)

When a user direction contradicts any established guideline or project rule, the AI MUST:
1. **Pause and identify** the exact contradiction (which guideline, which section).
2. **Cite the source** — document path + section heading.
3. **Describe the conflict** — what the direction would do vs. what the guideline requires.
4. **Request explicit confirmation** before proceeding.

After confirmation: implement as directed, noting the override applies to the current task. The AI never decides a guideline is "unimportant" and skips this protocol — vibe coders forget constraints between sessions; the AI is the memory layer.

## Overriding Normative Rules

Legitimate only when: the rule doesn't apply to the technology · a higher authority supersedes it in the project rules file · compliance would cause a critical bug/security issue · the guideline is flagged Under Review. Overrides are documented (ADR or code comment referencing the decision) and revisited at quarterly audit. Security-related overrides need a recorded ADR and an automated security test.

## Governance Lifecycle

Before session: load rules file → WORLD.md → task-relevant guidelines. During generation: Normative violations flagged pre-output; Advisory violations noted with justification. After: violations fixed or explicitly overridden; recurring violations signal the guideline needs updating. Guidelines evolve Add → Promote → Demote → Archive via PRs with rationale — AI proposes and applies, recording the rationale in the PR body (plus an ADR when the change is architectural).

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| No rules file | Create AGENTS.md first |
| AI-written rules file | AI may freely ADD, narrow, or retire rules; only a MAJOR change to AGENTS.md needs human approval |
| Ignoring violations | Enforce or fix the guideline |
| Too many Normative rules | Reserve for critical constraints |

## Cross-References

`ai-security-governance.md` · `planning-and-scoping.md` · MASTER_INDEX.md task-type table
