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

**Activation announcement:** When this skill activates, output in chat: `Skill: firebase-emulator-windows-console activated -- Source: _skills/firebase-emulator-windows-console/SKILL.md`

## Trigger

Activate when:
- Running Firebase Local Emulator Suite tests on Windows opens a separate terminal or console window/tab titled with a JDK path **or with a Node path such as `C:\Program Files\nodejs\node.exe`**
- A user wants to suppress the emulator popups without disabling the emulators or losing test output
- Debugging the difference between the Firebase Emulator Suite web UI and an emulator child-process window

## Goal

Keep the project's existing Firebase emulator selection, test command, process lifecycle, logs, and exit status intact while preventing the emulator's Windows console children — the Java emulators **and** the Node Functions runtime — from opening a console.

## Diagnose Before Changing

1. Read the project's test script and `firebase.json`. Record the current emulator selection and the exact test command; do not replace, skip, or narrow the suite.
2. Distinguish the windows:
   - `"emulators": { "ui": { "enabled": true } }` controls the Emulator Suite web dashboard, normally served over HTTP.
   - A tab titled with a Java/JDK path and showing Firestore emulator output is a **Java child-process** console (Firestore/Storage). Disabling the web UI does not suppress this console.
   - A blank tab titled `C:\Program Files\nodejs\node.exe` is the **Functions runtime** (`functionsEmulatorRuntime`), which the CLI spawns when the functions emulator is selected. Its stdout is piped, so the tab stays blank. Hiding only Java leaves this popup.
3. Identify the CLI and runtime actually used by the test: Firebase CLI version and entry point, Node version, Java executable, and whether the emulator is started through `firebase emulators:exec`.
4. Inspect the installed Firebase CLI's current spawn paths before relying on internal behavior. Typical `firebase-tools` paths: the Java emulators are spawned from `downloadableEmulators` as `child_process.spawn("java", ...)`, and the Functions runtime from `functionsEmulator` as `spawn(bin, args, { stdio: [... "ipc"] })` **without `windowsHide`**. CLI internals can change; do not edit `node_modules` or a global Firebase installation as the fix.

## Windows-Only Suppression

Use a project-owned Node ESM preload for the Firebase CLI process. On Windows, patch that CLI's `child_process.spawn` so that:

- **Every child spawn gets `windowsHide: true`.** This is what hides the Functions runtime. When the CLI itself is started with `windowsHide` (CREATE_NO_WINDOW), it has no console to lend its child, so an un-hidden node child gets a **brand-new** console window instead of inheriting a hidden one.
- **A spawn whose executable is exactly `"java"` is routed to `javaw`.** `javaw` is the JDK's no-console launcher; `windowsHide` alone may not prevent Windows Terminal from opening a tab for the JVM.

Leave arguments and existing spawn options—including `stdio`—unchanged. Handle both spawn signatures, `(command, args, options)` and `(command, options)`, so a two-argument call is not corrupted.

Keep the hook narrowly scoped:

- Install it only in the test command's environment using Node's `--import` preload mechanism; do not change global `NODE_OPTIONS`.
- Apply the spawn wrapper only when `process.platform === "win32"` and the running entry point is the Firebase CLI (`firebase.js`).
- **Do not narrow the patch to `java`.** The Functions runtime popup is a `node` spawn; the wrapper must hide every child and rewrite only the exact `java` executable.
- Preserve any existing `NODE_OPTIONS` when adding the preload. Use `pathToFileURL()` for the preload path so spaces and Windows drive letters are parsed correctly.
- Verify that `javaw.exe` is available from the same configured JDK. If it is missing, do not silently fall back to hiding all process output or install/change Java; explain the blocker and ask before choosing another approach.
- Wrap the existing emulator command in a project-local Node launcher if the package-script shell cannot safely provide the preload environment. Inherit stdio, report launch errors, and propagate the Firebase CLI's exit code. Do not rewrite the suite command or make failures success-shaped.

## Route Every Emulator Invocation Through the Hook

The preload affects only the Firebase CLI process that receives it. A package script that starts the CLI with the preload does not change a separate, manually typed `firebase emulators:exec` command. **Every emulator test invocation on Windows—including one-off probes and filename-filtered runs—MUST use the hooked project launcher, or explicitly add the project preload to that Firebase CLI invocation.** Otherwise the Java and Functions-runtime children launch normally and may open their consoles.

Keep the caller's requested test scope intact: forward its existing Vitest filename filters or other supported test arguments through the launcher. Do not remove a filter, substitute a different test, or broaden a focused probe just to use the hook. If the project launcher cannot forward the requested arguments, extend that launcher safely and test the argument handling; do not fall back silently to raw `firebase emulators:exec`.

When direct CLI invocation is necessary, add the project-owned preload to that command's environment only, preserving existing `NODE_OPTIONS` and encoding the preload path with `pathToFileURL()`. Never set a global Node option just to cover manual emulator runs.

The project-local preload should implement the following decision and preserve the unmodified options object:

```js
export function windowsConsoleSpawnConfiguration(command, options, platform = process.platform) {
  if (platform !== "win32") return { command, options };
  return {
    command: command === "java" ? "javaw" : command,
    options: { ...options, windowsHide: true },
  };
}
```

Apply that configuration in the preloader's patched `childProcess.spawn()` call only for the Firebase CLI process, and support both signatures:

```js
if (process.platform === "win32" && win32.basename(process.argv[1] ?? "").toLowerCase() === "firebase.js") {
  const originalSpawn = childProcess.spawn;
  childProcess.spawn = function (command, args, options) {
    if (Array.isArray(args)) {
      const config = windowsConsoleSpawnConfiguration(command, options);
      return Reflect.apply(originalSpawn, this, [config.command, args, config.options]);
    }
    const config = windowsConsoleSpawnConfiguration(command, args);
    return Reflect.apply(originalSpawn, this, [config.command, config.options]);
  };
}
```

Treat the CLI's internal entry filename and `spawn` shapes as version-sensitive: confirm them from the installed CLI before implementing, then test the hook itself. The preload is inherited by some descendants through `NODE_OPTIONS` (for example the Functions runtime); keep the entry-point check so it no-ops there, and keep the file path valid for the whole run.

## Verify the Exact Behavior

1. Add a focused behavioral test: Windows + `java` maps to `javaw` and adds `windowsHide`; **Windows + `node` keeps its command and adds `windowsHide`** (the Functions runtime case); non-Windows platforms retain their original command and options; the caller's options object is not mutated.
2. Run the project's original emulator-test command. Confirm the same emulators start, the tests run, output remains visible in the invoking terminal, and the process exits with the test suite's actual status.
3. Use process evidence, not a green suite: on Windows, count `javaw.exe` and `java.exe` (there should be no `java.exe` for the emulators) and confirm no new `WindowsTerminal`/`conhost` window or blank `node.exe` tab appears. A blank tab titled `C:\Program Files\nodejs\node.exe` is the Functions runtime popup, not an application error.
4. Ask the user to observe whether the desktop popup appeared, or use a desktop-capable check. Passing tests alone cannot prove a window was visually hidden.
5. If the test suite has a port preflight, run it after shutdown. If a Java process remains, inspect its PID and full command line first; stop it only after confirming it is the orphan emulator for this project's demo/test project. Never kill Java processes by image name or assume a green test process exit means its emulator JVM has exited.
6. Report the test result and whether popup suppression was directly observed separately. Do not claim visual confirmation unless the user or a desktop-capable check confirms it.

**Measured evidence (gs-coordinator-helper, D331, 2026-10-19):** the Java-only hook removed the JVM tabs (four `javaw.exe`, zero `java.exe`), but a blank Windows Terminal tab titled `C:\Program Files\nodejs\node.exe` still appeared; its PID's command line was the CLI's `functionsEmulatorRuntime` child, started with piped stdio and no `windowsHide`. Adding `windowsHide` to every CLI child removed it — a fresh boot then showed no Windows Terminal process at all.

## Anti-Patterns

- Do not confuse `emulators.ui.enabled: false` with console suppression.
- Do not hide only the `java` executable. The Functions runtime is a separate `node` child and will keep popping.
- Do not only set `windowsHide: true` and assume it hides the JVM's Windows Terminal tab; it did not in the verified Windows Terminal case—route Java to `javaw` as well.
- Do not discard stdout/stderr, redirect emulator output away, detach the process, or alter the tested emulator set to hide a window.
- Do not patch the globally installed Firebase CLI or files under `node_modules`; those changes are not reproducible and can be overwritten.
- Do not kill an unidentified Java process to recover a port.

## Cross-References

- **Depends on:** [firebase-firestore-practices/SKILL.md](../firebase-firestore-practices/SKILL.md)
- **Depends on:** `testing-philosophy.md` — under `02-engineering-practices/` in the mirror. Named, not linked: this file is also copied flat to `_skills/<name>/`, where a mirror-relative path lands above the project root and dies.
- **Follows:** `skill-design-patterns.md` — central repo `docs/repo-meta/`, **not mirrored**, so it is named rather than linked (a `../../../../` path escapes `_guidelines/` and breaks every project's link check)
