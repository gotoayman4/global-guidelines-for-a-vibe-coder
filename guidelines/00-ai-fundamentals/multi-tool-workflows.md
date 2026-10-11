---
status: "Normative"
scope: "Global"
tags: [multi-tool, cursor, copilot, claude]
---

# Multi-Tool Workflows — Coordinating Multiple AI Tools in One Repository

---

## Directives

1. **AGENTS.md is the canonical rules source.** Tool-specific configs (CLAUDE.md, `.cursor/rules/`, copilot-instructions) REFERENCE it — never duplicate rules. Update AGENTS.md first; tool configs change only for tool-specific behavior. Duplicating security/testing/architecture rules in 4 files = 4× maintenance and divergence.
2. **Minimum tool-config content:** pointer to AGENTS.md · project build/validation commands · layout description · tool-specific constraints only.
3. **Know each tool's enforcement limits:** commit conventions → CLI agents only; session bootstrap → Claude Code-class tools; file-size limits → rules-capable agents; Copilot-chat cannot enforce most mandates. Don't assign a rule to a tool that can't enforce it.
4. **Cross-model review deliberately:** implement in one tool/model, review with a DIFFERENT one (architecture review + security review from fresh perspectives). Tests are the final arbiter.
5. **When tools disagree:** tests arbitrate (write the behavioral test that defines correct) · simpler solution wins (fewer files/deps/abstractions) · document choice in ADR. NEVER average conflicting outputs — Frankenstein code results.
6. **Session isolation between tools:** never paste raw output from one tool into another. Use the structured handoff: what was completed, where, patterns used, test status, then the new task + files to read first.
7. **Parallel tools partition by module** (`Cursor: features/dashboard/*` / `Claude Code: features/settings/*`) — never the same file simultaneously. Merge and commit before starting related work in another tool.
8. **Cost-tier model selection:** local models (free) → boilerplate/formatting · fixed-monthly tools → daily inline work · pay-per-token premium models → architecture, security, debugging. Route routine work off expensive models.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Rules duplicated in every config | AGENTS.md canonical; configs reference |
| No AGENTS.md, only per-tool configs | Create it first |
| Two tools editing one file | Module partitioning |
| Copying raw output across tools | Handoff summary |
| Premium model for boilerplate | Cost-tier routing |
| Averaging conflicting implementations | Tests arbitrate; document |

## Cross-References

`ai-agent-orchestration.md` · `context-management-strategy.md` · `cost-optimization-strategy.md`
