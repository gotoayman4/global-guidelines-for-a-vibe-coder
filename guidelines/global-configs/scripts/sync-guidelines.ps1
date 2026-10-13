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
#   2. Adds each path in `$gitignoreEntries` (`_guidelines/`, `.guidelines-backups/`) to .gitignore,
#      writing only the entries the project does not already carry
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
# Initialised here, not in the mirror step: `-GlobalOnly` skips that step, and an unassigned variable
# is `$null` — which `-not` reads as a failure, turning a deliberate skip into a false red.
$mirrorOk = $true

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

# ---------------------------------------------------------------------------
# What this script writes INTO a project that must not be tracked
# ---------------------------------------------------------------------------
# Derived from `global-configs/sync-manifest.json`, which is the single home: every section that
# declares a `gitignoreEntry` contributes one. Nothing is listed here, because a hand-kept list is a
# second home — and the path that lived in NO list (`.guidelines-backups/`, created by `-Backup`) is
# the one that shipped broken: a `-Backup` run left an untracked directory, and the `clean-tree`
# step of the pre-push gate fails on an untracked directory. Adding a section to the manifest is now
# enough, and neither writer is edited. `scripts/tests/sync-gitignore.test.js` holds the invariant.
$gitignoreEntries = if (Get-Command Get-GitignoreEntries -ErrorAction SilentlyContinue) {
    Get-GitignoreEntries
} else {
    # The module is optional for the mirror step, so the manifest is read directly. The fallback
    # reads the same source rather than restating the entries — a fallback list would be the defect.
    $manifestPath = Join-Path (Join-Path $guidelinesRepo "global-configs") "sync-manifest.json"
    if (Test-Path $manifestPath) {
        $manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        @($manifest.PSObject.Properties.Value |
            Where-Object { $_ -and $_.PSObject.Properties.Name -contains 'gitignoreEntry' } |
            ForEach-Object { $_.gitignoreEntry } | Select-Object -Unique)
    } else {
        @()
    }
}

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

    # Use module function if available, otherwise fall back to inline robocopy.
    #
    # BOTH paths must report the robocopy exit code. Robocopy signals failure through its exit code
    # alone — a partial copy writes nothing to stderr — so a summary printed without reading it is a
    # claim about a copy nobody checked. This step used to print a green
    # `Complete: N files mirrored` unconditionally, counting whatever happened to land: a failed
    # mirror read as a successful one. Measured 2026-10-13: the GUI had already been fixed for this
    # (B7 in IMPLEMENTATION_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-13.md) while this CLI — the path
    # `sync-all.js` drives for all seven fleet projects — had not.
    $mirrorOk = $true
    if (Get-Command Sync-MirrorDirectory -ErrorAction SilentlyContinue) {
        $mirrorResult = Sync-MirrorDirectory -sourceDir $guidelinesRepo -targetDir $guidelinesDir -DryRun:$DryRun -NoMirrorDelete:$NoMirrorDelete
        if ($null -ne $mirrorResult -and $mirrorResult.Success -eq $false) { $mirrorOk = $false }
    } else {
        if ($DryRun) {
            Write-Host "  [DRY-RUN] robocopy $guidelinesRepo → $guidelinesDir" -ForegroundColor Yellow
        } else {
            $robocopyArgs = @($guidelinesRepo, $guidelinesDir)
            if ($NoMirrorDelete) { $robocopyArgs += "/E" } else { $robocopyArgs += "/MIR" }
            $robocopyArgs += @("/NJH", "/NJS", "/NDL", "/NP", "/R:1", "/W:1",
                               "/XD", ".git", ".github")
            # The same 0–7 success / 8+ failure contract the module applies. `robocopy @args` as a bare
            # command was the other half of the defect: `$ErrorActionPreference = "Stop"` does not stop
            # it, because robocopy reports a failed copy through its exit code, not the error stream.
            $proc = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -Wait -NoNewWindow -PassThru
            if ($proc.ExitCode -gt 7) {
                Write-Host "  ERROR: robocopy failed (exit code $($proc.ExitCode)) — the mirror is INCOMPLETE." -ForegroundColor Red
                $mirrorOk = $false
            }
        }
    }

    if ($DryRun) {
        # Nothing landed, so there is no count worth printing.
    } elseif ($mirrorOk) {
        Write-Host "  Complete: $((Get-ChildItem $guidelinesDir -Recurse -File | Measure-Object).Count) files mirrored" -ForegroundColor Green
    } else {
        Write-Host "  FAILED: _guidelines/ is incomplete — see the robocopy error above." -ForegroundColor Red
    }

    # Add this script's project-local paths to .gitignore (see $gitignoreEntries above).
    if (Get-Command Update-Gitignore -ErrorAction SilentlyContinue) {
        Update-Gitignore -projectPath $projectRoot -entry $gitignoreEntries -DryRun:$DryRun
    } else {
        if (-not $DryRun) {
            $gitignore = Join-Path $projectRoot ".gitignore"
            $existing = ""
            if (Test-Path -LiteralPath $gitignore) {
                $existing = Get-Content $gitignore -Raw -Encoding UTF8
            }
            # Per entry, not per file: a project that already has `_guidelines/` must still receive
            # an entry added later, or the list can only ever grow for brand-new projects.
            $missing = @($gitignoreEntries | Where-Object { $existing -notmatch "(?m)^$([regex]::Escape($_))" })
            if ($missing.Count -gt 0) {
                $block = "`n# mirrored from central guidelines repo`n" + ($missing -join "`n")
                Add-Content -Path $gitignore -Value $block -Encoding UTF8
                Write-Host "  Added to .gitignore: $($missing -join ', ')" -ForegroundColor Green
            } else {
                Write-Host "  .gitignore already carries: $($gitignoreEntries -join ', ')" -ForegroundColor Gray
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
    # Machine-global configs live under the user profile, which some hosts deny (sandboxes, CI,
    # locked-down machines). They are best-effort BY DESIGN: the deliverable of a sync is the project
    # mirror, starters and skills — step 1 — and `check-sync-drift.js` verifies exactly that. Before
    # this guard existed, one denied `Remove-Item` under `$ErrorActionPreference = "Stop"` aborted
    # the whole run, so a fully-synced project was reported failed (measured 2026-10-13: every
    # `npm run sync:all` died in this step on `architect\SKILL.md`). A skip is counted and named,
    # never silent — a green run that quietly delivered nothing would be the original defect again.
    $globalSkips = @()

    # --- opencode: symlink skills + global AGENTS.md ---
    Write-Host "  opencode ..." -ForegroundColor Gray
    try {
    if (-not (Test-Path -LiteralPath $opencodeSkillsDir)) {
        $null = New-Item -ItemType Directory -Path $opencodeSkillsDir -Force
    }
    # The corpus is the Agent Skills standard layout: one directory per skill, each holding a
    # SKILL.md. Enumerating `*/SKILL.md` (not `*.skill.md`) is what makes the pool conformant — a
    # native loader scans for SKILL.md, and the flat file this used to link was invisible to every
    # one of them. Kept in step with setup-global-references.ps1, which links the same pool.
    $skillFiles = Get-ChildItem -Path "$guidelinesRepo\global-configs\skills" -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Join-Path $_.FullName "SKILL.md" } |
        Where-Object { Test-Path -LiteralPath $_ }
    $skillCount = 0
    $skillSkips = 0
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
        try {
            if (-not (Test-Path -LiteralPath $skillDir)) {
                $null = New-Item -ItemType Directory -Path $skillDir -Force
            }
            if (Test-Path -LiteralPath $symlinkPath) {
                Remove-Item -LiteralPath $symlinkPath -Force
            }
            # Symlink needs elevation (or Developer Mode) on Windows; fall back to a
            # copy so an unelevated sync:all still lands the skill (D192 lesson).
            try {
                $null = New-Item -ItemType SymbolicLink -Path $symlinkPath -Target $file -Force -ErrorAction Stop
            } catch {
                Copy-Item -LiteralPath $file -Destination $symlinkPath -Force
            }
            $skillCount++
        } catch {
            # One denied path (sandbox, read-only copy, ACL) must not take the other nineteen
            # skills — or the project sync — down with it.
            Write-Host "    SKIP $skillName`: $($_.Exception.Message)" -ForegroundColor Yellow
            $skillSkips++
        }
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
        "4. Skills live at ``global-configs/skills/<name>/SKILL.md`` - load when trigger matches",
        "",
        "## How to Load Guidelines",
        "",
        "- Use absolute base path: ``$guidelinesRepo/``[relative-path]",
        "- Compact extracts (Key Takeaways + Anti-Patterns) when context is small",
        "- Project AGENTS.md rules override these global defaults"
    )
    Write-Utf8NoBom -Path $opencodeGlobalAgents -Content ($agentsLines -join "`r`n")
    Write-Host "    Skills: $skillCount linked, $skillSkips skipped | AGENTS.md updated" -ForegroundColor Green
    } catch {
        Write-Host "    SKIPPED opencode: $($_.Exception.Message)" -ForegroundColor Yellow
        $globalSkips += "opencode"
    }

    # --- Windsurf: global_rules.md ---
    Write-Host "  Windsurf ..." -ForegroundColor Gray
    try {
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
    Write-Utf8NoBom -Path $windsurfGlobalRules -Content ($windsurfContent + "`r`n")
    Write-Host "    global_rules.md created" -ForegroundColor Green
    } catch {
        Write-Host "    SKIPPED Windsurf: $($_.Exception.Message)" -ForegroundColor Yellow
        $globalSkips += "Windsurf"
    }

    # --- Cursor: user-level .mdc rule ---
    Write-Host "  Cursor ..." -ForegroundColor Gray
    try {
    if (-not (Test-Path -LiteralPath $cursorUserRulesDir)) {
        $null = New-Item -ItemType Directory -Path $cursorUserRulesDir -Force
    }
    if (Test-Path -LiteralPath $cursorGlobalGuidelines) {
        Remove-Item -LiteralPath $cursorGlobalGuidelines -Force
    }
    # Cursor user rule: template copy with {{GUIDELINES_ROOT}} resolved (not a symlink —
    # the raw template carries an unresolved token)
    $cursorTemplate = "$guidelinesRepo\global-configs\templates\cursor-global-guidelines.mdc.template"
    if (Test-Path -LiteralPath $cursorTemplate) {
        $cursorContent = (Get-Content $cursorTemplate -Raw -Encoding UTF8) -replace '\{\{GUIDELINES_ROOT\}\}', $guidelinesRepo
        Write-Utf8NoBom -Path $cursorGlobalGuidelines -Content $cursorContent
    }
    Write-Host "    User rule created" -ForegroundColor Green
    } catch {
        Write-Host "    SKIPPED Cursor: $($_.Exception.Message)" -ForegroundColor Yellow
        $globalSkips += "Cursor"
    }

    # --- VS Code: per-project .vscode/settings.json ---
    if (-not $GlobalOnly -and $projectRoot -ne $null) {
        Write-Host "  VS Code ..." -ForegroundColor Gray
        try {
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
        # Merge AI settings with _guidelines/ relative paths.
        # `$changed` gates the write. This block used to rewrite settings.json on EVERY sync, so a
        # run that altered nothing still produced a diff — and under the Windows PowerShell 5.1 host
        # that diff was also a reformat, because ConvertTo-Json 5.1 emits a BOM, a 4-space indent,
        # `":  "` and no trailing newline, while 7.x emits clean 2-space. Measured 2026-10-12: four
        # fleet projects showed a 24-line churn for a file whose values were already correct.
        # A tool must not rewrite what it did not change.
        $changed = $false
        if (-not $vscodeSettings.ContainsKey("chat.useAgentsMdFile")) {
            $vscodeSettings["chat.useAgentsMdFile"] = $true; $changed = $true
        }
        if (-not $vscodeSettings.ContainsKey("chat.useNestedAgentsMdFiles")) {
            $vscodeSettings["chat.useNestedAgentsMdFiles"] = $true; $changed = $true
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
            if ($needsFix) { $vscodeSettings[$key] = $copilotInstructions; $changed = $true }
        }
        if (-not $changed) {
            Write-Host "    .vscode/settings.json already carries the AI settings" -ForegroundColor DarkGray
        } else {
            # WriteAllText, not Set-Content: `-Encoding UTF8` means "UTF-8 with a BOM" on 5.1 and
            # "without" on 7.x, and a BOM in a project file is a diff nobody asked for. This is
            # identical on both hosts and keeps a trailing newline.
            $vscodeJson = ($vscodeSettings | ConvertTo-Json -Depth 5) + "`n"
            try {
                [System.IO.File]::WriteAllText($vscodeSettingsFile, $vscodeJson, (New-Object System.Text.UTF8Encoding($false)))
                Write-Host "    .vscode/settings.json updated" -ForegroundColor Green
            } catch {
                Write-Host "    WARNING: Could not write .vscode/settings.json (file locked)" -ForegroundColor Yellow
            }
        }
        } catch {
            Write-Host "    SKIPPED VS Code: $($_.Exception.Message)" -ForegroundColor Yellow
            $globalSkips += "VS Code"
        }
    }

    # --- Qoder: global skills symlink ---
    Write-Host "  Qoder ..." -ForegroundColor Gray
    try {
    if (-not (Test-Path -LiteralPath $qoderSkillsDir)) {
        $null = New-Item -ItemType Directory -Path $qoderSkillsDir -Force
    }
    $qoderSkillCount = 0
    $qoderSkillSkips = 0
    foreach ($file in $skillFiles) {
        # Position-only split — see the skill-name split in the opencode block for why.
        $skillName = Split-Path (Split-Path $file -Parent) -Leaf
        $qoderSkillDir = Join-Path $qoderSkillsDir $skillName
        $qoderSymlink = Join-Path $qoderSkillDir "SKILL.md"
        try {
            if (-not (Test-Path -LiteralPath $qoderSkillDir)) {
                $null = New-Item -ItemType Directory -Path $qoderSkillDir -Force
            }
            if (Test-Path -LiteralPath $qoderSymlink) {
                Remove-Item -LiteralPath $qoderSymlink -Force
            }
            try {
                $null = New-Item -ItemType SymbolicLink -Path $qoderSymlink -Target $file -Force -ErrorAction Stop
            } catch {
                Copy-Item -LiteralPath $file -Destination $qoderSymlink -Force
            }
            $qoderSkillCount++
        } catch {
            Write-Host "    SKIP $skillName`: $($_.Exception.Message)" -ForegroundColor Yellow
            $qoderSkillSkips++
        }
    }
    Write-Host "    Skills: $qoderSkillCount linked, $qoderSkillSkips skipped" -ForegroundColor Green
    } catch {
        Write-Host "    SKIPPED Qoder: $($_.Exception.Message)" -ForegroundColor Yellow
        $globalSkips += "Qoder"
    }

    if ($globalSkips.Count -gt 0) {
        Write-Host ""
        Write-Host "  WARNING: machine-global config skipped for: $($globalSkips -join ', ')" -ForegroundColor Yellow
        Write-Host "  The project mirror, starters and skills are complete; these tool configs are" -ForegroundColor Yellow
        Write-Host "  best-effort (they live under the user profile, which this host restricts)." -ForegroundColor Yellow
    }
} else {
    Write-Host "[2/3] Skipping global tool configs (SourceOnly)" -ForegroundColor Gray
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ""
# A failed mirror exits NON-ZERO. The exit code is the contract `sync-all.js` reads — it marks the
# project failed and refuses to stamp `lastSynced` — and a manual CLI run has no hash check to fall
# back on, so this is the only signal that reaches a caller. Printing a completion banner and exiting
# 0 over an incomplete `_guidelines/` is how a broken mirror became a green fleet report.
if (-not $mirrorOk) {
    Write-Host "=== Sync FAILED ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "  The _guidelines/ mirror did not complete — _guidelines/ is INCOMPLETE and must not be trusted." -ForegroundColor Red
    Write-Host "  Fix the robocopy error reported above, then re-run this sync." -ForegroundColor Red
    exit 1
}
Write-Host "=== Sync Complete ===" -ForegroundColor Cyan
Write-Host ""
if (-not $GlobalOnly) {
    Write-Host "  Guidelines mirrored to: _guidelines/"
    Write-Host "  Update AGENTS.md to reference: _guidelines/_index/MASTER_INDEX.md"
}
if (-not $SourceOnly) {
    # Report what actually landed, per tool. A tool whose block was skipped names itself as skipped
    # rather than inheriting the success of its neighbours — the summary is the last thing a reader
    # sees, and "installed" over a directory nothing was written to is the defect this whole file
    # family exists to kill.
    if ($globalSkips -contains "opencode") {
        Write-Host "  opencode:  SKIPPED (see the warning above)"
    } else {
        Write-Host "  opencode:  $skillCount skills + global AGENTS.md ($skillSkips skill links skipped)"
    }
    if ($globalSkips -contains "Windsurf") {
        Write-Host "  Windsurf:  SKIPPED (see the warning above)"
    } else {
        Write-Host "  Windsurf:  global_rules.md installed"
    }
    if ($globalSkips -contains "Cursor") {
        Write-Host "  Cursor:    SKIPPED (see the warning above)"
    } else {
        Write-Host "  Cursor:    user rule installed"
    }
    if ($globalSkips -contains "Qoder") {
        Write-Host "  Qoder:     SKIPPED (see the warning above)"
    } else {
        Write-Host "  Qoder:     $qoderSkillCount skills linked ($qoderSkillSkips skipped)"
    }
    if ($globalSkips -contains "VS Code") {
        Write-Host "  VS Code:   SKIPPED (see the warning above)"
    } else {
        Write-Host "  VS Code:   .vscode/settings.json instructions added"
    }
}
Write-Host ""
Write-Host "Next: When AGENTS.md references _guidelines/ paths, agents can read"
Write-Host "them directly since they're inside the project."
