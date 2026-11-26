---
name: docx-per-paragraph-language
description: Per-paragraph and per-run proofing language (OOXML w:lang) for bilingual DOCX. Use when Word spell-check flags the wrong language, when Arabic is marked misspelled inside an English document, or when setting run-level language options. Triggers on "DOCX spell-check wrong language", "OOXML w:lang", "run-level language".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, docx, language, paragraph, spell-check
  appliesTo: docx
---

# Skill: Per-Paragraph/Run Language for Bilingual DOCX Generation

---

## Trigger

Activate when:
- Word spell-check flags Arabic or English text under the wrong proofing dictionary in generated DOCX files
- Setting OOXML `w:lang` / `ILanguageOptions` per paragraph or per text run
- Modifying `getRunLanguage()` or bilingual DOCX run/paragraph serialization

Do NOT activate when:
- The issue is paragraph direction/alignment (`w:bidi`, `w:rtl`) — use `../bidirectional-docx-rtl/SKILL.md`
- Working with HTML/CSS `lang` attributes or font selection

---

## Load Guidelines

1. `02-engineering-practices/bidirectional-design-principles.md` — RTL architecture requirements (Normative)
2. `05-stack-guides/rtl-tech-stack.md` — RTL tech stack, numeral policy (Normative)
3. `../bidirectional-docx-rtl/SKILL.md` — Three-layer RTL DOCX generation

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are an OOXML proofing-language specialist for `docx` (v9.7.0+). `w:lang` selects Word's spell/grammar dictionary via `language.value` (`w:val`, Latin/CJK), `language.bidirectional` (`w:bidi`, complex/RTL), and `language.eastAsia` (`w:eastAsia`).

---

## Workflow

1. **Assess block directions:** Derive proofing language from each block's `direction: "rtl" | "ltr"`, never from a single document-wide language setting.
2. **Remove document-level `language` from `styles.default.document.run`:** Document-wide defaults break bilingual spell-check for half the document.
3. **Implement `getRunLanguage(rightToLeft)`:**
   - RTL (`true`): `{ value: "en-US", bidirectional: "ar-SA" }` (covers Arabic text plus inline English terms)
   - LTR (`false`): `{ value: "en-US" }`
4. **Set language on every paragraph's `run` defaults AND every `TextRun` / footnote `Run`** (including bold, italic, code, hyperlinks, color spans, and empty-paragraph fallbacks, excluding line breaks). Code snippets and checklist live in [`references/implementation-and-checklist.md`](references/implementation-and-checklist.md).
5. **Verify generated OOXML:** Unzip `.docx` and inspect `word/document.xml` + `word/styles.xml` — confirm no document-wide `<w:lang>` fallback, `<w:lang w:val="en-US" w:bidi="ar-SA"/>` on RTL `<w:pPr>/<w:rPr>` and runs, and `<w:lang w:val="en-US"/>` on LTR runs.
6. **Summarize** using the checklist in [`references/implementation-and-checklist.md`](references/implementation-and-checklist.md).

---

## Anti-Patterns

- Do NOT set a document-level `language` in `styles.default.document.run` or use `doc.language` instead of per-block `direction`
- Do NOT set `bidirectional: "ar-SA"` without `value: "en-US"` on RTL paragraphs, or set `bidirectional: "ar-SA"` on LTR paragraphs
- Do NOT omit `language` from footnote/endnote `Run`s or paragraph `run` defaults, and do NOT add `language` to `TextRun({ break: 1 })`
- Do NOT confuse `language` (spell-check) with `rightToLeft` (layout direction), or leave unused `getLanguageTag()` dead code

---

## Key Takeaways

1. Inheritance order: `TextRun.language` > paragraph `run.language` > document style fallback (omit the fallback for bilingual docs).
2. RTL → `{ value: "en-US", bidirectional: "ar-SA" }`; LTR → `{ value: "en-US" }`.
3. Every paragraph builder, every non-break `TextRun`/`Run`, and footnote sub-documents need explicit language derived via `getRunLanguage()`.

---

## Cross-References

- Three-layer RTL skill (prerequisite): `../bidirectional-docx-rtl/SKILL.md`
- Bidirectional design principles: `02-engineering-practices/bidirectional-design-principles.md`
- RTL tech stack: `05-stack-guides/rtl-tech-stack.md`
- `docx` `ILanguageOptions` type: `node_modules/docx/dist/file/paragraph/run/language.d.ts`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repository only; not delivered with this skill)
