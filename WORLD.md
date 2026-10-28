# WORLD.md — Product Intent Guardrail

**Purpose:** Define what this guidelines repository exists to do — and what it must NOT become. Prevents scope creep into application code, general documentation, or non-guideline concerns.

---

## What This Project Is

The Global Guidelines for Vibe Coders is a centralized repository of development rules, starter templates, and AI skills that downstream projects consume to ensure consistent quality, security, and best practices across AI-assisted coding workflows.

It is a **content distribution hub** — not an application. Its primary value is providing a single source of truth for guidelines that can be synced into any project, along with tooling to make that sync seamless. Every guideline is accompanied by a starter template that projects can customize.

---

## Core Domains (What We Build)

- **Development Guidelines** — Authoritative rules for AI-assisted coding across engineering, architecture, frontend, accessibility, RTL, testing, security, git, and methodology
- **Starter Templates** — Fill-in-the-blank steering files (AGENTS.starter.md, WORLD.starter.md, etc.) that projects use as their own project constitutions
- **AI Skills** — Specialized `<name>/SKILL.md` skill directories for code review, refactoring, security audit, test generation, deployment, and more
- **Sync Tooling** — PowerShell GUI + CLI tools that mirror guidelines into projects and install starter files
- **Stack-Specific Guides** — RTL architecture, MUI bidirectional setup, shadcn RTL, NestJS patterns, Supabase best practices

---

## What This Project Is NOT (Guardrails)

### NOT: An Application
- No frontend UI, no backend API, no database
- No user-facing functionality of any kind
- The sync manager GUI is an admin tool, not a product

### NOT: Generic Documentation
- No general-purpose writing, blog posts, or tutorials
- Every file must serve a specific guideline or tooling function
- No READMEs for third-party projects

### NOT: A Code Library
- No reusable npm packages, React components, or libraries
- Scripts exist only to serve the guideline distribution workflow

### NOT: A Project Management Tool
- No issue tracking, no feature requests for apps
- No design mockups or UI prototypes

---

## Explicitly Out-of-Scope Features

| Feature | Reason for Rejection | Date Decided |
|---|---|---|
| Web-based guideline browser | Adds hosting/maintenance burden; markdown is sufficient | 2026-06 |
| Content management system | Over-engineered; git + sync tooling is the distribution method | 2026-06 |
| Automated PR reviews for downstream projects | Out of scope — each project manages its own CI | 2026-06 |

---

## Target Users

| Role | Description | Primary Needs |
|---|---|---|
| Vibe Coder Developer | Uses AI tools to build projects | Clear, extractable rules; starter files they can fill in |
| Project Lead | Manages team's AI-assisted development | Consistent quality across projects; governance framework |
| AI Agent | Reads guidelines during coding sessions | Scannable markdown; clear priorities; cross-references |

---

## Non-Functional Priorities (Ranked)

1. **Correctness** — Guidelines must be technically accurate; errors propagate to all downstream projects
2. **Consistency** — Same terminology, structure, and tone across all files
3. **Discoverability** — `guidelines/_index/MASTER_INDEX.md` must make any file findable in seconds
4. **Syncing Reliability** — Sync tooling must never corrupt downstream project files
5. **Maintainability** — Adding a new guideline should require updating exactly 2-3 places

---

## Scale Expectations

| Metric | Current | 12-Month Projection |
|---|---|---|
| Guideline files | ~70 (66 content + `_index`) | ~120 |
| Starter templates | 16 | 25 |
| Skill files | 23 | 30 |
| Downstream projects using sync | 7 | 5-20 |

---

## Technology Constraints (Non-Negotiable)

- Must support Windows-first tooling (PowerShell 5.1 for sync scripts)
- No external service dependencies — works fully offline
- Markdown as primary content format
- Node.js only for validation scripts (not for content distribution)
- Must be consumable by any AI tool without special APIs

---

## Maintenance

- **Update when:** adding new guidelines, changing template structure, or adjusting sync behavior
- **Who:** The repository maintainer, or an AI agent acting on the maintainer's instruction.
- **Review:** Quarterly alongside guideline content audit
- **How AI uses this:** Before suggesting any structural change, AI checks WORLD.md for guardrail violations

---

**Cross-References:**
- MASTER_INDEX: `guidelines/_index/MASTER_INDEX.md`
- Retrieval rules: `guidelines/_index/RETRIEVAL_RULES.md`
- Starter templates: `guidelines/global-configs/templates/`
