# Governance, Calibration, and Tool-Retirement Decisions — 2026-11-26

**Date:** 2026-11-26  
**Status:** Accepted (recorded owner decisions following the 2026-11-26 baseline and fleet review)

---

## Decisions Recorded

1. **Active AI Tool Set (`A1` — Retiring Unused Adapters):** Actively supported tools across this fleet are **Qoder**, **ZCode**, **GitHub Copilot**, and **Antigravity**. Adapters exclusively targeting retired tools (`opencode`, `kilo`, `Gemini CLI`, `Cursor`, `Trae`, `Windsurf`, `Claude Code`) are removed from default sync delivery and template maintenance (`sync-manifest.json`, `sync-guidelines.ps1`, `sync-manager.ps1`, `setup-global-references.ps1`). Opt-in `.claude/settings.json` hook utilities (`guard-command.js`, `guard-file-access.js`) remain available for projects that opt in, while default `.claude/skills` and `~/.claude/skills` adapters are retired cleanly (`retiredTargets` marker-safe cleanup).
2. **Competing / Foreign Skill Stores (`A2`):** Keep `.qoder/` stores active (since Qoder remains in the active tool set). Keep colliding skills in `.agents/skills/` under central sync management (`Evaluator-v4` retains `.agents-skill-sync.json`), while leaving non-colliding project-authored skills untouched (`alsael1` retains its 12 custom Firebase/Xcode skills without forced adoption).
3. **Ship Boundary by Release Class (`A3`):** Split release-boundary automated E2E depth cleanly:
   - **`pilot`:** automated E2E required on the deployed target for **login/auth and permissions** (plus flows exposed by the pilot), in LTR and RTL when `bilingual`.
   - **`production`:** full critical-flow automated E2E matrix (**login/auth, payments, permissions, and data persistence**) on the deployed target, in LTR and RTL when `bilingual`.
4. **Boot-Chain Reading Caps (`A4`):** Tighten per-mode boot-chain token budgets in `01-workflow-methodology/speed-tiered-workflow.md` (read live by `lib/context-caps.js`) to **`vibe <= 25K` / `standard <= 60K` / `guarded <= 120K`** (down from `40K / 90K / 160K`). Keep Codex CLI's `32,768`-byte (`32 KiB`) file-size check in `measure-boot-budget.js` non-fatal advisory.
5. **Eval-Driven Rule Pruning Policy (`A5`):** Security, data-integrity, and safety rules are permanently exempt from automatic pruning even if live agent evals pass `>90%` unprompted. Only process or style reminders may be considered for demotion to on-demand reference docs after measured live eval proof via `npm run eval:score`.
6. **Sync Runtime Scope (`A6`):** Keep sync scripts Windows PowerShell-first per `WORLD.md`; do not rewrite `sync-guidelines.ps1` / `GuidelineSync.psm1` to support macOS or Linux hosts.

---

## Applied In

- `guidelines/01-workflow-methodology/speed-tiered-workflow.md`, `guidelines/02-engineering-practices/testing-philosophy.md`, `guidelines/global-configs/fragments/20-testing.md` (`A3`)
- `guidelines/01-workflow-methodology/speed-tiered-workflow.md`, `guidelines/01-workflow-methodology/development-workflow.md`, `guidelines/00-ai-fundamentals/context-management-strategy.md`, `guidelines/global-configs/fragments/00-preamble.md` (`A4`)
- `guidelines/global-configs/sync-manifest.json`, `guidelines/global-configs/scripts/sync-guidelines.ps1`, `sync-manager.ps1`, `setup-global-references.ps1` (`A1`, `A2`, `A6`)
- `AGENTS.md`, `docs/decisions/RULE_ENFORCEMENT_MAP_2026-11-26.md` (`A5`)
