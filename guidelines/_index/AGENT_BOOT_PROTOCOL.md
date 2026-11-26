---
status: "Normative"
scope: "Global"
tags: [boot, session, initialization, protocol]
---

# Agent Boot Protocol

**Purpose:** What a session reads before the first edit, and in what order. The boot chain is deliberately short — everything else is loaded per task.

---

## Boot Sequence

### Step 1: Load the Project's Steering Files

From the project root:

1. `AGENTS.md` — the constitution: binding rules inline (stack table, commands, forbidden patterns). Read this first.
2. `WORLD.md` — product intent and the declared speed mode (`vibe | standard | guarded`); undeclared means `standard`.
3. `README.md` — orientation when the project is new to you: what it is, its structure, the quick start. It holds no rules.

`AGENTS.md` is authoritative. Tool pointers (`.github/copilot-instructions.md` for Copilot, `qoder-global-guidelines.md` for Qoder), if present, redirect to `AGENTS.md` and never restate rules. Subsystem and API detail lives in `docs/AI_ARCHITECTURE.md`, loaded on demand — never at boot.

### Step 2: Name the Files This Task Needs

Pick the 2–4 files the task actually requires, inside the mode's read budget (`speed-tiered-workflow.md` §The Context Budget). The `_guidelines/` mirror is a menu, not a checklist.

- Scan the `## Skills` inventory in `AGENTS.md`; open a skill only when its trigger matches the task.
- Use `_guidelines/_index/MASTER_INDEX.md` **as a lookup when you cannot name the file you need** — not as a required read, and never end to end.
- UI work also loads `_guidelines/02-engineering-practices/bidirectional-design-principles.md`.
- Prefer the file's core sections over the whole file when context is tight.

### Step 3: Fall Back When There Is No Mirror

With no project steering file and no `_guidelines/` mirror:

1. Read the machine's global skill pool or Qoder skill directory (`~/.agents/skills/`, `~/.zcode/skills/`, `~/.qoder/skills/`) or the central repo's `_index/MASTER_INDEX.md`.
2. Use the central repo path named there to find guidelines by absolute path — last resort, because agents may not read outside the project.

---

## Priority Rules

| Priority | Source | Behavior |
|---|---|---|
| 1 (highest) | Project AGENTS.md / CLAUDE.md | Overrides all lower sources |
| 2 | Project _guidelines/ mirror | Applies when project has mirrored guidelines |
| 3 | Global tool configs | Applies when no project-specific config exists |
| 4 (lowest) | Central repo absolute path | Last resort — agents may fail to read outside project |

---

## Anti-Patterns

- Do NOT load the knowledge base at session start — read `AGENTS.md` and `WORLD.md`, with `README.md` for initial orientation.
- Do NOT read `MASTER_INDEX.md` as a ritual; open it only to find a file the task needs.
- Do NOT guess file names when the index can name them.
- **Who May Change What in AGENTS.md.** AI MAY freely ADD, narrow, or retire project-specific rules. The ONE governance gate: a **MAJOR** change to AGENTS.md — removing or editing an existing **global/baseline** rule, or changing the security section — requires an explicit, recorded owner decision. This is a governance choice, not a code review; no human reviewer is required. Adding or narrowing rules never triggers the gate.

---

## Cross-References

- **Depends on:** `MASTER_INDEX.md`, `RETRIEVAL_RULES.md`
- **Referenced by:** global tool configs, project steering files
- **See also:** `08-governance/ai-governance-framework.md`
