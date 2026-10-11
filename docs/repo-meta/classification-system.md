---
status: "Normative"
scope: "Global"
tags: [classification, governance, authority]
---

# Classification System — Normative, Advisory, and Archived Tiers

---

## Purpose

Define the three-tier classification system used by all guidelines in this knowledge base. This system determines how AI interprets and enforces each guideline.

---

## The Three Tiers

### Tier 1: Normative (Binding)

**Meaning:** This guideline MUST be followed. Violation is an error.

**Characteristics:**
- Addresses safety, security, or structural integrity
- Violation has clear negative consequences
- Represents a settled best practice, not a preference
- Uses MUST / MUST NOT language

**AI Behavior:**
- Enforce strictly
- Flag violations before output
- Refuse to generate code that violates normative guidelines (or flag explicitly)
- Do not override without an explicit, recorded acknowledgment

**Examples:**
- "All database queries MUST use parameterized statements."
- "Authentication code MUST have an automated auth-flow test."
- "Secrets MUST NEVER be hardcoded in source files."

### Tier 2: Advisory (Recommended)

**Meaning:** This guideline SHOULD be followed. Violation is noted but permitted with justification.

**Characteristics:**
- Represents a strong recommendation
- May have valid exceptions
- Optimizes for quality, not safety
- Uses SHOULD / SHOULD NOT language

**AI Behavior:**
- Follow by default
- Note violations with explanation
- Override when project-specific rules or user instructions conflict
- Do not block generation; warn instead

**Examples:**
- "React Query SHOULD be used for server state instead of Redux."
- "Components SHOULD be split when exceeding 300 lines."
- "API documentation SHOULD be updated in the same iteration as code changes."

### Tier 3: Archived (Historical)

**Meaning:** This guideline is NO LONGER in effect. Do not follow it.

**Characteristics:**
- Represents deprecated patterns or outdated guidance
- Retained for historical context only
- May explain why a pattern was abandoned

**AI Behavior:**
- Do NOT load unless explicitly requested
- If loaded, treat as informational, not actionable
- Note that this guidance has been superseded

**Examples:**
- "Previously, we used class components. We have migrated to functional components with hooks."
- "The old deployment pipeline used Jenkins. We now use GitHub Actions."

---

## Classification Decision Matrix

| Question | If Yes | If No |
|---|---|---|
| Could violating this guideline cause a security vulnerability? | Normative | → |
| Could violating this guideline cause data loss or corruption? | Normative | → |
| Is this a settled industry best practice with near-universal agreement? | Normative | → |
| Is this an optimization or quality improvement? | Advisory | → |
| Is this a style or preference choice? | Advisory | → |
| Does this guideline have commonly accepted exceptions? | Advisory | → |
| Is this guidance no longer applicable? | Archived | → |

---

## Promoting and Demoting Classifications

Guidelines can change classification over time:

### Promotion (Advisory → Normative)
When an advisory practice proves critical for quality or safety:
- "Prefer parameterized queries" → "All queries MUST be parameterized" (after a SQL injection incident)

### Demotion (Normative → Advisory)
When a normative rule causes more friction than value:
- "All commits MUST be signed" → "Commits SHOULD be signed" (when GPG key management becomes a bottleneck)

### Archival (Any → Archived)
When a guideline is no longer relevant:
- Deprecated technology stacks
- Patterns replaced by better alternatives
- Conventions from a previous project phase

---

## Classification in File Headers

Every guideline file declares its classification in the header:

```yaml
status: "Normative"
scope: "Global"
tags: [topic, subtopic]
```

The combination of Status + Scope tells AI:
- How strictly to enforce (Status)
- Where the guideline applies (Scope)

| Scope | Meaning |
|---|---|
| **Global** | Applies to all projects, regardless of technology |
| **Stack (React)** | Applies only to React projects |
| **Stack (TypeScript)** | Applies only to TypeScript projects |

---

## Key Takeaways

1. Normative = MUST follow. Advisory = SHOULD follow. Archived = DON'T follow.
2. Security and data integrity guidelines are always Normative.
3. Style and preference guidelines are Advisory by default.
4. Guidelines evolve: Advisory → Normative (promotion), Normative → Advisory (demotion), Any → Archived.
5. Every guideline file declares its Status and Scope in YAML front-matter; token counts are computed (chars ÷ 4), never stored.
6. AI enforces Normative strictly; follows Advisory by default but allows exceptions.

---

## Cross-References

- **Applied by:** `ai-governance-framework.md` — the governance framework that uses these tiers
- **Applied by:** `guideline-authoring-standards.md` — how to classify guidelines when writing them
- **Applied by:** `rule-extraction-methodology.md` — extraction priority depends on Normative/Advisory distinction
- **Referenced by:** All guideline files that declare their Status in the header
