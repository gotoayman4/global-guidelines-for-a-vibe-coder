# Retrieval Rules — AI Loading Strategy

**Status:** Normative
**Scope:** Global (AI Agent Configuration)
**Token Tier:** Compact (~600 tokens)
**Last Updated:** 2026-09-22

---

## Purpose

Define how AI coding assistants should discover, prioritize, and load guideline documents to minimize token waste while maximizing guidance quality.

---

## Core Principles

1. **Load only what the task requires.** Never load the entire knowledge base.
2. **Start with MASTER_INDEX.md.** Always read it first to understand what's available.
3. **Match by tags, not by guessing.** Use the tag system to find relevant guidelines.
4. **Load primary before secondary.** Primary files are mandatory for the task; secondary are supporting.
5. **Prefer compact extracts when context is tight.** Use the rule-extraction pattern to derive compact versions.
6. **Traverse dependencies intelligently.** If file A depends on file B, load B first.

## Loading Paths (Priority Order)

Load guidelines in this order:

1. **Project AGENTS.md** — self-contained, all rules inline. Always loaded first.
2. **`_guidelines/_index/MASTER_INDEX.md`** — if the project has a `_guidelines/` mirror (created by `sync-guidelines.ps1`). Use relative paths starting with `_guidelines/` to load files — these are guaranteed to be accessible since they're inside the project.
3. **Global tool configs** — `~/.config/opencode/AGENTS.md` (opencode), `~/.codeium/windsurf/memories/global_rules.md` (Windsurf), `~/.cursor/rules/*.mdc` (Cursor). These load automatically per tool and provide fallback guidelines.
4. **Absolute path** — the central repo path from the machine's global agent config — last resort. Agents may fail to read files outside the project.

---

## Retrieval Algorithm

### Step 1: Parse the User's Task

Extract keywords from the user's request to identify task type:

| User Says | Task Type | Primary Tags |
|---|---|---|
| "Add a feature", "Build a page", "Create a component" | Feature development | `#workflow` `#react` or `#backend` |
| "Fix a bug", "Debug", "Not working", "Error" | Bug fixing | `#debugging` `#error` |
| "Write tests", "Add tests", "Test coverage" | Testing | `#testing` |
| "Plan", "Architecture", "Design the system" | Planning | `#planning` `#architecture` |
| "Deploy", "CI/CD", "Pipeline" | CI/CD | `#ci-cd` `#git` |
| "CI quota", "Actions minutes", "run CI locally", "free CI", "pre-push gate", "husky" | Local CI | `#local-ci` `#ci-cd` `#cost` |
| "Review this code", "Code review" | Code review | `#review` `#security` |
| "Update docs", "Stale docs", "Steering", "AI context" | Docs / steering update | `#documentation` `#strategy` `#maintenance` |
| "Refactor", "Clean up", "Improve structure" | Refactoring | `#refactoring` `#performance` |
| "RTL", "Arabic", "Bidirectional", "i18n", "Numerals" | RTL/Arabic/i18n | `#rtl` `#i18n` `#a11y` `#arabic` |
| "Slow", "Performance", "Optimize" | Performance | `#performance` |
| "Secure", "Security audit", "XSS", "Auth" | Security | `#security` `#auth` |
| "Cost", "Cheap", "Free tier", "Token usage" | Cost optimization | `#cost` `#tokens` |
| "Firestore cost", "read budget", "write quota", "reduce Firestore bills" | Firestore cost optimization | `#firestore` `#cost` `#quota` |
| "Firebase", "Firestore", "security rules", "emulator", "Cloud Functions trigger" | Firebase/Firestore development | `#firebase` `#firestore` `#rules` |
| "shadcn RTL", "Tailwind RTL", "shadcn/ui Arabic", "setup Arabic app" | RTL/shadcn setup | `#shadcn` `#rtl` `#setup` `#arabic` |
| "Arabic typography", "Arabic font", "logical CSS", "logical properties" | RTL typography | `#rtl` `#arabic` `#logical-properties` `#tailwind` |
| "UX review", "usability", "heuristics", "interaction design", "Nielsen" | UX/Interaction design | `#ux` `#heuristics` `#cognition` |
| "Visual design", "color palette", "typography", "spacing", "hierarchy", "contrast" | Visual design | `#visual` `#hierarchy` `#color` `#typography` |
| "Design system", "shared components", "consistency", "component library", "tokens" | Design system governance | `#design-system` `#tokens` `#components` |
| "Form UX", "form usability", "error prevention", "user control" | Form/UX patterns | `#ux` `#heuristics` `#forms` |
| "Beginner", "No coding experience", "Start here" | Beginner/onboarding | `#beginner` `#noncoder` |
| "Multiple tools", "Cursor + Copilot", "Claude Code" | Multi-tool setup | `#multi-tool` `#cursor` |
| "Speed mode", "vibe mode", "guarded", "scale ceremony", "milestone ship" | Speed mode / ceremony | `#speed` `#modes` `#workflow` |

### Step 2: Look Up Task in MASTER_INDEX.md

Navigate to the "Task-Type → Recommended Files" table in MASTER_INDEX.md. Find the matching task type and note the Primary and Secondary files.

### Step 3: Resolve Dependencies

For each primary file, check the "Cross-Reference Graph" section of MASTER_INDEX.md. Load all dependencies first, then the primary files.

### Step 4: Apply Token Budget

| Context Budget | Strategy |
|---|---|
| **High** (>50K tokens available) | Load all primary + secondary files (full versions) |
| **Medium** (20-50K tokens) | Load all primary files (full), skip secondary |
| **Low** (10-20K tokens) | Load primary files (compact extracts only) |
| **Critical** (<10K tokens) | Load only the most critical 1-2 files (compact) |

### Step 5: Progressive Disclosure

If unsure about task scope:
1. Load MASTER_INDEX.md (~500 tokens) — always
2. Load the top 1-2 primary files
3. If more detail needed, load dependencies and secondary files
4. If context runs low, switch to compact extracts

---

## Loading Anti-Patterns

| Anti-Pattern | Why It's Wrong |
|---|---|
| Loading all guidelines for every task | Wastes 15K+ tokens on irrelevant content |
| Guessing file names without consulting index | May load wrong version or miss critical dependencies |
| Loading only stack-specific files | May miss universal engineering patterns that apply |
| Loading full versions when context is tight | Compact extracts exist for this exact reason |
| Skipping MASTER_INDEX.md | You don't know what you don't know |

---

## Special Retrieval Paths

### Beginner Mode (Non-Coder)
When the user has zero coding experience:
1. Load `beginner-vibe-coder-guide.md` (~1,400 tokens)
2. Load `MASTER_INDEX.md` (~500 tokens)
3. Load `WORLD.md` (project-specific product intent)
4. Expand to `development-workflow.md` and `cost-optimization-strategy.md` as needed

### Multi-Tool Mode
When the project uses multiple AI tools simultaneously:
1. Load `multi-tool-workflows.md` (~1,800 tokens)
2. Load `MASTER_INDEX.md` for tool-specific guideline lookups
3. Load `ai-agent-orchestration.md` for parallel agent patterns
4. Load project's AGENTS.md, CLAUDE.md, and tool-specific configs

---

## Compact Extract Format

When context is tight, use this rule-extraction pattern to derive compact versions:

1. Take the full guideline
2. Extract only: **Core Principles** (numbered list) + **Anti-Patterns** (table)
3. Skip: Purpose, Detailed Guidance, Decision Framework, Examples, Cross-References
4. Target: 200-500 tokens per file

Full methodology in: `../../docs/repo-meta/rule-extraction-methodology.md`

---

## Cross-References

- **Depends on:** `MASTER_INDEX.md` (always loaded first)
- **Referenced by:** AI agent configuration files, IDE instruction files
- **See also:** `../08-governance/ai-governance-framework.md`
