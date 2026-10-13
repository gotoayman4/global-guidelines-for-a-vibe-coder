#!/usr/bin/env node

/**
 * audit-rules.js — Drift Detection for Extracted Rules
 *
 * Compares rules extracted in global-configs/templates/ against source guideline
 * documents. Flags:
 *   - Rules referencing guidelines that no longer exist
 *   - Guidelines with new MUST/SHOULD statements not reflected in rules
 *   - Rules whose source guideline has been archived
 *   - Guidelines whose `control:` names a guard that does not resolve
 *
 * A RULE CANNOT POINT AT A CONTROL THAT DOES NOT EXIST. The `control:` front-matter key names the
 * npm script that enforces the rule, and this audit fails one that is named and unresolvable — a
 * rule that reads as enforced and is not is worse than a rule with no control at all. An ABSENT
 * key is allowed and counted: backfilling 60-odd guidelines in one pass is a change nobody can
 * review, so the ratchet is deliberate. `npm run new:guideline` scaffolds the key, so a new rule
 * cannot avoid the question.
 *
 * Usage:
 *   node global-configs/scripts/audit-rules.js
 *
 * Output:
 *   Human-readable report of discrepancies
 *   Exit code 0 = no drift, 1 = drift detected
 *
 * Source: global-guidelines-for-a-vibe-coder/global-configs/scripts/audit-rules.js
 * Last Updated: 2026-05-24
 */

const fs = require('fs');
const path = require('path');
const { parseFrontMatter, missingKeys, meta, asList } = require('./lib/front-matter.js');
const { isToken, TOKEN_NAMES } = require('./lib/tech-tokens.js');
const { SKILL_FILE, SKILL_EXT, listSkills } = require('./lib/skill-files.js');

// ─── Configuration ───────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..', '..');
// The repo root — three levels up: scripts → global-configs → guidelines → the repo. This is where
// `package.json` lives, and it is the same depth centrally and inside a project's `_guidelines/`.
const REPO = path.resolve(__dirname, '..', '..', '..');
const GUIDELINE_DIRS = [
  '00-ai-fundamentals',
  '01-workflow-methodology',
  '02-engineering-practices',
  '03-git-and-ci',
  '04-architecture',
  '05-stack-guides',
  '06-frontend-patterns',
  '07-documentation',
  '08-governance',
];
// Guidelines intentionally not extracted into always-loaded starter templates
// (loaded on-demand via retrieval system)
const EXTRACTION_EXCLUSIONS = [
  '00-ai-fundamentals/ai-agent-orchestration.md',
  '00-ai-fundamentals/context-management-strategy.md',
  '00-ai-fundamentals/prompt-engineering-patterns.md',
  '00-ai-fundamentals/plain-language-prompts.md',
  '00-ai-fundamentals/day-one-setup.md',
  '00-ai-fundamentals/verification-for-non-coders.md',
  '00-ai-fundamentals/escalation-protocol.md',
  '01-workflow-methodology/debugging-with-ai.md',
  '01-workflow-methodology/development-workflow.md',
  '01-workflow-methodology/planning-and-scoping.md',
  '01-workflow-methodology/workflow-friction-audit.md',
  '02-engineering-practices/accessibility-standards.md',
  '03-git-and-ci/ci-cd-philosophy.md',
  '04-architecture/database-architecture.md',
  '05-stack-guides/mui/mui-rtl-bidirectional.md',
  '05-stack-guides/mui/mui-styling.md',
  '05-stack-guides/nestjs/nestjs-architecture.md',
  '05-stack-guides/react/react-architecture.md',
  '05-stack-guides/supabase/supabase-auth.md',
  '05-stack-guides/supabase/supabase-database.md',
  '05-stack-guides/typescript/typescript-conventions.md',
  '05-stack-guides/vite/vite-configuration.md',
  '06-frontend-patterns/dialog-patterns.md',
  '06-frontend-patterns/form-patterns.md',
  '06-frontend-patterns/notification-patterns.md',
  '06-frontend-patterns/responsive-design.md',
  '06-frontend-patterns/table-patterns.md',
  '07-documentation/guideline-authoring-standards.md',
  '08-governance/ai-governance-framework.md',
  '08-governance/classification-system.md',
  '08-governance/rule-extraction-methodology.md',
  '00-ai-fundamentals/beginner-vibe-coder-guide.md',
  '00-ai-fundamentals/multi-tool-workflows.md',
  '02-engineering-practices/cost-optimization-strategy.md',
  '02-engineering-practices/ai-code-documentation.md',
  '02-engineering-practices/file-organization.md',
  '05-stack-guides/rtl-tech-stack.md',
  '06-frontend-patterns/icon-usage.md', // icon rules extracted into visual-design-principles.md and AGENTS.starter.md
];

const STARTER_TEMPLATES = [
  'global-configs/templates/AGENTS.starter.md',
  'global-configs/templates/copilot-instructions.starter.md',
  'global-configs/templates/WORLD.starter.md',
];

// Docs relocated to docs/ (outside guidelines/) — valid reference targets, not extractable guidelines
const EXTRACTION_DOCS = new Set([
  'beginner-vibe-coder-guide.md',
  'day-one-setup.md',
  'verification-for-non-coders.md',
  'plain-language-prompts.md',
  'escalation-protocol.md',
  'rule-extraction-methodology.md',
  'classification-system.md',
  'guideline-authoring-standards.md',
  'skill-design-patterns.md',
]);
const SKILLS_DIR = 'global-configs/skills';

/**
 * The front-matter keys a skill MUST declare to be loadable at all.
 *
 * `description` is not documentation — it is the field a native skill loader reads to decide when to
 * activate the skill (Claude Code's docs say it outright: the description "helps Claude decide when
 * to load the skill automatically"). A skill without one exists and can never fire, which is the
 * failure mode a directory listing cannot show. `name` is what the loader registers the skill as.
 */
const SKILL_CONTRACT = ['name', 'description'];

/** The Agent Skills standard's name rule: 1–64 chars, `a-z 0-9 -`, no leading/trailing/consecutive hyphen. */
const SKILL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** The standard caps `description` at 1024 characters. */
const SKILL_DESCRIPTION_MAX = 1024;

/**
 * Every skill on disk, derived — never a hand-typed list.
 *
 * This WAS an array of 18 literal paths. By 2026-10-12 the corpus held 20: adding
 * `firebase-firestore-practices` and `firestore-cost-optimization` grew the directory and left the
 * list behind, so two skills were never audited for dangling guideline references while the report
 * said the skills had been checked. A hand-kept list of files fails the same way a hand-kept list of
 * anything fails — in the direction nobody notices.
 */
function findSkillFiles(repo = REPO_ROOT) {
  const dir = path.join(repo, SKILLS_DIR);
  return listSkills(dir).map((s) => `${SKILLS_DIR}/${s.file}`);
}

/**
 * Every way a skill departs from the Agent Skills standard, as a list of human-readable reasons.
 *
 * INTENT: the standard is not decoration — a skill that violates the name rule, ships an empty or
 * over-long `description`, or is not a `<name>/SKILL.md` directory cannot be loaded by a conformant
 * agent, and the failure is invisible from a directory listing. Each rule here is one the standard
 * states explicitly, and the check is a pure function so it can be reversal-proved on a mutation.
 *
 * @param {string} relPath the skill path relative to the repo root, `/`-separated
 * @param {Record<string, unknown>|null} fm
 * @returns {string[]}
 */
function skillConformance(relPath, fm) {
  const problems = [];
  const name = fm && typeof fm.name === 'string' ? fm.name : null;
  const description = fm && typeof fm.description === 'string' ? fm.description : '';

  // 1. Layout — a directory containing SKILL.md, so the skill name matches its parent directory.
  const dirName = relPath.split('/').slice(-2)[0];
  const base = relPath.split('/').pop();
  if (base !== SKILL_FILE) {
    problems.push(`not a <name>/SKILL.md layout (found ${base})`);
  } else if (name && dirName && name !== dirName) {
    problems.push(`front-matter name "${name}" does not match its directory "${dirName}"`);
  }

  // 2. `name` — required, 1–64 chars, lowercase alphanumerics and single hyphens.
  if (!name) {
    problems.push('no name declared');
  } else if (name.length > 64) {
    problems.push(`name is ${name.length} chars (max 64)`);
  } else if (!SKILL_NAME_RE.test(name)) {
    problems.push(`name "${name}" must be lowercase a-z/0-9/hyphen, with no leading, trailing or doubled hyphen`);
  }

  // 3. `description` — required, non-empty, at most 1024 characters.
  if (!description.trim()) {
    problems.push('no description declared (no loader can activate it)');
  } else if (description.length > SKILL_DESCRIPTION_MAX) {
    problems.push(`description is ${description.length} chars (max ${SKILL_DESCRIPTION_MAX})`);
  }

  return problems;
}

/** The contract keys this skill's front-matter is missing or has left blank. */
function skillContract(fm) {
  return missingKeys(fm, SKILL_CONTRACT);
}

/**
 * `appliesTo` values the technology vocabulary cannot resolve.
 *
 * INTENT: `appliesTo` is the declaration the skill selector intersects against a project's stack, so
 * an unresolvable value is silently inert — `appliesTo: [mooi]` reads as "no scope", which makes the
 * skill universal and copies it into every project, including the ones it was declared to avoid. The
 * failure is invisible from every direction: the skill looks scoped, the plan looks confident, and
 * the only symptom is a skill in the wrong repository. Checking the value against the vocabulary that
 * actually consumes it is the one place the mistake can be caught.
 */
function unresolvedAppliesTo(fm) {
  return asList(meta(fm, 'appliesTo')).filter((t) => !isToken(t));
}

// ─── Guideline Parsing ───────────────────────────────────────────────────────

/**
 * Recursively find all .md files under a directory.
 */
function findGuidelineFiles(dirPath) {
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...findGuidelineFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Parse a guideline file and extract:
 *   - Status (Normative/Advisory/Archived)
 *   - All MUST/MUST NOT/SHOULD/SHOULD NOT statements
 *   - Anti-pattern entries
 *   - The optional `control:` front-matter key (the guard that enforces the rule)
 */
function parseGuideline(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');

  // Extract status
  const statusMatch = content.match(/\*\*Status:\*\*\s*(Normative|Advisory|Archived)/i);
  const status = statusMatch ? statusMatch[1] : 'Unknown';

  // Extract the `control:` front-matter key. Absent means "not yet classified" and is allowed —
  // the ratchet is deliberate (see `checkControl`); the field is not backfilled across the corpus.
  const frontMatter = content.match(/^---\n([\s\S]*?)\n---\n/);
  const controlMatch = frontMatter && frontMatter[1].match(/^control:\s*"?(.*?)"?\s*$/m);
  const control = controlMatch && controlMatch[1].trim() ? controlMatch[1].trim() : null;

  // Extract normative statements (MUST / MUST NOT / SHOULD / SHOULD NOT / NEVER / FORBID)
  const imperativeRegex = /\b(MUST NOT|MUST|SHOULD NOT|SHOULD|NEVER|FORBID)\b/gi;
  const imperativeLines = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(imperativeRegex);
    if (match) {
      // Get surrounding context (2 lines before and after)
      const start = Math.max(0, i - 1);
      const end = Math.min(lines.length, i + 2);
      const context = lines.slice(start, end).join(' ').trim();
      imperativeLines.push({
        line: i + 1,
        text: lines[i].trim(),
        context: context.slice(0, 200),
        keyword: match[0].toUpperCase(),
      });
    }
  }

  return {
    path: relativePath,
    status,
    control,
    imperativeLines,
  };
}

// ─── The control a rule names ────────────────────────────────────────────────

/**
 * Does the `control:` a guideline names actually exist?
 *
 * A rule that points at a control which was deleted is worse than a rule with no control at all:
 * it reads as enforced. So the check is not "is the field filled in" but "does the thing it names
 * exist" — the npm script is declared, and the file that script runs is on disk.
 *
 * @returns {{ok: boolean, why?: string, file?: string}}
 */
function checkControl(control, scripts) {
  const name = String(control).replace(/^npm run\s+/, '').trim();
  const command = scripts[name];
  if (!command) return { ok: false, why: `\`${name}\` is not a script in package.json` };
  const file = command.match(/([A-Za-z0-9_./-]+\.(?:js|mjs|cjs|ps1|sh))/);
  if (!file) return { ok: false, why: `\`${name}\` runs no script file, so the control cannot be verified` };
  if (!fs.existsSync(path.join(REPO, file[1]))) {
    return { ok: false, why: `\`${name}\` runs \`${file[1]}\`, which does not exist` };
  }
  return { ok: true, file: file[1] };
}

/** The repo's npm scripts, or an empty set when there is no package.json to read. */
function readScripts(repo = REPO) {
  const pkg = path.join(repo, 'package.json');
  if (!fs.existsSync(pkg)) return {};
  try {
    return JSON.parse(fs.readFileSync(pkg, 'utf8')).scripts || {};
  } catch {
    return {};
  }
}

// ─── Rule Parsing from Templates ─────────────────────────────────────────────

/**
 * Parse a starter template and extract:
 *   - Source guideline references (→ Source: lines)
 *   - The rule text associated with each source
 */
function parseTemplateRules(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
  const rules = [];

  const lines = content.split('\n');
  let currentSection = '';
  let currentRuleLines = [];
  let currentSource = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track section
    const sectionMatch = line.match(/^###\s+(.+)/);
    if (sectionMatch) {
      // Save previous rule if any
      if (currentSource && currentRuleLines.length > 0) {
        rules.push({
          section: currentSection,
          source: currentSource,
          text: currentRuleLines.join(' ').trim(),
          templatePath: relativePath,
          line: i,
        });
      }
      currentSection = sectionMatch[1].trim();
      currentRuleLines = [];
      currentSource = null;
      continue;
    }

    // Detect rule lines (start with '- ' in list items)
    if (line.trim().startsWith('- ')) {
      // If we already have a source from a previous bullet item, save that rule first
      if (currentSource && currentRuleLines.length > 0) {
        rules.push({
          section: currentSection,
          source: currentSource,
          text: currentRuleLines.join(' ').trim(),
          templatePath: relativePath,
          line: i,
        });
        currentRuleLines = [];
        currentSource = null;
      }
      currentRuleLines.push(line.trim().replace(/^-\s*/, ''));
    }

    // Detect paragraph-format rules (AGENTS.starter.md style)
    // Non-empty line that isn't a heading, source ref, code block, or list marker
    const trimmed = line.trim();
    if (trimmed.length > 0 &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('- ') &&
        !trimmed.startsWith('→') &&
        !trimmed.startsWith('```') &&
        !trimmed.startsWith('|') &&
        !trimmed.startsWith('**') &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('[')) {
      currentRuleLines.push(trimmed);
    }

    // Detect source reference (supports both → Source: and → Guideline: for backward compatibility)
    const sourceMatch = line.match(/→\s*(?:Source|Guideline):\s*`([^`]+)`/);
    if (sourceMatch) {
      currentSource = sourceMatch[1];
    }
  }

  // Save last rule
  if (currentSource && currentRuleLines.length > 0) {
    rules.push({
      section: currentSection,
      source: currentSource,
      text: currentRuleLines.join(' ').trim(),
      templatePath: relativePath,
      line: lines.length,
    });
  }

  return rules;
}

// ─── Audit Logic ─────────────────────────────────────────────────────────────

function audit() {
  console.log('═══════════════════════════════════════════');
  console.log('  Rule Extraction Drift Audit');
  console.log(`  ${new Date().toISOString().split('T')[0]}`);
  console.log('═══════════════════════════════════════════\n');

  // 1. Parse all guidelines
  console.log('📖 Parsing guidelines...');
  const guidelines = {};
  let totalGuidelines = 0;
  for (const dir of GUIDELINE_DIRS) {
    const dirPath = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    const files = findGuidelineFiles(dirPath);
    for (const file of files) {
      const parsed = parseGuideline(file);
      guidelines[parsed.path] = parsed;
      totalGuidelines++;
    }
  }
  console.log(`   Found ${totalGuidelines} guideline files\n`);

  // 2. Parse all starter templates
  console.log('📖 Parsing starter templates...');
  const allRules = [];
  let driftCount = 0;
  const sourceFileCounts = {};
  for (const template of STARTER_TEMPLATES) {
    const templatePath = path.join(REPO_ROOT, template);
    if (!fs.existsSync(templatePath)) {
      console.log(`   ⚠️  Template not found: ${template}`);
      continue;
    }
    const rules = parseTemplateRules(templatePath);
    allRules.push(...rules);
    console.log(`   ${template}: ${rules.length} rules extracted`);
  }
  console.log(`   Total: ${allRules.length} rules\n`);

  const KNOWN_NON_GUIDELINE_FILES = new Set([
    'skill.md', 'SKILL.md', 'README.md', 'CHANGELOG.md', 'AGENTS.md', 'CLAUDE.md', 'WORLD.md',
    'DEVTOOLS.md', 'GEMINI.md', 'GEMINI.md.template',
    'instructions.md', 'copilot-instructions.md', 'copilot-instructions.starter.md',
    'global-guidelines.md', 'cursor-global-guidelines.md', 'windsurf-global-guidelines.md',
    'trae-global-guidelines.md', 'qoder-global-guidelines.md', 'starter.md',
    'kilo.jsonc', 'opencode.json',
  ]);

  // 2b. Parse all skill files for guideline references
  console.log('📖 Parsing skill files...');
  const skillPaths = findSkillFiles();
  let totalSkillRefs = 0;
  for (const skill of skillPaths) {
    const skillPath = path.join(REPO_ROOT, skill);
    if (!fs.existsSync(skillPath)) {
      console.log(`   ⚠️  Skill not found: ${skill}`);
      continue;
    }
    const content = fs.readFileSync(skillPath, 'utf8');
    const relativePath = path.relative(REPO_ROOT, skillPath).replace(/\\/g, '/');

    // 2b-i. The loadability contract and the Agent Skills standard's rules. A skill that violates
    // either cannot be loaded by a conformant agent, and the defect is invisible from a listing.
    const fm = parseFrontMatter(content);
    const missing = skillContract(fm);
    if (missing.length) {
      console.log(`   ❌ UNLOADABLE SKILL: ${relativePath} is missing ${missing.join(', ')}`);
      driftCount++;
    }
    // The two missing-key cases are already reported above; do not double-count them.
    for (const problem of skillConformance(relativePath, fm).filter((p) => !/^no (name|description) declared/.test(p))) {
      console.log(`   ❌ NON-CONFORMANT SKILL: ${relativePath}: ${problem}`);
      driftCount++;
    }

    // Per file, not cumulative: the counter used to accumulate across the whole loop, so the last
    // skill printed the corpus total and every skill before it printed a running sum. A per-file
    // count is the only reading that answers "how many references does THIS skill carry".
    let fileRefs = 0;
    // Extract guideline references from skills (lines like "- `guideline-file.md`")
    // Exclude .skill.md self-references and common false positives
    const guidelineRefRegex = /[`\[]?((?:\d{2}-[\w-]+\/)?[\w-]+\.md)[`\]]?/g;
    const matches = content.matchAll(guidelineRefRegex);
    for (const match of matches) {
      const ref = match[1];
      // Skip self-references and non-guideline .md files
      if (ref.endsWith('.skill.md') || KNOWN_NON_GUIDELINE_FILES.has(ref) || KNOWN_NON_GUIDELINE_FILES.has(path.basename(ref))) continue;
      // A file bundled INSIDE the skill is part of the skill, not a guideline reference — the Agent
      // Skills standard's progressive-disclosure layout (`references/guard-snippet.md`). The regex
      // captures only the basename, so both the skill root and its `references/` are probed.
      const skillDir = path.dirname(skillPath);
      if (fs.existsSync(path.join(skillDir, ref)) || fs.existsSync(path.join(skillDir, 'references', ref))) continue;
      // Check if the referenced guideline exists
      let found = false;
      for (const guidelinePath of Object.keys(guidelines)) {
        if (guidelinePath.endsWith(ref) || guidelinePath.includes(ref)) {
          found = true;
          sourceFileCounts[guidelinePath] = (sourceFileCounts[guidelinePath] || 0) + 1;
          break;
        }
      }
      // Docs relocated outside the guidelines tree (human guides, repo-meta) are valid targets
      if (!found && EXTRACTION_DOCS.has(path.basename(ref))) {
        found = true;
      }
      if (!found) {
        console.log(`   ⚠️  Skill ${relativePath} references unknown guideline: ${ref}`);
        driftCount++;
      }
      fileRefs++;
    }
    totalSkillRefs += fileRefs;
    console.log(`   ${relativePath}: ${fileRefs} guideline references`);
  }
  console.log(`   ${skillPaths.length} skills scanned, ${totalSkillRefs} guideline references total\n`);

  // 3. Audit: rules without source guidelines
  console.log('🔍 Checking rule source references...\n');
  for (const rule of allRules) {
    const sourcePath = rule.source;

    // Try to match the source reference to a guideline file
    // The reference may be relative like "02-engineering-practices/security-engineering.md"
    let found = false;
    for (const guidelinePath of Object.keys(guidelines)) {
      if (guidelinePath.endsWith(sourcePath) || guidelinePath.includes(sourcePath)) {
        found = true;
        sourceFileCounts[guidelinePath] = (sourceFileCounts[guidelinePath] || 0) + 1;

        // Check if archived
        if (guidelines[guidelinePath].status === 'Archived') {
          console.log(`⚠️  ARCHIVED SOURCE: Rule in ${rule.templatePath}`);
          console.log(`   References archived guideline: ${guidelinePath}`);
          console.log(`   Rule text: "${rule.text.slice(0, 100)}..."`);
          console.log(`   Action: Remove this rule or update to superseding guideline\n`);
          driftCount++;
        }
        break;
      }
    }

    if (!found) {
      console.log(`❌ ORPHANED RULE: Rule in ${rule.templatePath}`);
      console.log(`   References non-existent source: \`${sourcePath}\``);
      console.log(`   Rule text: "${rule.text.slice(0, 100)}..."`);
      console.log(`   Action: Update source path or remove rule\n`);
      driftCount++;
    }
  }

  // 4. Check for guidelines with normative statements not reflected in rules
  console.log('🔍 Checking for uncovered normative guidelines...\n');

  for (const [guidelinePath, guideline] of Object.entries(guidelines)) {
    // Skip archived and advisory
    if (guideline.status === 'Archived') continue;
    if (guideline.status === 'Advisory' && guideline.imperativeLines.length === 0) continue;

    const hasRules = sourceFileCounts[guidelinePath] !== undefined;

    // Normative guidelines with MUST statements but NO extracted rules
    if (!hasRules && guideline.status === 'Normative' && guideline.imperativeLines.length > 0) {
      const isExcluded = EXTRACTION_EXCLUSIONS.some(ex => guidelinePath.endsWith(ex) || guidelinePath.includes(ex));
      if (!isExcluded) {
        console.log(`⚠️  UNCOVERED NORMATIVE: ${guidelinePath}`);
        console.log(`   Status: Normative | Imperative statements: ${guideline.imperativeLines.length}`);
        console.log(`   This guideline has MUST/SHOULD statements but no rules extracted.`);
        console.log(`   Action: Extract rules or add to EXTRACTION_EXCLUSIONS if intentionally not extracted\n`);
        driftCount++;
      }
    }
  }

  // 4b. A rule cannot point at a control that does not exist.
  // The ratchet is deliberate: an ABSENT `control:` is allowed and counted, never failed, because
  // backfilling 60-odd guidelines in one pass is a change nobody can review. What is failed is a
  // control that is NAMED and does not resolve — a rule that reads as enforced and is not.
  console.log('🔍 Checking declared controls...\n');
  const scripts = readScripts();
  const tally = { declared: 0, none: 0, absent: 0 };
  for (const [guidelinePath, guideline] of Object.entries(guidelines)) {
    if (!guideline.control) {
      tally.absent += 1;
      continue;
    }
    if (guideline.control === 'none') {
      tally.none += 1;
      continue;
    }
    tally.declared += 1;
    const verdict = checkControl(guideline.control, scripts);
    if (!verdict.ok) {
      console.log(`❌ DANGLING CONTROL: ${guidelinePath}`);
      console.log(`   Declares control: \`${guideline.control}\``);
      console.log(`   ${verdict.why}`);
      console.log('   Action: point it at a real guard, or set `control: none` if the rule is deliberately unguarded\n');
      driftCount++;
    }
  }
  console.log(`   ${tally.declared} declare a control · ${tally.none} declare \`none\` · ${tally.absent} unclassified (the ratchet)\n`);

  // 4c. A skill cannot be activated without the fields a loader reads.
  // Measured 2026-10-12: `mui-design-system.skill.md` declared neither `name` nor `description`, so
  // no loader could surface it and no index could render its trigger — a skill that exists and
  // cannot fire. Nothing caught it, because the only thing that read the skills was the reference
  // scan above, which cares about what a skill POINTS AT, never whether it can be loaded.
  console.log('🔍 Checking the skill front-matter contract...\n');
  const contractSkills = findSkillFiles();
  if (contractSkills.length === 0) {
    // Non-vacuity: an empty corpus makes the loop below pass over nothing and prove nothing.
    console.log(`❌ no ${SKILL_EXT} files found under ${SKILLS_DIR}/ — the contract cannot be checked\n`);
    driftCount += 1;
  }
  let contractOk = 0;
  let scopedOk = 0;
  for (const skill of contractSkills) {
    const abs = path.join(REPO_ROOT, skill);
    const fm = parseFrontMatter(fs.readFileSync(abs, 'utf8'));
    const missing = skillContract(fm);
    const unresolved = unresolvedAppliesTo(fm);
    if (missing.length === 0) contractOk += 1;
    if (unresolved.length === 0) scopedOk += 1;
    if (missing.length === 0 && unresolved.length === 0) continue;

    if (missing.length) {
      console.log(`❌ UNLOADABLE SKILL: ${skill}`);
      console.log(`   Missing front-matter: ${missing.join(', ')}`);
      console.log('   `description` is the field a loader reads to decide when to activate the skill, so');
      console.log('   without it the skill can never fire. `name` is what the loader registers it as.');
      console.log('   Action: declare both in the front-matter — the contract is in `skill-design-patterns.md`\n');
      driftCount += 1;
    }

    if (unresolved.length) {
      console.log(`❌ UNRESOLVABLE appliesTo: ${skill}`);
      console.log(`   Values the vocabulary does not know: ${unresolved.join(', ')}`);
      console.log("   The skill selector intersects `appliesTo` against a project's stack tokens, so an");
      console.log('   unresolvable value is inert: the skill reads as unscoped and is copied to EVERY');
      console.log('   project, including the ones it was declared to avoid.');
      console.log(`   Known tokens: ${TOKEN_NAMES.join(', ')}`);
      console.log('   Action: use a known token, or drop the value and let `tags` infer the scope.\n');
      driftCount += 1;
    }
  }
  if (contractSkills.length > 0) {
    console.log(`   ${contractOk}/${contractSkills.length} skills declare ${SKILL_CONTRACT.join(' + ')}`);
    console.log(`   ${scopedOk}/${contractSkills.length} skills have a resolvable appliesTo (declared or absent)\n`);
  }

  // 5. Cross-template consistency check
  // Pointer templates (copilot-instructions.starter.md) intentionally
  // contain no rules — they redirect to AGENTS.starter.md. Only compare templates that
  // actually extract rules (more than zero).
  console.log('🔍 Checking cross-template consistency...\n');
  const templateRules = {};
  for (const template of STARTER_TEMPLATES) {
    if (template.endsWith('WORLD.starter.md')) continue; // Exclude product intent templates
    const templatePath = path.join(REPO_ROOT, template);
    if (!fs.existsSync(templatePath)) continue;
    const rules = parseTemplateRules(templatePath);
    const templateName = path.basename(template);
    if (rules.length === 0) {
      console.log(`   ℹ️  ${templateName}: pointer template (no inline rules) — skipped`);
      continue;
    }
    templateRules[templateName] = new Set(rules.map(r => r.text.trim().slice(0, 80)));
  }
  const templateNames = Object.keys(templateRules);
  if (templateNames.length > 1) {
    const referenceTemplate = templateNames[0];
    const referenceRules = templateRules[referenceTemplate];
    for (let i = 1; i < templateNames.length; i++) {
      const comparingTemplate = templateNames[i];
      const comparingRules = templateRules[comparingTemplate];
      const missingInComparing = [...referenceRules].filter(r => !comparingRules.has(r));
      const extraInComparing = [...comparingRules].filter(r => !referenceRules.has(r));
      if (missingInComparing.length > 0) {
        console.log(`⚠️  Rules in ${referenceTemplate} but missing from ${comparingTemplate}:`);
        missingInComparing.forEach(r => console.log(`   - "${r}"`));
        console.log();
        driftCount += missingInComparing.length;
      }
      if (extraInComparing.length > 0) {
        console.log(`ℹ️  Rules in ${comparingTemplate} but not in ${referenceTemplate}:`);
        extraInComparing.forEach(r => console.log(`   - "${r}"`));
        console.log();
      }
    }
  }

  // 7. Summary
  console.log('═══════════════════════════════════════════');
  if (driftCount === 0) {
    console.log('✅ No drift detected. Rules are in sync with guidelines.');
  } else {
    console.log(`❌ ${driftCount} drift issues found. See details above.`);
  }
  console.log('═══════════════════════════════════════════\n');

  // 8. Coverage stats
  const normativeCount = Object.values(guidelines).filter(g => g.status === 'Normative').length;
  const normativeCovered = Object.entries(sourceFileCounts).filter(
    ([p]) => guidelines[p]?.status === 'Normative'
  ).length;
  console.log(`📊 Coverage: ${normativeCovered}/${normativeCount} Normative guidelines have extracted rules`);

  const archivedRefs = Object.entries(sourceFileCounts).filter(
    ([p]) => guidelines[p]?.status === 'Archived'
  ).length;
  if (archivedRefs > 0) {
    console.log(`⚠️  ${archivedRefs} archived guidelines still referenced in rules`);
  }

  // 9. Uncovered guidelines detail
  const uncoveredNormative = Object.entries(guidelines).filter(
    ([p, g]) => {
      if (g.status !== 'Normative' || g.imperativeLines.length === 0 || sourceFileCounts[p]) return false;
      const isExcluded = EXTRACTION_EXCLUSIONS.some(ex => p.endsWith(ex) || p.includes(ex));
      return !isExcluded;
    }
  );
  if (uncoveredNormative.length > 0) {
    console.log(`\n📋 Uncovered Normative guidelines (${uncoveredNormative.length}):`);
    for (const [path] of uncoveredNormative) {
      console.log(`   - ${path}`);
    }
  }

  return driftCount > 0 ? 1 : 0;
}

// ─── Run ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const exitCode = audit();
  process.exit(exitCode);
}

module.exports = { audit, parseGuideline, parseTemplateRules, checkControl, readScripts, findSkillFiles, skillContract, skillConformance, unresolvedAppliesTo, SKILL_CONTRACT, SKILL_NAME_RE, SKILL_DESCRIPTION_MAX, SKILL_FILE, SKILL_EXT, SKILLS_DIR };
