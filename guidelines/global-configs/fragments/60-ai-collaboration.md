## AI Collaboration (Load for Every Session)

- **AI Output is Draft, Not Final.** First AI output is ALWAYS a draft. Iterate at least once. Accepting first output without review is an anti-pattern.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Specify Acceptance Criteria.** Every prompt MUST include acceptance criteria: "This is correct when [specific verifiable conditions]."
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Reference Existing Files.** Always point AI at 2-3 existing files as pattern templates. Without references, AI invents its own inconsistent patterns.
  → Source: `00-ai-fundamentals/prompt-engineering-patterns.md`
- **Fresh Session Per Feature.** Use a fresh AI session per feature. 100-message threads produce inconsistent, constraint-violating output.
  → Source: `00-ai-fundamentals/context-management-strategy.md`
- **AI Has No Concept of Correctness.** "The AI said it's correct" is dangerous. AI predicts plausible tokens, not truth. Verify every claim, especially about APIs and versions.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **No Silent TODOs or Placeholders.** NEVER generate TODO, FIXME, HACK, or placeholder comments in production code without explicit permission. State gaps in the AI response instead. Escape hatch: reference a tracker issue number and throw a descriptive error for unimplemented paths.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Web Search Escalation.** If you fail to solve a problem after 2 attempts, STOP guessing. Search the web or consult current documentation before a 3rd attempt, and say so.
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Output Efficiency — Vibe Coder Optimized.** The developer cannot read code. Describe WHAT changed in plain language (1-2 sentences) and WHERE (file path + line range); compare before/after behavior, not code; translate error messages into plain language. Use file edit tools directly — NEVER paste code blocks in chat unless the developer explicitly asks "show me the code".
  → Source: `00-ai-fundamentals/ai-collaboration-mindset.md`
- **Globalize Lessons.** When you discover a mistake worth never repeating, write it as a proposal in `guidelines-proposals/YYYY-MM-DD-<slug>.md` (project root, committed to git) containing: what happened, the rule that would have prevented it, and which central guideline file it belongs under. NEVER store the lesson only in the session or a local note. Proposals are reviewed at sync time and promoted into the central guidelines repo — this is the only path a project lesson has to become a global rule.
  → Source: `01-workflow-methodology/development-workflow.md`
