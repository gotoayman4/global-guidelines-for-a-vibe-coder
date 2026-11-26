# Implementation Plan — Global Guidelines Repo Enhancements

**Repo:** `gotoayman4/global-guidelines-for-a-vibe-coder`
**Baseline commit:** `a2a0d52` (2026-11-25)
**Goal:** Make downstream AI coding agents faster and cheaper to run, and more accurate. Do this by removing contradictions, shrinking the instructions agents always load, turning rules into automated checks, and proving changes with evals before deleting anything.
**Audience:** The AI agent in the IDE that implements this plan, working under the owner's supervision.

---

## 0. Rules for the implementing agent (read first)

1. Read the repo's `AGENTS.md` and `WORLD.md` before any edit. They are binding; this plan does not override them.
2. **One phase = one or more small commits.** Use conventional messages (`type(scope): summary`). Never `git add -A`, never `--no-verify`.
3. After **every** commit run `npm run validate` unpiped and report the exit code. If it is red, fix it (at most two attempts), then stop and report.
4. **Edit sources, not generated output.** Change the fragments under `guidelines/global-configs/fragments/`, never `templates/AGENTS.starter.md` directly. Then regenerate with the repo's render script and the index scripts (`render:skills`, the index render).
5. Tasks marked **[OWNER DECISION]** remove or narrow a baseline rule, change security, or change authority. Per `AGENTS.md` §Maintenance these need a recorded owner decision. Draft the record under `docs/decisions/`, then **stop and ask the owner** before applying.
6. Tasks marked **[VERIFY FIRST]** depend on a fact this plan could not confirm. Check it, report what you found, and only then act.
7. After Phase 2, run `npm run sync:all` and `npm run sync:drift` to deliver the changes to the registered projects. Report which projects changed.
8. End each phase with a short report: what changed (path and section), what ran, the result, and what was **not** verified.

---

## Phase 1 — Baseline measurement (no edits)

| ID | Task | Output |
|---|---|---|
| P1.1 | Run `npm run validate` on the baseline commit. | Exit code and any warnings. |
| P1.2 | Render the starter and record the token count of `AGENTS.starter.md`, both the full file and the `generated:constitution-core` region. **[VERIFY FIRST]** Confirm what `check-drift` compares against `maxTokens: 3800` and `maxCoreTokens: 1900`: the whole file or one region, and with which token estimate. | A table of measured value vs. budget for each. |
| P1.3 | Run `measure-boot-budget.js` on **one real registered project** (for example `gs-coordinator-helper`) and record the size of the startup reading list (the "chain"), the rest of the project docs (the "menu"), and the delivered `AGENTS.md`. Confirm the delivered `AGENTS.md` (plus any `CLAUDE.md` it imports) is under Codex's **32 KiB** limit. | Size report. |
| P1.4 | List which AI tools the owner actually uses today (ask the owner). | Used vs. unused tool list. Phase 5 needs it. |

**Exit criteria:** a baseline numbers table saved as `docs/decisions/BASELINE_2026-11-25.md`. Phases 2–7 are measured against it.

---

## Phase 2 — Consistency fixes (high priority; no rule removed)

These fix contradictions and repeated facts. None of them removes a rule, so none needs an owner decision unless noted.

| ID | Problem | File(s) | Change | Acceptance |
|---|---|---|---|---|
| P2.1 | The token budget is written in three places, with different values: 4,000 in the docs, 3,800 in the manifest. | `AGENTS.md`, `README.md`, `docs/decisions/LEAN_OPERATING_MODEL_DECISION_2026-10-27.md` | Remove the number from `AGENTS.md` and `README.md` and point to `fragments/manifest.json` `maxTokens`. Add a "Superseded in part" line to the LEAN record noting the later reduction to 3,800. | `grep -rn "4,000\|4000 token" AGENTS.md README.md` returns nothing. |
| P2.2 | The starter's precedence rules conflict. The Purpose line says the project setup outranks every generic rule, Security included, but the next line says Security overrides all. | fragment `00-preamble.md` | Change the Purpose line to say the setup section "outranks the generic rules below it, **except Security**". | Re-rendered starter shows the new wording. Validate is green. |
| P2.3 | There are three different instructions for what to do after two failed fixes. | fragments `30-git.md` and `60-ai-collaboration.md`, and `agent-verification-loop.md` | Define one sequence in `agent-verification-loop.md` §Loop Steps: **after two failed fixes, stop → revert or stash → search the web for the error → regenerate with clearer constraints**. The two fragments state it in one short clause and link to it. | One full definition, in one file. The fragments link to it. |
| P2.4 | Right-to-left (RTL) checks are required for every project, but the RTL rules load only for projects that declare `bilingual`. | `speed-tiered-workflow.md` (Absolute Rule 3, Release Classes table), `agent-verification-loop.md` (UI row) | Add "(when `bilingual`)" to each LTR/RTL requirement. | No unconditional RTL requirement remains outside the bilingual-gated text. |
| P2.5 | Two different definitions of when a receipt matches the code being pushed. One file matches by commit ("commit is HEAD"); the gate-speed decision matches by file tree. | `speed-tiered-workflow.md` §A Release Escalation Is an Override; check `check-ship-receipt.js` | Make the guideline describe the **tree-based** rule adopted on 2026-11-21. **[VERIFY FIRST]** Check which rule `check-ship-receipt.js` actually implements. If the script uses the commit, report it and do not change the script without asking the owner. | Guideline and script agree. Any remaining difference is reported. |
| P2.6 | The pilot-release testing requirement differs between files. The starter Testing rule requires end-to-end tests on the deployed app for **every** release. The Release Classes table requires full E2E only for **production**. | fragment `20-testing.md` vs. `speed-tiered-workflow.md` | **[OWNER DECISION]** Ask which is intended. Then align the other file. | Both files say the same. |
| P2.7 | The repo `AGENTS.md` Session Bootstrap still sends agents through `_index/` at every session start. | `AGENTS.md` §Session Bootstrap | Use the starter's wording: `MASTER_INDEX.md` is only for finding a file you cannot name, not a required read. Align `_index/AGENT_BOOT_PROTOCOL.md` and `RETRIEVAL_RULES.md`. | All three say the same. |
| P2.8 | The Git rules in the starter have no `→ Source:` line. | fragment `30-git.md` | Add `→ Source:` lines, for example `03-git-and-ci/...`. **[VERIFY FIRST]** Find the right source guideline. | `npm run audit` (or the script that checks rule sources) covers the Git rules. |
| P2.9 | "Tier 0" in the verification loop is a type of change, but Tiers 1–3 are levels of checking cost. The names collide. | `agent-verification-loop.md`, and anything that references "Tier 0" | Rename to **"Trivial changes"**. Update references, using `grep` to find them. | `grep -rn "Tier 0"` returns nothing. |
| P2.10 | The verification loop does not mention the new flake-confirmation rule, so an agent may try to "fix" a test that is only flaky. | `agent-verification-loop.md` step 3 and Cross-References | Add one line saying that a test that passes when re-run on a fresh boot of the same code follows `local-ci-strategy.md` §flake confirmation. Add `local-ci-strategy.md` to the cross-references. Renumber step "3a" to 4 and shift the later steps. | The link resolves (`check-links` green). |
| P2.11 | Decision records and comments are out of date. | `GATE_SPEED_DECISION_2026-11-21.md`, `fragments/manifest.json` `$comment` | Replace "Status: applied in the working tree" with the commit SHA. Add the repo name before references to another repo (D330, ADR 073). Correct the manifest comment about which sections are inside the generated region. | Records match the committed state. |
| P2.12 | Hard-coded counts will go out of date. | `speed-tiered-workflow.md` ("twelve" eval prompts), plus any other prose counts (`grep` for numbers next to "skills", "guidelines", "prompts", "scenarios") | Replace each count with a pointer to the source file. | No hand-maintained counts in prose. |
| P2.13 | The test file pattern is not quoted. | `package.json` `test:scripts` | Quote the pattern (`node --test "…/tests/*.test.js"`), as the Node documentation recommends. | `npm run test:scripts` is green on Node ≥22. |
| P2.14 | A project-specific analysis sits in the global repo. | `docs/decisions/GAMS_WORKFLOW_SPEED_ANALYSIS_2026-10-12.md` | Move it to the GAMS repo, or keep it if the owner prefers it here. **[OWNER DECISION]** | Moved, or the owner's choice is recorded. |

**Exit criteria:** validate is green. The starter is re-rendered and still under budget. `sync:all` and `sync:drift` are clean.

---

## Phase 3 — Make sure each tool loads AGENTS.md

| ID | Task | Detail | Acceptance |
|---|---|---|---|
| P3.1 | Make the Claude Code pointer file import `AGENTS.md`. | When a `CLAUDE.md` exists, Claude Code loads it instead of `AGENTS.md`. The current pointer only tells Claude in prose to read `AGENTS.md`. Add a line `@AGENTS.md` inside the generated `project-entrypoint` block. Change the **writer** (`sync-guidelines.ps1`, or the fragment it reads), not only `CLAUDE.starter.md`. **[VERIFY FIRST]** Check the current Claude Code documentation for the `@` import syntax and how deep imports can nest. | After sync, a project's `CLAUDE.md` contains `@AGENTS.md`. A fresh Claude Code session in that project reports the constitution rules without being asked to open the file. |
| P3.2 | Check the Gemini pointer. | Gemini CLI reads `GEMINI.md` by default. **[VERIFY FIRST]** Check whether current Gemini CLI can be configured to read `AGENTS.md` (`contextFileName`) or supports an import. Use whichever is simpler and keeps one source of rules. | Gemini loads the constitution through a single source. |
| P3.3 | Re-measure size. | Re-run P1.3 on the same project. | Combined loaded size ≤ 32 KiB. Record the result in the baseline file. |

---

## Phase 4 — Reduce what agents load (medium priority)

| ID | Task | Detail | Acceptance |
|---|---|---|---|
| P4.1 | Shorten the repo `AGENTS.md` overview. | The cited study (arXiv 2602.11988) found that repository overviews in context files did not help agents, while explicit rules for non-standard practices did. Cut "Repo Identity" and other overview prose down to links. Keep commands, rules and the rules for when to escalate. | `AGENTS.md` is noticeably smaller (report bytes before and after). No rule is lost (`npm run audit` green). |
| P4.2 | Make the per-mode reading limits realistic. | The current limits (40K / 90K / 160K tokens) are far above the measured startup reading (about 5.6K), so they never take effect. Propose new limits from the P1.3 numbers, with headroom. **[OWNER DECISION]** | New limits are recorded in the guideline and enforced by `measure-boot-budget.js --strict` at the milestone check. |
| P4.3 | Split `speed-tiered-workflow.md`. | Move the sections that are not about speed modes into their own guidelines: Capability Declaration, Path-scoped delivery, Guardrail hooks and Measuring compliance. Leave one-line links behind. Run `new-guideline.js` for each new file and regenerate the indexes. | The guideline covers modes only. New files are indexed. `check-links` and `docs:census` are green. |
| P4.4 | Move stack-specific lessons out of `agent-verification-loop.md`. | Move the PowerShell quoting, jsdom, React refs and emulator paragraphs to `references/` files of the matching skills (for example `debug-without-code`, `firebase-emulator-windows-console`, `test-generation`). Keep one general principle line in the guideline for each. | The guideline is general. Each lesson is reachable from a skill. `check-skills-drift` is green. |
| P4.5 | Trim long skill files. | For each `SKILL.md` over about 10 KB, keep the trigger, the failure modes, the exact recipe and the verification command, and move the long explanations into `references/`. Do not remove any recipe. | Smaller `SKILL.md` files. Recipes are unchanged in substance. |

---

## Phase 5 — Turn rules into automated checks

Goal: a rule an agent can ignore becomes a check it cannot skip. This is the valid core of the second review.

| ID | Task | Detail | Acceptance |
|---|---|---|---|
| P5.1 | List the rules that can be enforced by tools. | Go through the starter fragments and mark each rule **lint**, **tsconfig**, **hook**, **script** or **prose-only**. Likely candidates: file length limit (ESLint `max-lines`), physical CSS properties in bilingual projects (stylelint/ESLint rule), forbidding `<BrowserRouter>`, design tokens only, TODO/FIXME without permission. | `docs/decisions/RULE_ENFORCEMENT_MAP_<date>.md` with one row per rule. |
| P5.2 | Ship the configs. | Add shareable presets (an ESLint/stylelint config fragment and a strict `tsconfig` base) under `global-configs/`, and deliver them through the existing sync as **opt-in** for each project. Do not force them into projects. | A preset exists. One test project adopts it, and its lint catches a seeded violation. |
| P5.3 | Shorten rule text that is now enforced. | Shorten each enforced rule in the fragment to one line naming the check, for example "Lint-enforced (`max-lines`)". | Starter tokens go down. The eval pass rate (Phase 6) does not drop. |

---

## Phase 6 — Prove changes with evals before removing anything

| ID | Task | Detail | Acceptance |
|---|---|---|---|
| P6.1 | Run the live-agent eval that has not yet been run. | Run every prompt in `global-configs/evals/scenarios.json` against the agent the owner uses most. Record `{output, diff, commands}` for each id and score with `npm run eval:score`. | Baseline pass rate is recorded. |
| P6.2 | Add eval scenarios for the new rules. | Add scenarios for: the flake-confirmation rule, the two-failed-fixes sequence, and an unknown `mode` falling back to `standard`. | The scenarios exist and are scored. |
| P6.3 | Pruning rule for the future. | Write in `AGENTS.md` §Maintenance that a guideline or skill is removed from agent-loaded paths **only** when an eval run shows no loss in pass rate without it. Removing in bulk on opinion is rejected. **[OWNER DECISION]** | The rule is recorded. |

---

## Phase 7 — Simplify how guidelines are distributed (only after Phase 1.4)

| ID | Task | Detail | Acceptance |
|---|---|---|---|
| P7.1 | Retire adapters for tools the owner no longer uses. | For each tool on P1.4's **unused** list, remove its template (for example `qoder`, `trae`, `windsurf`, `kilo`), its entries in `sync-manifest.json`, and its branches in `patch-tool-configs.js` and `sync-project-adapters.js`, together with the tests for them. **[OWNER DECISION]** | Validate is green. `sync:drift` is clean on all projects. Report the lines of code removed. |
| P7.2 | Review the largest sync scripts. | For `sync-manager.ps1`, `check-sync-drift.js`, `GuidelineSync.psm1` and `sync-guidelines.ps1`, find dead branches (unused tools, retired features from the LEAN decision) and remove them. Do not rewrite. | Behaviour is unchanged (existing tests green). Size goes down. |

---

## Phase 8 — Optional additions (low priority)

| ID | Task | Detail |
|---|---|---|
| P8.1 | Map model choice to the speed modes. | **[VERIFY FIRST]** Read `cost-optimization-strategy.md` and `multi-tool-workflows.md`. If they do not already say which model or reasoning level to use for routine work versus architecture, auth or security review and the two-failed-fixes escalation, add a short table. Do not name specific models in prose that will date quickly; link to one place that does. |
| P8.2 | Add a weekly cleanup skill for projects. | A skill that finds dead code, duplicated utilities and stale abstractions in a downstream project and opens a cleanup slice. Runs on demand. |
| P8.3 | Add version tags. | Tag releases (`v2026.11.25`) and have the sync write the source commit into each project so `status:projects` can show which version it has. |

---

## Rejected — do not implement

| Proposal | Why rejected |
|---|---|
| Shrink the starter to "under 4 KB" | This was the reviewer's opinion, not a limit set by any tool. The token budget in `manifest.json` stays the single control. |
| Delete generic guidelines in bulk | Many of them record the owner's own decisions. Prune one at a time with eval evidence (P6.3). |
| Bring back cloud CI | Local-only checking was a deliberate decision. Branch protection on private repos needs a paid plan, and AGENTS.md already records this. |
| Retry deterministic checks (lint, type-check, audit, unit tests) | Rejected in `GATE_SPEED_DECISION_2026-11-21.md`. |
| Delete the `_index/` files | They remain useful to people and to CI. Only remove them from the required startup reading (P2.7). |

---

## Owner decisions needed (summary)

| ID | Question |
|---|---|
| P2.6 | Do pilot releases need automated E2E tests on the deployed app, or only production releases? |
| P2.14 | Should the GAMS analysis move to the GAMS repo? |
| P4.2 | New reading limits for each mode, based on the measured sizes. |
| P6.3 | Adopt the rule that guidelines and skills are pruned only with eval evidence. |
| P7.1 | Which tool adapters to retire. |

---

## Final report expected from the implementing agent

1. The baseline numbers table compared with the final numbers: starter tokens, delivered `AGENTS.md` bytes, startup reading tokens, eval pass rate, and lines of sync code.
2. A list of commits with one line each.
3. Owner decisions taken and their records.
4. Anything not verified, and the command that would verify it.
