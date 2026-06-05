# setup-global-references.ps1
# One-time setup: symlinks skills + creates global AGENTS.md for opencode
# Run from PowerShell 7+ as the local user

$ErrorActionPreference = "Stop"
$guidelinesRepo = "D:\WebApps\global-guidelines-for-a-vibe-coder"
$opencodeSkillsDir = "$env:USERPROFILE\.config\opencode\skills"
$globalAgentsFile = "$env:USERPROFILE\.config\opencode\AGENTS.md"

Write-Host "=== Global Guidelines Reference Setup ===" -ForegroundColor Cyan
Write-Host ""

# --------------------------------------------------
# Step 1: Symlink skills into opencode global config
# --------------------------------------------------
Write-Host "[1/2] Creating skill symlinks for opencode auto-discovery..." -ForegroundColor Yellow

# Create the target directory if it doesn't exist
if (-not (Test-Path -LiteralPath $opencodeSkillsDir)) {
    $null = New-Item -ItemType Directory -Path $opencodeSkillsDir -Force
    Write-Host "  Created: $opencodeSkillsDir"
}

$skillFiles = Get-ChildItem "$guidelinesRepo\global-configs\skills\*.skill.md"
$count = 0
foreach ($file in $skillFiles) {
    $skillName = $file.BaseName -replace '\.skill$', ''
    $skillDir = Join-Path $opencodeSkillsDir $skillName
    $symlinkPath = Join-Path $skillDir "SKILL.md"

    # Create skill directory if needed
    if (-not (Test-Path -LiteralPath $skillDir)) {
        $null = New-Item -ItemType Directory -Path $skillDir -Force
    }

    # Create symlink (remove existing first if any)
    if (Test-Path -LiteralPath $symlinkPath) {
        Remove-Item -LiteralPath $symlinkPath -Force
    }
    $null = New-Item -ItemType SymbolicLink -Path $symlinkPath -Target $file.FullName -Force
    $count++
}

Write-Host "  Linked $count skills to $opencodeSkillsDir" -ForegroundColor Green

# --------------------------------------------------
# Step 2: Create global AGENTS.md for opencode
# --------------------------------------------------
Write-Host "[2/2] Creating global AGENTS.md for opencode..." -ForegroundColor Yellow

# Use a simple string build to avoid PowerShell backtick escaping issues
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
    "- Compact extracts (Key Takeaways + Anti-Patterns) when context <20K tokens",
    "- Project AGENTS.md rules override these global defaults"
)
$globalAgentsContent = $agentsLines -join "`r`n"

Set-Content -Path $globalAgentsFile -Value $globalAgentsContent -NoNewline
Write-Host "  Created: $globalAgentsFile" -ForegroundColor Green

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Skills are now discoverable by opencode at ~/.config/opencode/skills/"
Write-Host "Global AGENTS.md will instruct opencode about the guidelines repo."
Write-Host ""
Write-Host "Next step: When creating a new project, ask your AI agent to:"
Write-Host "  'Set up this project with [stack] referencing guidelines at $guidelinesRepo'"
