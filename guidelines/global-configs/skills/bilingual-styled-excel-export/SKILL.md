---
name: bilingual-styled-excel-export
description: Bilingual (Arabic RTL / English) styled Excel workbook export — vendored styled-XLSX writer, language prompt, sheet-level RTL, colored cells, numbers that match the screen. Activate when a user asks to export data to Excel, when an .xlsx must open right-to-left with Arabic labels, when choosing a library for styled XLSX output, or when an export must carry the screen's own numbers. Triggers on "Excel export", "export to xlsx", "styled Excel", "Arabic Excel RTL", "bilingual export", "export button".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: [skill, excel, xlsx, export, rtl, arabic, bilingual, spreadsheet, styling, workbook]
  appliesTo: any
---

# Skill: Bilingual Styled Excel Export

---

## Trigger

Activate when:
- The user asks to export app data to Excel (`.xlsx`) — reports, lists, official snapshots
- The exported workbook must open right-to-left with Arabic labels (or the user picks the file's language at export time)
- The user asks for colored/formatted Excel output (header fills, verdict/approval colors, column widths)
- An export's numbers must equal what the screen shows (same read path, display order)
- The user is choosing a library for styled XLSX output

Do NOT activate when:
- The task is IMPORTING user-uploaded spreadsheets — that is untrusted READ, a different threat model (parsing library + magic-byte MIME checks), not this skill
- The output is CSV — no styling or RTL view exists; plain serialization suffices
- The output is PDF (`arabic-rtl-pdf-export`) or DOCX (`bidirectional-docx-rtl`)

---

## Load Guidelines

This skill is self-contained. Its `references/worked-recipe.md` carries the full worked pipeline (vendoring commands, writer signature, the RTL zip-rebuild, byte-level test snippets) — load it on demand when implementing, not at activation. For the surrounding UI rules: `02-engineering-practices/bidirectional-design-principles.md`.

---

## The One Decision

| Situation | Route |
|---|---|
| Styled WRITE from the app's own data | `xlsx-js-style` (Apache-2.0; same API as SheetJS, writes fills/fonts/borders) — vendored tarball, lazy-imported |
| Untrusted READ of uploaded spreadsheets | SheetJS CE `xlsx` — the maintained line; NEVER the styled fork for untrusted bytes |
| Both directions needed | TWO libraries in ONE IO home: CE reads, the styled fork writes — a header comment states the split |
| No styling or RTL needed | CSV, or a plain CE write — do not add a second dependency |
| Hand-built OOXML, or a paid SheetJS plan for styles | Never |

Why vendored: the styled fork is pinned to an older SheetJS base, so its inherited advisories are reasoned, EXPIRING allowlist entries scoped to the write-only surface — vendoring makes that posture explicit and the lockfile auditable. Why lazy-imported: the fork is ~860 KB minified; a dynamic `import()` makes it its own chunk the main bundle never pays for.

---

## Workflow

1. **Document first** — PRD entry + acceptance criterion before code; a vendored dependency and any inherited-CVE posture are ADR material (an irreversible pin).
2. **Reuse the screen's read path.** The export calls the SAME service functions the page renders; a fresh WHOLE-cohort read, not the loaded slice; scoping (e.g. department) enforced in the query, not the UI; any failed read aborts the export. One output row per display row, in display order.
3. **Gate by capability, prompt for language.** A server-checked (or rules-checked) role capability decides the button — never CSS hiding. A small dialog asks the file language; the CONFIRMED value, not the ambient UI language, picks labels and content.
4. **Write styled cells.** Row 1 a merged title (context name + scope + generation date + row count, Western digits); row 2 headers (dark fill, white bold, thin borders); status columns colored (e.g. verdict green/amber/red); column widths set. Colors are hex constants in the domain service with a comment noting the design-token exception — Excel cannot reference CSS tokens.
5. **Apply the RTL view — and verify the fork keeps it.** `ws['!views'] = [{ RTL: true }]` sets sheet-level right-to-left, but styled forks are known to drop `!views` on write. Verify the BYTES; if the flag is gone, rebuild the stored zip: write the workbook, reopen it as a zip, patch the sheet XML (`<sheetView rightToLeft="1"/>`), repack — a reader round-trips the result.
6. **Name the file for its content.** `<subject>-<scope>-<lang>-<DD-MM-YYYY>.xlsx` so downloads self-describe.

## Non-Negotiables

1. **Export is WRITE, import is READ — never conflate the surfaces.** No row cap on an export of the app's own data (completeness is the requirement); every untrusted byte still enters only through the CE read path with magic-byte checks.
2. **The fork writes only what the app owns.** No user-supplied strings become formulas or file paths; no user-controlled scope value reaches the query unvalidated.
3. **Per-cell language fallback:** file-language content first, the other language as fallback — per CELL (a name in Arabic falls back to its English form inside an Arabic file), never per file.
4. **Verify the artifact's bytes, not the writer's promises.** Unit tests parse the produced zip (central directory + `zlib.inflateRawSync` — zero new dependencies) and assert `rightToLeft="1"` present for Arabic / absent for English, header labels, and style references.
5. **The main bundle does not pay.** The writer is a dynamic import asserted to be its own lazy chunk by the project's bundle verification.
6. **A generated file's NAME is user-facing copy.** No internal identifiers — a Firestore auto-id in a file name is unreadable noise the office cannot act on (shipped once, owner rejected it the same day). Name the human-readable scope, the file language, and a dashed local `DD-MM-YYYY` date; whatever the name omits (e.g. which cycle), the workbook's title row says.

---

## Before Saying Done

- Mapping fidelity: every column asserted from a constructed domain row (scores, totals, rank, verdict, approval, notes); serial continuity; display order; scope id propagated to the reads; file-name shape.
- Both directions: Arabic file `rightToLeft="1"` with Arabic labels; English file without the flag, English labels; per-cell fallback proven both ways.
- UI: dialog default follows the UI language; confirm emits the chosen value; button visible exactly for the capable roles; out-of-scope roles get a denial, not a hidden button.
- E2E: walk capability → prompt → confirm → a downloaded Blob with size > 0, on the real pages.
- **The one thing no test observes — how the fills and RTL actually look in Excel — is one manual owner check**, recorded as acceptance evidence. Say it is owed, then met.
- Bundle verification re-run: the writer chunk grew, the main chunk did not.

---

## Cross-References

- Worked recipe (vendoring, writer shape, zip-rebuild, test snippets): `references/worked-recipe.md`
- Arabic RTL PDF sibling skill: `../arabic-rtl-pdf-export/SKILL.md`
- DOCX RTL sibling skill: `../bidirectional-docx-rtl/SKILL.md`
- Bidirectional design principles: `02-engineering-practices/bidirectional-design-principles.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repository only; not delivered with this skill)
