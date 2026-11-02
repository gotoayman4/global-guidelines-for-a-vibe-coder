const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { runSync } = require('../lib/run-sync.js');
const { parseCapabilities, readCapabilities } = require('../lib/capabilities.js');
const {
  filterByCapabilities,
  readCanonicalCore,
  BEGIN,
  END,
} = require('../inject-constitution-block.js');

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const SCRIPT = path.join(REPO_ROOT, 'guidelines/global-configs/scripts/inject-constitution-block.js');

const world = (decl) => `# WORLD\n\n## Capabilities\n\n${decl}\n\n## Other\n\n- **capabilities:** \`bilingual\`\n`;

test('parseCapabilities reads the backticked list item inside §Capabilities only', () => {
  const r = parseCapabilities(world('- **capabilities:** `web-ui, API, nonsense`'));
  assert.deepEqual(r.values, ['web-ui', 'api']);
  assert.deepEqual(r.unknown, ['nonsense']);
  assert.equal(r.declared, true);
});

test('parseCapabilities: absent, bare-word, typo-only and `none` declarations', () => {
  assert.equal(parseCapabilities('# WORLD\n').declared, false);
  assert.equal(parseCapabilities(world('- **capabilities:** web-ui')).declared, false, 'no backticks = prose');
  assert.equal(parseCapabilities(world('- **capabilities:** `webui`')).declared, false, 'typo-only reads as undeclared (more rules, never fewer)');
  const none = parseCapabilities(world('- **capabilities:** `none`'));
  assert.deepEqual([none.declared, none.values], [true, []]);
});

test('a capabilities line in a later section is not a declaration', () => {
  const text = '# WORLD\n\n## Capabilities\n\nnothing here\n\n## Other\n\n- **capabilities:** `api`\n';
  assert.equal(parseCapabilities(text).declared, false);
});

const REGION = [
  BEGIN,
  '## Security',
  '',
  '- **Always.** Universal.',
  '',
  '## Design & UX (Load for UI Work)',
  '<!-- requires: web-ui -->',
  '',
  '- **UI.** Only for UIs.',
  '',
  '## RTL & Arabic (Bilingual)',
  '<!-- requires: bilingual -->',
  '',
  '- **RTL.** Only for bilingual.',
  END,
].join('\n');

test('filterByCapabilities keeps universal sections and any-of matches, and names what it omitted', () => {
  const out = filterByCapabilities(REGION, ['web-ui']);
  assert.match(out, /## Security/);
  assert.match(out, /## Design & UX/);
  assert.doesNotMatch(out, /\*\*RTL\.\*\*/);
  assert.match(out, /Modules not applicable here.*: RTL & Arabic\./);
  assert.doesNotMatch(out, /requires:/, 'markers never reach a project');
  assert.ok(out.startsWith(BEGIN) && out.endsWith(END), 'markers survive even when the last section is dropped');
});

test('filterByCapabilities: null keeps every module, [] keeps only the universal core', () => {
  const all = filterByCapabilities(REGION, null);
  assert.match(all, /\*\*UI\.\*\*/);
  assert.match(all, /\*\*RTL\.\*\*/);
  assert.doesNotMatch(all, /requires:|Modules not applicable/);
  const core = filterByCapabilities(REGION, []);
  assert.match(core, /\*\*Always\.\*\*/);
  assert.doesNotMatch(core, /\*\*UI\.\*\*|\*\*RTL\.\*\*/);
});

test('filterByCapabilities on a whole document preserves text outside the markers', () => {
  const doc = `# Title\n\nintro\n\n${REGION}\n\n## Skills\n\ntail\n`;
  const out = filterByCapabilities(doc, null);
  assert.ok(out.startsWith('# Title\n\nintro\n\n'));
  assert.ok(out.endsWith('## Skills\n\ntail\n'));
});

test('the real starter: capabilities `none` drops every gated module, undeclared keeps them all', () => {
  const all = readCanonicalCore();
  const core = readCanonicalCore(undefined, { capabilities: [] });
  for (const heading of ['## Design & UX', '## RTL & Arabic', '## Performance', '## Web Security', '## Frontend Architecture', '## API Design']) {
    assert.ok(all.includes(heading), `undeclared keeps ${heading}`);
    assert.ok(!core.includes(heading), `none drops ${heading}`);
  }
  assert.ok(core.includes('## Security') && core.includes('## Testing') && core.includes('## AI Collaboration'));
  assert.ok(core.length < all.length);
});

test('CLI: a project declaring capabilities receives only its modules', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caps-'));
  try {
    const starter = fs.readFileSync(path.join(REPO_ROOT, 'guidelines/global-configs/templates/AGENTS.starter.md'), 'utf8');
    const begin = starter.indexOf(BEGIN);
    const stub = `# AGENTS.md\n\n${BEGIN}\nold\n${END}\n\n## Reference & Project Setup\n\nmine\n`;
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), stub);
    fs.writeFileSync(path.join(dir, 'WORLD.md'), world('- **capabilities:** `api, database`'));
    assert.ok(begin > -1);
    const res = runSync(process.execPath, [SCRIPT, dir, '--quiet']);
    assert.equal(res.status, 0, res.stderr);
    const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
    assert.match(agents, /## API Design/);
    assert.doesNotMatch(agents, /## RTL & Arabic|## Design & UX/);
    assert.match(agents, /Modules not applicable here/);
    assert.match(agents, /## Reference & Project Setup\n\nmine/);
    assert.equal(readCapabilities(dir).declared, true);
    const check = runSync(process.execPath, [SCRIPT, dir, '--check', '--quiet']);
    assert.equal(check.status, 0, 'the refreshed block is stable under --check');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
