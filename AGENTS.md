# AGENTS.md — Project Constitution

**Purpose:** This file defines the rules for AI agents working on the central guidelines repository. The guidelines repo is the source of truth for all development rules, templates, and skills consumed by downstream projects.

**Guideline source (self):** `D:\WebApps\global-guidelines-for-a-vibe-coder`
**How AI should use this:** Rules in this file apply to changes made TO this repo. The rules this repo exports to other projects live in the `guidelines/` directory — those are served to other repos and ARE NOT defined here.

---

## Repo Identity

This is **not** an application project. It is a centralized development guidelines repository that:
- Houses 65 guideline files in the domain directories (`guidelines/00-*` through `guidelines/08-*`), ~70 including `guidelines/_index/`
- Provides templates for steering files (AGENTS.starter.md, WORLD.starter.md, etc.)
- Ships 23 skills, each a `<name>/SKILL.md` directory, for specialized AI coding workflows
- Includes sync tooling — `sync-manager.ps1` (GUI, repo root), `guidelines/global-configs/scripts/sync-guidelines.ps1` (CLI), `sync-all.js` (batch) and `setup-global-references.ps1` (machine-global tool configs) — to distribute guidelines to downstream projects
- Is consumed by projects via a `_guidelines/` mirror and inline rule extraction

---

## Structure & Conventions (Always Active)

### Directory Naming
- All content lives under `guidelines/` — domain directories `guidelines/00-*` through `guidelines/08-*`
- `guidelines/_index/` — entry points (MASTER_INDEX.md, RETRIEVAL_RULES.md, GLOSSARY.md, AGENT_BOOT_PROTOCOL.md)
- `guidelines/global-configs/` — templates, scripts, skills
- Every guideline file MUST carry YAML front-matter (`status`, `scope`, `tags`) and end with a `## Cross-References` section — `npm run render:index` registers it in `guidelines/_index/MASTER_INDEX.md`

### Subprocess Capture
- Any script that runs a child process MUST use `runSync` from `guidelines/global-configs/scripts/lib/run-sync.js` — NEVER `execSync`, `execFileSync`, or `spawnSync` with piped stdio. Those use libuv's *synchronous pipe* path, which fails with `EBUSY` on Windows hosts where a filesystem filter driver blocks it (async `spawn` and `stdio:'ignore'` still work — the sync pipe read is the only broken part). `runSync` captures output through inherited file handles instead, so it works everywhere and cannot deadlock on a full pipe.

### Index Maintenance
- `guidelines/_index/MASTER_INDEX.md` is GENERATED — NEVER hand-edit inside its `GENERATED` markers. Add or change a file, then run `npm run render:index` (`npm run check-index-drift` fails validate on divergence)
- `guidelines/_index/RETRIEVAL_RULES.md` MUST be updated when loading strategies change
- `guidelines/_index/GLOSSARY.md` MUST be updated when new terminology is introduced

### Template Updates (Single-Source Pipeline)
- Rule text lives in `guidelines/global-configs/fragments/` — one `##` section per file, order and token budget in `fragments/manifest.json`
- `guidelines/global-configs/templates/AGENTS.starter.md` is GENERATED output — NEVER hand-edit it (`npm run check-drift` fails validate if it diverges)
- To change a rule: edit the fragment → `npm run render:starters` → `npm run validate` → commit fragment + template together
- The constitution has a token budget (**4,000 tokens** — `fragments/manifest.json` `maxTokens`, enforced by `npm run check-drift`): a new rule MUST retire, narrow, or demote an existing one — detail not needed every session belongs in a guideline file, not inlined. Quote the manifest, never a remembered figure; `npm run render:starters` prints the current measurement — read it there.
- Other starter templates (WORLD, DEVTOOLS, tool configs) are hand-maintained; when a guideline changes, update the matching one
- Starter templates use `[FILL]` placeholders for project-specific values
- Never remove `[FILL]` placeholders from templates — downstream projects depend on them

### Skill File Standards
- Each skill in `guidelines/global-configs/skills/` is a DIRECTORY containing `SKILL.md` — the Agent Skills standard layout (`<name>/SKILL.md`), which is what a native loader scans for. The front-matter `name` MUST equal the directory name (1–64 chars, lowercase `a-z`/`0-9`/hyphens, no leading/trailing/doubled hyphen) — `npm run audit` fails a mismatch as NON-CONFORMANT
- A skill MUST carry YAML front-matter and a `## Cross-References` footer — `npm run render:index` lists it in `MASTER_INDEX.md`
- `name` and `description` are the standard's two keys, at the top level; the repo's own `status` / `scope` / `tags` / `appliesTo` live under a `metadata:` map. `name` and `description` are REQUIRED, not stylistic: a loader reads `description` to decide when to activate a skill, so a skill without one exists and can never fire. `npm run audit` fails it as an UNLOADABLE SKILL. Write it as a condition ("Activate when …")
- Long excerpts and helper scripts belong beside the skill (`references/`, `scripts/`, `assets/`) and load ON DEMAND — never inline everything a skill might need, because the body is paid for on every activation
- `appliesTo` names the stack a skill assumes. It exists because a global skill pool is offered to every project regardless of stack; a skill that assumes Tailwind contradicts the constitution of an MUI project
- `guidelines/global-configs/skills/INDEX.md` is GENERATED — the trigger inventory, rendered from the skills' own front-matter by `npm run render:skills`. NEVER hand-edit inside its `GENERATED` markers (`npm run check-skills-drift` fails validate on divergence). Adding a skill adds a row with no edit there
- The sync WRITES the standard layout whatever the source shape is: a legacy flat `<name>.skill.md` in a project's `_skills/` is pruned, never delivered beside its replacement directory

---

## Skills (Always Load)

The 23 skills in `guidelines/global-configs/skills/` are **task-activated**: they load only when their
trigger matches, which is why the trigger has to be visible *before* the file is opened.

- **The inventory is `skills/INDEX.md`** — a `Skill → Load when → Applies to` table generated from
  each skill's front-matter. Read it when a task starts, not the whole directory. When a row
  matches, open the skill and follow it. No announcement or activation log is required — the
  work product is the evidence (owner decision `LEAN_OPERATING_MODEL_DECISION_2026-10-27.md`).
- **A skill never outranks `AGENTS.md`.** Where the two disagree, this file wins.
- **Check `Applies to` before the trigger.** A skill written for a stack this project forbids will
  contradict the constitution if followed; `—` means no stack was declared, so verify before use.
- **Delivery:** a project receives the skills at `_skills/` (gitignored, synced) and the same
  generated block under `## Skills` in its own `AGENTS.md`. The delivered tool configs must name
  `AGENTS.md` as the entry point — a config that points at `_guidelines/_index/MASTER_INDEX.md`
  never reaches the inventory that says when to open a skill. `npm run sync:drift` verifies the
  `_skills/` copy against this source — a skill edited here is not the skill a project loads — and
  reports whether the project's inventory names every skill it was delivered.
- **Delivery is three-channel, by scope** (fleet review 2026-10-31): the stack-agnostic skills
  (scope names no technology) are delivered ONCE per machine into the user-level Agent Skills
  directories (`~/.agents/skills`, `~/.claude/skills`, `~/.zcode/skills` — `npm run skills:global`,
  opt-in step of the sync), because they cannot contradict any project's constitution and every
  conformant tool scans those dirs natively. The stack-scoped subset is generated per project into
  its own `.agents/skills` and `.claude/skills` as MARKER-STAMPED adapters of `_skills/` —
  generated stores that follow upstream, never hand-maintained copies that shadow it. Every store
  is marker-scoped (`lib/skill-stores.js`): only names this repo delivers are written or pruned.
  **This repo is the source of truth** (owner decision 2026-10-31): a foreign skill with the SAME
  name is replaced with the source bytes and reported; a foreign skill with a DIFFERENT name — a
  user's own tooling, a project-authored skill — is never touched, and a store is first delivered
  into only by an explicit owner decision (`--adopt` / `adoptForeignStores`).
- **The starter seeds the pointer.** `AGENTS.starter.md` ships a `## Skills` section whose managed
  region holds a POINTER — where the skills live, and that the table lists them — because a
  project that has never been synced has no inventory to show. The first sync replaces that region
  with the live table, so a project ends up with ONE `## Skills` section carrying both the pointer
  and the inventory: never two sections, never a stale pointer. The fragment is
  `global-configs/fragments/65-skills.md`; the region it holds is the same one the injector writes.

---

## Commands (Always Load)

```bash
npm run audit           # Validate extracted rules against source guideline files
npm run check-links     # Check for broken internal links
npm run check-index     # Verify all files have MASTER_INDEX entries
npm run check-drift     # Fail if AGENTS.starter.md was hand-edited or exceeds its token budget
npm run check-index-drift # Fail if MASTER_INDEX.md was hand-edited — regenerate it instead
npm run docs:census     # Fail on a duplicated canonical fact, a per-document archive, or a resurrected doc
npm run render:starters # Regenerate AGENTS.starter.md from global-configs/fragments/
npm run render:index    # Regenerate the MASTER_INDEX tables + graph from front-matter and footers
npm run render:skills   # Regenerate skills/INDEX.md — the trigger inventory, from skill front-matter
npm run check-skills-drift # Fail if skills/INDEX.md was hand-edited — regenerate it instead
npm run plan:skills     # Print which skills belong in which project, and why (no arg = the whole fleet; --apply to write)
npm run status:projects # Report which rules each synced project's AGENTS.md is missing (report-only)
npm run sync:drift      # Fail if a project's _guidelines/ mirror or _skills/ copy is not the current source (content hash, not a date)
npm run sync:stale      # Report-only: how much of the registered fleet the latest central change made stale (runs in validate)
npm run skills:global   # Dry-run the machine-global skill pool — stack-agnostic skills into the user-level Agent Skills dirs (--apply to write)
npm run audit:friction  # Measure the process: boot chain, doc-vs-code churn, mirror drift, skill readiness
npm run benchmark:reform # Measure the lean model: boot cost, rule retention, reach (before ec55a54 → working tree); `benchmark:check` fails on a lost rule, unindexed file or unloadable skill
npm run validate        # Run audit + check-links + check-index + check-drift + check-index-drift + check-skills-drift + guard:paths + docs:census + guard:tiers + guard:mode + sync:stale + benchmark:check + test:scripts (sync:stale is report-only — the fleet-staleness announcement)
```

Before pushing changes to this repo, run `npm run validate` to ensure integrity.

---

## Security (Always Active)

### Secrets Management
NEVER hardcode secrets, tokens, API keys, or credentials in source files, templates, or examples. Environment variables only. The `WORLD.example.md` and any template MUST use placeholders like `[FILL]` for any credential-like values.

### Dependency Audit
Dependencies (npm packages) MUST be audited on every PR. Verify package existence, latest stable version, and known vulnerabilities. AI hallucinates package names and suggests stale versions — training data is inherently outdated. Search the web or npm registry for the current latest stable version before installing any package.

### Input Validation (for sync tooling)
PowerShell scripts that accept user input (project paths, etc.) MUST validate and sanitize inputs. No direct passthrough to `Invoke-Expression`.

---

## Git (Load for All Code Changes)

### Commit After Every Working Increment
Commit after every working increment. Granular commits = cheap rollbacks. NEVER commit broken code "to save progress" — use stash or WIP branches.

### Descriptive Commit Messages
Conventional commit format with type and scope (e.g., `feat(templates): add RTL starter for shadcn`).

### Checkpoint Before Major AI Operations
Always commit a checkpoint before running major AI operations that could modify multiple files. Always have a rollback point.

### No Branch Requirement for New Features
Adding new features or making changes does NOT require creating a new branch or worktree. Work on the current branch. Branches are a team-workflow choice, not an AI mandate.

### Protect Main Branch
Main branch MUST always be validatable (`npm run validate` passes). Use branch protection rules. No force-push to main.

---

## Editing Guidelines (Load for Content Changes)

### Front Matter
Every guideline file in `guidelines/` MUST open with YAML front-matter — `status` (`Normative` | `Advisory` | `Archived`), `scope` (`Global` | `Stack (X)`), and `tags` (inline list). MASTER_INDEX reads these; no other file repeats them.

### One Home Per Fact
- The mandated project doc set is `AGENTS.md` + `WORLD.md` + `README.md` (+ `docs/AI_ARCHITECTURE.md` on demand). A new document in this set MUST retire one.
- `docs/AI_CONTEXT.md` and `ARCHITECTURE_INDEX.md` were deleted as duplicate copies — do NOT recreate them. Onboarding is `README.md`; navigation is links + search.
- A canonical list (trigger table, gate steps, forbidden patterns, version table) lives in exactly one file; every other site names that file and links.
- `npm run docs:census` fails the gate if a canonical fact appears in more than one mandated project doc, or if the set's shape is wrong — one archive per quarter (`docs/changelog/<YYYY>-Q<n>.md`), and no resurrected document.

### Cross-References
Every guideline file MUST end with a `## Cross-References` section — typed bullets (`- **Depends on:** \`x.md\``) or a flat backticked list. Reference files by basename. `npm run render:index` builds the cross-reference graph from this section; a file without one renders as `no cross-references`.

### Language & Tone
Guidelines are authoritative but not aggressive. Use MUST/SHOULD/MAY per RFC 2119. Keep sections scannable with clear headings and short paragraphs.

### No Breaking Changes Without Migration
Renaming or restructuring guideline files MUST update all cross-references and the MASTER_INDEX. **Retire or replace — never leave a superseded copy in place:** when a rule is replaced, remove the old text in the same commit. "Deprecate in place" is a second copy that still loads; the one-way ratchet is what grew this repo's doc set. Immutable records (ADRs, dated reports, changelogs) are the exception — those are never deleted.

---

## AI Collaboration (Load for Every Session)

### AI Output is Draft, Not Final
First AI output is ALWAYS a draft. Iterate at least once. Accepting first output without review is an anti-pattern.

### Reference Existing Files
Use existing guideline files as patterns when conventions are not obvious. Load only what the task needs; no fixed file count is required.

### Fresh Session Per Feature
Use a fresh AI session per guideline area. 100-message threads produce inconsistent output.

### No Silent TODOs
NEVER generate TODO, FIXME, HACK, or placeholder comments in production files without explicit permission. State gaps in the AI response instead.

### Web Search Escalation
If you fail to solve a problem after 2 attempts, STOP guessing. Search the web before making a 3rd attempt.

---

## Forbidden Patterns

- No `[FILL]` placeholders in guideline files — only in starter templates
- No hand-edits to `guidelines/global-configs/templates/AGENTS.starter.md` — it is generated from `global-configs/fragments/`
- No hardcoded absolute paths in templates — use relative paths or `[FILL]` markers
- No breaking changes to templates without updating the hardcoded fallback in `sync-manager.ps1` (used when `sync-manifest.json` is unreadable)
- No `console.log` in production application code — repo tooling writes its report to stdout by design
- No `execSync` / `execFileSync` / piped `spawnSync` in scripts — use `runSync` from `global-configs/scripts/lib/run-sync.js`
- No unregistered files — every guideline file MUST be in `guidelines/_index/MASTER_INDEX.md`
- No `// TODO` or `// FIXME` without explicit permission
- No rule, template, or skill may require a human code or security reviewer. The single governance gate is a **MAJOR** change to `AGENTS.md`, which requires an explicit recorded owner decision — not a code review (see §Maintenance)

---

## Session Bootstrap

1. Read this AGENTS.md and `WORLD.md` — always (rules + intent/`mode`)
2. Understand the repo structure: `guidelines/_index/` → `guidelines/0*-` domain directories → `guidelines/global-configs/`
3. Before editing: identify which category the change falls under (guideline content, template, script, skill)
4. After editing: run `npm run validate` to verify integrity
5. Commit with conventional commit format

---

## Maintenance

- **Quarterly:** Audit skills and templates against source guidelines
- **When adding a file:** Add front-matter + a `## Cross-References` footer, run `npm run render:index`, check RETRIEVAL_RULES.md
- **When updating a guideline:** Also update the matching fragment in `global-configs/fragments/`, then `npm run render:starters`
- **Who may change this file.** AI MAY freely make incremental changes — add a rule, narrow a rule, fix wording, retire a superseded rule. A **MAJOR** change requires an explicit, recorded owner decision: removing or editing a global baseline rule, changing the Security section, or altering the authority hierarchy. This is a governance decision, not a code review — the owner does not read the diff. Nothing else in this repo needs a human reviewer.

---

## Cross-References

- Index & retrieval: `guidelines/_index/MASTER_INDEX.md`, `guidelines/_index/RETRIEVAL_RULES.md`
- Templates: `guidelines/global-configs/templates/` (AGENTS.starter.md is generated — edit `guidelines/global-configs/fragments/`)
- Fragments pipeline: `guidelines/global-configs/fragments/README.md`
- Skills: `guidelines/global-configs/skills/`
- Sync tooling: repo-root `sync-manager.ps1` (GUI) + `guidelines/global-configs/scripts/` (`sync-guidelines.ps1`, `sync-all.js`, `GuidelineSync.psm1`, `setup-global-references.ps1`)
