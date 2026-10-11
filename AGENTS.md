# AGENTS.md — Project Constitution

**Purpose:** This file defines the rules for AI agents working on the central guidelines repository. The guidelines repo is the source of truth for all development rules, templates, and skills consumed by downstream projects.

**Guideline source (self):** `D:\WebApps\global-guidelines-for-a-vibe-coder`
**How AI should use this:** Rules in this file apply to changes made TO this repo. The rules this repo exports to other projects live in the `guidelines/` directory — those are served to other repos and ARE NOT defined here.

---

## Repo Identity

This is **not** an application project. It is a centralized development guidelines repository that:
- Houses ~80 guideline files organized into domain directories (`guidelines/00-*` through `guidelines/08-*`)
- Provides templates for steering files (AGENTS.starter.md, WORLD.starter.md, etc.)
- Ships 20 `.skill.md` files for specialized AI coding workflows
- Includes sync tooling (`sync-manager.ps1`, `setup-global-references.ps1`) to distribute guidelines to downstream projects
- Is consumed by projects via a `_guidelines/` mirror and inline rule extraction

---

## Structure & Conventions (Always Active)

### Directory Naming
- All content lives under `guidelines/` — domain directories `guidelines/00-*` through `guidelines/08-*`
- `guidelines/_index/` — entry points (MASTER_INDEX.md, RETRIEVAL_RULES.md, GLOSSARY.md, AGENT_BOOT_PROTOCOL.md)
- `guidelines/global-configs/` — templates, scripts, skills
- Every guideline file MUST carry YAML front-matter (`status`, `scope`, `tags`) and end with a `## Cross-References` section — `npm run render:index` registers it in `guidelines/_index/MASTER_INDEX.md`

### Index Maintenance
- `guidelines/_index/MASTER_INDEX.md` is GENERATED — NEVER hand-edit inside its `GENERATED` markers. Add or change a file, then run `npm run render:index` (`npm run check-index-drift` fails validate on divergence)
- `guidelines/_index/RETRIEVAL_RULES.md` MUST be updated when loading strategies change
- `guidelines/_index/GLOSSARY.md` MUST be updated when new terminology is introduced

### Template Updates (Single-Source Pipeline)
- Rule text lives in `guidelines/global-configs/fragments/` — one `##` section per file, order and token budget in `fragments/manifest.json`
- `guidelines/global-configs/templates/AGENTS.starter.md` is GENERATED output — NEVER hand-edit it (`npm run check-drift` fails validate if it diverges)
- To change a rule: edit the fragment → `npm run render:starters` → `npm run validate` → commit fragment + template together
- The constitution has a token budget (~7,000 tokens): a new rule MUST retire, narrow, or demote an existing one — detail not needed every session belongs in a guideline file, not inlined
- Other starter templates (WORLD, DEVTOOLS, tool configs) are hand-maintained; when a guideline changes, update the matching one
- Starter templates use `[FILL]` placeholders for project-specific values
- Never remove `[FILL]` placeholders from templates — downstream projects depend on them

### Skill File Standards
- Each `.skill.md` file in `guidelines/global-configs/skills/` MUST carry YAML front-matter and a `## Cross-References` footer — `npm run render:index` lists it in `MASTER_INDEX.md`
- Skills must include: name, description, trigger conditions, and full instructions

---

## Commands (Always Load)

```bash
npm run audit           # Validate extracted rules against source guideline files
npm run check-links     # Check for broken internal links
npm run check-index     # Verify all files have MASTER_INDEX entries
npm run check-drift     # Fail if AGENTS.starter.md was hand-edited or exceeds its token budget
npm run check-index-drift # Fail if MASTER_INDEX.md was hand-edited — regenerate it instead
npm run docs:census     # Fail if a canonical fact appears in >1 mandated project doc (one home per fact)
npm run render:starters # Regenerate AGENTS.starter.md from global-configs/fragments/
npm run render:index    # Regenerate the MASTER_INDEX tables + graph from front-matter and footers
npm run status:projects # Report which rules each synced project's AGENTS.md is missing (report-only)
npm run validate        # Run audit + check-links + check-index + check-drift + check-index-drift + docs:census
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
- `npm run docs:census` fails the gate if a canonical fact appears in more than one mandated project doc.

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
Always point AI at 2-3 existing guideline files as pattern templates. Without references, AI invents its own inconsistent patterns.

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
- No breaking changes to templates without updating the `sync-manager.ps1` manifest fallback
- No `console.log` in production scripts
- No unregistered files — every guideline file MUST be in `guidelines/_index/MASTER_INDEX.md`
- No `// TODO` or `// FIXME` without explicit permission

---

## Session Bootstrap

1. Read this AGENTS.md — always
2. Understand the repo structure: `guidelines/_index/` → `guidelines/0*-` domain directories → `guidelines/global-configs/`
3. Before editing: identify which category the change falls under (guideline content, template, script, skill)
4. After editing: run `npm run validate` to verify integrity
5. Commit with conventional commit format

---

## Maintenance

- **Quarterly:** Audit skills and templates against source guidelines
- **When adding a file:** Add front-matter + a `## Cross-References` footer, run `npm run render:index`, check RETRIEVAL_RULES.md
- **When updating a guideline:** Also update the matching fragment in `global-configs/fragments/`, then `npm run render:starters`
- **Never let AI modify this file without human approval**

---

## Cross-References

- Index & retrieval: `guidelines/_index/MASTER_INDEX.md`, `guidelines/_index/RETRIEVAL_RULES.md`
- Templates: `guidelines/global-configs/templates/` (AGENTS.starter.md is generated — edit `guidelines/global-configs/fragments/`)
- Fragments pipeline: `guidelines/global-configs/fragments/README.md`
- Skills: `guidelines/global-configs/skills/`
- Sync tooling: `sync-manager.ps1`
