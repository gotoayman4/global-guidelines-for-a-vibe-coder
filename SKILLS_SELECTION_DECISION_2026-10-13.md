# Skills Selection Decision — Should Every Skill Be Mirrored to Every Project?

**Date:** 2026-10-13
**Scope:** how `plan-skills.js` decides which of the 20 `.skill.md` files a project receives, and
why the answer is not "all of them".
**Status:** implemented, tested, and wired into both sync paths. **Nothing has been synced to any
registered project** — the skills themselves are still awaiting their review session.

---

## 1. The question, and the short answer

> Is it needed to mirror all skills to all projects, given that some skills are stack-specific? Find
> an automatic way to select the appropriate skills for a project that holds a PRD / tech stack, and
> for a pure empty-folder project copy all.

**No. Copying all 20 was placing documents that contradict a project's own constitution into the
directory its `AGENTS.md` tells the agent to load from.** `rtl-shadcn-setup` assumes Tailwind; GAMS
bans Tailwind by name. `mui-design-system` assumes MUI; midad has none. The selector now reads each
project's declared and measured stack and copies only what fits.

The rule is one sentence:

> **A skill is copied when its `appliesTo` scope intersects the project's stack, and never when it
> intersects the project's forbidden list. A project with no stack signal at all receives
> everything.**

---

## 2. What the fleet actually declares

The earlier survey in this session said only 2 of 7 projects carried a `### Stack` table. That was
**wrong** — a `head -20` on the heading list had truncated before reaching it. Re-measured with the
reader itself:

| Project | Signal | Uses | Forbids | Receives |
| --- | --- | --- | --- | --- |
| pcms | Stack table + `package.json` | emotion, mui, react, supabase, tiptap | — | 13 / 20 |
| midad | Stack table + `package.json` | docx, electron, react, shadcn, tailwind, tiptap, zustand | — | 16 / 20 |
| property-management-app | Stack table + `package.json` | electron, emotion, mui, react, zustand | firebase, shadcn, supabase, tailwind | 12 / 20 |
| Evaluator-v4 | Stack table + `package.json` | electron, emotion, mui, react, zustand | tailwind | 12 / 20 |
| alsael1 | `AGENTS.md` prose | firebase, firestore, inno-setup, react, tailwind, zustand | — | 16 / 20 |
| gs-coordinator-helper | Stack table + `package.json` | electron, emotion, firebase, firestore, mui, react | — | 14 / 20 |
| GAMS | Stack table + `package.json` | electron, firebase, mui, react | shadcn, tailwind, zustand | 14 / 20 |

`npm run plan:skills` prints this live, with a reason on every row. **It is not reproduced here** —
a hand-written copy of a derived fact is the second home this repo removes on sight.

---

## 3. The rule, and why it has three rungs

The reader tries the signal sources in order and stops at the first that answers:

1. **Declared** — the `### Stack` table in `AGENTS.md`.
2. **Measured** — `package.json` dependencies, including one workspace level down (`apps/*`,
   `packages/*`), because GAMS's root manifest is a workspace shell and its stack lives in
   `apps/web-portal`.
3. **Declared prose** — the rest of `AGENTS.md`, minus its forbidden sections and minus its
   `## Skills` inventory. This is the rung that serves alsael1, which has no `package.json` at all.

**The negative signal is separate and stronger.** A `### Forbidden …` list is the only signal that
says *not this one*, and it is the one that actually prevents a wrong copy. Forbidden always beats
used.

### Three traps the fleet exposed, each of which silently inverted the profile

- **The Stack heading contains the words "do NOT use ranges."** A bare `do not` classified the
  declared stack as a forbidden list. On GAMS that read MUI, React and Electron as **banned** — and
  since forbidden beats used, `mui-design-system` would have been withheld from the one project that
  pins MUI 9.5.0. The Stack heading now wins outright.
- **A forbidden bullet's explanation names the technology the project chose instead** — *"No
  Tailwind, no shadcn/ui. **MUI 9 is the recorded UI foundation**"*. Tokenising the whole bullet
  banned MUI in the project that had just declared it. Only the token that **heads** each negated
  list item is read, so "No raw MUI" bans nothing while "No Tailwind CSS, shadcn/ui" bans both.
- **A project's `## Skills` section lists skill filenames.** Reading it as evidence of the stack made
  `mui-design-system.skill.md` *prove* MUI — a loop in which a project's own inventory justified
  every entry in it. That section is now excluded from the prose rung.

A fourth rule keeps the reconciliation honest: **only a declared or measured stack may cancel a
prohibition — never the prose rung.** Otherwise a project writing *"we do not use Tailwind"* would
mention Tailwind, putting it in the stack, deleting the ban, and copying the Tailwind skill back in.

---

## 4. The delivery guard — the selector is only a control if the writer uses it

Two writers copy into `_skills/`: `Sync-Skills` (module) and `Sync-SkillsInline` (GUI). Each used to
hold its own `Get-ChildItem … *.skill.md` loop. Restoring that loop is a one-line edit no test would
have caught — every planner test would still pass, because they test the planner and not its caller.

So a third invariant now walks the PowerShell source: **every function that writes `_skills/` must
invoke `plan-skills.js` and must not enumerate `*.skill.md` for copying.** It carries its own reversal
proof — the removed loop is re-injected in the test and must fail.

---

## 5. What this does NOT do — the finding worth your attention

**The machine-global pools still carry all 20.** Step 2 of the sync symlinks every skill into
`~/.config/opencode/skills/` and `~/.qoder/skills/` — those tools' real discovery paths. That is a
*shared pool*, not a project mirror, and it is a different surface with a different rule.

The consequence is real and should be decided deliberately:

- For the **project-local** `_skills/` mirror, the filter now works: a project receives 12–16 of 20.
- For **opencode and Qoder**, which discover skills from the global pool, the filter achieves
  nothing — those tools still see all 20, including the ones this project must not use.

Filtering the project mirror while the global pool stays unfiltered is **half a fix**. The options,
none of which is obviously right:

1. **Leave the pool whole and rely on `appliesTo` as a per-project exclusion list.** The pool is
   shared by every project on the machine, so it cannot be filtered per project; instead the
   `## Skills` block an agent reads would say which rows do not apply. This is what the generated
   block already does.
2. **Stop installing into the global pools; install per project** (`.claude/skills/`,
   `.github/instructions/`). Correct per project, but it is the deferred S4 step and it changes what
   two working tools currently see.
3. **Keep both and accept the redundancy**, documenting that the pool is a superset.

This is a decision for the skills-review session, not something to change unilaterally — the pool is
the only reason two tools notice skills at all today.

---

## 6. The debt this creates

`appliesTo` is declared on **1 of 20** skills. Every other skill's scope is *inferred* from its
existing `tags` against a curated technology vocabulary, and the planner says so on every such row
(`scope from tags — declare appliesTo to make this explicit`).

Inference is a fallback, not an answer. A skill whose tags name no technology is treated as
**stack-agnostic** and copied everywhere — which is right for `code-review` and would be wrong for a
skill whose tags happen to miss its real dependency. `npm run audit-friction` reports the count
(`9 inferred from tags · 11 stack-agnostic` on a mirrored project) so the review session can close it.

**An `appliesTo` value the vocabulary does not know is inert, not universal** — `appliesTo: [mooi]`
resolves to nothing and `npm run audit` fails it as an UNRESOLVABLE appliesTo. The failure mode this
avoids is a typo quietly widening a skill to every project.

---

## 7. Files changed

| File | Change |
| --- | --- |
| `scripts/lib/tech-tokens.js` | new — the curated technology vocabulary, shared by both sides |
| `scripts/lib/stack-profile.js` | new — the three-rung reader, with the reconciliation rules |
| `scripts/lib/plan-skills.js` | new — `planSkills` / `applyPlan`, the fit rule and the prune |
| `scripts/plan-skills.js` | new — CLI (`--apply`, `--no-prune`, `--json`, `--quiet`, `--help`) |
| `scripts/tests/plan-skills.test.js` | new — 25 tests, including the delivery guard and 2 reversal proofs |
| `scripts/render-skills-index.js` | the generated block now states the selection rule |
| `skills/INDEX.md` | regenerated |
| `scripts/GuidelineSync.psm1`, `sync-manager.ps1` | both delivery paths delegate; failure is loud, never a copy-all fallback |
| `scripts/audit-friction.js` | reports inferred-scope skills as debt |
| `scripts/audit-rules.js` | fails an UNRESOLVABLE `appliesTo` |
| `docs/repo-meta/skill-design-patterns.md` | the `appliesTo` contract |
| `package.json` | `plan:skills` |

**Gate: `npm run validate` exits 0 — 253 tests, 0 failures.**

---

## Cross-References

- **Preceded by:** `SKILLS_ACTIVATION_AUDIT_AND_PROPOSAL_2026-10-12.md` — whether skills are noticed
  at all; this document answers the follow-up, which ones should be delivered
- **Implemented by:** `guidelines/global-configs/scripts/plan-skills.js` and its `lib/`
- **Rule owned by:** `guidelines/global-configs/scripts/lib/plan-skills.js` — the sync delegates,
  and a test walks the PowerShell to prove it
- **Contract for authors:** `docs/repo-meta/skill-design-patterns.md` §Front-Matter Contract
- **Live decision, always:** `npm run plan:skills`
