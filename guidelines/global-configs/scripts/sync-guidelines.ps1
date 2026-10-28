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
    # Non-destructive copying can run without the module, so read the manifest directly. The fallback
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

    # Let robocopy create the target only after preflight so refusals stay write-free.
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
        if ($null -ne $mirrorResult -and $mirrorResult.Success -eq $false) {
            $mirrorOk = $false
            if ($mirrorResult.Error) { Write-Host "  ERROR: $($mirrorResult.Error)" -ForegroundColor Red }
        }
    } else {
        if (-not $NoMirrorDelete) {
            Write-Host "  ERROR: GuidelineSync.psm1 is required for mirror preflight. Restore the module before rerunning sync; destructive mirroring is refused." -ForegroundColor Red
            exit 1
        }
        if ($DryRun) {
            Write-Host "  [DRY-RUN] robocopy $guidelinesRepo → $guidelinesDir" -ForegroundColor Yellow
        } else {
            $robocopyArgs = @($guidelinesRepo, $guidelinesDir, "/E")
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

    # Do not install starters, skills, gitignore entries or global configs after a failed mirror.
    if (-not $mirrorOk) { exit 1 }

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
        # A preview must not create `.guidelines-backups/` either: the directory is a write, and an
        # untracked directory left by a dry run is the exact artefact the backup feature was added
        # to avoid.
        $backupDir = if ($Backup -and -not $DryRun) { New-DatedBackupDir $projectRoot } else { $null }
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

    # `/DryRun` covered the mirror, starters and skills but NOT step 2: a preview still created
    # tool-config directories and rewrote AGENTS.md files under the user profile. Those writes are
    # outside the project and invisible in `git status`, so the violation was easy to miss. The
    # branch below is the whole step: in a preview it names every target and writes none.
    $skillCount = 0
    $skillSkips = 0
    $qoderSkillCount = 0
    $qoderSkillSkips = 0
    $globalSkips = @()
    $vscodeNote = 'not run'
    if ($DryRun) {
        Write-Host "  [DRY-RUN] opencode: link all skills into $opencodeSkillsDir and rewrite $opencodeGlobalAgents" -ForegroundColor Yellow
        Write-Host "  [DRY-RUN] Windsurf: rewrite $windsurfGlobalRules" -ForegroundColor Yellow
        Write-Host "  [DRY-RUN] Cursor: rewrite $cursorGlobalGuidelines" -ForegroundColor Yellow
        if (-not $GlobalOnly -and $projectRoot -ne $null) {
            Write-Host "  [DRY-RUN] VS Code: merge AI settings into $(Join-Path $projectRoot '.vscode\settings.json')" -ForegroundColor Yellow
        }
        Write-Host "  [DRY-RUN] Qoder: link all skills into $qoderSkillsDir" -ForegroundColor Yellow
    } else {
    # Machine-global configs live under the user profile, which some hosts deny (sandboxes, CI,
    # locked-down machines). They are best-effort BY DESIGN: the deliverable of a sync is the project
    # mirror, starters and skills — step 1 — and `check-sync-drift.js` verifies exactly that. Before
    # this guard existed, one denied `Remove-Item` under `$ErrorActionPreference = "Stop"` aborted
    # the whole run, so a fully-synced project was reported failed (measured 2026-10-13: every
    # `npm run sync:all` died in this step on `architect\SKILL.md`). A skip is counted and named,
    # never silent — a green run that quietly delivered nothing would be the original defect again.

    # --- opencode: symlink skills + global AGENTS.md ---
    Write-Host "  opencode ..." -ForegroundColor Gray
    try {
    if (-not (Test-Path -LiteralPath $opencodeSkillsDir)) {
        $null = New-Item -ItemType Directory -Path $opencodeSkillsDir -Force
    }
    # The corpus is the Agent Skills standard layout: one directory per skill, each holding a
    # SKILL.md plus any references/ and scripts/ the body loads on demand. `Sync-SkillPool` mirrors
    # the whole directory, so a pool skill is the same skill the source describes — linking only
    # SKILL.md left every on-demand file behind and made the body point at nothing.
    if (-not (Get-Command Sync-SkillPool -ErrorAction SilentlyContinue)) {
        throw "GuidelineSync.psm1 (Sync-SkillPool) is not loaded; skills were not linked."
    }
    $pool = Sync-SkillPool -SourceSkillsDir "$guidelinesRepo\global-configs\skills" -PoolDir $opencodeSkillsDir
    $skillCount = $pool.Skills
    $skillSkips = $pool.Skipped
    foreach ($message in $pool.Errors) {
        Write-Host "    SKIP $message" -ForegroundColor Yellow
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
        "1. In a project, read its ``AGENTS.md`` (binding rules) and ``WORLD.md`` (intent + declared mode) first - they override these global defaults",
        "2. Open a guideline from ``$guidelinesRepo`` by name when the task needs one",
        "3. Use ``_index/MASTER_INDEX.md`` only as a lookup when you cannot name the file the task needs",
        "4. Load only files needed for the current task - never the whole repo",
        "5. Skills live at ``global-configs/skills/<name>/SKILL.md`` - load when the recorded trigger matches",
        "",
        "## How to Load Guidelines",
        "",
        "- Use absolute base path: ``$guidelinesRepo/``[relative-path]",
        "- Compact extracts (Key Takeaways + Anti-Patterns) when context is small",
        "- Project AGENTS.md rules override these global defaults"
    )
    Write-Utf8NoBom -Path $opencodeGlobalAgents -Content ($agentsLines -join "`r`n")
    Write-Host "    Skills: $skillCount linked ($($pool.Files) files), $skillSkips skipped | AGENTS.md updated" -ForegroundColor Green
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

In a project, read its AGENTS.md (binding rules) and WORLD.md (intent + declared mode) first; they override these defaults.
Open a guideline by name when the task needs one; use `_index/MASTER_INDEX.md` only as a lookup when you cannot name it.
Load only the files needed for the current task.
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
        # FAIL CLOSED. The old parse used `ConvertFrom-Json -AsHashtable` (absent on Windows
        # PowerShell 5.1) and caught the failure into `@{}`, then rewrote the file with only the
        # keys this merge knows — deleting every unrelated setting. A file this script cannot parse
        # is left byte-identical, and the skip is named.
        $vscodeSettings = $null
        try {
            if (Get-Command Read-JsonObject -ErrorAction SilentlyContinue) {
                $vscodeSettings = Read-JsonObject -Path $vscodeSettingsFile
            } elseif (Test-Path -LiteralPath $vscodeSettingsFile) {
                $raw = Get-Content $vscodeSettingsFile -Raw -Encoding UTF8
                if ($raw.Trim().Length -gt 0) {
                    $parsed = $raw | ConvertFrom-Json -ErrorAction Stop
                    if ($parsed -isnot [System.Management.Automation.PSCustomObject]) {
                        throw "top-level JSON value is not an object"
                    }
                    $vscodeSettings = @{}
                    foreach ($property in $parsed.PSObject.Properties) {
                        $vscodeSettings[$property.Name] = $property.Value
                    }
                } else {
                    $vscodeSettings = @{}
                }
            } else {
                $vscodeSettings = @{}
            }
        } catch {
            $vscodeNote = 'left untouched (unreadable JSON)'
            Write-Host "    WARNING: .vscode/settings.json is not a readable JSON object — left untouched: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        # Merge AI settings with _guidelines/ relative paths.
        # `$changed` gates the write. This block used to rewrite settings.json on EVERY sync, so a
        # run that altered nothing still produced a diff — and under the Windows PowerShell 5.1 host
        # that diff was also a reformat, because ConvertTo-Json 5.1 emits a BOM, a 4-space indent,
        # `":  "` and no trailing newline, while 7.x emits clean 2-space. Measured 2026-10-12: four
        # fleet projects showed a 24-line churn for a file whose values were already correct.
        # A tool must not rewrite what it did not change.
        if ($null -ne $vscodeSettings) {
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
            $vscodeNote = 'already current'
            Write-Host "    .vscode/settings.json already carries the AI settings" -ForegroundColor DarkGray
        } else {
            # WriteAllText, not Set-Content: `-Encoding UTF8` means "UTF-8 with a BOM" on 5.1 and
            # "without" on 7.x, and a BOM in a project file is a diff nobody asked for. This is
            # identical on both hosts and keeps a trailing newline.
            $vscodeJson = ($vscodeSettings | ConvertTo-Json -Depth 5) + "`n"
            try {
                [System.IO.File]::WriteAllText($vscodeSettingsFile, $vscodeJson, (New-Object System.Text.UTF8Encoding($false)))
                $vscodeNote = 'updated'
                Write-Host "    .vscode/settings.json updated" -ForegroundColor Green
            } catch {
                $vscodeNote = 'write failed (locked)'
                Write-Host "    WARNING: Could not write .vscode/settings.json (file locked)" -ForegroundColor Yellow
            }
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
    if (-not (Get-Command Sync-SkillPool -ErrorAction SilentlyContinue)) {
        throw "GuidelineSync.psm1 (Sync-SkillPool) is not loaded; skills were not linked."
    }
    # The same writer as the opencode pool: one implementation, so the two pools cannot disagree
    # about which files a skill contains.
    $pool = Sync-SkillPool -SourceSkillsDir "$guidelinesRepo\global-configs\skills" -PoolDir $qoderSkillsDir
    $qoderSkillCount = $pool.Skills
    $qoderSkillSkips = $pool.Skipped
    foreach ($message in $pool.Errors) {
        Write-Host "    SKIP $message" -ForegroundColor Yellow
    }
    Write-Host "    Skills: $qoderSkillCount linked ($($pool.Files) files), $qoderSkillSkips skipped" -ForegroundColor Green
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
    Write-Host "  Update AGENTS.md to name itself and WORLD.md as the entry point; link to _guidelines/ guidelines by name"
}
if (-not $SourceOnly) {
    # Report what actually landed, per tool. A tool whose block was skipped names itself as skipped
    # rather than inheriting the success of its neighbours — the summary is the last thing a reader
    # sees, and "installed" over a directory nothing was written to is the defect this whole file
    # family exists to kill.
    if ($DryRun) {
        Write-Host "  Tool configs: PREVIEW ONLY — nothing was written under the user profile or .vscode/"
    } else {
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
        Write-Host "  VS Code:   .vscode/settings.json $vscodeNote"
    }
    }
}
Write-Host ""
Write-Host "Next: When AGENTS.md references _guidelines/ paths, agents can read"
Write-Host "them directly since they're inside the project."
