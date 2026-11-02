const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');
const {
  applyConstitutionBlock,
  markedSpan,
  readCanonicalCore,
  stripSourceCitations,
  BEGIN,
  END,
} = require('../inject-constitution-block.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/inject-constitution-block.js');

test('readCanonicalCore extracts the marked core from AGENTS.starter.md and strips → Source: by default', () => {
  const compact = readCanonicalCore();
  assert.ok(compact.startsWith(BEGIN), 'starts with BEGIN marker');
  assert.ok(compact.endsWith(END), 'ends with END marker');
  assert.doesNotMatch(compact, /→\s*Source:/, 'downstream core strips → Source: citations');
  assert.match(compact, /## Security/, 'contains core Security section');
  assert.match(compact, /## AI Collaboration/, 'contains core AI Collaboration section');

  const withSources = readCanonicalCore(undefined, { stripSources: false });
  assert.match(withSources, /→\s*Source:/, 'keep-sources preserves → Source: lines');
});

test('stripSourceCitations removes only provenance lines and preserves rule text', () => {
  const sample = [
    '- **SQL Injection Prevention.** Use parameterized queries.',
    '  → Source: `02-engineering-practices/security-engineering.md`',
    '- **Secrets Management.** Never hardcode secrets.',
    '  → Guideline: `03-git-and-ci/environment-management.md`',
  ].join('\n');
  const stripped = stripSourceCitations(sample);
  assert.equal(
    stripped,
    [
      '- **SQL Injection Prevention.** Use parameterized queries.',
      '- **Secrets Management.** Never hardcode secrets.',
    ].join('\n'),
  );
});

test('applyConstitutionBlock refreshes a marked region while preserving preamble, skills, and project setup', () => {
  const core = `${BEGIN}\n## Speed Mode\n\n- **New Rule.** Updated upstream.\n${END}`;
  const doc = [
    '# AGENTS.md — Project Constitution',
    '',
    'Custom preamble line.',
    '',
    BEGIN,
    '## Speed Mode',
    '',
    '- **Old Rule.** Stale text.',
    END,
    '',
    '## Skills',
    '',
    'Skills table stays untouched.',
    '',
    '## Reference & Project Setup',
    '',
    '| Node.js | Node | 22.14.0 |',
    '',
  ].join('\n');

  const { content, action } = applyConstitutionBlock(doc, core);
  assert.equal(action, 'refreshed');
  assert.match(content, /Custom preamble line\./, 'preamble is preserved');
  assert.match(content, /Updated upstream\./, 'core is refreshed');
  assert.doesNotMatch(content, /Stale text\./, 'stale core rule is replaced');
  assert.match(content, /Skills table stays untouched\./, '## Skills is preserved');
  assert.match(content, /22\.14\.0/, 'project-owned Stack table is preserved');
});

test('applyConstitutionBlock is idempotent and tolerates Prettier blank-line formatting', () => {
  const core = `${BEGIN}\n## Speed Mode\n\n- **Rule.** Text.\n${END}`;
  const prettierFormatted = `${BEGIN}\n\n## Speed Mode\n\n- **Rule.** Text.\n\n${END}`;
  const doc = `# AGENTS.md\n\n${prettierFormatted}\n\n## Reference & Project Setup\n`;

  const { content, action } = applyConstitutionBlock(doc, core);
  assert.equal(action, 'unchanged');
  assert.equal(content, doc, 'formatter layout is not churned');
});

test('applyConstitutionBlock preserves CRLF line endings', () => {
  const core = `${BEGIN}\n## Speed Mode\n- **New.**\n${END}`;
  const doc = `# AGENTS.md\r\n\r\n${BEGIN}\r\n## Speed Mode\r\n- **Old.**\r\n${END}\r\n`;
  const { content, action } = applyConstitutionBlock(doc, core);
  assert.equal(action, 'refreshed');
  assert.ok(content.includes('\r\n'), 'CRLF preserved');
  assert.ok(!/(?<!\r)\n/.test(content), 'no bare LF introduced');
});

test('applyConstitutionBlock leaves unmarked hand-maintained AGENTS.md untouched unless --adopt is passed', () => {
  const core = `${BEGIN}\n## Speed Mode\n- **Managed.**\n${END}`;
  const handWritten = [
    '# AGENTS.md — Custom Project',
    '',
    '## Speed Mode (Declared in WORLD.md)',
    '',
    '- **Old Unmarked Rule.** Hand-maintained.',
    '',
    '## Reference & Project Setup',
    '',
    '### Stack',
    '| Layer | Tech |',
    '',
  ].join('\n');

  const kept = applyConstitutionBlock(handWritten, core, { adopt: false });
  assert.equal(kept.action, 'kept');
  assert.equal(kept.content, handWritten, 'never overwrites an unmarked constitution without --adopt');

  const adopted = applyConstitutionBlock(handWritten, core, { adopt: true });
  assert.equal(adopted.action, 'adopted');
  assert.match(adopted.content, /BEGIN generated:constitution-core/);
  assert.match(adopted.content, /Managed\./);
  assert.doesNotMatch(adopted.content, /Old Unmarked Rule\./);
  assert.match(adopted.content, /### Stack/, 'project-owned Reference & Project Setup survives adoption');
});

test('markedSpan refuses half-marked documents', () => {
  assert.equal(markedSpan(`${BEGIN}\nno end marker`), null);
  assert.equal(markedSpan(`no begin marker\n${END}`), null);
});

test('CLI refreshes marked project, leaves unmarked project alone, and supports --check', () => {
  const run = (root, ...flags) =>
    runSync(process.execPath, [SCRIPT, root, ...flags], { cwd: REPO_ROOT });

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inject-const-'));
  const agentsPath = path.join(dir, 'AGENTS.md');
  fs.writeFileSync(
    agentsPath,
    `# AGENTS.md\n\n${BEGIN}\n## Speed Mode\n- **Stale.**\n${END}\n\n## Reference & Project Setup\n\nMy stack.\n`,
    'utf8',
  );

  assert.equal(run(dir, '--check', '--quiet').status, 1, '--check exits 1 when stale');
  assert.equal(run(dir, '--quiet').status, 0, 'writes refreshed core');
  const updated = fs.readFileSync(agentsPath, 'utf8');
  assert.match(updated, /Authorization & Tenant Isolation/, 'carries current security rules');
  assert.doesNotMatch(updated, /→\s*Source:/, 'strips → Source: lines in downstream project');
  assert.match(updated, /My stack\./, 'preserves project setup');
  assert.equal(run(dir, '--check', '--quiet').status, 0, '--check exits 0 when current');
});
