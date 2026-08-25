# AI Governance Framework — Authority Hierarchy and Control

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,100 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `classification-system.md`, `ai-security-governance.md`

---

## Purpose

Define the governance framework for AI-assisted development. This establishes the authority hierarchy that determines which instructions take precedence, how rules interact, and how to resolve conflicts between guidelines.

---

## The Authority Hierarchy

When multiple sources of instruction exist, precedence follows this order (highest to lowest):

```
1. User's explicit prompt (session-level)
2. Project-specific rules (.cursorrules, CLAUDE.md, AGENTS.md)
3. Global normative guidelines (this knowledge base — Normative status)
4. Global advisory guidelines (this knowledge base — Advisory status)
5. IDE/agent default behaviors
6. AI model training defaults
```

**Rule:** Higher levels override lower levels. A user prompt saying "ignore the TypeScript strict rules for this task" overrides the TypeScript guideline. A project rule saying "use JavaScript, not TypeScript" overrides the global TypeScript guideline.

---

## Classification System

All guidelines in this knowledge base are classified into three tiers:

| Tier | Name | Binding Force | Violation Consequence | Example |
|---|---|---|---|---|
| **Tier 1** | Normative | MUST be followed | Violation is an error; AI must refuse or flag | "All database queries must be parameterized" |
| **Tier 2** | Advisory | SHOULD be followed | Violation is a warning; AI should note and justify | "Prefer React Query over Redux for server state" |
| **Tier 3** | Archived | DO NOT follow (historical only) | Do not load unless explicitly requested | Deprecated patterns from older versions |

See `classification-system.md` for the full classification framework.

---

## Governance Mechanisms

### 1. Sovereign Rules File

Every project must have a rules file that acts as the project constitution:

```
CLAUDE.md              (Claude Code)
.cursor/rules/*.mdc    (Cursor 0.45+ — modern rule directory)
.cursorrules           (Cursor <0.45 — legacy single file at root)
AGENTS.md              (General, tool-agnostic)
```

**Note on Cursor compatibility:** Cursor 0.45+ uses `.cursor/rules/` with `.mdc` files. Earlier versions use `.cursorrules` at project root. Use the format matching your Cursor version. Both are functionally equivalent.

**Contents:**
- Exact stack versions (locked, not ranges)
- Forbidden dependencies and patterns
- Security mandates ("All DB queries parameterized")
- Naming and structure conventions
- Reference to global guideline files to load

**Rule:** The rules file is committed to Git and treated as code. Changes to the rules file go through review, just like code changes. Never let AI modify the rules file without human approval.

### 2. WORLD.md — Product Intent Guardrail

See `planning-and-scoping.md`. This file defines what the project exists to do and what it must NOT become. It prevents AI from adding features that violate the product vision.

### 4. MCP Governance

See `ai-security-governance.md` for the full MCP governance framework. Key rules:

- Whitelist, don't blacklist. Explicitly define what tools each agent can access.
- Separate MCPs by environment. Development credentials never match production.
- No production write access for background agents.
- Review MCP tool calls before approving destructive operations.

---

## Conflict Resolution

When guidelines conflict:

### Guideline vs Guideline
1. Normative overrides Advisory
2. More specific overrides more general
3. Newer overrides older (check Last Updated date)
4. If still unclear, the human decides

### Guideline vs Project Rule
1. Project rules always override global guidelines
2. Exception: Security mandates (Normative, Tier 1) SHOULD NOT be overridden without explicit human acknowledgment

### Guideline vs User Prompt — Contradiction Protocol

**Rationale:** Vibe coders operate across many sessions and projects. They may forget about existing guidelines and rules that were established in prior sessions. The AI acts as the memory and consistency layer — it must surface forgotten constraints before the user accidentally violates them.

**Protocol:** When the user's prompt contains directions that contradict any established guideline or rule, the AI must follow this mandatory protocol:

1. **PAUSE and IDENTIFY** — Do not begin implementation. Identify the exact contradiction: which specific guideline X in document Y.
2. **CITE the source** — Quote or reference the specific section being contradicted, including the document path and section heading.
3. **DESCRIBE the conflict** — Explain clearly what the user's direction would do and why it conflicts with the established guideline.
4. **REQUEST CONFIRMATION** — Ask the user to explicitly confirm they want to proceed despite the contradiction. Do not proceed until the user provides that confirmation.

**After confirmation is received:** The user's explicit instruction overrides the guideline for this session. The AI should implement as directed but add a brief note acknowledging the override.

**Scope:** This protocol applies to ALL established guidelines — Normative, Advisory, and project-specific rules. The AI does not decide that a guideline is "unimportant" and skip the protocol.

**Example — Correct Protocol:**
```
User: "Skip input validation for this endpoint — it's an internal API."

AI: "⚠️ **Contradiction Detected** — Before I proceed:

Your direction to skip input validation contradicts:
- **Guideline:** `error-handling-philosophy.md` (02-engineering-practices/)
- **Section:** 'Server-Side Validation is Non-Negotiable'
- **What it requires:** Every endpoint must validate all inputs on the server side, 
  regardless of whether it's internal or public.

Skipping validation means this endpoint will accept malformed data, 
potential injection payloads, and missing required fields without 
rejection.

**Do you want me to skip server-side validation for this endpoint 
despite this contradiction?** Reply 'yes, skip validation' to confirm 
or 'no, follow the guideline' to implement with validation."

User: "Yes, skip validation."

AI: "Confirmed. I'll skip server-side validation for this endpoint as 
instructed. Note: this override applies to the current task only."
```

**Example — Incorrect (AI proceeds without confirmation):**
```
User: "Skip input validation for this endpoint — it's an internal API."

AI: "The error-handling-philosophy.md guideline requires server-side 
validation. I'll skip it as you instructed." [Proceeds to implement]

// ❌ WRONG: AI did not pause, did not request explicit confirmation
```

---

## Governance in Practice

### Before Every AI Session
1. Load project rules file (CLAUDE.md, AGENTS.md, etc.)
2. Load WORLD.md for product intent
3. Load relevant guidelines based on task type (see MASTER_INDEX.md task-type table)

### During AI Generation
1. Guidelines constrain AI output in real-time
2. Violations of Normative guidelines are flagged before output
3. Advisory guidelines are checked; violations are noted with justification

### After AI Generation
1. Human reviews output against guidelines
2. Guideline violations are either fixed or explicitly overridden
3. Recurring violations suggest a guideline needs updating

---

## When to Override Normative Rules

Normative guidelines are binding by default, but there are legitimate exceptions. Override a Normative rule **only** when:

1. **The rule doesn't apply to the technology** — e.g., a React-specific rule in a non-React file.
2. **A higher authority (user prompt or project rule) explicitly supersedes it** — documented in the project rules file.
3. **Compliance would cause a critical bug or security vulnerability** — e.g., a rigid pagination rule blocking a critical hotfix.
4. **The guideline itself is under active review** — noted in the guideline's header with a "Under Review" flag.

**Required when overriding:**
- Document the override in an ADR or project decision log.
- Add a code comment referencing the override decision.
- Review the override in the next quarterly audit.

**Never override without:**
- Understanding the original rule's purpose
- Getting a second human review (for security-related overrides)
- Documenting the rationale

---

## Decision Log — Common Governance Questions

| Question | Answer | Source |
|---|---|---|
| Why is `code-review-workflow.md` Advisory while `debugging-with-ai.md` is Normative? | Review is a human judgment process that AI can only assist, not enforce. Debugging follows a mandatory loop (Observe → Isolate → Fix → Verify) that AI must execute consistently. | Classification rationale: human-judgment processes default to Advisory |
| Why is `monorepo-strategy.md` Advisory? | Monorepo vs. polyrepo is a contextual architecture decision, not a universal structural requirement. | Classification rationale: architecture patterns with valid alternatives |
| Can a single project have both `.cursorrules` and `.cursor/rules/`? | No — choose one format per project. Using both creates confusion about which rules take precedence. | Tool compatibility note |
| What happens when two Normative guidelines conflict? | Apply the conflict resolution chain: Specific > General, then Newer > Older. If still unclear, human decides. | See "Conflict Resolution" section above |
| Can AI propose guideline changes? | Yes, but AI cannot apply them without human approval. Proposed changes should be submitted as PRs with rationale. | Governance mechanism: human gate on all guideline changes |

---

## Evolving the Governance System

Guidelines are living documents. They evolve with the project:

1. **Add:** When a pattern proves successful across multiple features, codify it as an Advisory guideline
2. **Promote:** When an Advisory guideline proves essential for quality, promote to Normative
3. **Demote:** When a Normative guideline causes more friction than value, demote to Advisory
4. **Archive:** When a guideline is no longer relevant, move to Archived

**Rule:** Guideline changes go through the same review process as code changes. Never let AI modify guidelines without human approval.

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **No rules file** | Every AI session starts as a blank slate | Create and commit CLAUDE.md / AGENTS.md |
| **AI-written rules file** | Rules reflect AI's preferences, not project needs | Human authors rules; AI only suggests additions |
| **Ignoring guideline violations** | Accumulated violations make guidelines meaningless | Enforce consistently; update guidelines if they don't fit |
| **Too many Normative rules** | Rules become noise; important ones get ignored | Reserve Normative for critical constraints; Advisory for recommendations |
| **Stale guidelines** | AI follows outdated patterns | Review and update guidelines quarterly |

---

## Key Takeaways

1. Authority hierarchy: User prompt > Project rules > Global Normative > Global Advisory > IDE defaults.
2. Normative = MUST follow. Advisory = SHOULD follow. Archived = DON'T load.
3. Project rules file (CLAUDE.md) is the constitution. Committed to Git. Human-authored.
4. MCP governance: whitelist tools, separate environments, no production write for background agents.
5. Contradiction Protocol: AI MUST pause, cite the specific guideline, and request explicit user confirmation before proceeding with any direction that contradicts established guidelines or rules. Rationale: vibe coders may forget existing constraints between sessions.
6. Conflicts resolved by: Normative > Advisory, Specific > General, Newer > Older.
7. Guidelines evolve: Add → Promote → Demote → Archive.

---

## Cross-References

- **Depends on:** `classification-system.md` — the classification tiers used in governance
- **Extended by:** `rule-extraction-methodology.md` — how to derive compact rules from guidelines
- **Extended by:** `skill-design-patterns.md` — how skills fit into the governance hierarchy
- **Applied by:** `ai-security-governance.md` — MCP governance as part of the framework
