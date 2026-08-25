# CLAUDE.md — Project Constitution for Claude Code

**Purpose:** Claude Code instructions for working on this repository.

All rules live in **[AGENTS.md](AGENTS.md)** — the single project constitution. Read it first and follow it completely. This file exists only so older Claude Code versions (which don't read AGENTS.md natively) find a valid instruction file.

## Commands

```bash
npm run validate       # Full integrity check — run before pushing
```

## Session Bootstrap

1. Read AGENTS.md — it is the complete constitution
2. Run `npm run validate` to see current state
3. After changes: validate again, then commit with conventional format

---

*This file intentionally contains no rules of its own. To change any rule, edit AGENTS.md only.*
