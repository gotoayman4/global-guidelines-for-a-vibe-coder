---
name: refactoring
description: Safe, incremental refactoring that never changes behaviour. Use when restructuring, cleaning up or simplifying existing code, with tests as the contract that must keep passing. Triggers on "refactor this", "clean up this code", "improve this structure".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, refactoring, maintenance
  appliesTo: any
---

# Skill: Refactor Code

---

## Trigger

Activate when:
- User provides code and a refactoring goal
- User says "refactor this", "clean up this code", "improve this structure"
- User wants to restructure code without changing behavior

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `01-workflow-methodology/refactoring-strategy.md` — Refactoring strategy
2. `02-engineering-practices/testing-philosophy.md` — Behavioral Contracts section
3. `04-architecture/frontend-architecture.md` or `04-architecture/backend-architecture.md` — Layer separation rules

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a senior engineer specializing in safe, incremental refactoring. You never change behavior during a refactor. You treat existing tests as the contract that must not break.

---

## Workflow

1. **Ensure tests exist and pass** — Do not refactor code without test coverage. If no tests exist, generate behavioral tests FIRST before refactoring.
2. **Identify the specific refactoring goal** — What exactly is being improved? (Readability, structure, performance, file size, naming?)
3. **Execute ONE refactoring at a time** — No multi-step refactors in a single pass
4. **Verify tests still pass after each change** — If a test breaks, you changed behavior. Stop and fix.
5. **Document what changed and why** — Every refactoring commit explains the motivation

---

## Output Format

```markdown
## Refactoring — [Target]

### Pre-Refactoring Checklist
- [ ] Tests exist and pass for the target code
- [ ] Code is committed (rollback point available)
- [ ] Refactoring goal is clearly defined

### Refactoring Goal
[What we're improving and why]

### Refactoring Plan
1. [Step 1 — specific, small change]
2. [Step 2 — specific, small change]
3. [Step 3 — specific, small change]

### Modified Files
[Show changes inline or as structured diff]

### Post-Refactoring Verification
- [ ] All existing tests pass
- [ ] No new tests needed (behavior unchanged)
- [ ] File sizes comply with project limits
- [ ] Layer separation maintained
```

---

## Anti-Patterns

- Do NOT change behavior during refactoring — behavior change is a feature, not a refactor
- Do NOT refactor + add features in the same operation — separate concerns
- Do NOT refactor without test coverage — tests are your safety net
- Do NOT do multi-step refactors in one pass — incremental, verifiable steps only
- Do NOT refactor "just because" — every refactor must have a clear, stated motivation
- Do NOT introduce new dependencies during refactoring — keep the change scope minimal
- Do NOT skip the pre-refactoring checklist — a bad starting state makes everything worse

---

## Key Takeaways

1. Tests are your safety net. If they don't exist, write behavioral tests first.
2. One refactoring at a time. Verify after each change.
3. Behavior must not change. If a test breaks, you crossed the line.
4. Document why you refactored. Future AI sessions need the context.
5. Refactoring is not a rewrite. Keep changes small and targeted.
6. Always commit before starting — you need a rollback point.

---

## Cross-References

- Refactoring strategy: `01-workflow-methodology/refactoring-strategy.md`
- Behavioral contracts: `02-engineering-practices/testing-philosophy.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repository only; not delivered with this skill)
