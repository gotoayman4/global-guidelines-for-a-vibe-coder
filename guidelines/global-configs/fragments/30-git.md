## Git (Load for All Code Changes)

- **Commit After Every Working Increment.** Granular commits = cheap rollbacks. NEVER commit broken code "to save progress" — use stash or WIP branches.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **Descriptive Commit Messages.** Conventional commit format with type and scope. Future you and future AI need the context.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **Revert Broken AI Output Immediately.** Do not debug-in-place. Revert broken AI output and regenerate with better constraints.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **Checkpoint Before Major AI Operations.** Always commit a checkpoint before running major AI operations that could modify multiple files.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **No Branch Requirement for New Features.** Work on the current branch unless the team's workflow explicitly requires otherwise. Branches are a team-workflow choice, not an AI mandate.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **Protect Main Branch.** Main branch MUST always be deployable. Use branch protection rules. Agents never force-push to main.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
