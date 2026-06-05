# AI Agent Orchestration — Multi-Agent Workflow Design

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,400 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `context-management-strategy.md`, `prompt-engineering-patterns.md`

---

## Purpose

Define patterns for orchestrating multiple AI agents working in parallel or in sequence. As of 2026, the elite vibe coder's workflow has shifted from "prompt engineer" to "agent orchestrator" — someone who designs guardrails, delegates to parallel agents, and verifies autonomous work.

---

## Four Orchestration Paradigms

| Paradigm | How It Works | Best For | Risk Profile |
|---|---|---|---|
| **Sequential Agent** | One agent works through tasks in order. Human reviews at each step. | Simple features, bug fixes, learning a codebase | Low risk. High control. Slow. |
| **Parallel Agents** | 2-6 agents work simultaneously on different concerns. Human reviews at gates. | Complex features, multi-module changes, tight deadlines | Medium risk. Medium control. 3-4× faster. |
| **Agent Teams** | Multiple agents collaborate — one implements, one reviews, one tests, one audits security. | Major features, production-critical code, architectural changes | Higher risk. Requires strong specification. |
| **Background Agents** | Long-running autonomous tasks (refactors, test generation, documentation). Human reviews final output. | Boilerplate work, tech debt reduction, large test suites | Highest risk. Must sandbox carefully. |

---

## The Orchestrator's Responsibilities

When you shift from "AI as tool" to "AI as orchestrator," your role changes:

| Old Role (Tool User) | New Role (Orchestrator) |
|---|---|
| Write prompts one at a time | Design agent briefs with clear scope boundaries |
| Review code line by line | Define acceptance gates and verification criteria |
| Debug errors as they appear | Design monitoring and rollback strategies |
| Integrate AI output manually | Coordinate agent handoffs and merge conflict resolution |
| Trust your own judgment | Verify agent judgment with automated checks |

**The orchestrator's core skill is specification quality.** The better your agent briefs, the less you need to intervene. Sloppy briefs produce sloppy output across ALL agents simultaneously — a failure multiplier.

---

## Pattern 1: Decompose by Concern

Assign each agent a single, well-bounded concern. Never give two agents overlapping responsibilities.

```
Agent 1 (Frontend): Implement user profile page UI using MUI v7. 
  Scope: /src/pages/Profile.tsx, /src/components/profile/*.tsx
  Do NOT touch: backend routes, database, auth middleware

Agent 2 (Backend): Implement GET/PUT /api/profile endpoints.
  Scope: /src/routes/profile.ts, /src/services/profile.ts
  Do NOT touch: frontend components, database schema directly

Agent 3 (Tests): Write E2E tests for the profile feature using Playwright.
  Scope: /tests/e2e/profile.spec.ts
  Run against: the merged output of Agent 1 + Agent 2
```

**Why this works:** Clear scope boundaries prevent merge conflicts, enable parallel execution, and make each agent's output independently reviewable.

---

## Pattern 2: The Agent Brief Template

Every parallel agent or agent team member needs a structured brief. Use this template:

```
ROLE: [Specific expertise and responsibility]

TASK: [Single, clear objective]

SCOPE:
- Files you MAY modify: [explicit list]
- Files you MUST read first: [explicit list]
- Files you MUST NOT touch: [explicit list]

CONSTRAINTS:
- Technology: [exact versions]
- Patterns: [conventions to follow]
- Forbidden: [patterns, libraries, approaches to avoid]

ACCEPTANCE CRITERIA:
- [ ] [Verifiable condition 1]
- [ ] [Verifiable condition 2]
- [ ] [Verifiable condition 3]

OUTPUT FORMAT:
1. Summary of changes
2. Modified files
3. Verification instructions
4. Known limitations or risks
```

---

## Pattern 3: Sequential Gate Workflow

For high-stakes changes, use sequential agents with human approval gates between stages.

```
Stage 1: ARCHITECT agent → produces design document
  GATE: Human reviews and approves architecture

Stage 2: IMPLEMENTATION agent → writes code per approved design
  GATE: Human reviews code against design document

Stage 3: TEST agent → writes tests against implementation
  GATE: Human reviews test coverage and edge cases

Stage 4: SECURITY agent → audits implementation for vulnerabilities
  GATE: Human reviews security findings

Stage 5: DOCUMENTATION agent → updates docs to reflect changes
  GATE: Human reviews docs for accuracy
```

Each gate is a quality checkpoint. No agent proceeds until the human approves the previous stage's output. This is slower than parallel execution but produces production-grade quality for critical paths.

---

## Pattern 4: Arena Mode (Competitive Synthesis)

For high-stakes architectural decisions, dispatch the same problem to 2-3 different agents (or different models) and synthesize the best of each.

```
Dispatch: "Design a caching strategy for our dashboard that handles 10K concurrent users. 
Consider Redis vs in-memory vs CDN-edge caching. Output: architecture diagram + trade-off matrix."

Agent A (Claude Opus) → Redis-first approach
Agent B (GPT-5.5) → CDN-edge with Redis fallback
Agent C (Gemini 3.1) → Hybrid in-memory + Redis

Your role: Compare. Identify the best component from each. Synthesize a hybrid approach.
Optionally: Ask a fourth agent to produce the final synthesis for your review.
```

**Why this works:** Different models have different architectural biases. Running the same problem through multiple models surfaces approaches you wouldn't have considered. The synthesis produces a better solution than any single model could alone.

---

## Pattern 5: Background Agents with Sandboxing

For long-running autonomous tasks, run agents in the background with strict guardrails.

**Safe background tasks:**
- Generating test suites from existing code
- Running code formatters and linters
- Updating documentation to match current API signatures
- Refactoring within a single module (with existing tests)

**Dangerous background tasks (require human at gate):**
- Database migrations
- Auth/permission changes
- Infrastructure-as-code changes
- Package.json modifications
- Any change that affects multiple modules

**Sandboxing checklist:**
1. Background agent works on an isolated Git branch
2. Background agent has NO write access to production databases
3. Background agent has NO deployment permissions
4. Background agent's MCP/tool access is explicitly whitelisted
5. Human reviews ALL background agent output before merging

---

## Conflict Avoidance for Parallel Agents

The biggest risk in parallel execution is file conflicts. Two strategies:

### Strategy A: File Partitioning
Assign each agent a mutually exclusive set of files. This is the ideal case.

### Strategy B: Layer Partitioning
When agents must touch the same module, partition by layer:
- Agent 1: modifies the data layer (types, database)
- Agent 2: modifies the service layer (business logic)
- Agent 3: modifies the UI layer (components)
- Sequential merge order: Data → Service → UI

### Strategy C: Git Worktrees
Each agent works in its own Git worktree (separate directory, same repository). This eliminates file lock conflicts and enables truly independent work. Merge is manual but controlled.

---

## Monitoring Parallel Agents

When running 3+ agents simultaneously, you need visibility. Practices:

1. **Split-pane monitoring:** Keep agent outputs visible in adjacent panels. Catch drift early.
2. **Agent dashboard:** Some IDEs (Cursor, Claude Code) provide agent status views. Use them.
3. **Checkpoint commits:** Require each agent to commit after completing its scope. If one agent goes off-track, revert only its changes — not everyone's.
4. **Timeout budgets:** Don't let agents run indefinitely. "Spend max 15 minutes on this. Report progress or stop."

---

## When NOT to Use Parallel Agents

Parallel orchestration adds coordination overhead. Stay sequential when:

| Situation | Why Sequential Is Better |
|---|---|
| **Unfamiliar codebase** | You need to understand the code before you can partition agent work correctly |
| **Unclear requirements** | Parallel agents multiply ambiguity; clarify first, then parallelize |
| **Tightly coupled module** | File conflicts will waste more time than parallelism saves |
| **<3 files changed** | Coordination overhead exceeds parallelism benefit |
| **First time using orchestration** | Start with 2 agents max. Debug your orchestration skills before scaling. |

---

## Anti-Patterns in Agent Orchestration

| Anti-Pattern | Why It Fails | Fix |
|---|---|---|
| **Vague agent briefs** | "Build the dashboard" → six agents build six incompatible dashboards | Use the Agent Brief Template. Every agent gets a precise scope. |
| **Shared scope overlap** | Two agents edit the same file → merge conflicts, wasted work | File partitioning or layer partitioning |
| **No approval gates** | Agents run autonomously for hours → catastrophic divergence | Sequential gate workflow for critical paths |
| **Production access for background agents** | Background agent drops production database | Sandbox: isolated branch, no production MCP access |
| **Orchestrating without specification skills** | You can't verify agent output quality | Master sequential AI collaboration before adding parallelism |
| **Forking on trivial tasks** | Parallelism overhead exceeds task complexity | Stay sequential for <3 files or simple changes |

---

## Key Takeaways

1. Orchestration shifts your role from "prompt writer" to "specification author + quality gate."
2. Agent brief quality is the single biggest lever — precise scope boundaries prevent failure.
3. Decompose by concern (file or layer partitioning) to eliminate conflicts.
4. Use sequential gates for critical paths; parallel agents for well-understood features.
5. Sandbox background agents: isolated branches, no production access, human review required.
6. Start sequential. Add parallelism only when your specification skills are proven.

---

## Cross-References

- **Depends on:** `context-management-strategy.md` — attention partitioning for parallel agents
- **Depends on:** `prompt-engineering-patterns.md` — the Agent Brief Template is a specialized prompt pattern
- **Applied in:** `development-workflow.md` — where orchestration fits in the development lifecycle
- **Extended by:** `ai-governance-framework.md` — MCP governance and agent permission models
- **Extended by:** `skill-design-patterns.md` — reusable agent configurations as skills
