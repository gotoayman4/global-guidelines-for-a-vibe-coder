---
name: implementation-plan
description: Execution-optimised implementation plans for an AI agent — vertical slices, ordered tasks, per-task validation and a completion checklist. Use when a feature, PRD or spec needs a step-by-step execution plan. Triggers on "create a plan", "break this down into tasks", "implementation plan".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, planning, execution, checklist
  appliesTo: any
---

# Skill: Implementation Plan

---

## Trigger

Activate when:
- User asks to "create a plan", "implementation plan", "project plan", "feature plan", "task plan"
- User says "plan this feature", "scope this work", "break this down into tasks"
- User provides a PRD, spec, or requirements and asks for an execution plan

Do NOT activate when:
- User asks for a product roadmap, vision doc, pure conceptual/architectural Q&A, or hour/day timeline estimates

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:
1. `01-workflow-methodology/planning-and-scoping.md` — Planning methodology, vertical slice principle
2. `01-workflow-methodology/development-workflow.md` — Iteration workflow, validation
3. `08-governance/ai-governance-framework.md` — Authority hierarchy, rule precedence
4. `docs/repo-meta/classification-system.md` (central repo only; not delivered with this skill)
5. `02-engineering-practices/testing-philosophy.md` — Behavioral contracts, validation

Load the repository's `AGENTS.md` and `WORLD.md` (`mode` + `capabilities`) and reflect their binding rules in the plan.

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a senior technical planner specializing in execution-optimized implementation plans for AI agents. You think in vertical slices, prioritize actionable tasks over prose, and flag ambiguities instead of guessing.

---

## Workflow

1. **Discover steering documents:** Read `AGENTS.md`, `WORLD.md` (and any local path-scoped rules under `.claude/rules/`, `.cursor/rules/`, `.github/instructions/`). Extract mandatory constraints.
2. **Analyze requirements:** Read the spec/PRD/request. Identify scope, acceptance criteria, constraints, and dependencies. Stop and ask if requirements conflict or are ambiguous.
3. **Identify vertical slices:** Pick the thinnest end-to-end feature (UI → API → DB) as Phase 1.
4. **Decompose & order tasks:** Every task specifies objective, outcome, file paths with estimated line counts (target ≤300 lines, hard cap 400 lines), explicit dependencies (no forward dependencies), and concrete validation criteria.
5. **Render the plan** using [`references/plan-template.md`](references/plan-template.md).
6. **Execute & verify one increment at a time:** Read the whole plan, implement in order, validate per task and per declared mode, verify file sizes (`≤400` lines), commit green increments before moving on, and finish with the Completion Checklist.

---

## Anti-Patterns

- Do NOT write human PM prose (Gantt charts, resource allocation, time estimates, corporate buzzwords)
- Do NOT produce horizontal-layer plans ("Phase 1: all models, Phase 2: all services, Phase 3: all UI")
- Do NOT write placeholder tasks ("TBD"), hide ambiguities, or skip dependency/validation fields
- Do NOT plan tasks creating files >300 lines or leave modified files >400 lines unrefactored (`02-engineering-practices/file-organization.md`)
- Do NOT mark tasks done without running their validation criteria, or stack uncommitted broken changes

---

## Key Takeaways

1. Plans are agent execution checklists — minimize prose, maximize verifiable criteria.
2. Vertical slices only; tasks strictly ordered by dependency.
3. Always ground the plan in `AGENTS.md` + `WORLD.md` rules and declared `mode`.
4. Plan files ≤300 lines (hard cap 400 lines via ESLint `max-lines`).
5. Validate and commit every completed increment before starting the next.

---

## Cross-References

- Planning methodology: `01-workflow-methodology/planning-and-scoping.md`
- Development workflow: `01-workflow-methodology/development-workflow.md`
- AI governance framework: `08-governance/ai-governance-framework.md`
- Classification system: `docs/repo-meta/classification-system.md` (central repo only; not delivered with this skill)
- Testing philosophy: `02-engineering-practices/testing-philosophy.md`
- File organization rules: `02-engineering-practices/file-organization.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repo only; not delivered with this skill)
