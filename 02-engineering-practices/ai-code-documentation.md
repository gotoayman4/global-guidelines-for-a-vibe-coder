# AI-Optimized Code Documentation — Writing Code Comments for the Next AI Session

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,800 tokens)
**Last Updated:** 2026-05-25
**Cross-References:** `documentation-strategy.md`, `ai-collaboration-mindset.md`, `context-management-strategy.md`

---

## Purpose

In vibe coding, code is written by AI and read by AI. The primary audience for inline code documentation is not a human maintainer — it's the next AI session that will modify, debug, or extend this code. This guideline defines how to write code comments that serve as **persistent context** for AI, replacing the session memory that is lost between conversations.

Traditional code comments explain "why" for humans. AI-optimized comments explain **intent, constraints, decisions, and non-obvious behaviors** for the next AI agent that will read this file with zero prior context.

---

## Core Principle: Comments Are Context Persistence

Every AI session starts with zero memory. The only way an AI agent can understand WHY a piece of code exists, WHAT constraints it must satisfy, and WHAT it must NOT do — is through the code itself and its comments.

**Rule:** Inline comments in AI-generated code serve the next AI session, not the current one. Write comments that would let a brand new AI agent understand your intent without any conversation history.

---

## The AI-Readable Comment Framework (ICDC)

Every non-obvious section of code should answer four questions that an AI agent with no context would need:

| Letter | Question | When Required |
|--------|----------|----------------|
| **I** — Intent | What is this code supposed to accomplish? | Always, for any non-trivial function or block |
| **C** — Constraints | What must this code NOT violate? (business rules, security, performance) | When constraints are not obvious from the code itself |
| **D** — Decisions | Why was this approach chosen over alternatives? | When the "obvious" approach was intentionally not taken |
| **C** — Caveats | What edge cases, limitations, or surprising behaviors exist? | When behavior may surprise the next reader |

---

## Comment Types and When to Use Them

### 1. Intent Comments (Always Required for Non-Trivial Code)

Place at the top of functions or complex blocks. Answer: "What is this code supposed to do?"

```typescript
// INTENT: Calculate the total price including VAT at the country-specific rate.
// Returns 0 for tax-exempt accounts (isTaxExempt === true).
function calculateTotal(price: number, account: Account): number {
```

**When to use:** Every function that does more than simple CRUD or trivial operations.

**When NOT to use:** Simple getters, setters, or one-line operations where the function name already explains intent.

### 2. Constraint Comments (When Constraints Are Not Obvious)

Document business rules, security requirements, or performance constraints that the code must satisfy.

```typescript
// CONSTRAINT: Password MUST be hashed with bcrypt (cost factor 12) before storage.
// Plain-text passwords MUST NEVER appear in logs, API responses, or error messages.
async function createUser(email: string, password: string): Promise<User> {
```

```typescript
// CONSTRAINT: This endpoint MUST return results within 500ms p95.
// If the query takes longer, return a partial result with a pagination cursor.
async function searchProducts(query: string): Promise<SearchResult> {
```

**When to use:** Security-sensitive code, performance-critical code, business rule enforcement, regulatory compliance.

### 3. Decision Comments (When You Chose the Non-Obvious Approach)

Explain WHY a particular approach was chosen, especially when a seemingly simpler approach exists.

```typescript
// DECISION: Using optimistic concurrency with last-write-wins instead of pessimistic locking.
// Rationale: This is an internal tool with <50 concurrent users. Locking would add complexity
// for a problem that rarely occurs. If two users edit simultaneously, the later write wins.
// If concurrency becomes an issue, switch to conflict resolution UI (see ADR-005).
async function updateProgram(id: string, data: ProgramData): Promise<Program> {
```

**When to use:** When a simpler-looking approach was deliberately not chosen, when architecture decisions affect future changes, when performance trade-offs were made.

### 4. Caveat Comments (When Behavior May Surprise)

Document non-obvious behaviors, edge cases, or things that look like bugs but are intentional.

```typescript
// CAVEAT: Empty string is treated as "no filter" (returns all items), NOT as "search for empty name".
// This is intentional — the UI sends empty string when the search box is cleared.
function filterByName(items: Item[], name: string): Item[] {
```

```typescript
// CAVEAT: This function mutates the input array in place for performance.
// Callers MUST NOT assume the input array is unchanged.
function sortByPriority(items: Item[]): Item[] {
```

**When to use:** Behavior that looks like a bug but is correct, API quirks, mutation warnings, timing dependencies.

---

## Comment Prefix Convention

Use consistent prefixes so AI agents can quickly scan and prioritize:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `INTENT:` | What this code is supposed to do | `// INTENT: Calculate tax-inclusive price` |
| `CONSTRAINT:` | What this code must not violate | `// CONSTRAINT: MUST validate before save` |
| `DECISION:` | Why this approach was chosen | `// DECISION: Using bcrypt per ADR-003` |
| `CAVEAT:` | Non-obvious behavior to watch for | `// CAVEAT: Empty string = no filter` |
| `SECURITY:` | Security-sensitive implementation detail | `// SECURITY: Token is cleared on logout` |
| `PERFORMANCE:` | Performance-sensitive implementation detail | `// PERFORMANCE: Using memo to avoid re-renders` |
| `RTL:` | Bilingual/RTL-specific behavior | `// RTL: Logical properties used, not left/right` |

---

## Anti-Patterns

| Anti-Pattern | Why It's Dangerous |
|---|---|
| **Restating what the code does** | `// increment counter by 1` adds noise. AI can read code. Comments should add CONTEXT the code cannot express. |
| **No comments on complex logic** | The next AI session has zero context. Without comments explaining intent, it will guess — often wrong. |
| **TODO/FIXME/HACK without tracker reference** | Silent TODOs accumulate invisibly. Use `// TODO(ISSUE-123): description` or throw a descriptive error. |
| **Commenting out code instead of deleting** | Dead code confuses AI. Delete it. Git preserves history. If you need it back, use Git. |
| **Excessive comments on obvious code** | `// set name to empty string` on `name = ""` adds noise. Trust that AI can read obvious code. |
| **Comments that become stale** | Comments that describe behavior but are not updated when behavior changes are worse than no comments — they mislead. |
| **Business rules only in comments, not in code** | If a rule is important enough to comment, it's important enough to enforce in code (validation, types, assertions). |

---

## JSDoc/TSDoc for Public APIs

All public functions, hooks, and components MUST have JSDoc/TSDoc comments that include:

1. **What it does** (one sentence)
2. **Parameters** (name, type, and what it represents — not just the type)
3. **Return value** (what shape, what it means)
4. **Side effects** (API calls, state mutations, localStorage writes)

```typescript
/**
 * Calculate total price including VAT at the country-specific rate.
 * Returns 0 for tax-exempt accounts.
 *
 * @param price - Base price before tax (must be >= 0)
 * @param account - Account object with taxExempt flag and countryCode
 * @returns Total price including VAT, or 0 if account is tax-exempt
 * @throws ValidationError if price is negative
 *
 * Side effects: None
 */
function calculateTotal(price: number, account: Account): number {
```

**When to use:** Every exported function, hook, and component. Every API endpoint handler. Every utility function used by more than one file.

**When NOT to use:** Internal helper functions defined and used within a single file (use INTENT: comments instead).

---

## File-Level Header Pattern

Every file MUST start with a file-level comment that provides context for an AI agent opening the file for the first time:

```typescript
/**
 * Program List Page
 *
 * Displays a paginated, searchable table of academic programs.
 * Supports both LTR (English) and RTL (Arabic) layouts.
 *
 * Key constraints:
 * - Pagination is mandatory (max 20 items per page, per api-design-standards)
 * - All user-facing strings use i18n keys (no hardcoded text)
 * - Delete action requires confirmation dialog (see dialog-patterns.md)
 */
```

**What to include:**
- File purpose (1-2 sentences)
- Key constraints that affect how this file must be modified
- Bilingual/RTL notes if applicable
- Related files or patterns

---

## When to Comment vs. When to Refactor

Comments are not a substitute for clear code. If you need a comment to explain WHAT the code does, the code needs refactoring:

| Situation | Action |
|---|---|
| Code is obvious, no non-obvious constraints | No comment needed |
| Code is obvious, but has non-obvious constraints | Add CONSTRAINT or CAVEAT comment |
| Code is complex, intent is unclear | First, try to simplify. If simplification isn't possible, add INTENT comment |
| Chose approach A over approach B | Add DECISION comment with rationale |
| Business rule that should be enforced in code | Add validation/code enforcement AND a comment |

---

## Key Takeaways

1. Code comments in vibe-coded projects serve the NEXT AI session, not a human reader.
2. Use the ICDC framework: Intent, Constraints, Decisions, Caveats.
3. Use consistent comment prefixes (INTENT:, CONSTRAINT:, DECISION:, CAVEAT:, SECURITY:, PERFORMANCE:, RTL:) for scannability.
4. Public APIs MUST have JSDoc/TSDoc with what, parameters, return value, and side effects.
5. Every file MUST start with a file-level header providing context for an AI agent seeing it for the first time.
6. Never restate what the code does — AI can read code. Comments add CONTEXT that the code itself cannot express.
7. If a comment is needed to explain WHAT, refactor first. Comments explain WHY and WHY NOT.
8. TODO/FIXME comments MUST reference a tracker issue number. Silent TODOs are invisible debt.

---

## Cross-References

- **Extended by:** `documentation-strategy.md` — project-level documentation strategy
- **Companion to:** `ai-collaboration-mindset.md` — the "No Restated-Code Comments" principle
- **Applied by:** `typescript-conventions.md` — TypeScript-specific documentation conventions
- **Companion to:** `context-management-strategy.md` — how AI manages context across sessions