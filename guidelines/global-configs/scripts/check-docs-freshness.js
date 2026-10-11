#!/usr/bin/env node

/**
 * check-docs-freshness.js — Warn-only drift check for AI steering docs.
 *
 * Compares files changed in the working tree plus the HEAD commit against
 * filename-based trigger patterns. If trigger-like changes exist with no
 * steering-doc change alongside, it prints a warning telling the agent to
 * re-run its Docs-Decision (see 07-documentation/documentation-strategy.md).
 *
 * This script is informational, NEVER a gate: exit code is always 0.
 *
 * Usage (central repo):
 *   npm run docs:check
 *
 * Usage (any downstream project — this file has no dependencies):
 *   copy it into your project, then: node scripts/check-docs-freshness.js
 *
 * Source: global-configs/scripts/check-docs-freshness.js
 */

const { execSync } = require('child_process');

const TARGET_DIR = process.argv[2] || process.cwd();

// Steering docs: presence of any of these alongside a trigger = fresh.
const STEERING = [
  /(^|\/)AGENTS\.md$/,
  /(^|\/)WORLD\.md$/,
  /(^|\/)README\.md$/,
  /(^|\/)DEVTOOLS\.md$/,
  /docs\/AI_ARCHITECTURE\.md$/,
  /docs\/adr\//,
  /(^|\/)REQUIREMENTS\.md$/,
];

// Trigger patterns with the steering doc each one points at (one home per fact —
// documentation-strategy.md §Trigger Table).
const TRIGGERS = [
  { re: /(^|\/)\.env\.example$/, hint: 'AGENTS.md §Build & Validation Commands (env setup)' },
  { re: /(^|\/)package\.json$/, hint: 'AGENTS.md §Stack + §Build & Validation Commands' },
  { re: /Dockerfile$|docker-compose.*\.yml$/, hint: 'AGENTS.md §Build & Validation Commands' },
  { re: /src\/pages\/api\/|src\/app\/api\/|\/routes?\//, hint: 'docs/AI_ARCHITECTURE.md API Registry' },
  { re: /\/controllers?\//, hint: 'docs/AI_ARCHITECTURE.md API Registry' },
  { re: /prisma\/|\/migrations?\//, hint: 'docs/AI_ARCHITECTURE.md Data & Migrations' },
  // Auth: any path segment containing "auth" (oauth, authentication, …),
  // except author-byline files (AuthorCard, authors, …).
  { test: (f) => f.split(/[\\/]/).some((seg) => /auth/i.test(seg) && !/^author/i.test(seg)), hint: 'docs/AI_ARCHITECTURE.md Cross-Cutting (+ ADR if a decision)' },
  { re: /src\/components\/ui\/|src\/shared\/|packages\/ui\//, hint: 'AGENTS.md §Project-Specific Mandates' },
];

// Test-only files are never triggers (see Trigger table: test-only = N/A).
const TEST_FILE = /\.test\.|\.spec\.|__tests__\//;

function gitNames(args) {
  try {
    return execSync(`git ${args}`, { cwd: TARGET_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return null;
  }
}

function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Docs Freshness Check (warn-only, never fails)');
  console.log('═══════════════════════════════════════════\n');

  const uncommitted = gitNames('diff --name-only HEAD');
  const lastCommit = gitNames('show --name-only --pretty=format: HEAD');
  if (uncommitted === null || lastCommit === null) {
    console.log('Not a git repository (or git unavailable) — nothing to check.');
    process.exit(0);
  }

  const changed = [...new Set([...uncommitted, ...lastCommit])];
  console.log(`Changed files examined: ${changed.length} (uncommitted + HEAD commit)\n`);

  const steeringTouched = changed.filter((f) => STEERING.some((re) => re.test(f)));
  const hits = [];
  for (const f of changed) {
    if (STEERING.some((re) => re.test(f)) || TEST_FILE.test(f)) continue;
    const match = TRIGGERS.find((t) => (t.test ? t.test(f) : t.re.test(f)));
    if (match) hits.push({ file: f, hint: match.hint });
  }

  if (hits.length > 0 && steeringTouched.length === 0) {
    console.log('⚠️  Trigger-like changes WITHOUT steering-doc updates:\n');
    for (const h of hits) console.log(`    - ${h.file}\n      → update: ${h.hint}`);
    console.log('\n  Re-run your Docs-Decision: report `Docs: updated <files>` (triggers only — non-triggers stay silent).');
    console.log('  (Warning only — this check never fails.)');
  } else {
    console.log('✅ No trigger-like changes, or steering docs updated alongside.');
  }
  console.log();
  process.exit(0);
}

main();
