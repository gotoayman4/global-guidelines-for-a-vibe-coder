# AI Governance Framework — Authority Hierarchy and Control

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~900 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `ai-security-governance.md`, `planning-and-scoping.md`

---

## Authority Hierarchy (highest → lowest)

```
1. User's explicit prompt (session-level)
2. Project rules file (AGENTS.md / .cursor/rules/)
3. Global Normative guidelines
4. Global Advisory guidelines
5. IDE/agent defaults · model training defaults
```
Higher overrides lower. Guideline conflicts resolve: Normative > Advisory, Specific > General, Newer > Older; if still unclear, the human decides. Security mandates (Normative) should not be overridden without explicit human acknowledgment.

## Classification Tiers

| Tier | Binding | Violation |
|---|---|---|
| **Normative** | MUST follow | Error — AI refuses or flags |
| **Advisory** | SHOULD follow | Warning — note and justify |
| **Archived** | Do NOT load | Historical only |

## Governance Mechanisms

1. **Project rules file = constitution:** exact stack versions, forbidden patterns, security mandates, conventions. Committed to Git. AI MAY freely ADD project-specific rules and mandates; REMOVING or EDITING an existing global/baseline rule requires explicit human approval (gate removals/edits of global rules, not additions).
2. **WORLD.md product guardrail:** what the project is and must NOT become (see `planning-and-scoping.md`).
3. **MCP governance** (full detail in `ai-security-governance.md`): whitelist tools per agent · separate credentials per environment · no production write for background agents · review destructive calls.

## Contradiction Protocol (MANDATORY)

When a user direction contradicts any established guideline or project rule, the AI MUST:
1. **Pause and identify** the exact contradiction (which guideline, which section).
2. **Cite the source** — document path + section heading.
3. **Describe the conflict** — what the direction would do vs. what the guideline requires.
4. **Request explicit confirmation** before proceeding.

After confirmation: implement as directed, noting the override applies to the current task. The AI never decides a guideline is "unimportant" and skips this protocol — vibe coders forget constraints between sessions; the AI is the memory layer.

## Overriding Normative Rules

Legitimate only when: the rule doesn't apply to the technology · a higher authority supersedes it in the project rules file · compliance would cause a critical bug/security issue · the guideline is flagged Under Review. Overrides are documented (ADR or code comment referencing the decision) and revisited at quarterly audit. Security-related overrides need second human review.

## Governance Lifecycle

Before session: load rules file → WORLD.md → task-relevant guidelines. During generation: Normative violations flagged pre-output; Advisory violations noted with justification. After: violations fixed or explicitly overridden; recurring violations signal the guideline needs updating. Guidelines evolve Add → Promote → Demote → Archive via PRs with rationale — AI proposes, humans approve.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| No rules file | Create AGENTS.md first |
|| AI-written rules file | AI may freely ADD rules; only removals/edits of global baseline rules need human approval |
| Ignoring violations | Enforce or fix the guideline |
| Too many Normative rules | Reserve for critical constraints |

## Cross-References

`ai-security-governance.md` · `planning-and-scoping.md` · MASTER_INDEX.md task-type table
