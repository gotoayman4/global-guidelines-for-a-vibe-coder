#!/usr/bin/env node

/**
 * guard-file-access.js — Claude Code PreToolUse / PostToolUse hook for file access and quick edit checks.
 *
 * INTENT: `scan-secrets.js` stops hardcoded secrets only at `git commit`, after the agent has already
 * spent turns reading `.env` or writing secrets into source. This script enforces file boundaries at
 * tool execution time without adding external dependencies:
 *   1. PreToolUse (Read/Edit/Write/MultiEdit/NotebookEdit):
 *      - `secret-file-access`: blocks reading or editing real credential files (`.env`, `.env.*`
 *        except `.env.example`/`.env.sample`/`.env.template`/`.env.schema`, plus private keys and
 *        service-account files outside test fixtures).
 *      - `secret-in-write`: reuses `scanText` from `scan-secrets.js` on edited/written content so
 *        credentials never reach disk.
 *   2. PostToolUse (`--post-edit` on Edit/Write/MultiEdit/NotebookEdit):
 *      - `syntax-check`: runs `node --check` on JS files (via `runSync`) and validates strict `.json`
 *        files (excluding JSONC configs such as `tsconfig*.json`).
 *      - `secret-in-file`: scans the saved file via `scanText` when not in `SKIP_FILE`.
 *
 * Override one rule intentionally via `GUARD_ALLOW=<rule-id>` (or `*`).
 * Fails open (exit 0) if stdin JSON is malformed or missing a file path so unrelated tool calls pass.
 *
 * Exit codes: 0 = allowed / clean; 2 = blocked (PreToolUse) or immediate edit feedback (PostToolUse).
 *
 * Source: global-configs/scripts/guard-file-access.js
 */

const fs = require('fs');
const path = require('path');
const { runSync } = require('./lib/run-sync.js');
const { scanText, SKIP_FILE } = require('./scan-secrets.js');

const SAFE_ENV_RE = /^\.env\.(?:example|sample|template|schema)$/i;
const PROTECTED_CRED_RE = /^(?:\.env(?:\..+)?|\.npmrc|\.pypirc|\.netrc|id_(?:rsa|dsa|ecdsa|ed25519)|.*\.pem|.*\.key|.*\.p12|.*\.pfx|service-account.*\.json|.*firebase-adminsdk.*\.json)$/i;
const FIXTURE_RE = /(?:^|\/)tests?\/fixtures?\//i;
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const JS_EXT_RE = /\.(?:js|mjs|cjs)$/i;
const JSONC_BASENAME_RE = /^(?:tsconfig|jsconfig)(?:\..+)?\.json$/i;
const MAX_POST_SCAN_BYTES = 1024 * 1024;

function normalizePosix(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function allowSet() {
  return new Set(
    String(process.env.GUARD_ALLOW || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function isAllowed(id, allow) {
  return allow.has('*') || allow.has(id);
}

/** Determine whether `filePath` is a live credential or private-key file. */
function isProtectedCredentialFile(filePath) {
  const norm = normalizePosix(filePath);
  if (!norm) return false;
  const base = path.posix.basename(norm);
  if (SAFE_ENV_RE.test(base)) return false;
  if (/^\.env(?:\..+)?$/i.test(base)) return true;
  if (FIXTURE_RE.test(norm)) return false;
  return PROTECTED_CRED_RE.test(base);
}

function extractWriteContent(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return '';
  if (toolName === 'Write') return String(toolInput.content || '');
  if (toolName === 'Edit') return String(toolInput.new_string || '');
  if (toolName === 'NotebookEdit') return String(toolInput.new_source || '');
  if (toolName === 'MultiEdit' && Array.isArray(toolInput.edits)) {
    return toolInput.edits.map((e) => String((e && e.new_string) || '')).join('\n');
  }
  return '';
}

function extractFilePath(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return '';
  return String(toolInput.file_path || toolInput.path || toolInput.notebook_path || '');
}

/**
 * Evaluate a PreToolUse file event.
 * @param {object} payload Parsed hook JSON (`{ tool_name, tool_input }`)
 * @param {Set<string>} [allow]
 * @returns {{blocked: boolean, id?: string, reason?: string}}
 */
function checkFileAccess(payload, allow = allowSet()) {
  if (!payload || typeof payload !== 'object') return { blocked: false };
  const toolName = String(payload.tool_name || '');
  const filePath = extractFilePath(payload.tool_input);
  if (!filePath) return { blocked: false };

  if (isProtectedCredentialFile(filePath) && !isAllowed('secret-file-access', allow)) {
    return {
      blocked: true,
      id: 'secret-file-access',
      reason: `Blocked access to credential file (${path.basename(filePath)}). Reference variable names from .env.example instead; set GUARD_ALLOW=secret-file-access only if explicitly required.`,
    };
  }

  if (WRITE_TOOLS.has(toolName) && !isAllowed('secret-in-write', allow)) {
    const norm = normalizePosix(filePath);
    if (!SKIP_FILE.test(norm) && !SAFE_ENV_RE.test(path.posix.basename(norm))) {
      const content = extractWriteContent(toolName, payload.tool_input);
      if (content) {
        const findings = scanText(content, path.basename(filePath));
        if (findings.length) {
          const sample = findings.map((f) => `[${f.id}] line ${f.line} (${f.sample})`).join('; ');
          return {
            blocked: true,
            id: 'secret-in-write',
            reason: `Blocked write containing probable secret(s): ${sample}. Use environment variables or add \`secretscan:allow\` only for documented non-secret examples.`,
          };
        }
      }
    }
  }

  return { blocked: false };
}

/**
 * Evaluate a PostToolUse edit/write event on the saved file.
 * @param {object} payload Parsed hook JSON
 * @param {Set<string>} [allow]
 * @returns {{errors: {id: string, reason: string}[]}}
 */
function checkPostEdit(payload, allow = allowSet()) {
  const errors = [];
  if (!payload || typeof payload !== 'object') return { errors };
  const toolName = String(payload.tool_name || '');
  if (toolName && !WRITE_TOOLS.has(toolName)) return { errors };

  const filePath = extractFilePath(payload.tool_input);
  if (!filePath || !fs.existsSync(filePath)) return { errors };
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return { errors };

  const norm = normalizePosix(filePath);
  const base = path.posix.basename(norm);

  if (JS_EXT_RE.test(base) && !isAllowed('syntax-check', allow)) {
    const res = runSync(process.execPath, ['--check', filePath]);
    if (res.status !== 0) {
      const detail = String(res.stderr || res.stdout || 'SyntaxError').trim().split(/\r?\n/).slice(0, 4).join(' | ');
      errors.push({ id: 'syntax-check', reason: `JavaScript syntax error in ${base}: ${detail}` });
    }
  } else if (/\.json$/i.test(base) && !JSONC_BASENAME_RE.test(base) && !norm.includes('/.vscode/') && !isAllowed('syntax-check', allow)) {
    try {
      JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      errors.push({ id: 'syntax-check', reason: `Invalid JSON in ${base}: ${err.message}` });
    }
  }

  if (stat.size <= MAX_POST_SCAN_BYTES && !SKIP_FILE.test(norm) && !SAFE_ENV_RE.test(base) && !isAllowed('secret-in-file', allow)) {
    const findings = scanText(fs.readFileSync(filePath, 'utf8'), base);
    if (findings.length) {
      const sample = findings.map((f) => `[${f.id}] line ${f.line}`).join(', ');
      errors.push({ id: 'secret-in-file', reason: `Probable secret found in ${base}: ${sample}` });
    }
  }

  return { errors };
}

function main() {
  const postEdit = process.argv.includes('--post-edit');
  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {
    process.exit(0);
  }
  if (!raw.trim()) process.exit(0);

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  if (postEdit) {
    const { errors } = checkPostEdit(payload);
    if (errors.length) {
      for (const e of errors) console.error(`guard-file-access [${e.id}]: ${e.reason}`);
      process.exit(2);
    }
    process.exit(0);
  }

  const res = checkFileAccess(payload);
  if (res.blocked) {
    console.error(`guard-file-access [${res.id}]: ${res.reason}`);
    process.exit(2);
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = {
  checkFileAccess,
  checkPostEdit,
  isProtectedCredentialFile,
  extractWriteContent,
};
