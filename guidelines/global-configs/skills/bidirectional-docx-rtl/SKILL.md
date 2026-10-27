---
name: bidirectional-docx-rtl
description: Bidirectional (RTL/LTR) DOCX generation for Arabic content with the docx npm library. Use when exporting Arabic to Word, when Arabic punctuation, numerals or alignment render wrong, or when touching OOXML w:bidi / w:rtl. Triggers on "DOCX with Arabic", "Word RTL paragraph", "OOXML bidi".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, docx, rtl, bidirectional, arabic
  appliesTo: docx
---

# Skill: Bidirectional DOCX Generation for Arabic/RTL Content

**Companion Skills:** `../docx-per-paragraph-language/SKILL.md` (proofing/spell-check language per-paragraph and per-run)

---

**Activation announcement:** When this skill activates, output in chat: `Skill: bidirectional-docx-rtl activated -- Source: _skills/bidirectional-docx-rtl/SKILL.md`

## Trigger

Activate when:
- User asks to "export Arabic to Word", "DOCX with Arabic text", "RTL in DOCX", "generate Word document with Arabic"
- User reports Arabic text rendering issues in exported DOCX: alignment wrong, punctuation misplaced, numerals reversed, text flow incorrect
- User says "DOCX paragraph bidirectional", "Word RTL paragraph", "OOXML bidi", "w:rtl", "w:bidi"
- Code changes touch DOCX generation via the `docx` npm library and involve Arabic/RTL/Hebrew/Persian content
- User mentions the `docx` library (`npm install docx`) in context of RTL/bilingual document generation
- User reports "left-aligned Arabic in Word" or "right alignment shows as left in DOCX"
- User says "MS Word RTL run command" or "LTR run command" in context of programmatic DOCX generation

Do NOT activate when:
- The document is LTR-only (English, French, etc.) with no Arabic/RTL content
- The task involves only UI rendering (use `../rtl-shadcn-setup/SKILL.md` instead)
- The task involves PDF generation (different OOXML pipeline via LibreOffice)
- User is working with HTML/CSS RTL, not DOCX OOXML
- The task involves spell-check/proofing language — use `../docx-per-paragraph-language/SKILL.md` instead

---

## Load Guidelines

Load full versions from:

1. `02-engineering-practices/bidirectional-design-principles.md` — RTL architecture requirements (Normative)
2. `05-stack-guides/rtl-tech-stack.md` — RTL tech stack, numeral policy, bilingual rules (Normative)

Also reference the working implementation in:
- `packages/backend/src/modules/export/serializers/docx-serializer.service.ts` — Primary DOCX serializer with full RTL handling
- `packages/backend/src/modules/export/compile/compile.service.ts` — Compile service (direction normalization)
- `packages/backend/src/modules/export/compile/compiled-document.interface.ts` — Block type definitions with direction/alignment

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are an OOXML/bidirectional text specialist for the `docx` npm library (v9.7.0+). You handle Arabic-first DOCX generation with three-layer RTL support: paragraph-level `<w:bidi/>`, run-level `<w:rtl/>`, and alignment-aware `<w:jc>` mapping. You understand that Word's rendering engine interprets OOXML elements differently when `<w:bidi/>` is present and account for this in code generation. You distinguish between UI-layer RTL (CSS logical properties) and document-layer RTL (OOXML properties).

---

## Workflow

1. **Assess the document's direction requirements:** Is it fully Arabic/RTL, fully LTR, or bilingual (mixed-direction paragraphs)? Each paragraph carries its own `direction: "rtl" | "ltr"` from the compiled document model.

2. **Apply paragraph-level bidirectional (`<w:bidi/>`):**
   ```typescript
   new Paragraph({
     bidirectional: block.direction === "rtl",
     alignment: this.mapAlignment(block.alignment, block.direction),
     children: runs,
   })
   ```
   Set `bidirectional: true` on EVERY paragraph that contains RTL content — paragraphs, headings, table cells, list items, blockquotes, footnotes, endnotes. This is `<w:bidi/>` in `<w:pPr>`.

3. **Apply run-level RTL (`<w:rtl/>`):**
   ```typescript
   new TextRun({
     text: content,
     rightToLeft: block.direction === "rtl",
     bold: isBold,     // optional formatting
     italics: isItalic, // optional formatting
   })
   ```
   The `docx` library supports `rightToLeft?: boolean` on every `TextRun`. This produces `<w:rtl/>` in `<w:rPr>`. Without this, Arabic punctuation, numerals, and neutral characters render incorrectly even if `<w:bidi/>` is set at the paragraph level. Apply to ALL `TextRun` instances, including those wrapped in `ExternalHyperlink` and fallback runs.

4. **Flip alignment values for RTL paragraphs:**
   Word with `<w:bidi/>` inverts the physical interpretation of `w:jc` values. `w:jc w:val="right"` with `w:bidi` renders as LEFT-aligned, and vice versa. Implement a `mapAlignment()` that flips for RTL:
   ```typescript
   private mapAlignment(alignment?: string, direction?: string): AlignmentType {
     if (alignment === "center") return AlignmentType.CENTER;
     if (alignment === "justify") return AlignmentType.JUSTIFIED;

     if (direction === "rtl") {
       // Flip: Word with w:bidi treats left/right as physical absolute positions
       if (alignment === "left") return AlignmentType.RIGHT;
       if (alignment === "right") return AlignmentType.LEFT;
       return AlignmentType.LEFT;   // default RTL → Word renders as right-aligned
     }

     // LTR: direct mapping (no inversion)
     if (alignment === "left") return AlignmentType.LEFT;
     if (alignment === "right") return AlignmentType.RIGHT;
     return AlignmentType.LEFT;
   }
   ```

5. **Handle multi-paragraph footnote content:**
   Parse footnote HTML for `<p>` tags with `dir` and `text-align` attributes. Apply per-paragraph `bidirectional`, `rightToLeft` on runs, and flipped alignment:
   ```typescript
   const dirMatch = attrs.match(/dir="(rtl|ltr)"/i);
   const paraDir = dirMatch?.[1];
   const alignMatch = attrs.match(/text-align:\s*(left|right|center|justify)/i);
   const paraAlign = alignMatch?.[1];

   new Paragraph({
     bidirectional: paraDir ? paraDir === "rtl" : isRTL,
     alignment: paraAlign
       ? this.mapAlignment(paraAlign, paraDir || (isRTL ? "rtl" : "ltr"))
       : this.mapAlignment(undefined, paraDir || (isRTL ? "rtl" : "ltr")),
     children: runs,
   })
   ```

6. **Always guard against empty paragraph children:** Every `Paragraph` must have at least one non-empty child `TextRun`. Fall back to `new TextRun({ text: " " })` when runs are empty. Empty paragraphs corrupt DOCX files in some Word versions.

7. **Verify the generated OOXML:** Extract the `.docx` (ZIP), inspect `word/document.xml`. Confirm `<w:bidi/>` in `<w:pPr>`, `<w:rtl/>` in `<w:rPr>`, and correct `<w:jc w:val="left"/>` for RTL paragraphs (which renders as right-aligned in Word).

8. **Set per-paragraph/run proofing language:** RTL direction alone doesn't set spell-check language. Use `getRunLanguage(rightToLeft)` to add `w:lang` to paragraph `run` defaults and individual `TextRun` instances. See companion skill `../docx-per-paragraph-language/SKILL.md` for the complete implementation.

---

## Output Format

```markdown
## RTL DOCX Generation — Summary

### Document Setup
- Document direction: [rtl / ltr]
- Block types with RTL: [paragraphs / headings / tables / lists / blockquotes / footnotes]

### Three-Layer RTL Applied
- [ ] Paragraph `<w:bidi/>` — set on all RTL blocks
- [ ] TextRun `<w:rtl/>` — set on all runs in RTL blocks (bold, italic, underline, strike, code, hyperlink, color spans, plain text)
- [ ] Alignment flipped — `mapAlignment()` inverts left/right for RTL blocks

### Fourth Layer: Proofing Language
- [ ] Paragraph `run` defaults with `getRunLanguage()` — RTL → `{ value: "en-US", bidirectional: "ar-SA" }`, LTR → `{ value: "en-US" }`
- [ ] Per-run `language` on all TextRun/Run instances in `inlineHtmlToRuns()`
- See `../docx-per-paragraph-language/SKILL.md` for full details

### OOXML Verification
- [ ] `<w:bidi/>` present in all RTL paragraph `<w:pPr>`
- [ ] `<w:rtl/>` present in all RTL run `<w:rPr>`
- [ ] `<w:jc w:val="left"/>` for default RTL (renders right-aligned in Word)
- [ ] `<w:jc w:val="right"/>` for explicit left-aligned RTL (renders left-aligned in Word)
- [ ] `<w:lang>` set per-paragraph and per-run (not at document level)

### Edge Cases Handled
- [ ] Mixed-direction paragraphs (per-paragraph direction)
- [ ] Footnotes/endnotes with formatted multi-paragraph content
- [ ] Tables with RTL cell content
- [ ] Empty paragraph guard (space TextRun fallback)
- [ ] Bilingual documents (LTR paragraphs use direct alignment, not flipped)
```

---

## Anti-Patterns

- Do NOT set `bidirectional: true` only at the document level — each paragraph that is RTL needs its own `<w:bidi/>`.
- Do NOT omit `rightToLeft: true` on `TextRun` — `<w:bidi/>` alone does not fix punctuation placement or numeral rendering in Word.
- Do NOT use physical alignment values directly for RTL: `AlignmentType.RIGHT` with `<w:bidi/>` renders as LEFT in Word. Always flip via `mapAlignment()`.
- Do NOT use `alignment === "right"` as a heuristic for Arabic — use `direction === "rtl"` for alignment decisions.
- Do NOT hardcode `AlignmentType.RIGHT` for RTL defaults in footnote/endnote paragraphs — route through `mapAlignment()` consistently.
- Do NOT assume `left`/`right` in OOXML are logical — they are physical positions. The `<w:bidi/>` paragraph property does NOT automatically flip them.
- Do NOT create `Paragraph` with empty `children` array — always include at least one `TextRun({ text: " " })` fallback.
- Do NOT use document-level `rightToLeft` as a proxy for per-run RTL — English runs in an Arabic document should NOT have `<w:rtl/>`.
- Do NOT confuse CSS logical properties (`start`/`end`) with OOXML `<w:jc>` values — OOXML uses `left`/`right` which are always physical.
- Do NOT set a single document-level language for bilingual documents — language must be per-paragraph and per-run. See `../docx-per-paragraph-language/SKILL.md`.

---

## Key Takeaways

1. `bidirectional: true` on `Paragraph` sets `<w:bidi/>` — controls paragraph-level text flow and indent mirroring.
2. `rightToLeft: true` on `TextRun` sets `<w:rtl/>` — controls punctuation, numerals, and character-level bidi algorithm. Apply to ALL formatted and unformatted runs.
3. Alignment values MUST be flipped for RTL: app "right" → OOXML `LEFT`, app "left" → OOXML `RIGHT`. Center and justify are direction-independent.
4. Proofing language (`w:lang`) is a separate fourth layer — set per-paragraph and per-run via `getRunLanguage()`. Document-level language breaks bilingual spell-check. See companion skill.
5. Per-paragraph direction from the compiled document model drives `bidirectional`, `rightToLeft`, AND language decisions.
6. Footnotes require the same three-layer treatment — parse their HTML, extract direction/alignment per `<p>`, apply same Paragraph/TextRun pattern.
7. Always guard against empty paragraph children with a space `TextRun` fallback.
8. Verify generated OOXML by unzipping the `.docx` and inspecting `word/document.xml` for all three layers.
9. LTR paragraphs use direct alignment mapping (no flipping) — the mapAlignment method handles both directions correctly.
10. The `docx` npm library (v9.7.0+) supports all three RTL layers natively: `bidirectional` on Paragraph options, `rightToLeft` on Run/TextRun options, and `alignment` via `AlignmentType`.

---

## Cross-References

- Working implementation: `packages/backend/src/modules/export/serializers/docx-serializer.service.ts`
- Compile service (direction normalization): `packages/backend/src/modules/export/compile/compile.service.ts`
- Compiled document interface: `packages/backend/src/modules/export/compile/compiled-document.interface.ts`
- Bidirectional design principles: `02-engineering-practices/bidirectional-design-principles.md`
- RTL tech stack: `05-stack-guides/rtl-tech-stack.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md`
- RTL UI setup skill (for frontend RTL): `global-configs/skills/rtl-shadcn-setup/SKILL.md`
- Per-paragraph/run language skill (fourth layer): `global-configs/skills/docx-per-paragraph-language/SKILL.md`
