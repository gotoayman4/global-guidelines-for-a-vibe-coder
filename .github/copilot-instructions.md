# GitHub Copilot Instructions

**Purpose:** Instructions for GitHub Copilot when working on the central Global Guidelines repository.

---

## Project Identity

Central repository of development guidelines, starter templates, and AI skills for vibe-coding projects. Provides sync tooling to distribute guidelines to downstream projects. Owns ~80 guideline files across 9 domain directories, 16 starter templates, and 18 skill files.

---

## Build & Validation Commands

```bash
npm run validate       # Full integrity check (audit + links + index)
npm run audit          # Validate guideline structure
npm run check-links    # Check internal link validity
npm run check-index    # Verify MASTER_INDEX coverage
```

---

## Core Rules

- Every guideline file MUST be registered in `_index/MASTER_INDEX.md`
- Every guideline file MUST end with a `→ See also:` cross-reference section
- Starter templates use `[FILL]` placeholders — never remove them
- When a guideline changes, update the matching starter template
- Use RFC 2119 keywords (MUST/SHOULD/MAY) consistently
- No `[FILL]` placeholders in released guideline files (only in templates)
- No `console.log` in scripts
- No hardcoded absolute paths in templates
