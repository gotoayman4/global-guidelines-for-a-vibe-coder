# GuidelineSync.psm1 — Shared sync module for CLI (sync-guidelines.ps1) and GUI (sync-manager.ps1)
# Both must produce identical project outputs.
# Import: Import-Module "$PSScriptRoot\GuidelineSync.psm1" -Force

# --- UTF-8 without BOM ---
# `Set-Content -Encoding UTF8` means "UTF-8 WITH a BOM" on Windows PowerShell 5.1 — the host
# `sync-all.js` spawns — and "without" on 7.x, so the same sync wrote different bytes per host.
# A BOM in a project file is a diff nobody asked for, and before a `---` it makes a front-matter
# parser read "no front-matter at all". Every file this module writes goes through Write-Utf8NoBom
# so the output is byte-identical on both hosts — the same reason the `.vscode/settings.json` merge
# below uses WriteAllText. Guarded by tests/sync-gitignore.test.js.
$script:Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
function Write-Utf8NoBom {
    param([string]$Path, [string]$Content)
    [System.IO.File]::WriteAllText($Path, $Content, $script:Utf8NoBom)
}

function Get-GuidelinesRepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-ManifestPath {
    $repo = Get-GuidelinesRepoRoot
    return Join-Path (Join-Path $repo "global-configs") "sync-manifest.json"
}

function Read-Manifest {
    # Plain ConvertFrom-Json, not -AsHashtable: that switch does not exist on Windows PowerShell 5.1,
    # the host sync-all.js spawns. The old try/catch made it work by falling through, but every
    # 5.1 host paid an exception per sync and a future reader could mistake the fallback for
    # optional. Every consumer below handles both a PSCustomObject and a dictionary.
    $manifestPath = Get-ManifestPath
    if (Test-Path $manifestPath) {
        try {
            return (Get-Content $manifestPath -Raw -Encoding UTF8) | ConvertFrom-Json -ErrorAction Stop
        } catch {
            Write-Host "  WARNING: sync-manifest.json is not valid JSON — manifest-driven steps skipped." -ForegroundColor Yellow
            return $null
        }
    }
    return $null
}

function Read-JsonObject {
    <#
    .SYNOPSIS
        Read a JSON object into a hashtable, or throw — never silently reset it to an empty one.

    .DESCRIPTION
        The `.vscode/settings.json` merge used to parse with `ConvertFrom-Json -AsHashtable` (absent on
        Windows PowerShell 5.1) and catch the failure into `@{}`. The merge then rewrote the file with
        only the keys it knows, deleting every unrelated setting. A parse failure must leave the file
        untouched: an unreadable settings file is a reason to stop, not a licence to start from zero.

        Absent and empty files legitimately mean "no settings yet", so those return an empty map.
        Anything else — invalid JSON, or a valid JSON array/scalar — throws.
    #>
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) { return @{} }
    $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
    if ($null -eq $raw -or $raw.Trim().Length -eq 0) { return @{} }

    $parsed = $raw | ConvertFrom-Json -ErrorAction Stop
    if ($parsed -isnot [System.Management.Automation.PSCustomObject]) {
        throw "top-level JSON value is not an object"
    }

    $map = @{}
    foreach ($property in $parsed.PSObject.Properties) {
        $map[$property.Name] = $property.Value
    }
    return $map
}

function Get-GitignoreEntries {
    # Every project-local path the sync writes that must not be tracked, read from the manifest.
    #
    # WHY DERIVED. The manifest declares `gitignoreEntry` per section and its own header says both
    # sync entry points "must produce identical project outputs" — but nothing read the field. Each
    # writer kept its own literal instead, and the path that lived in NO list (`.guidelines-backups/`)
    # is the one that shipped broken: a `-Backup` run left an untracked directory, and the
    # `clean-tree` step of the pre-push gate fails on an untracked directory. Deriving the set here
    # means a section added to the manifest is honoured by every writer without either being edited.
    #
    # Handles both shapes `Read-Manifest` can return: a hashtable (PowerShell 6+ `-AsHashtable`) and
    # a PSCustomObject (the Windows PowerShell 5.1 fallback).
    $manifest = Read-Manifest
    if (-not $manifest) { return @() }

    $sections = if ($manifest -is [System.Collections.IDictionary]) {
        @($manifest.Values)
    } else {
        @($manifest.PSObject.Properties.Value)
    }

    $entries = foreach ($section in $sections) {
        if ($null -eq $section) { continue }
        if ($section -is [System.Collections.IDictionary]) {
            if ($section.Contains('gitignoreEntry')) { $section['gitignoreEntry'] }
        } elseif ($section.PSObject.Properties.Name -contains 'gitignoreEntry') {
            $section.gitignoreEntry
        }
    }

    return @($entries | Where-Object { $_ } | Select-Object -Unique)
}

function Get-BackupDir([string]$projectPath) {
    return Join-Path $projectPath ".guidelines-backups"
}

function New-DatedBackupDir([string]$projectPath) {
    $backupRoot = Get-BackupDir $projectPath
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupDir = Join-Path $backupRoot $timestamp
    if (-not (Test-Path $backupRoot)) {
        $null = New-Item -ItemType Directory -Path $backupRoot -Force
    }
    $null = New-Item -ItemType Directory -Path $backupDir -Force
    return $backupDir
}

function Restore-Backup([string]$projectPath, [string]$timestamp) {
    $backupRoot = Get-BackupDir $projectPath
    $backupDir = Join-Path $backupRoot $timestamp
    if (-not (Test-Path $backupDir)) {
        Write-Host "ERROR: Backup not found: $backupDir" -ForegroundColor Red
        return $false
    }
    $manifestFile = Join-Path $backupDir "backup-manifest.json"
    if (Test-Path $manifestFile) {
        $manifest = Get-Content $manifestFile -Raw -Encoding UTF8 | ConvertFrom-Json
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

function Remove-ShellComments {
    <#
    .SYNOPSIS
        A hook's code with its comments removed, so the preflight reads only what the hook RUNS.

    .DESCRIPTION
        A hook's header names scripts in prose, and a retired script named in a comment is not a
        command that can fail. A `#` inside a quoted string is not a comment. Mirrors
        lib/shell-code.js, which the Node-side readers share.
    #>
    param([string]$Text)

    $kept = New-Object System.Collections.Generic.List[string]
    foreach ($line in ($Text -split "`r?`n")) {
        if ($line.TrimStart().StartsWith('#')) { $kept.Add(''); continue }
        $quote = $null
        $cut = $line.Length
        for ($i = 0; $i -lt $line.Length; $i++) {
            $ch = $line[$i]
            if ($quote) { if ($ch -eq $quote) { $quote = $null }; continue }
            if ($ch -eq '"' -or $ch -eq "'") { $quote = $ch; continue }
            if ($ch -eq '#' -and ($i -eq 0 -or [char]::IsWhiteSpace($line[$i - 1]))) { $cut = $i; break }
        }
        $kept.Add($line.Substring(0, $cut))
    }
    return ($kept -join "`n")
}

function Sync-MirrorDirectory {
    <#
    .SYNOPSIS
        Mirror the guidelines tree into a project's `_guidelines/`, reporting whether it worked.

    .DESCRIPTION
        Returns an object with `Success`, `ExitCode` and `DryRun`. Robocopy signals through its EXIT
        CODE, not through the console or the error stream: 0–7 mean success (files copied, skipped, or
        extras present), 8 and above mean a real failure (copy error, access denied, path too long).
        A partial copy writes nothing to stderr, so the exit code is the ONLY signal a failed mirror
        produces.

        This function used to discard the `-PassThru` object into `$null` and return nothing, so a
        failed mirror returned normally and `sync-guidelines.ps1` printed a green
        `Complete: N files mirrored` summary over a half-written `_guidelines/`. Measured 2026-10-13:
        the GUI had already been fixed for this — filed as B7 in
        `IMPLEMENTATION_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-13.md` — and this shared function had not.
        The un-fixed half is the one that matters most, because `sync-all.js` drives the CLI for all
        seven fleet projects and `check-sync-drift.js` is not part of a manual CLI run.

    .OUTPUTS
        [pscustomobject] Success (bool), ExitCode (int), DryRun (bool).
        Preflight failures return ExitCode 2 and an actionable Error before any writes.
    #>
    param(
        [string]$sourceDir,
        [string]$targetDir,
        [switch]$DryRun,
        [switch]$NoMirrorDelete
    )

    # Project-owned commands must not lose their targets during mirroring.
    $projectDir = Split-Path -Path $targetDir -Parent
    $commands = @()
    $caller = "package.json"
    try {
        $packagePath = Join-Path $projectDir $caller
        if (Test-Path -LiteralPath $packagePath) {
            $raw = Get-Content -LiteralPath $packagePath -Raw -Encoding UTF8 -ErrorAction Stop
            $package = $raw | ConvertFrom-Json -ErrorAction Stop
            if ($package -isnot [System.Management.Automation.PSCustomObject] -or -not $raw.TrimStart().StartsWith('{')) {
                throw "package.json must contain a JSON object"
            }
            foreach ($entry in $package.scripts.PSObject.Properties) {
                if ($entry.Value -is [string]) {
                    $commands += [pscustomobject]@{ Caller = "package.json scripts.$($entry.Name)"; Text = $entry.Value }
                }
            }
        }
        foreach ($hookDir in @('.husky', '.githooks')) {
            $caller = $hookDir
            $hookRoot = Join-Path $projectDir $hookDir
            if (-not (Test-Path -LiteralPath $hookRoot)) { continue }
            foreach ($hook in Get-ChildItem -LiteralPath $hookRoot -File -Recurse -Force -ErrorAction Stop) {
                $caller = $hook.FullName.Replace('\', '/')
                $commands += [pscustomobject]@{
                    Caller = $caller
                    Text = Remove-ShellComments (Get-Content -LiteralPath $hook.FullName -Raw -Encoding UTF8 -ErrorAction Stop)
                }
            }
        }
    } catch {
        return [pscustomobject]@{
            Success = $false; ExitCode = 2; DryRun = [bool]$DryRun
            Error = "Mirror preflight failed reading ${caller} (package.json JSON / hook text): $($_.Exception.Message). Fix the file before rerunning sync. No files were changed."
        }
    }

    # Bound literal JS paths to exclude lookalike extensions and directory traversal.
    $scriptPattern = '(?<![\w.-])_guidelines[\\/](?<relative>global-configs[\\/]scripts[\\/](?:(?!\.{1,2}[\\/])[\w.-]+[\\/])*[\w.-]+\.js)(?![\w./\\-])'
    $missing = @()
    foreach ($command in $commands) {
        foreach ($match in [regex]::Matches([string]$command.Text, $scriptPattern)) {
            $relative = $match.Groups['relative'].Value.Replace('\', '/')
            if (-not (Test-Path -LiteralPath (Join-Path $sourceDir $relative) -PathType Leaf)) {
                $missing += "$($command.Caller): _guidelines/$relative"
            }
        }
    }
    if ($missing.Count -gt 0) {
        return [pscustomobject]@{
            Success = $false; ExitCode = 2; DryRun = [bool]$DryRun
            Error = "Mirror preflight failed; source scripts are missing:`n  $($missing -join "`n  ")`nRemove or replace retired commands and their composite callers before rerunning sync. No files were changed."
        }
    }

    $robocopyArgs = @($sourceDir, $targetDir)
    if ($NoMirrorDelete) {
        $robocopyArgs += "/E"
    } else {
        $robocopyArgs += "/MIR"
    }
    $robocopyArgs += @("/NJH", "/NJS", "/NDL", "/NP", "/R:1", "/W:1",
                       "/XD", ".git", ".github")

    # /XD stops robocopy COPYING these directories — but it also stops it DELETING one
    # already present in the target, so /MIR can never converge a mirror that once
    # picked one up. Two projects carried a stale `_guidelines/.github/workflows/
    # validate-guidelines.yml` (left from when the central repo shipped a GitHub
    # Actions workflow, since replaced by .githooks/pre-push) and reported "sync exited
    # 0 but the mirror does not match the source" on every run, forever.
    # Prune only the excluded names the SOURCE does not have. `.git` is deliberately
    # never pruned — deleting a repository is never a sync's job.
    foreach ($name in @(".github")) {
        $stale = Join-Path $targetDir $name
        if ((Test-Path -LiteralPath $stale) -and -not (Test-Path -LiteralPath (Join-Path $sourceDir $name))) {
            if ($DryRun) {
                Write-Host "  [DRY-RUN] Would prune stale $name from mirror (absent in source)" -ForegroundColor Yellow
            } else {
                Remove-Item -LiteralPath $stale -Recurse -Force
                Write-Host "  Pruned stale $name from mirror (absent in source)" -ForegroundColor Yellow
            }
        }
    }

    if ($DryRun) {
        Write-Host "  [DRY-RUN] robocopy $sourceDir → $targetDir" -ForegroundColor Yellow
        Write-Host "  [DRY-RUN] Args: $($robocopyArgs -join ' ')" -ForegroundColor Yellow
        return [pscustomobject]@{ Success = $true; ExitCode = 0; DryRun = $true }
    }

    # Keep the process object: it is the only place the exit code lives. `-PassThru` into `$null` is
    # what made a failed mirror indistinguishable from a clean one.
    $proc = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -Wait -NoNewWindow -PassThru
    $exitCode = $proc.ExitCode
    $success = $proc.ExitCode -le 7
    if (-not $success) {
        Write-Host "  ERROR: robocopy failed (exit code $exitCode) — the mirror is INCOMPLETE." -ForegroundColor Red
    }
    return [pscustomobject]@{ Success = $success; ExitCode = $exitCode; DryRun = $false }
}

function Install-StarterFile {
    param(
        [string]$templatePath,
        [string]$targetPath,
        [string]$mode,
        [switch]$DryRun,
        [string]$backupDir,
        [string]$projectPath,
        [string]$guidelinesRoot = ""
    )

    if (-not (Test-Path $templatePath)) { return }

    if ($DryRun) {
        Write-Host "  [DRY-RUN] Starter: $templatePath → $targetPath (mode: $mode)" -ForegroundColor Yellow
        return
    }

    $parentDir = Split-Path $targetPath -Parent
    if ($parentDir -ne "" -and -not (Test-Path $parentDir)) {
        $null = New-Item -ItemType Directory -Path $parentDir -Force
    }

    $starterContent = Get-Content $templatePath -Raw -Encoding UTF8
    if ($guidelinesRoot) {
        $starterContent = $starterContent -replace '\{\{GUIDELINES_ROOT\}\}', $guidelinesRoot
    }

    if (Test-Path $targetPath) {
        if ($mode -eq "create-if-missing") {
            Write-Host "  SKIP $((Split-Path $targetPath -Leaf)) (already exists)" -ForegroundColor Gray
            return
        }

        # Backup existing file if backup mode active. After the skip above: a file this run will not
        # touch has no reason to produce a backup directory.
        if ($backupDir -and $projectPath) {
            $relativePath = $targetPath.Replace($projectPath, '').TrimStart('\').TrimStart('/')
            $safeName = $relativePath -replace '[\\\/]', '__'
            $backupFile = Join-Path $backupDir $safeName
            Copy-Item $targetPath $backupFile -Force
            $manifestFile = Join-Path $backupDir "backup-manifest.json"
            $entry = @{ relativePath = $relativePath; backupName = $safeName }
            $existing = if (Test-Path $manifestFile) { Get-Content $manifestFile -Raw -Encoding UTF8 | ConvertFrom-Json } else { @() }
            $updated = @($existing) + $entry
            Write-Utf8NoBom -Path $manifestFile -Content ($updated | ConvertTo-Json -Depth 3)
        } elseif ($backupDir) {
            Copy-Item $targetPath (Join-Path $backupDir (Split-Path $targetPath -Leaf)) -Force
        }

        $existingContent = Get-Content $targetPath -Raw -Encoding UTF8
        $cleanedContent = $existingContent -replace '(?m)^.*→ Source:.*\n?', ''
        $firstLine = ($starterContent -split "`n")[0].Trim()
        if ($firstLine.StartsWith('#')) {
            $escapedHeader = '(?m)^' + [regex]::Escape($firstLine)
        } else {
            $escapedHeader = $null
        }
        if ($escapedHeader -and $cleanedContent -notmatch $escapedHeader) {
            $newContent = $starterContent.TrimEnd() + "`r`n`r`n" + $cleanedContent.TrimStart()
            Write-Utf8NoBom -Path $targetPath -Content $newContent
            Write-Host "  Updated $((Split-Path $targetPath -Leaf)) (starter prepended)" -ForegroundColor Green
        } elseif (-not $escapedHeader) {
            # No header marker — always overwrite (covers WORLD.example.md / always-overwrite mode)
            if ($mode -eq "always-overwrite") {
                Write-Utf8NoBom -Path $targetPath -Content $starterContent
                Write-Host "  Overwritten $((Split-Path $targetPath -Leaf)) (always-overwrite)" -ForegroundColor Green
            } else {
                Write-Host "  OK $((Split-Path $targetPath -Leaf)) (no header marker, skipping)" -ForegroundColor Gray
            }
        } else {
            Write-Host "  OK $((Split-Path $targetPath -Leaf)) (up to date)" -ForegroundColor Gray
        }
    } else {
        Write-Utf8NoBom -Path $targetPath -Content $starterContent
        Write-Host "  Created $((Split-Path $targetPath -Leaf)) from template" -ForegroundColor Green
    }
}

function Install-ToolConfigFile {
    param(
        [string]$guidelinesRepo,
        [string]$projectPath,
        [string]$templateRelPath,
        [string]$targetRelPath,
        [string]$detectMarker,
        [switch]$DryRun
    )

    $templatePath = Join-Path $guidelinesRepo $templateRelPath
    $targetPath = Join-Path $projectPath $targetRelPath

    if (-not (Test-Path $templatePath)) { return }

    if ($detectMarker) {
        $markerPath = Join-Path $projectPath $detectMarker
        if (-not (Test-Path $markerPath)) { return }
    }

    if ($DryRun) {
        Write-Host "  [DRY-RUN] Tool config: $templateRelPath → $targetRelPath" -ForegroundColor Yellow
        return
    }

    $parentDir = Split-Path $targetPath -Parent
    if ($parentDir -ne "" -and -not (Test-Path $parentDir)) {
        $null = New-Item -ItemType Directory -Path $parentDir -Force
    }

    $content = Get-Content $templatePath -Raw -Encoding UTF8
    $escapedRepo = [regex]::Escape($guidelinesRepo)
    $content = $content -replace $escapedRepo, "_guidelines"
    # {{GUIDELINES_ROOT}} expands to the central repo's guidelines/ dir — expand after the
    # _guidelines rewrite so fallback references are not clobbered into relative mirror paths.
    $content = $content -replace '\{\{GUIDELINES_ROOT\}\}', $guidelinesRepo

    if (Test-Path $targetPath) {
        $existing = Get-Content $targetPath -Raw -Encoding UTF8
        # Reinstall only when the target is stale: unresolved token or a legacy hardcoded central path.
        if ($existing -match '\{\{GUIDELINES_ROOT\}\}' -or $existing -match 'D:\\WebApps\\global-guidelines') {
            Write-Utf8NoBom -Path $targetPath -Content $content
            Write-Host "  Updated $targetRelPath (replaced absolute paths)" -ForegroundColor Green
        } else {
            Write-Host "  OK $targetRelPath (already relative)" -ForegroundColor Gray
        }
    } else {
        Write-Utf8NoBom -Path $targetPath -Content $content
        Write-Host "  Created $targetRelPath" -ForegroundColor Green
    }
}

function Invoke-NodeCapture {
    param([string[]]$Arguments)

    # The node helpers signal "a change is due" with exit 1 + stderr (`--check` in a preview). Under
    # $ErrorActionPreference = 'Stop', `2>&1` turns that stderr into a terminating error before the
    # exit code is read, aborting the whole sync on a message the caller already knows how to handle.
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & node @Arguments 2>&1
        return [pscustomobject]@{ Output = @($output); ExitCode = $LASTEXITCODE }
    } finally {
        $ErrorActionPreference = $previous
    }
}

function Update-ToolConfigEntryPoint {
    <#
    .SYNOPSIS
        Point a project's delivered AI-tool configs at its own AGENTS.md.

    .DESCRIPTION
        The tool configs are installed `create-if-missing` (see `Install-ToolConfigFile`), so a
        template edit never reaches a project that already has the file: `opencode.json` keeps
        pointing at `_guidelines/_index/MASTER_INDEX.md` forever. That is not a cosmetic difference —
        the `## Skills` inventory, the table that says WHEN to open each skill, is injected into the
        project's own `AGENTS.md`, so an agent that boots from a tool config never reaches it at all.
        Measured 2026-10-19: 6 of the 7 registered projects were affected.

        `patch-tool-configs.js` is the one writer for that repair. It reads the (template, target)
        pairs from the manifest, patches the DELIVERED file in place, and never rewrites
        project-authored text: a marked region is refreshed, an unmarked one gets the region
        inserted, and a JSON `instructions` array is made to begin with the template's entries.

        `--check` in a preview, exactly as `inject-skills-block.js` is called below: the patcher
        writes by default, and a dry run that writes is a dry run that lies.
    #>
    param(
        [string]$guidelinesRepo,
        [string]$projectPath,
        [switch]$DryRun
    )

    $patcher = Join-Path $guidelinesRepo "global-configs\scripts\patch-tool-configs.js"
    if (-not (Test-Path $patcher)) {
        Write-Host "  WARNING: patch-tool-configs.js not found -- tool configs NOT updated." -ForegroundColor Yellow
        return
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "  WARNING: node.js not found -- tool configs NOT updated." -ForegroundColor Yellow
        return
    }

    $patcherArgs = @($patcher, $projectPath)
    if ($DryRun) { $patcherArgs += '--check' }
    $patcherRun = Invoke-NodeCapture -Arguments $patcherArgs
    $patcherExit = $patcherRun.ExitCode
    foreach ($line in $patcherRun.Output) { Write-Host "  $line" }
    if ($DryRun) {
        if ($patcherExit -eq 1) {
            Write-Host "  [DRY-RUN] Would point the tool configs at AGENTS.md" -ForegroundColor Yellow
        } elseif ($patcherExit -ne 0) {
            Write-Host "  WARNING: tool-config preview failed (patch-tool-configs.js exit $patcherExit)" -ForegroundColor Yellow
        }
    } elseif ($patcherExit -ne 0) {
        Write-Host "  WARNING: tool configs NOT updated (patch-tool-configs.js exit $patcherExit)" -ForegroundColor Yellow
    }
}

function Sync-Skills {
    param(
        [string]$guidelinesRepo,
        [string]$projectPath,
        [switch]$DryRun
    )

    # The delivered tool configs must name `AGENTS.md` -- the project's own constitution, and the
    # place the `## Skills` inventory is injected -- not `_guidelines/_index/MASTER_INDEX.md`.
    #
    # WHY IT RUNS HERE. This function is the ONE module-level step both entry points run, once per
    # project: the GUI calls it as its skills step, the CLI as its `1c` step. It also runs AFTER the
    # GUI's tool-config install (step 4), so one call site keeps the two entry points producing
    # identical project output -- which the manifest header requires and two copies of this call
    # would break.
    #
    # It is called FIRST in the function on purpose. The skills steps below return early (no
    # `_skills/` source, no planner, no node), and a repair that depends on an unrelated step is a
    # repair that silently does not happen.
    Update-ToolConfigEntryPoint -guidelinesRepo $guidelinesRepo -projectPath $projectPath -DryRun:$DryRun

    # WHICH skills a project receives is decided by `plan-skills.js`, never here.
    #
    # INTENT: this function used to copy every `*.skill.md` unconditionally, which put
    # `rtl-shadcn-setup` into MUI projects and `mui-design-system` into Tailwind ones — documents that
    # contradict the project's own constitution, sitting in a directory the `## Skills` index tells the
    # agent to load from. The selector reads the project's declared `### Stack` table, its
    # `### Forbidden …` list and its `package.json`, and copies only what fits. Measured on the fleet
    # 2026-10-12: no project receives all 20 and none receives zero (12–16 each).
    #
    # WHY THE RULE IS NOT RE-IMPLEMENTED HERE. A second implementation would be a second home for the
    # same decision, and the two would drift exactly where it matters — on the project whose
    # `appliesTo` or Stack table was just edited. The node script owns the rule and is unit-tested;
    # this function owns the delivery, the gitignore entry and the `## Skills` section.
    #
    # WHY FAILURE IS LOUD AND NOT A FALLBACK TO COPY-ALL. Copying everything is the defect being
    # removed, so a silent fallback would restore it precisely when nobody is watching. On failure the
    # step reports the reason and the remedy, and any existing `_skills/` is left untouched.
    #
    # `--apply` makes the node script materialise the plan AND prune what no longer fits: `_skills/` is
    # a generated mirror, so the planned set is the whole set. Without the prune, a project that
    # changes stack keeps the skill it no longer matches, and the stale one is still loadable.

    $skillsDir = Join-Path $guidelinesRepo "global-configs\skills"
    if (-not (Test-Path $skillsDir)) { return }

    $planner = Join-Path $guidelinesRepo "global-configs\scripts\plan-skills.js"
    if (-not (Test-Path $planner)) {
        Write-Host "  ERROR: plan-skills.js not found at $planner -- skills NOT synced." -ForegroundColor Red
        return
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "  ERROR: node.js not found -- skill selection needs plan-skills.js; skills NOT synced." -ForegroundColor Red
        return
    }

    # The ignore entry is written BEFORE anything lands, so an interrupted run cannot leave a
    # generated directory untracked -- which is what fails the `clean-tree` step of the pre-push gate.
    # The entry comes from the manifest via `Get-GitignoreEntries`, never from a literal here.
    # `-DryRun` is propagated: this call used to write .gitignore during a preview, the one write in
    # the sync that ignored its own flag.
    Update-Gitignore -projectPath $projectPath -entry (Get-GitignoreEntries) -DryRun:$DryRun

    $plannerArgs = @($planner, $projectPath, '--quiet')
    if (-not $DryRun) { $plannerArgs += '--apply' }

    $plannerRun = Invoke-NodeCapture -Arguments $plannerArgs
    $exitCode = $plannerRun.ExitCode
    foreach ($line in $plannerRun.Output) { Write-Host "  $line" }
    if ($exitCode -ne 0) {
        Write-Host "  ERROR: skill selection failed (plan-skills.js exit $exitCode) -- _skills/ left unchanged." -ForegroundColor Red
        return
    }

    # The `## Skills` block is written by ONE script — the same one the GUI's `Sync-SkillsInline`
    # calls, so the two entry points cannot disagree. `inject-skills-block.js` renders the inventory
    # from THIS project's `_skills/` (so every row's link resolves), wraps it in markers, and
    # REFRESHES its own marked region on a later sync. It leaves a hand-written `## Skills` section
    # alone: a generated index that overwrote a project's own rule would be worse than a stale one.
    #
    # WHY NOT INLINE, AS BEFORE. The old code appended only when the project had no `## Skills`
    # (`-notmatch '(?m)^## Skills'`) and could never touch it again — so a layout change or a new
    # skill stranded the block forever, which is exactly what happened to five fleet projects on
    # 2026-10-13. It also duplicated the block's fallback text and ran the renderer against the
    # CENTRAL corpus, producing links to skills the project does not receive. All three move into the
    # one script, where a test can drive them.
    $injector = Join-Path $guidelinesRepo "global-configs\scripts\inject-skills-block.js"
    if (-not (Test-Path $injector)) {
        Write-Host "  WARNING: inject-skills-block.js not found -- ## Skills section NOT written." -ForegroundColor Yellow
        return
    }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "  WARNING: node.js not found -- ## Skills section NOT written." -ForegroundColor Yellow
        return
    }
    # `--check` in a preview: the injector's write mode is unconditional, so calling it during a
    # dry run edited AGENTS.md. Check mode answers the same question and exits 1 when a change is due.
    $injectorArgs = @($injector, $projectPath)
    if ($DryRun) { $injectorArgs += '--check' }
    $injectorRun = Invoke-NodeCapture -Arguments $injectorArgs
    $injectorExit = $injectorRun.ExitCode
    foreach ($line in $injectorRun.Output) { Write-Host "  $line" }
    if ($DryRun) {
        if ($injectorExit -eq 1) {
            Write-Host "  [DRY-RUN] Would refresh the generated ## Skills block in AGENTS.md" -ForegroundColor Yellow
        } elseif ($injectorExit -ne 0) {
            Write-Host "  WARNING: ## Skills preview failed (inject-skills-block.js exit $injectorExit)" -ForegroundColor Yellow
        }
    } elseif ($injectorExit -ne 0) {
        Write-Host "  WARNING: ## Skills section not written (inject-skills-block.js exit $injectorExit)" -ForegroundColor Yellow
    }
}

function Sync-SkillPool {
    param(
        [Parameter(Mandatory = $true)][string]$SourceSkillsDir,
        [Parameter(Mandatory = $true)][string]$PoolDir,
        [switch]$DryRun
    )

    # A skill is its WHOLE directory, not just SKILL.md. `references/`, `scripts/` and `assets/`
    # are loaded on demand by the skill body, so a pool that links only the entry file delivers a
    # skill whose own instructions point at files that are not there. This function is the one
    # writer for both machine-global pools (opencode and Qoder); the per-project mirror has its own
    # writer in `plan-skills.js`, which copies the same payload into `_skills/`.
    #
    # SYMLINK PER FILE, NOT PER DIRECTORY. A directory symlink would be simpler, but on Windows it
    # needs elevation (or Developer Mode) exactly like a file link and would make the whole skill
    # disappear on a host that refuses it. Per-file linking falls back to a copy per file, so a
    # partial privilege failure degrades to a copied payload instead of a missing skill.
    #
    # STALE COMPANIONS ARE PRUNED. When a skill removes `references/old.md`, a pool that only ever
    # adds files keeps offering the removed reference — a stale instruction is worse than a missing
    # one because the agent will follow it. The destination skill directory is a generated mirror:
    # its expected contents are the source's contents, and nothing else.
    $result = [pscustomobject]@{
        Skills  = 0
        Files   = 0
        Pruned  = 0
        Skipped = 0
        Errors  = @()
        DryRun  = [bool]$DryRun
    }

    if (-not (Test-Path -LiteralPath $SourceSkillsDir)) {
        throw "skills source not found: $SourceSkillsDir"
    }
    $skillDirs = @(Get-ChildItem -LiteralPath $SourceSkillsDir -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') })
    if (-not $DryRun -and -not (Test-Path -LiteralPath $PoolDir)) {
        $null = New-Item -ItemType Directory -Path $PoolDir -Force
    }

    foreach ($sourceDir in $skillDirs) {
        $skillName = $sourceDir.Name
        $destDir = Join-Path $PoolDir $skillName
        try {
            $files = @(Get-ChildItem -LiteralPath $sourceDir.FullName -File -Recurse -Force)
            $expected = @{}
            foreach ($file in $files) {
                $rel = $file.FullName.Substring($sourceDir.FullName.Length).TrimStart([char[]]@('\', '/'))
                $expected[$rel.ToLowerInvariant()] = $true
            }

            if ($DryRun) {
                $result.Skills++
                $result.Files += $files.Count
                continue
            }

            if (-not (Test-Path -LiteralPath $destDir)) {
                $null = New-Item -ItemType Directory -Path $destDir -Force
            }
            # A pool built by the pre-directory version of this script can still hold a flat
            # `<name>.skill.md` beside the directory. It is the same skill in a shape no conformant
            # loader reads; leaving it is a second, stale copy under a name the agent may search.
            $legacyFlat = Join-Path $PoolDir "$skillName.skill.md"
            if (Test-Path -LiteralPath $legacyFlat) {
                Remove-Item -LiteralPath $legacyFlat -Force
            }

            foreach ($file in $files) {
                $rel = $file.FullName.Substring($sourceDir.FullName.Length).TrimStart([char[]]@('\', '/'))
                $dest = Join-Path $destDir $rel
                $destParent = Split-Path $dest -Parent
                if (-not (Test-Path -LiteralPath $destParent)) {
                    $null = New-Item -ItemType Directory -Path $destParent -Force
                }
                if (Test-Path -LiteralPath $dest) {
                    Remove-Item -LiteralPath $dest -Force
                }
                try {
                    $null = New-Item -ItemType SymbolicLink -Path $dest -Target $file.FullName -Force -ErrorAction Stop
                } catch {
                    Copy-Item -LiteralPath $file.FullName -Destination $dest -Force
                }
                $result.Files++
            }

            foreach ($stale in @(Get-ChildItem -LiteralPath $destDir -File -Recurse -Force -ErrorAction SilentlyContinue)) {
                $rel = $stale.FullName.Substring($destDir.Length).TrimStart([char[]]@('\', '/'))
                if ($expected.ContainsKey($rel.ToLowerInvariant())) { continue }
                Remove-Item -LiteralPath $stale.FullName -Force
                $result.Pruned++
            }
            # Bottom-up, so a directory emptied by the prune is removed after its children.
            foreach ($dir in @(Get-ChildItem -LiteralPath $destDir -Directory -Recurse -Force -ErrorAction SilentlyContinue |
                    Sort-Object { ($_.FullName -split '[\\/]').Count } -Descending)) {
                if (-not (Get-ChildItem -LiteralPath $dir.FullName -Force -ErrorAction SilentlyContinue)) {
                    Remove-Item -LiteralPath $dir.FullName -Force
                }
            }

            $result.Skills++
        } catch {
            $result.Skipped++
            $result.Errors += "$skillName`: $($_.Exception.Message)"
        }
    }
    return $result
}

function Update-Gitignore {
    param(
        [string]$projectPath,
        [string[]]$entry,
        [switch]$DryRun
    )

    $gitignore = Join-Path $projectPath ".gitignore"
    $existing = ""
    if (Test-Path $gitignore) { $existing = Get-Content $gitignore -Raw -Encoding UTF8 }

    # Each entry is tested on its own, so a project that already carries `_guidelines/` still
    # receives an entry added later. Testing the file once for the whole list — or writing the list
    # under one "already present" check — is how `.guidelines-backups/` stayed untracked in every
    # project that had been synced before the entry existed. An untracked directory fails the
    # `clean-tree` step of the pre-push gate, so the omission blocked a documented gate rather than
    # merely leaving the tree untidy.
    $missing = @($entry | Where-Object { $_ -and $existing -notmatch "(?m)^$([regex]::Escape($_))" })

    if ($DryRun) {
        foreach ($item in $missing) {
            Write-Host "  [DRY-RUN] Would add '$item' to .gitignore" -ForegroundColor Yellow
        }
        return
    }

    if ($missing.Count -eq 0) {
        Write-Host "  .gitignore already carries: $($entry -join ', ')" -ForegroundColor Gray
        return
    }

    # One header, and only the missing entries beneath it — so a second sync is a no-op. Written
    # through Write-Utf8NoBom rather than Add-Content: `-Encoding UTF8` means "with a BOM" on 5.1,
    # and a .gitignore that begins with a BOM can keep its first pattern from matching.
    $eol = if ($existing -match "`r`n") { "`r`n" } else { "`n" }
    $block = "# mirrored from central guidelines repo$eol" + ($missing -join $eol) + $eol
    $next = if ($existing.Length -eq 0) { $block } else { $existing.TrimEnd() + $eol + $eol + $block }
    Write-Utf8NoBom -Path $gitignore -Content $next
    Write-Host "  Added to .gitignore: $($missing -join ', ')" -ForegroundColor Green
}

Export-ModuleMember -Function Get-GuidelinesRepoRoot, Get-ManifestPath, Read-Manifest,
    Read-JsonObject, Get-GitignoreEntries, Get-BackupDir, New-DatedBackupDir, Restore-Backup,
    Sync-MirrorDirectory, Install-StarterFile, Install-ToolConfigFile, Update-ToolConfigEntryPoint,
    Sync-Skills, Sync-SkillPool, Update-Gitignore, Write-Utf8NoBom
