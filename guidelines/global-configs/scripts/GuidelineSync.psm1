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
    $manifestPath = Get-ManifestPath
    if (Test-Path $manifestPath) {
        $json = Get-Content $manifestPath -Raw -Encoding UTF8
        try {
            return $json | ConvertFrom-Json -AsHashtable
        } catch {
            return $json | ConvertFrom-Json
        }
    }
    return $null
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

function Sync-MirrorDirectory {
    param(
        [string]$sourceDir,
        [string]$targetDir,
        [switch]$DryRun,
        [switch]$NoMirrorDelete
    )

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
        return
    }

    $null = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -Wait -NoNewWindow -PassThru
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
        # Backup existing file if backup mode active
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

        if ($mode -eq "create-if-missing") {
            Write-Host "  SKIP $((Split-Path $targetPath -Leaf)) (already exists)" -ForegroundColor Gray
            return
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

function Sync-Skills {
    param(
        [string]$guidelinesRepo,
        [string]$projectPath,
        [switch]$DryRun
    )

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
    Update-Gitignore -projectPath $projectPath -entry (Get-GitignoreEntries)

    $plannerArgs = @($planner, $projectPath, '--quiet')
    if (-not $DryRun) { $plannerArgs += '--apply' }

    $output = & node @plannerArgs 2>&1
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) { Write-Host "  $line" }
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
    $output = & node $injector $projectPath 2>&1
    foreach ($line in $output) { Write-Host "  $line" }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: ## Skills section not written (inject-skills-block.js exit $LASTEXITCODE)" -ForegroundColor Yellow
    }
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

    # One header, and only the missing entries beneath it — so a second sync is a no-op.
    $block = "`n# mirrored from central guidelines repo`n" + ($missing -join "`n")
    Add-Content -Path $gitignore -Value $block -Encoding UTF8
    Write-Host "  Added to .gitignore: $($missing -join ', ')" -ForegroundColor Green
}

Export-ModuleMember -Function Get-GuidelinesRepoRoot, Get-ManifestPath, Read-Manifest,
    Get-GitignoreEntries, Get-BackupDir, New-DatedBackupDir, Restore-Backup,
    Sync-MirrorDirectory, Install-StarterFile, Install-ToolConfigFile,
    Sync-Skills, Update-Gitignore, Write-Utf8NoBom
