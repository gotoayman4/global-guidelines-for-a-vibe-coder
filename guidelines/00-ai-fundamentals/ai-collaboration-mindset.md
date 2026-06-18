# AI Collaboration Mindset — The Vibe Coder's Foundation

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,800 tokens)
**Last Updated:** 2026-05-26
**Cross-References:** `prompt-engineering-patterns.md`, `context-management-strategy.md`

---

## Purpose

Establish the fundamental mental models, principles, and anti-patterns for effective AI-assisted software development. This is the philosophical foundation that all other guidelines build upon.

---

## Core Principles

### 1. The Golden Rule: AI Is a Junior Engineer, You Are the Senior

The AI assistant has infinite speed and nearly zero judgment. It will confidently produce plausible-looking code that is subtly wrong. You are the senior engineer: you own every architectural decision, every acceptance criterion, and every line that ships. **Never delegate judgment — only execution.**

### 2. Own the Specification

The single most important factor in vibe coding success is specification quality. Vague prompts produce vague code. Precise, constrained prompts produce useful code. Invest disproportionately in writing clear requirements before generating anything.

**Specification checklist:**
- What should the code do? (happy path)
- What should it NOT do? (boundaries)
- What are the constraints? (tech stack, patterns, performance)
- What does "done" look like? (acceptance criteria)
- What would failure look like? (error states)

### 3. Build in Vertical Slices, Not Horizontal Layers

Never build "all the models, then all the services, then all the UI." Build one complete feature from UI to database, verify it works end-to-end, then move to the next. This exposes integration problems immediately, gives you working software at every step, and prevents the "90% done, nothing works" trap.

### 4. Tests Are Behavioral Contracts, Not Implementation Verification

Tests should describe WHAT the system does — the contract between inputs and outputs. They should NOT describe HOW the system does it. Implementation-detail tests break on every refactor and create false confidence. Behavioral tests survive refactoring and catch real regressions.

### 5. Treat AI Output as First Drafts, Not Final Code

Every piece of AI-generated code should be treated as a draft that requires review, testing, and refinement. The AI gets syntax right ~95% of the time but business logic right ~60% of the time. The gap is your responsibility.

### 6. Control Context Aggressively

Context is the scarcest resource in AI collaboration. Every token in the context window competes with every other token for the model's attention. Be ruthless about what you include. Prefer concise, structured input over verbose explanations. Use modular guideline loading instead of dumping everything.

### 7. Limit Blast Radius

Work in small, isolated changes. Commit frequently. Use feature flags. Never let the AI modify more than 3-5 files in a single change without review. The larger the change, the harder it is to identify what went wrong.

### 8. Use AI to Reason, Not Just Generate

The AI's greatest strength is not code generation — it's reasoning about code. Ask it to: explain why something works, identify edge cases you missed, suggest alternative approaches with trade-offs, review your design for flaws. Use AI as a thinking partner, not just a typing machine.

### 9. Calibrate Your Prompts Iteratively

Your first prompt will almost never produce ideal output. Treat prompting as a conversation: start broad, observe the output, refine your constraints, and iterate. The quality of your final output is directly proportional to the quality of your iteration loop.

### 10. Know When to Drop Out of AI Mode

Not everything benefits from AI assistance. Simple boilerplate, well-understood patterns, and trivial changes are often faster to write manually than to prompt, review, and fix. Use AI for: exploration, complex logic, unfamiliar domains, repetitive patterns, and code review. Write manually when the overhead of AI collaboration exceeds the benefit.

---

## Core Risks in Vibe Coding

### Risk 1: Silent Regression

AI-generated code passes all existing tests but breaks undocumented behavioral expectations. The system appears to work but has introduced subtle bugs in edge cases.

**Mitigation:** Write tests BEFORE generating code. Tests define the contract. AI fills the implementation. If the AI's code passes your tests, you have confidence. If it doesn't, you have a concrete feedback loop.

### Risk 2: Architectural Entropy

Each AI-generated change is locally optimal but globally incoherent. Over time, the codebase drifts toward inconsistent patterns, duplicated logic, and tangled dependencies.

**Mitigation:** Maintain architecture decision records (ADRs). Review AI output for architectural fit, not just functional correctness. Refactor proactively. Use global guidelines to enforce consistency.

### Risk 3: False Confidence

AI-generated code compiles, looks professional, and passes basic smoke tests. The developer assumes it's correct and ships it. The bug surfaces in production.

**Mitigation:** Never trust AI output without verification. Test edge cases explicitly. Review all generated code line by line. The AI's confidence is not correlated with its correctness.

### Risk 4: Silent Placeholder Generation (Silent TODOs)

AI assistants frequently insert placeholder comments (`// TODO`, `// FIXME`, `// HACK`) and stub implementations into production code without informing the developer. The code compiles and appears complete at a glance but contains unimplemented paths. This creates a hidden inventory of incompleteness — neither the AI nor the developer tracks these placeholders, and since each AI session has context amnesia, they accumulate invisibly until they become production failures months later.

**Mitigation:** Prohibit TODO generation in project rules. Use `eslint no-warning-comments: ["error"]` or pre-commit hooks to detect violations at the automation layer. When a gap genuinely exists during active development, reference an assigned tracker issue number and throw a descriptive error for unimplemented paths — converting invisible debt into visible, tracked work.

### Risk 5: Cross-File Code Duplication

AI treats each file as an independent generation task. It produces the same validation, mapping, or transformation logic across multiple files because it doesn't check whether the logic already exists elsewhere. This creates silent forks — when one copy is updated for a bug fix, the others remain broken.

**Mitigation:** AI MUST proactively search the codebase for existing implementations of any mapping, validation, or transformation logic before writing new ones. When the same logic appears in 2+ files, extract to a shared utility immediately. Do not defer deduplication to a refactoring pass — context amnesia means it will be forgotten. Use the directives in `code-duplication-prevention.md`.

### Risk 6: AI-Generated Code Smells (Unaware of Existing Patterns)

AI invents its own patterns when it doesn't see existing ones. Without explicit reference files, AI produces code that is locally correct but globally inconsistent: different import styles, different error handling patterns, different API call conventions. Over time this creates an unmaintainable patchwork.

**Mitigation:** Always point AI at 2-3 existing files as pattern templates before generating new code. Use the "Reference Existing Files" directive. When AI introduces a new pattern that conflicts with existing conventions, flag it immediately — don't accept it as a "different approach."

---

## Mental Model: AI as Orchestrator vs. AI as Tool

There are two valid paradigms — choose consciously:

| Paradigm | How It Works | Best For |
|---|---|---|
| **AI as Tool** | You write prompts, AI generates code, you review and integrate. Linear, sequential. | Small tasks, bug fixes, refactoring, learning |
| **AI as Orchestrator** | You define goals, AI plans and delegates to sub-agents, you review at gates. Parallel, multi-agent. | Large features, complex systems, multi-file changes |

Beginners should start with AI-as-Tool. Advanced practitioners can adopt AI-as-Orchestrator when they've mastered specification, testing, and review skills. The orchestrator paradigm fails catastrophically without strong specification hygiene.

---

## Decision Framework: When to Use AI vs. Write Manually

| Scenario | Use AI? | Why |
|---|---|---|
| Exploring unfamiliar technology | ✅ Yes | AI accelerates learning and provides working examples |
| Generating boilerplate/scaffolding | ✅ Yes | High success rate, low risk, huge time savings |
| Complex business logic | ⚠️ With caution | AI often misses domain-specific rules; write tests first |
| Simple, well-known patterns | ❌ Manual | Faster to write than to prompt, review, and fix |
| Security-critical code | ❌ Manual | AI has no security judgment; review every line if AI-assisted |
| Performance-critical code | ⚠️ With tests | AI can generate then you profile and optimize |
| Refactoring large codebases | ✅ With tests | AI excels at mechanical transformations when tests exist |
| Debugging | ✅ Yes | AI is excellent at pattern matching error traces to root causes |

---

## Anti-Patterns

| Anti-Pattern | Why It's Dangerous |
|---|---|
| **"The AI said it's correct"** | AI has no concept of correctness — it predicts plausible tokens, not truth |
| **Prompting without constraints** | Unconstrained prompts produce bloated, inconsistent, or wrong output |
| **Accepting code without testing** | Every line of AI-generated code is unverified until proven otherwise |
| **Multi-file changes without review** | Large diffs hide bugs; small, reviewable changes are safer |
| **"It compiled, so it works"** | Compilation proves syntax, not logic, not edge cases, not security |
| **Skipping architecture planning** | AI will happily build the wrong thing very quickly if you don't define "right" |
| **Over-relying on a single AI model** | Different models have different strengths; cross-validate critical decisions |
| **Treating AI as a search engine** | AI hallucinates facts; verify all claims, especially about APIs and versions |
| **Trusting AI-suggested package versions** | Training data is stale; AI-suggested versions are often months/years behind latest stable — potentially installing vulnerable code |
| **Silent TODO/placeholder generation** | AI inserts `// TODO:` in code without informing you; placeholders are never tracked, never resolved, and ship incomplete |

---

---

## Honesty Directives — Anti-Sycophancy

These directives prevent AI from being overly agreeable to the user's detriment:

1. **Refuse to Validate Without Evidence** — Never say "this looks good" or "this is correct" without running tests or verifying against a specification. If no spec exists, ask for one or refuse to validate.

2. **Resist Manufactured Urgency** — When the user invokes urgency ("just ship it", "we need this now"), name the trade-off exactly once ("If we ship without X, here is what may break"), then comply. Do not repeat the warning. Do not apologize.

3. **Acknowledge Uncertainty Explicitly** — If you do not know something, say "I do not know" or "I would need to verify X". Do not invent a plausible-sounding answer.

4. **Match Verification to Risk** — Trivial changes get a syntax check. Logic changes get a manual trace. Concurrency or state changes get a written-out scenario. Skipping verification proportional to risk is a failure mode.

5. **No Restated-Code Comments** — Never write comments that paraphrase what the code does. Comments should explain WHY only when the WHY is non-obvious.

6. **Surface Hidden Trade-Offs** — When generating code with architectural implications (introducing a dependency, choosing an async pattern, picking a data structure), name the trade-off in the response. Do not bury it.

---

## Key Takeaways

1. You are the engineer. The AI is your tool — fast, knowledgeable, but with zero judgment.
2. Specification quality is the single biggest lever for output quality.
3. Tests are not optional — they are the safety net that makes AI collaboration viable.
4. Small, reviewed, tested changes beat large, unreviewed ones every time.
5. Iterate: prompt → review → refine → repeat. First attempts are drafts.

---

## Cross-References

- **Extended by:** `prompt-engineering-patterns.md` — specific prompting techniques
- **Extended by:** `context-management-strategy.md` — token and context optimization
- **Extended by:** `ai-agent-orchestration.md` — multi-agent workflow patterns
- **Extended by:** `ai-security-governance.md` — security-specific AI risks
- **Extended by:** `../02-engineering-practices/code-duplication-prevention.md` — cross-file duplication detection and remediation
- **Depends on:** None (foundational document)
