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

# A skill is its whole directory: the body loads `references/` and `scripts/` on demand, so the
# pool must carry them. One shared writer serves this script and sync-guidelines.
$pool = Sync-SkillPool -SourceSkillsDir "$guidelinesRepo\global-configs\skills" -PoolDir $opencodeSkillsDir
foreach ($message in $pool.Errors) {
    Write-Host "  SKIP $message" -ForegroundColor Yellow
}
$skillCount = $pool.Skills

# Use double-quoted here-string so $guidelinesRepo expands to the actual path
$agentsContent = @"
# Global Development Guidelines

This machine has a shared guidelines repository at:
``$guidelinesRepo``

## Before Every Session

1. In a project, read its ``AGENTS.md`` (binding rules) and ``WORLD.md`` (intent + declared mode) first - they override these global defaults
2. Open a guideline from ``$guidelinesRepo`` by name when the task needs one
3. Use ``$guidelinesRepo\_index\MASTER_INDEX.md`` only as a lookup when you cannot name the file the task needs
4. Load only files needed for the current task - never the whole repo
5. Skills live at ``$guidelinesRepo\global-configs\skills\<name>\SKILL.md`` - load when the recorded trigger matches

## How to Load Guidelines

- Use absolute base path: ``$guidelinesRepo\``[relative-path]
- Compact extracts (Key Takeaways + Anti-Patterns) when context is small
- Project AGENTS.md rules override these global defaults
"@
Write-Utf8NoBom -Path $opencodeAgentsFile -Content $agentsContent
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

In a project, read its AGENTS.md (binding rules) and WORLD.md (intent + declared mode) first; they override these defaults.
Open a guideline by name when the task needs one; use _index/MASTER_INDEX.md only as a lookup when you cannot name it.
Load only the files needed for the current task.
Use absolute base path $guidelinesRepo/ when loading files.
"@
Write-Utf8NoBom -Path $windsurfGlobalRules -Content $windsurfContent
Write-Host "  global_rules.md: $windsurfGlobalRules" -ForegroundColor Green

# --------------------------------------------------
# 3. Cursor: user-level .mdc rule
# --------------------------------------------------
Write-Host "[3] Cursor" -ForegroundColor Yellow

if (-not (Test-Path -LiteralPath $cursorRulesDir)) {
    $null = New-Item -ItemType Directory -Path $cursorRulesDir -Force
}
# A plain file write — nothing here needs elevation. It used to sit behind the admin check, so a
# non-elevated run installed no Cursor rule at all while reporting the tools as configured.
if (Test-Path -LiteralPath $cursorRuleFile) {
    Remove-Item -LiteralPath $cursorRuleFile -Force
}
if (Test-Path -LiteralPath $cursorTemplate) {
    # Resolved copy (not a symlink — the raw template carries an unresolved {{GUIDELINES_ROOT}} token)
    $cursorContent = (Get-Content $cursorTemplate -Raw -Encoding UTF8) -replace '\{\{GUIDELINES_ROOT\}\}', $guidelinesRepo
    Write-Utf8NoBom -Path $cursorRuleFile -Content $cursorContent
    Write-Host "  User rule created: $cursorRuleFile" -ForegroundColor Green
} else {
    Write-Host "  WARNING: template not found at $cursorTemplate" -ForegroundColor Yellow
}

# --------------------------------------------------
# 4. Qoder: global skills symlink
# --------------------------------------------------
Write-Host "[4] Qoder" -ForegroundColor Yellow

if (-not (Test-Path -LiteralPath $qoderSkillsDir)) {
    $null = New-Item -ItemType Directory -Path $qoderSkillsDir -Force
}
# The same shared writer as the opencode pool — whole skill directories, symlink-or-copy.
$pool = Sync-SkillPool -SourceSkillsDir "$guidelinesRepo\global-configs\skills" -PoolDir $qoderSkillsDir
foreach ($message in $pool.Errors) {
    Write-Host "  SKIP $message" -ForegroundColor Yellow
}
Write-Host "  Skills: $($pool.Skills) linked ($($pool.Files) files) to $qoderSkillsDir" -ForegroundColor Green

# --------------------------------------------------
# 5. VS Code: global settings.json (AI agent settings)
# --------------------------------------------------
Write-Host "[5] VS Code" -ForegroundColor Yellow

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
Write-Host "Tools configured: opencode, Windsurf, Cursor, Qoder, VS Code"
Write-Host ""
Write-Host "For per-project setup, run: .\sync-guidelines.ps1"
Write-Host "  (mirrors guidelines + configs into each project)"
