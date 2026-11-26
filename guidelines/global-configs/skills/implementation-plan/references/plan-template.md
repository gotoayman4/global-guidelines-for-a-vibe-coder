# Implementation Plan — Output Template

Companion reference for `implementation-plan`. Use this structure when generating execution plans.

```markdown
# Implementation Plan: [Feature/Project Name]

## Agent Usage Instructions

Read this entire plan before starting implementation. Execute tasks in the defined order unless dependencies indicate otherwise. Complete one task at a time — implement, validate, then commit the changes to Git before starting the next task. Mark tasks as completed immediately after successful validation and commit. Re-evaluate remaining tasks after each completed milestone. Do not skip validation steps. If any requirement is ambiguous, conflicting, or incomplete, stop and request clarification before proceeding. Treat this plan as the authoritative execution checklist unless overridden by repository steering documents.

## Repository Rules Summary

[Concise summary of mandatory rules discovered from AGENTS.md, WORLD.md, and tool configs. Include only rules that materially affect implementation — architecture constraints, testing requirements, naming conventions, security policies. Preserve rule precedence where applicable.]

## Implementation Plan

### Phase 1: [First vertical slice]

**Dependencies:** None

- [ ] **Task 1.1:** [Task name]
  - **Objective:** [What this task accomplishes]
  - **Outcome:** [Expected deliverable]
  - **Files:** [File paths with estimated line counts, e.g., `src/features/checkout/CheckoutForm.tsx (~150 lines)`, `src/hooks/useCheckout.ts (~80 lines)`]
  - **Dependencies:** None
  - **Validation:** [How to verify completion]

- [ ] **Task 1.2:** [Task name]
  - **Objective:** [What this task accomplishes]
  - **Outcome:** [Expected deliverable]
  - **Files:** [File paths with estimated line counts]
  - **Dependencies:** Task 1.1
  - **Validation:** [How to verify completion]

### Phase 2: [Next vertical slice]

**Dependencies:** Phase 1

- [ ] **Task 2.1:** ...
  - *(same structure)*

## Completion Checklist

- [ ] All functional requirements implemented
- [ ] All tasks validated and committed
- [ ] No file exceeds 400 lines (refactored or split where needed)
- [ ] Repository rules followed
- [ ] Verification per the declared mode (smoke run in `vibe`; full behavioral suite in standard/guarded)
- [ ] Documentation updated on triggers (`Docs: updated <files>`)
- [ ] No unresolved blockers remain
- [ ] Acceptance criteria satisfied
```
