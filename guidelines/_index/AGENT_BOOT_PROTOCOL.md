# Agent Boot Protocol

**Purpose:** Standard session-initialization procedure for AI agents. Read this at the start of every session to determine how to load guidelines.

**Status:** Normative
**Scope:** Global
**Last Updated:** 2026-09-22

---

## Boot Sequence

### Step 0: Determine Context Budget

Estimate available token budget before loading anything:
- **High** (>50K): load full files
- **Medium** (20-50K): load full primary, skip secondary
- **Low** (10-20K): load compact extracts only
- **Critical** (<10K): load only MASTER_INDEX.md + 1-2 primary files

### Step 1: Load Project Steering Files

Check the project root in this order. Stop at the first one found — it contains all mandatory rules:

1. `AGENTS.md` — universal project constitution
2. `CLAUDE.md` — Claude Code-specific rules
3. `WORLD.md` — product intent guardrails (also declares the project's speed mode: `vibe | standard | guarded`)

If `WORLD.md` declares a mode, scope plan/test/docs ceremony to `01-workflow-methodology/speed-tiered-workflow.md`. When WORLD.md is silent, assume `standard`. Security, honesty, and ship-boundary rules apply in every mode.

### Step 2: Load _guidelines/ Mirror (if present)

If the project has a `_guidelines/` directory (created by `sync-guidelines.ps1`):

1. Read `_guidelines/_index/MASTER_INDEX.md` to discover relevant files
2. Use relative paths starting with `_guidelines/` — these are guaranteed accessible
3. Load files per the task-type table in MASTER_INDEX.md
4. If context is tight, use compact extracts (Core Principles + Anti-Patterns only)

### Step 3: Fall Back to Global Configs

If no project steering file and no `_guidelines/` mirror:

1. Read global tool config:
   - opencode: `~/.config/opencode/AGENTS.md`
   - Windsurf: `~/.codeium/windsurf/memories/global_rules.md`
   - Cursor: `~/.cursor/rules/global-guidelines-from-central.mdc`
2. Read `_index/MASTER_INDEX.md` from the central repo path in the global config
3. Load guideline files using absolute paths from global config

### Step 4: Load Task-Specific Guidelines

Using the task-type table in MASTER_INDEX.md:

1. Identify task type from user's request keywords (see RETRIEVAL_RULES.md)
2. Load Primary files first, then Secondary files
3. Resolve dependencies — load a file's dependencies before the file itself
4. Use compact extracts when context is Medium or lower

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

- Do NOT load the entire knowledge base at session start
- Do NOT skip MASTER_INDEX.md — you don't know what you don't know
- Do NOT guess file names — consult the index
- Do NOT load full files when context is tight — use compact extracts
- **Who May Change What in AGENTS.md.** AI MAY freely ADD project-specific rules and mandates. REMOVING or EDITING an existing **global/baseline** rule requires explicit human approval. Adding rules never does — gate only removals/edits of global rules.

---

## Cross-References

- **Depends on:** `MASTER_INDEX.md`, `RETRIEVAL_RULES.md`
- **Referenced by:** global tool configs, project steering files
- **See also:** `08-governance/ai-governance-framework.md`
