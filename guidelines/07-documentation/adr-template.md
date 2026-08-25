# Architecture Decision Record (ADR) Template

**Status:** Advisory
**Scope:** Global
**Token Tier:** Full (~800 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `documentation-strategy.md`

---

## Purpose

Provide a standard template for Architecture Decision Records (ADRs). ADRs document significant architectural decisions, their context, and their consequences. They prevent AI from reversing decisions in future sessions and provide context for why the codebase is structured as it is.

---

## When to Write an ADR

Write an ADR when:
- Choosing a technology (database, framework, library, tool)
- Making a significant architectural pattern decision (monolith vs services, state management approach)
- Establishing a convention that differs from the default
- Deprecating a previous decision

Skip ADRs for:
- Minor implementation details
- Decisions that are easily reversible
- Standard conventions that need no justification

---

## Template

```markdown
# ADR [NNN]: [Short Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Date
YYYY-MM-DD

## Context
What is the problem we're trying to solve? What constraints exist?
What alternatives were considered?

## Decision
What did we decide? Be specific. Include:
- Technology choices with versions
- Patterns or conventions adopted
- Scope of the decision

## Rationale
Why this decision over alternatives? What trade-offs are we accepting?
What risks are we aware of?

## Consequences
### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Drawback 1]
- [Drawback 2]

### Neutral
- [Side effect 1]

## Alternatives Considered
| Alternative | Pros | Cons | Why Rejected |
|---|---|---|---|
| Option A | ... | ... | ... |
| Option B | ... | ... | ... |
```

---

## Example ADR

```markdown
# ADR 001: Use Zod for Runtime Validation

## Status
Accepted

## Date
2026-05-24

## Context
We need runtime validation for API inputs and configuration. TypeScript 
provides compile-time type checking but no runtime guarantees. Considered:
- Zod
- Joi
- Yup
- Manual validation

## Decision
Use Zod for all runtime validation. Zod schemas are the single source of 
truth for data shapes — TypeScript types are inferred from schemas, not 
written manually.

## Rationale
- Zod has first-class TypeScript inference (types from schemas)
- Smaller bundle size than Joi (tree-shakeable)
- Active maintenance and large community
- AI models have extensive Zod training data

## Consequences
### Positive
- Single source of truth: schema → TypeScript types
- Runtime validation matches compile-time types
- Reusable across frontend and backend

### Negative
- Learning curve for complex schema patterns
- Bundle size impact if not tree-shaken properly

### Neutral
- Schema definitions become part of the public API contract

## Alternatives Considered
| Alternative | Pros | Cons | Why Rejected |
|---|---|---|---|
| Joi | Mature, powerful | Large bundle, poor TS inference | Bundle size concerns |
| Yup | Familiar API | Slower, less TS integration | Zod better for TS-first projects |
| Manual | No dependencies | Error-prone, inconsistent | Not scalable |
```

---

## ADR Lifecycle

1. **Proposed** — Decision is under discussion
2. **Accepted** — Decision is approved and in effect
3. **Deprecated** — Decision is no longer in effect (but kept for context)
4. **Superseded** — Replaced by a newer ADR (reference which one)

**Rule:** Never delete ADRs. Deprecate or supersede them. Historical context is valuable for AI understanding why certain patterns exist.

---

## File Naming and Storage

```
docs/adr/
├── README.md                # Index of all ADRs
├── 001-use-zod-validation.md
├── 002-use-postgresql.md
├── 003-react-query-server-state.md
└── template.md              # This template
```

---

## Key Takeaways

1. ADRs document WHY decisions were made, not just WHAT was decided.
2. Write ADRs for technology choices, architectural patterns, and convention changes.
3. Never delete ADRs — deprecate or supersede them.
4. ADRs prevent AI from reversing decisions by providing explicit rationale.
5. Store ADRs in `docs/adr/` with sequential numbering.

---

## Cross-References

- **Applied by:** `documentation-strategy.md` — ADRs as part of project documentation
- **Referenced by:** `ai-collaboration-mindset.md` — ADRs as mitigation for Architectural Entropy risk
