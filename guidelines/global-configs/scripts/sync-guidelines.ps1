# sync-guidelines.ps1
# Syncs the central guidelines repo into a project and sets up global tool configs.
# Run from any project directory, or pass -ProjectPath.
#
# Usage:
#   .\path\to\sync-guidelines.ps1                          # current directory
#   .\path\to\sync-guidelines.ps1 -ProjectPath "..\my-app"  # specific project
#   .\path\to\sync-guidelines.ps1 -SourceOnly               # skip global tool configs
#   .\path\to\sync-guidelines.ps1 -GlobalOnly               # skip _guidelines/ mirror
#   .\path\to\sync-guidelines.ps1 -DryRun                   # preview without writing
#   .\path\to\sync-guidelines.ps1 -Backup                   # backup existing files before overwrite
#   .\path\to\sync-guidelines.ps1 -NoMirrorDelete           # copy without deleting (safer)
#   .\path\to\sync-guidelines.ps1 -RestoreBackup "2026-06-13_14-30-00"  # restore from backup
#
# What it does:
#   1. Mirrors the central repo into _guidelines/ inside the project
#   2. Adds _guidelines/ to .gitignore
#   3. Sets up global configs for: opencode, Windsurf, Cursor, Qoder, VS Code

param(
    [string]$ProjectPath = ".",
    [switch]$SourceOnly,
    [switch]$GlobalOnly,
    [switch]$DryRun,
    [switch]$Backup,
    [switch]$NoMirrorDelete,
    [string]$RestoreBackup = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = $null  # set only when -GlobalOnly is not active

# Import shared module
$modulePath = Join-Path $PSScriptRoot "GuidelineSync.psm1"
if (Test-Path $modulePath) {
    Import-Module $modulePath -Force
} else {
    Write-Warning "GuidelineSync.psm1 not found at $modulePath - using inline functions."
}

# Handle -RestoreBackup
if ($RestoreBackup -ne "") {
    if (-not (Get-Command Restore-Backup -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: GuidelineSync.psm1 required for restore. File not found: $modulePath" -ForegroundColor Red
        exit 1
    }
    $projectRoot = Resolve-Path $ProjectPath -ErrorAction Stop
    Restore-Backup -projectPath $projectRoot -timestamp $RestoreBackup
    exit 0
}

# ---------------------------------------------------------------------------
# Configuration — change these paths for your machine
# ---------------------------------------------------------------------------
$guidelinesRepo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$settingsDir = "$env:USERPROFILE\.config\opencode"
$opencodeSkillsDir = "$settingsDir\skills"
$opencodeGlobalAgents = "$settingsDir\AGENTS.md"
$windsurfMemoriesDir = "$env:USERPROFILE\.codeium\windsurf\memories"
$windsurfGlobalRules = "$windsurfMemoriesDir\global_rules.md"
$cursorUserRulesDir = "$env:USERPROFILE\.cursor\rules"
$cursorGlobalGuidelines = "$cursorUserRulesDir\global-guidelines-from-central.mdc"
$qoderSkillsDir = "$env:USERPROFILE\.qoder\skills"

Write-Host "=== Sync Guidelines ===" -ForegroundColor Cyan
Write-Host "Source: $guidelinesRepo" -ForegroundColor Gray
Write-Host ""

# ---------------------------------------------------------------------------
# Step 1: Mirror into _guidelines/ in the target project
# ---------------------------------------------------------------------------
if (-not $GlobalOnly) {
    $projectRoot = Resolve-Path $ProjectPath -ErrorAction Stop
    $guidelinesDir = Join-Path $projectRoot "_guidelines"

    Write-Host "[1/3] Mirroring guidelines into $guidelinesDir ..." -ForegroundColor Yellow

    if (-not (Test-Path -LiteralPath $guidelinesDir)) {
        if ($DryRun) {
            Write-Host "  [DRY-RUN] Would create directory: $guidelinesDir" -ForegroundColor Yellow
        } else {
            $null = New-Item -ItemType Directory -Path $guidelinesDir -Force
        }
    }

    # Use module function if available, otherwise fall back to inline robocopy
    if (Get-Command Sync-MirrorDirectory -ErrorAction SilentlyContinue) {
        Sync-MirrorDirectory -sourceDir $guidelinesRepo -targetDir $guidelinesDir -DryRun:$DryRun -NoMirrorDelete:$NoMirrorDelete
    } else {
        if ($DryRun) {
            Write-Host "  [DRY-RUN] robocopy $guidelinesRepo → $guidelinesDir" -ForegroundColor Yellow
        } else {
            $robocopyArgs = @($guidelinesRepo, $guidelinesDir)
            if ($NoMirrorDelete) { $robocopyArgs += "/E" } else { $robocopyArgs += "/MIR" }
            $robocopyArgs += @("/NJH", "/NJS", "/NDL", "/NP", "/R:1", "/W:1",
                               "/XD", ".git", ".github")
            robocopy @robocopyArgs
        }
    }

    if (-not $DryRun) {
        Write-Host "  Complete: $((Get-ChildItem $guidelinesDir -Recurse -File | Measure-Object).Count) files mirrored" -ForegroundColor Green
    }

    # Add _guidelines/ to .gitignore
    if (Get-Command Update-Gitignore -ErrorAction SilentlyContinue) {
        Update-Gitignore -projectPath $projectRoot -entry "_guidelines/" -DryRun:$DryRun
    } else {
        if (-not $DryRun) {
            $gitignore = Join-Path $projectRoot ".gitignore"
            $existing = ""
            if (Test-Path -LiteralPath $gitignore) {
                $existing = Get-Content $gitignore -Raw -Encoding UTF8
            }
            if ($existing -notmatch "(?m)^_guidelines/") {
                Add-Content -Path $gitignore -Value "`n# mirrored from central guidelines repo`n_guidelines/" -Encoding UTF8
                Write-Host "  Added _guidelines/ to .gitignore" -ForegroundColor Green
            } else {
                Write-Host "  _guidelines/ already in .gitignore" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Host "[1/3] Skipping _guidelines/ mirror (GlobalOnly)" -ForegroundColor Gray
}

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
                -mode $starter.mode -DryRun:$DryRun -backupDir $backupDir -projectPath $projectRoot `
                -guidelinesRoot $guidelinesRepo
        }
    }

    # === Step 1c: Sync skills ===
    Write-Host "[1c/3] Syncing skills..." -ForegroundColor Yellow
    Sync-Skills -guidelinesRepo $guidelinesRepo -projectPath $projectRoot -DryRun:$DryRun
}

# ---------------------------------------------------------------------------
# Step 2: Sync global configs for supported AI tools
# ---------------------------------------------------------------------------
if (-not $SourceOnly) {
    Write-Host "[2/3] Syncing global tool configs..." -ForegroundColor Yellow

    # --- opencode: symlink skills + global AGENTS.md ---
    Write-Host "  opencode ..." -ForegroundColor Gray
    if (-not (Test-Path -LiteralPath $opencodeSkillsDir)) {
        $null = New-Item -ItemType Directory -Path $opencodeSkillsDir -Force
    }
    $skillFiles = Get-ChildItem "$guidelinesRepo\global-configs\skills\*.skill.md"
    $skillCount = 0
    foreach ($file in $skillFiles) {
        $skillName = $file.BaseName -replace '\.skill$', ''
        $skillDir = Join-Path $opencodeSkillsDir $skillName
        $symlinkPath = Join-Path $skillDir "SKILL.md"
        if (-not (Test-Path -LiteralPath $skillDir)) {
            $null = New-Item -ItemType Directory -Path $skillDir -Force
        }
        if (Test-Path -LiteralPath $symlinkPath) {
            Remove-Item -LiteralPath $symlinkPath -Force
        }
        $null = New-Item -ItemType SymbolicLink -Path $symlinkPath -Target $file.FullName -Force
        $skillCount++
    }
    # Global AGENTS.md for opencode
    $agentsLines = @(
        "# Global Development Guidelines",
        "",
        "This machine has a shared guidelines repository at:",
        "``$guidelinesRepo``",
        "",
        "## Before Every Session",
        "",
        "1. If not already loaded via project ``opencode.json``, read ``_index/RETRIEVAL_RULES.md``",
        "2. Read ``_index/MASTER_INDEX.md`` to map task type to relevant files",
        "3. Load only files needed for the current task - never the whole repo",
        "4. Skills live at ``global-configs/skills/<name>.skill.md`` - load when trigger matches",
        "",
        "## How to Load Guidelines",
        "",
        "- Use absolute base path: ``$guidelinesRepo/``[relative-path]",
        "- Compact extracts (Key Takeaways + Anti-Patterns) when context is small",
        "- Project AGENTS.md rules override these global defaults"
    )
    Set-Content -Path $opencodeGlobalAgents -Value ($agentsLines -join "`r`n") -NoNewline -Encoding UTF8
    Write-Host "    Skills: $skillCount linked | AGENTS.md updated" -ForegroundColor Green

    # --- Windsurf: global_rules.md ---
    Write-Host "  Windsurf ..." -ForegroundColor Gray
    if (-not (Test-Path -LiteralPath $windsurfMemoriesDir)) {
        $null = New-Item -ItemType Directory -Path $windsurfMemoriesDir -Force
    }
    $windsurfContent = @"
This machine has a shared guidelines repository at:
$guidelinesRepo

ALWAYS read `_index/MASTER_INDEX.md` from that path first.
Then load only the files needed for the current task.
Use absolute base path `$guidelinesRepo/` when loading files.
"@
    Set-Content -Path $windsurfGlobalRules -Value $windsurfContent -Encoding UTF8
    Write-Host "    global_rules.md created" -ForegroundColor Green

    # --- Cursor: user-level .mdc rule ---
    Write-Host "  Cursor ..." -ForegroundColor Gray
    if (-not (Test-Path -LiteralPath $cursorUserRulesDir)) {
        $null = New-Item -ItemType Directory -Path $cursorUserRulesDir -Force
    }
    if (Test-Path -LiteralPath $cursorGlobalGuidelines) {
        Remove-Item -LiteralPath $cursorGlobalGuidelines -Force
    }
    # Symlink from Cursor user rules to the central guidelines template
    $cursorTemplate = "$guidelinesRepo\global-configs\templates\cursor-global-guidelines.mdc.template"
    if (Test-Path -LiteralPath $cursorTemplate) {
        $null = New-Item -ItemType SymbolicLink -Path $cursorGlobalGuidelines -Target $cursorTemplate -Force
    }
    Write-Host "    User rule created" -ForegroundColor Green

    # --- VS Code: per-project .vscode/settings.json ---
    if (-not $GlobalOnly -and $projectRoot -ne $null) {
        Write-Host "  VS Code ..." -ForegroundColor Gray
        $vscodeDir = Join-Path $projectRoot ".vscode"
        if (-not (Test-Path -LiteralPath $vscodeDir)) {
            $null = New-Item -ItemType Directory -Path $vscodeDir -Force
        }
        $vscodeSettingsFile = Join-Path $vscodeDir "settings.json"
        if (Test-Path -LiteralPath $vscodeSettingsFile) {
            $vscodeExisting = Get-Content $vscodeSettingsFile -Raw -Encoding UTF8
            try { $vscodeSettings = $vscodeExisting | ConvertFrom-Json -AsHashtable } catch { $vscodeSettings = @{} }
        } else {
            $vscodeSettings = @{}
        }
        # Merge AI settings with _guidelines/ relative paths
        if (-not $vscodeSettings.ContainsKey("chat.useAgentsMdFile")) {
            $vscodeSettings["chat.useAgentsMdFile"] = $true
        }
        if (-not $vscodeSettings.ContainsKey("chat.useNestedAgentsMdFiles")) {
            $vscodeSettings["chat.useNestedAgentsMdFiles"] = $true
        }
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
        $vscodeJson = $vscodeSettings | ConvertTo-Json -Depth 5
        try {
            Set-Content -Path $vscodeSettingsFile -Value $vscodeJson -NoNewline -Encoding UTF8 -ErrorAction Stop
            Write-Host "    .vscode/settings.json updated" -ForegroundColor Green
        } catch {
            Write-Host "    WARNING: Could not write .vscode/settings.json (file locked)" -ForegroundColor Yellow
        }
    }

    # --- Qoder: global skills symlink ---
    Write-Host "  Qoder ..." -ForegroundColor Gray
    if (-not (Test-Path -LiteralPath $qoderSkillsDir)) {
        $null = New-Item -ItemType Directory -Path $qoderSkillsDir -Force
    }
    $qoderSkillCount = 0
    foreach ($file in $skillFiles) {
        $skillName = $file.BaseName -replace '\.skill$', ''
        $qoderSkillDir = Join-Path $qoderSkillsDir $skillName
        $qoderSymlink = Join-Path $qoderSkillDir "SKILL.md"
        if (-not (Test-Path -LiteralPath $qoderSkillDir)) {
            $null = New-Item -ItemType Directory -Path $qoderSkillDir -Force
        }
        if (Test-Path -LiteralPath $qoderSymlink) {
            Remove-Item -LiteralPath $qoderSymlink -Force
        }
        $null = New-Item -ItemType SymbolicLink -Path $qoderSymlink -Target $file.FullName -Force
        $qoderSkillCount++
    }
    Write-Host "    Skills: $qoderSkillCount linked" -ForegroundColor Green

} else {
    Write-Host "[2/3] Skipping global tool configs (SourceOnly)" -ForegroundColor Gray
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Sync Complete ===" -ForegroundColor Cyan
Write-Host ""
if (-not $GlobalOnly) {
    Write-Host "  Guidelines mirrored to: _guidelines/"
    Write-Host "  Update AGENTS.md to reference: _guidelines/_index/MASTER_INDEX.md"
}
if (-not $SourceOnly) {
    Write-Host "  opencode:  $skillCount skills + global AGENTS.md"
    Write-Host "  Windsurf:  global_rules.md installed"
    Write-Host "  Cursor:    user rule installed"
    Write-Host "  Qoder:     $qoderSkillCount skills linked"
    Write-Host "  VS Code:   .vscode/settings.json instructions added"
}
Write-Host ""
Write-Host "Next: When AGENTS.md references _guidelines/ paths, agents can read"
Write-Host "them directly since they're inside the project."
