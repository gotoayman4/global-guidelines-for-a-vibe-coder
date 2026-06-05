# Git Workflow Strategy — Version Control for AI-Assisted Development

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,600 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `development-workflow.md`, `ai-agent-orchestration.md`

---

## Purpose

Define the Git workflow optimized for AI-assisted development. AI generates code rapidly and can destabilize a codebase quickly. Granular commits, isolated branches, and disciplined rollback are not optional — they are the safety net that makes AI collaboration viable.

---

## Core Principles

### 1. Commit After Every Working Increment

AI changes are often broad, partially correct, and difficult to reason about. Committing after every verified increment provides rollback checkpoints.

**Rule:** Never end an AI session without committing working code. If you can't write a single-sentence summary of what this commit changes, the commit is too large.

### 2. One Agent, One Branch

Autonomous agents and parallel agents must work on isolated branches. Never let multiple agents share the same branch.

**Why:** Two agents modifying the same branch create merge conflicts and corrupt each other's assumptions. Branch isolation means each agent's work is independently reviewable and revertible.

### 3. Revert Liberally

If an AI agent goes off-track, revert immediately. Don't try to "fix" a broken AI session by prompting more — the accumulated errors compound.

**When to revert:**
- An agent makes changes that break the app
- An agent gets stuck in a debugging loop (fix → break → fix → break)
- A background agent diverges from the task
- Agent output is architecturally inconsistent with the rest of the codebase

---

## Branch Strategy

### Branch-per-Feature
```
main ← feature/login
main ← feature/dashboard
main ← feature/user-settings
```

Each feature gets its own branch. Work is merged to main only after review and testing.

### Branch-per-Agent (Parallel Work)
```
main ← agent/frontend-refactor
main ← agent/backend-refactor
main ← agent/test-coverage
```

For parallel agent work, each agent gets its own branch. Merge is sequential and reviewed: merge Agent 1 → verify → merge Agent 2 → verify → merge Agent 3.

### Git Worktrees for Parallel Agents

When agents need to work on the same repository simultaneously, use Git worktrees:
```bash
git worktree add ../project-agent1 agent/frontend-refactor
git worktree add ../project-agent2 agent/test-coverage
```

Each worktree is a separate directory with its own files. No file lock conflicts. Each agent works independently.

---

## Commit Conventions

### Commit Message Format
```
<type>(<scope>): <description>

feat(auth): add password reset flow
fix(api): validate missing user email
test(payments): cover failed refund scenario
docs(setup): document environment variables
refactor(ui): simplify dashboard card layout
perf(queries): add index on users.email
security(input): sanitize search query parameters
chore(deps): update typescript to 5.5
```

### Commit Size
- **Ideal:** 1-3 files, <200 lines. Reviewable in 5 minutes.
- **Acceptable:** 3-5 files, <500 lines. Reviewable with effort.
- **Too large:** 5+ files, 500+ lines. Split into multiple commits.

**Rule:** If reviewing the diff takes more than 15 minutes, the commit is too large.

### Environment Files in Git

- `.env` and `.env.*` MUST be in `.gitignore`. Never commit secrets.
- Provide an `.env.example` with dummy values for onboarding.
- See `environment-management.md` for full secrets management guidance.

---

## The AI Commit Workflow

```
1. AI generates code
2. Human reviews code (see code-review-workflow.md)
3. Tests pass
4. Smoke test passes
5. COMMIT — immediately, with descriptive message
6. Continue to next iteration
```

**Never:** Generate 5 features → review all at once → one massive commit. This makes it impossible to isolate which change introduced a bug.

---

## Rollback Strategy

### Checkpoint Commits
Before any significant AI operation, commit the current state. This is your rollback point.

```
BEFORE: "AI, refactor the entire auth module"
ACTION: git commit -am "checkpoint: pre-auth-refactor"
```

### Revert, Don't Debug-in-Place
If AI output is broken, revert to the checkpoint and start fresh with a better prompt. Debugging broken AI output often takes longer than regenerating with better constraints.

```
git revert HEAD  # Undo the broken AI changes
# Rewrite prompt with better constraints
# Generate again
```

### Branch Protection
For repositories with AI agents that have Git access:
- Protect `main` from force pushes
- Require PR reviews before merging
- Require status checks (tests, linting) to pass

---

## AI-Specific Git Hazards

### Agent Doom Loops
An autonomous agent may enter a "doom loop" — fix a bug, create a new one, fix that, create another. Detection: >5 commits in 10 minutes on the same branch.

**Mitigation:** Monitor agent activity. If commit velocity spikes unexpectedly, pause the agent and review.

### Accidental Force Push
An agent with Git MCP access can force-push to main if unrestricted.

**Mitigation:** Branch protection rules on main. Agents should never have force-push permissions.

### Merge Conflict Storms
Two agents on overlapping file sets create merge conflicts that are difficult to resolve.

**Mitigation:** File partitioning (each agent gets exclusive file sets). If overlap is unavoidable, sequential merge with human review between each merge.

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **One massive commit per session** | Can't isolate which change broke what | Commit after every working increment |
| **Multiple agents on same branch** | Merge conflicts; corrupted assumptions | Branch-per-agent |
| **Committing broken code "to save progress"** | Broken state in git history | Stash or use WIP branches; main must always be deployable |
| **No commit messages** | Can't find when a bug was introduced | Descriptive messages with type and scope |
| **Letting agents force-push** | main can be corrupted by bad agent output | Branch protection rules |
| **"I'll commit later"** | Power outage, crash, or session loss wipes hours of AI output | Commit after every iteration |
| **Not reverting broken agent output** | Accumulated errors become unfixable | Revert immediately; regenerate with better constraints |

---

## Key Takeaways

1. Commit after every working increment. Granular commits = cheap rollbacks.
2. One agent, one branch. No shared branches for parallel work.
3. Revert broken AI output immediately. Don't debug-in-place.
4. Checkpoint before major AI operations. Always have a rollback point.
5. Protect main with branch rules. Agents should never force-push.
6. Commit messages must be descriptive. Future you (and future AI) needs the context.

---

## Cross-References

- **Depends on:** `development-workflow.md` — the Commit phase in the standard loop
- **Applied by:** `ai-agent-orchestration.md` — branch-per-agent for parallel execution
- **Applied by:** `ci-cd-philosophy.md` — CI integration with branch strategy
