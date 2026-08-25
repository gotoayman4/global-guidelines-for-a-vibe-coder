# CLAUDE.md — Project Constitution for Claude Code

**Purpose:** Claude Code instructions for working on the central Global Guidelines repository.

---

## Project Identity

Central repository of development guidelines, starter templates, and AI skills for vibe-coding projects. Provides sync tooling to distribute guidelines to downstream projects. Owns ~80 guideline files across 9 domain directories, 16 starter templates, and 18 skill files.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Scripting | PowerShell 5.1 | Windows |
| Validation | Node.js | >=18 |
| Format | Markdown + JSON | — |

---

## Commands

```bash
npm run validate       # Full integrity check (audit + links + index)
npm run audit          # Validate guideline structure
npm run check-links    # Check internal link validity
npm run check-index    # Verify MASTER_INDEX coverage
```

Run `npm run validate` before pushing any changes.

---

## Structure

```
_index/                      # Entry points (MASTER_INDEX, RETRIEVAL_RULES, GLOSSARY)
00-ai-fundamentals/          # AI mindset, prompt engineering, context management
01-workflow-methodology/     # Planning, debugging, refactoring
02-engineering-practices/    # UX, accessibility, testing, security
03-git-and-ci/               # Git workflow, CI templates
04-architecture/             # Patterns, ADRs, state management
05-stack-guides/             # React, MUI, shadcn, RTL, NestJS, Supabase
06-frontend-patterns/        # Shared components, page patterns
07-documentation/            # Writing standards, changelog
08-governance/               # AI governance, design system governance
global-configs/
  templates/                 # Starter files (16 templates)
  skills/                    # .skill.md files (18 skills)
  scripts/                   # PowerShell + Node.js tooling
```

---

## Core Rules

### Structure Compliance
- Every guideline file MUST be registered in `_index/MASTER_INDEX.md`
- Every guideline file MUST end with a `→ See also:` cross-reference section
- Starter templates use `[FILL]` placeholders — never remove them
- When a guideline changes, update the matching starter template

### Content Quality
- Use RFC 2119 keywords (MUST/SHOULD/MAY) consistently
- Keep sections scannable with clear headings
- Reference related files with relative paths from `guidelines/` as root
- No `[FILL]` placeholders in released guideline files (only in templates)

### Git
- Conventional commits: `type(scope): message`
- Commit after every working increment
- Never commit broken state — `npm run validate` must pass
- No force-push to main

### Security
- No secrets in templates, examples, or scripts
- Validate user input in sync tooling
- Audit npm dependencies before adding

---

## AI Response Format

Since the developer cannot read code, describe WHAT changed in plain language (1-2 sentences) and WHERE (file path). Use edit tools directly — never paste code blocks in chat. Only show code when asked.

---

## Forbidden Patterns

- No `[FILL]` in released guideline files
- No absolute paths in templates
- No `console.log` in scripts
- No unregistered files

---

## Session Bootstrap

1. Read this CLAUDE.md
2. Read AGENTS.md for full project constitution
3. Run `npm run validate` first to see current state
4. After changes: run validation again
5. Commit with conventional format

---

## Maintenance

- **Quarterly:** Audit skills and templates
- **When adding files:** Update MASTER_INDEX.md
- **Never let AI modify this file without human approval**
