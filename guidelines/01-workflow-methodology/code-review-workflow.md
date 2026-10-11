---
status: "Advisory"
scope: "Global"
tags: [review, quality, collaboration]
---

# Code Review Workflow — Quality Gates for AI-Generated Code

---

Review AI output with MORE skepticism than human code: it looks professional even when wrong, compiles even when flawed, and omits edge cases silently. Assume every line is wrong until verified.

## The Two-Phase Review

**Phase 1 — AI self-review (quick filter):**
```
Review the code you just produced as a strict senior engineer:
bugs, security (OWASP), missing edge cases, performance,
accessibility, maintainability. Separate confirmed issues from
possible concerns; propose minimal fixes for confirmed issues.
```
Catches syntax/imports/obvious logic. Misses business logic, domain edges, architectural misfits.

**Phase 2 — Deep review (the real gate):** every change; in vibe it collapses to the run-it-once check for trivial edits and is deferred to the ship boundary, where the full checklist runs. When it runs:
- **Correctness:** solves the requirement · acceptance criteria met · edge cases handled (null/empty/large/concurrent) · errors not leaking internals
- **Security:** parameterized queries · auth on protected routes · server-side validation · no hardcoded secrets · CORS whitelisted (full list: `security-engineering.md`)
- **Consistency:** follows project conventions · not a newly-invented pattern
- **Simplicity:** simpler solution possible? · unnecessary abstractions/deps?
- **Maintainability:** future AI sessions can modify safely · sized files · documented public APIs

## Review by Change Size

| Size | Approach | Merge Criteria |
|---|---|---|
| 1 file <50 lines | Quick scan + tests | Tests pass |
| 1–3 files <200 lines | Full checklist | All items pass |
| 3–5 files <500 lines | Full review + self-review + suite | Checklist + regressions pass |
| 5+ files / 500+ lines | **REJECT** — split first | N/A |

If the diff can't be reviewed thoroughly in 15 minutes, it's too large.

## Multi-Agent Review (critical paths: auth, payments, permissions)

Security reviewer (OWASP/auth/injection) + performance reviewer (N+1/memory/bottlenecks) + test reviewer (coverage/assertion quality) → the agent synthesizes; merge only when all pass.

## Loop

`AI GENERATES → SELF-REVIEW → FIX → DEEP REVIEW → CHANGES → MERGE`
Never merge on a quick scan alone; never without tests; never unverified.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Skimming ("the AI is smart") | Full checklist always |
| Reviewing diff, not behavior | Test actual behavior |
| "It compiled" as verification | Tests + smoke test |
| Skipping deep review because "the AI wrote it" | Run the full checklist on every change |
| Rubber-stamping small changes | One line can be catastrophic |

## Cross-References

`development-workflow.md` · `security-engineering.md` · `testing-philosophy.md`
