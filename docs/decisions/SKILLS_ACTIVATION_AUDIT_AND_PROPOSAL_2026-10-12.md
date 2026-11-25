# Skills Activation Audit and Proposal — Are the Skills Actually Being Used?

**Date:** 2026-10-12  
**Scope:** the 20 `.skill.md` files in `guidelines/global-configs/skills/`, how they reach the  
7 registered projects, and whether an IDE or AI agent in those projects ever notices them.  
**Status:** audit complete, measured on the live fleet. Proposal is not yet implemented — §8  
names the one decision that gates it.

---

## 1. The question, and the short answer

> Do the skill files in this repo — and the copies projected into the registered projects —  
> actually get noticed and used by the IDEs / AI agents working in those projects?

**No, not reliably. They are noticed by exactly two tools, by accident of how those two tools  
happen to be installed, and "used" is never enforced by anything.**

Split the question in two, because the answers differ:

|                                                            | Answer                                                                                                                                                                                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Noticed** (does the agent know the skill exists?)        | **Partly.** opencode and Qoder see all 20, because the sync writes them into those tools' real skill folders. Every other tool depends on the agent reading a one-line pointer in `AGENTS.md` and then *guessing* which file is relevant. |
| **Used** (does the skill actually load when it is needed?) | **Never enforced.** There is no gate, guard, test, or count anywhere in this repo that notices whether a skill was loaded. It is prose asking an agent to be diligent.                                                                    |

The rest of this document is the evidence for that verdict, the three root causes, and a  
proposal where every item names the control that fails if the fix is unlearned.

---

## 2. How skills are delivered today

The chain is real and it works — up to a point. Measured end to end:

1. **Declared** — `sync-manifest.json` §`skills` (lines 160–166): source  
   `global-configs/skills/*.skill.md` → target `_skills`, plus a `gitignoreEntry` of `_skills/`  
   and an `agentsMdSectionHeader` of `## Skills`.
2. **Copied twice, to two different places.**
   - Into the project as `_skills/<name>.skill.md` — `GuidelineSync.psm1` `Sync-Skills`  
     (line 285), run as step 1c by `sync-guidelines.ps1` (line 172).
   - Into the project's `_guidelines/global-configs/skills/` as part of the whole-tree mirror  
     (`sync-manifest.json` line 19 includes `global-configs/skills`).
3. **Pointed at** — `Sync-Skills` appends a `## Skills` section to the project's `AGENTS.md`  
   **only if it is absent** (`GuidelineSync.psm1` line 328). The injected text is one sentence:  
   *"Skill files live at `_skills/<name>.skill.md`. Load when the trigger matches the current task."*
4. **Installed for two tools** — step 2 of the sync (lines 183–207, 322–345) writes each skill  
   as `<name>/SKILL.md` into `~/.config/opencode/skills/` and `~/.qoder/skills/`. That is those  
   tools' genuine discovery path, so they work.
5. **Gitignored** — `_skills/` is written into every project's `.gitignore`. It is untracked in  
   **all 7** projects. So is `_guidelines/`.

---

## 3. Findings (all measured on the live fleet, 2026-10-12)

**F1 — The pointer is committed; the thing it points at is not.**  
`AGENTS.md` is tracked in all 7 projects and says skills live at `_skills/…`. `_skills/` is  
tracked in **none** of them. A fresh clone has a dangling pointer. This is the same trade-off  
already accepted for `_guidelines/` — but `_guidelines/` is *reference material the agent can  
work without*, while `_skills/` is *procedural instruction the agent has been told to load*.  
Consequence: **any agent that reads the repo through git rather than through this machine's  
working tree** — GitHub Copilot's coding agent, Copilot PR review, Codex, Jules, Devin, Gemini  
Code Assist on GitHub — sees `AGENTS.md` and no skills at all.

**F2 — The trigger is stored inside the door it guards.**  
Each skill's YAML front-matter carries the activation trigger, e.g.  
`description: Activate when user provides code for review, asks for PR review…`. But the  
`## Skills` section in `AGENTS.md` **names no skill and lists no trigger** — measured: zero  
occurrences of any `<name>.skill.md` in the section. There is also no index inside `_skills/`.  
So an agent must already know a skill exists in order to discover when to use it. In practice  
it can only match on the *filename* — which works for `code-review` and fails for  
`firestore-cost-optimization`, `unsaved-changes-protection`, `bidirectional-docx-rtl`.

**F3 — `_skills/` is outside every control this repo owns.**  
`check-sync-drift.js` hashes the project's `_guidelines/` mirror against the source  
(`MIRROR_NAME = '_guidelines'`, line 54). **Nothing hashes `_skills/`.** Nothing asserts the  
`## Skills` section exists. `sync-manifest.json` §`guards.required` names 4 guards and no  
skill-related one. So the skills are the only synced artifact class with **zero verification** —  
while being the only one that *tells the agent how to behave*.  
*(Today the two copies happen to be identical — `diff -rq _skills _guidelines/global-configs/skills`  
is clean in gs-coordinator-helper. The gap is latent, not yet active. That is the best moment  
to close it.)*

**F4 — The section is a side effect, not a rendered artifact.**  
`Sync-Skills` appends `## Skills` if missing. But `AGENTS.starter.md` is **generated** from  
`fragments/`, and **"skill" appears zero times in every fragment** — and no `## Skills` section  
exists in the starter. So the one document the drift guard protects is silent on skills, and  
`check-drift` therefore *cannot* catch a project whose skills section was deleted. The section  
only appears if a sync ran.

**F5 — Four divergent hand-written versions, and no propagation.**  
Measured section size per project: **106 chars** in midad, property-management-app, alsael1  
(exactly the injected one-liner); **694** in Evaluator-v4; **953** in pcms; **1097** in  
gs-coordinator-helper; **absent** in the central repo itself. gs-coordinator-helper's version  
carries a real, hard-won warning (D159) about skills that target the wrong stack — and because  
the guard is "append only if absent", **that improvement has reached none of the other six  
projects**. One fact, four homes.

**F6 — Two skills cannot be auto-activated even by a tool that reads front-matter.**  
19 of 20 skills declare `description:`; `mui-design-system.skill.md` declares **neither `name:`  
nor `description:`** (front-matter is `status`/`scope`/`tags` only). Its trigger exists only as  
prose inside the body. A tool that loads skills by description — which is how the native loaders  
work — will never surface it.

**F7 — The global skill pool is shared, unpruned, and unfiltered by stack.**  
`~/.config/opencode/skills` holds 21 entries; `~/.qoder/skills` holds 24 — our 20 plus  
third-party skills (`codebase-memory`, `frontend-design`, `supabase`,  
`supabase-postgres-best-practices`). Every project is therefore offered `rtl-shadcn-setup`,  
`shadcn-design-system` and `tiptap-tailwind-reset` (Tailwind/shadcn — forbidden in the MUI  
projects) and `inno-setup` (superseded by `electron-builder`). There is no `appliesTo` /  
stack field in skill front-matter to filter on. gs-coordinator-helper's hand-written paragraph  
is a *local patch* for this, not a control.

**F8 — The boot protocol never mentions skills, and admits the boundary.**  
`AGENT_BOOT_PROTOCOL.md` runs Step 0 (budget) → Step 1 (steering files) → Step 2  
(`_guidelines/` mirror) → Step 3 (global configs) → Step 4 (task-specific guidelines). **No  
step loads a skill.** And the priority table's lowest row states plainly that at the central  
repo path *"agents may fail to read outside project"* — which is precisely why the gitignored  
copy fails for any agent that is not sitting in this working tree.

---

## 4. Verdict per tool

| Tool                                   | How it would find a skill                                        | Status                      | Evidence                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| **opencode**                           | `~/.config/opencode/skills/<name>/SKILL.md` + global `AGENTS.md` | ✅ **Works**                 | 21 entries present; global `AGENTS.md` line: "Skills live at `global-configs/skills/<name>.skill.md`" |
| **Qoder**                              | `~/.qoder/skills/<name>/SKILL.md`                                | ✅ **Works**                 | 24 entries present                                                                                    |
| **VS Code Copilot**                    | `.vscode/settings.json` → 4 instruction keys → `AGENTS.md`       | ⚠️ **Rules yes, skills no** | All 4 keys wired; `AGENTS.md` root file is supported by Copilot, but it names no skill                |
| **GitHub Copilot (cloud / PR review)** | reads the repo through git                                       | ❌ **Fails**                 | `_skills/` untracked → pointer dangles (F1)                                                           |
| **Claude Code**                        | `~/.claude/skills/` or `.claude/skills/`                         | ❌ **Not installed**         | `~/.claude/skills` holds 3 unrelated entries; no `.claude/` in any project                            |
| **Cursor**                             | `.cursor/rules/*.mdc`                                            | ❌ **Not created**           | `detect: ".cursor"` — no project has a `.cursor/` dir, so the template never fires                    |
| **Windsurf**                           | `.windsurf/rules/`                                               | ❌ **Not created**           | same detect-gating                                                                                    |
| **Trae**                               | `.trae/rules/`                                                   | ❌ **Not created**           | same detect-gating                                                                                    |
| **Gemini CLI**                         | `GEMINI.md`                                                      | ❌ **Not created**           | `detect: ".gemini"`                                                                                   |
| **Any agent, any tool**                | `AGENTS.md` `## Skills` one-liner → `_skills/<name>.skill.md`    | ⚠️ **Advisory only**        | Names no skill; nothing verifies it; nothing counts it                                                |

Two facts about the native paths, verified against the vendors' current documentation today:

- **Claude Code** skills live at `.claude/skills/<name>/SKILL.md` (project) or  
  `~/.claude/skills/…` (personal), follow the cross-tool **Agent Skills** standard, and the  
  docs are explicit on both points that matter here: *"Commit it so your team gets it too"*, and  
  the `description` field *"helps Claude decide when to load the skill automatically"*. Symlinked  
  skill folders are supported. (Note: `synced` is a reserved folder name.)
- **GitHub Copilot** reads `.github/copilot-instructions.md` (repo-wide) and  
  `.github/instructions/NAME.instructions.md` (path-specific, matched by path). `AGENTS.md` is  
  supported as *agent instructions* — a root `AGENTS.md` is fine; support for `AGENTS.md` files  
  *outside the workspace root* is off by default.

---

## 5. Why they are not used — three root causes

1. **Discovery is left to the agent's diligence.** Only two tools have a native loader wired.  
   For everything else the agent must read a sentence, guess a filename, and volunteer. That is  
   a wish, not a mechanism.
2. **The trigger is invisible at the moment of decision.** The inventory that *does* exist —  
   the generated skills table in `MASTER_INDEX.md`, with descriptions and tags — sits inside  
   the gitignored `_guidelines/` mirror, in a file no rule tells the agent to open for skills.
3. **Nothing observes activation.** This repo's own doctrine is *"a file nobody runs is a  
   control that exists only in a directory listing"*. By that standard skills currently have no  
   control at all — not for presence, not for freshness, not for activation.


## 7. Proposal — six changes, each with the control that fails if it is unlearned

Ordered so each step is a precondition for the next. All six fit the existing machinery; none  
requires new doctrine.

| #      | Change                                                                                                                                                                                                                                | Cost it removes                                                                                              | Control that fails if unlearned                                                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **S1** | **Require `name:` and `description:` on every skill.** Fix `mui-design-system.skill.md`.                                                                                                                                              | A skill that no native loader can surface (F6)                                                               | Extend `audit-rules.js` (already reads skill front-matter): a skill missing either key fails `npm run audit`. Reversal-provable by deleting the key from one file.                               |
| **S2** | **Generate the trigger inventory into the `## Skills` section.** A new `render:skills` step emits a table — `name` → one-line trigger → tags — from the skills' own front-matter, inside a GENERATED marker in `AGENTS.md`.           | F2 (trigger behind the door), F5 (four divergent hand-written sections), and the F8 gap in the boot protocol | Extend `check-drift` (it already guards generated content): a hand-edited table fails `npm run validate`. Because it is *derived*, it is not a second home — the same pattern as `MASTER_INDEX`. |
| **S3** | **Close the verification hole.** Make `check-sync-drift.js` hash `_skills/` as well as `_guidelines/`, deriving the list from the manifest's declared `gitignoreEntry` sections rather than a literal.                                | F3 — skills can silently go stale or missing behind a green gate                                             | `npm run sync:drift` fails on a missing or stale `_skills/`. Today it cannot see the directory at all.                                                                                           |
| **S4** | **Install into each tool's native path, and declare the tool list.** Add Claude Code (`.claude/skills/<name>/SKILL.md`); keep opencode/Qoder. Replace `detect`-gating with a declared list so coverage is *reported*, not accidental. | F4-adjacent tool blindness: Cursor, Windsurf, Trae, Gemini, Claude are currently silent no-ops               | A coverage guard that reports "tool X not covered in project Y" — the same report-don't-fail shape as `guard:tiers`'s unreached `standard+` case.                                                |
| **S5** | **Make activation observable.** State in the `## Skills` section that when a task matches a listed trigger the agent loads the skill and emits its existing activation line (`Skill: <name> activated`).                              | The absence of any measurement of "used"                                                                     | Extend `audit:friction.js` (already measures the process) to count activation lines per session. A prose rule becomes a number.                                                                  |
| **S6** | **Add `appliesTo:` stack tags and filter on them.** Sync only the skills a project's stack can use, and mark the rest "not applicable" in the inventory.                                                                              | F7, and it generalises gs-coordinator-helper's hand-written D159 warning to all 7 projects                   | The inventory in S2 is generated, so a mismatch is visible in the diff; `guard:tiers`-style reporting on skills excluded per project.                                                            |

**Ratchet note.** S2 and S5 add text to `AGENTS.md`. The constitution budget is **4,991 of  
5,000 tokens** (`fragments/manifest.json`), so either the generated table is excluded from the  
budget (it is generated output, like `MASTER_INDEX`) or one existing rule must be narrowed to  
pay for the one new line. Do not discover this at `check-drift` time.

---

## 8. What this audit did not change

Nothing. This is a read-only audit of the live fleet plus a proposal — no file in this repo or  
in any registered project was modified. The proposal touches the fragment pipeline, the sync  
module, the drift guard and `AGENTS.md`, all of which are gated by `npm run validate` and carry  
a decision number; implementing it is a separate, planned change.

**Smallest high-leverage first step, if you want one today:** S1 and S3. S1 is two front-matter  
lines. S3 is a one-constant change in a guard that already exists — and it converts the largest  
invisible hole in the fleet into a failing check.
