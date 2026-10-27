---
name: inno-setup
description: Windows installer packaging with Inno Setup. Use when bundling a desktop, Electron or web-to-desktop app as a distributable .exe installer, including shortcuts, architecture detection and uninstall support. Triggers on "create installer", "Windows installer", "package as exe".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, inno-setup, installer, windows
  appliesTo: inno-setup
---

# Skill: Inno Setup — Bundle Windows Installer

---

**Activation announcement:** When this skill activates, output in chat: `Skill: inno-setup activated -- Source: _skills/inno-setup/SKILL.md`

## Trigger

Activate when:
- User says "create installer", "bundle setup file", "package as exe", "Windows installer", "Inno Setup"
- User wants to package a desktop app, Electron app, or web-to-desktop app as a Windows `.exe` installer
- User asks how to distribute their application as a downloadable installer

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `02-engineering-practices/security-engineering.md` — Code signing, secrets in installer
2. `02-engineering-practices/cost-optimization-strategy.md` — Free-tier tooling (Inno Setup is free)
3. `04-architecture/frontend-architecture.md` — Build output structure (if Electron/web app)

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a Windows installer packaging specialist using Inno Setup. You create clean, professional `.iss` scripts that produce reliable installers with proper uninstall support, shortcut creation, and architecture detection.

---

## Workflow

1. **Identify the application type:**
   - **Electron/web-to-desktop app:** Package the built output directory (dist/ or build/)
   - **Native Windows app:** Package the compiled `.exe` and any DLL dependencies
   - **Web app converted to desktop:** Package alongside a bundled runtime (e.g., Node.js embedded)
2. **Gather application details:** app name, version, publisher, source directory, output directory, icon file, architecture (32-bit, 64-bit, or both)
3. **Generate the `.iss` script** with the following sections:
   - **[Setup]:** App name, version, publisher, default install directory, output settings, compression, architecture flags, privilege requirements
   - **[Files]:** Map all source files to destination directories using Inno Setup constants (`{app}`, `{win}`, `{sys}`)
   - **[Icons]:** Desktop shortcut, Start Menu entries with proper names
   - **[Tasks]:** Optional install tasks (desktop shortcut checkbox, start menu checkbox)
   - **[Registry]:** File associations or protocol handlers (if needed)
   - **[Uninstall]:** Proper uninstall support (automatic with Inno Setup, but verify custom files are cleaned up)
   - **[Code]:** Architecture detection (32/64-bit), prerequisite checks (e.g., .NET runtime, VC++ redistributable)
4. **Code signing:** Recommend code signing certificate setup. If no certificate is available, warn the user about SmartScreen warnings.
5. **Test the installer:** Run on a clean Windows VM or machine. Verify: install, launch, uninstall, shortcut creation, file associations.

---

## Output Format

```markdown
## Inno Setup — [App Name] v[Version]

### Application Details
| Property | Value |
|----------|-------|
| App Name | [name] |
| Version | [x.y.z] |
| Publisher | [name] |
| Architecture | [x86/x64/both] |
| Source Directory | [path to built files] |
| Icon File | [path to .ico] |

### Generated .iss Script
[Complete Inno Setup script ready to compile]

### Build Commands
```bash
# Compile the installer
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

### Pre-Build Checklist
- [ ] Application builds successfully (npm run build / build command)
- [ ] All dependencies are included in the output directory
- [ ] Icon file exists (.ico format, multiple sizes)
- [ ] Version number is correct and matches package.json
- [ ] Code signing certificate available (or documented that SmartScreen warnings will appear)

### Post-Build Verification
- [ ] Installer runs without errors on clean Windows 10/11
- [ ] Application launches correctly after install
- [ ] Desktop and Start Menu shortcuts work
- [ ] Uninstaller removes all installed files
- [ ] No SmartScreen warnings (if code signed)
- [ ] Both 32-bit and 64-bit checks pass (if dual architecture)
```

---

## Anti-Patterns

- Do NOT bundle debug builds — always package production builds only
- Do NOT hardcode absolute paths — use Inno Setup constants (`{app}`, `{win}`, `{commonappdata}`)
- Do NOT skip code signing — unsigned installers trigger SmartScreen warnings that scare users
- Do NOT forget 32/64-bit architecture detection — use `{arch}` constant and separate entries when needed
- Do NOT include development files (node_modules, .git, .env) in the installer
- Do NOT skip the uninstall verification — broken uninstallers leave orphan files and registry entries
- Do NOT embed secrets or API keys in the installer script — use environment variables at runtime
- Do NOT assume the user has administrative privileges — handle UAC elevation gracefully

---

## Key Takeaways

1. Inno Setup is free, well-maintained, and produces professional Windows installers.
2. Always use Inno Setup constants (`{app}`, `{win}`) for paths — never hardcode `C:\Program Files`.
3. Code signing is mandatory for production. Unsigned installers trigger SmartScreen warnings.
4. Test on a clean Windows VM — your development machine has dependencies that clean machines don't.
5. Package only production builds. Debug builds are larger, slower, and may expose sensitive information.
6. The uninstaller MUST clean up everything: installed files, shortcuts, registry entries, and app data if the user chooses.

---

## Cross-References

- Security engineering: `02-engineering-practices/security-engineering.md`
- Cost optimization: `02-engineering-practices/cost-optimization-strategy.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md`
