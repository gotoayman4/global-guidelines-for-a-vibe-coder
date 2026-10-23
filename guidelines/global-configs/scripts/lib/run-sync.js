#!/usr/bin/env node

/**
 * run-sync.js — synchronous subprocess capture that does NOT use OS pipes.
 *
 * WHY THIS EXISTS (root cause, measured):
 *   Node's synchronous capture helpers — `child_process.spawnSync` / `execSync` /
 *   `execFileSync` — create an OS *pipe* for the child's stdout/stderr whenever
 *   `stdio` is a pipe (which is the default). On some Windows hosts that synchronous
 *   pipe read fails with `EBUSY`, so the call returns `{ error: EBUSY }` (or throws)
 *   even for something as simple as `node --version`. It is not the sandbox and not
 *   process creation: `spawnSync(..., { stdio: 'ignore' })` succeeds, and the
 *   *asynchronous* `spawn()` with piped stdio succeeds too. Only the synchronous
 *   pipe path breaks — a filesystem filter driver rejects it while allowing the
 *   overlapped path libuv uses for async I/O.
 *
 * THE FIX: hand the child an inherited FILE HANDLE instead of a pipe. Writing the
 *   child's stdout/stderr into temp files and reading them back afterwards uses no
 *   pipe object at all, so the broken path is never entered. This keeps the call
 *   synchronous (no async refactor of the CLIs), is portable (POSIX and Windows both
 *   inherit an fd correctly), and removes the classic pipe-buffer deadlock risk since
 *   output lands in a file rather than a fixed-size pipe.
 *
 * CONTRACT: never throws for a non-zero child exit — inspect `status`. `error` is
 *   non-null only when the child could not be started at all. Mirrors the shape of
 *   `spawnSync`'s result so call sites stay familiar.
 *
 * Usage:
 *   const { runSync } = require('./lib/run-sync.js');
 *   const r = runSync('git', ['rev-parse', '--short', 'HEAD'], { cwd });
 *   if (r.status === 0) console.log(r.stdout.trim());
 *
 * Source: global-configs/scripts/lib/run-sync.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Run a command to completion and capture stdout/stderr synchronously.
 *
 * @param {string} command           Executable name or path (no shell).
 * @param {string[]} [args]          Argument vector.
 * @param {object} [options]
 * @param {string} [options.cwd]     Working directory for the child.
 * @param {object} [options.env]     Environment for the child.
 * @param {boolean} [options.windowsHide=true] Hide the console window on Windows.
 * @param {boolean} [options.shell=false] Run the command through the shell. Needed only for a
 *   `.cmd`/`.bat` executable on Windows (see `npmSync`), and never for a fixed argv.
 * @param {number} [options.timeout] Milliseconds before the child is killed. A killed child
 *   reports `signal`, never `status`, so a caller can tell "it timed out" from "it failed".
 * @returns {{status:number|null, signal:string|null, stdout:string, stderr:string, error:Error|null}}
 */
function runSync(command, args = [], options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-sync-'));
  const outPath = path.join(dir, 'stdout');
  const errPath = path.join(dir, 'stderr');
  const outFd = fs.openSync(outPath, 'w');
  const errFd = fs.openSync(errPath, 'w');

  let result;
  try {
    result = spawnSync(command, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: options.windowsHide !== false,
      shell: options.shell === true,
      timeout: options.timeout,
      // 'ignore' for stdin; inherited file handles (not pipes) for stdout/stderr.
      stdio: ['ignore', outFd, errFd],
    });
  } finally {
    fs.closeSync(outFd);
    fs.closeSync(errFd);
  }

  const stdout = fs.readFileSync(outPath, 'utf8');
  const stderr = fs.readFileSync(errPath, 'utf8');
  // maxRetries guards against a scanner (Defender/OneDrive) briefly holding the file.
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });

  return {
    status: result.status,
    signal: result.signal,
    stdout,
    stderr,
    error: result.error || null,
  };
}

/**
 * Run npm itself, without a shell and without the `.cmd` problem.
 *
 * WHY NOT `npm` DIRECTLY. On Windows, npm ships as `npm.cmd`, and Node refuses to spawn a `.cmd`
 * without a shell (the CVE-2024-27980 mitigation): `spawnSync('npm.cmd', …)` fails with EINVAL. The
 * shell is therefore a Windows-only fallback, used when this process was NOT started by npm.
 *
 * WHY `npm_execpath` FIRST. When a script runs under `npm run`, npm exports the path of its own
 * CLI (`npm_execpath`). Running that file with the current node executable needs no shell on any
 * platform and no `.cmd` at all — so the common path has no shell, no quoting and no PATH lookup.
 *
 * @param {string[]} args  npm's own argument vector, e.g. `['run', 'validate']`.
 * @param {object} [options] the same options `runSync` takes.
 * @returns {{status:number|null, signal:string|null, stdout:string, stderr:string, error:Error|null}}
 */
function npmSync(args = [], options = {}) {
  const cli = process.env.npm_execpath;
  if (cli && /\.js$/i.test(cli)) {
    return runSync(process.execPath, [cli, ...args], options);
  }
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return runSync(npm, args, { ...options, shell: process.platform === 'win32' });
}

module.exports = { runSync, npmSync };
