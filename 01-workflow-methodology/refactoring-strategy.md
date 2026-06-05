# Refactoring Strategy — Maintaining Coherence Over Time

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,900 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `development-workflow.md`, `testing-philosophy.md`

---

## Purpose

Define the strategy for refactoring in an AI-assisted codebase. AI-generated code accumulates architectural entropy rapidly. Without systematic refactoring, every AI session drifts the codebase toward inconsistency. Refactoring is not optional — it's the maintenance cost of AI acceleration.

---

## Why AI Codebases Need More Refactoring

Traditional codebases grow incrementally with human intent. AI-assisted codebases grow explosively with statistical pattern-matching. This creates:

1. **Pattern drift:** Each AI session may use slightly different conventions
2. **Duplication:** AI doesn't always check if similar code already exists
3. **Inconsistent abstraction levels:** Some code is over-abstracted, some is under-abstracted
4. **Dead code accumulation:** AI rarely removes old code when adding new
5. **Naming inconsistency:** Similar concepts get different names across sessions

**Rule:** Schedule a refactoring pass after every 3-5 features. Don't wait for the codebase to become unmanageable.

---

## The Two Types of Refactoring

### Type 1: Opportunistic Refactoring (During Feature Work)

Small improvements made during the normal development loop. These are the refactors in the standard workflow's Phase 7.

**When to do it:**
- You notice duplicated logic while implementing a feature
- The file you're modifying is poorly organized
- Variable names in the area you're touching are confusing
- A function does too many things

**Rules:**
- Refactor ONLY the code you're already touching (limit blast radius)
- Preserve all existing behavior (verified by tests)
- Refactor before adding new functionality, not after
- Commit the refactor separately from the feature change

### Type 2: Dedicated Refactoring (Standalone Sessions)

Scheduled sessions focused purely on improving code quality without adding features.

**When to do it:**
- After 3-5 features have been added (pattern drift has accumulated)
- When a file exceeds 400 lines
- When you see the same logic copy-pasted in 3+ places
- When naming inconsistencies are causing AI confusion
- Before a major new feature that touches refactoring-needy code

---

## The Refactoring Workflow

### Step 1: Establish the Safety Net

```
Before refactoring:
1. Ensure all existing tests pass
2. Commit the current state (rollback point)
3. Identify the scope: which files will be refactored
```

### Step 2: Define the Refactoring Goal

Be specific about what you're improving and why:

**Good goals:**
- "Extract validation logic from the 600-line component into a separate module"
- "Rename `data` to `userProfile` across the profile module for clarity"
- "Deduplicate the date formatting logic that appears in 4 files"
- "Split this 500-line service into focused sub-services"

**Bad goals:**
- "Clean up the code"
- "Make it better"
- "Modernize"

### Step 3: Execute Incrementally

Do not refactor 20 files in one session. Refactor one concern at a time.

```
AI Refactoring Prompt:

Refactor [specific area] to [specific goal].

SCOPE:
- Files you may modify: [explicit list]
- Files you must NOT modify: [explicit list]

RULES:
- Preserve all existing behavior. Tests must still pass.
- Do not add new functionality.
- Do not change public API signatures.
- Run the test suite after each change.

OUTPUT:
1. Summary of each change and its rationale
2. Modified files
3. Confirmation that tests pass
```

### Step 4: Verify

- [ ] All existing tests pass
- [ ] Behavior is unchanged (manual smoke test)
- [ ] The refactoring goal was achieved (code is clearer/simpler)
- [ ] No new patterns were introduced that conflict with conventions
- [ ] AI agents can now more easily reason about the refactored code

---

## High-Impact Refactoring Targets

These refactoring types have the highest ROI for AI-assisted codebases:

### 1. File Size Reduction
**Problem:** AI generates inconsistent logic in files >400 lines.
**Solution:** Split large files into single-responsibility modules.
**Example:** 600-line `app.ts` → `app.ts` (setup) + `middleware/` + `routes/` + `data-source.ts`

### 2. Logic Centralization
**Problem:** Validation, formatting, or business rules scattered across components.
**Solution:** Extract into dedicated utility/service modules.
**Example:** Date formatting copied in 4 components → single `formatDate.ts` utility

### 3. Naming Normalization
**Problem:** Different AI sessions use different names for the same concept.
**Solution:** Standardize naming across the codebase.
**Example:** `userData`, `userProfile`, `userInfo` (same concept) → `userProfile` everywhere

### 4. Abstraction Level Alignment
**Problem:** Some functions are one-liners wrapped in classes; others are 200-line monoliths.
**Solution:** Normalize to consistent abstraction levels.
**Example:** A component with inline API calls + business logic + rendering → extracted hook + service

### 5. Dead Code Removal
**Problem:** AI adds new code but rarely removes old code.
**Solution:** Identify and remove unused imports, functions, components, and dependencies.
**Ask the AI:** "Find code in [module] that is no longer referenced anywhere. List it for my review before deletion."

---

## Refactoring with Parallel Agents

Large refactoring tasks can be parallelized across agents — but with strict partitioning.

**Safe parallel refactoring:**
- Agent 1: Refactors `src/services/` (all service files)
- Agent 2: Refactors `src/components/` (all component files)
- These directories have no overlap → no conflicts

**Unsafe parallel refactoring:**
- Agent 1: Renames `user` objects across the codebase
- Agent 2: Adds new user-related features
- These agents touch the same files → guaranteed conflicts

**Rule:** Parallel refactoring agents must have mutually exclusive file sets.

---

## When NOT to Refactor

| Situation | Why to Wait |
|---|---|
| **Before a deadline** | Refactoring introduces risk. Ship first, refactor after. |
| **Without test coverage** | Refactoring without tests is gambling. Add tests first. |
| **Mixed with feature work** | Separating behavior changes from structure changes is impossible to review. |
| **"It's ugly but works"** | Ugly isn't a refactoring justification. "Confusing to future AI sessions" is. |
| **Chasing perfection** | Refactoring has diminishing returns. Know when "good enough" is good enough. |

---

## Refactoring Health Metrics

Track these to know when refactoring is overdue:

| Metric | Warning Threshold | Action |
|---|---|---|
| Files >400 lines | >5 files | Schedule dedicated refactoring session |
| Duplicated logic | Same pattern in 3+ files | Extract into shared utility |
| AI confusion rate | AI needs 2+ corrections per feature | Refactor for clarity and consistency |
| Test fragility | Tests break on unrelated changes | Refactor tests to test behavior, not implementation |
| Onboarding friction | New AI session takes >10 messages to understand a module | Refactor module for clarity |

---

## Anti-Patterns in Refactoring

| Anti-Pattern | Why It Fails | Fix |
|---|---|---|
| **Refactoring without tests** | No way to verify behavior is preserved | Add characterization tests before refactoring |
| **The Big Rewrite** | Throwing away working code for "better" code | Incremental refactoring: improve one concern at a time |
| **Refactoring + features together** | Impossible to tell if a bug came from the feature or the refactor | Separate commits: refactor first, then feature |
| **AI unsupervised refactoring** | AI changes behavior "because it's better this way" | Strict constraint: "Preserve all existing behavior" |
| **Refactoring for refactoring's sake** | No measurable improvement in clarity or maintainability | Have a specific, articulable goal |
| **Never refactoring** | Accumulated entropy makes every subsequent AI session worse | Schedule refactoring after every 3-5 features |

---

## Key Takeaways

1. AI codebases need MORE refactoring, not less — entropy accumulates faster.
2. Two types: opportunistic (during feature work) and dedicated (scheduled sessions).
3. Safety net first: tests passing + committed state before any refactor.
4. Incremental: one concern at a time. Never the Big Rewrite.
5. File size reduction and logic centralization have the highest ROI.
6. Parallel refactoring is safe only with mutually exclusive file sets.

---

## Cross-References

- **Depends on:** `development-workflow.md` — the Refactor phase in the standard loop
- **Depends on:** `testing-philosophy.md` — tests as the safety net enabling safe refactoring
- **Applied by:** `ai-collaboration-mindset.md` — the "Architectural Entropy" risk and proactive refactoring
