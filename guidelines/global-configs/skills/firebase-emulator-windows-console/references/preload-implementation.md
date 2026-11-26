# Windows Firebase Emulator Console Suppression — Preload Implementation

Reference companion for `firebase-emulator-windows-console`.

---

## Preload Decision & `child_process.spawn` Hook

1. On Windows (`process.platform === "win32"`), rewrite exact `"java"` spawns to `"javaw"` (JDK's no-console launcher) and add `windowsHide: true` to **every** child spawn (which suppresses the blank `node.exe` Functions runtime popup too).
2. Scope the hook strictly to the Firebase CLI process (`firebase.js`), because `NODE_OPTIONS` is inherited by child Node processes.
3. Preserve existing `NODE_OPTIONS`, encode the preload path with `pathToFileURL()`, and handle both `(command, args, options)` and `(command, options)` signatures without mutating the caller's `options`.

```js
export function windowsConsoleSpawnConfiguration(command, options, platform = process.platform) {
  if (platform !== "win32") return { command, options };
  return {
    command: command === "java" ? "javaw" : command,
    options: { ...options, windowsHide: true },
  };
}
```

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

---

## Measured Evidence (`gs-coordinator-helper`, 2026-10-19)

A Java-only rewrite removed the JVM tabs (four `javaw.exe`, zero `java.exe`), but a blank Windows Terminal tab titled `C:\Program Files\nodejs\node.exe` remained — caused by `functionsEmulatorRuntime` spawning with piped stdio and no `windowsHide`. Adding `windowsHide: true` to all CLI child spawns eliminated all Windows Terminal popups while preserving output and exit status.
