---
status: "Advisory"
scope: "Global"
tags: [review, quality, ai-only, verification]
---

# Review Workflow — Verification for AI-Generated Code

---

There is no human code reviewer. The operator is a solo, non-programmer vibe coder who cannot read a diff, and no colleague, specialist, or approval board will review the code. Review therefore has to be something an AI can execute and something a command can prove. A review that ends in "looks good" is not evidence; a review that names a failing test, an exit code, and a `file:line` finding is.

Review AI output with MORE skepticism than human code: it looks professional even when wrong, compiles even when flawed, and omits edge cases silently. Assume every line is wrong until verified.

## The Two Reviewers (both AI)

**Reviewer 1 — the authoring session (self-review, every change).**

```
Review the code you just produced as a strict senior engineer:
bugs, security (OWASP), missing edge cases, performance,
accessibility, maintainability. Separate confirmed issues from
possible concerns; propose minimal fixes for confirmed issues.
Run the tests you cite.
```

Catches syntax, imports, obvious logic, and tests that only assert the happy path. It is the cheap filter, not the gate.

**Reviewer 2 — an independent fresh session (risk-based gate).**

A separate AI context with no memory of authoring receives the diff, the acceptance criteria, and the commands to run. It reads the code cold, runs the tests and checks, and returns findings with `file:line`, confirmed-versus-concern, and a verdict. It may not accept the author's claims without re-running them.

## When the independent reviewer is mandatory

Risk decides, not line count:

- Authentication, authorization, permissions, session handling
- Payments and billing
- Data deletion, destructive migration, or an irreversible rewrite
- Secrets, credentials, security rules, or CORS/auth configuration
- A public API or data-contract change
- A new dependency, or a dependency major-version bump
- Any change that turns a stated rule into an exception

Everything else: self-review plus the automated gates appropriate to the mode. The independent reviewer is additive; it never replaces a test.

## The Checklist (both reviewers)

- **Correctness:** solves the requirement · acceptance criteria met · edge cases handled (null/empty/large/concurrent) · errors do not leak internals
- **Security:** parameterized queries · auth on protected routes · server-side validation · no hardcoded secrets · CORS whitelisted (full list: `security-engineering.md`)
- **Consistency:** follows project conventions · not a newly invented pattern
- **Simplicity:** simpler solution possible? · unnecessary abstractions or dependencies?
- **Maintainability:** a future AI session can modify safely · files sized · public APIs documented
- **Test adequacy:** would each new test FAIL if the behavior it guards were removed? A test that cannot fail is not evidence (see the reversal-proof rule in `testing-philosophy.md`)

## Review by Change Size

Size is a constraint on the reviewing AI's working context, not a human time budget:

| Size | Approach | Merge criteria |
|---|---|---|
| 1 file <50 lines | Self-review + tests | Tests pass |
| 1–3 files <200 lines | Full checklist | All items pass |
| 3–5 files <500 lines | Full checklist + independent fresh session | Checklist + regressions pass |
| 5+ files / 500+ lines | **Split the slice first** | N/A |

A large diff degrades AI review quality and makes a reversal proof ambiguous: when the check goes red, the slice no longer says which change caused it. That is the reason to split — not a human reader's patience.

## Multi-Agent Review on Critical Paths

For auth, payments, permissions, and destructive data changes, run two or three independent fresh sessions with distinct mandates:

- **Security session:** OWASP, auth bypass, injection, secret handling, permission boundaries
- **Test-adequacy session:** coverage of failure paths, assertions that can actually fail, reversal proofs
- **Data-integrity session:** transactions, rollback, migration reversibility, concurrent writes

The authoring agent synthesizes the findings, applies minimal fixes, and re-runs every reviewer until all verdicts pass. These are AI roles, not job titles — no specialist human is involved, and none is required.

## Evidence Format

Every review verdict MUST contain:

1. The exact command(s) run and their result (exit code, test counts, or observed behavior).
2. Each finding with `file:line`, a severity, and the minimal fix.
3. Confirmed issues separated from concerns.
4. One verdict: **PASS**, **CHANGES REQUIRED**, or **BLOCKED**.

No verdict without a run. A review that executed nothing is a read, not a review.

## Loop

`AI GENERATES → SELF-REVIEW → FIX → AUTOMATED GATES → INDEPENDENT AI REVIEW (risk-based) → FIX → COMMIT/MERGE`

Never commit on a quick scan alone; never without tests; never with an unverified security claim.

## The Owner's Role

The owner decides product and governance questions — what to build, which tradeoff is acceptable, whether to accept a **MAJOR** rule change. The owner is never asked to read code, inspect a diff, or act as reviewer. When an agent cannot verify a change, it MUST say what remains unverified and propose a check that an AI or a command can run — routing the diff to a human is not a verification plan.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Waiting for a human reviewer | No human reviews code — use a fresh AI session or write the missing test |
| "Looks good to me" / "the AI is smart" | A verdict needs commands and results |
| Reviewing the diff, not the behavior | Run the app, the test, or the query |
| Treating a passing linter as auth proof | Auth needs an automated auth-flow test and adversarial cases |
| Rubber-stamping a small change | One line can be catastrophic |
| Accepting a test the author never watched fail | Prove the test can fail, then fix it |
| Asking the owner to read code | The owner decides product; the AI proves code |

## Cross-References

- **Depends on:** `development-workflow.md`, `security-engineering.md`, `testing-philosophy.md`
- **Applied by:** `agent-verification-loop.md`, `speed-tiered-workflow.md`
- Skill: `global-configs/skills/code-review/SKILL.md`
