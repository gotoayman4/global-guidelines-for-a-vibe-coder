## Git (Load for All Code Changes)

- **Commit Every Working Increment; Never Broken Code.** Commit green increments for cheap rollbacks (if unrequested commits are forbidden, stage by path and report); stash/WIP unfinished work, never commit broken code (`vibe` MAY batch micro-edits). Conventional `type(scope): summary`; scratch files live in gitignored `scratch/`; never `git add -A`. Checkpoint before multi-file edits; after 2 failed fixes, stop (`agent-verification-loop.md`).
  → Source: `03-git-and-ci/git-workflow-strategy.md`
- **Destructive Git Safety & Protect Main.** NEVER run `git reset --hard`, `git checkout --`, or `git clean -f` on a dirty tree without stashing or explicit permission. Single-agent work stays on the current branch (parallel agents use isolated branches/worktrees + sequential merge). Main stays deployable: no force-push, green local gate. `.env` gitignored, `.env.example` committed. Hooks enforce these where installed (`npm run guardrails:install`); never bypass with `--no-verify`.
  → Source: `03-git-and-ci/git-workflow-strategy.md`
