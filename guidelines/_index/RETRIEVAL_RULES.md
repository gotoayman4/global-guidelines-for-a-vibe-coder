---
status: "Normative"
scope: "Global (AI Agent Configuration)"
tags: [retrieval, loading, tokens, strategy]
---

# Retrieval Rules — AI Loading Strategy

---

## Purpose

Define how AI coding assistants should discover, prioritize, and load guideline documents to minimize token waste while maximizing guidance quality.

---

## Core Principles

1. **Load only what the task requires.** Never load the entire knowledge base.
2. **Use `MASTER_INDEX.md` as the map, not the required first read.** The project's `AGENTS.md` is the always-loaded floor; open the index only to discover files the task needs.
3. **Match by tags, not by guessing.** Use the tag system to find relevant guidelines.
4. **Load primary before secondary.** The index recommends candidates; select only those needed for the task.
5. **Prefer compact extracts when context is tight.** Use the rule-extraction pattern to derive compact versions.
6. **Follow dependencies only to resolve a task-relevant gap.** A cross-reference is not a mandatory reading list; do not recursively load the graph.

## Loading Paths (Priority Order)

Resolve the files the task needs through these sources:

1. **Project `AGENTS.md`** — always loaded first, together with `WORLD.md` (intent + `mode`). Read `README.md` for orientation when the project is new to you; load `docs/AI_ARCHITECTURE.md` only for relevant subsystem detail.
2. **`_guidelines/` mirror** — open a known guideline directly. Use `_guidelines/_index/MASTER_INDEX.md` only when you cannot name the file you need; read the matching rows, not the whole index.
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
| "Auto-update", "auto updater", "Electron release", "latest.yml", "update feed", "code signing" | Electron auto-update | `#electron` `#auto-update` `#release` |
| "CI quota", "Actions minutes", "run CI locally", "free CI", "pre-push gate", "husky" | Local CI | `#local-ci` `#ci-cd` `#cost` |
| "Review this code", "Code review" | Code review | `#review` `#security` |
| "Update docs", "Stale docs", "Steering", "AI context" | Docs / steering update | `#documentation` `#strategy` `#maintenance` |
| "Refactor", "Clean up", "Improve structure" | Refactoring | `#refactoring` `#performance` |
| "RTL", "Arabic", "Bidirectional", "i18n", "Numerals" | RTL/Arabic/i18n | `#rtl` `#i18n` `#a11y` `#arabic` |
| "Arabic PDF", "RTL PDF", "PDF export", "print to PDF", "Electron PDF", "invoice PDF Arabic" | Arabic PDF generation | `#pdf` `#rtl` `#arabic` `#electron` `#print` |
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

### Step 2: Select Task Files

Open the known files directly. If their names are unclear, use search or the matching "Task-Type → Recommended Files" rows in `MASTER_INDEX.md` to select candidates.

### Step 3: Resolve Relevant Dependencies

Read the selected file first. Follow a dependency only when its contract or rule is needed to answer the task; stop when that gap is resolved. Do not traverse all cross-references before editing.

### Step 4: Apply the Read Budget

The declared mode's cap applies to the mandatory boot chain (`speed-tiered-workflow.md` §The Context Budget). Task-specific files are on-demand reading, not another mandatory chain; keep them focused and prefer compact extracts when context is tight.

### Step 5: Progressive Disclosure

If unsure about task scope:
1. Open `MASTER_INDEX.md` only if you cannot name the file you need — it is a navigation index, not guidance, and its size grows with the repo
2. Load the top 1-2 primary files
3. If more detail needed, load dependencies and secondary files
4. If context runs low, switch to compact extracts

---

## Loading Anti-Patterns

| Anti-Pattern | Why It's Wrong |
|---|---|
| Loading all guidelines for every task | Wastes 15K+ tokens on irrelevant content |
| Guessing a file name instead of searching when you cannot name one | A wrong guess loads a stale or unrelated file; use search or the index's matching rows |
| Loading only stack-specific files | May miss universal engineering patterns that apply |
| Loading full versions when context is tight | Compact extracts exist for this exact reason |
| Treating `MASTER_INDEX.md` as required reading | It is a map, not guidance; a self-contained `AGENTS.md` may already answer the task — open the index only to discover files |

---

## Special Retrieval Paths

### Beginner Mode (Non-Coder)
After the project steering files, load `beginner-vibe-coder-guide.md` when onboarding a new coder. Expand to `development-workflow.md` or `cost-optimization-strategy.md` only as needed; no additional index read is required.

### Multi-Tool Mode
After the project steering files, load `multi-tool-workflows.md` for multi-tool setup and the relevant tool configs. Load `ai-agent-orchestration.md` only when the task involves agent coordination; use the index only for an unresolved file lookup.

---

## Compact Extract Format

When context is tight, use this rule-extraction pattern to derive compact versions:

1. Take the full guideline
2. Extract only: the file's **Key Takeaways** (or its numbered core principles, where that is the heading) + **Anti-Patterns** (table)
3. Skip: Purpose, Detailed Guidance, Decision Framework, Examples, Cross-References
4. Target: 200-500 tokens per file

Full methodology in: `../../docs/repo-meta/rule-extraction-methodology.md`

---

## Cross-References

- **Depends on:** `MASTER_INDEX.md` (a lookup, not a required read)
- **Referenced by:** AI agent configuration files, IDE instruction files
- **See also:** `../08-governance/ai-governance-framework.md`
