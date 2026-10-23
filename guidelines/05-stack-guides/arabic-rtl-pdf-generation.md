---
status: "Normative"
scope: "Global — Web and Electron Apps (Arabic PDF output)"
tags: [rtl, arabic, pdf, chromium, electron, print, bidi, fonts, paged-media, accessibility]
control: none
---

# Arabic RTL PDF Generation — Render with Chromium, Never Reshape by Hand

---

Purpose: this file owns the **choice of PDF engine and the verification of Arabic PDF output**. General Arabic layout, typography, numerals and UI direction remain owned by `rtl-tech-stack.md` and `bidirectional-design-principles.md`; this file adds only what printing changes. Load it for any task that exports, prints, archives or emails a PDF containing Arabic.

## Key Takeaways

1. **A PDF stores positioned glyphs, not a string with a direction.** Something must run Arabic OpenType shaping (contextual forms, lam-alef ligatures, mark positioning) and UAX #9 bidi reordering *before* glyphs are placed. A browser engine already does both; almost every JavaScript PDF library does neither.
2. **Use a Chromium print pipeline** — Electron `webContents.printToPDF()`, Playwright/Puppeteer `page.pdf()`, Gotenberg, or Chrome `--print-to-pdf`. This is the only free route that combines correct shaping, correct bidi, font subset embedding and CSS pagination without writing any layout code.
3. **Keep the text as logical Unicode.** Never reverse it, never convert it to Arabic Presentation Forms (U+FB50–FDFF, U+FE70–FEFF), never insert tatweel to justify it. Those hacks destroy ligatures, copy/search and the text layer.
4. **Render a dedicated print route**, not the live app shell: one route, print CSS, self-hosted fonts, no interactive chrome.
5. **Arabic PDF output is verified, not assumed.** Check shaping, bidi, embedded fonts, page breaks and the text layer on every change to the engine or the font — the rendering path is silent when it falls back.

## Why the Browser Engine

| Requirement | What the engine must do | Chromium |
|---|---|---|
| Arabic letter joining | OpenType `init`/`medi`/`fina`/`isol` substitution, lam-alef ligature | HarfBuzz — correct |
| Tashkeel positioning | GPOS mark attachment | HarfBuzz — correct |
| Mixed Arabic/Latin/numbers | UAX #9 bidi resolution per line | ICU — correct |
| Font in the PDF | Subset embedding with a ToUnicode map | Skia — automatic |
| Pagination | Page boxes, repeated table headers, break control | CSS Paged Media subset — good |
| Accessibility tags | Structure tree, reading order, language | Partial and experimental |

The libraries below do **not** carry this pipeline, and the failure is not cosmetic: text becomes presentation-form glyphs with broken ligatures, digits reorder inside prices and phone numbers, and punctuation lands at the wrong end of the line. No amount of CSS fixes a library that never shaped the text.

## Choosing a Route (Free and Open Source Only)

Ranked by reliability for Arabic first, effort second.

| # | Route | Reliability | Effort | Use when |
|---|---|---|---|---|
| 1 | **Electron `printToPDF()`** | Highest — same Chromium that renders the app | Low | The app is Electron; export runs in the main process |
| 2 | **Gotenberg (self-hosted, Docker)** | Highest — Chromium + LibreOffice behind an HTTP API | Medium | A backend or service prints, or you need PDF/A or PDF/UA |
| 3 | **Playwright / Puppeteer `page.pdf()`** | Highest — headless Chromium | Low | Build scripts, CI fixtures, golden-PDF tests, marketing or invoice generation |
| 4 | **Browser `window.print()` → Save as PDF** | High rendering, user-mediated output | Very low | A human exports a page once; not automatable or assertable |
| 5 | **Chrome/Chromium `--print-to-pdf`** | High rendering, weak readiness control | Low | A static HTML file in a shell script; no app state to wait for |
| 6 | **Paged.js (`pagedjs-cli`)** | High rendering plus print-book features Chromium lacks | Medium | You need running headers, page counters, cross-references, footnotes |
| 7 | **Vivliostyle CLI** | High typesetting quality, actively maintained | Medium–High | Long-form books or reports; AGPL-3.0 must be acceptable |
| 8 | **DOCX → LibreOffice (Gotenberg)** | Medium — layout differs from Word | Medium | The source of truth really is a `.docx` file |

Licensing and maintenance notes that affect the choice:

- **Gotenberg** is MIT. Current release at the time of writing is **v8.38.1 (2026-10-15)**; pin the image major (`gotenberg/gotenberg:8`) or digest, never `latest`, and re-run the golden PDF after an upgrade.
- **Paged.js** is MIT. Its CLI (`pagedjs-cli`) last published **0.4.3 on 2023-07-20** — small, stable and unmaintained. Fine when its features are needed; a dependency-risk decision, not a default.
- **Vivliostyle CLI** is **AGPL-3.0**. That is a distribution question for your product, not a technical one — resolve it before adopting it.
- **LibreOffice** (via Gotenberg) shapes Arabic correctly through HarfBuzz, but its layout is not Word's. Do not promise Word-identical output; verify the specific document.

## Directives

1. **MUST render Arabic PDFs through a Chromium print pipeline.** Electron, Playwright/Puppeteer, Gotenberg or Chrome CLI. MUST NOT hand-place Arabic glyphs, and MUST NOT use a library that requires you to.
2. **MUST keep the document's logical Unicode text.** No pre-reversal, no Presentation Forms conversion, no tatweel insertion for justification, no per-word splitting to force order. If output looks wrong, the bug is in shaping, bidi or font — fix that layer.
3. **MUST export from a dedicated print route** (`/print/:id` or `/print/invoice/:id`) that renders the same data with print CSS. MUST NOT print the live app shell: navigation, dialogs, toasts, scroll containers and lazy images all corrupt pagination.
4. **MUST self-host the Arabic font and fail the export if it did not load.** Reference the file through `@font-face` with `font-display: block`; await `document.fonts.ready`; assert the expected face has `status === 'loaded'`; abort rather than silently produce a fallback PDF. System fonts are absent in CI, containers and many desktops.
5. **MUST isolate mixed-direction runs.** Identifiers, emails, URLs, phone numbers, SKUs and Latin names inside Arabic text go in `<bdi>` or `dir="auto"`, or carry `direction: ltr; unicode-bidi: isolate`. Without isolation, a trailing `+` or `-` moves to the wrong end of the line.
6. **MUST set direction on the root** (`<html dir="rtl" lang="ar">`) and use logical CSS throughout the print route. Physical `left`/`right` is permitted only inside an explicit LTR context.
7. **MUST break pages at the row or block level.** `tr, .avoid-break { break-inside: avoid; }`, `h1–h3 { break-after: avoid; }`, `thead { display: table-header-group; }`. MUST NOT put `break-inside: avoid` on a whole table or a long list — Chromium will push it to the next page or overflow it.
8. **MUST pass the print options explicitly.** `printBackground: true` (default is `false`), `preferCSSPageSize: true` (default is `false`), and an explicit `@page { size: A4; margin: … }`. Chromium does **not** implement `@page` margin boxes (`@top-center` and friends); use `headerTemplate`/`footerTemplate` with `displayHeaderFooter`, or accept no running header.
9. **Archival and accessibility output is a second contract.** Raw Chromium output is **not** PDF/A; Electron's `generateTaggedPDF` and Puppeteer's `tagged` produce structure, not conformance, and both are experimental. When PDF/A or PDF/UA is required, produce it with Gotenberg (`pdfa`, `pdfua`) or post-process, then validate with veraPDF or a PDF/UA checker. PDF/A-3 is the variant that allows an embedded XML attachment (`embeds`).
10. **MUST treat rendered HTML as untrusted.** Sanitize it, disable JavaScript where the document does not need it (Gotenberg `javaScriptEnabled=false`, Playwright `javaScriptEnabled: false`), block requests to private network ranges, and run the renderer in a sandbox or container. In Electron: `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`.
11. **MUST pin the engine and keep golden PDFs.** Record the Electron/Chromium/Gotenberg version next to the fixture; re-render and compare after every upgrade. A Chromium upgrade can change shaping, font fallback and page breaks without any application change.
12. **SHOULD test Arabic with a mixed fixture**: a lam-alef word, a word with tashkeel, a Latin product name, a phone number, a price, and a table that crosses a page boundary.

## Recipes

### Electron — main process

```js
const { BrowserWindow } = require('electron');
const fs = require('node:fs/promises');

async function exportPdf({ url, output }) {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await win.loadURL(url); // a local print route, never a data: URL for large documents

    const fontsLoaded = await win.webContents.executeJavaScript(`
      document.fonts.ready.then(() => {
        const family = (name) => name.replace(/["']/g, '');
        return Array.from(document.fonts).some(
          (face) => family(face.family) === 'ArabicPDF' && face.status === 'loaded'
        );
      })
    `);
    if (!fontsLoaded) throw new Error('Arabic font did not load — refusing to export');

    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      // generateTaggedPDF: true,        // experimental, default false
      // generateDocumentOutline: true,  // experimental, default false
    });

    await fs.writeFile(output, pdf);
  } finally {
    win.destroy();
  }
}
```

`loadURL` waits for the load event, so images are in; web fonts may not be, which is what the `document.fonts.ready` check covers. Disable `loading="lazy"` on the print route — offscreen images never load and print as empty boxes.

### Playwright — build script or CI

```js
const { chromium } = require('playwright');

async function exportPdf(url, output) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('[data-print-ready="true"]');
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await page.pdf({
      path: output,
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}
```

The `data-print-ready` attribute is application-owned: set it after data fetch and chart rendering. Sleeping for a fixed number of milliseconds is a race, not a wait. Puppeteer's equivalents are `waitForFonts` (default `true`) and `tagged` (default `true`, experimental).

### Gotenberg — service or backend

```bash
docker run --rm -p 3000:3000 gotenberg/gotenberg:8
```

```bash
curl --request POST http://localhost:3000/forms/chromium/convert/html \
  --form files=@invoice/index.html \
  --form files=@invoice/style.css \
  --form 'files=@NotoNaskhArabic-Regular.woff2;filename=fonts/NotoNaskhArabic-Regular.woff2' \
  --form printBackground=true \
  --form preferCssPageSize=true \
  --form paperWidth=8.27 \
  --form paperHeight=11.69 \
  --form marginTop=0.7 --form marginBottom=0.7 \
  --form marginLeft=0.7 --form marginRight=0.7 \
  --form waitDelay=300ms \
  --form failOnConsoleExceptions=true \
  --output invoice.pdf
```

Multipart filenames preserve the relative paths the HTML references — a font declared as `url('fonts/…')` must be uploaded with that `filename=`. For archival output add `--form pdfa=PDF/A-3b`; for accessibility add `--form pdfua=true`; for a Factur-X/ZATCA-style package add `--form embeds=@ubl.xml` (PDF/A-3 only). Keep `failOnConsoleExceptions=true` so a broken page fails the request instead of returning a blank PDF.

### Browser print — print CSS

```css
@font-face {
  font-family: 'ArabicPDF';
  src: url('/fonts/NotoNaskhArabic-Regular.woff2') format('woff2');
  font-display: block;
}

@page { size: A4; margin: 18mm 16mm; }

html { direction: rtl; }

body {
  font-family: 'ArabicPDF', 'Noto Naskh Arabic', serif;
  line-height: 1.8;
}

.ltr, [dir='ltr'] { direction: ltr; unicode-bidi: isolate; }

table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
tr, .avoid-break { break-inside: avoid; }
h1, h2, h3 { break-after: avoid; }
p { orphans: 3; widows: 3; }

@media print {
  .no-print, [data-no-print] { display: none !important; }
  * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
```

`window.print()` uses the same engine and produces correct Arabic, but the user chooses the destination and page setup. Use it for a human-initiated "Save as PDF", never as the machine-verifiable export.

### DOCX — only when the document is the source

```bash
curl --request POST http://localhost:3000/forms/libreoffice/convert \
  --form files=@invoice.docx \
  --form pdfa=PDF/A-2b \
  --output invoice.pdf
```

Custom Arabic fonts must be installed in the container (build a derived image or mount them into the system font directory); otherwise LibreOffice substitutes and the output is wrong. Treat Word-vs-LibreOffice layout differences as a known, tested risk.

## Verification Gate

No central guard can inspect a downstream project's PDFs, so each project owns a golden-PDF smoke test. Run this on every engine, font or print-CSS change:

| Check | How | Pass condition |
|---|---|---|
| Shaping | Render the fixture, inspect at 300% | Joined letters, correct initial/medial/final forms, lam-alef ligature, tashkeel positioned — no disconnected or box glyphs |
| Bidi | Mixed fixture | Latin runs read LTR, numbers keep their digits, punctuation sits at the correct end, no punctuation at line start |
| Text layer | Select, copy and search in the target viewer | Expected words found; plain Arabic extracts coherently |
| Embedded fonts | `pdffonts invoice.pdf` | Every Arabic face shows `emb yes`, `sub yes`, and the expected name — no fallback face |
| Pagination | Multi-page fixture | `thead` repeats, rows do not split, headings are not orphaned, no clipped table |
| Geometry | Open at 100% | A4 size, margins, background colors, logos present |
| Archival | veraPDF or a PDF/UA checker | Declared PDF/A or PDF/UA level passes, if claimed |
| Determinism | Re-render the same input on the pinned engine | Same text extraction; visual diff below the agreed threshold |

The text layer deserves one caveat: plain Arabic extracts reliably, but **heavy tashkeel can produce fragmented combining marks or NULs** in some extractors even when the visual output is perfect. If searchable Arabic with full vocalisation is a hard requirement, test with the *target* viewer and extractor, not just the renderer. Tagged output does not change extraction — tagging is structure, not shaping.

Record the measured outcome in the project's `docs/gate-receipts/` or changelog, with the engine and font versions. A screenshot of one successful invoice is not evidence for the next Chromium release.

## Anti-Patterns

| Anti-Pattern | Why it fails | Fix |
|---|---|---|
| `html2pdf.js` / `html2canvas` | Rasterizes the page; text becomes an image, selection and search die | `printToPDF` / `page.pdf` |
| `jsPDF` | No Arabic shaping or bidi; common workarounds emit Presentation Forms and reverse text | Chromium pipeline |
| `pdfmake` or RTL forks | Partial or incorrect shaping, stale forks, font pipeline not OpenType-complete | Chromium pipeline |
| `PDFKit` | Low-level glyph placement; no shaping, no bidi | Chromium pipeline |
| `@react-pdf/renderer` | Latin-first layout engine; Arabic shaping incomplete | Chromium pipeline |
| `pdf-lib` for Arabic text | Manipulates existing PDFs; no text shaping at all; fine for metadata and merging only | Chromium pipeline |
| `wkhtmltopdf` | Old Qt WebKit; poor Arabic shaping and bidi | Chromium pipeline |
| Manual reversal, Presentation Forms, tatweel padding | Breaks ligatures, copy, search and accessibility | Keep logical Unicode |
| `text-align: right` with `<html dir="ltr">` | Positions text without a RTL base direction; bidi resolution is wrong | `dir="rtl"` on the root |
| Blanket `unicode-bidi: plaintext` | Each paragraph guesses direction from its first strong character; headings starting with digits or Latin flip | `dir="auto"` on ambiguous blocks only |
| `break-inside: avoid` on a whole table | Chromium moves the table to the next page or overflows it | Apply to rows |
| System fonts only | CI, containers and clean machines fall back silently | Bundle and verify the font |
| `window.print()` in an automated export | Needs a human and cannot be asserted | `printToPDF` / `page.pdf` |
| `data:` URL for a large Electron document | URL length limits and encoding failures | Local print route |
| Trusting `tagged` / `generateTaggedPDF` as accessibility | Experimental structure tags, not conformance | Validate PDF/UA independently |
| Rendering untrusted HTML with JS and network enabled | SSRF, local-file access, code execution in the renderer | Sanitize, disable JS, block private ranges, sandbox |
| Upgrading Chromium without re-running the fixtures | Shaping and pagination change silently | Golden PDFs per engine version |

## Evidence Note

Measured 2026-10-23 on headless Chrome with a bundled Amiri static font, against `pdfnative` 1.8.0:

- **Chrome:** correct joining, lam-alef and mixed bidi; table pagination correct; font embedded as `AAAAAA+Amiri-Regular`; plain Arabic extraction readable. Heavy tashkeel fragmented in extraction.
- **pdfnative:** Arabic emitted as Presentation Forms-B, punctuation at line starts, price digits reversed (`٥٠٠٬٤` instead of `٤٬٥٠٠`). Not usable.

This is the evidence for directive 1. It is a dated observation, not a guarantee about any engine version.

## Project Control

`control: none` at the corpus level is deliberate: the central repo has no project PDFs to inspect. The enforceable control lives in each project — a golden-PDF smoke test that renders the fixture, asserts the embedded font and the expected text tokens, and compares the rasterized page with a stored baseline. Name that test in the project's `AGENTS.md`; an unasserted export is an unverified one.

## References

- Electron `webContents.printToPDF`: https://www.electronjs.org/docs/latest/api/web-contents
- Puppeteer `Page.pdf`: https://pptr.dev/api/puppeteer.page.pdf
- Playwright `page.pdf`: https://playwright.dev/docs/api/class-page#page-pdf
- Gotenberg routes: https://gotenberg.dev/docs/getting-started/routes
- Unicode UAX #9 (bidi algorithm): https://www.unicode.org/reports/tr9/
- HarfBuzz (OpenType shaping): https://harfbuzz.github.io/
- Paged.js: https://pagedjs.org/
- Vivliostyle CLI: https://docs.vivliostyle.org/en/cli/
- veraPDF: https://verapdf.org/
- Chrome headless mode: https://developer.chrome.com/docs/chromium/headless

## Cross-References

- **Depends on:** `rtl-tech-stack.md`, `bidirectional-design-principles.md`
- **See also:** `accessibility-standards.md`, `security-engineering.md`, `testing-patterns.md`, `performance-optimization.md`
