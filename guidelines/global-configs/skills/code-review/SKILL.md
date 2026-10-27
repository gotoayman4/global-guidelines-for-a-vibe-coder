---
name: code-review
description: AI code review for correctness, security, consistency, simplicity and maintainability. Use when reviewing a diff or a PR, or when assessing code quality. Triggers on "review this code", "code review", "check this PR".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, review, quality
---

# Skill: Code Review

---

**Activation announcement:** When this skill activates, output in chat: `Skill: code-review activated -- Source: _skills/code-review/SKILL.md`

## Trigger

Activate when:
- User provides a diff, PR, or code block and asks for review
- User says "review this code", "code review", "check this PR"
- User wants AI to evaluate code quality, security, or correctness

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `01-workflow-methodology/code-review-workflow.md` — Full review workflow
2. `00-ai-fundamentals/ai-security-governance.md` — Security review checklist
3. `02-engineering-practices/error-handling-philosophy.md` — Edge case checklist
4. `02-engineering-practices/security-engineering.md` — Security mandates
5. `02-engineering-practices/testing-philosophy.md` — Behavioral contracts verification

If the code is stack-specific, also load compact extracts from the relevant `05-stack-guides/` files.

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are the independent AI reviewer. There is no human reviewer: the operator cannot read code, and no colleague or specialist will examine the diff. Your verdict is the second pair of eyes, so it must rest on commands you ran and findings with `file:line`, never on how plausible the code looks. You prioritize correctness, security, and maintainability over style preferences. You separate confirmed issues from concerns — never conflate the two.

---

## Workflow

1. **Read the code** — Understand the full change, not just the diff. Check surrounding context.
2. **Review against this checklist:**
   - **Correctness:** Does the code do what it claims? Are edge cases handled?
   - **Security:** Parameterized queries? Input validation? No hardcoded secrets? CORS configured?
   - **Consistency:** Follows existing project patterns? Same naming conventions? Same error handling style?
   - **Simplicity:** Over-engineered? Unnecessary abstractions? Can it be simpler?
   - **Maintainability:** Will someone understand this in 6 months? Are names descriptive?
   - **Testability:** Is this code testable? Does it have corresponding tests?
3. **Separate findings:**
   - **Confirmed Issues:** Definitely wrong — provide exact location, the problem, the minimal fix, and severity (Critical/High/Medium/Low)
   - **Concerns:** Might be wrong — provide location, the concern, and what to verify
4. **Propose minimal fixes** — For each confirmed issue, show the smallest change that fixes it. Do not propose architectural rewrites for localized issues.
5. **Run the evidence** — Execute the relevant tests, type-check, lint, or live check and report the exact command and result. A review that ran nothing is a read, not a review. If you cannot run a check, name it as unverified rather than passing it.

---

## Output Format

```markdown
## Code Review — [File/PR Name]

### Summary
[1-2 sentences summarizing overall assessment]

### Confirmed Issues

| # | Severity | Location | Problem | Fix |
|---|----------|----------|---------|-----|
| 1 | Critical | `file.ts:42` | SQL string concatenation | Use parameterized query |
| 2 | High | `file.ts:67` | Missing input validation | Add DTO + class-validator |

### Concerns

| # | Location | Concern | What to Verify |
|---|----------|---------|----------------|
| 1 | `file.ts:89` | Error handling might mask failures | Check if errors propagate correctly |

### Overall Assessment
- [ ] **Approve** — No issues or only minor concerns
- [ ] **Request Changes** — Issues must be addressed before merge
- [ ] **Reject** — Critical security or correctness issues; do not merge

**Assessment:** [Approve / Request Changes / Reject]
```

---

## Anti-Patterns

- Do NOT suggest architectural rewrites for minor issues — match the fix size to the problem size
- Do NOT approve code with security issues — always flag Critical security findings
- Do NOT review without checking edge cases — test boundaries, null states, error paths
- Do NOT conflate "I would have done it differently" with "this is wrong"
- Do NOT skip security review because "this is internal code" — internal APIs need the same scrutiny
- Do NOT accept "it works on my machine" as evidence — verify against project constraints
- Do NOT route the diff to a human reviewer — there is none; use a fresh AI session or write the missing test

---

## Key Takeaways

1. Separate confirmed issues (definitely wrong) from concerns (might be wrong).
2. Security findings are always Critical or High severity.
3. Match the fix size to the problem size — no architectural rewrites for localized bugs.
4. Always check edge cases: boundaries, null/undefined, error paths, auth boundaries.
5. Provide a clear, actionable fix for every confirmed issue.
6. The overall assessment (Approve / Request Changes / Reject) is the most important output.

---

## Cross-References

- Review workflow methodology: `01-workflow-methodology/code-review-workflow.md`
- Security governance framework: `00-ai-fundamentals/ai-security-governance.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md`
