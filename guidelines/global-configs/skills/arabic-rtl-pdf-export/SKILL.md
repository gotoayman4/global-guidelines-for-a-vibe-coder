---
name: arabic-rtl-pdf-export
description: Arabic/RTL PDF export through a Chromium print pipeline. Activate when asked to export, print, archive or email a PDF containing Arabic, when Arabic appears as disconnected letters, boxes, reversed digits or misplaced punctuation in a PDF, or when choosing a PDF engine for an Arabic app. Triggers on "Arabic PDF", "RTL PDF", "PDF export", "printToPDF", "Electron PDF", "Arabic invoice PDF".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: [skill, pdf, rtl, arabic, chromium, print, bidi, fonts, paged-media]
---

# Skill: Arabic RTL PDF Export

---

## Trigger

Activate when:
- The user asks to export, print, email, archive or generate a PDF containing Arabic
- Arabic in a PDF shows disconnected letters, boxes, reversed digits, wrong punctuation or wrong alignment
- The user is choosing a PDF library or engine for an Arabic web or Electron app
- Code touches `printToPDF`, `page.pdf(...)`, `window.print`, Gotenberg, or a PDF export route with Arabic content

Do NOT activate when:
- The document is LTR-only with no Arabic content
- The task is DOCX/Word generation — use `bidirectional-docx-rtl`
- The task is on-screen RTL layout only — use `rtl-shadcn-setup` or the RTL tech stack guide
- The task is PDF merging, signing or metadata editing with no text rendering — use a PDF manipulation library

---

## Load First

`05-stack-guides/arabic-rtl-pdf-generation.md`

That file is the normative source for engine choice, full recipes, the verification gate and the anti-pattern table. Read it from `_guidelines/` when the project mirror exists; otherwise use the same path in the central guidelines repository (the location is in the machine's global agent config). If the file cannot be reached, follow the compact rules below and say the guideline was unreachable — do not invent an API.

---

## The One Decision

| Situation | Route |
|---|---|
| Electron app | `webContents.printToPDF()` in the main process |
| Backend or service, or PDF/A / PDF/UA needed | Gotenberg, self-hosted with Docker |
| Build script, CI fixture, automated test | Playwright/Puppeteer `page.pdf()` |
| A human clicks once | `window.print()` → Save as PDF |
| Static HTML in a shell script | Chrome/Chromium `--print-to-pdf` |

Every route renders HTML/CSS in Chromium. That is deliberate: Chromium performs Arabic shaping, UAX #9 bidi ordering and font-subset embedding before it writes the PDF. Do not replace it with a library that draws text itself.

---

## Non-Negotiables

1. **Never let a JS PDF library place Arabic glyphs:** `html2pdf`/`html2canvas`, jsPDF, pdfmake, PDFKit, `@react-pdf/renderer`, `pdf-lib` for text, `wkhtmltopdf`.
2. **Keep logical Unicode.** No manual reversal, no Arabic Presentation Forms (U+FB50–FDFF, U+FE70–FEFF), no tatweel padding for justification.
3. **Self-host the Arabic font.** `@font-face` with `font-display: block`; await `document.fonts.ready`; fail the export if the expected face is not `loaded`. System fonts are absent in CI and containers.
4. **Isolate mixed LTR runs** — IDs, emails, phone numbers, SKUs and Latin names — with `<bdi>`, `dir="auto"`, or `direction: ltr; unicode-bidi: isolate`.
5. **Break pages at rows, not tables:** `tr { break-inside: avoid; }`, `thead { display: table-header-group; }`. A whole-table `break-inside: avoid` overflows or jumps a page.
6. **Pass print options explicitly:** `printBackground: true` and `preferCSSPageSize: true` — both default to `false` in Electron and Puppeteer.
7. **Treat rendered HTML as untrusted:** sanitize it, disable JavaScript where the document does not need it, block private-network requests, and sandbox the renderer.

---

## Before Saying Done

- Shaping: joined letters, correct initial/medial/final forms, lam-alef ligature, positioned tashkeel — no boxes or disconnected forms.
- Bidi: mixed Arabic/Latin/numbers read correctly; punctuation sits at the correct end.
- Font: `pdffonts out.pdf` reports `emb yes` and `sub yes` for the Arabic face, not a fallback.
- Pagination: table header repeats, rows stay intact across page boundaries.
- Text layer: select, copy and search in the target viewer.
- Engine and font versions recorded beside the golden PDF.

---

## Cross-References

- Arabic RTL PDF guideline: `05-stack-guides/arabic-rtl-pdf-generation.md`
- RTL tech stack: `05-stack-guides/rtl-tech-stack.md`
- Bidirectional design principles: `02-engineering-practices/bidirectional-design-principles.md`
- DOCX RTL sibling skill: `global-configs/skills/bidirectional-docx-rtl/SKILL.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repository only; not delivered with this skill)
