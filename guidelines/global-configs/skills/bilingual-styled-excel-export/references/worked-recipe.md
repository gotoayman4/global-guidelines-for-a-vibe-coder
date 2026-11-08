# Worked Recipe — Bilingual Styled Excel Export

The full pipeline behind the skill, from a shipped implementation (a bilingual school-coordination
portal, ADR 070). Code shapes are illustrative; the decisions are the normative part. Load on demand.

---

## 1. Vendor the styled writer

The styled fork (`xlsx-js-style`) is a fork of SheetJS 0.18.5 that writes cell styles. Pin it as a
vendored tarball so the lockfile is auditable and the inherited advisories are explicit:

```bash
npm pack xlsx-js-style@1.2.0        # verify the exact version exists on the registry FIRST
mkdir -p vendor && mv xlsx-js-style-1.2.0.tgz vendor/
npm install file:../../vendor/xlsx-js-style-1.2.0.tgz --save-exact   # path relative to the app
git add package-lock.json            # commit the lockfile
```

Dependency audit: the fork inherits its base's advisories (e.g. the prototype-pollution and ReDoS
findings against SheetJS ≤0.19.x). The vulnerable surface in those advisories is the READ path —
keep untrusted reads on maintained SheetJS CE and scope the allowlist entries to "export-only
writer; the read path never receives untrusted bytes", with an EXPIRY so the posture is re-reasoned.

Bundle: import it lazily where the blob is built:

```ts
// The one xlsx IO home. Two libraries, one split: CE `xlsx` for untrusted READS,
// the vendored styled fork for WRITES of our own data only.
const XLSX = await import('xlsx-js-style');   // its own chunk; the main bundle never pays
```

## 2. Build from the screen's own read path

Reuse the exact service functions the page renders. A fresh whole-cohort read (not the UI's loaded
slice) means the workbook is complete even when the screen paginates; reusing the read path means
row order, computed totals and scoping cannot drift from what the user is looking at.

- Scope (department/team/etc.) is a parameter of the READ, enforced by the data layer or rules — the UI passing a scope id is never the enforcement.
- Any failed group read aborts the whole export (a partial official snapshot is worse than none).
- One output row per display row (e.g. one application × one program choice), in display order.

## 3. The styled writer

```ts
type StyledCell = string | number | { v: string | number; s: CellStyle };

async function styledWorkbookBlob(sheet: string, aoa: StyledCell[][],
  opts: { rtl: boolean; widths?: number[] }): Promise<Blob> {
  const XLSX = await import('xlsx-js-style');
  const ws = XLSX.utils.aoa_to_sheet(aoa.map(row => row.map(c => (typeof c === 'object' ? { v: c.v } : c))));
  ws['!cols'] = opts.widths?.map(wch => ({ wch }));
  if (opts.rtl) ws['!views'] = [{ RTL: true }];      // ⚠ verify the fork keeps this — §4
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
```

Style objects (cell style reference, same shape as CE community docs describe):

```ts
const HEADER = { fill: { fgColor: { rgb: '1F3B4D' } }, font: { bold: true, color: { rgb: 'FFFFFF' } },
                 border: { top: thin, bottom: thin, left: thin, right: thin }, alignment: { horizontal: 'center' } };
const VERDICT = { approved: { fill: { fgColor: { rgb: 'C6EFCE' } } },
                  pending:  { fill: { fgColor: { rgb: 'FFEB9C' } } },
                  declined: { fill: { fgColor: { rgb: 'FFC7CE' } } } };
```

Colors are hex constants in the DOMAIN service (the exporter), with a comment noting the
design-token exception: Excel workbooks cannot reference CSS custom properties or a theme.

## 4. RTL — verify the bytes, rebuild the zip if the fork drops the flag

`xlsx-js-style` 1.2.0 was measured to drop `!views` on WRITE (the reader round-trips it, the writer
does not). The durable fix: after writing, rebuild the stored zip with the flag patched in.

```ts
// Pseudocode shape — real implementation uses a zip lib already in the tree or JSZip.
// 1) write to a buffer; 2) open as zip; 3) for each worksheet XML, ensure
//    <sheetViews><sheetView rightToLeft="1" .../></sheetViews> exists (insert after <sheetData>'s
//    sibling position per the schema, or rewrite an existing <sheetView ...> adding rightToLeft="1");
// 4) repack, preserving every other entry byte-for-byte.
```

Whatever the mechanism, the ASSERTION is on the produced bytes, not on the call you made:

```ts
// Zero new dependencies: parse the zip central directory, inflate the sheet XML, grep the flag.
import { inflateRawSync } from 'node:zlib';
function sheetXmls(buf: Buffer): string[] {
  // walk local file headers (PK\x03\x04), collect entry names + compressed data,
  // inflateRawSync each xl/worksheets/sheet*.xml, return as strings
}
const xml = sheetXmls(blobToBuffer(await exportAr()));
expect(xml.some(t => t.includes('rightToLeft="1"'))).toBe(true);   // Arabic file
const en = sheetXmls(blobToBuffer(await exportEn()));
expect(en.some(t => t.includes('rightToLeft="1"'))).toBe(false);   // English file
```

## 5. Language semantics

- A small confirmation dialog lists the file languages (e.g. "العربية (RTL)" / "English"), defaulting
  to the current UI language. The CONFIRMED value — not the ambient language — is what the export uses;
  a user can hold an English UI and still file Arabic records.
- Labels AND content follow the file language with per-cell fallback to the other: a person's Arabic
  name in an English file falls back to nothing-else (or transliteration) per the app's person()
  semantics; the rule is symmetric and tested both directions.
- Western digits in the title row's date and row count; the app's i18n keys supply every label —
  never inline strings in the exporter.
- File name: `applications-<scope>-<ar|en>-<DD-MM-YYYY>.xlsx` — scope (department/team slug or
  `all`), file language, LOCAL wall-clock date. **Never a database auto-id** (a shipped first cut
  produced `applications-kZ2kMxX9TpIi2NdQY1iB-…`, and the owner rejected the unreadable id the same
  day): the row's subject (cycle/period name) belongs in the workbook's TITLE ROW, which the office
  actually reads, and the name stays copy a human picked. Local date, not the UTC ISO stamp — an
  export made late in the day must not file itself under tomorrow.

```ts
function applicationsFileName(input: { departmentId: string | null; lang: Lang }, now: Date): string {
  const scope = (input.departmentId ?? 'all').replace(/[^A-Za-z0-9_-]+/g, '-'); // ids are admin-chosen
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `applications-${scope}-${input.lang}-${dd}-${mm}-${now.getFullYear()}.xlsx`;
}
```

## 6. Capability, not CSS

- A dedicated capability hook/flag decides the export button (roles list). Deliberately separate
  from any other export gate in the app — merging it silently widens or narrows another feature.
- The dialog's confirm disables while generating; errors surface through the page's existing notice
  channel; the browser portal renders no bypass path.

## 7. Test ladder

1. **Unit — mapping fidelity** (no DOM): construct domain rows, assert every column's cell (scores,
   total, rank, verdict, approval, note), name fallback both directions, serial continuity 1..N,
   display order, scope id propagated to each read call, file-name shape.
2. **Unit — the bytes** (§4): RTL flag present/absent, header labels present, style references
   (cells carry `s:` indexes) — all from the produced zip, zero new dependencies.
3. **Unit — writer**: blob builds and has the XLSX MIME; widths array sets `!cols`; `rtl: true`
   produces the rebuilt flag.
4. **Component**: dialog default follows UI language; confirm emits the chosen language; button
   rendered exactly when the capability is granted.
5. **E2E** (real browser + seeded data): for each capable role walk button → dialog → confirm →
   download; arm the download BEFORE clicking confirm — wrap `URL.createObjectURL` in the page to
   record blobs into `window.__exports`, then poll for a Blob with size > 0. Out-of-scope roles:
   assert the denial surface (an error, not silence).
6. **Bundle verification**: the lazy writer is its own chunk; the main chunk's composition unchanged.
7. **Owner manual check** — open the Arabic export in Excel itself: RTL column order and legible
   fills are the one observation no test makes. Record it as acceptance evidence, owed then met.

## 8. Governance hooks (repo-constitution projects)

- PRD/steering entry BEFORE code (feature + acceptance criterion).
- ADR for: the vendored fork + exact pin, the writer/reader library split, the CVE allowlist posture.
- Stack-table row in the constitution for the new dependency (name, version, what it is for, what it must never do).
- The manual Excel look is stated in the acceptance criterion as the deliberately unautomated remainder.
