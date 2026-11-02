#!/usr/bin/env node

/**
 * migrate-agents-to-managed.js — Move a hand-authored project AGENTS.md onto the managed constitution
 * region WITHOUT losing the project's own amendments.
 *
 * INTENT: `inject-constitution-block.js --adopt` swaps the core sections for the managed region, but a
 * legacy file keeps duplicate `## RTL & Arabic` / `## Performance` sections after `## Skills`, and its
 * `— project amendment` bullets live inside sections the region overwrites. Run alone, adopt either
 * duplicates rules or drops the project's decisions. This does the whole move:
 *   1. back the file up (`.guidelines-backups/AGENTS.<timestamp>.md`)
 *   2. lift every `project amendment` bullet into a project-owned `## Project Amendments` section
 *      placed before `## Reference & Project Setup` (the sync never touches it)
 *   3. adopt the managed region (capability-filtered by WORLD.md)
 *   4. delete tail sections that now duplicate a managed heading
 *   5. report any other bullet whose title the new file no longer contains — for a human to place
 * Dry run unless `--apply`. Never commits.
 *
 * Usage:  node migrate-agents-to-managed.js <projectRoot> [--apply]
 * Exit codes: 0 = migrated / already managed; 2 = usage error or nothing adoptable.
 *
 * Source: global-configs/scripts/migrate-agents-to-managed.js
 */

const fs = require('fs');
const path = require('path');
const { readCapabilities } = require('./lib/capabilities.js');
const { readCanonicalCore, applyConstitutionBlock } = require('./inject-constitution-block.js');

const AMEND = /project amendment/i;
const AMEND_SECTION = '## Project Amendments';

const headingKey = (line) => line.replace(/^#+\s*/, '').replace(/\s*[(—-].*$/, '').trim().toLowerCase();

/** Split into [{heading, lines}] blocks on `## ` headings; text before the first is heading=null. */
function sections(lf) {
  const out = [{ heading: null, lines: [] }];
  for (const line of lf.split('\n')) {
    if (/^## /.test(line)) out.push({ heading: line, lines: [line] });
    else out[out.length - 1].lines.push(line);
  }
  return out;
}

/** Bullet blocks whose title says "project amendment". */
function extractAmendments(lf) {
  const found = [];
  const lines = lf.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/^- \*\*/.test(lines[i]) || !AMEND.test(lines[i].split('**')[1] || '')) continue;
    const block = [lines[i]];
    while (i + 1 < lines.length && lines[i + 1].trim() !== '' && !/^(- |#{1,6} )/.test(lines[i + 1])) block.push(lines[++i]);
    found.push(block.join('\n'));
  }
  return found;
}

const bulletTitles = (lf) => new Set((lf.match(/^- \*\*[^*]+\*\*/gm) || []).map((s) => s.replace(/^- \*\*|\*\*$/g, '').trim()));

/** Every bullet block in a core-region span, with whether it carries a `→ Source:` provenance line. */
function bulletBlocks(lf) {
  const out = [];
  const lines = lf.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/^- \*\*/.test(lines[i])) continue;
    const block = [lines[i]];
    while (i + 1 < lines.length && lines[i + 1].trim() !== '' && !/^(- |#{1,6} )/.test(lines[i + 1])) block.push(lines[++i]);
    out.push({ title: (lines[i - block.length + 1].split('**')[1] || '').trim(), text: block.join('\n'), standard: block.some((l) => /→ Source:/.test(l)) });
  }
  return out;
}

/** @returns {{content: string, status: string, amendments: number, droppedSections: string[], superseded: number}} */
function migrate(doc, coreRegion) {
  const eol = doc.includes('\r\n') ? '\r\n' : '\n';
  const lf = doc.replace(/\r\n/g, '\n');
  const base = { content: doc, amendments: 0, droppedSections: [], superseded: 0 };
  if (/BEGIN generated:constitution-core/.test(lf)) return { ...base, status: 'already managed' };

  const adopted = applyConstitutionBlock(lf, coreRegion.replace(/\r\n/g, '\n'), { adopt: true });
  if (adopted.action !== 'adopted') return { ...base, status: `not adoptable (${adopted.action})` };

  const managedKeys = new Set(
    sections(coreRegion.replace(/\r\n/g, '\n')).filter((s) => s.heading).map((s) => headingKey(s.heading)),
  );
  const parts = sections(adopted.content.replace(/\r\n/g, '\n'));
  const dropped = [];
  let afterEnd = false;
  const kept = parts.filter((s) => {
    const wasAfterEnd = afterEnd;
    if (s.lines.some((l) => /END generated:constitution-core/.test(l))) afterEnd = true;
    if (wasAfterEnd && s.heading && !/^## (Skills|Reference & Project Setup)\b/.test(s.heading) && managedKeys.has(headingKey(s.heading))) {
      dropped.push(s.heading.replace(/^##\s*/, ''));
      return false;
    }
    return true;
  });

  let text = kept.map((s) => s.lines.join('\n')).join('\n');

  // Project-authored rules: explicit amendments, plus any bullet the new file lacks that has no provenance line.
  const newTitles = bulletTitles(text);
  const amendments = [];
  const seen = new Set();
  for (const b of bulletBlocks(lf)) {
    const lift = !newTitles.has(b.title) && (AMEND.test(b.title) || !b.standard);
    if (lift && !seen.has(b.text)) {
      seen.add(b.text);
      amendments.push(b.text);
    }
  }
  if (amendments.length) {
    const block = `${AMEND_SECTION}\n\n_Project-owned. These refine the managed rules above and survive every sync; keep each one short._\n\n${amendments.join('\n')}\n\n`;
    text = /^## Reference & Project Setup\b/m.test(text)
      ? text.replace(/^## Reference & Project Setup\b/m, `${block}## Reference & Project Setup`)
      : `${text.replace(/\n*$/, '\n\n')}${block}`;
  }
  text = text.replace(/\n{3,}/g, '\n\n');

  const after = bulletTitles(text);
  const superseded = bulletBlocks(lf).filter((b) => b.standard && !after.has(b.title)).length;

  return { content: text.replace(/\n/g, eol), status: 'migrated', amendments: amendments.length, droppedSections: dropped, superseded };
}

function run(projectRoot, { apply = false } = {}) {
  const file = path.join(projectRoot, 'AGENTS.md');
  if (!fs.existsSync(file)) return { status: 'no AGENTS.md', amendments: 0, droppedSections: [], superseded: 0 };
  const before = fs.readFileSync(file, 'utf8');
  const caps = readCapabilities(projectRoot);
  const core = readCanonicalCore(undefined, { capabilities: caps.declared ? caps.values : null });
  const res = migrate(before, core);
  if (apply && res.status === 'migrated') {
    const dir = path.join(projectRoot, '.guidelines-backups');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `AGENTS.${new Date().toISOString().replace(/[:.]/g, '-')}.md`), before, 'utf8');
    fs.writeFileSync(file, res.content, 'utf8');
  }
  return res;
}

function main() {
  const argv = process.argv.slice(2);
  const target = argv.find((a) => !a.startsWith('--'));
  if (!target || !fs.existsSync(target)) {
    console.error('Usage: node migrate-agents-to-managed.js <projectRoot> [--apply]');
    process.exit(2);
  }
  const apply = argv.includes('--apply');
  const r = run(path.resolve(target), { apply });
  console.log(`${r.status}${apply ? '' : ' (dry run)'} — ${r.amendments} project rule(s) preserved in ## Project Amendments; ${r.superseded} standard rule(s) superseded by the managed text; dropped duplicate section(s): ${r.droppedSections.length}`);
  if (r.status.startsWith('not adoptable') || r.status === 'no AGENTS.md') process.exit(2);
}

if (require.main === module) main();

module.exports = { migrate, run, extractAmendments };
