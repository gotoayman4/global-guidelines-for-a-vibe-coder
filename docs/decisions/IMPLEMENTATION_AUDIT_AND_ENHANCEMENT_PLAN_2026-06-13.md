# Implementation Audit & Enhancement Plan — Global Guidelines Sync Manager

**Date:** 2026-06-13
**Audits:** Previous plan implementation + current script correctness + UI enhancement design
**Audience:** AI coding agents implementing corrections and enhancements
**Report status:** Ready for implementation — do not re-audit, just implement

---

## How to Use This Report (Read First)

You are an implementing agent. Follow these rules:

1. **Read this entire report before changing any file.**
2. **Implement phases sequentially.** Complete Phase 1, run its validation, report results, stop. Do not start Phase 2 unless asked.
3. **Do not commit or stage files.** Committing is the user's responsibility.
4. **Do not soften or remove RTL/Arabic rules.** They are intentional design.
5. **When a fix shows exact old-text/new-text, match it exactly.** Read the file first to confirm.
6. **After each phase**, run the validation commands listed and report output + exit codes.

---

## Validation Baseline — Current State

Run these first. All should pass before starting any implementation work:

```bash
node global-configs/scripts/audit-rules.js
node global-configs/scripts/check-links.js
node global-configs/scripts/check-index-coverage.js
```

**Current known results (from audit):**
- `audit-rules.js` → ✅ Exit 0 — 0 drift issues, 51 rules extracted from AGENTS.starter.md
- `check-links.js` → ✅ Exit 0 — 196 links verified (but **has a latent bug** — see C3)
- `check-index-coverage.js` → ✅ Exit 0 — all 96 files covered

---

## Part A — Implementation Completeness Audit

### What the previous agent implemented correctly

All Phase 1 tasks were completed:
- `.gitignore` created correctly
- `%USERPROFILE%/` artifact directory deleted
- All 20 broken markdown links fixed
- Dynamic path resolution in `setup-global-references.ps1` and `sync-guidelines.ps1`
- Literal `$guidelinesRepo` here-string bug fixed in `setup-global-references.ps1`
- VS Code/Copilot instruction paths corrected to `AGENTS.md`
- `-GlobalOnly` VS Code settings guard added to `sync-guidelines.ps1`
- robocopy exclusions added
- `implementation-plan.skill.md` Key Takeaways renumbered
- `audit-rules.js` SKILL_FILES updated to all 18 skills
- `audit-rules.js` false-positive filter updated
- `_index/MASTER_INDEX.md` updated with missing files
- `_index/AGENT_BOOT_PROTOCOL.md` created and indexed
- `→ Source:` markers added to `AGENTS.starter.md` (51 markers)
- `package.json` created
- `check-links.js` created
- `check-index-coverage.js` created
- `global-configs/scripts/GuidelineSync.psm1` created
- `global-configs/sync-manifest.json` created
- New parameters added to `sync-guidelines.ps1` (`-DryRun`, `-Backup`, `-NoMirrorDelete`, `-RestoreBackup`)

### What the previous agent did NOT implement (Phase 2+ gaps)

These are the open work items from the previous plan:

| Item | Status |
|---|---|
| `sync-manager.ps1` imports `GuidelineSync.psm1` | ❌ Not done |
| `sync-manager.ps1` reads `sync-manifest.json` | ❌ Not done |
| CLI `sync-guidelines.ps1` installs starter files | ❌ Not done |
| CLI `sync-guidelines.ps1` installs skills | ❌ Not done |
| CLI and GUI produce identical project outputs | ❌ Not done |
| robocopy exit code handling in `sync-manager.ps1` | ❌ Not done |
| Post-sync placeholder report | ❌ Not done |
| "Open in Explorer" unchecked by default | ❌ Not done |
| `form.TopMost` conditional | ❌ Not done |
| `.github/workflows/validate-guidelines.yml` | ❌ Not done |
| Phase 5 agent coordination templates | ❌ Not done |

---

## Part B — Code Correctness Bugs

These bugs exist in the current code regardless of implementation phase. All must be fixed in Phase 1 below.

---

### B1 — CRITICAL: `check-links.js` silently skips all broken `.md` links

**File:** `global-configs/scripts/check-links.js` (lines 112–127)

**What is wrong:**

```javascript
if (!fs.existsSync(resolved)) {
    const basename = path.basename(link.href);
    if (!basename.endsWith('.md')) {   // ← Only reports broken non-.md links
      brokenCount++;
      console.log(`❌ BROKEN: ...`);
    }
    // If basename DOES end with .md — silently falls through, not counted, not reported
  } else {
    checkedCount++;
  }
```

The condition `if (!basename.endsWith('.md'))` was intended to filter out false positives for non-file `.md` references. But the effect is that **ALL broken `.md` links are silently ignored** — they are neither counted as broken nor as verified. The checker only catches broken non-`.md` file references. Since all 20 previously broken links were `.md` files, this checker would have reported 0 broken links even if Phase 1 hadn't fixed them.

**Exact fix:**

Find:
```javascript
      if (!basename.endsWith('.md')) {
        brokenCount++;
        console.log(`❌ BROKEN: ${relPath}`);
        console.log(`   Link: ${link.href}`);
        console.log(`   Resolved: ${resolved}`);
        console.log(`   Context: "${link.line}"\n`);
      }
```

Replace with:
```javascript
      brokenCount++;
      console.log(`❌ BROKEN: ${relPath}`);
      console.log(`   Link: ${link.href}`);
      console.log(`   Resolved: ${resolved}`);
      console.log(`   Context: "${link.line}"\n`);
```

---

### B2 — `check-links.js` skips `.github/` and other dot-prefix directories

**File:** `global-configs/scripts/check-links.js` (line 24)

**What is wrong:**

```javascript
function isSkipDir(name) {
  return SKIP_DIRS.includes(name) || name.startsWith('.');
}
```

This skips `.github/`, `.cursor/`, `.vscode/` etc. The `.github/copilot-instructions.md` file is a legitimate guideline document that should have its links validated.

**Exact fix:**

Find:
```javascript
function isSkipDir(name) {
  return SKIP_DIRS.includes(name) || name.startsWith('.');
}
```

Replace with:
```javascript
const ALLOWED_DOT_DIRS = new Set(['.github']);

function isSkipDir(name) {
  if (ALLOWED_DOT_DIRS.has(name)) return false;
  return SKIP_DIRS.includes(name) || name.startsWith('.');
}
```

---

### B3 — `check-links.js` skips valid `./` relative links

**File:** `global-configs/scripts/check-links.js` (line 63)

**What is wrong:**

```javascript
if (!href.includes('.') || href.startsWith('.')) continue;
```

The `href.startsWith('.')` condition skips `./supabase-database.md` style relative links (same-directory links). These are valid and should be checked.

**Exact fix:**

Find:
```javascript
      if (!href.includes('.') || href.startsWith('.')) continue;
```

Replace with:
```javascript
      // Skip links that are only a fragment or have no file extension
      if (!href.includes('.')) continue;
      // Allow relative links like ./file.md, ../file.md (starts with . is fine)
      // Only skip things that have no directory character and no extension
```

More precisely — remove the `href.startsWith('.')` part:

```javascript
      if (!href.includes('.')) continue;
```

---

### B4 — `GuidelineSync.psm1` `Restore-Backup` loses subdirectory path when restoring

**File:** `global-configs/scripts/GuidelineSync.psm1` (lines 37–52)

**What is wrong:**

```powershell
$files = Get-ChildItem $backupDir -File
foreach ($file in $files) {
    $originalPath = Join-Path $projectPath $file.Name  # ← uses only filename, no subdir
    Copy-Item $file.FullName $originalPath -Force
}
```

Files backed up from subdirectories (e.g., `.github/copilot-instructions.md`) are stored flat in the backup directory. When restoring, they are placed in the project root (as `copilot-instructions.md`) instead of `.github/copilot-instructions.md`. Their original subdirectory path is lost.

**Required correction:**

The backup process must preserve relative paths. Rewrite the `Install-StarterFile` backup step to store relative paths, and `Restore-Backup` to use them.

**Fix — update `New-DatedBackupDir` to create a manifest, and `Restore-Backup` to use it:**

Replace the `Restore-Backup` function:

```powershell
function Restore-Backup([string]$projectPath, [string]$timestamp) {
    $backupRoot = Get-BackupDir $projectPath
    $backupDir = Join-Path $backupRoot $timestamp
    if (-not (Test-Path $backupDir)) {
        Write-Host "ERROR: Backup not found: $backupDir" -ForegroundColor Red
        return $false
    }
    # Use manifest if present, otherwise restore all files to project root
    $manifestFile = Join-Path $backupDir "backup-manifest.json"
    if (Test-Path $manifestFile) {
        $manifest = Get-Content $manifestFile -Raw | ConvertFrom-Json
        foreach ($entry in $manifest) {
            $backupFile = Join-Path $backupDir $entry.backupName
            $destPath = Join-Path $projectPath $entry.relativePath
            $destDir = Split-Path $destPath -Parent
            if ($destDir -and -not (Test-Path $destDir)) {
                $null = New-Item -ItemType Directory -Path $destDir -Force
            }
            if (Test-Path $backupFile) {
                Copy-Item $backupFile $destPath -Force
                Write-Host "  Restored: $($entry.relativePath)" -ForegroundColor Green
            }
        }
    } else {
        # Legacy: flat restore
        $files = Get-ChildItem $backupDir -File
        foreach ($file in $files) {
            $originalPath = Join-Path $projectPath $file.Name
            Copy-Item $file.FullName $originalPath -Force
            Write-Host "  Restored (flat): $($file.Name)" -ForegroundColor Green
        }
    }
    Write-Host "Backup $timestamp restored to $projectPath" -ForegroundColor Cyan
    return $true
}
```

Update `Install-StarterFile` to write a backup manifest:

```powershell
function Install-StarterFile {
    param(
        [string]$templatePath,
        [string]$targetPath,
        [string]$mode,
        [switch]$DryRun,
        [string]$backupDir,
        [string]$projectPath  # needed for relative path calculation
    )
    # ... existing code ...
    if (Test-Path $targetPath) {
        if ($backupDir) {
            $relativePath = $targetPath.Replace($projectPath, '').TrimStart('\').TrimStart('/')
            $safeName = $relativePath -replace '[\\\/]', '__'
            $backupFile = Join-Path $backupDir $safeName
            Copy-Item $targetPath $backupFile -Force
            # Append to manifest
            $manifestFile = Join-Path $backupDir "backup-manifest.json"
            $entry = @{ relativePath = $relativePath; backupName = $safeName }
            $existing = if (Test-Path $manifestFile) { Get-Content $manifestFile -Raw | ConvertFrom-Json } else { @() }
            $updated = @($existing) + $entry
            $updated | ConvertTo-Json -Depth 3 | Set-Content $manifestFile -Encoding UTF8
        }
        # ... rest of existing logic ...
    }
}
```

---

### B5 — `GuidelineSync.psm1` `Install-StarterFile` header detection regex is fragile

**File:** `global-configs/scripts/GuidelineSync.psm1` (line 117)

**What is wrong:**

```powershell
$escapedHeader = '(?m)^# ' + [regex]::Escape((Split-Path $targetPath -Leaf).Replace('.md',''))
```

For a target of `AGENTS.md`, this creates regex `(?m)^# AGENTS`. The actual first line of the installed file is `# AGENTS.md — Project Constitution`. This regex does match, but only by coincidence — it would also match any other section header starting with `# AGENTS` if such existed.

For `WORLD.md`, it creates `(?m)^# WORLD`, which matches `# WORLD.md — Product Intent Guardrail` — again by coincidence.

For `.github/copilot-instructions.md`, `Split-Path -Leaf` returns `copilot-instructions.md`, giving regex `(?m)^# copilot-instructions` which would NOT match the actual header `# GitHub Copilot Instructions`. This causes the starter to be prepended every sync.

**Required fix:**

Read the actual first heading from the template file instead of guessing from the filename:

```powershell
# Replace fragile filename-based regex with actual template heading
$firstLine = ($starterContent -split "`n")[0].Trim()
if ($firstLine.StartsWith('#')) {
    $escapedHeader = '(?m)^' + [regex]::Escape($firstLine)
} else {
    $escapedHeader = $null
}
```

---

### B6 — `sync-manager.ps1` still has hardcoded repo path fallback

**File:** `sync-manager.ps1` (line 10)

**What is wrong:**

```powershell
$guidelinesRepo = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($guidelinesRepo -eq "") { $guidelinesRepo = "D:\WebApps\global-guidelines-for-a-vibe-coder" }
```

The fallback is still the hardcoded path. If `Split-Path` returns an empty string, the wrong hardcoded value is used. This cannot work on a different machine.

**Exact fix:**

Find:
```powershell
$guidelinesRepo = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($guidelinesRepo -eq "") { $guidelinesRepo = "D:\WebApps\global-guidelines-for-a-vibe-coder" }
```

Replace with:
```powershell
$guidelinesRepo = $PSScriptRoot
if ([string]::IsNullOrEmpty($guidelinesRepo)) {
    $guidelinesRepo = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if ([string]::IsNullOrEmpty($guidelinesRepo)) {
    throw "Cannot determine guidelines repo root. Run via sync-manager.cmd or from PowerShell with a known script path."
}
```

---

### B7 — `sync-manager.ps1` robocopy result is silently ignored

**File:** `sync-manager.ps1` (line 234)

**What is wrong:**

```powershell
$null = Start-Process -FilePath "robocopy" -ArgumentList @(...) -Wait -NoNewWindow -PassThru
```

The `PassThru` object (which has the exit code) is discarded. Robocopy exit codes 0–7 are success (different copy/skip/extra counts); codes 8+ indicate errors (copy failed, access denied, etc.).

**Exact fix:**

Find:
```powershell
    $null = Start-Process -FilePath "robocopy" -ArgumentList @($guidelinesRepo, $guidelinesDir, "/MIR", "/NJH", "/NJS", "/NDL", "/NP", "/R:0", "/W:0", "/XF", "sync-projects.json", "*.cmd", "/XD", ".git", "%USERPROFILE%") -Wait -NoNewWindow -PassThru
    Append-Log $logBox "  _guidelines/ mirrored."
```

Replace with:
```powershell
    $proc = Start-Process -FilePath "robocopy" -ArgumentList @($guidelinesRepo, $guidelinesDir, "/MIR", "/NJH", "/NJS", "/NDL", "/NP", "/R:0", "/W:0", "/XF", "sync-projects.json", "*.cmd", "/XD", ".git", "%USERPROFILE%") -Wait -NoNewWindow -PassThru
    if ($proc.ExitCode -gt 7) {
        Append-Log $logBox "  ERROR: robocopy failed (exit code $($proc.ExitCode)). Mirror may be incomplete."
    } else {
        Append-Log $logBox "  _guidelines/ mirrored (robocopy exit: $($proc.ExitCode))."
    }
```

---

### B8 — `sync-guidelines.ps1` summary references `$skillCount` when it may be undefined

**File:** `global-configs/scripts/sync-guidelines.ps1` (lines 285–291)

**What is wrong:**

`$skillCount` and `$qoderSkillCount` are only set inside the `if (-not $SourceOnly)` block. The summary section at lines 285–291 references them unconditionally:

```powershell
if (-not $SourceOnly) {
    Write-Host "  opencode:  $skillCount skills + global AGENTS.md"
    ...
    Write-Host "  Qoder:     $qoderSkillCount skills linked"
```

Wait — this IS inside `if (-not $SourceOnly)`, so it is actually conditionally guarded. This is fine. However, there's a subtler issue: `$skillFiles` is also set inside this block and the `$qoderSkillCount` loop at line 256 uses `$skillFiles`. If somehow code order changes, this could break. Mark as low priority.

---

### B9 — `GuidelineSync.psm1` `Sync-Skills` does not update AGENTS.md with Skills section

**File:** `global-configs/scripts/GuidelineSync.psm1` (lines 179–220)

**What is wrong:**

The module's `Sync-Skills` function copies skills files and updates `.gitignore`, but does NOT add the `## Skills` section to `AGENTS.md`. The `sync-manager.ps1` inline version does add this section (lines 203–213). When `sync-guidelines.ps1` eventually uses the module's `Sync-Skills`, projects won't get the Skills section in their AGENTS.md.

**Required fix:**

Add the AGENTS.md skills section update to the module's `Sync-Skills` function. After the copy loop, add:

```powershell
    # Append _skills/ reference to AGENTS.md
    $agentsFile = Join-Path $projectPath "AGENTS.md"
    if (Test-Path $agentsFile) {
        $agentsContent = Get-Content $agentsFile -Raw
        if ($agentsContent -notmatch '(?m)^## Skills') {
            $skillsSection = "`r`n`r`n---`r`n`r`n## Skills`r`n`r`nSkill files live at ``_skills/<name>.skill.md``. Load when the trigger matches the current task."
            Set-Content -Path $agentsFile -Value ($agentsContent.TrimEnd() + $skillsSection) -NoNewline -Encoding UTF8
            Write-Host "  Added ## Skills section to AGENTS.md" -ForegroundColor Green
        }
    }
```

Also update `Export-ModuleMember` to ensure all public functions are listed.

---

### B10 — `sync-guidelines.ps1` installs global tool configs but NOT project starter files or skills

**File:** `global-configs/scripts/sync-guidelines.ps1`

**What is wrong:**

The CLI still only does: mirror `_guidelines/`, update `.gitignore`, set up global tool configs (opencode, Windsurf, Cursor, Qoder, VS Code). It does NOT install `AGENTS.md`, `CLAUDE.md`, `WORLD.md`, `.github/copilot-instructions.md`, or `_skills/` into the project.

This means CLI users get an incomplete project setup, contradicting the sync manifest which declares these as required outputs.

**Required fix (Phase 2 backlog item 2.4):** After the `_guidelines/` mirror step, the CLI must call the module's starter and skills functions. Add between Step 1 and Step 2:

```powershell
# === Step 1b: Install starter files (when not GlobalOnly) ===
if (-not $GlobalOnly -and $projectRoot -ne $null) {
    Write-Host "[1b/3] Installing starter files..." -ForegroundColor Yellow
    $manifest = Read-Manifest
    if ($manifest -and $manifest.starters) {
        $backupDir = if ($Backup) { New-DatedBackupDir $projectRoot } else { $null }
        foreach ($starter in $manifest.starters) {
            $templatePath = Join-Path $guidelinesRepo ($starter.template -replace '/', '\')
            $targetPath = Join-Path $projectRoot ($starter.target -replace '/', '\')
            Install-StarterFile -templatePath $templatePath -targetPath $targetPath `
                -mode $starter.mode -DryRun:$DryRun -backupDir $backupDir -projectPath $projectRoot
        }
    }

    # === Step 1c: Sync skills ===
    Write-Host "[1c/3] Syncing skills..." -ForegroundColor Yellow
    Sync-Skills -guidelinesRepo $guidelinesRepo -projectPath $projectRoot -DryRun:$DryRun
}
```

---

## Part C — Validation Script Enhancements

---

### C1 — Add `.github/workflows/validate-guidelines.yml`

**Create new file:** `.github/workflows/validate-guidelines.yml`

```yaml
name: Validate Guidelines
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Validate rules drift
        run: node global-configs/scripts/audit-rules.js
      - name: Validate internal links
        run: node global-configs/scripts/check-links.js
      - name: Validate index coverage
        run: node global-configs/scripts/check-index-coverage.js
```

---

### C2 — Add `npm run validate` as the canonical "all checks" command

**File:** `package.json`

Current `scripts.validate` already chains all three. This is correct. Verify after fixing B1 that `npm run validate` still passes with 0 exit code.

---

### C3 — `audit-rules.js` false-positive filter is inline string concatenation, not the Set pattern

**File:** `global-configs/scripts/audit-rules.js` (line 320)

**What is wrong:**

The filter was implemented as a long inline OR chain instead of the `KNOWN_NON_GUIDELINE_FILES` Set pattern from the audit plan. This works but is harder to maintain.

**Required fix:**

Find (the long inline if-continue at ~line 320):
```javascript
      if (ref === 'skill.md' || ref.endsWith('.skill.md') || ref === 'README.md' || ref === 'CHANGELOG.md' || ref === 'AGENTS.md' || ref === 'CLAUDE.md' || ref === 'WORLD.md' || ref === 'instructions.md' || ref === 'copilot-instructions.md' || ref === 'copilot-instructions.starter.md' || ref === 'starter.md' || ref === 'global-guidelines.md' || ref === 'cursor-global-guidelines.md' || ref === 'trae-global-guidelines.md' || ref === 'qoder-global-guidelines.md' || ref === 'windsurf-global-guidelines.md' || ref === 'GEMINI.md' || ref === 'GEMINI.md.template') continue;
```

Replace with (declare the Set **before** the `for (const skill of SKILL_FILES)` loop, then use it inside):

Before the skill loop, add:
```javascript
const KNOWN_NON_GUIDELINE_FILES = new Set([
  'skill.md', 'README.md', 'CHANGELOG.md', 'AGENTS.md', 'CLAUDE.md', 'WORLD.md',
  'DEVTOOLS.md', 'ARCHITECTURE_INDEX.md', 'GEMINI.md', 'GEMINI.md.template',
  'instructions.md', 'copilot-instructions.md', 'copilot-instructions.starter.md',
  'global-guidelines.md', 'cursor-global-guidelines.md', 'windsurf-global-guidelines.md',
  'trae-global-guidelines.md', 'qoder-global-guidelines.md', 'starter.md',
  'kilo.jsonc', 'opencode.json',
]);
```

Replace the inline condition with:
```javascript
      if (ref.endsWith('.skill.md') || KNOWN_NON_GUIDELINE_FILES.has(ref) || KNOWN_NON_GUIDELINE_FILES.has(path.basename(ref))) continue;
```

---

## Part D — Sync Manager UI Enhancement Plan

This is the primary focus of this report. The user wants `sync-manager.ps1` to be the single GUI tool for maintaining the repo itself AND syncing projects.

### D0 — Current UI layout analysis

Current window (800×650, fixed):

```
┌─ Global Guidelines Sync Manager ─────────────────────────────────────────────┐
│ Title header                                                                   │
│ Subtitle text                                                                  │
│ ┌─ Add project panel (path + Browse + Add) ────────────────────────────────┐  │
│ └──────────────────────────────────────────────────────────────────────────┘  │
│ Projects:                                                                       │
│ ┌─ ListView: Project | Path | Status | Last Synced | Actions ─────────────┐   │
│ │                                                                           │   │
│ │  (180px height)                                                           │   │
│ └───────────────────────────────────────────────────────────────────────────┘  │
│ [Sync All] [Sync Selected] [Remove Selected] ☐ Open in Explorer             │
│ ──────── Progress Bar ───────────────────────────────────────────────────────  │
│ Status text                                                                     │
│ ┌─ Log (dark terminal, 160px height, Consolas 9pt, no-wrap) ────────────────┐  │
│ └────────────────────────────────────────────────────────────────────────────┘ │
│ Footer: Projects saved to: sync-projects.json                                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Problems with current UI:**
- No way to run repo validation, audit scripts, or machine setup
- "Open in Explorer" is checked by default and opens for every item in Sync All (extremely noisy)
- `form.TopMost = $true` forces the window to stay on top permanently — blocks other apps
- Log box is 160px, too small for verbose robocopy/npm output
- Fixed window size — cannot be resized to see more log output
- No feedback on what the repo's current health is
- No indication of which projects need re-sync vs are up-to-date

### D1 — New UI Architecture

The enhanced window should be **tabbed** with two main areas:

**Tab 1: "Projects" (existing sync functionality, improved)**
**Tab 2: "Repo Tools" (new — maintenance, validation, machine setup)**

**New window size:** 900×780, resizable (minimum 800×650)

**New structure:**

```
┌─ Global Guidelines Sync Manager ──────────────────────────────────────────────┐
│ Title + version                                           [Repo: healthy ✅]   │
│ ┌──────────────────────────────────────────────────────────────────────────┐   │
│ │ ● Projects  ○ Repo Tools                                                  │   │
│ └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│ [TAB 1: Projects]                                                                │
│ ┌─ Add project (path + Browse + Add) ──────────────────────────────────────┐   │
│ └──────────────────────────────────────────────────────────────────────────┘   │
│ ┌─ ListView (resizes with window) ──────────────────────────────────────────┐  │
│ │ Project | Path | Status | Last Synced | Placeholders                       │  │
│ └────────────────────────────────────────────────────────────────────────────┘ │
│ [Sync All] [Sync Selected] [Remove] ☐ Open in Explorer (unchecked default)   │
│                                                                                  │
│ [TAB 2: Repo Tools]                                                              │
│ ┌─ Validation ─────────────────────────────────────────────────────────────┐   │
│ │ [▶ Run All Checks]  [▶ Audit Rules]  [▶ Check Links]  [▶ Check Index]    │   │
│ │ Last run: 2026-06-13 14:30  Result: ✅ All passed                         │   │
│ └──────────────────────────────────────────────────────────────────────────┘   │
│ ┌─ Machine Setup ──────────────────────────────────────────────────────────┐   │
│ │ [▶ Run Machine Setup]  [📁 Open Repo in Explorer]  [📝 Open README]      │   │
│ └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│ ──────── Progress Bar ────────────────────────────────────────────────────────  │
│ Status text                                                                      │
│ ┌─ Log (resizes with window, min 200px height) ─────────────────────────────┐  │
│ │                                                            [Clear] [Copy]  │  │
│ └────────────────────────────────────────────────────────────────────────────┘ │
│ Footer: Repo: D:\WebApps\... | Projects: 3 | Node: ✅ available                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### D2 — Detailed implementation spec for the redesigned `sync-manager.ps1`

All changes below are to `sync-manager.ps1`. The file must be rewritten entirely (not patched incrementally) to implement the tab-based UI.

#### D2a — Top-level constants and initialization

```powershell
# sync-manager.ps1
# GUI tool to sync guidelines, starters, tool configs, and skills into projects.
# Also: run repo validation scripts and machine setup.
# Double-click sync-manager.cmd to launch.

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# --- configuration ---
$guidelinesRepo = $PSScriptRoot
if ([string]::IsNullOrEmpty($guidelinesRepo)) {
    $guidelinesRepo = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if ([string]::IsNullOrEmpty($guidelinesRepo)) {
    [System.Windows.Forms.MessageBox]::Show(
        "Cannot determine guidelines repo path. Run via sync-manager.cmd.",
        "Startup Error",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    )
    exit 1
}

$projectsFile = Join-Path $guidelinesRepo "sync-projects.json"
$nodeAvailable = $null -ne (Get-Command "node" -ErrorAction SilentlyContinue)
$npmAvailable  = $null -ne (Get-Command "npm"  -ErrorAction SilentlyContinue)

# Import shared module
$modulePath = Join-Path $guidelinesRepo "global-configs\scripts\GuidelineSync.psm1"
if (Test-Path $modulePath) {
    Import-Module $modulePath -Force
}

# Load sync manifest
$manifestPath = Join-Path $guidelinesRepo "global-configs\sync-manifest.json"
$manifest = $null
if (Test-Path $manifestPath) {
    try { $manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json }
    catch { $manifest = $null }
}

# Build STARTERS and TOOL_CONFIGS from manifest (fall back to hardcoded if manifest missing)
if ($manifest -and $manifest.starters) {
    $STARTERS = $manifest.starters | ForEach-Object {
        @{
            template = $_.template -replace '/', '\'
            target   = $_.target   -replace '/', '\'
            header   = $null
            body     = $null
        }
    }
} else {
    # Hardcoded fallback (same as before)
    $STARTERS = @(...)
}

if ($manifest -and $manifest.toolConfigs) {
    $TOOL_CONFIGS = $manifest.toolConfigs | ForEach-Object {
        @{
            template = $_.template -replace '/', '\'
            target   = $_.target   -replace '/', '\'
            detect   = $_.detect
        }
    }
} else {
    $TOOL_CONFIGS = @(...)
}
```

#### D2b — Helper function changes

**Remove** `Update-StarterFile`, `Install-ToolConfig`, `Sync-Skills` inline function definitions from `sync-manager.ps1`. Use the module versions instead.

Update `Sync-Project` to call module functions and check robocopy exit code:

```powershell
function Sync-Project([string]$projectPath, $logBox, $progressBar, $statusLabel) {
    if (-not (Test-Project $projectPath)) {
        Append-Log $logBox "ERROR: Path not found: $projectPath"
        return "error"
    }

    $projectName = Resolve-ProjectName $projectPath
    $guidelinesDir = Join-Path $projectPath "_guidelines"
    Append-Log $logBox "--- $projectName ---"

    # Step 1: Mirror _guidelines/
    $statusLabel.Text = "Mirroring _guidelines/ ..."
    Append-Log $logBox "Step 1: Mirroring _guidelines/ ..."
    if (-not (Test-Path $guidelinesDir)) { $null = New-Item -ItemType Directory -Path $guidelinesDir -Force }
    $proc = Start-Process -FilePath "robocopy" `
        -ArgumentList @($guidelinesRepo, $guidelinesDir, "/MIR", "/NJH", "/NJS", "/NDL", "/NP",
                        "/R:0", "/W:0", "/XF", "sync-projects.json", "*.cmd",
                        "/XD", ".git", "%USERPROFILE%") `
        -Wait -NoNewWindow -PassThru
    if ($proc.ExitCode -gt 7) {
        Append-Log $logBox "  ERROR: robocopy failed (exit code $($proc.ExitCode)). Check permissions."
        return "error"
    }
    Append-Log $logBox "  _guidelines/ mirrored (robocopy: $($proc.ExitCode))."

    # Step 2: .gitignore
    $gitignore = Join-Path $projectPath ".gitignore"
    $existing = if (Test-Path $gitignore) { Get-Content $gitignore -Raw } else { "" }
    if ($existing -notmatch "(?m)^_guidelines/") {
        Add-Content -Path $gitignore -Value "`n# mirrored from central guidelines repo`n_guidelines/"
        Append-Log $logBox "  Added _guidelines/ to .gitignore"
    }

    # Step 3: Starter files (from manifest)
    $statusLabel.Text = "Installing starter files ..."
    Append-Log $logBox "Step 2: Starter files ..."
    foreach ($starter in $STARTERS) {
        $templatePath = Join-Path $guidelinesRepo $starter.template
        $targetPath   = Join-Path $projectPath   $starter.target
        if (Get-Command Install-StarterFile -ErrorAction SilentlyContinue) {
            Install-StarterFile -templatePath $templatePath -targetPath $targetPath `
                -mode "create-or-prepend" -projectPath $projectPath
        } else {
            Update-StarterFile $projectPath $starter.template $starter.target $starter.header $logBox $starter.body
        }
    }

    # Step 4: Tool configs
    $statusLabel.Text = "Installing tool configs ..."
    Append-Log $logBox "Step 3: Tool configs ..."
    foreach ($cfg in $TOOL_CONFIGS) {
        if (Get-Command Install-ToolConfigFile -ErrorAction SilentlyContinue) {
            Install-ToolConfigFile -guidelinesRepo $guidelinesRepo -projectPath $projectPath `
                -templateRelPath $cfg.template -targetRelPath $cfg.target -detectMarker $cfg.detect
        } else {
            Install-ToolConfig $projectPath $cfg.template $cfg.target $cfg.detect $logBox
        }
    }

    # Step 5: VS Code settings
    $statusLabel.Text = "Updating VS Code settings ..."
    Append-Log $logBox "Step 4: VS Code settings ..."
    $vscodeDir = Join-Path $projectPath ".vscode"
    if (-not (Test-Path $vscodeDir)) { $null = New-Item -ItemType Directory -Path $vscodeDir -Force }
    $vscodeSettings = Join-Path $vscodeDir "settings.json"
    $vscodeData = @{}
    if (Test-Path $vscodeSettings) {
        try { $vscodeData = Get-Content $vscodeSettings -Raw -Encoding UTF8 | ConvertFrom-Json -AsHashtable }
        catch { $vscodeData = @{} }
    }
    if (-not $vscodeData.ContainsKey("chat.useAgentsMdFile"))       { $vscodeData["chat.useAgentsMdFile"] = $true }
    if (-not $vscodeData.ContainsKey("chat.useNestedAgentsMdFiles")) { $vscodeData["chat.useNestedAgentsMdFiles"] = $true }
    $copilotInstructions = @(@{ "file" = "AGENTS.md" })
    foreach ($key in @("github.copilot.chat.codeGeneration.instructions",
                       "github.copilot.chat.testGeneration.instructions",
                       "github.copilot.chat.commitMessageGeneration.instructions",
                       "github.copilot.chat.reviewSelection.instructions")) {
        if (-not $vscodeData.ContainsKey($key)) { $vscodeData[$key] = $copilotInstructions }
    }
    try {
        $vscodeData | ConvertTo-Json -Depth 5 | Set-Content $vscodeSettings -Force -NoNewline -Encoding UTF8
        Append-Log $logBox "  .vscode/settings.json updated"
    } catch {
        Append-Log $logBox "  WARNING: Could not write .vscode/settings.json"
    }

    # Step 6: Skills
    $statusLabel.Text = "Syncing skills ..."
    Append-Log $logBox "Step 5: Skills ..."
    if (Get-Command Sync-Skills -ErrorAction SilentlyContinue) {
        Sync-Skills -guidelinesRepo $guidelinesRepo -projectPath $projectPath
    } else {
        Sync-SkillsInline $projectPath $logBox
    }

    # Step 7: Placeholder report
    Append-Log $logBox "Step 6: Placeholder check ..."
    $steeringFiles = @("AGENTS.md", "WORLD.md", "CLAUDE.md", "DEVTOOLS.md")
    foreach ($sf in $steeringFiles) {
        $sfPath = Join-Path $projectPath $sf
        if (Test-Path $sfPath) {
            $sfContent = Get-Content $sfPath -Raw
            $fillCount = ([regex]::Matches($sfContent, '\[FILL\]')).Count
            if ($fillCount -gt 0) {
                Append-Log $logBox "  ⚠  $sf has $fillCount [FILL] placeholders — please customize"
            }
        }
    }

    Append-Log $logBox "Done: $projectName"
    return "synced"
}
```

#### D2c — Form and UI construction

Rebuild the form with:
- Size: `New-Object Drawing.Size(900, 780)`, `MinimumSize = New-Object Drawing.Size(800, 650)`
- `$form.TopMost = $false` (remove the unconditional `$true`)
- `$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::Sizable`
- `$form.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor ...` (resizable anchoring)

**TabControl with 2 tabs:**

```powershell
$tabControl = New-Object System.Windows.Forms.TabControl
$tabControl.Location = New-Object Drawing.Point(8, 60)
$tabControl.Size = New-Object Drawing.Size(876, 520)
$tabControl.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor
                     [System.Windows.Forms.AnchorStyles]::Bottom -bor
                     [System.Windows.Forms.AnchorStyles]::Left -bor
                     [System.Windows.Forms.AnchorStyles]::Right
$form.Controls.Add($tabControl)

$tabProjects  = New-Object System.Windows.Forms.TabPage
$tabProjects.Text = "Projects"
$tabControl.Controls.Add($tabProjects)

$tabRepoTools = New-Object System.Windows.Forms.TabPage
$tabRepoTools.Text = "Repo Tools"
$tabControl.Controls.Add($tabRepoTools)
```

**Tab 1 — Projects (all existing controls moved inside `$tabProjects`):**

Move `$addPanel`, `$listLabel`, `$listView`, `$syncPanel` into `$tabProjects`. Add a "Placeholders" column to the ListView.

Change `$openCheck.Checked = $false` (was `$true`).

**Tab 2 — Repo Tools:**

```powershell
# --- Repo Tools Tab ---

# Validation group
$validationGroup = New-Object System.Windows.Forms.GroupBox
$validationGroup.Text = "Validation"
$validationGroup.Location = New-Object Drawing.Point(8, 8)
$validationGroup.Size = New-Object Drawing.Size(860, 100)
$tabRepoTools.Controls.Add($validationGroup)

$btnValidateAll = New-Object System.Windows.Forms.Button
$btnValidateAll.Text = "▶ Run All Checks"
$btnValidateAll.Location = New-Object Drawing.Point(8, 24)
$btnValidateAll.Size = New-Object Drawing.Size(150, 30)
$btnValidateAll.BackColor = [Drawing.Color]::ForestGreen
$btnValidateAll.ForeColor = [Drawing.Color]::White
$btnValidateAll.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$validationGroup.Controls.Add($btnValidateAll)

$btnAuditRules = New-Object System.Windows.Forms.Button
$btnAuditRules.Text = "Audit Rules"
$btnAuditRules.Location = New-Object Drawing.Point(168, 24)
$btnAuditRules.Size = New-Object Drawing.Size(120, 30)
$validationGroup.Controls.Add($btnAuditRules)

$btnCheckLinks = New-Object System.Windows.Forms.Button
$btnCheckLinks.Text = "Check Links"
$btnCheckLinks.Location = New-Object Drawing.Point(298, 24)
$btnCheckLinks.Size = New-Object Drawing.Size(120, 30)
$validationGroup.Controls.Add($btnCheckLinks)

$btnCheckIndex = New-Object System.Windows.Forms.Button
$btnCheckIndex.Text = "Check Index"
$btnCheckIndex.Location = New-Object Drawing.Point(428, 24)
$btnCheckIndex.Size = New-Object Drawing.Size(120, 30)
$validationGroup.Controls.Add($btnCheckIndex)

$validationStatusLabel = New-Object System.Windows.Forms.Label
$validationStatusLabel.Text = "Last run: never"
$validationStatusLabel.Location = New-Object Drawing.Point(8, 60)
$validationStatusLabel.Size = New-Object Drawing.Size(840, 20)
$validationStatusLabel.ForeColor = [Drawing.Color]::Gray
$validationGroup.Controls.Add($validationStatusLabel)

# Machine Setup group
$machineGroup = New-Object System.Windows.Forms.GroupBox
$machineGroup.Text = "Machine Setup"
$machineGroup.Location = New-Object Drawing.Point(8, 118)
$machineGroup.Size = New-Object Drawing.Size(860, 80)
$tabRepoTools.Controls.Add($machineGroup)

$btnMachineSetup = New-Object System.Windows.Forms.Button
$btnMachineSetup.Text = "▶ Run Machine Setup"
$btnMachineSetup.Location = New-Object Drawing.Point(8, 24)
$btnMachineSetup.Size = New-Object Drawing.Size(160, 30)
$btnMachineSetup.BackColor = [Drawing.Color]::DarkSlateBlue
$btnMachineSetup.ForeColor = [Drawing.Color]::White
$btnMachineSetup.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$machineGroup.Controls.Add($btnMachineSetup)

$btnOpenRepo = New-Object System.Windows.Forms.Button
$btnOpenRepo.Text = "📁 Open Repo in Explorer"
$btnOpenRepo.Location = New-Object Drawing.Point(178, 24)
$btnOpenRepo.Size = New-Object Drawing.Size(180, 30)
$machineGroup.Controls.Add($btnOpenRepo)

$btnOpenReadme = New-Object System.Windows.Forms.Button
$btnOpenReadme.Text = "📝 Open README"
$btnOpenReadme.Location = New-Object Drawing.Point(368, 24)
$btnOpenReadme.Size = New-Object Drawing.Size(130, 30)
$machineGroup.Controls.Add($btnOpenReadme)
```

**Event handlers for Repo Tools tab:**

```powershell
function Run-NodeScript([string]$scriptPath, $logBox, $statusLabel, $resultLabel) {
    if (-not $nodeAvailable) {
        Append-Log $logBox "ERROR: node.js not found. Install Node.js 18+ to run validation scripts."
        return $false
    }
    $statusLabel.Text = "Running $([System.IO.Path]::GetFileName($scriptPath)) ..."
    Append-Log $logBox "--- Running: node $scriptPath ---"
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "node"
        $psi.Arguments = "`"$scriptPath`""
        $psi.WorkingDirectory = $guidelinesRepo
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $proc = [System.Diagnostics.Process]::Start($psi)
        $stdout = $proc.StandardOutput.ReadToEnd()
        $stderr = $proc.StandardError.ReadToEnd()
        $proc.WaitForExit()
        foreach ($line in ($stdout -split "`n")) {
            if ($line.Trim()) { Append-Log $logBox "  $($line.TrimEnd())" }
        }
        if ($stderr.Trim()) {
            foreach ($line in ($stderr -split "`n")) {
                if ($line.Trim()) { Append-Log $logBox "  ERR: $($line.TrimEnd())" }
            }
        }
        $passed = $proc.ExitCode -eq 0
        if ($resultLabel) {
            $ts = [DateTime]::Now.ToString("yyyy-MM-dd HH:mm")
            $icon = if ($passed) { "✅" } else { "❌" }
            $resultLabel.Text = "Last run: $ts  Result: $icon $([System.IO.Path]::GetFileName($scriptPath))"
            $resultLabel.ForeColor = if ($passed) { [Drawing.Color]::Green } else { [Drawing.Color]::Red }
        }
        $statusLabel.Text = if ($passed) { "✅ Passed" } else { "❌ Failed" }
        return $passed
    } catch {
        Append-Log $logBox "ERROR: $($_.Exception.Message)"
        return $false
    }
}

$btnValidateAll.Add_Click({
    $auditScript  = Join-Path $guidelinesRepo "global-configs\scripts\audit-rules.js"
    $linksScript  = Join-Path $guidelinesRepo "global-configs\scripts\check-links.js"
    $indexScript  = Join-Path $guidelinesRepo "global-configs\scripts\check-index-coverage.js"
    $allPass = $true
    $allPass = (Run-NodeScript $auditScript  $logBox $statusLabel $validationStatusLabel) -and $allPass
    $allPass = (Run-NodeScript $linksScript  $logBox $statusLabel $null) -and $allPass
    $allPass = (Run-NodeScript $indexScript  $logBox $statusLabel $null) -and $allPass
    $ts = [DateTime]::Now.ToString("yyyy-MM-dd HH:mm")
    $icon = if ($allPass) { "✅" } else { "❌" }
    $validationStatusLabel.Text = "Last run: $ts  Result: $icon All checks"
    $validationStatusLabel.ForeColor = if ($allPass) { [Drawing.Color]::Green } else { [Drawing.Color]::Red }
})

$btnAuditRules.Add_Click({
    $script = Join-Path $guidelinesRepo "global-configs\scripts\audit-rules.js"
    Run-NodeScript $script $logBox $statusLabel $validationStatusLabel | Out-Null
})

$btnCheckLinks.Add_Click({
    $script = Join-Path $guidelinesRepo "global-configs\scripts\check-links.js"
    Run-NodeScript $script $logBox $statusLabel $validationStatusLabel | Out-Null
})

$btnCheckIndex.Add_Click({
    $script = Join-Path $guidelinesRepo "global-configs\scripts\check-index-coverage.js"
    Run-NodeScript $script $logBox $statusLabel $validationStatusLabel | Out-Null
})

$btnMachineSetup.Add_Click({
    $setupScript = Join-Path $guidelinesRepo "global-configs\scripts\setup-global-references.ps1"
    if (-not (Test-Path $setupScript)) {
        [System.Windows.Forms.MessageBox]::Show("setup-global-references.ps1 not found.", "Error",
            [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        return
    }
    $result = [System.Windows.Forms.MessageBox]::Show(
        "This will configure global AI tool settings for opencode, Windsurf, Cursor, Qoder, and VS Code on this machine.`n`nContinue?",
        "Machine Setup",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )
    if ($result -eq "Yes") {
        Append-Log $logBox "--- Running machine setup ---"
        $statusLabel.Text = "Running machine setup..."
        $proc = Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$setupScript`"" `
            -Wait -NoNewWindow -PassThru
        Append-Log $logBox "  Machine setup complete (exit: $($proc.ExitCode))."
        $statusLabel.Text = if ($proc.ExitCode -eq 0) { "✅ Machine setup complete" } else { "⚠  Machine setup finished with warnings" }
    }
})

$btnOpenRepo.Add_Click({ Start-Process "explorer.exe" $guidelinesRepo })

$btnOpenReadme.Add_Click({
    $readmePath = Join-Path $guidelinesRepo "README.md"
    if (Test-Path $readmePath) { Start-Process $readmePath }
})
```

#### D2d — Log box improvements

Make the log box taller and add Clear/Copy buttons:

```powershell
# Log area (resizes with window)
$logPanel = New-Object System.Windows.Forms.Panel
$logPanel.Location = New-Object Drawing.Point(8, 600)
$logPanel.Size = New-Object Drawing.Size(876, 130)
$logPanel.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor
                   [System.Windows.Forms.AnchorStyles]::Left -bor
                   [System.Windows.Forms.AnchorStyles]::Right
$form.Controls.Add($logPanel)

$logBox = New-Object System.Windows.Forms.RichTextBox
$logBox.Location = New-Object Drawing.Point(0, 22)
$logBox.Size = New-Object Drawing.Size(876, 108)
$logBox.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor
                 [System.Windows.Forms.AnchorStyles]::Bottom -bor
                 [System.Windows.Forms.AnchorStyles]::Left -bor
                 [System.Windows.Forms.AnchorStyles]::Right
$logBox.ReadOnly = $true
$logBox.BackColor = [Drawing.Color]::FromArgb(20, 20, 20)
$logBox.ForeColor = [Drawing.Color]::FromArgb(210, 210, 210)
$logBox.Font = New-Object Drawing.Font("Consolas", 9)
$logBox.WordWrap = $false
$logBox.ScrollBars = [System.Windows.Forms.RichTextBoxScrollBars]::Both
$logPanel.Controls.Add($logBox)

$btnClearLog = New-Object System.Windows.Forms.Button
$btnClearLog.Text = "Clear"
$btnClearLog.Location = New-Object Drawing.Point(786, 0)
$btnClearLog.Size = New-Object Drawing.Size(46, 20)
$btnClearLog.Font = New-Object Drawing.Font("Segoe UI", 7.5)
$btnClearLog.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$logPanel.Controls.Add($btnClearLog)

$btnCopyLog = New-Object System.Windows.Forms.Button
$btnCopyLog.Text = "Copy"
$btnCopyLog.Location = New-Object Drawing.Point(834, 0)
$btnCopyLog.Size = New-Object Drawing.Size(46, 20)
$btnCopyLog.Font = New-Object Drawing.Font("Segoe UI", 7.5)
$btnCopyLog.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$logPanel.Controls.Add($btnCopyLog)

$btnClearLog.Add_Click({ $logBox.Clear() })
$btnCopyLog.Add_Click({ [System.Windows.Forms.Clipboard]::SetText($logBox.Text) })
```

#### D2e — Header with repo health status indicator

```powershell
$header = New-Object System.Windows.Forms.Label
$header.Text = "Global Guidelines Sync Manager"
$header.Font = New-Object Drawing.Font("Segoe UI", 14, [Drawing.FontStyle]::Bold)
$header.Location = New-Object Drawing.Point(12, 10)
$header.Size = New-Object Drawing.Size(600, 28)
$form.Controls.Add($header)

$repoHealthLabel = New-Object System.Windows.Forms.Label
$repoHealthLabel.Text = "Repo: checking..."
$repoHealthLabel.Location = New-Object Drawing.Point(680, 14)
$repoHealthLabel.Size = New-Object Drawing.Size(200, 22)
$repoHealthLabel.Font = New-Object Drawing.Font("Segoe UI", 9)
$repoHealthLabel.TextAlign = [Drawing.ContentAlignment]::MiddleRight
$form.Controls.Add($repoHealthLabel)
```

At form load, run a quick health check asynchronously using a `BackgroundWorker`:

```powershell
$form.Add_Shown({
    $repoHealthLabel.Text = "Repo: checking..."
    $repoHealthLabel.ForeColor = [Drawing.Color]::Gray
    $bw = New-Object System.ComponentModel.BackgroundWorker
    $bw.Add_DoWork({
        $ok = $true
        if (-not $nodeAvailable) { $ok = $false; $bw.ReportProgress(0, "Node.js not found") }
        $_.Result = $ok
    })
    $bw.Add_RunWorkerCompleted({
        if ($_.Result) {
            $repoHealthLabel.Text = "Repo: ready ✅"
            $repoHealthLabel.ForeColor = [Drawing.Color]::Green
        } else {
            $repoHealthLabel.Text = "Repo: needs attention ⚠"
            $repoHealthLabel.ForeColor = [Drawing.Color]::DarkOrange
        }
    })
    $bw.RunWorkerAsync()
})
```

#### D2f — Footer with useful metadata

```powershell
$footerLabel = New-Object System.Windows.Forms.Label
$footerLabel.Location = New-Object Drawing.Point(8, 746)
$footerLabel.Size = New-Object Drawing.Size(876, 20)
$footerLabel.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor
                      [System.Windows.Forms.AnchorStyles]::Left -bor
                      [System.Windows.Forms.AnchorStyles]::Right
$footerLabel.ForeColor = [Drawing.Color]::Gray
$footerLabel.Font = New-Object Drawing.Font("Segoe UI", 8)
$nodeStatus = if ($nodeAvailable) { "Node: ✅" } else { "Node: ❌ (install Node.js 18+ for validation)" }
$footerLabel.Text = "Repo: $guidelinesRepo  |  $nodeStatus"
$form.Controls.Add($footerLabel)
```

#### D2g — "Placeholders" column in ListView

Add a 5th column to show how many `[FILL]` tokens remain in the project's AGENTS.md:

```powershell
$listView.Columns.Add("Project",     160)
$listView.Columns.Add("Path",        280)
$listView.Columns.Add("Status",       80)
$listView.Columns.Add("Last Synced", 120)
$listView.Columns.Add("Placeholders", 90)
```

After each sync, count `[FILL]` tokens in the installed AGENTS.md and update column 4:

```powershell
$agentsFile = Join-Path $path "AGENTS.md"
$placeholderCount = 0
if (Test-Path $agentsFile) {
    $agentsContent = Get-Content $agentsFile -Raw
    $placeholderCount = ([regex]::Matches($agentsContent, '\[FILL\]')).Count
}
$item.SubItems[4].Text = if ($placeholderCount -gt 0) { "$placeholderCount [FILL]" } else { "✅ Ready" }
```

#### D2h — "Open in Explorer" default change and Sync All behavior fix

```powershell
$openCheck.Checked = $false  # was $true — change to unchecked default
```

In `Sync-ListViewItems`, only open Explorer when syncing a SINGLE project (not bulk):

```powershell
function Sync-ListViewItems($items) {
    ...
    $isSingleSync = ($items.Count -eq 1)
    foreach ($item in $items) {
        ...
        if ($openCheck.Checked -and $isSingleSync) {
            Start-Process "explorer.exe" $path
        }
    }
    ...
}
```

---

## Detailed Implementation Backlog

### Phase 1 — Code correctness fixes (implement first; validate before Phase 2)

**Validation after this phase:**
```bash
node global-configs/scripts/check-links.js
node global-configs/scripts/audit-rules.js
```

- [ ] **1.1** Fix `check-links.js` B1: remove the `if (!basename.endsWith('.md'))` guard so broken `.md` links are reported (exact fix in B1).
- [ ] **1.2** Fix `check-links.js` B2: allow `.github/` directory to be scanned (exact fix in B2).
- [ ] **1.3** Fix `check-links.js` B3: remove `href.startsWith('.')` skip condition (exact fix in B3).
- [ ] **1.4** Fix `sync-manager.ps1` B6: remove hardcoded fallback repo path (exact fix in B6).
- [ ] **1.5** Fix `sync-manager.ps1` B7: capture robocopy exit code and log error if > 7 (exact fix in B7).
- [ ] **1.6** Fix `GuidelineSync.psm1` B4: rewrite `Restore-Backup` to use backup manifest for subdirectory paths (exact fix in B4).
- [ ] **1.7** Fix `GuidelineSync.psm1` B5: fix `Install-StarterFile` header detection to read actual first heading from template (exact fix in B5).
- [ ] **1.8** Fix `GuidelineSync.psm1` B9: add AGENTS.md Skills section update to module's `Sync-Skills` (exact fix in B9).
- [ ] **1.9** Fix `audit-rules.js` C3: refactor inline false-positive chain to `KNOWN_NON_GUIDELINE_FILES` Set (exact fix in C3).
- [ ] **1.10** Create `.github/workflows/validate-guidelines.yml` (exact content in C1).
- [ ] **1.11** Verify `npm run validate` still exits 0 after 1.1–1.3 (links checker bug fixes may reveal real broken links to fix first).

**After Phase 1, report:**
- `node global-configs/scripts/check-links.js` — exact output and exit code
- If new broken links are found, fix them before proceeding to Phase 2.

---

### Phase 2 — CLI and module integration

**Goal:** CLI sync-guidelines.ps1 installs the same files as the GUI.

- [ ] **2.1** Update `sync-guidelines.ps1` B10: add starter files and skills installation after the `_guidelines/` mirror step (exact code in B10).
- [ ] **2.2** Add the `-Backup` parameter to the `Install-StarterFile` call in sync-guidelines.ps1 so backups are created when `-Backup` is passed.
- [ ] **2.3** Update `GuidelineSync.psm1` `Export-ModuleMember` to ensure `Sync-Skills` exports with correct parameter set (it now needs `$guidelinesRepo`, `$projectPath`, `[switch]$DryRun`).
- [ ] **2.4** Run CLI sync-guidelines.ps1 against a temp test directory and verify it creates: `AGENTS.md`, `WORLD.md`, `CLAUDE.md`, `_skills/`, `_guidelines/`, `.vscode/settings.json`, `opencode.json`.

**After Phase 2, report:** List all files created by `sync-guidelines.ps1` in the test project.

---

### Phase 3 — Sync Manager GUI rewrite

**Goal:** Full tab-based UI with Repo Tools tab.

This phase rewrites `sync-manager.ps1` entirely. The new file must:

- [ ] **3.1** Use `$PSScriptRoot` for repo root resolution (no hardcoded fallback) — see D2a.
- [ ] **3.2** Import `GuidelineSync.psm1` at startup — see D2a.
- [ ] **3.3** Load STARTERS and TOOL_CONFIGS from `sync-manifest.json` via manifest — see D2a.
- [ ] **3.4** Remove inline `Update-StarterFile`, `Install-ToolConfig`, `Sync-Skills` function definitions; use module versions with inline fallback — see D2b.
- [ ] **3.5** Update `Sync-Project` to check robocopy exit code, install starters via module, show placeholder count — see D2b.
- [ ] **3.6** Build `TabControl` with "Projects" and "Repo Tools" tabs — see D2c.
- [ ] **3.7** Add all Repo Tools controls: `btnValidateAll`, `btnAuditRules`, `btnCheckLinks`, `btnCheckIndex`, `btnMachineSetup`, `btnOpenRepo`, `btnOpenReadme` — see D2c.
- [ ] **3.8** Add `Run-NodeScript` helper function with real-time output capture — see D2c.
- [ ] **3.9** Implement all Repo Tools event handlers — see D2c.
- [ ] **3.10** Rebuild log box with Clear/Copy buttons, `ScrollBars = Both`, anchoring for resize — see D2d.
- [ ] **3.11** Add repo health status label in the header — see D2e.
- [ ] **3.12** Update footer with Node.js availability and repo path — see D2f.
- [ ] **3.13** Add "Placeholders" column to ListView; update count after each sync — see D2g.
- [ ] **3.14** Change `$openCheck.Checked = $false` — see D2h.
- [ ] **3.15** Fix `Sync-ListViewItems` to only open Explorer for single-project sync — see D2h.
- [ ] **3.16** Remove `$form.TopMost = $true` (set to `$false` or remove entirely).
- [ ] **3.17** Make form resizable: `FormBorderStyle = Sizable`, `MinimumSize = 800,650`, anchor all controls.
- [ ] **3.18** Context menu: add "Open in VS Code" item (if `code.exe` available) alongside "Open in Explorer".

**After Phase 3, report:** Launch the GUI, confirm both tabs are visible and working, take a screenshot of the Repo Tools tab after clicking "Run All Checks".

---

### Phase 4 — Post-sync wizard prompt

**Goal:** After syncing a project that still has placeholder-heavy steering files, the GUI should prompt the user with next steps.

- [ ] **4.1** After sync completes, count total `[FILL]` in `AGENTS.md` + `WORLD.md` combined. If > 5, show a dialog:

```
"[project-name] was synced successfully.

AGENTS.md: N placeholders remaining
WORLD.md:  N placeholders remaining

Would you like to open these files to complete setup?"

[Yes — Open Files]  [Later]
```

- [ ] **4.2** "Yes — Open Files" should open `AGENTS.md` and `WORLD.md` in the default `.md` viewer/editor.

---

## Per-Phase Agent Prompts

### Phase 1 Prompt

```
Read global-guidelines-for-a-vibe-coder/IMPLEMENTATION_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-13.md.

Implement Phase 1 only (tasks 1.1 through 1.11). Use exact old-text/new-text from findings B1, B2, B3, B4, B5, B6, B7, B8, B9, C1, C3. Read each file before editing.

After completing:
1. Run: node global-configs/scripts/check-links.js — report exact output. If new broken links appear (B1 fix may uncover them), list them. Do NOT fix links automatically — report them and stop.
2. Run: node global-configs/scripts/audit-rules.js — must still exit 0.
3. Confirm .github/workflows/validate-guidelines.yml was created.
4. Do NOT start Phase 2. Do NOT commit.
```

### Phase 2 Prompt

```
Phase 1 of IMPLEMENTATION_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-13.md is complete.
Implement Phase 2 (tasks 2.1 through 2.4).

After completing:
1. Run sync-guidelines.ps1 against a temp directory: powershell -File global-configs\scripts\sync-guidelines.ps1 -ProjectPath C:\Temp\test-project
2. List all files created in C:\Temp\test-project
3. Report any task not completed and why.
4. Do NOT start Phase 3. Do NOT commit.
```

### Phase 3 Prompt

```
Phase 2 of IMPLEMENTATION_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-13.md is complete.
Rewrite sync-manager.ps1 to implement the UI described in Phase 3 (tasks 3.1 through 3.18).

Use the exact code specs in D2a through D2h as your blueprint. The result must be a complete, working PowerShell WinForms application — not a partial patch.

After completing:
1. Check the file for syntax errors: powershell -NonInteractive -Command "& { $null = [System.Management.Automation.Language.Parser]::ParseFile('sync-manager.ps1', [ref]$null, [ref]$null) }"
2. Report any parse errors found.
3. Do NOT launch the GUI (that's the user's job).
4. Do NOT start Phase 4. Do NOT commit.
```

### Phase 4 Prompt

```
Phase 3 of IMPLEMENTATION_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-13.md is complete.
Implement Phase 4 (tasks 4.1 and 4.2) — the post-sync wizard prompt.

After completing:
1. Run: node global-configs/scripts/audit-rules.js && node global-configs/scripts/check-links.js
2. Report output.
3. Do NOT commit.
```

---

## Suggested Acceptance Criteria

- [ ] `node global-configs/scripts/check-links.js` exits 0 AND reports any broken `.md` links (B1 fix verified).
- [ ] `node global-configs/scripts/audit-rules.js` exits 0.
- [ ] `node global-configs/scripts/check-index-coverage.js` exits 0.
- [ ] `.github/workflows/validate-guidelines.yml` exists and is valid YAML.
- [ ] `sync-guidelines.ps1 -ProjectPath <test-dir>` creates: `AGENTS.md`, `WORLD.md`, `CLAUDE.md`, `_skills/`, `_guidelines/`, `opencode.json`, `.vscode/settings.json`.
- [ ] `sync-manager.ps1` has two tabs: "Projects" and "Repo Tools".
- [ ] "Repo Tools" tab has working buttons for validation scripts and machine setup.
- [ ] "Run All Checks" in Repo Tools runs all three validation scripts and shows result.
- [ ] Log box has Clear and Copy buttons; scrolls both horizontally and vertically.
- [ ] "Open in Explorer" checkbox is unchecked by default.
- [ ] Form is resizable with minimum size 800×650.
- [ ] `form.TopMost` is `$false`.
- [ ] After sync, ListView shows placeholder count per project.
- [ ] `GuidelineSync.psm1` `Restore-Backup` preserves subdirectory paths.
- [ ] `sync-manager.ps1` has no hardcoded `D:\WebApps\...` path.
- [ ] PowerShell syntax check on `sync-manager.ps1` returns no parse errors.

---

## Validation Performed for This Audit

| Evidence | Finding |
|---|---|
| `node global-configs/scripts/audit-rules.js` | ✅ Exit 0; 0 drift issues; 51 rules extracted |
| `node global-configs/scripts/check-links.js` | ✅ Exit 0 (but B1 latent bug means broken .md links are silently skipped) |
| `node global-configs/scripts/check-index-coverage.js` | ✅ Exit 0; 96 files covered |
| `git --no-pager status --short` | 36 tracked-modified, 13 untracked; no `.gitignore` issues |
| `sync-manager.ps1` lines 1–560 read | B6 hardcoded fallback, B7 ignored robocopy result, `$openCheck.Checked=$true`, `$form.TopMost=$true`, no module import, no manifest reading, no Repo Tools tab |
| `GuidelineSync.psm1` lines 1–249 read | B4 restore path loss, B5 fragile header regex, B9 missing AGENTS.md Skills section |
| `sync-guidelines.ps1` lines 1–294 read | B10 confirmed: no starter file or skills installation |
| `check-links.js` lines 60–130 read | B1 critical: broken `.md` links silently skipped; B2 `.github/` excluded; B3 `./` links excluded |
| `AGENTS.starter.md` source marker count | 51 markers confirmed — Phase 3 was correctly implemented |
| `sync-manifest.json` confirmed present | Not yet used by `sync-manager.ps1` |
| `GuidelineSync.psm1` confirmed present | Not imported by `sync-manager.ps1` |
