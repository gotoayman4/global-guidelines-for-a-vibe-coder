---
status: "Normative"
scope: "Global"
tags: [git, branching, commits]
---

# Git Workflow Strategy — AI-Assisted Git Discipline

---

AI generates code fast and destabilizes codebases fast. Granular commits and disciplined rollback are the safety net. Branches are a team-workflow choice, not an AI mandate.

## Directives

1. **Commit after every working increment** — granular commits = cheap rollbacks. NEVER commit broken code "to save progress" (stash/WIP branch instead). Never end a session without committing.
2. **Conventional commit messages with type+scope** (`feat(auth): …`) — future sessions need the context. If you can't summarize the change in one sentence, the commit is too large; split it.
3. **Revert wrong AI output** — a broken approach, not a failing check on a sound one — and regenerate with better constraints; never debug forward past two failed fixes. Checkpoint-commit before any major AI operation (`checkpoint: pre-auth-refactor`).
4. **Parallel agents get their own branches** — never share a branch between concurrent agents; merge sequentially with an AI self-review between merges. Single-agent feature work does NOT require a new branch or worktree.
5. **Branch protection on main:** no force-push, and the local CI gate must be green before merge. PR reviews and cloud status checks are optional team additions — never a requirement. Agents never force-push.
6. **Pre-commit hooks MANDATORY** (husky + lint-staged): ESLint `--max-warnings 0`, `tsc --noEmit`, prettier — configured in package.json, auto-installed via `npm run prepare`. Skipping hooks (`--no-verify`) is forbidden in every mode, on every push. Note: lint-staged passes filenames but `tsc` type-checks the whole project when tsconfig exists — expected; full-project check is the safe default.
7. **Pre-push gate MANDATORY** (Tier B of `local-ci-strategy.md`): before every push, run **the declared mode's** gate locally, plus the clean-tree check. How much of the pipeline that gate runs is owned by `speed-tiered-workflow.md` §The Gate Scales With the Mode; it is not restated here. The full pipeline runs at the ship boundary in every mode. `git push --no-verify` is forbidden. This gate replaces cloud CI as the merge-blocking quality gate.
8. **Env files never committed** — `.env` gitignored; use `.env.example` placeholders.

## AI-Specific Git Hazards

| Hazard | Detection | Mitigation |
|---|---|---|
| Agent doom loops | >5 commits/10 min same branch | Pause agent; review |
| Accidental force-push | Unrestricted Git MCP access | Branch protection |
| Merge conflict storms | Overlapping agent file sets | File partitioning; sequential merge |

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| One massive commit per session | Commit every increment |
| Committing broken code "to save progress" | Stash / WIP branch |
| No descriptive messages | Conventional format always |
| "I'll commit later" | Session loss wipes hours of work |

## Cross-References

`ci-cd-philosophy.md` · `environment-management.md` · `development-workflow.md` · `local-ci-strategy.md`
