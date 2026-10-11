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

module.exports = { runSync };
