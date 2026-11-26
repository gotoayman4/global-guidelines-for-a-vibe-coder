# Fragments — Single Source for AGENTS.starter.md

Each `.md` file here is one full markdown section of the generated template
`../templates/AGENTS.starter.md`. Render order is defined in `manifest.json`.

**Never edit `AGENTS.starter.md` directly** — it is generated output. `npm run check-drift`
(part of `npm run validate`) fails if the template and the fragments diverge.

## Workflow

1. Edit the rule in the relevant fragment (rule format: `- **Title.** body` + `  → Source: path` — `audit-rules.js` parses this).
2. Run `npm run render:starters`.
3. Commit the fragment and the regenerated template together.

## Adding a rule

A new rule must retire, narrow, or demote an existing one — the token budgets in
`manifest.json` are enforced by `npm run check-drift`: `maxTokens` over what a project
receives with every module, and `maxCoreTokens` over the universal floor (`capabilities: none`),
both estimated at chars/4 with `→ Source:` lines stripped, as the sync delivers them.
Detail that is not needed in every session belongs in a guideline file under `guidelines/0X-*`,
not in the always-loaded starter. Mode-scoped detail lives in
`01-workflow-methodology/speed-tiered-workflow.md`.

## Optional modules (capabilities)

A fragment that only some projects need carries `<!-- requires: web-ui, api -->` on the line
under its `## ` heading (any-of). The sync keeps that section only when the project's
`WORLD.md` §Capabilities lists one of the words; no marker = universal. Vocabulary and semantics:
`01-workflow-methodology/speed-tiered-workflow.md` §Capability Declaration. Prefer gating a
section over deleting a rule that is right for some projects.
