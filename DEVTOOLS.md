# DEVTOOLS.md — AI Tool Config Directory Reference

**Purpose:** Document the purpose and safe handling of AI tool directories found in this repository.

---

## Directory Inventory

| Directory | Tool | Purpose | Commit? | Notes |
|---|---|---|---|---|
| `.github/` | GitHub | CI workflows, copilot instructions | ✅ Yes | Core project infrastructure |
| `.vscode/` | VS Code | Editor settings, extensions | ✅ Yes | Shared dev settings only |

## .gitignore Patterns

If AI tool directories appear in this repo, add them here:

```gitignore
# AI tool artifact directories
.kilocode/
.qoder/
.qodo/
.trae/
.windsurf/

# Node
node_modules/

# Generated artifacts
REPO_AUDIT_REPORT_*.md
```

## Maintenance

- Update when a new AI tool is introduced
- Remove entries for tools no longer in use
