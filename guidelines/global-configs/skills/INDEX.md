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
skill assumes; `—` means no stack was declared, so the skill claims to be stack-agnostic — verify
that against its body before applying it.

<!-- GENERATED:skills-index — run `npm run render:skills` -->

**Skills are task-activated.** Scan the `Load when` column when a task starts; when a row
matches, open the linked SKILL.md and follow it. A skill never outranks `AGENTS.md`, and a row
whose `Applies to` does not cover this stack is not applicable — skip it. The trigger here is
terse; the full description lives in the skill file, and a native loader lists these skills in
its own catalog. `_skills/` is the synced, stack-filtered copy of the central corpus (absent
until the first sync); do not keep a hand-maintained copy of a delivered skill in a native
store (`.qoder/skills/`, `.claude/skills/`, …) — it shadows `_skills/` and cannot follow upstream.

| Skill | Load when | Applies to | Status |
|---|---|---|---|
| [arabic-rtl-pdf-export](arabic-rtl-pdf-export/SKILL.md) | Arabic/RTL PDF export through a Chromium print pipeline. Activate when asked to export, print, archive or email a PDF containing Arabic, when Arabic appears as disconnected letters, boxes, reversed digits or misplaced punctuation in a PDF, or when choosing a PDF engine for an Arabic app. Triggers on "Arabic PDF", "RTL PDF", "PDF export", "printToPDF", "Electron PDF", "Arabic invoice PDF". | `any` | Advisory |
| [architect](architect/SKILL.md) | Architecture and system-design review. Use when designing a system, challenging an existing architecture, resolving ambiguous or conflicting requirements, or producing an implementation-ready design spec. Triggers on "design a system", "architect this", "review my design", "stress-test this architecture". | `any` | Advisory |
| [bidirectional-docx-rtl](bidirectional-docx-rtl/SKILL.md) | Bidirectional (RTL/LTR) DOCX generation for Arabic content with the docx npm library. Use when exporting Arabic to Word, when Arabic punctuation, numerals or alignment render wrong, or when touching OOXML w:bidi / w:rtl. Triggers on "DOCX with Arabic", "Word RTL paragraph", "OOXML bidi". | `docx` | Advisory |
| [bilingual-styled-excel-export](bilingual-styled-excel-export/SKILL.md) | Bilingual (Arabic RTL / English) styled Excel workbook export — vendored styled-XLSX writer, language prompt, sheet-level RTL, colored cells, numbers that match the screen. Activate when a user asks to export data to Excel, when an .xlsx must open right-to-left with Arabic labels, when choosing a library for styled XLSX output, or when an export must carry the screen's own numbers. Triggers on "Excel export", "export to xlsx", "styled Excel", "Arabic Excel RTL", "bilingual export", "export button". | `any` | Advisory |
| [code-review](code-review/SKILL.md) | AI code review for correctness, security, consistency, simplicity and maintainability. Use when reviewing a diff or a PR, or when assessing code quality. Triggers on "review this code", "code review", "check this PR". | `any` | Advisory |
| [debug-without-code](debug-without-code/SKILL.md) | Behavioural debugging for people who cannot read code. Use when something is visually broken or misbehaving and the user needs a plain-language diagnosis from screenshots and DevTools Console errors. Triggers on "something's broken", "it's not working", "help me debug". | `any` | Advisory |
| [deploy-production](deploy-production/SKILL.md) | Production deployment to free-tier hosting (Vercel, Netlify, Cloudflare Pages). Use when shipping, releasing or going live, including the pre-deploy checklist and the post-deploy smoke test. Triggers on "deploy", "ship to production", "go live", "publish". | `any` | Advisory |
| [docx-per-paragraph-language](docx-per-paragraph-language/SKILL.md) | Per-paragraph and per-run proofing language (OOXML w:lang) for bilingual DOCX. Use when Word spell-check flags the wrong language, when Arabic is marked misspelled inside an English document, or when setting run-level language options. Triggers on "DOCX spell-check wrong language", "OOXML w:lang", "run-level language". | `docx` | Advisory |
| [electron-auto-update](electron-auto-update/SKILL.md) | Electron auto-update and desktop release. Activate when an Electron app must update itself from GitHub Releases or Netlify, when the source repository must stay private while installers are public, when old release assets must be pruned, when a tag-driven release workflow or release-notes feed must be built, or when update notes show HTML, wrong language, or unbilled full-installer downloads. Triggers on "electron auto-update", "electron-updater", "latest.yml", "update feed", "release notes", "code signing", "prune old releases". | `electron` | Advisory |
| [firebase-emulator-windows-console](firebase-emulator-windows-console/SKILL.md) | Activate when Firebase Local Emulator Suite tests on Windows open a Java/JDK terminal, a Node/Functions-runtime console, or any other emulator console popup, or when making emulator tests run without that popup while preserving test output and behavior. Triggers on "Firebase emulator popup", "Java terminal during tests", "node.exe popup during emulator tests", "Functions runtime console", "hide emulator console", "firebase emulators:exec window". | `firebase` | Advisory |
| [firebase-firestore-practices](firebase-firestore-practices/SKILL.md) | Firebase and Cloud Firestore engineering practices — data modelling, modular SDK usage, queries and indexes, least-privilege security rules, Cloud Functions triggers, and emulator testing. Use when writing or reviewing any Firestore data layer, rules file or trigger. | `firebase` `firestore` | Advisory |
| [firestore-cost-optimization](firestore-cost-optimization/SKILL.md) | Firestore and Firebase Hosting cost control — minimising reads, writes and deletes, staying inside the free tier, and cutting hosting download volume. Use when a backend bills per operation, when setting up or deploying a Firebase project, or when a bill or a quota is a concern. | `firebase` `firestore` | Advisory |
| [first-project-setup](first-project-setup/SKILL.md) | Zero-to-running project bootstrap for a first-time vibecoder. Use when starting a new project from scratch or when the user asks how to begin. Covers scaffolding, Git, the constitution files, the local CI hooks, and the first feature. | `any` | Advisory |
| [implementation-plan](implementation-plan/SKILL.md) | Execution-optimised implementation plans for an AI agent — vertical slices, ordered tasks, per-task validation and a completion checklist. Use when a feature, PRD or spec needs a step-by-step execution plan. Triggers on "create a plan", "break this down into tasks", "implementation plan". | `any` | Advisory |
| [inno-setup](inno-setup/SKILL.md) | Windows installer packaging with Inno Setup. Use when bundling a desktop, Electron or web-to-desktop app as a distributable .exe installer, including shortcuts, architecture detection and uninstall support. Triggers on "create installer", "Windows installer", "package as exe". | `inno-setup` | Advisory |
| [mui-design-system](mui-design-system/SKILL.md) | Activate when a project's stack is MUI (v9; v7 legacy) — design-system standards for bilingual (RTL/LTR) apps: theme composition and color schemes, shared components over raw primitives, design tokens, portal and aria rules, dialog focus restoration, high-contrast mode and WCAG 2.1 AA. | `mui` | Advisory |
| [performance-audit](performance-audit/SKILL.md) | Performance audit and profiling — Core Web Vitals, bundle size, render counts, and API/database latency measured against explicit budgets. Use when something is slow, before optimising, or when reviewing a PR for performance regressions. Triggers on "this is slow", "optimize this", "performance review". | `any` | Advisory |
| [refactoring](refactoring/SKILL.md) | Safe, incremental refactoring that never changes behaviour. Use when restructuring, cleaning up or simplifying existing code, with tests as the contract that must keep passing. Triggers on "refactor this", "clean up this code", "improve this structure". | `any` | Advisory |
| [rtl-shadcn-setup](rtl-shadcn-setup/SKILL.md) | RTL/Arabic-first project setup with shadcn/ui and Tailwind CSS v4 — DirectionProvider, CSS logical properties, Arabic typography, i18n, and dual-direction testing. Use when starting an Arabic or bilingual application on shadcn/ui. | `shadcn` `tailwind` | Advisory |
| [security-audit](security-audit/SKILL.md) | Security audit against the OWASP Top 10 — attack-surface inventory, authentication and authorisation review, dependency audit and secrets check. Use when reviewing code for vulnerabilities, after writing auth code, or before a production deploy. Triggers on "security review", "check for vulnerabilities". | `any` | Advisory |
| [shadcn-design-system](shadcn-design-system/SKILL.md) | shadcn/ui + Tailwind CSS v4 design-system standards for bilingual applications — shared components over raw primitives, Tailwind logical properties, portal direction, dark mode and WCAG 2.1 AA. Use in any project whose stack is shadcn/ui. | `shadcn` | Advisory |
| [test-generation](test-generation/SKILL.md) | Behavioural test generation — happy path, edge cases, error cases and auth boundaries, using the project's existing test framework. Use when code needs tests or coverage. Triggers on "write tests for this", "add test coverage", "generate tests". | `any` | Advisory |
| [tiptap-tailwind-reset](tiptap-tailwind-reset/SKILL.md) | Fixing invisible rich-text formatting in TipTap v3 + Tailwind CSS v4, where Preflight strips browser defaults from ProseMirror content. Use when headings, lists or blockquotes render as plain text, or when useEditor recreates the editor on every render. | `tiptap` `tailwind` | Advisory |
| [unsaved-changes-protection](unsaved-changes-protection/SKILL.md) | Unsaved-changes protection for forms — dirty-state tracking, route blockers, dialog close guards and multi-tab aggregation. Use when generating or modifying any form that can lose unsaved work. Triggers on "unsaved changes", "dirty state", "prevent accidental navigation". | `any` | Advisory |

<!-- /GENERATED -->

---

## Cross-References

- **Generated from:** the `name`, `description` and `appliesTo` front-matter of every skill in this directory — one `<name>/SKILL.md` per skill
- **Applied by:** `AGENTS.md` §Skills — the task-activation inventory this table serves
- **Depends on:** `skill-design-patterns.md` — the front-matter contract every skill must satisfy
