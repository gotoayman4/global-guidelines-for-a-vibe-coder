# Rule Extraction Methodology — From Guidelines to Compact Rules

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,500 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `ai-governance-framework.md`, `guideline-authoring-standards.md`

---

## Purpose

Define the methodology for extracting compact, deterministic rules from verbose guideline documents. Guidelines are comprehensive references (~2,000 tokens each). Rules are compact enforcement directives (~50-100 tokens each) designed for IDE/agent rule files where context is extremely constrained.

---

## Why Rule Extraction Matters

Guidelines explain WHY. Rules enforce WHAT. Both are necessary:

| | Guidelines | Rules |
|---|---|---|
| **Purpose** | Reference, education, reasoning | Enforcement, constraint, activation |
| **Length** | 1,500-2,800 tokens | 50-100 tokens per rule |
| **Tone** | Explanatory, reasoned, with examples | Imperative, minimal, deterministic |
| **Usage** | Loaded on demand by AI agents | Always loaded in IDE/agent context |
| **Audience** | AI agents with context budget | AI in constrained context (inline completions, editor rules) |

**Rule:** Guidelines are the source of truth. Rules are compiled extracts. Never write a rule without a corresponding guideline.

---

## Extraction Methodology

### Step 1: Identify Normative Statements

Scan the guideline for MUST / MUST NOT statements. These are the strongest candidates for rules.

**Guideline (2,000 tokens):**
> All database queries must use parameterized statements. String concatenation or template literals in SQL queries are forbidden. This applies to all database access — raw queries, ORM raw methods, and migration scripts. Violation is a security vulnerability (SQL injection).

**Extracted Rule (30 tokens):**
```
ALL database queries MUST use parameterized statements. String concatenation in SQL is FORBIDDEN.
```

### Step 2: Extract Anti-Patterns

Anti-patterns tables contain the most actionable content. Convert each anti-pattern to a negative rule.

**Guideline Anti-Pattern:**
> | **Hardcoded secrets** | Secrets in git history, training data leaks | Environment variables only |

**Extracted Rule:**
```
NEVER hardcode secrets. Use environment variables. Pre-commit hooks MUST scan for secret patterns.
```

### Step 3: Extract Key Takeaways

The Key Takeaways section is designed for compact extraction. Convert each takeaway to a rule.

**Guideline Key Takeaway:**
> "1. Commit after every working increment. Granular commits = cheap rollbacks."

**Extracted Rule:**
```
Commit after every working increment. Each commit MUST have a descriptive message with type and scope.
```

### Step 4: Prioritize by Risk

Not all guidelines need corresponding rules. Prioritize:
1. **Critical (always extract):** Security, data integrity, auth
2. **High (usually extract):** Architecture, testing, error handling
3. **Medium (extract if space allows):** Code style, naming, documentation
4. **Low (skip for rules):** Philosophy, reasoning, decision frameworks

---

## Rule Format

Rules follow a consistent format optimized for AI parsing:

```
# [Category]: [Short description]
[Imperative statement using MUST/SHOULD/NEVER]
[Optional: one-line rationale]
```

**Examples:**
```
# Security: SQL Injection Prevention
ALL database queries MUST use parameterized statements. NEVER use string concatenation.

# Testing: Regression Prevention
Every bug fix MUST include a regression test that reproduces the bug.

# Architecture: File Size
Files MUST NOT exceed 400 lines. Split into smaller modules when approaching this limit.

# Git: Commit Hygiene
Commit after every working increment. Commit messages MUST follow conventional commit format.

# API: Error Responses
Error responses MUST include machine-readable "code" field. NEVER expose stack traces.
```

---

## Rule Organization

Rules should be organized by category for discoverability:

```markdown
# Project Rules

## Security (Always Load)
- [Parameterized Queries]
- [Secrets Management]
- [Input Validation]

## Testing (Always Load)
- [Regression Tests for Fixes]
- [Critical Flow E2E Tests]

## Architecture (Load for New Features)
- [File Size Limits]
- [Layer Separation]

## Git (Load for All Code Changes)
- [Commit Conventions]
- [Branch Strategy]

## Style (Load When Relevant)
- [Naming Conventions]
- [Import Order]
```

---

## Rule File Placement

Different tools use different rule files:

| Tool | Rule File | Format |
|---|---|---|
| **Cursor 0.45+** | `.cursor/rules/` | `.mdc` files with glob patterns |
| **Cursor <0.45** | `.cursorrules` | Markdown at project root (legacy) |
| **Claude Code** | `CLAUDE.md` | Markdown at project root |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Markdown |
| **Qoder** | `.qoder/rules/` | Markdown files |
| **General** | `AGENTS.md` | Markdown at project root |

---

## Maintenance

Rules are derived from guidelines. When a guideline changes:
1. Check if extracted rules need updating
2. Rules should never contradict their source guideline
3. If a rule and guideline conflict, the guideline wins (rules are extracts, not overrides)

**Review cycle:** Audit rules quarterly against source guidelines. Remove rules for archived guidelines.

---

## Anti-Patterns in Rule Extraction

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Rules without guidelines** | No rationale; can't evolve; unknown authority | Every rule links to a source guideline |
| **Vague rules** | "Be clean" — unenforceable | Concrete, verifiable: "Files MUST NOT exceed 400 lines" |
| **Too many rules** | Context pollution; important rules diluted | 10-20 rules maximum in always-loaded context |
| **Conflicting rules** | AI can't determine which to follow | Audit for conflicts; resolve to single source of truth |
| **Stale rules** | AI follows outdated patterns | Re-extract when source guidelines change |

---

## Key Takeaways

1. Guidelines are the source of truth. Rules are compact extracts for constrained contexts.
2. Extract from: Normative statements → Anti-patterns → Key Takeaways.
3. Prioritize: Critical (security, auth) → High (architecture, testing) → Medium (style).
4. Rule format: `# Category: [MUST/SHOULD/NEVER] [action]. [rationale].`
5. 10-20 rules maximum in always-loaded context. Link to guidelines for details.
6. Re-extract rules when source guidelines change.

---

## Cross-References

- **Depends on:** `ai-governance-framework.md` — where rules fit in the authority hierarchy
- **Depends on:** `guideline-authoring-standards.md` — how guidelines are structured for easy extraction
- **Depends on:** `classification-system.md` — Normative/Advisory tiers determine extraction priority
