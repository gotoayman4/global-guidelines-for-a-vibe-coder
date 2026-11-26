---
name: firebase-emulator-windows-console
description: "Activate when Firebase Local Emulator Suite tests on Windows open a Java/JDK terminal, a Node/Functions-runtime console, or any other emulator console popup, or when making emulator tests run without that popup while preserving test output and behavior. Triggers on \"Firebase emulator popup\", \"Java terminal during tests\", \"node.exe popup during emulator tests\", \"Functions runtime console\", \"hide emulator console\", \"firebase emulators:exec window\"."
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, firebase, emulator, windows, testing, java, node, console
  appliesTo: firebase
---

# Skill: Hide Firebase Emulator Consoles on Windows

## Trigger

Activate when Firebase Local Emulator Suite tests on Windows open a separate Java/JDK terminal tab or a blank `node.exe` Functions-runtime tab, or when hiding emulator popups without altering tested emulators or losing logs.

## Goal

Preserve the project's emulator selection, test command, logs, and exit code while suppressing both Java emulator and Node Functions-runtime Windows console popups.

## Diagnose Before Changing

1. Read the project's test script and `firebase.json` (never narrow or skip tests).
2. Distinguish the windows: `emulators.ui.enabled` is the web dashboard; a JDK-titled tab is a Java emulator (`firestore`/`storage`); a blank `node.exe` tab is `functionsEmulatorRuntime` spawned without `windowsHide`.
3. Inspect the installed `firebase-tools` entry point (`firebase.js`) and JDK `javaw.exe` availability; never edit `node_modules` or global Firebase installs.

## Windows-Only Suppression

Use a project-owned Node `--import` ESM preload (via `pathToFileURL()`, preserving existing `NODE_OPTIONS`, scoped only to `win32` + `firebase.js`). Patch `child_process.spawn` for both 2-arg and 3-arg signatures:
- Add `windowsHide: true` to **every** child spawn (hides the `node.exe` Functions runtime).
- Route exact `"java"` spawns to `"javaw"` (`windowsHide` alone can still open a Windows Terminal tab for the JVM).
- Route **every** Windows emulator test invocation (including focused/filtered probes via `package.json` or a Node launcher) through the hooked launcher; never set global `NODE_OPTIONS`.
- Reference code & measured evidence: [`references/preload-implementation.md`](references/preload-implementation.md).

## Verify the Exact Behavior

1. Unit test the preload mapper: Windows + `java` → `javaw` + `windowsHide`; Windows + `node` → `node` + `windowsHide`; non-Windows → unchanged; non-mutating options.
2. Run the original emulator test command; verify logs stream normally and exit code propagates.
3. Verify `javaw.exe` (zero emulator `java.exe`) and no new Windows Terminal/conhost popup (confirm visual suppression via user observation or desktop check rather than guessing from green tests).
4. After shutdown, inspect PID/command line before stopping any orphan emulator JVM; never kill Java processes blindly by image name.

## Anti-Patterns

- Do NOT toggle `emulators.ui.enabled: false` expecting console suppression
- Do NOT hide only `java` (leaves `node.exe` Functions runtime popup) or only set `windowsHide` without `javaw`
- Do NOT discard stdio, detach processes, alter tested emulators, edit `node_modules`, or kill unidentified Java processes

## Cross-References

- **Depends on:** [firebase-firestore-practices/SKILL.md](../firebase-firestore-practices/SKILL.md)
- **Depends on:** `testing-philosophy.md` — under `02-engineering-practices/` in the mirror (named, not linked, so `_skills/` stays valid)
- **Follows:** `skill-design-patterns.md` — central repo `docs/repo-meta/`, not mirrored
