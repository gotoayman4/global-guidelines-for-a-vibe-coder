# GuidelineSync.psm1 — Shared sync module for CLI (sync-guidelines.ps1) and GUI (sync-manager.ps1)
# Both must produce identical project outputs.
# Import: Import-Module "$PSScriptRoot\GuidelineSync.psm1" -Force

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
            $updated | ConvertTo-Json -Depth 3 | Set-Content $manifestFile -Encoding UTF8
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
            Set-Content -Path $targetPath -Value $newContent -NoNewline -Encoding UTF8
            Write-Host "  Updated $((Split-Path $targetPath -Leaf)) (starter prepended)" -ForegroundColor Green
        } elseif (-not $escapedHeader) {
            # No header marker — always overwrite (covers WORLD.example.md / always-overwrite mode)
            if ($mode -eq "always-overwrite") {
                Set-Content -Path $targetPath -Value $starterContent -NoNewline -Encoding UTF8
                Write-Host "  Overwritten $((Split-Path $targetPath -Leaf)) (always-overwrite)" -ForegroundColor Green
            } else {
                Write-Host "  OK $((Split-Path $targetPath -Leaf)) (no header marker, skipping)" -ForegroundColor Gray
            }
        } else {
            Write-Host "  OK $((Split-Path $targetPath -Leaf)) (up to date)" -ForegroundColor Gray
        }
    } else {
        Set-Content -Path $targetPath -Value $starterContent -NoNewline -Encoding UTF8
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
            Set-Content -Path $targetPath -Value $content -NoNewline -Encoding UTF8
            Write-Host "  Updated $targetRelPath (replaced absolute paths)" -ForegroundColor Green
        } else {
            Write-Host "  OK $targetRelPath (already relative)" -ForegroundColor Gray
        }
    } else {
        Set-Content -Path $targetPath -Value $content -NoNewline -Encoding UTF8
        Write-Host "  Created $targetRelPath" -ForegroundColor Green
    }
}

function Sync-Skills {
    param(
        [string]$guidelinesRepo,
        [string]$projectPath,
        [switch]$DryRun
    )

    $skillsDir = Join-Path $guidelinesRepo "global-configs\skills"
    $targetSkillsDir = Join-Path $projectPath "_skills"

    if (-not (Test-Path $skillsDir)) { return }

    if ($DryRun) {
        $skillFiles = Get-ChildItem "$skillsDir\*.skill.md"
        foreach ($file in $skillFiles) {
            Write-Host "  [DRY-RUN] Skill: $($file.Name) → _skills/" -ForegroundColor Yellow
        }
        return
    }

    if (-not (Test-Path $targetSkillsDir)) {
        $null = New-Item -ItemType Directory -Path $targetSkillsDir -Force
    }

    $skillFiles = Get-ChildItem "$skillsDir\*.skill.md"
    $count = 0
    foreach ($file in $skillFiles) {
        $targetFile = Join-Path $targetSkillsDir $file.Name
        Copy-Item $file.FullName $targetFile -Force
        $count++
    }

    # The entry comes from the manifest via `Get-GitignoreEntries`, never from a literal here. This
    # block used to hardcode `_skills/` while the manifest declared the same entry, and that kind of
    # duplication is what let `.guidelines-backups/` fall through every list. `Update-Gitignore` is
    # idempotent, so a caller that already wrote the set pays nothing for this.
    Update-Gitignore -projectPath $projectPath -entry (Get-GitignoreEntries)

    Write-Host "  Skills: $count synced to _skills/" -ForegroundColor Green

    $agentsFile = Join-Path $projectPath "AGENTS.md"
    if (Test-Path $agentsFile) {
        $agentsContent = Get-Content $agentsFile -Raw -Encoding UTF8
        if ($agentsContent -notmatch '(?m)^## Skills') {
            $skillsSection = "`r`n`r`n---`r`n`r`n## Skills`r`n`r`nSkill files live at ``_skills/<name>.skill.md``. Load when the trigger matches the current task."
            Set-Content -Path $agentsFile -Value ($agentsContent.TrimEnd() + $skillsSection) -NoNewline -Encoding UTF8
            Write-Host "  Added ## Skills section to AGENTS.md" -ForegroundColor Green
        }
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
    Sync-Skills, Update-Gitignore
