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

**Companion Skill:** `../docx-per-paragraph-language/SKILL.md` (proofing/spell-check `w:lang`)

---

## Trigger

Activate when exporting Arabic/RTL/Persian/Hebrew Word documents with `docx`, fixing reversed numerals/punctuation or mirrored alignment in DOCX, or modifying OOXML `w:bidi` / `w:rtl`.

Do NOT activate for monolingual LTR docs, UI/CSS RTL (`rtl-shadcn-setup`), PDF export, or `w:lang` spell-check (`../docx-per-paragraph-language/SKILL.md`).

---

## Load Guidelines

1. `02-engineering-practices/bidirectional-design-principles.md` — RTL architecture requirements (Normative)
2. `05-stack-guides/rtl-tech-stack.md` — RTL tech stack, numeral policy, bilingual rules (Normative)

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are an OOXML/bidirectional specialist for `docx` (v9.7.0+). You implement three-layer RTL (`<w:bidi/>` paragraph, `<w:rtl/>` run, flipped `<w:jc>` alignment) plus per-paragraph/run proofing language.

---

## Workflow

1. **Assess per-block direction:** Read each block's `direction: "rtl" | "ltr"` (paragraphs, headings, table cells, lists, blockquotes, footnotes).
2. **Apply paragraph-level `<w:bidi/>`:** Set `bidirectional: block.direction === "rtl"` on every RTL paragraph.
3. **Apply run-level `<w:rtl/>`:** Set `rightToLeft: block.direction === "rtl"` on ALL `TextRun`s inside RTL blocks (never on LTR English runs).
4. **Flip alignment for RTL:** Word with `<w:bidi/>` inverts physical `w:jc` values — route every paragraph (including footnotes) through `mapAlignment()` (RTL default → `AlignmentType.LEFT`; explicit `"left"` → `RIGHT`, `"right"` → `LEFT`; LTR → direct mapping).
5. **Guard empty paragraphs & footnotes:** Parse per-`<p>` `dir`/`text-align` on HTML footnotes and ensure every `Paragraph` has at least `new TextRun({ text: " " })`.
6. **Add proofing language (fourth layer):** Set `w:lang` per paragraph and per run via `../docx-per-paragraph-language/SKILL.md`.
7. **Verify OOXML:** Unzip `.docx`, inspect `word/document.xml` for `<w:bidi/>`, `<w:rtl/>`, flipped `<w:jc>`, and `<w:lang>`.
8. **Code patterns & checklist:** See [`references/ooxml-code-patterns.md`](references/ooxml-code-patterns.md).

---

## Anti-Patterns

- Do NOT set `bidirectional: true` only at document level or omit `rightToLeft: true` on RTL `TextRun`s
- Do NOT apply `rightToLeft: true` to LTR English runs, or create `Paragraph` with empty `children`
- Do NOT use physical `AlignmentType.RIGHT` directly for RTL (renders LEFT in Word) or infer RTL from `alignment === "right"` instead of `direction === "rtl"`
- Do NOT confuse CSS logical properties (`start`/`end`) with OOXML `w:jc` (`left`/`right`)

---

## Key Takeaways

1. Three mandatory DOCX RTL layers: `Paragraph.bidirectional` (`<w:bidi/>`), `TextRun.rightToLeft` (`<w:rtl/>`), and inverted `mapAlignment()`.
2. Plus fourth layer (`w:lang`) per paragraph and per run via `docx-per-paragraph-language`.
3. Always verify generated `word/document.xml` directly after changes.

---

## Cross-References

- Bidirectional design principles: `02-engineering-practices/bidirectional-design-principles.md`
- RTL tech stack: `05-stack-guides/rtl-tech-stack.md`
- RTL UI setup skill: `global-configs/skills/rtl-shadcn-setup/SKILL.md`
- Per-paragraph/run language skill: `../docx-per-paragraph-language/SKILL.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repository only; not delivered with this skill)
