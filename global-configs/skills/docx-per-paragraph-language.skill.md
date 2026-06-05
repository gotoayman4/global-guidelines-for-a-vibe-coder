---
name: docx-per-paragraph-language
description: Activate when user needs per-paragraph language handling in DOCX documents
---

# Skill: Per-Paragraph/Run Language for Bilingual DOCX Generation

**Status:** Advisory
**Scope:** Global (Task-Type Skill)
**Token Tier:** Compact (~1000 tokens)
**Source:** `global-guidelines-for-a-vibe-coder/global-configs/skills/docx-per-paragraph-language.skill.md`
**Last Updated:** 2026-05-27

---

**Activation announcement:** When this skill activates, output in chat: `Skill: docx-per-paragraph-language activated -- Source: D:\WebApps\global-guidelines-for-a-vibe-coder/global-configs/skills/docx-per-paragraph-language.skill.md`

## Trigger

Activate when:
- User asks about "per-paragraph language in DOCX", "DOCX spell-check wrong language", "Word proofing language per paragraph"
- User reports Arabic text flagged as misspelled in Word, English misspelled in Arabic documents, or "everything has red squiggly lines"
- User says "set language per paragraph in DOCX", "OOXML w:lang", "run-level language", "ILanguageOptions"
- Code changes touch DOCX generation and involve proofing/spell-check language at the paragraph or text-run level
- User mentions bilingual DOCX export with mixed Arabic/English paragraphs and spell-check issues
- User modifies the `docx-serializer.service.ts` language-related code or `getRunLanguage()` helper

Do NOT activate when:
- The task involves paragraph direction (RTL/LTR) or alignment — use `bidirectional-docx-rtl.skill.md` instead
- The document is monolingual and spell-check works fine with a single document-level language
- The issue is about text content, not proofing/spell-check language metadata
- User is working with HTML/CSS `lang` attributes, not OOXML `w:lang`
- The task involves font selection or typography, not proofing language

---

## Load Guidelines

Load full versions from:

1. `02-engineering-practices/bidirectional-design-principles.md` — RTL architecture requirements, bilingual defaults (Normative)
2. `05-stack-guides/rtl-tech-stack.md` — RTL tech stack, language/numeral policy (Normative)
3. `bidirectional-docx-rtl.skill.md` — Three-layer RTL DOCX generation (prerequisite knowledge)

Also reference the working implementation in:
- `packages/backend/src/modules/export/serializers/docx-serializer.service.ts` — Primary DOCX serializer with `getRunLanguage()` and per-run/per-paragraph language
- `packages/backend/src/modules/export/compile/compiled-document.interface.ts` — Block type definitions with per-block `direction` (used to derive language)
- `node_modules/docx/dist/file/paragraph/run/language.d.ts` — `ILanguageOptions` type definition

**Guideline base path:** `D:\WebApps\global-guidelines-for-a-vibe-coder/`

---

## Role

You are an OOXML proofing-language specialist for the `docx` npm library (v9.7.0+). You understand that `w:lang` controls spell-check and grammar-check dictionary selection in Microsoft Word, and that a single document-level language breaks proofing for bilingual (Arabic/English) documents. You set language per-paragraph (via paragraph `run` defaults) AND per-text-run (via `TextRun.language`) to ensure Word uses the correct dictionary for each segment of text — Arabic dictionary for RTL paragraphs, English dictionary for LTR paragraphs, and both for paragraphs that mix scripts.

You distinguish between:
- `language.value` (`w:val`) — proofing language for Latin/CJK scripts (e.g., `"en-US"`)
- `language.bidirectional` (`w:bidi`) — proofing language for complex-script/RTL text (e.g., `"ar-SA"`)
- `language.eastAsia` (`w:eastAsia`) — proofing language for East Asian scripts (e.g., `"ja-JP"`)

---

## Workflow

1. **Assess the document's language requirements:** Is it bilingual (Arabic + English)? Does each block carry a `direction` field (`"rtl"` or `"ltr"`)? Language is derived from `direction` — RTL blocks get Arabic proofing, LTR blocks get English proofing.

2. **Remove document-level language from Document styles:**
   Document-level `language` in `styles.default.document.run` applies to ALL runs unconditionally. This breaks spell-check for half the document in bilingual scenarios. Remove it:
   ```typescript
   // BEFORE (wrong — single language for entire document):
   const docx = new Document({
     styles: {
       default: {
         document: {
           run: {
             font: "Times New Roman",
             size: 24,
             language: { value: "en-US", bidirectional: "en-US" },  // REMOVE THIS
           },
         },
       },
     },
   });

   // AFTER (correct — no document-level language):
   const docx = new Document({
     styles: {
       default: {
         document: {
           run: {
             font: "Times New Roman",
             size: 24,
             // language is set per-paragraph and per-run instead
           },
         },
       },
     },
   });
   ```

3. **Create a `getRunLanguage()` helper** that maps direction to `ILanguageOptions`:
   ```typescript
   /**
    * Returns OOXML language options for a run based on text direction.
    * RTL paragraphs: Arabic (complex script) + English (Latin fallback) for bilingual content.
    * LTR paragraphs: English only.
    *
    * The w:lang element controls spell-check and grammar-check dictionary selection in Word.
    */
   private getRunLanguage(rightToLeft: boolean): { value?: string; bidirectional?: string } {
     if (rightToLeft) {
       return { value: "en-US", bidirectional: "ar-SA" };
     }
     return { value: "en-US" };
   }
   ```
   For RTL paragraphs, set BOTH `value` (so any inline English words aren't flagged) and `bidirectional` (so Arabic text gets Arabic spell-check). For LTR paragraphs, set only `value` — Arabic text in LTR paragraphs would correctly be flagged as foreign.

4. **Set language on paragraph `run` defaults:**
   Every `Paragraph` that has a direction should propagate language to its default run properties:
   ```typescript
   const paraRTL = block.direction === "rtl";
   new Paragraph({
     bidirectional: paraRTL,
     run: {
       rightToLeft: paraRTL,
       language: this.getRunLanguage(paraRTL),
     },
     children: runs,
   })
   ```
   This sets the default proofing language for all runs in the paragraph. Individual `TextRun` instances can override this default. Apply this pattern to ALL paragraph-creating methods: `paragraphToDocx`, `headingToDocx`, `tableToDocx` (cell paragraphs), `bulletListToDocx`, `orderedListToDocx`, `blockquoteToDocx`, `footnoteHtmlToParagraphs`, and any fallback/error paragraphs.

5. **Set language on every `TextRun` and `Run`:**
   For maximum accuracy (including mixed-language paragraphs), add `language` to every text run in `inlineHtmlToRuns()`:
   ```typescript
   const runLang = this.getRunLanguage(rightToLeft);
   // Apply to all TextRun instances:
   new TextRun({
     text: content,
     language: runLang,      // <-- per-run language
     rightToLeft,            // <-- run-level RTL
     bold: true,             // any formatting
   })
   // Apply to footnote/endnote reference Runs too:
   new Run({
     style: "FootnoteReference",
     language: runLang,
     rightToLeft,
     children: [new FootnoteReference(noteId)],
   })
   ```
   This covers ALL text run variants: bold, italic, underline, strike, code, hyperlink text, footnote/endnote references, colored spans, and plain text.

6. **Language inheritance hierarchy (highest priority wins):**
   1. Individual `TextRun.language` — overrides everything
   2. Paragraph `run` defaults — overrides styles only
   3. Document `styles.default.document.run.language` — lowest priority, used only as fallback
   
   In our implementation, we remove #3 entirely and rely on #1 and #2.

7. **Handle footnote/endnote content separately:**
   Footnotes and endnotes are separate sub-documents in OOXML. Their paragraphs also need `run` defaults with language:
   ```typescript
   const fnRTL = isRTL;
   const fnRunDefaults = { rightToLeft: fnRTL, language: this.getRunLanguage(fnRTL) };
   new Paragraph({
     children: runs,
     bidirectional: fnRTL,
     run: fnRunDefaults,
   })
   ```

8. **Verify the generated OOXML:** Extract the `.docx` (ZIP), inspect `word/document.xml`. Confirm:
   - No `<w:lang>` in `<w:styles>` default run properties (unless intentionally set as fallback)
   - `<w:lang w:val="en-US" w:bidi="ar-SA"/>` in `<w:rPr>` of RTL paragraph runs
   - `<w:lang w:val="en-US"/>` in `<w:rPr>` of LTR paragraph runs
   - `<w:rPr>` in `<w:pPr>` of RTL paragraphs contains `<w:lang w:val="en-US" w:bidi="ar-SA"/>`

---

## Output Format

```markdown
## Per-Paragraph/Run Language — Summary

### Document Setup
- Document-level language in styles: REMOVED
- Language derivation: direction → language (rtl → ar-SA + en-US, ltr → en-US)
- Language helper: `getRunLanguage(rightToLeft)` returns `ILanguageOptions`

### Language Applied Per-Paragraph
- [ ] paragraphToDocx — `run: { language: getRunLanguage(paraRTL) }`
- [ ] headingToDocx — same
- [ ] tableToDocx (cell paragraphs) — same
- [ ] tableToDocx (fallback) — same
- [ ] bulletListToDocx — same
- [ ] orderedListToDocx — same
- [ ] blockquoteToDocx — same
- [ ] footnoteHtmlToParagraphs (all three Paragraph paths) — same
- [ ] serialize (unsupported block + empty fallback) — same

### Language Applied Per-Run (inlineHtmlToRuns)
- [ ] Bold runs — `language: runLang`
- [ ] Italic runs — `language: runLang`
- [ ] Underline runs — `language: runLang`
- [ ] Strike runs — `language: runLang`
- [ ] Code runs — `language: runLang`
- [ ] Hyperlink runs — `language: runLang`
- [ ] Footnote reference Runs — `language: runLang`
- [ ] Endnote reference Runs — `language: runLang`
- [ ] Footnote fallback — `language: runLang`
- [ ] Color span runs — `language: runLang`
- [ ] Plain text runs — `language: runLang`

### OOXML Verification
- [ ] No `<w:lang>` in document-wide default run styles
- [ ] `<w:lang w:val="en-US" w:bidi="ar-SA"/>` on RTL runs
- [ ] `<w:lang w:val="en-US"/>` on LTR runs
- [ ] Paragraph `<w:pPr>` includes `<w:rPr>` with correct `<w:lang>`

### Edge Cases Handled
- [ ] Mixed-direction document (Arabic paragraphs + English paragraphs)
- [ ] Mixed-script paragraphs (English words inside Arabic paragraph)
- [ ] Footnote/endnote paragraphs with per-paragraph direction
- [ ] Table cells with per-table RTL/LTR direction
- [ ] Empty paragraph fallback (space TextRun) carries language
```

---

## Anti-Patterns

- Do NOT set a single document-level `language` in `styles.default.document.run` — this forces all paragraphs to use the same spell-check dictionary regardless of actual content language.
- Do NOT use `doc.language` (the document-level language string from the compile service) to make per-paragraph decisions — each block carries its own `direction` and that's what determines language.
- Do NOT set only `bidirectional: "ar-SA"` without `value: "en-US"` on RTL paragraphs — inline English words will be flagged as misspelled.
- Do NOT set `bidirectional: "ar-SA"` on LTR paragraphs — Arabic text in an English paragraph should be flagged (it's foreign content in that context).
- Do NOT forget to add `language` to footnote/endnote reference `Run` instances — they are full OOXML runs and need their own language metadata.
- Do NOT add `language` to `TextRun({ break: 1 })` — line breaks are not text and don't need proofing language.
- Do NOT confuse `language` (OOXML proofing language for spell-check) with `rightToLeft` (OOXML text direction for rendering) — they are separate properties that should both be set for RTL text.
- Do NOT leave `getLanguageTag()` as dead code if you remove document-level language — remove unused methods to keep the codebase clean.
- Do NOT skip paragraph `run` defaults and rely solely on per-TextRun language — paragraph defaults are the safety net for runs that may be added later or generated implicitly.

---

## Key Takeaways

1. `w:lang` in OOXML controls spell-check and grammar-check dictionary selection in Word — it is NOT decorative metadata.
2. Document-level language breaks bilingual documents — a single language cannot serve both Arabic and English paragraphs simultaneously.
3. Language is derived from `direction`: RTL → `{ value: "en-US", bidirectional: "ar-SA" }`, LTR → `{ value: "en-US" }`.
4. RTL paragraphs should set BOTH `value` and `bidirectional` — this allows inline English words to be spell-checked correctly while Arabic text uses the Arabic dictionary.
5. The `docx` library's `ILanguageOptions` supports three script categories: `value` (Latin/CJK), `bidirectional` (complex script), `eastAsia` (East Asian).
6. Language can be set at three levels: TextRun (highest priority), Paragraph run defaults, Document style defaults (lowest priority — should be removed for bilingual docs).
7. Every `TextRun` in `inlineHtmlToRuns()` gets language — bold, italic, underline, strike, code, hyperlinks, footnote refs, color spans, plain text. All of them.
8. Paragraph `run` defaults serve as a safety net — if a run is created without explicit language, the paragraph default kicks in.
9. `getRunLanguage()` is the single source of truth for direction-to-language mapping — all paragraph and run methods call it.
10. Footnote and endnote paragraphs are sub-documents and need their own language metadata — they don't inherit from the main document body.

---

**Cross-References:**
- Working implementation: `packages/backend/src/modules/export/serializers/docx-serializer.service.ts`
- Compiled document interface (per-block `direction`): `packages/backend/src/modules/export/compile/compiled-document.interface.ts`
- Three-layer RTL skill (prerequisite): `global-configs/skills/bidirectional-docx-rtl.skill.md`
- Bidirectional design principles: `02-engineering-practices/bidirectional-design-principles.md`
- RTL tech stack: `05-stack-guides/rtl-tech-stack.md`
- `docx` library `ILanguageOptions` type: `node_modules/docx/dist/file/paragraph/run/language.d.ts`
- Skill design patterns: `08-governance/skill-design-patterns.md`
