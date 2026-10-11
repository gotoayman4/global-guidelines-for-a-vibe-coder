# Guideline Authoring Standards — Writing AI-Optimized Knowledge

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,300 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `documentation-strategy.md`, `classification-system.md`

---

## Purpose

Define the standards for authoring guideline documents in this knowledge base. Every guideline follows these conventions to ensure:
- AI can parse and apply them deterministically
- Token usage is optimized (extractable sections)
- Cross-referencing enables progressive disclosure
- New guidelines maintain consistency with existing ones

---

## File Structure Template

Every guideline file follows this structure:

```markdown
# Title — Short Descriptive Subtitle

**Status:** [Normative | Advisory | Archived]
**Scope:** [Global | Stack (Technology)]
**Token Tier:** [Full (~N tokens) | Compact (~N tokens)]
**Last Updated:** YYYY-MM-DD
**Cross-References:** `related-file.md`, `other-file.md`

---

## Purpose
1-3 sentences explaining what this document covers and when to load it.

---

## [Main Content Sections]
...

---

## Anti-Patterns

| Anti-Pattern | Why It Fails / Consequence | Fix |

---

## Key Takeaways
Numbered list (5-7 items) of the most actionable points. 
This section is the "compact extract" — AI loads this when tokens are tight.

---

## Cross-References
- **Depends on:** — files that should be loaded before this one
- **Extended by:** — files that go deeper on topics introduced here
- **Applied by:** — files that put these principles into practice
```

---

## Writing Conventions

### For AI Parsability
- Use tables for comparisons, checklists, and decision matrices
- Use code blocks with language tags for all code examples
- Use numbered lists for sequential steps
- Use bullet lists for non-sequential items
- Use bold for key terms on first use
- Use `inline code` for file paths, commands, and technical terms

### For Token Efficiency
- Every section serves a purpose. No filler. No motivational writing.
- Examples are concrete and minimal — show the pattern, not a tutorial
- Anti-patterns and Key Takeaways sections enable compact extraction
- Cross-references link to related files instead of duplicating content
- Avoid: "In today's fast-paced world of software development..." openings

### For Determinism
- Use "MUST" / "MUST NOT" for binding requirements (Normative)
- Use "SHOULD" / "SHOULD NOT" for strong recommendations
- Use "MAY" for optional practices
- Provide explicit acceptance criteria where applicable
- State both what TO do and what NOT to do

---

## Token Tier Strategy

Each guideline is tagged with a token tier:

| Tier | Use Case | What to Include |
|---|---|---|
| **Full (~N tokens)** | Architecture reviews, complex tasks, onboarding | Complete document |
| **Compact (~N tokens)** | Most feature work, tight context budgets | Purpose + Key Takeaways + Anti-Patterns only |

**Compact extraction rule:** When loading guidelines in low-token scenarios, AI extracts:
1. Purpose (first section)
2. Key Takeaways (numbered list at end)
3. Anti-Patterns table

Skip: extended reasoning, detailed examples, cross-references (available in MASTER_INDEX.md if needed).

---

## Classification System

See `classification-system.md` for the full authority hierarchy. Quick reference:

| Status | Meaning | AI Behavior |
|---|---|---|
| **Normative** | Binding — must be followed | Enforce strictly. Violations are errors. |
| **Advisory** | Recommended — adapt as needed | Follow unless project-specific rules override. |
| **Archived** | Historical reference only | Do not load unless explicitly requested. |

---

## Cross-Reference Conventions

Cross-references are structured to support progressive disclosure:

```
- **Depends on:** — Prerequisites. Load these first.
- **Extended by:** — Deeper dives. Load these when more detail is needed.
- **Applied by:** — Practical applications. Load these when implementing.
```

**Rule:** Never duplicate content that exists in another guideline. Cross-reference instead. This keeps each file focused and reduces total token consumption.

**One home per fact.** A canonical list — a trigger table, a gate step order, a forbidden-pattern list, a version table — lives in exactly one file. Every other site names that file and links; it never restates the list "for convenience", because a restated list is a second document that no one remembers to edit. When a guideline is replaced, retire the old text in the same commit rather than leaving it in place as "deprecated" — the ratchet that only adds is what turns a doc set into a maintenance tax. `npm run docs:census` enforces the project-facing half of this (a canonical fact may appear in only one of the mandated project docs).

---

## Known Tensions and Intentional Divergences

Not all inconsistencies are errors. Some are intentional divergences where a global standard and a stack-specific guide differ for valid reasons:

| Tension | Global Guideline | Stack Guide | Resolution |
|---|---|---|---|
| API error envelope | `api-design-standards.md`: mutually exclusive `{ data }` or `{ error }` | `nestjs-architecture.md`: combined envelope in controller types | Stack guide follows global standard; controller types use combined shape for TypeScript convenience but runtime responses are always mutually exclusive |
| Migration reversibility | `database-architecture.md`: "Every migration must be reversible" | `supabase-database.md`: historically said "reversible where practical" | Stack guide aligned to global standard — all migrations must be reversible |
| File size thresholds | `ai-collaboration-mindset.md`: "3-5 files max without review" | `development-workflow.md`: historically "1-5 files" | Standardized to "1-3 files ideal, 3-5 files max" across all workflow files |

**When adding a new guideline:** If it intentionally diverges from an existing guideline, document the divergence here with rationale.

---

## Key Takeaways

1. Every guideline follows the standard file structure template.
2. Status (Normative/Advisory/Archived) determines how AI enforces the content.
3. Key Takeaways enable compact extraction when tokens are tight.
4. MUST/SHOULD/MAY conventions ensure deterministic interpretation.
5. Cross-references prevent duplication and enable progressive disclosure.
6. Write for AI parsability: tables, code blocks, structured lists, bold terms.

---

## Cross-References

- **Depends on:** `classification-system.md` — the Normative/Advisory/Archived classification system
- **Applied by:** `documentation-strategy.md` — where these standards are used
- **Applied by:** `rule-extraction-methodology.md` — how guidelines become compact rules
