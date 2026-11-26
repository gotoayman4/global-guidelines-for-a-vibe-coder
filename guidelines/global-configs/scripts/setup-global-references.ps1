# setup-global-references.ps1
# One-time setup: installs global AGENTS.md, skills, global_rules, and settings for all supported tools.
# Run from PowerShell 7+ as the local user.
# Re-run after updating the guidelines repo to refresh global configs.
#
# For per-project setup, use sync-guidelines.ps1 instead.

$ErrorActionPreference = "Stop"
$guidelinesRepo = (Resolve-Path (Join-Path $PSScriptRoot ".." "..")).Path

# The shared module owns the pool writer (and the no-BOM/JSON-safe helpers). Duplicating the
# linking loop here is how the two scripts drifted before: sync-guidelines linked `<name>/SKILL.md`
# while this file kept its own copy of the same loop, and both silently dropped a skill's
# `references/` and `scripts/` directories.
$modulePath = Join-Path $PSScriptRoot "GuidelineSync.psm1"
if (-not (Test-Path $modulePath)) {
    Write-Host "ERROR: GuidelineSync.psm1 not found at $modulePath" -ForegroundColor Red
    exit 1
}
Import-Module $modulePath -Force

# Admin check — symlinks require elevation on Windows (unless Developer Mode enabled). Skills fall
# back to copies, so this is advice rather than a precondition.
$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "NOTE: Not running as Administrator. Skill files are copied instead of symlinked." -ForegroundColor Yellow
    Write-Host ""
}

# --- Qoder ---
$qoderSkillsDir = "$env:USERPROFILE\.qoder\skills"

# --- VS Code (Copilot) ---
$vscodeGlobalSettings = "$env:APPDATA\Code\User\settings.json"

Write-Host "=== Global Guidelines - Machine Setup ===" -ForegroundColor Cyan
Write-Host ""

# --------------------------------------------------
# 1. Qoder: global skills symlink
# --------------------------------------------------
Write-Host "[1] Qoder" -ForegroundColor Yellow

if (-not (Test-Path -LiteralPath $qoderSkillsDir)) {
    $null = New-Item -ItemType Directory -Path $qoderSkillsDir -Force
}
# The shared writer links whole skill directories (references/ and scripts/ included).
$pool = Sync-SkillPool -SourceSkillsDir "$guidelinesRepo\global-configs\skills" -PoolDir $qoderSkillsDir
foreach ($message in $pool.Errors) {
    Write-Host "  SKIP $message" -ForegroundColor Yellow
}
Write-Host "  Skills: $($pool.Skills) linked ($($pool.Files) files) to $qoderSkillsDir" -ForegroundColor Green

# --------------------------------------------------
# 2. Machine-global skill pool (Antigravity & ZCode)
# --------------------------------------------------
Write-Host "[2] Antigravity & ZCode global pool" -ForegroundColor Yellow
$globalPoolScript = Join-Path $PSScriptRoot "sync-global-skills.js"
if (Test-Path -LiteralPath $globalPoolScript) {
    & node $globalPoolScript --apply
}

# --------------------------------------------------
# 3. VS Code: global settings.json (AI agent settings)
# --------------------------------------------------
Write-Host "[3] VS Code" -ForegroundColor Yellow

$vscodeSettingsDir = Split-Path $vscodeGlobalSettings -Parent
if (-not (Test-Path -LiteralPath $vscodeSettingsDir)) {
    $null = New-Item -ItemType Directory -Path $vscodeSettingsDir -Force
}

# Read existing settings. A file that exists but cannot be parsed is LEFT UNTOUCHED — the old
# catch-to-@{} rewrote it as the four AI keys alone, silently deleting every unrelated setting.
$vscodeSettings = $null
try {
    if (Test-Path -LiteralPath $vscodeGlobalSettings) {
        $vscodeSettings = Read-JsonObject -Path $vscodeGlobalSettings
    } else {
        $vscodeSettings = @{}
    }
} catch {
    Write-Host "  WARNING: settings.json is not a readable JSON object — left untouched: $($_.Exception.Message)" -ForegroundColor Yellow
}

if ($null -ne $vscodeSettings) {
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

# Write back merged settings (file may be locked by VS Code). Write-Utf8NoBom, not `-Encoding UTF8`:
# that means "with a BOM" on 5.1 and VS Code's settings parser is not the only reader of this file.
$vscodeJson = ($vscodeSettings | ConvertTo-Json -Depth 5) + "`n"
try {
    Write-Utf8NoBom -Path $vscodeGlobalSettings -Content $vscodeJson
    Write-Host "  settings.json updated: $vscodeGlobalSettings" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: Could not write settings.json (VS Code may be running)" -ForegroundColor Yellow
    Write-Host "  Close VS Code, then re-run this script." -ForegroundColor Yellow
}
}

# --------------------------------------------------
# Summary
# --------------------------------------------------
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Tools configured: Qoder, Antigravity, ZCode, VS Code Copilot"
Write-Host ""
Write-Host "For per-project setup, run: .\sync-guidelines.ps1"
Write-Host "  (mirrors guidelines + configs into each project)"
