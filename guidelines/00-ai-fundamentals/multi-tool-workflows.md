# Multi-Tool Workflows — Coordinating Multiple AI Tools in the Same Repository

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,800 tokens)
**Last Updated:** 2026-05-25
**Cross-References:** `ai-agent-orchestration.md`, `ai-collaboration-mindset.md`, `context-management-strategy.md`

---

## Purpose

Define how to use multiple AI coding tools (Cursor, Claude Code, GitHub Copilot, Windsurf, Qoder, etc.) simultaneously in the same repository. A single vibe coder using multiple tools needs coordination rules, not chaos.

---

## Rule File Coexistence

A repository with multiple AI tools may have several configuration files. These must coexist without contradicting each other.

### Standard Rule File Layout

```
project-root/
├── AGENTS.md                          # Canonical rules source (tool-agnostic)
├── CLAUDE.md                          # Claude Code rules (references AGENTS.md)
├── .cursor/rules/                     # Cursor 0.45+ project rules
│   └── global.mdc                     # References AGENTS.md
├── .github/copilot-instructions.md    # GitHub Copilot instructions
├── WORLD.md                           # Product intent guardrail (all tools)
└── .vscode/settings.json              # VS Code workspace settings (if needed)
```

### The Single Source of Truth Principle

**AGENTS.md is the canonical rules file.** All tool-specific configs should reference it, not duplicate it.

```
AGENTS.md (canonical) ← CLAUDE.md (references it)
                      ← .cursor/rules/global.mdc (references it)
                      ← .github/copilot-instructions.md (references it)
```

**Rule:** When updating rules, always update AGENTS.md first. Tool-specific configs reference AGENTS.md — they should be updated only when tool-specific behavior is needed.

### Minimum Tool-Specific Config Contents

Each tool config should contain at minimum:
1. A reference to AGENTS.md: "Read AGENTS.md at project root before starting"
2. Build & validation commands specific to the project
3. Project layout description
4. Any tool-specific constraints (model preference, autonomous agent settings)

**Anti-pattern:** Duplicating the same security/testing/architecture rules in 4 different config files. When a rule changes, you must update 4 files. Instead, put rules in AGENTS.md and have tool configs reference it.

---

## Tool Capability Matrix

Not all rules can be enforced by all tools. Use this matrix to decide what goes where:

| Rule Type | Cursor | Claude Code | Copilot | VS Code Copilot |
|---|---|---|---|---|
| File size limits | Yes (rules) | Yes (CLAUDE.md) | No | No |
| Security mandates | Yes | Yes | Partial | Partial |
| Commit conventions | No | Yes (CLI) | No | No |
| Build commands | Yes | Yes | Yes | No |
| Linting rules | Yes (ESLint) | Yes | Yes (ESLint) | Yes (ESLint) |
| Project layout | Yes | Yes | Yes | Partial |
| Session bootstrap | No | Yes | No | No |
| Autonomous agent behavior | Yes (agent) | Yes (agent) | Yes (cloud agent) | No |

**Rule:** Security mandates should be duplicated in every tool config. File size limits only work in Cursor and Claude Code. Commit conventions only work in Claude Code CLI.

---

## Cross-Model and Cross-Tool Validation

When using multiple AI tools, you get multiple perspectives on the same problem. Use this deliberately.

### The Multi-Tool Review Pattern

```
1. Tool A (Cursor + Claude Sonnet): Implement feature
2. Tool B (Claude Code + Claude Opus): Review for architecture issues
3. Tool C (Copilot chat + GPT-4o): Review for security issues
4. Tests: The final arbiter — if tests pass in both tools' output, you have cross-validation
```

### When Tools Disagree

If two AI tools suggest different approaches:
1. **Tests are the arbiter** — write a behavioral test that defines the correct behavior
2. **Simpler solution wins** — default to the approach with fewer files changed, fewer dependencies added, less abstraction
3. **Document the decision** — note in ADR why one approach was chosen over the other
4. **Never average the outputs** — combining two different implementations creates Frankenstein code

### Model Selection for Multi-Tool Workflows

| Task Phase | Tool | Model | Why |
|---|---|---|---|
| Architecture/Planning | Claude Code | Opus / Sonnet | Best long-form architectural reasoning |
| Implementation | Cursor | Sonnet / GPT-4o | Best inline code generation |
| Quick fixes | Any | Haiku / GPT-4o-mini | Fast, cheap, good enough |
| Security review | Claude Code | Opus | Best security reasoning |
| Code review | Any (second tool) | Different from implementer | Fresh perspective |
| E2E testing | Cursor | Sonnet | Good test generation |
| Boilerplate/generation | Any | Haiku / Flash / Local | Zero cost for routine work |

---

## Session Management Across Tools

### Never Share Sessions Between Tools
Each tool has its own conversation context. Never copy output from one tool as input to another expecting the second tool to understand the first tool's context.

### The Handoff Pattern (Cross-Tool)

When moving from one tool to another, provide a structured handoff:

```
Tool A completed: Implemented login form in /src/pages/Login.tsx
- Uses MUI 7+ TextField and Button components
- Form validation via React Hook Form + Zod
- API call via /src/services/auth.ts → POST /api/auth/login
- Tests pass: /src/pages/__tests__/Login.test.tsx

Tool B task: Review the login form for:
- Accessibility (keyboard nav, screen reader labels)
- RTL compatibility (does it work with dir="rtl"?)
- Security (CSRF, rate limiting on the endpoint)

Read /src/pages/Login.tsx and /src/services/auth.ts before reviewing.
```

### Parallel Tool Usage

As a solo vibe coder, you CAN use multiple tools simultaneously:
- **Cursor** open for active feature development
- **Claude Code** running in background for code review or test generation
- **GitHub Copilot** providing inline completions

**Rule:** Multiple tools should never edit the same file simultaneously. Partition work by module or directory.

```
Cursor:     /src/features/dashboard/*
Claude Code: /src/features/settings/*
```

Merge one tool's work and commit before starting the other tool on related files.

---

## Cost Optimization Across Tools

Different tools have different cost models. Use the cheapest tool that can do the job:

| Tool | Cost Model | Best For |
|---|---|---|
| Ollama / LM Studio | Free (local GPU) | Boilerplate, formatting, simple generation |
| GitHub Copilot | Fixed monthly ($10-39) | Inline completions, chat, PR reviews |
| Cursor | Fixed monthly ($20) | Full-featured IDE agent |
| Claude Code | Pay-per-token (API) | Complex reasoning, architecture, debugging |
| ChatGPT/Claude web | Fixed monthly ($20) | Exploration, learning, planning |

**Strategy:** Use fixed-cost tools as your primary workhorse. Use pay-per-token tools for tasks where quality matters more than cost. Use local models for all zero-cost work.

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Duplicated rules in every config** | Rules diverge, maintenance quadruples | AGENTS.md as canonical source; tool configs reference it |
| **No AGENTS.md, only tool-specific configs** | No shared understanding between tools | Create AGENTS.md first; tool configs reference it |
| **Multiple tools editing same file** | Merge conflicts, lost work, inconsistent patterns | Partition work by module; sequential merge |
| **Copying raw AI output between tools** | Lost context, confused second tool | Use handoff pattern with structured summary |
| **Using expensive models for everything** | $100+/month on boilerplate | Route to cheaper/free models for routine work |
| **No cross-tool review** | Single model's blind spots go undetected | Review critical code with a different tool/model |
| **Averaging conflicting outputs** | Frankenstein architecture, inconsistent patterns | Tests arbitrate; document the decision |

---

## Key Takeaways

1. AGENTS.md is the single source of truth. All tool-specific configs reference it — never duplicate rules.
2. Tool capability matrix: know which rules each tool can enforce, and which it cannot.
3. Cross-model validation: use different tools for implementation vs review. Tests are the final arbiter.
4. Session isolation: use the handoff pattern when moving between tools; never share raw context.
5. Partition work by module: never let multiple tools edit the same file simultaneously.
6. Cost-optimize tool selection: fixed-cost tools for daily work, pay-per-token for complex tasks, local models for free work.

---

## Cross-References

- **Depends on:** `ai-agent-orchestration.md` — multi-agent coordination patterns
- **Depends on:** `ai-collaboration-mindset.md` — core AI collaboration principles
- **Depends on:** `context-management-strategy.md` — token and session management
- **Applied by:** `cost-optimization-strategy.md` — cost-optimized tool selection
- **Applied by:** `RETRIEVAL_RULES.md` — guideline loading across tools
