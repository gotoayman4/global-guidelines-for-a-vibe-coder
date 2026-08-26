# Architecture Decision Record (ADR) Template

**Status:** Advisory
**Scope:** Global
**Token Tier:** Full (~450 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `documentation-strategy.md`

---

ADRs document WHY decisions were made, preventing AI from reversing them in future sessions.

## When to Write One

Technology choices (DB, framework, library) · significant architecture patterns (monolith vs services, state management) · conventions differing from defaults · deprecating a prior decision. **Skip for:** minor details, easily reversible decisions, standard conventions.

## Template

```markdown
# ADR [NNN]: [Short Title]

## Status: Proposed | Accepted | Deprecated | Superseded by ADR-XXX
## Date: YYYY-MM-DD

## Context
Problem to solve; constraints; alternatives considered.

## Decision
Specific choice — technologies with versions, patterns adopted, scope.
Types are inferred from schemas, not written manually. (example phrasing)

## Rationale
Why this over alternatives; trade-offs accepted; known risks.

## Consequences
Positive / Negative / Neutral bullet lists.

## Alternatives Considered
| Alternative | Pros | Cons | Why Rejected |
```

## Lifecycle & Storage

`Proposed → Accepted → Deprecated → Superseded`. **Never delete ADRs** — deprecate or supersede; historical context explains why patterns exist. Store in `docs/adr/` with sequential numbering (`001-use-zod-validation.md`) plus an index README.

## Cross-References

`documentation-strategy.md`
