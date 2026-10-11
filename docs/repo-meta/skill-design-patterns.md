---
status: "Advisory"
scope: "Global"
tags: [skills, design, patterns]
---

# Skill Design Patterns — Reusable Agent Configurations

---

## Purpose

Define patterns for designing reusable skills — specialized AI agent configurations that activate on demand for specific tasks. Skills are the operational units of AI-assisted development: they load only when needed, minimize context injection, and produce deterministic outputs.

---

## What Is a Skill?

A skill is a pre-configured AI agent prompt that:
- Activates only when triggered by a specific task type
- Loads only the guidelines relevant to that task
- Follows a consistent output format
- Can be composed with other skills in sequence or parallel

**Skill vs Guideline vs Rule:**
| | Guideline | Rule | Skill |
|---|---|---|---|
| **Length** | 1,500-2,800 tokens | 50-100 tokens | 200-500 tokens |
| **When loaded** | On demand (task-specific) | Always (context) | Triggered (task type) |
| **What it does** | Educates and constrains | Enforces | Executes a workflow |
| **Output** | Reference material | Constraint enforcement | Completed task |

---

## Skill Anatomy

Every skill follows this structure:

```markdown
# Skill: [Name]

## Trigger
When to activate this skill. Be specific:
- "User asks to write tests for existing code"
- "User requests a code review"
- "User wants to refactor a React component"

## Load Guidelines
Which guideline files to load when this skill activates:
- `testing-philosophy.md` (Normative)
- `testing-patterns.md` (Normative)
- Compact extracts from relevant stack guides

## Role
[Specific expertise description for the AI]

## Workflow
Step-by-step procedure:
1. [First action]
2. [Second action]
3. [Third action]

## Output Format
[Expected output structure]

## Anti-Patterns
What this skill should NOT do.
```

---

## Skill Pattern Catalog

### Pattern 1: Test Generation Skill

```markdown
# Skill: Generate Tests

## Trigger
User provides existing code and asks for tests.

## Load Guidelines
- `testing-philosophy.md` (Key Takeaways + Anti-Patterns)
- `testing-patterns.md` (relevant pattern section)

## Role
You are a senior QA engineer. Generate tests that verify BEHAVIOR, not implementation.

## Workflow
1. Read the provided code
2. Identify: happy path, edge cases, error cases, auth boundaries
3. Generate tests using the project's test framework
4. Include a "review checklist" noting what the human should verify

## Output Format
1. Summary of test coverage (what's tested, what's intentionally not tested)
2. Test code (following existing test patterns)
3. Review checklist for human verification

## Anti-Patterns
- Do NOT test implementation details (internal function calls, state shape)
- Do NOT generate snapshot tests unless specifically requested
- Do NOT mock more than 2 dependencies per test
```

### Pattern 2: Code Review Skill

```markdown
# Skill: Review Code

## Trigger
User provides a diff or code block and asks for review.

## Load Guidelines
- `code-review-workflow.md` (full)
- `ai-security-governance.md` (Key Takeaways + Security Review Checklist)
- `error-handling-philosophy.md` (Edge Case Checklist)

## Role
You are a strict senior engineer performing code review.

## Workflow
1. Review for: correctness, security, consistency, simplicity, maintainability, testability
2. Separate: confirmed issues (definitely wrong) from concerns (might be wrong)
3. For each confirmed issue, propose the minimal fix

## Output Format
1. Summary (1-2 sentences)
2. Confirmed Issues (each with: location, problem, fix, severity)
3. Concerns (each with: location, concern, what to verify)
4. Overall assessment: Approve / Request Changes / Reject

## Anti-Patterns
- Do NOT suggest architectural rewrites for minor issues
- Do NOT approve code with security issues
- Do NOT review without checking edge cases
```

### Pattern 3: Refactoring Skill

```markdown
# Skill: Refactor Code

## Trigger
User provides code and a refactoring goal.

## Load Guidelines
- `refactoring-strategy.md` (Key Takeaways + Anti-Patterns)
- `testing-philosophy.md` (Behavioral Contracts section)

## Role
You are a senior engineer specializing in safe, incremental refactoring.

## Workflow
1. Ensure tests exist and pass before refactoring
2. Identify the specific refactoring goal
3. Execute ONE refactoring at a time
4. Verify tests still pass after each change
5. Document what changed and why

## Output Format
1. Pre-refactoring checklist (tests passing, committed state)
2. Refactoring plan (what changes, in what order)
3. Modified files with changes inline
4. Post-refactoring verification (test results, behavioral confirmation)

## Anti-Patterns
- Do NOT change behavior during refactoring
- Do NOT refactor + add features in the same operation
- Do NOT refactor without test coverage
```

### Pattern 4: Documentation Generation Skill

```markdown
# Skill: Generate Documentation

## Trigger
User provides code and asks for documentation.

## Load Guidelines
- `documentation-strategy.md` (Key Takeaways)
- `guideline-authoring-standards.md` (Writing Conventions)

## Role
You are a technical writer specializing in AI-optimized documentation.

## Workflow
1. Analyze the code for: purpose, inputs/outputs, dependencies, configuration
2. Generate documentation following the project's conventions
3. Include: purpose, usage examples, API reference, environment variables

## Output Format
1. Type of documentation generated (README section, API doc, ADR, etc.)
2. The documentation content
3. Suggested file location

## Anti-Patterns
- Do NOT generate placeholder text or TODOs
- Do NOT document implementation details that change frequently
- Do NOT include code examples without verifying they match the actual code
```

---

## Skill Composition

Skills can be chained:

```
REFACTOR SKILL → TEST SKILL → REVIEW SKILL

1. Refactor the component       (Skill: Refactor Code)
2. Generate updated tests       (Skill: Generate Tests)
3. Review the final result      (Skill: Review Code)
```

Or parallelized:

```
Generate implementation → REVIEW SKILL (security)
                        → REVIEW SKILL (performance)
                        → REVIEW SKILL (accessibility)
                        
Human synthesizes all review findings.
```

---

## Skill Storage

Skills are stored as markdown files with a consistent naming pattern:

```
skills/
├── code-review.skill.md
├── test-generation.skill.md
├── refactoring.skill.md
├── documentation.skill.md
├── security-audit.skill.md
├── performance-audit.skill.md
└── accessibility-audit.skill.md
```

---

## Key Takeaways

1. Skills are pre-configured AI agent prompts that activate on demand for specific tasks.
2. Skill anatomy: Trigger → Load Guidelines → Role → Workflow → Output Format → Anti-Patterns.
3. Skills load only relevant guidelines (compact extracts in tight context).
4. Skills can be composed: sequential chains or parallel reviews.
5. Every skill includes anti-patterns — what NOT to do is as important as what to do.
6. Store skills as version-controlled markdown files.

---

## Cross-References

- **Depends on:** `ai-governance-framework.md` — where skills fit in the authority hierarchy
- **Depends on:** `ai-agent-orchestration.md` — how skills are used in multi-agent workflows
- **Applied by:** `rule-extraction-methodology.md` — skills and rules serve different purposes
