---
name: firebase-emulator-windows-console
description: "Activate when Firebase Local Emulator Suite tests on Windows open a Java/JDK terminal or console popup, or when making emulator tests run without that popup while preserving test output and behavior. Triggers on \"Firebase emulator popup\", \"Java terminal during tests\", \"hide emulator console\", \"firebase emulators:exec window\"."
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, firebase, emulator, windows, testing, java
  appliesTo: firebase
---

# Skill: Hide Firebase Emulator Java Console on Windows

**Activation announcement:** When this skill activates, output in chat: `Skill: firebase-emulator-windows-console activated -- Source: _skills/firebase-emulator-windows-console/SKILL.md`

## Trigger

Activate when:
- Running Firebase Local Emulator Suite tests on Windows opens a separate terminal or console window/tab titled with a JDK path
- A user wants to suppress the Java emulator popup without disabling the emulators or losing test output
- Debugging the difference between the Firebase Emulator Suite web UI and a Java emulator process window

## Goal

Keep the project's existing Firebase emulator selection, test command, process lifecycle, logs, and exit status intact while preventing the emulator's Java child process from opening a Windows console.

## Diagnose Before Changing

1. Read the project's test script and `firebase.json`. Record the current emulator selection and the exact test command; do not replace, skip, or narrow the suite.
2. Distinguish the two windows:
   - `"emulators": { "ui": { "enabled": true } }` controls the Emulator Suite web dashboard, normally served over HTTP.
   - A tab titled with a Java/JDK path and showing Firestore emulator output is the Java child-process console. Disabling the web UI does not suppress this console.
3. Identify the CLI and runtime actually used by the test: Firebase CLI version and entry point, Node version, Java executable, and whether the emulator is started through `firebase emulators:exec`.
4. Inspect the installed Firebase CLI's current emulator spawn path before relying on internal behavior. CLI internals can change; do not edit `node_modules` or a global Firebase installation as the fix.

## Windows-Only Suppression

When the Firebase CLI starts Java with `child_process.spawn("java", ...)`, use a project-owned Node ESM preload for the Firebase CLI process. On Windows, route that CLI's Java spawn to the matching `javaw.exe` and set `windowsHide: true`. Leave its arguments and existing spawn options—including `stdio`—unchanged. `javaw` is the JDK's no-console launcher; `windowsHide` alone may not prevent Windows Terminal from opening a tab.

Keep the hook narrowly scoped:

- Install it only in the test command's environment using Node's `--import` preload mechanism; do not change global `NODE_OPTIONS`.
- Apply the spawn wrapper only when `process.platform === "win32"` and the running entry point is the Firebase CLI (`firebase.js`).
- Change only commands whose executable is `"java"`; leave all other child processes, arguments, stdio, and platforms untouched.
- Preserve any existing `NODE_OPTIONS` when adding the preload. Use `pathToFileURL()` for the preload path so spaces and Windows drive letters are parsed correctly.
- Verify that `javaw.exe` is available from the same configured JDK. If it is missing, do not silently fall back to hiding all process output or install/change Java; explain the blocker and ask before choosing another approach.
- Wrap the existing emulator command in a project-local Node launcher if the package-script shell cannot safely provide the preload environment. Inherit stdio, report launch errors, and propagate the Firebase CLI's exit code. Do not rewrite the suite command or make failures success-shaped.

## Route Every Emulator Invocation Through the Hook

The preload affects only Node processes that receive it. A package script that starts the Firebase CLI with the preload does not change a separate, manually typed `firebase emulators:exec` command. **Every emulator test invocation on Windows—including one-off probes and filename-filtered runs—MUST use the hooked project launcher, or explicitly add the project preload to that Firebase CLI invocation.** Otherwise Java still launches normally and may open the console popup.

Keep the caller's requested test scope intact: forward its existing Vitest filename filters or other supported test arguments through the launcher. Do not remove a filter, substitute a different test, or broaden a focused probe just to use the hook. If the project launcher cannot forward the requested arguments, extend that launcher safely and test the argument handling; do not fall back silently to raw `firebase emulators:exec`.

When direct CLI invocation is necessary, add the project-owned preload to that command's environment only, preserving existing `NODE_OPTIONS` and encoding the preload path with `pathToFileURL()`. Never set a global Node option just to cover manual emulator runs.

The project-local preload should implement the following decision and preserve the unmodified options object:

```js
export function javaSpawnConfiguration(command, options, platform = process.platform) {
  if (command !== "java" || platform !== "win32") return { command, options };
  return { command: "javaw", options: { ...options, windowsHide: true } };
}
```

Apply that configuration in the preloader's patched `childProcess.spawn()` call only for the Firebase CLI process. Treat the CLI's internal entry filename and `spawn` shape as version-sensitive: confirm both from the installed CLI before implementing, then test the hook itself.

## Verify the Exact Behavior

1. Add a focused behavioral test: Windows + Java maps to `javaw` and adds `windowsHide`; non-Java processes and non-Windows platforms retain their original command and options.
2. Run the project's original emulator-test command. Confirm the same emulators start, the tests run, output remains visible in the invoking terminal, and the process exits with the test suite's actual status.
3. Ask the user to observe whether the desktop popup appeared. Passing tests alone cannot prove a window was visually hidden.
4. If the test suite has a port preflight, run it after shutdown. If a Java process remains, inspect its PID and full command line first; stop it only after confirming it is the orphan emulator for this project's demo/test project. Never kill Java processes by image name or assume a green test process exit means its emulator JVM has exited.
5. Report the test result and whether popup suppression was directly observed separately. Do not claim visual confirmation unless the user or a desktop-capable check confirms it.

## Anti-Patterns

- Do not confuse `emulators.ui.enabled: false` with Java-console suppression.
- Do not only set `windowsHide: true` and assume it hides a Windows Terminal tab; it did not in the verified Windows Terminal case.
- Do not discard Java stdout/stderr, redirect emulator output away, detach the process, or alter the tested emulator set to hide the window.
- Do not patch the globally installed Firebase CLI or files under `node_modules`; those changes are not reproducible and can be overwritten.
- Do not kill an unidentified Java process to recover a port.

## Cross-References

- **Depends on:** [firebase-firestore-practices/SKILL.md](../firebase-firestore-practices/SKILL.md)
- **Depends on:** [testing-philosophy.md](../../../02-engineering-practices/testing-philosophy.md)
- **Follows:** `skill-design-patterns.md` — central repo `docs/repo-meta/`, **not mirrored**, so it is named rather than linked (a `../../../../` path escapes `_guidelines/` and breaks every project's link check)
