# setup-global-references.ps1
# One-time setup: installs global AGENTS.md, skills, global_rules, and settings for all supported tools.
# Run from PowerShell 7+ as the local user.
# Re-run after updating the guidelines repo to refresh global configs.
#
# For per-project setup, use sync-guidelines.ps1 instead.

$ErrorActionPreference = "Stop"
$guidelinesRepo = (Resolve-Path (Join-Path $PSScriptRoot ".." "..")).Path

# Admin check — symlinks require elevation on Windows (unless Developer Mode enabled)
$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator." -ForegroundColor Yellow
    Write-Host "  Symlinks (skills, Cursor rule) will be SKIPPED." -ForegroundColor Yellow
    Write-Host "  Plain files (AGENTS.md, Windsurf global_rules) will still be written." -ForegroundColor Yellow
    Write-Host "  Re-run as Admin to create symlinks." -ForegroundColor Yellow
    Write-Host ""
}

# --- opencode ---
$opencodeSkillsDir = "$env:USERPROFILE\.config\opencode\skills"
$opencodeAgentsFile = "$env:USERPROFILE\.config\opencode\AGENTS.md"

# --- Windsurf ---
$windsurfMemoriesDir = "$env:USERPROFILE\.codeium\windsurf\memories"
$windsurfGlobalRules = "$windsurfMemoriesDir\global_rules.md"

# --- Cursor ---
$cursorRulesDir = "$env:USERPROFILE\.cursor\rules"
$cursorRuleFile = "$cursorRulesDir\global-guidelines-from-central.mdc"
$cursorTemplate = "$guidelinesRepo\global-configs\templates\cursor-global-guidelines.mdc.template"

# --- Qoder ---
$qoderSkillsDir = "$env:USERPROFILE\.qoder\skills"

# --- VS Code ---
$vscodeGlobalSettings = "$env:APPDATA\Code\User\settings.json"

Write-Host "=== Global Guidelines - Machine Setup ===" -ForegroundColor Cyan
Write-Host ""

# --------------------------------------------------
# 1. opencode: symlink skills + global AGENTS.md
# --------------------------------------------------
Write-Host "[1] opencode" -ForegroundColor Yellow

if (-not (Test-Path -LiteralPath $opencodeSkillsDir)) {
    $null = New-Item -ItemType Directory -Path $opencodeSkillsDir -Force
}
# The corpus is the Agent Skills standard layout: one directory per skill, each holding a SKILL.md.
# Enumerating `*/SKILL.md` (not `*.skill.md`) is what makes the pool conformant — a native loader
# scans for SKILL.md, and the flat file it used to link was invisible to every one of them.
$skillFiles = Get-ChildItem -Path "$guidelinesRepo\global-configs\skills" -Directory -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName "SKILL.md" } |
    Where-Object { Test-Path -LiteralPath $_ }
$skillCount = 0
if ($isAdmin) {
    foreach ($file in $skillFiles) {
        # No -LiteralPath on this split: -LiteralPath binds to its own parameter set that
        # excludes -Parent, so `Split-Path -LiteralPath $file -Parent` throws
        # AmbiguousParameterSet on every host that runs these scripts (measured 2026-10-13
        # on 5.1.26100 and 7.6 — all seven fleet syncs died here). The positional form is
        # portable, and $file holds no wildcard characters: it is built from Join-Path over
        # enumerated directory names plus the literal "SKILL.md".
        $skillName = Split-Path (Split-Path $file -Parent) -Leaf
        $skillDir = Join-Path $opencodeSkillsDir $skillName
        $symlinkPath = Join-Path $skillDir "SKILL.md"
        if (-not (Test-Path -LiteralPath $skillDir)) {
            $null = New-Item -ItemType Directory -Path $skillDir -Force
        }
        if (Test-Path -LiteralPath $symlinkPath) {
            Remove-Item -LiteralPath $symlinkPath -Force
        }
        $null = New-Item -ItemType SymbolicLink -Path $symlinkPath -Target $file -Force
        $skillCount++
    }
} else {
    Write-Host "  SKIPPED (not admin)" -ForegroundColor Gray
}

# Use double-quoted here-string so $guidelinesRepo expands to the actual path
$agentsContent = @"
# Global Development Guidelines

This machine has a shared guidelines repository at:
``$guidelinesRepo``

## Before Every Session

1. If not already loaded via project opencode.json, read ``$guidelinesRepo\_index\RETRIEVAL_RULES.md``
2. Read ``$guidelinesRepo\_index\MASTER_INDEX.md`` to map task type to relevant files
3. Load only files needed for the current task - never the whole repo
4. Skills live at ``$guidelinesRepo\global-configs\skills\<name>\SKILL.md`` - load when trigger matches

## How to Load Guidelines

- Use absolute base path: ``$guidelinesRepo\``[relative-path]
- Compact extracts (Key Takeaways + Anti-Patterns) when context is small
- Project AGENTS.md rules override these global defaults
"@
Set-Content -Path $opencodeAgentsFile -Value $agentsContent -NoNewline -Encoding UTF8
Write-Host "  Skills: $skillCount linked | AGENTS.md: $opencodeAgentsFile" -ForegroundColor Green

# --------------------------------------------------
# 2. Windsurf: global_rules.md
# --------------------------------------------------
Write-Host "[2] Windsurf" -ForegroundColor Yellow

if (-not (Test-Path -LiteralPath $windsurfMemoriesDir)) {
    $null = New-Item -ItemType Directory -Path $windsurfMemoriesDir -Force
}
$windsurfContent = @"
This machine has a shared guidelines repository at:
$guidelinesRepo

ALWAYS read _index/MASTER_INDEX.md from that path first.
Then load only the files needed for the current task.
Use absolute base path $guidelinesRepo/ when loading files.
"@
Set-Content -Path $windsurfGlobalRules -Value $windsurfContent -NoNewline -Encoding UTF8
Write-Host "  global_rules.md: $windsurfGlobalRules" -ForegroundColor Green

# --------------------------------------------------
# 3. Cursor: user-level .mdc rule
# --------------------------------------------------
Write-Host "[3] Cursor" -ForegroundColor Yellow

if (-not (Test-Path -LiteralPath $cursorRulesDir)) {
    $null = New-Item -ItemType Directory -Path $cursorRulesDir -Force
}
if ($isAdmin) {
    if (Test-Path -LiteralPath $cursorRuleFile) {
        Remove-Item -LiteralPath $cursorRuleFile -Force
    }
    if (Test-Path -LiteralPath $cursorTemplate) {
        # Resolved copy (not a symlink — the raw template carries an unresolved {{GUIDELINES_ROOT}} token)
        $cursorContent = (Get-Content $cursorTemplate -Raw -Encoding UTF8) -replace '\{\{GUIDELINES_ROOT\}\}', $guidelinesRepo
        Set-Content -Path $cursorRuleFile -Value $cursorContent -NoNewline -Encoding UTF8
        Write-Host "  User rule created: $cursorRuleFile" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: template not found at $cursorTemplate" -ForegroundColor Yellow
    }
} else {
    Write-Host "  SKIPPED (not admin)" -ForegroundColor Gray
}

# --------------------------------------------------
# 4. Qoder: global skills symlink
# --------------------------------------------------
Write-Host "[4] Qoder" -ForegroundColor Yellow

if (-not (Test-Path -LiteralPath $qoderSkillsDir)) {
    $null = New-Item -ItemType Directory -Path $qoderSkillsDir -Force
}
if ($isAdmin) {
    $qoderCount = 0
    foreach ($file in $skillFiles) {
        # Position-only split — see the skill-name split in the opencode block for why.
        $skillName = Split-Path (Split-Path $file -Parent) -Leaf
        $qoderDir = Join-Path $qoderSkillsDir $skillName
        $qoderSymlink = Join-Path $qoderDir "SKILL.md"
        if (-not (Test-Path -LiteralPath $qoderDir)) {
            $null = New-Item -ItemType Directory -Path $qoderDir -Force
        }
        if (Test-Path -LiteralPath $qoderSymlink) {
            Remove-Item -LiteralPath $qoderSymlink -Force
        }
        $null = New-Item -ItemType SymbolicLink -Path $qoderSymlink -Target $file -Force
        $qoderCount++
    }
    Write-Host "  Skills: $qoderCount linked to $qoderSkillsDir" -ForegroundColor Green
} else {
    Write-Host "  SKIPPED (not admin)" -ForegroundColor Gray
}

# --------------------------------------------------
# 5. VS Code: global settings.json (AI agent settings)
# --------------------------------------------------
Write-Host "[5] VS Code" -ForegroundColor Yellow

$vscodeSettingsDir = Split-Path $vscodeGlobalSettings -Parent
if (-not (Test-Path -LiteralPath $vscodeSettingsDir)) {
    $null = New-Item -ItemType Directory -Path $vscodeSettingsDir -Force
}

# Read existing settings or start fresh
if (Test-Path -LiteralPath $vscodeGlobalSettings) {
    $existingJson = Get-Content $vscodeGlobalSettings -Raw -Encoding UTF8
    try { $vscodeSettings = $existingJson | ConvertFrom-Json -AsHashtable } catch { $vscodeSettings = @{} }
} else {
    $vscodeSettings = @{}
}

# Ensure AI-related keys, preserving any existing values
if (-not $vscodeSettings.ContainsKey("chat.useAgentsMdFile")) {
    $vscodeSettings["chat.useAgentsMdFile"] = $true
}
if (-not $vscodeSettings.ContainsKey("chat.useNestedAgentsMdFiles")) {
    $vscodeSettings["chat.useNestedAgentsMdFiles"] = $true
}

    # Copilot instructions pointing to the project-level AGENTS.md
    $copilotKeys = @("github.copilot.chat.codeGeneration.instructions",
                      "github.copilot.chat.testGeneration.instructions",
                      "github.copilot.chat.commitMessageGeneration.instructions",
                      "github.copilot.chat.reviewSelection.instructions")
    $copilotInstructions = @(@{ "file" = "AGENTS.md" })
    foreach ($key in $copilotKeys) {
        $val = $vscodeSettings[$key]
        $needsFix = $true
        if ($val -is [array] -and $val.Count -gt 0 -and $val[0].file -eq "AGENTS.md") {
            $needsFix = $false
        }
        if ($needsFix) { $vscodeSettings[$key] = $copilotInstructions }
    }

# Write back merged settings (file may be locked by VS Code)
$vscodeJson = $vscodeSettings | ConvertTo-Json -Depth 5
try {
    Set-Content -Path $vscodeGlobalSettings -Value $vscodeJson -NoNewline -Encoding UTF8 -ErrorAction Stop
    Write-Host "  settings.json updated: $vscodeGlobalSettings" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Could not write settings.json (VS Code may be running)" -ForegroundColor Yellow
    Write-Host "  Close VS Code, then re-run this script." -ForegroundColor Yellow
}

# --------------------------------------------------
# Summary
# --------------------------------------------------
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Tools configured: opencode, Windsurf, Cursor, Qoder, VS Code"
Write-Host ""
Write-Host "For per-project setup, run: .\sync-guidelines.ps1"
Write-Host "  (mirrors guidelines + configs into each project)"
