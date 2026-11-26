# Per-Paragraph/Run Language — Implementation & Checklist

Reference companion for `docx-per-paragraph-language`.

---

## TypeScript Patterns (`docx` v9.7.0+)

### 1. Remove document-level language

```typescript
const docx = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: "Times New Roman",
          size: 24,
          // Do NOT set document-level language here; set per-paragraph and per-run
        },
      },
    },
  },
});
```

### 2. Map block direction to `ILanguageOptions`

```typescript
private getRunLanguage(rightToLeft: boolean): { value?: string; bidirectional?: string } {
  if (rightToLeft) {
    return { value: "en-US", bidirectional: "ar-SA" };
  }
  return { value: "en-US" };
}
```

### 3. Apply paragraph `run` defaults & `TextRun` / `Run` properties

```typescript
const paraRTL = block.direction === "rtl";
new Paragraph({
  bidirectional: paraRTL,
  run: {
    rightToLeft: paraRTL,
    language: this.getRunLanguage(paraRTL),
  },
  children: runs,
});

const runLang = this.getRunLanguage(rightToLeft);
new TextRun({
  text: content,
  language: runLang,
  rightToLeft,
  bold: true,
});

// Footnote/endnote reference Run:
new Run({
  style: "FootnoteReference",
  language: runLang,
  rightToLeft,
  children: [new FootnoteReference(noteId)],
});
```

Apply to all paragraph builders (`paragraphToDocx`, `headingToDocx`, `tableToDocx`, `bulletListToDocx`, `orderedListToDocx`, `blockquoteToDocx`, `footnoteHtmlToParagraphs`, fallback/empty paragraphs) and all non-break run paths in `inlineHtmlToRuns()`.

---

## Output Summary Checklist

```markdown
## Per-Paragraph/Run Language — Summary

### Document Setup
- Document-level language in styles: REMOVED
- Language helper: `getRunLanguage(rightToLeft)` → RTL `{ value: "en-US", bidirectional: "ar-SA" }`, LTR `{ value: "en-US" }`

### Coverage
- [ ] All paragraph builders propagate `run: { rightToLeft: paraRTL, language: getRunLanguage(paraRTL) }`
- [ ] All `TextRun` and footnote/endnote `Run` instances carry `language: runLang`
- [ ] Footnote/endnote sub-document paragraphs set `run` defaults explicitly
- [ ] Empty paragraph fallback carries `language`
- [ ] No `<w:lang>` in `<w:styles>` default run properties
- [ ] `<w:lang w:val="en-US" w:bidi="ar-SA"/>` on RTL runs; `<w:lang w:val="en-US"/>` on LTR runs
```
