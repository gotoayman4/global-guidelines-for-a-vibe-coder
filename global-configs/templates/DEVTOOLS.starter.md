# DEVTOOLS.md — AI Tool Config Directory Reference

**Purpose:** Document the purpose and safe handling of non-runtime AI tool directories found in your repository root. Multiple AI coding tools may each create their own config directories — this file helps teams and AI agents understand which ones matter and which to ignore.

**Source:** `global-guidelines-for-a-vibe-coder/global-configs/templates/DEVTOOLS.starter.md`
**How to use:** Copy to `docs/DEVTOOLS.md` in your project root. Audit your repo for AI tool directories and fill in the table.

---

## Directory Inventory

| Directory | Tool | Purpose | Commit? | Notes |
|---|---|---|---|---|
| `.cursor/` | Cursor IDE | Workspace config, AI rules | ⚠️ Optional | No sensitive data |
| `.windsurf/` | Windsurf IDE | AI rules | ⚠️ Optional | Auto-generated |
| `.qoder/` | Qoder AI | Project context, rules, agents | ⚠️ Optional | May contain repowiki and plans |
| `.qodo/` | Qodo AI | Agent config, workflow definitions | ⚠️ Optional | Auto-generated |
| `.trae/` | Trae AI | Rules and skills | ⚠️ Optional | Auto-generated |
| `.kilocode/` | KiloCode AI | Project context, config, skills | ❌ No | May contain node_modules |
| `.github/` | GitHub | CI workflows, issue templates, instructions | ✅ Yes | Core project infrastructure |
| `.vscode/` | VS Code | Editor settings, snippets, extensions | ✅ Yes | Shared dev settings only |
| `.agents/` | Agent skills | Custom skill definitions | ✅ Yes | Project-specific AI skills |

## Safe Handling Rules

1. **Never manually edit** auto-generated tool directories (`.qoder/`, `.qodo/`, `.trae/`, `.windsurf/`) — they are managed by their respective tools.
2. **Project rules** in AI tool directories should reference your `AGENTS.md` or `CLAUDE.md` as the single source of truth.
3. **If a tool directory causes CI issues**, add it to `.gitignore`.
4. **New AI tools** should add their config directory to `.gitignore` and document it here.
5. **Shared editor settings** (`.vscode/settings.json`, `.vscode/extensions.json`) are safe to commit; personal settings go in `.gitignore`.

## .gitignore Patterns

Add the following patterns to your `.gitignore` for AI tool directories that should not be committed:

```gitignore
# AI tool artifact directories
.kilocode/
.qoder/
.qodo/
.trae/
.windsurf/

# Test artifacts
playwright-report/
test-results/

# Runtime uploads
.uploads/
```

## Maintenance

- Update when a new AI tool is introduced to the project.
- Remove entries for tools no longer in use.
- Review quarterly to ensure all entries are still accurate.
