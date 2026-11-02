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

## Packaging — the Agent Skills Standard

A skill is a **directory containing `SKILL.md`**, never a flat file:

```
skills/<name>/SKILL.md
```

This is the [Agent Skills](https://agentskills.io/specification) layout, and it is not cosmetic: a
conformant loader scans for `<name>/SKILL.md`, so a flat `skills/<name>.skill.md` is a file no loader
reads. `<name>` MUST match the front-matter `name` — 1–64 characters, lowercase `a-z`/`0-9` and
single hyphens, with no leading, trailing or doubled hyphen. Optional siblings (`references/`,
`scripts/`, `assets/`) are loaded ON DEMAND, never at activation, so a long excerpt or a helper
script belongs there rather than inline in the body.

`skills/INDEX.md` sits beside the skill directories and is not itself a skill — it is the generated
inventory (see §Skill Storage).

**Progressive disclosure is the reason for the shape.** Three levels load at three different times:
the front-matter `name` + `description` (~100 tokens) are always in view, the `SKILL.md` body loads
only on activation, and `references/`/`scripts/`/`assets/` load only when the body reaches for them.
A skill that inlines everything it might ever need pays for all of it on every activation.

---

## Front-Matter Contract

Every skill MUST open with YAML front-matter. Two keys are the standard's, and they are the ones a
loader reads to decide whether the skill can ever fire; the rest are this repo's and live under a
`metadata:` map so the standard keys stay where a loader expects them.

| Key | Required | What reads it |
|---|---|---|
| `name` | **yes** | The loader registers the skill under this name — and it MUST equal the skill's directory name |
| `description` | **yes** | The loader decides *when to activate* the skill from this string — it is the trigger, and the only trigger a tool can see without opening the file |
| `metadata.status` | yes | `render:index` — the MASTER_INDEX status column |
| `metadata.scope` | yes | `render:index` — the MASTER_INDEX scope column |
| `metadata.tags` | yes | `render:index` — the MASTER_INDEX tag column |
| `metadata.appliesTo` | no | `plan-skills.js` — the stack the skill is written for; decides which projects RECEIVE the skill, and `render:skills` renders it into the inventory's `Applies to` column |

```yaml
---
name: code-review
description: Professional code review for correctness, security and maintainability. Use when reviewing a diff or a PR. Triggers on "review this code", "code review".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, review, quality
  appliesTo: any
---
```

**`description` is the trigger, not a summary.** Write it as a condition beginning "Activate when …",
so the generated inventory reads as a list of conditions rather than a list of topics. A skill with
no `description` can never be activated by any loader, and `npm run audit` fails it as an UNLOADABLE
SKILL. Measured 2026-10-12: `mui-design-system` shipped with `status`, `scope` and `tags` and neither
required key, so it existed and could not fire.

**A skill whose `name` disagrees with its directory is non-conformant.** `npm run audit` fails it:
the loader registers the front-matter `name`, the filesystem exposes the directory name, and the two
diverging is a skill that loads under one name and is found under another.

**`appliesTo` decides which projects get the skill, and it is matched ANY-OF.** The skill is copied
to a project when at least one declared token is in that project's stack, and skipped when one is on
its Forbidden list. Two consequences follow, and both have bitten:

- **Declare only DISCRIMINATING technologies.** `appliesTo: [mui, emotion, react]` does not mean "needs
  all three" — it means "matches any", so the ambient `react` made a MUI skill match a Tailwind
  project with no MUI at all. Measured on midad 2026-10-12. `emotion` is a consequence of MUI and
  `react` is in nearly every project; neither distinguishes anything, so the correct value is `[mui]`.
- **A token the vocabulary does not know is INERT.** `appliesTo: [mooi]` resolves to nothing, so the
  skill reads as unscoped and is copied to every project — including the ones it was declared to
  avoid. `npm run audit` fails it as UNRESOLVABLE appliesTo and prints the known tokens.

**Absent `appliesTo` is allowed and counted, not guessed at.** Until it is declared, a skill's scope is
inferred from its `tags` against the technology vocabulary — which is a fallback, not a second home.
`npm run audit:friction` reports how many skills still rely on that inference; the count is the debt
the tagging pass closes.

**`appliesTo: any` is the explicit stack-agnostic declaration.** A task-type skill (`code-review`,
`security-audit`, …) is written for every stack. Declaring `appliesTo: any` resolves to zero
technology tokens but marks the scope DECLARED, so the selector stops inferring it from `tags` and
the machine-global pool keeps it. Use it on every skill that is genuinely stack-agnostic; leaving
`appliesTo` absent still works for one, but leaves the delivery rule to a fallback. Declare it alone:
a technology token alongside it is the narrower scope and wins.

**A skill with no stack signal in its project is copied anyway.** A fresh, empty folder has no stack
to filter against, and withholding skills from it would be a guess dressed as a policy. That is the
one case where every skill is delivered.

**Where the inventory comes from.** `npm run render:skills` reads these keys and writes
`skills/INDEX.md` — the trigger table, generated, never hand-maintained. `npm run check-skills-drift`
fails the gate if that file is hand-edited. The same generated block is what a project's `AGENTS.md`
must carry under `## Skills`, which is why the renderer has an `--emit` mode: one renderer, two
consumers, so the two cannot disagree.

---

## Skill Anatomy

The body below the front-matter. Every skill follows this structure:

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
4. Include a "review checklist" stating what to verify

## Output Format
1. Summary of test coverage (what's tested, what's intentionally not tested)
2. Test code (following existing test patterns)
3. Review checklist for verification

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
                        
The agent synthesizes all review findings.
```

---

## Skill Storage

Skills are stored one directory per skill, each holding a `SKILL.md`:

```
skills/
├── INDEX.md                      ← GENERATED by `npm run render:skills` — never hand-edit
├── code-review/
│   └── SKILL.md
├── test-generation/
│   └── SKILL.md
├── refactoring/
│   └── SKILL.md
├── security-audit/
│   └── SKILL.md
└── firestore-cost-optimization/
    ├── SKILL.md
    └── references/
        └── guard-snippet.md      ← loaded on demand, not at activation
```

`INDEX.md` is the trigger inventory: the one place that says *when* to load each skill without
opening it. It is generated from the front-matter above, so adding a skill adds a row with no edit
there — and a skill whose `description` is missing shows up in it as a visible hole.

The `references/` file under `firestore-cost-optimization` is the progressive-disclosure pattern: a
verbatim excerpt the skill only needs at one step lives beside the skill, so activating the skill does
not pay for it. A file bundled this way is part of the skill, not a guideline reference, and the
reference audit skips it.

---

## Key Takeaways

1. Skills are pre-configured AI agent prompts that activate on demand for specific tasks.
2. A skill is a directory — `skills/<name>/SKILL.md` — and `<name>` matches the front-matter `name`. A flat `skills/<name>.skill.md` is a shape no conformant loader reads.
3. Every skill declares `name` and `description` at the top level of its front-matter; the repo's own keys (`status`, `scope`, `tags`, `appliesTo`) live under `metadata:`. A loader reads the `description` to decide when to activate the skill, so a skill without one can never fire.
4. Skill anatomy: Trigger → Load Guidelines → Role → Workflow → Output Format → Anti-Patterns.
5. Skills load only relevant guidelines (compact extracts in tight context), and a long excerpt belongs in `references/` — loaded on demand, not at activation.
6. Skills can be composed: sequential chains or parallel reviews.
7. Every skill includes anti-patterns — what NOT to do is as important as what to do.
8. `appliesTo` names the stack a skill assumes, so a project can tell at a glance which skills do not apply to it.
9. Store skills as version-controlled markdown files; the trigger inventory is generated from them, never maintained by hand.

---

## Cross-References

- **Depends on:** `ai-governance-framework.md` — where skills fit in the authority hierarchy
- **Depends on:** `ai-agent-orchestration.md` — how skills are used in multi-agent workflows
- **Applied by:** `rule-extraction-methodology.md` — skills and rules serve different purposes
