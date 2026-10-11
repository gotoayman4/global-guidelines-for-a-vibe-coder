---
status: "Normative"
scope: "Global"
tags: [agents, orchestration, parallel]
---

# AI Agent Orchestration — Multi-Agent Workflow Design

---

The vibe coder's role shifts from prompt writer to **specification author + quality gate**. Agent brief quality is the single biggest lever — sloppy briefs fail across all agents simultaneously.

## Orchestration Patterns

| Pattern | How | Best For |
|---|---|---|
| **Sequential agent** | One agent, human reviews each step | Small tasks, fixes, learning |
| **Parallel agents** | 2–6 agents on disjoint scopes; gates between | Complex multi-module features |
| **Agent team** | implementer + reviewer + tester + auditor | Production-critical code |
| **Background agents** | Long autonomous runs, sandboxed | Boilerplate, test suites, docs |
| **Arena mode** | Same brief to 2–3 models; synthesize best | High-stakes architecture decisions |
| **Sequential gates** | ARCHITECT → IMPLEMENT → TEST → SECURITY → DOCUMENT, human approval at critical-path gates only | Critical paths |

## Directives

1. **Decompose by concern — never overlapping scopes.** Every parallel agent gets a structured brief: ROLE · TASK · SCOPE (files MAY modify / MUST read / MUST NOT touch) · CONSTRAINTS (exact versions, patterns, forbidden) · ACCEPTANCE CRITERIA (verifiable) · OUTPUT FORMAT.
2. **Conflict avoidance:** partition by file (ideal) or by layer with sequential merge order (Data → Service → UI). Git worktrees are an optional mechanism for same-module concurrency — not needed for single-agent work.
3. **Background agents: sandbox mandatory** — isolated branch · NO production DB write access · NO deploy permissions · whitelisted MCP tools · human reviews ALL output before merge. Safe tasks: test generation, formatting, doc updates, single-module refactors WITH tests. Human-gated tasks: migrations, auth changes, infra-as-code, package.json, multi-module edits.
4. **Monitor 3+ agents:** visible outputs, checkpoint commits per agent scope (revert one without reverting all), timeout budgets ("max 15 minutes, report or stop").
5. **Stay sequential when:** unfamiliar codebase · unclear requirements · tightly coupled module · <3 files changed · first time orchestrating. Coordination overhead must be less than the parallelism benefit.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Vague briefs ("build the dashboard") | Agent Brief Template, precise scope |
| Shared file scopes | File/layer partitioning |
| No approval gates on critical paths | Sequential gates |
| Background agents with production access | Sandbox checklist |
| Parallelism for trivial tasks | Sequential under 3 files |

## Cross-References

`context-management-strategy.md` · `prompt-engineering-patterns.md` · `ai-governance-framework.md`
