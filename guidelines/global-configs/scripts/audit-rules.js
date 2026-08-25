#!/usr/bin/env node

/**
 * audit-rules.js — Drift Detection for Extracted Rules
 *
 * Compares rules extracted in global-configs/templates/ against source guideline
 * documents. Flags:
 *   - Rules referencing guidelines that no longer exist
 *   - Guidelines with new MUST/SHOULD statements not reflected in rules
 *   - Rules whose source guideline has been archived
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

// ─── Configuration ───────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..', '..');
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
  'global-configs/templates/CLAUDE.starter.md',
  'global-configs/templates/copilot-instructions.starter.md',
  'global-configs/templates/WORLD.starter.md',
];
const SKILL_FILES = [
  'global-configs/skills/architect.skill.md',
  'global-configs/skills/bidirectional-docx-rtl.skill.md',
  'global-configs/skills/code-review.skill.md',
  'global-configs/skills/debug-without-code.skill.md',
  'global-configs/skills/deploy-production.skill.md',
  'global-configs/skills/docx-per-paragraph-language.skill.md',
  'global-configs/skills/first-project-setup.skill.md',
  'global-configs/skills/implementation-plan.skill.md',
  'global-configs/skills/inno-setup.skill.md',
  'global-configs/skills/mui-design-system.skill.md',
  'global-configs/skills/performance-audit.skill.md',
  'global-configs/skills/refactoring.skill.md',
  'global-configs/skills/rtl-shadcn-setup.skill.md',
  'global-configs/skills/security-audit.skill.md',
  'global-configs/skills/shadcn-design-system.skill.md',
  'global-configs/skills/test-generation.skill.md',
  'global-configs/skills/tiptap-tailwind-reset.skill.md',
  'global-configs/skills/unsaved-changes-protection.skill.md',
];

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
 */
function parseGuideline(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');

  // Extract status
  const statusMatch = content.match(/\*\*Status:\*\*\s*(Normative|Advisory|Archived)/i);
  const status = statusMatch ? statusMatch[1] : 'Unknown';

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
    imperativeLines,
  };
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
    'skill.md', 'README.md', 'CHANGELOG.md', 'AGENTS.md', 'CLAUDE.md', 'WORLD.md',
    'DEVTOOLS.md', 'ARCHITECTURE_INDEX.md', 'GEMINI.md', 'GEMINI.md.template',
    'instructions.md', 'copilot-instructions.md', 'copilot-instructions.starter.md',
    'global-guidelines.md', 'cursor-global-guidelines.md', 'windsurf-global-guidelines.md',
    'trae-global-guidelines.md', 'qoder-global-guidelines.md', 'starter.md',
    'kilo.jsonc', 'opencode.json',
  ]);

  // 2b. Parse all skill files for guideline references
  console.log('📖 Parsing skill files...');
  let skillRefs = 0;
  for (const skill of SKILL_FILES) {
    const skillPath = path.join(REPO_ROOT, skill);
    if (!fs.existsSync(skillPath)) {
      console.log(`   ⚠️  Skill not found: ${skill}`);
      continue;
    }
    const content = fs.readFileSync(skillPath, 'utf8');
    const relativePath = path.relative(REPO_ROOT, skillPath).replace(/\\/g, '/');
    // Extract guideline references from skills (lines like "- `guideline-file.md`")
    // Exclude .skill.md self-references and common false positives
    const guidelineRefRegex = /[`\[]?((?:\d{2}-[\w-]+\/)?[\w-]+\.md)[`\]]?/g;
    const matches = content.matchAll(guidelineRefRegex);
    for (const match of matches) {
      const ref = match[1];
      // Skip self-references and non-guideline .md files
      if (ref.endsWith('.skill.md') || KNOWN_NON_GUIDELINE_FILES.has(ref) || KNOWN_NON_GUIDELINE_FILES.has(path.basename(ref))) continue;
      // Check if the referenced guideline exists
      let found = false;
      for (const guidelinePath of Object.keys(guidelines)) {
        if (guidelinePath.endsWith(ref) || guidelinePath.includes(ref)) {
          found = true;
          sourceFileCounts[guidelinePath] = (sourceFileCounts[guidelinePath] || 0) + 1;
          break;
        }
      }
      if (!found) {
        console.log(`   ⚠️  Skill ${relativePath} references unknown guideline: ${ref}`);
        driftCount++;
      }
      skillRefs++;
    }
    console.log(`   ${relativePath}: ${skillRefs} guideline references`);
  }
  console.log();

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

  // 5. Cross-template consistency check
  console.log('🔍 Checking cross-template consistency...\n');
  const templateRules = {};
  for (const template of STARTER_TEMPLATES) {
    if (template.endsWith('WORLD.starter.md')) continue; // Exclude product intent templates
    const templatePath = path.join(REPO_ROOT, template);
    if (!fs.existsSync(templatePath)) continue;
    const rules = parseTemplateRules(templatePath);
    const templateName = path.basename(template);
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

module.exports = { audit, parseGuideline, parseTemplateRules };
