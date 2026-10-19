# sync-manager.ps1
# GUI tool to sync guidelines, starters, tool configs, and skills into projects.
# Also: run repo validation scripts and machine setup.
# Double-click sync-manager.cmd to launch.

# --- UTF-8 without BOM ---
# Same helper as GuidelineSync.psm1: `Set-Content -Encoding UTF8` writes a BOM on Windows
# PowerShell 5.1, and a BOM in a project file is diff noise. Defined here too so the inline
# fallbacks below stay correct even when the module import fails. Guarded by tests/sync-gitignore.test.js.
$script:Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
function Write-Utf8NoBom {
    param([string]$Path, [string]$Content)
    [System.IO.File]::WriteAllText($Path, $Content, $script:Utf8NoBom)
}

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

$projectsFile   = Join-Path $guidelinesRepo "sync-projects.json"
$syncContentDir = Join-Path $guidelinesRepo "guidelines"
$nodeAvailable = $null -ne (Get-Command "node" -ErrorAction SilentlyContinue)
$npmAvailable  = $null -ne (Get-Command "npm"  -ErrorAction SilentlyContinue)

# Import shared module
$modulePath = Join-Path $syncContentDir "global-configs\scripts\GuidelineSync.psm1"
$moduleImported = $false
if (Test-Path $modulePath) {
    try {
        Import-Module $modulePath -Force
        $moduleImported = $true
    } catch {
        $moduleImported = $false
    }
}

# --- helpers ---
function Resolve-ProjectName([string]$path) {
    return Split-Path $path -Leaf
}

function Test-Project([string]$path) {
    return (Test-Path $path) -and (Get-Item $path).PSIsContainer
}

function Save-ProjectList([array]$list) {
    Write-Utf8NoBom -Path $projectsFile -Content ($list | ConvertTo-Json -Depth 3)
}

function Load-ProjectList() {
    if (Test-Path $projectsFile) {
        try { return Get-Content $projectsFile -Raw -Encoding UTF8 | ConvertFrom-Json } catch { return @() }
    }
    return @()
}

function Append-Log($box, [string]$msg) {
    $box.AppendText("$([DateTime]::Now.ToString('HH:mm:ss')) $msg`r`n")
    $box.SelectionStart = $box.TextLength
    $box.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

# --- manifest loading ---
$manifestPath = Join-Path $syncContentDir "global-configs\sync-manifest.json"
$manifest = $null
if (Test-Path $manifestPath) {
    try { $manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $manifest = $null }
}

# Build STARTERS and TOOL_CONFIGS from manifest (fall back to hardcoded if manifest missing)
if ($manifest -and $manifest.starters) {
    $STARTERS = @()
    foreach ($s in $manifest.starters) {
        $STARTERS += @{
            template = $s.template -replace '/', '\'
            target   = $s.target   -replace '/', '\'
            mode     = $s.mode
            header   = $null
            body     = $null
        }
    }
} else {
    $STARTERS = @(
        @{ template = "global-configs\templates\AGENTS.starter.md";              target = "AGENTS.md";                        mode = "create-if-missing"; header = "# AGENTS.md";                  body = "**Purpose:**" }
        @{ template = "global-configs\templates\README.starter.md";              target = "README.md";                        mode = "create-if-missing"; header = "# README.md";                  body = "**Purpose:**" }
        @{ template = "global-configs\templates\DEVTOOLS.starter.md";             target = "DEVTOOLS.md";                      mode = "create-if-missing"; header = "# DEVTOOLS.md";                body = "**Purpose:**" }
        @{ template = "global-configs\templates\WORLD.starter.md";               target = "WORLD.md";                         mode = "create-if-missing"; header = "# WORLD.md";                  body = "**Purpose:**" }
        @{ template = "global-configs\templates\copilot-instructions.starter.md"; target = ".github\copilot-instructions.md"; mode = "create-if-missing"; header = "# GitHub Copilot Instructions"; body = "**Purpose:**" }
    )
}

if ($manifest -and $manifest.toolConfigs) {
    $TOOL_CONFIGS = @()
    foreach ($c in $manifest.toolConfigs) {
        $TOOL_CONFIGS += @{
            template = $c.template -replace '/', '\'
            target   = $c.target   -replace '/', '\'
            detect   = $c.detect
        }
    }
} else {
    $TOOL_CONFIGS = @(
        @{ template = "global-configs\templates\opencode.json.template";                       target = "opencode.json";                          detect = $null }
        @{ template = "global-configs\templates\kilo.jsonc.template";                         target = "kilo.jsonc";                             detect = ".vscode" }
        @{ template = "global-configs\templates\GEMINI.md.template";                          target = "GEMINI.md";                              detect = ".gemini" }
        @{ template = "global-configs\templates\cursor-global-guidelines.mdc.template";       target = ".cursor\rules\global-guidelines.mdc";   detect = ".cursor" }
        @{ template = "global-configs\templates\trae-global-guidelines.md.template";          target = ".trae\rules\global-guidelines.md";      detect = ".trae" }
        @{ template = "global-configs\templates\windsurf-global-guidelines.md.template";      target = ".windsurf\rules\global-guidelines.md"; detect = ".windsurf" }
        @{ template = "global-configs\templates\qoder-global-guidelines.md.template";         target = "qoder-global-guidelines.md";            detect = $null }
    )
}

# --- inline fallback functions (used when module is unavailable) ---

function Update-StarterFile([string]$projectPath, [string]$templateRelPath, [string]$targetRelPath, $headerCheck, $logBox, $bodyMarker) {
    $templatePath = Join-Path $syncContentDir $templateRelPath
    $targetPath = Join-Path $projectPath $targetRelPath
    if (-not (Test-Path $templatePath)) { return }
    $parentDir = Split-Path $targetPath -Parent
    if ($parentDir -ne "" -and -not (Test-Path $parentDir)) {
        $null = New-Item -ItemType Directory -Path $parentDir -Force
    }
    $starterContent = Get-Content $templatePath -Raw -Encoding UTF8
    if ($syncContentDir) {
        $starterContent = $starterContent -replace '\{\{GUIDELINES_ROOT\}\}', $syncContentDir
    }
    if (Test-Path $targetPath) {
        $existingContent = Get-Content $targetPath -Raw -Encoding UTF8
        # The marker is `-> Source:` here and `→ Source:` in GuidelineSync.psm1 -- the module's form is
        # the one that exists. Every fragment under `global-configs/fragments/` writes
        # `→ Source: \`path\``, `audit-rules.js` parses that arrow (`/→\s*(?:Source|Guideline):/`), and
        # a repo-wide search finds `-> Source:` in NO file. So this regex could never match, and the
        # GUI's legacy-marker cleanup silently did nothing -- while the CLI cleaned the same lines.
        # The arrow is safe to write here only because this file now carries a UTF-8 BOM; without one
        # PowerShell 5.1 decodes the arrow's bytes as a smart quote and the script will not parse.
        $cleanedContent = $existingContent -replace '(?m)^.*→ Source:.*\n?', ''
        if (-not [string]::IsNullOrEmpty($headerCheck)) {
            $escapedHeader = '(?m)^' + [regex]::Escape($headerCheck)
            $headerMatches = [regex]::Matches($cleanedContent, $escapedHeader)
            if ($headerMatches.Count -gt 1) {
                $firstCopyEnd = $headerMatches[1].Index
                $deduped = $cleanedContent.Substring(0, $firstCopyEnd).TrimEnd()
                Write-Utf8NoBom -Path $targetPath -Content $deduped
                Append-Log $logBox "  Deduplicated $targetRelPath (removed $($headerMatches.Count - 1) duplicates)"
                return
            }
        }
        if (-not [string]::IsNullOrEmpty($bodyMarker)) {
            $bodyMatches = [regex]::Matches($cleanedContent, [regex]::Escape($bodyMarker))
            if ($bodyMatches.Count -gt 1) {
                $firstCopyEnd = $bodyMatches[1].Index
                $deduped = $cleanedContent.Substring(0, $firstCopyEnd).TrimEnd()
                Write-Utf8NoBom -Path $targetPath -Content $deduped
                Append-Log $logBox "  Deduplicated $targetRelPath (body marker)"
                return
            }
        }
        if (-not [string]::IsNullOrEmpty($headerCheck) -and $cleanedContent -notmatch $escapedHeader) {
            $newContent = $starterContent.TrimEnd() + "`r`n`r`n" + $cleanedContent.TrimStart()
            if ($cleanedContent.Trim() -eq "") {
                Write-Utf8NoBom -Path $targetPath -Content $starterContent
                Append-Log $logBox "  Updated $targetRelPath (was pure redirect)"
            } else {
                Write-Utf8NoBom -Path $targetPath -Content $newContent
                Append-Log $logBox "  Updated $targetRelPath (starter prepended)"
            }
        } else {
            if ($cleanedContent -ne $existingContent) {
                Write-Utf8NoBom -Path $targetPath -Content $cleanedContent
                Append-Log $logBox "  Cleaned $targetRelPath (removed source-reference lines)"
            } else {
                Append-Log $logBox "  OK $targetRelPath (up to date)"
            }
        }
    } else {
        Write-Utf8NoBom -Path $targetPath -Content $starterContent
        Append-Log $logBox "  Created $targetRelPath from starter template"
    }
}

function Install-ToolConfig([string]$projectPath, [string]$templateRelPath, [string]$targetRelPath, [string]$detectMarker, $logBox) {
    $templatePath = Join-Path $syncContentDir $templateRelPath
    $targetPath = Join-Path $projectPath $targetRelPath
    if (-not (Test-Path $templatePath)) { return }
    if ($detectMarker) {
        $markerPath = Join-Path $projectPath $detectMarker
        if (-not (Test-Path $markerPath)) { return }
    }
    $parentDir = Split-Path $targetPath -Parent
    if ($parentDir -ne "" -and -not (Test-Path $parentDir)) {
        $null = New-Item -ItemType Directory -Path $parentDir -Force
    }
    $content = Get-Content $templatePath -Raw -Encoding UTF8
    $escapedRepo = [regex]::Escape($syncContentDir)
    $content = $content -replace $escapedRepo, "_guidelines"
    $content = $content -replace '\{\{GUIDELINES_ROOT\}\}', $syncContentDir
    if (Test-Path $targetPath) {
        $existing = Get-Content $targetPath -Raw -Encoding UTF8
        if ($existing -match '\{\{GUIDELINES_ROOT\}\}' -or $existing -match 'D:\\WebApps\\global-guidelines') {
            Write-Utf8NoBom -Path $targetPath -Content $content
            Append-Log $logBox "  Updated $targetRelPath (replaced absolute paths)"
        } else {
            Append-Log $logBox "  OK $targetRelPath (already relative)"
        }
    } else {
        Write-Utf8NoBom -Path $targetPath -Content $content
        Append-Log $logBox "  Created $targetRelPath"
    }
}

function Get-ProjectGitignoreEntries {
    # Every project-local path the sync writes that must not be tracked, derived from the manifest so
    # the GUI and the CLI cannot drift — the manifest's own header requires identical project outputs.
    # This file used to keep its own literals, which is how `.guidelines-backups/` came to be in no
    # list at all: a `-Backup` run left an untracked directory, and the `clean-tree` step of the
    # pre-push gate fails on an untracked directory.
    if ($moduleImported -and (Get-Command Get-GitignoreEntries -ErrorAction SilentlyContinue)) {
        return Get-GitignoreEntries
    }
    $manifestPath = Join-Path (Join-Path $syncContentDir "global-configs") "sync-manifest.json"
    if (-not (Test-Path $manifestPath)) { return @() }
    $manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    return @($manifest.PSObject.Properties.Value |
        Where-Object { $_ -and $_.PSObject.Properties.Name -contains 'gitignoreEntry' } |
        ForEach-Object { $_.gitignoreEntry } | Select-Object -Unique)
}

function Add-ProjectGitignoreEntries([string]$projectPath, $logBox) {
    # Each entry is tested on its own: a project that already carries `_guidelines/` must still
    # receive an entry added later. Testing the file once for the whole list is the second half of
    # the same defect — the list could only ever grow for brand-new projects.
    $entries = @(Get-ProjectGitignoreEntries)
    if ($entries.Count -eq 0) { return }
    $gitignore = Join-Path $projectPath ".gitignore"
    $existing = if (Test-Path $gitignore) { Get-Content $gitignore -Raw -Encoding UTF8 } else { "" }
    $missing = @($entries | Where-Object { $existing -notmatch "(?m)^$([regex]::Escape($_))" })
    if ($missing.Count -eq 0) { return }
    Add-Content -Path $gitignore -Value ("`n# mirrored from central guidelines repo`n" + ($missing -join "`n")) -Encoding UTF8
    Append-Log $logBox "  Added to .gitignore: $($missing -join ', ')"
}

function Sync-SkillsInline([string]$projectPath, $logBox) {
    # The GUI's fallback when `GuidelineSync.psm1` is not importable. It must produce the SAME
    # `_skills/` as the module (the manifest header states both entry points must agree), so it
    # delegates the decision to the same `plan-skills.js` rather than copying everything — the
    # copy-everything loop that used to live here is the defect the selector removes.
    $skillsDir = Join-Path $syncContentDir "global-configs\skills"
    if (-not (Test-Path $skillsDir)) { return }

    $planner = Join-Path $syncContentDir "global-configs\scripts\plan-skills.js"
    if (-not (Test-Path $planner)) {
        Append-Log $logBox "  ERROR: plan-skills.js not found at $planner -- skills NOT synced."
        return
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Append-Log $logBox "  ERROR: node.js not found -- skill selection needs plan-skills.js; skills NOT synced."
        return
    }

    Add-ProjectGitignoreEntries $projectPath $logBox

    # No `--dry-run` here on purpose: the GUI has no dry-run mode, and a switch no caller can pass is
    # dead configuration. The CLI path (`sync-guidelines.ps1` -> `Sync-Skills`) is where dry runs live.
    $output = & node $planner $projectPath --quiet --apply 2>&1
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) { Append-Log $logBox "  $line" }
    if ($exitCode -ne 0) {
        Append-Log $logBox "  ERROR: skill selection failed (plan-skills.js exit $exitCode) -- _skills/ left unchanged."
        return
    }

    # The `## Skills` block is written by ONE script — the same one the module's `Sync-Skills` calls,
    # so the two entry points cannot disagree (see the manifest header). `inject-skills-block.js`
    # renders the inventory from THIS project's `_skills/`, wraps it in markers, and REFRESHES its own
    # marked region on a later sync; a hand-written `## Skills` section is left alone.
    $injector = Join-Path $syncContentDir "global-configs\scripts\inject-skills-block.js"
    if (-not (Test-Path $injector)) {
        Append-Log $logBox "  WARNING: inject-skills-block.js not found -- ## Skills section NOT written."
        return
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Append-Log $logBox "  WARNING: node.js not found -- ## Skills section NOT written."
        return
    }
    $output = & node $injector $projectPath 2>&1
    foreach ($line in $output) { Append-Log $logBox "  $line" }
    if ($LASTEXITCODE -ne 0) {
        Append-Log $logBox "  WARNING: ## Skills section not written (inject-skills-block.js exit $LASTEXITCODE)"
    }
}

# --- Sync-Project ---
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

    # Mirror through the SHARED function, not through a second copy of the step.
    #
    # This used to run its own robocopy with the same /MIR flags but WITHOUT the stale-`.github` prune
    # `Sync-MirrorDirectory` performs. `/XD` stops robocopy DELETING an excluded directory, so a
    # GUI-only sync could leave a `_guidelines/.github/` the source no longer carries — and every
    # subsequent `npm run sync:drift` would report that project as drifted, with no cause visible from
    # either side. That is precisely the failure the prune was written for (see the module's comment),
    # and it survived here because each entry point owned a private copy of the same step.
    #
    # The manifest header states both writers "must produce identical project outputs". One
    # implementation is the only way that stays true: two copies drift exactly where it matters, on
    # the flag or the fix that only one of them received.
    if ($moduleImported -and (Get-Command Sync-MirrorDirectory -ErrorAction SilentlyContinue)) {
        $mirror = Sync-MirrorDirectory -sourceDir $syncContentDir -targetDir $guidelinesDir
        if ($mirror.Success -eq $false) {
            Append-Log $logBox "  ERROR: robocopy failed (exit code $($mirror.ExitCode)). Mirror is INCOMPLETE."
            return "error"
        }
        Append-Log $logBox "  _guidelines/ mirrored (robocopy: $($mirror.ExitCode))."
    } else {
        # Fallback for a machine where the module could not be imported. Same 0-7 success / 8+ failure
        # contract, but it cannot prune — the module path is the one that converges a mirror.
        $proc = Start-Process -FilePath "robocopy" `
            -ArgumentList @($syncContentDir, $guidelinesDir, "/MIR", "/NJH", "/NJS", "/NDL", "/NP",
                            "/R:0", "/W:0", "/XD", ".git", ".github") `
            -Wait -NoNewWindow -PassThru
        if ($proc.ExitCode -gt 7) {
            Append-Log $logBox "  ERROR: robocopy failed (exit code $($proc.ExitCode)). Check permissions."
            return "error"
        }
        Append-Log $logBox "  _guidelines/ mirrored (robocopy: $($proc.ExitCode))."
    }

    # Step 2: .gitignore — derived from the manifest, never a literal here (see Add-ProjectGitignoreEntries)
    Add-ProjectGitignoreEntries $projectPath $logBox

    # Step 3: Starter files (from manifest)
    $statusLabel.Text = "Installing starter files ..."
    Append-Log $logBox "Step 2: Starter files ..."
    foreach ($starter in $STARTERS) {
        $templatePath = Join-Path $syncContentDir $starter.template
        $targetPath   = Join-Path $projectPath    $starter.target
        if ($moduleImported -and (Get-Command Install-StarterFile -ErrorAction SilentlyContinue)) {
            Install-StarterFile -templatePath $templatePath -targetPath $targetPath `
                -mode $starter.mode -projectPath $projectPath -guidelinesRoot $syncContentDir
        } else {
            Update-StarterFile $projectPath $starter.template $starter.target $starter.header $logBox $starter.body
        }
    }

    # Step 4: Tool configs
    $statusLabel.Text = "Installing tool configs ..."
    Append-Log $logBox "Step 3: Tool configs ..."
    foreach ($cfg in $TOOL_CONFIGS) {
        if ($moduleImported -and (Get-Command Install-ToolConfigFile -ErrorAction SilentlyContinue)) {
            Install-ToolConfigFile -guidelinesRepo $syncContentDir -projectPath $projectPath `
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
    # FAIL CLOSED, matching the CLI. The previous fallback caught an unreadable file into `@{}` and
    # then rewrote it with only the AI keys — deleting every unrelated setting in the user's file.
    $vscodeData = $null
    try {
        if ($moduleImported -and (Get-Command Read-JsonObject -ErrorAction SilentlyContinue)) {
            $vscodeData = Read-JsonObject -Path $vscodeSettings
        } elseif (Test-Path $vscodeSettings) {
            $raw = Get-Content $vscodeSettings -Raw -Encoding UTF8
            if ($raw.Trim().Length -gt 0) {
                $tempObj = $raw | ConvertFrom-Json -ErrorAction Stop
                if ($tempObj -isnot [System.Management.Automation.PSCustomObject]) {
                    throw "top-level JSON value is not an object"
                }
                $vscodeData = @{}
                foreach ($property in $tempObj.PSObject.Properties) {
                    $vscodeData[$property.Name] = $property.Value
                }
            } else {
                $vscodeData = @{}
            }
        } else {
            $vscodeData = @{}
        }
    } catch {
        Append-Log $logBox "  WARNING: .vscode/settings.json is unreadable — left untouched: $($_.Exception.Message)"
    }
    # `$vscodeChanged` gates the write, for the reason the CLI twin documents at length: a run that
    # altered nothing must not produce a diff, and under the 5.1 host an unconditional write also
    # reformatted the file. `sync-manifest.json` requires both writers to produce identical outputs.
    if ($null -ne $vscodeData) {
    $vscodeChanged = $false
    if (-not $vscodeData.ContainsKey("chat.useAgentsMdFile"))       { $vscodeData["chat.useAgentsMdFile"] = $true; $vscodeChanged = $true }
    if (-not $vscodeData.ContainsKey("chat.useNestedAgentsMdFiles")) { $vscodeData["chat.useNestedAgentsMdFiles"] = $true; $vscodeChanged = $true }
    $copilotKeys = @("github.copilot.chat.codeGeneration.instructions",
                      "github.copilot.chat.testGeneration.instructions",
                      "github.copilot.chat.commitMessageGeneration.instructions",
                      "github.copilot.chat.reviewSelection.instructions")
    $copilotInstructions = @(@{ "file" = "AGENTS.md" })
    foreach ($key in $copilotKeys) {
        $val = $vscodeData[$key]
        $needsFix = $true
        if ($val -is [array] -and $val.Count -gt 0 -and $val[0].file -eq "AGENTS.md") {
            $needsFix = $false
        }
        if ($needsFix) { $vscodeData[$key] = $copilotInstructions; $vscodeChanged = $true }
    }
    if (-not $vscodeChanged) {
        Append-Log $logBox "  .vscode/settings.json already carries the AI settings"
    } else {
        try {
            $vscodeJson = ($vscodeData | ConvertTo-Json -Depth 5) + "`n"
            [System.IO.File]::WriteAllText($vscodeSettings, $vscodeJson, (New-Object System.Text.UTF8Encoding($false)))
            Append-Log $logBox "  .vscode/settings.json updated"
        } catch {
            Append-Log $logBox "  WARNING: Could not write .vscode/settings.json"
        }
    }
    }

    # Step 6: Skills
    $statusLabel.Text = "Syncing skills ..."
    Append-Log $logBox "Step 5: Skills ..."
    if ($moduleImported -and (Get-Command Sync-Skills -ErrorAction SilentlyContinue)) {
        Sync-Skills -guidelinesRepo $syncContentDir -projectPath $projectPath
    } else {
        Sync-SkillsInline $projectPath $logBox
    }

    # Step 7: Placeholder report
    Append-Log $logBox "Step 6: Placeholder check ..."
    $steeringFiles = @("AGENTS.md", "WORLD.md", "CLAUDE.md", "DEVTOOLS.md")  # CLAUDE.md/DEVTOOLS.md checked only if present (legacy projects)
    foreach ($sf in $steeringFiles) {
        $sfPath = Join-Path $projectPath $sf
        if (Test-Path $sfPath) {
            $sfContent = Get-Content $sfPath -Raw -Encoding UTF8
            $fillCount = ([regex]::Matches($sfContent, '\[FILL\]')).Count
            if ($fillCount -gt 0) {
                Append-Log $logBox "  $sf has $fillCount [FILL] placeholders -- please customize"
            }
        }
    }

    Append-Log $logBox "Done: $projectName"
    return "synced"
}

# --- Run-NodeScript helper ---
function Run-NodeScript([string]$scriptPath, $logBox, $statusLabel, $resultLabel) {
    if (-not $nodeAvailable) {
        Append-Log $logBox "ERROR: node.js not found. Install Node.js 18+ to run validation scripts."
        return $false
    }
    $scriptName = [System.IO.Path]::GetFileName($scriptPath)
    $statusLabel.Text = "Running $scriptName ..."
    Append-Log $logBox "--- Running: node $scriptName ---"
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "node"
        $psi.Arguments = "`"$scriptPath`""
        $psi.WorkingDirectory = $syncContentDir
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
            $resultLabel.Text = "Last run: $ts  Result: $icon $scriptName"
            $resultLabel.ForeColor = if ($passed) { [Drawing.Color]::Green } else { [Drawing.Color]::Red }
        }
        $statusLabel.Text = if ($passed) { "✅ Passed" } else { "❌ Failed" }
        return $passed
    } catch {
        Append-Log $logBox "ERROR: $($_.Exception.Message)"
        return $false
    }
}

# --- Run-NpmGate ---
#
# `npm run validate` is the ONE definition of the gate — `package.json` §scripts owns it and
# `AGENTS.md` §Commands documents it. The "Run All Checks" button used to run three scripts of its own
# choosing (rules audit, links, index coverage) and label the outcome "All checks". It was not: the
# real gate also runs check-drift, check-index-drift, check-skills-drift, docs:census, guard:tiers and
# the whole test suite. Six controls and the entire test suite were silently outside a button that
# said "all" — which is worse than a shorter button, because the operator stops looking for the rest.
# A second, weaker definition of "all checks" is also how the GUI and the pre-push hook drift apart
# again, so this now invokes the same command the hook runs.
function Run-NpmGate($logBox, $statusLabel, $resultLabel) {
    if (-not $npmAvailable) {
        Append-Log $logBox "ERROR: npm not found. Install Node.js 18+ to run the validation gate."
        return $false
    }
    $statusLabel.Text = "Running npm run validate ..."
    Append-Log $logBox "--- Running: npm run validate (the full gate) ---"
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        # `cmd.exe /c` rather than FileName = "npm": with `UseShellExecute = $false` there is no
        # PATHEXT resolution, so the name `npm` never finds `npm.cmd` and the gate would fail to start
        # on every Windows host. Resolving through cmd is the one form that works on both hosts.
        $psi.FileName = "cmd.exe"
        $psi.Arguments = "/c npm run validate"
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
        foreach ($line in ($stderr -split "`n")) {
            if ($line.Trim()) { Append-Log $logBox "  ERR: $($line.TrimEnd())" }
        }
        $passed = $proc.ExitCode -eq 0
        if ($resultLabel) {
            $ts = [DateTime]::Now.ToString("yyyy-MM-dd HH:mm")
            $icon = if ($passed) { "✅" } else { "❌" }
            $resultLabel.Text = "Last run: $ts  Result: $icon npm run validate"
            $resultLabel.ForeColor = if ($passed) { [Drawing.Color]::Green } else { [Drawing.Color]::Red }
        }
        $statusLabel.Text = if ($passed) { "✅ Gate passed" } else { "❌ Gate failed" }
        return $passed
    } catch {
        Append-Log $logBox "ERROR: $($_.Exception.Message)"
        return $false
    }
}

# ============================================================
# UI
# ============================================================
$form = New-Object System.Windows.Forms.Form
$form.Text = "Global Guidelines Sync Manager"
$form.Size = New-Object Drawing.Size(900, 700)
$form.MinimumSize = New-Object Drawing.Size(800, 600)
$form.StartPosition = "CenterScreen"
try {
    $psExe = (Get-Command powershell.exe -ErrorAction Stop).Source
    $form.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon($psExe)
} catch {
    # Icon is cosmetic — continue without it if resolution fails
}
$form.Font = New-Object Drawing.Font("Segoe UI", 9.5)
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::Sizable

# --- header ---
$header = New-Object System.Windows.Forms.Label
$header.Text = "Global Guidelines Sync Manager"
$header.Font = New-Object Drawing.Font("Segoe UI", 14, [Drawing.FontStyle]::Bold)
$header.Location = New-Object Drawing.Point(12, 10)
$header.Size = New-Object Drawing.Size(600, 28)
$form.Controls.Add($header)

$repoHealthLabel = New-Object System.Windows.Forms.Label
$repoHealthLabel.Text = "Repo: checking..."
$repoHealthLabel.Location = New-Object Drawing.Point(660, 14)
$repoHealthLabel.Size = New-Object Drawing.Size(220, 22)
$repoHealthLabel.Font = New-Object Drawing.Font("Segoe UI", 9)
$repoHealthLabel.TextAlign = [Drawing.ContentAlignment]::MiddleRight
$form.Controls.Add($repoHealthLabel)

# --- tab control ---
$tabControl = New-Object System.Windows.Forms.TabControl
$tabControl.Location = New-Object Drawing.Point(8, 48)
$tabControl.Size = New-Object Drawing.Size(876, 490)
$tabControl.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor
                     [System.Windows.Forms.AnchorStyles]::Bottom -bor
                     [System.Windows.Forms.AnchorStyles]::Left -bor
                     [System.Windows.Forms.AnchorStyles]::Right
$form.Controls.Add($tabControl)

$tabProjects = New-Object System.Windows.Forms.TabPage
$tabProjects.Text = "Projects"
$tabControl.Controls.Add($tabProjects)

$tabRepoTools = New-Object System.Windows.Forms.TabPage
$tabRepoTools.Text = "Repo Tools"
$tabControl.Controls.Add($tabRepoTools)

# ============================================================
# Tab 1: Projects
# ============================================================

# Add project panel
$addPanel = New-Object System.Windows.Forms.Panel
$addPanel.Location = New-Object Drawing.Point(8, 8)
$addPanel.Size = New-Object Drawing.Size(848, 36)
$addPanel.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle

$pathBox = New-Object System.Windows.Forms.TextBox
$pathBox.Location = New-Object Drawing.Point(8, 7)
$pathBox.Size = New-Object Drawing.Size(620, 22)
$pathBox.Font = New-Object Drawing.Font("Consolas", 9.5)
$addPanel.Controls.Add($pathBox)

$browseBtn = New-Object System.Windows.Forms.Button
$browseBtn.Text = "Browse"
$browseBtn.Location = New-Object Drawing.Point(636, 5)
$browseBtn.Size = New-Object Drawing.Size(80, 26)
$addPanel.Controls.Add($browseBtn)

$addBtn = New-Object System.Windows.Forms.Button
$addBtn.Text = "Add"
$addBtn.Location = New-Object Drawing.Point(724, 5)
$addBtn.Size = New-Object Drawing.Size(86, 26)
$addBtn.BackColor = [Drawing.Color]::DodgerBlue
$addBtn.ForeColor = [Drawing.Color]::White
$addBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$addPanel.Controls.Add($addBtn)

$tabProjects.Controls.Add($addPanel)

# Project list
$listLabel = New-Object System.Windows.Forms.Label
$listLabel.Text = "Projects:"
$listLabel.Location = New-Object Drawing.Point(12, 50)
$listLabel.Size = New-Object Drawing.Size(100, 20)
$tabProjects.Controls.Add($listLabel)

$listView = New-Object System.Windows.Forms.ListView
$listView.Location = New-Object Drawing.Point(8, 70)
$listView.Size = New-Object Drawing.Size(848, 260)
$listView.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor
                   [System.Windows.Forms.AnchorStyles]::Bottom -bor
                   [System.Windows.Forms.AnchorStyles]::Left -bor
                   [System.Windows.Forms.AnchorStyles]::Right
$listView.View = [System.Windows.Forms.View]::Details
$listView.FullRowSelect = $true
$listView.GridLines = $true
$listView.MultiSelect = $true

$listView.Columns.Add("Project",      160)
$listView.Columns.Add("Path",         280)
$listView.Columns.Add("Status",       80)
$listView.Columns.Add("Last Synced", 120)
$listView.Columns.Add("Placeholders", 90)

$tabProjects.Controls.Add($listView)

# Sync buttons panel
$syncPanel = New-Object System.Windows.Forms.Panel
$syncPanel.Location = New-Object Drawing.Point(8, 338)
$syncPanel.Size = New-Object Drawing.Size(848, 38)
$syncPanel.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor [System.Windows.Forms.AnchorStyles]::Left

$syncAllBtn = New-Object System.Windows.Forms.Button
$syncAllBtn.Text = "Sync All Projects"
$syncAllBtn.Location = New-Object Drawing.Point(0, 4)
$syncAllBtn.Size = New-Object Drawing.Size(160, 30)
$syncAllBtn.BackColor = [Drawing.Color]::ForestGreen
$syncAllBtn.ForeColor = [Drawing.Color]::White
$syncAllBtn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$syncPanel.Controls.Add($syncAllBtn)

$syncSelectedBtn = New-Object System.Windows.Forms.Button
$syncSelectedBtn.Text = "Sync Selected"
$syncSelectedBtn.Location = New-Object Drawing.Point(170, 4)
$syncSelectedBtn.Size = New-Object Drawing.Size(130, 30)
$syncPanel.Controls.Add($syncSelectedBtn)

$removeBtn = New-Object System.Windows.Forms.Button
$removeBtn.Text = "Remove Selected"
$removeBtn.Location = New-Object Drawing.Point(310, 4)
$removeBtn.Size = New-Object Drawing.Size(130, 30)
$syncPanel.Controls.Add($removeBtn)

$openCheck = New-Object System.Windows.Forms.CheckBox
$openCheck.Text = "Open in Explorer after sync"
$openCheck.Location = New-Object Drawing.Point(460, 7)
$openCheck.Size = New-Object Drawing.Size(200, 24)
$openCheck.Checked = $false
$syncPanel.Controls.Add($openCheck)

$tabProjects.Controls.Add($syncPanel)

# Progress bar and status (inside tab page, below sync panel)
$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object Drawing.Point(8, 382)
$progressBar.Size = New-Object Drawing.Size(848, 22)
$progressBar.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right
$progressBar.Visible = $false
$tabProjects.Controls.Add($progressBar)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Location = New-Object Drawing.Point(8, 407)
$statusLabel.Size = New-Object Drawing.Size(848, 18)
$statusLabel.ForeColor = [Drawing.Color]::Gray
$statusLabel.Text = "Ready"
$tabProjects.Controls.Add($statusLabel)

# ============================================================
# Tab 2: Repo Tools
# ============================================================

# Validation group
$validationGroup = New-Object System.Windows.Forms.GroupBox
$validationGroup.Text = "Validation"
$validationGroup.Location = New-Object Drawing.Point(8, 8)
$validationGroup.Size = New-Object Drawing.Size(848, 90)
$tabRepoTools.Controls.Add($validationGroup)

$btnValidateAll = New-Object System.Windows.Forms.Button
$btnValidateAll.Text = "Run All Checks"
$btnValidateAll.Location = New-Object Drawing.Point(8, 24)
$btnValidateAll.Size = New-Object Drawing.Size(150, 28)
$btnValidateAll.BackColor = [Drawing.Color]::ForestGreen
$btnValidateAll.ForeColor = [Drawing.Color]::White
$btnValidateAll.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$validationGroup.Controls.Add($btnValidateAll)

$btnAuditRules = New-Object System.Windows.Forms.Button
$btnAuditRules.Text = "Audit Rules"
$btnAuditRules.Location = New-Object Drawing.Point(168, 24)
$btnAuditRules.Size = New-Object Drawing.Size(120, 28)
$validationGroup.Controls.Add($btnAuditRules)

$btnCheckLinks = New-Object System.Windows.Forms.Button
$btnCheckLinks.Text = "Check Links"
$btnCheckLinks.Location = New-Object Drawing.Point(298, 24)
$btnCheckLinks.Size = New-Object Drawing.Size(120, 28)
$validationGroup.Controls.Add($btnCheckLinks)

$btnCheckIndex = New-Object System.Windows.Forms.Button
$btnCheckIndex.Text = "Check Index"
$btnCheckIndex.Location = New-Object Drawing.Point(428, 24)
$btnCheckIndex.Size = New-Object Drawing.Size(120, 28)
$validationGroup.Controls.Add($btnCheckIndex)

$validationStatusLabel = New-Object System.Windows.Forms.Label
$validationStatusLabel.Text = "Last run: never"
$validationStatusLabel.Location = New-Object Drawing.Point(8, 60)
$validationStatusLabel.Size = New-Object Drawing.Size(820, 20)
$validationStatusLabel.ForeColor = [Drawing.Color]::Gray
$validationGroup.Controls.Add($validationStatusLabel)

# Machine Setup group
$machineGroup = New-Object System.Windows.Forms.GroupBox
$machineGroup.Text = "Machine Setup"
$machineGroup.Location = New-Object Drawing.Point(8, 108)
$machineGroup.Size = New-Object Drawing.Size(848, 70)
$tabRepoTools.Controls.Add($machineGroup)

$btnMachineSetup = New-Object System.Windows.Forms.Button
$btnMachineSetup.Text = "Run Machine Setup"
$btnMachineSetup.Location = New-Object Drawing.Point(8, 24)
$btnMachineSetup.Size = New-Object Drawing.Size(160, 28)
$btnMachineSetup.BackColor = [Drawing.Color]::DarkSlateBlue
$btnMachineSetup.ForeColor = [Drawing.Color]::White
$btnMachineSetup.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$machineGroup.Controls.Add($btnMachineSetup)

$btnOpenRepo = New-Object System.Windows.Forms.Button
$btnOpenRepo.Text = "Open Repo in Explorer"
$btnOpenRepo.Location = New-Object Drawing.Point(178, 24)
$btnOpenRepo.Size = New-Object Drawing.Size(180, 28)
$machineGroup.Controls.Add($btnOpenRepo)

$btnOpenReadme = New-Object System.Windows.Forms.Button
$btnOpenReadme.Text = "Open README"
$btnOpenReadme.Location = New-Object Drawing.Point(368, 24)
$btnOpenReadme.Size = New-Object Drawing.Size(130, 28)
$machineGroup.Controls.Add($btnOpenReadme)

# ============================================================
# Log area (outside tabs, anchored to bottom)
# ============================================================
$logPanel = New-Object System.Windows.Forms.Panel
$logPanel.Location = New-Object Drawing.Point(8, 546)
$logPanel.Size = New-Object Drawing.Size(876, 110)
$logPanel.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor
                   [System.Windows.Forms.AnchorStyles]::Left -bor
                   [System.Windows.Forms.AnchorStyles]::Right
$form.Controls.Add($logPanel)

$logBox = New-Object System.Windows.Forms.RichTextBox
$logBox.Location = New-Object Drawing.Point(0, 22)
$logBox.Size = New-Object Drawing.Size(876, 88)
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

# --- footer ---
$footerLabel = New-Object System.Windows.Forms.Label
$footerLabel.Location = New-Object Drawing.Point(8, 664)
$footerLabel.Size = New-Object Drawing.Size(876, 20)
$footerLabel.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor
                      [System.Windows.Forms.AnchorStyles]::Left -bor
                      [System.Windows.Forms.AnchorStyles]::Right
$footerLabel.ForeColor = [Drawing.Color]::Gray
$footerLabel.Font = New-Object Drawing.Font("Segoe UI", 8)
$nodeStatus = if ($nodeAvailable) { "Node: available" } else { "Node: not found (install Node.js 18+ for validation)" }
$footerLabel.Text = "Repo: $guidelinesRepo  |  $nodeStatus"
$form.Controls.Add($footerLabel)

# ============================================================
# Event handlers
# ============================================================

$browseBtn.Add_Click({
    $folderDialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $folderDialog.Description = "Select a project folder to sync guidelines into"
    $folderDialog.ShowNewFolderButton = $false
    if ($folderDialog.ShowDialog() -eq "OK") {
        $pathBox.Text = $folderDialog.SelectedPath
    }
})

$addBtn.Add_Click({
    $path = $pathBox.Text.Trim()
    if ($path -eq "") { return }
    if (-not (Test-Project $path)) {
        [System.Windows.Forms.MessageBox]::Show("Path does not exist or is not a folder.", "Invalid Path", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
        return
    }
    $existing = $listView.Items | Where-Object { $_.Tag -eq $path }
    if ($existing) {
        [System.Windows.Forms.MessageBox]::Show("This project is already in the list.", "Duplicate", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        return
    }
    $name = Resolve-ProjectName $path
    $item = New-Object System.Windows.Forms.ListViewItem($name)
    $item.SubItems.Add($path) | Out-Null
    $item.SubItems.Add("pending") | Out-Null
    $item.SubItems.Add("-") | Out-Null
    $item.SubItems.Add("-") | Out-Null
    $item.Tag = $path
    $listView.Items.Add($item) | Out-Null
    $pathBox.Text = ""
    Save-ProjectList -list ($listView.Items | ForEach-Object { @{ name = $_.Text; path = $_.Tag; status = $_.SubItems[2].Text; lastSynced = $_.SubItems[3].Text } })
})

$removeBtn.Add_Click({
    $selected = $listView.SelectedItems
    if ($selected.Count -eq 0) { return }
    foreach ($item in $selected) {
        $listView.Items.Remove($item)
    }
    Save-ProjectList -list ($listView.Items | ForEach-Object { @{ name = $_.Text; path = $_.Tag; status = $_.SubItems[2].Text; lastSynced = $_.SubItems[3].Text } })
})

function Sync-ListViewItems($items) {
    if ($items.Count -eq 0) { return }
    $progressBar.Visible = $true
    $progressBar.Maximum = $items.Count
    $progressBar.Value = 0
    $isSingleSync = ($items.Count -eq 1)
    $i = 0
    foreach ($item in $items) {
        $path = $item.Tag
        $statusLabel.Text = "Syncing $($item.Text) ..."
        $result = Sync-Project $path $logBox $progressBar $statusLabel
        $item.SubItems[2].Text = $result
        $item.SubItems[3].Text = [DateTime]::Now.ToString("yyyy-MM-dd HH:mm")
        # Placeholder count
        $agentsFile = Join-Path $path "AGENTS.md"
        $placeholderCount = 0
        if (Test-Path $agentsFile) {
            $agentsContent = Get-Content $agentsFile -Raw -Encoding UTF8
            $placeholderCount = ([regex]::Matches($agentsContent, '\[FILL\]')).Count
        }
        $item.SubItems[4].Text = if ($placeholderCount -gt 0) { "$placeholderCount [FILL]" } else { "Ready" }
        # Phase 4: Post-sync wizard prompt
        if ($result -eq "synced") {
            $worldFile = Join-Path $path "WORLD.md"
            $worldFill = 0
            if (Test-Path $worldFile) {
                $worldFill = ([regex]::Matches((Get-Content $worldFile -Raw -Encoding UTF8), '\[FILL\]')).Count
            }
            $totalFill = $placeholderCount + $worldFill
            if ($totalFill -gt 5) {
                $mbResult = [System.Windows.Forms.MessageBox]::Show(
                    "$($item.Text) was synced successfully.`n`nAGENTS.md: $placeholderCount placeholders remaining`nWORLD.md: $worldFill placeholders remaining`n`nWould you like to open these files to complete setup?",
                    "Project Synced",
                    [System.Windows.Forms.MessageBoxButtons]::YesNo,
                    [System.Windows.Forms.MessageBoxIcon]::Question
                )
                if ($mbResult -eq "Yes") {
                    if (Test-Path $agentsFile) { Start-Process $agentsFile }
                    if (Test-Path $worldFile)  { Start-Process $worldFile }
                }
            }
        }
        $i++
        $progressBar.Value = $i
        if ($openCheck.Checked -and $isSingleSync) {
            Start-Process "explorer.exe" $path
        }
    }
    $progressBar.Visible = $false
    $statusLabel.Text = "All projects synced."
    Append-Log $logBox "========================================"
    Append-Log $logBox "All projects synced."
    Save-ProjectList -list ($listView.Items | ForEach-Object { @{ name = $_.Text; path = $_.Tag; status = $_.SubItems[2].Text; lastSynced = $_.SubItems[3].Text } })
}

$syncSelectedBtn.Add_Click({
    $selected = $listView.SelectedItems
    if ($selected.Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show("Select projects from the list first.", "No Selection", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        return
    }
    Sync-ListViewItems $selected
})

$syncAllBtn.Add_Click({
    $items = $listView.Items
    if ($items.Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show("Add some projects first.", "No Projects", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        return
    }
    Sync-ListViewItems $items
})

$listView.Add_DoubleClick({
    if ($listView.SelectedItems.Count -gt 0) {
        Sync-ListViewItems $listView.SelectedItems
    }
})

# --- Repo Tools event handlers ---

$btnValidateAll.Add_Click({
    # The full gate, not a hand-picked three of its nine steps — see Run-NpmGate.
    Run-NpmGate $logBox $validationStatusLabel $validationStatusLabel | Out-Null
})

$btnAuditRules.Add_Click({
    $script = Join-Path $syncContentDir "global-configs\scripts\audit-rules.js"
    Run-NodeScript $script $logBox $validationStatusLabel $null | Out-Null
})

$btnCheckLinks.Add_Click({
    $script = Join-Path $syncContentDir "global-configs\scripts\check-links.js"
    Run-NodeScript $script $logBox $validationStatusLabel $null | Out-Null
})

$btnCheckIndex.Add_Click({
    $script = Join-Path $syncContentDir "global-configs\scripts\check-index-coverage.js"
    Run-NodeScript $script $logBox $validationStatusLabel $null | Out-Null
})

$btnMachineSetup.Add_Click({
    $setupScript = Join-Path $syncContentDir "global-configs\scripts\setup-global-references.ps1"
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
        $validationStatusLabel.Text = "Running machine setup..."
        $validationStatusLabel.ForeColor = [Drawing.Color]::Gray
        $proc = Start-Process -FilePath "powershell.exe" `
            -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$setupScript`"" `
            -Wait -NoNewWindow -PassThru
        Append-Log $logBox "  Machine setup complete (exit: $($proc.ExitCode))."
        $icon = if ($proc.ExitCode -eq 0) { "✅" } else { "⚠" }
        $validationStatusLabel.Text = "$icon Machine setup: $(if ($proc.ExitCode -eq 0) { 'complete' } else { 'finished with warnings' })"
        $validationStatusLabel.ForeColor = if ($proc.ExitCode -eq 0) { [Drawing.Color]::Green } else { [Drawing.Color]::DarkOrange }
    }
})

$btnOpenRepo.Add_Click({ Start-Process "explorer.exe" $guidelinesRepo })

$btnOpenReadme.Add_Click({
    $readmePath = Join-Path $guidelinesRepo "README.md"
    if (Test-Path $readmePath) { Start-Process $readmePath }
})

# --- context menu ---
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip
$syncItem = $contextMenu.Items.Add("Sync")
$removeCtx = $contextMenu.Items.Add("Remove")
$exploreItem = $contextMenu.Items.Add("Open in Explorer")
$codeItem = $contextMenu.Items.Add("Open in VS Code")

$syncItem.Add_Click({
    if ($listView.SelectedItems.Count -gt 0) { Sync-ListViewItems $listView.SelectedItems }
})
$removeCtx.Add_Click({
    foreach ($item in $listView.SelectedItems) { $listView.Items.Remove($item) }
    Save-ProjectList -list ($listView.Items | ForEach-Object { @{ name = $_.Text; path = $_.Tag; status = $_.SubItems[2].Text; lastSynced = $_.SubItems[3].Text } })
})
$exploreItem.Add_Click({
    if ($listView.SelectedItems.Count -gt 0) { Start-Process "explorer.exe" $listView.SelectedItems[0].Tag }
})
$codeItem.Add_Click({
    $codePath = (Get-Command "code" -ErrorAction SilentlyContinue).Source
    if ($codePath -and $listView.SelectedItems.Count -gt 0) {
        Start-Process $codePath $listView.SelectedItems[0].Tag
    } else {
        Append-Log $logBox "  VS Code (code.exe) not found on PATH"
    }
})
$listView.ContextMenuStrip = $contextMenu

# --- load saved projects ---
$saved = Load-ProjectList
foreach ($p in $saved) {
    if (Test-Project $p.path) {
        $item = New-Object System.Windows.Forms.ListViewItem($p.name)
        $item.SubItems.Add($p.path) | Out-Null
        $item.SubItems.Add($p.status) | Out-Null
        $item.SubItems.Add($p.lastSynced) | Out-Null
        $item.SubItems.Add("-") | Out-Null
        $item.Tag = $p.path
        $listView.Items.Add($item) | Out-Null
    }
}

# --- form shown (repo health check) ---
$form.Add_Shown({
    $repoHealthLabel.Text = "Repo: ready"
    $repoHealthLabel.ForeColor = [Drawing.Color]::Gray
    $bw = New-Object System.ComponentModel.BackgroundWorker
    $bw.Add_DoWork({
        $ok = $true
        if (-not $nodeAvailable) { $ok = $false }
        $_.Result = $ok
    })
    $bw.Add_RunWorkerCompleted({
        if ($_.Result) {
            $repoHealthLabel.Text = "Repo: ready"
            $repoHealthLabel.ForeColor = [Drawing.Color]::Green
        } else {
            $repoHealthLabel.Text = "Repo: needs attention"
            $repoHealthLabel.ForeColor = [Drawing.Color]::DarkOrange
        }
    })
    $bw.RunWorkerAsync()
})

$form.ShowDialog() | Out-Null
