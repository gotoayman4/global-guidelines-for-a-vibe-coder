---
name: test-generation
description: Behavioural test generation — happy path, edge cases, error cases and auth boundaries, using the project's existing test framework. Use when code needs tests or coverage. Triggers on "write tests for this", "add test coverage", "generate tests".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, testing, generation
---

# Skill: Generate Tests

---

## Trigger

Activate when:
- User provides existing code and asks for tests
- User says "write tests for this", "add test coverage", "generate tests"
- User wants to add unit, integration, or E2E tests to existing functionality

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `02-engineering-practices/testing-philosophy.md` — Test philosophy (behavior vs implementation)
2. `02-engineering-practices/testing-patterns.md` — Relevant pattern section based on test type
3. `02-engineering-practices/error-handling-philosophy.md` — Error case patterns

If the code is stack-specific, also load compact extracts from:
- `05-stack-guides/react/react-testing.md` (for React components/hooks)
- `05-stack-guides/playwright/playwright-e2e.md` (for E2E tests)

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a senior QA engineer. Generate tests that verify BEHAVIOR, not implementation. Your tests serve as living documentation of what the code should do.

---

## Workflow

1. **Read the provided code** — Understand inputs, outputs, side effects, and dependencies
2. **Identify test cases:**
   - **Happy path:** Normal inputs, expected outputs, default configurations
   - **Edge cases:** Empty/null inputs, boundary values, maximum/minimum lengths
   - **Error cases:** Invalid inputs, network failures, timeout scenarios
   - **Auth boundaries:** Unauthorized access, wrong roles, expired tokens (if applicable)
   - **State transitions:** Multi-step flows, loading → success, loading → error
3. **Generate tests** using the project's existing test framework
4. **Include a review checklist** stating what to verify (and how)

---

## Output Format

```markdown
## Test Coverage — [Component/Function Name]

### Coverage Summary
- Happy path: [N] tests
- Edge cases: [N] tests
- Error cases: [N] tests
- Auth boundaries: [N] tests
- Intentionally not tested: [list and reason]

### Test Code
[Generated test file using project's test framework]

### Review Checklist
- [ ] Tests pass when run against current code
- [ ] Mocks are reasonable (not over-mocked or under-mocked)
- [ ] Error messages in tests match actual error formats
- [ ] Auth tests use correct roles/permissions for this project
- [ ] Edge case values are realistic (not arbitrary)
```

---

## Anti-Patterns

- Do NOT test implementation details — internal function calls, private methods, state shape
- Do NOT generate snapshot tests unless specifically requested
- Do NOT mock more than 2 dependencies per test
- Do NOT test library/framework behavior — test YOUR code's behavior
- Do NOT write tests that pass without the code being correct (false positives)
- Do NOT skip error case testing — "it's unlikely to fail" is not a reason
- Do NOT generate placeholder test descriptions without actual assertions

---

## Key Takeaways

1. Test behavior, not implementation. Tests should survive refactoring.
2. Cover: happy path → edge cases → error cases → auth boundaries.
3. Use existing test patterns from the project. Match the testing style already in use.
4. Every generated test must have clear assertions — no placeholder tests.
5. The review checklist is mandatory — it states exactly what to verify in what you generated.
6. Tests are living documentation. Descriptive test names matter.

---

## Cross-References

- Test philosophy: `02-engineering-practices/testing-philosophy.md`
- Test patterns: `02-engineering-practices/testing-patterns.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repository only; not delivered with this skill)
