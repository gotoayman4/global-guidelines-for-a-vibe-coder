---
status: "Advisory"
scope: "Global"
tags: [skills, index, triggers, generated]
---

# Skill Index — Task-Activated

**What this is.** The one place that says *when* to load each skill, without opening it. Every row is
derived from the skill's own front-matter by `npm run render:skills`; the prose around the table is
hand-written, and the table itself is generated output.

**Why it exists.** A skill's activation trigger lives in its front-matter `description`, which means
the trigger is stored inside the door it guards — an agent has to open the file to learn when to
open the file. Measured 2026-10-12 across the fleet: the `## Skills` section the sync writes into a
project's `AGENTS.md` named **no** skill (zero occurrences of any `<name>.skill.md`), there was no
index inside `_skills/`, and the only inventory that did exist — the generated skills table in
`_index/MASTER_INDEX.md` — sat inside the gitignored `_guidelines/` mirror that no rule points at
for skills. A skill could therefore only be found by guessing its filename, which works for
`code-review` and fails for `firestore-cost-optimization`.

**How to read a row.** `Load when` is the skill's own declared trigger. `Applies to` is the stack the
skill assumes; `—` means no stack was declared, which is a gap to close rather than a licence to
apply the skill anywhere.

<!-- GENERATED:skills-index — run `npm run render:skills` -->

**Every skill here is task-activated.** Before starting a task, scan the `Load when`
column. When a row matches, open that skill and follow it, and announce it in chat as
`Skill: <name> activated` — the announcement is the only thing that makes activation
visible, because no file in the repo can record whether a skill was loaded.

A skill never outranks `AGENTS.md`: where the two disagree, `AGENTS.md` wins. And a row whose
`Applies to` does not cover this project's stack is **not applicable** — skip it rather than
adapting it, because a skill written for a stack this project forbids will contradict the
constitution if it is followed anyway.

**The sync applies the same rule when it copies.** `_skills/` is not the whole pool:
`plan-skills.js` reads each project's `### Stack` table, its `### Forbidden …` list and its
`package.json`, copies only the skills that fit and prunes the ones that no longer do.
`npm run plan:skills` prints that decision for every registered project without touching
anything. A project that declares no stack at all receives everything, because nothing can be
ruled out — the right default for an empty folder, the wrong one for a project that simply
never filled the table in.

| Skill | Load when | Applies to | Status |
|---|---|---|---|
| [architect](architect/SKILL.md) | Architecture and system-design review. Use when designing a system, challenging an existing architecture, resolving ambiguous or conflicting requirements, or producing an implementation-ready design spec. Triggers on "design a system", "architect this", "review my design", "stress-test this architecture". | — | Advisory |
| [bidirectional-docx-rtl](bidirectional-docx-rtl/SKILL.md) | Bidirectional (RTL/LTR) DOCX generation for Arabic content with the docx npm library. Use when exporting Arabic to Word, when Arabic punctuation, numerals or alignment render wrong, or when touching OOXML w:bidi / w:rtl. Triggers on "DOCX with Arabic", "Word RTL paragraph", "OOXML bidi". | `docx` | Advisory |
| [code-review](code-review/SKILL.md) | Professional code review for correctness, security, consistency, simplicity and maintainability. Use when reviewing a diff or a PR, or when assessing code quality. Triggers on "review this code", "code review", "check this PR". | — | Advisory |
| [debug-without-code](debug-without-code/SKILL.md) | Behavioural debugging for people who cannot read code. Use when something is visually broken or misbehaving and the user needs a plain-language diagnosis from screenshots and DevTools Console errors. Triggers on "something's broken", "it's not working", "help me debug". | — | Advisory |
| [deploy-production](deploy-production/SKILL.md) | Production deployment to free-tier hosting (Vercel, Netlify, Cloudflare Pages). Use when shipping, releasing or going live, including the pre-deploy checklist and the post-deploy smoke test. Triggers on "deploy", "ship to production", "go live", "publish". | — | Advisory |
| [docx-per-paragraph-language](docx-per-paragraph-language/SKILL.md) | Per-paragraph and per-run proofing language (OOXML w:lang) for bilingual DOCX. Use when Word spell-check flags the wrong language, when Arabic is marked misspelled inside an English document, or when setting run-level language options. Triggers on "DOCX spell-check wrong language", "OOXML w:lang", "run-level language". | `docx` | Advisory |
| [firebase-emulator-windows-console](firebase-emulator-windows-console/SKILL.md) | Activate when Firebase Local Emulator Suite tests on Windows open a Java/JDK terminal or console popup, or when making emulator tests run without that popup while preserving test output and behavior. Triggers on \"Firebase emulator popup\", \"Java terminal during tests\", \"hide emulator console\", \"firebase emulators:exec window\". | `firebase` | Advisory |
| [firebase-firestore-practices](firebase-firestore-practices/SKILL.md) | Firebase and Cloud Firestore engineering practices — data modelling, modular SDK usage, queries and indexes, least-privilege security rules, Cloud Functions triggers, and emulator testing. Use when writing or reviewing any Firestore data layer, rules file or trigger. | `firebase` `firestore` | Advisory |
| [firestore-cost-optimization](firestore-cost-optimization/SKILL.md) | Firestore and Firebase Hosting cost control — minimising reads, writes and deletes, staying inside the free tier, and cutting hosting download volume. Use when a backend bills per operation, when setting up or deploying a Firebase project, or when a bill or a quota is a concern. | `firebase` `firestore` | Advisory — with an enforced core |
| [first-project-setup](first-project-setup/SKILL.md) | Zero-to-running project bootstrap for a first-time vibecoder. Use when starting a new project from scratch or when the user asks how to begin. Covers scaffolding, Git, the constitution files, the local CI hooks, and the first feature. | — | Advisory |
| [implementation-plan](implementation-plan/SKILL.md) | Execution-optimised implementation plans for an AI agent — vertical slices, ordered tasks, per-task validation and a completion checklist. Use when a feature, PRD or spec needs a step-by-step execution plan. Triggers on "create a plan", "break this down into tasks", "implementation plan". | — | Advisory |
| [inno-setup](inno-setup/SKILL.md) | Windows installer packaging with Inno Setup. Use when bundling a desktop, Electron or web-to-desktop app as a distributable .exe installer, including shortcuts, architecture detection and uninstall support. Triggers on "create installer", "Windows installer", "package as exe". | `inno-setup` | Advisory |
| [mui-design-system](mui-design-system/SKILL.md) | MUI v7+ design-system standards for bilingual (RTL/LTR) applications — shared components over raw primitives, design tokens, portal and aria rules, dialog focus restoration, dark mode and WCAG 2.1 AA. Use in any project whose stack is MUI. | `mui` | Advisory |
| [performance-audit](performance-audit/SKILL.md) | Performance audit and profiling — Core Web Vitals, bundle size, render counts, and API/database latency measured against explicit budgets. Use when something is slow, before optimising, or when reviewing a PR for performance regressions. Triggers on "this is slow", "optimize this", "performance review". | — | Advisory |
| [refactoring](refactoring/SKILL.md) | Safe, incremental refactoring that never changes behaviour. Use when restructuring, cleaning up or simplifying existing code, with tests as the contract that must keep passing. Triggers on "refactor this", "clean up this code", "improve this structure". | — | Advisory |
| [rtl-shadcn-setup](rtl-shadcn-setup/SKILL.md) | RTL/Arabic-first project setup with shadcn/ui and Tailwind CSS v4 — DirectionProvider, CSS logical properties, Arabic typography, i18n, and dual-direction testing. Use when starting an Arabic or bilingual application on shadcn/ui. | `shadcn` `tailwind` | Advisory |
| [security-audit](security-audit/SKILL.md) | Security audit against the OWASP Top 10 — attack-surface inventory, authentication and authorisation review, dependency audit and secrets check. Use when reviewing code for vulnerabilities, after writing auth code, or before a production deploy. Triggers on "security review", "check for vulnerabilities". | — | Advisory |
| [shadcn-design-system](shadcn-design-system/SKILL.md) | shadcn/ui + Tailwind CSS v4 design-system standards for bilingual applications — shared components over raw primitives, Tailwind logical properties, portal direction, dark mode and WCAG 2.1 AA. Use in any project whose stack is shadcn/ui. | `shadcn` | Advisory |
| [test-generation](test-generation/SKILL.md) | Behavioural test generation — happy path, edge cases, error cases and auth boundaries, using the project's existing test framework. Use when code needs tests or coverage. Triggers on "write tests for this", "add test coverage", "generate tests". | — | Advisory |
| [tiptap-tailwind-reset](tiptap-tailwind-reset/SKILL.md) | Fixing invisible rich-text formatting in TipTap v3 + Tailwind CSS v4, where Preflight strips browser defaults from ProseMirror content. Use when headings, lists or blockquotes render as plain text, or when useEditor recreates the editor on every render. | `tiptap` `tailwind` | Advisory |
| [unsaved-changes-protection](unsaved-changes-protection/SKILL.md) | Unsaved-changes protection for forms — dirty-state tracking, route blockers, dialog close guards and multi-tab aggregation. Use when generating or modifying any form that can lose unsaved work. Triggers on "unsaved changes", "dirty state", "prevent accidental navigation". | — | Advisory |

<!-- /GENERATED -->

---

## Cross-References

- **Generated from:** the `name`, `description` and `appliesTo` front-matter of every skill in this directory — one `<name>/SKILL.md` per skill
- **Applied by:** `AGENTS.md` §Skills — the load-and-announce obligation this table serves
- **Depends on:** `skill-design-patterns.md` — the front-matter contract every skill must satisfy
