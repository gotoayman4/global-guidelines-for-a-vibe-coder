# Bidirectional DOCX RTL — OOXML Code Patterns & Checklist

Reference companion for `bidirectional-docx-rtl` (`docx` v9.7.0+).

---

## Core TypeScript Patterns

### 1. Paragraph bidi + Run RTL + Alignment inversion

Word with `<w:bidi/>` inverts physical `w:jc` values (`AlignmentType.RIGHT` renders LEFT; `AlignmentType.LEFT` renders RIGHT):

```typescript
new Paragraph({
  bidirectional: block.direction === "rtl",
  alignment: this.mapAlignment(block.alignment, block.direction),
  children: runs,
});

new TextRun({
  text: content,
  rightToLeft: block.direction === "rtl",
});

private mapAlignment(alignment?: string, direction?: string): AlignmentType {
  if (alignment === "center") return AlignmentType.CENTER;
  if (alignment === "justify") return AlignmentType.JUSTIFIED;
  if (direction === "rtl") {
    if (alignment === "left") return AlignmentType.RIGHT;
    if (alignment === "right") return AlignmentType.LEFT;
    return AlignmentType.LEFT; // default RTL → renders right-aligned in Word
  }
  if (alignment === "right") return AlignmentType.RIGHT;
  return AlignmentType.LEFT;
}
```

### 2. Multi-paragraph footnotes (`<p>` HTML with `dir` / `text-align`)

```typescript
const dirMatch = attrs.match(/dir="(rtl|ltr)"/i);
const paraDir = dirMatch?.[1];
const alignMatch = attrs.match(/text-align:\s*(left|right|center|justify)/i);
const paraAlign = alignMatch?.[1];
const effectiveDir = paraDir || (isRTL ? "rtl" : "ltr");

new Paragraph({
  bidirectional: effectiveDir === "rtl",
  alignment: this.mapAlignment(paraAlign, effectiveDir),
  children: runs,
});
```

### 3. Empty paragraph fallback

Always ensure every `Paragraph` has at least one child (`new TextRun({ text: " " })`) so Word never hits corrupt empty `<w:p>` elements.

---

## Output Summary Checklist

```markdown
## RTL DOCX Generation — Summary

### Layers Applied
- [ ] Paragraph `<w:bidi/>` on all RTL blocks (paragraphs, headings, table cells, lists, blockquotes, footnotes)
- [ ] TextRun `<w:rtl/>` on all runs in RTL blocks (including hyperlinks and fallback runs)
- [ ] Flipped `mapAlignment()` for RTL; direct mapping for LTR
- [ ] Fourth layer: `w:lang` per-paragraph and per-run (see `../docx-per-paragraph-language/SKILL.md`)

### OOXML Verification
- [ ] `<w:bidi/>` in RTL `<w:pPr>` and `<w:rtl/>` in RTL `<w:rPr>`
- [ ] `<w:jc w:val="left"/>` for default RTL; `<w:jc w:val="right"/>` for explicit left-aligned RTL
- [ ] Empty paragraph children guarded with space `TextRun`
```
