## Git (Load for All Code Changes)

- **Commit Every Working Increment; Never Broken Code.** Granular commits = cheap rollbacks — stash/WIP for unfinished work, never end a session uncommitted (vibe MAY batch micro-edits). Conventional format with type+scope — one sentence or split it. Checkpoint-commit before major multi-file AI operations. Revert broken AI output immediately — regenerate with better constraints, never debug-in-place.
- **No Branch Mandate; Protect Main.** Single-agent work stays on the current branch (parallel agents get their own; merge sequentially with review). Main MUST stay deployable: branch protection, no force-push, green local gate before merge. Env files never committed — `.env` gitignored, `.env.example` committed.
