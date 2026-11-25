# Skills Best-Practice Conformance Review — Are the Mirrored Skills Conformant and Current?

> Historical record — this review was written for the 2026-10-13 repo snapshot and reflects the
> pre-migration state. The current source-of-truth repo is the generated `guidelines/global-configs/skills/<name>/SKILL.md` layout and the generated `skills/INDEX.md`; this document is not the active implementation contract.

**Date:** 2026-10-13 · **Scope:** the 20 skills in `guidelines/global-configs/skills/` and the
`_skills/` mirror they are copied into · **Baseline:** the Agent Skills open standard
(`agentskills.io/specification`) + Anthropic's Agent Skills engineering guidance
(`anthropic.com/engineering`, 2025-10-16) · **Status:** read-only review + proposal. No skill,
guard, manifest, fragment or project file was modified.

---

## 1. The question, and the short answer

> Review the skills that are mirrored into destination projects, compare them to the best practices
> and the popular skills format, and say what it takes to reach perfect, current skill rules.

**Short answer:** the content of the 20 skills is strong — every one declares a valid `name`, a
non-empty trigger `description`, and a complete anatomy (Trigger → Load Guidelines → Role →
Workflow → Output Format → Anti-Patterns → Key Takeaways). What is **not** current is the
**packaging**: the source ships the flat `_skills/<name>.skill.md` layout with four non-standard
front-matter keys, while the standard (and, measured today, the destination projects' *own*
`.qoder/skills/` directories) use `<name>/SKILL.md` with only `name` + `description`. The central
repo is therefore **behind its own consumers** — and because the two layouts are hand-migrated
copies, they will drift.

There are **nine conformance gaps (C1–C9)** and **four delivery gaps (D1–D4)**. None is a content
defect; all are format, metadata, or distribution defects. The fix is a packaging migration plus
three small guards, not a rewrite of 20 documents.

---

## 2. What is actually mirrored today (measured 2026-10-13)

| Fact | Measurement |
|---|---|
| Skills in source | **20** (`guidelines/global-configs/skills/*.skill.md`) |
| Registered projects | **7** (`sync-projects.json`) |
| Projects carrying `_skills/` | **6 of 7** — `Graduate-Affairs-Management-System-GAMS` has **no `_skills/`** at all |
| Skills per project | **20 in every one** — the `plan-skills.js` filter (shipped 2026-10-13) is **not yet applied**; `npm run plan:skills` says 12–16 per project |
| `name` valid (a–z/0–9/hyphen, ≤64, matches file stem) | **20 / 20** |
| `description` present, 71–163 chars, starts "Activate when …" | **20 / 20** |
| `appliesTo` declared | **1 / 20** (`mui-design-system`) — the other 19 infer scope from `tags` |
| `## Cross-References` heading (this repo's own skill contract) | **3 / 20** — present in `architect`, `firestore-cost-optimization`, `implementation-plan`; **17 carry a bare bullet list instead** |
| Size | 108–267 lines (spec limit < 500 ✓); 956–**4,267** est. tokens — `firestore-cost-optimization` is at **85 % of the < 5,000 recommended body budget** |
| Front-matter keys used | `name, description, status, scope, tags` (+ `appliesTo` ×1) |
| **Mirror drift** | `mui-design-system.skill.md` in `_skills/` is the **old, unloadable** variant (5,806 B) vs the fixed source (5,978 B) — the mirror ships the version that could never fire |
| `INDEX.md` | present in source, deliberately **not** copied to `_skills/` (correct — it is a source-only artifact) |
| Destination projects' own skill store | **`.qoder/skills/<name>/SKILL.md`** — pcms has **7** skills, midad has **11**, both in the **standard layout** with **only `name` + `description`** front-matter. pcms's `AGENTS.md` labels `_skills/<name>.skill.md` *"Legacy store … deprecated, migrate to `.qoder/skills/`."* |

---

## 3. The best-practice baseline

**The open standard** (agentskills.io/specification, fetched 2026-10-13):

- A skill is a **directory** containing at minimum **`SKILL.md`**; optional `scripts/`,
  `references/`, `assets/`.
- `name` — required, **1–64 chars**, `a-z 0-9 -` only, no leading/trailing hyphen, no `--`, and
  **must match the parent directory name**.
- `description` — required, **1–1024 chars**, describes **what the skill does AND when to use it**,
  with keywords that help an agent match the task.
- Optional: `license`; `compatibility` (≤500 chars); `metadata` (a **map** of string keys);
  `allowed-tools` (experimental).
- **Progressive disclosure:** metadata (~100 tokens, always loaded) → `SKILL.md` body
  (**< 5,000 tokens recommended**, loaded on activation) → `references/`/`scripts/`/`assets/`
  (loaded only on demand). Keep `SKILL.md` **under 500 lines**; references one level deep.

**Anthropic's guidance** (2025-10-16): the `name` and `description` of every installed skill are
pre-loaded into the system prompt at startup — *"Claude will use these when deciding whether to
trigger the skill."* Structure for scale: when `SKILL.md` grows unwieldy, split detail into
referenced files; watch the `name`/`description` most closely.

**The fleet's own migrated copies already meet this bar.** midad's `code-review/SKILL.md` reads:

> `description: Professional code review for correctness, security, consistency, and maintainability. Use when reviewing code, checking PRs, or auditing code quality. Triggers on "review this code", "code review", "check this PR".`

That is the standard's "what + when + keywords" shape. The source's version is *when-only*
(`Activate when user provides code for review…`). **The source is the laggard.**

---

## 4. Conformance findings (C1–C9)

**C1 — Layout is non-standard, and it is the gap that matters most.**
Source is `skills/<name>.skill.md`; the standard is `<name>/SKILL.md`. Consequence: **no native
skill loader** (Claude Code, opencode, Qoder) can discover the repo's skills *as shipped*. The two
tools that do work today (`~/.config/opencode/skills`, `~/.qoder/skills`) work because someone
hand-copied the pool into the directory layout. That hand-copy is exactly the drift risk the mirror
is supposed to eliminate — and it has already drifted (D2).

**C2 — The `.skill.md` extension is non-standard.** The standard requires the file be named
`SKILL.md`. A loader that scans for `SKILL.md` finds nothing in `_skills/`.

**C3 — Four non-standard top-level front-matter keys.** `status`, `scope`, `tags`, `appliesTo` are
not in the spec's field set (`name`, `description`, `license`, `compatibility`, `metadata`,
`allowed-tools`). The spec's escape hatch is a `metadata:` **map** — so these belong *under*
`metadata:`, not beside `name:`. A strict validator (`skills-ref validate`) would reject them.

**C4 — `description` is when-only.** All 20 begin "Activate when …". The standard wants what + when
+ keywords. The repo's own generated `INDEX.md` already reads as a list of conditions, which is
useful for a human, but a *native* loader only sees the string — and it does not say what the skill
does.

**C5 — 17 of 20 lack the `## Cross-References` heading** this repo's own contract requires
("Each `.skill.md` file … MUST carry YAML front-matter and a `## Cross-References` footer"). The
references are there as a trailing bullet list; only the heading is missing. `render:index` does not
read skills, so nothing catches it.

**C6 — No progressive disclosure: 0 of 20 ship `references/`, `scripts/` or `assets/`.**
`firestore-cost-optimization` (4,267 tokens) embeds a paste-ready ESLint rule and a census-test
skeleton inline — precisely the material the standard says to move into `scripts/` and `references/`
so the body stays lean. It is the one skill nearest the < 5,000-token ceiling.

**C7 — `appliesTo` on 1 of 20.** The selection rule lives in an inference from `tags` for 19
skills. This is counted debt (`npm run audit:friction` reports it), not a silent failure — but it is
the input `plan-skills.js` trusts, so an inferred scope is a weaker guarantee than a declared one.

**C8 — No `license`, no `metadata.version`, no `compatibility`.** "Is this copy current?" cannot be
answered from a skill file; it is answered only by the sync hash. A `metadata.version` would make a
stale copy self-evident.

**C9 — Three skills reference project-local paths that do not exist in a fresh project.**
`bidirectional-docx-rtl` and `docx-per-paragraph-language` point at
`packages/backend/src/modules/export/serializers/docx-serializer.service.ts`;
`firestore-cost-optimization` and `firebase-firestore-practices` point at `.agents/skills/…`. In
any destination project these are dangling — the standard says references should be relative to the
skill root and resolve.

---

## 5. Delivery findings (D1–D4)

**D1 — The filter shipped but was never applied.** All 20 skills sit in all 6 projects that carry
`_skills/`, including `rtl-shadcn-setup`, `shadcn-design-system` and `tiptap-tailwind-reset` in
MUI/Tailwind-forbidden projects. `npm run plan:skills --apply` has not been run against the fleet.

**D2 — The mirror carries a stale, unloadable skill.** `mui-design-system.skill.md` in `_skills/` is
the pre-fix copy (no `name`, no `description`) — the one skill a loader could never surface. The
source was fixed on 2026-10-12; the mirror was not re-synced.

**D3 — One registered project has no `_skills/` at all** (`Graduate-Affairs-Management-System-GAMS`).
Reported, not failed, by `check-sync-drift.js` — which is the right *shape*, but the gap is real.

**D4 — The injected `## Skills` block names no skill.** `sync-manifest.json` §`skills.agentsMdSectionBody`
is a generic one-liner ("Skill files live at `_skills/<name>.skill.md`…"). Measured: pcms
hand-wrote a 953-char project skill list; gs-coordinator-helper hand-wrote a 1,097-char version with
a hard-won stack warning. Four divergent homes for one fact — the same "one fact, many homes"
pattern `docs:census` exists to prevent.

---

## 6. Recommendation — an ordered plan, each step with the control that fails if unlearned

Ordered so each step is a precondition for the next. Every step reuses machinery that already
exists; none requires new doctrine. **Ratchet note:** any change to `AGENTS.md` text must fit the
**4,991 / 5,000** token budget (`fragments/manifest.json`) — a generated block is exempt (like
`MASTER_INDEX`), a new rule is not.

| # | Change | Gap closed | Control that fails if unlearned |
|---|---|---|---|
| **P1** | **Emit the standard layout.** `applyPlan` writes `_skills/<name>/SKILL.md` instead of `_skills/<name>.skill.md`; keep `INDEX.md` source-only. | C1, C2, D2 | `check-sync-drift.js` already hashes `_skills/` — a stale or mis-shaped mirror goes red. |
| **P2** | **Normalise front-matter to the spec.** Keep `name` + `description` top-level; move `status`/`scope`/`tags`/`appliesTo` under `metadata:`. | C3, C8 | Extend `audit-rules.js` (it already parses skill front-matter) to reject an unknown top-level key. Reversal-provable by adding one. |
| **P3** | **Rewrite the 20 `description`s** to what + when + keywords (mirror the fleet's own `.qoder` wording). | C4 | `render:skills` regenerates `INDEX.md`; the diff shows the change, and `check-skills-drift` guards it. |
| **P4** | **Add the missing `## Cross-References` heading to the 17.** | C5 | Extend `audit-rules.js`: a skill whose last `##` section is not `Cross-References` fails `npm run audit`. |
| **P5** | **Split the 3 largest skills** (`firestore-cost-optimization`, `docx-per-paragraph-language`, `bidirectional-docx-rtl`) into `SKILL.md` + `references/` + `scripts/`. | C6, C9 | A size guard: a `SKILL.md` body over ~500 lines or ~4,500 tokens fails, with the reversal proof being the pre-split file. |
| **P6** | **Declare `appliesTo` on the remaining 19** (or keep the counted inference). | C7 | `audit:friction` already counts inferred scopes — the number is the ratchet. |
| **P7** | **Apply the filter and re-sync the fleet.** `npm run plan:skills --apply`, then re-sync all 7; fix the GAMS gap. | D1, D2, D3 | `npm run plan:skills` prints the decision before it is applied; `sync:drift` verifies after. |
| **P8** | **Render the real skill table into the injected `## Skills` block** (one renderer, two consumers — `render:skills --emit` already exists). | D4 | `check-drift` guards generated content; the block is derived, so it is not a second home. |

**Highest leverage, lowest risk, if you want one step today: P1 + P7.** P1 is one function in
`plan-skills.js`; P7 is a re-run. Together they make every destination project discover the skills
through a native path *and* stop shipping the wrong ones — the two failures that make every other
improvement unreachable.

**Cost, stated plainly.** P1 changes the on-disk shape of a gitignored mirror, so nothing committed
breaks; but any hand-written doc that points at `_skills/<name>.skill.md` (the injected `## Skills`
line, gs-coordinator-helper's paragraph, pcms's "legacy store" note) must be updated in the same
change or it becomes a second, wrong home. P2 moves four keys into `metadata:` — `plan-skills.js`,
`render-skills-index.js`, `audit-rules.js` and `audit-friction.js` all read them, so all four move
in lockstep or the selector silently reads nothing.

---

## 7. What this review did not do

Nothing was changed. This is a read-only comparison of the source skills, the `_skills/` mirror, the
destination projects' `.qoder/skills/` stores, and the current Agent Skills standard. Implementing
any of P1–P8 touches the fragment pipeline, the sync module, three guards, the manifest and 20
skill files — all gated by `npm run validate` — and is a separate, planned change with its own
decision number.

---

## Cross-References

- **Reviewed:** `global-configs/skills/*.skill.md` (20) and the `_skills/` mirror in 6 projects
- **Baseline:** `https://agentskills.io/specification`; `https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills`
- **Local contract:** `docs/repo-meta/skill-design-patterns.md`
- **Selection rule:** `global-configs/scripts/lib/plan-skills.js`
- **Prior audit:** `SKILLS_ACTIVATION_AUDIT_AND_PROPOSAL_2026-10-12.md` (F1–F8; S1–S6)
- **Prior decision:** `SKILLS_SELECTION_DECISION_2026-10-13.md` (the per-project filter)
