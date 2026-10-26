---
status: "Normative"
scope: "Stack (Electron)"
tags: [electron, auto-update, release, github-releases, netlify, code-signing, changelog]
control: none
---

# Electron Auto-Update — Private Source, Free Delivery, No Installer Graveyard

---

## Purpose

Load this when an Electron app must update itself after installation, or when choosing its release feed, artifact retention, or signing path. It assumes `electron-builder` + `electron-updater` and a source repository that MUST stay private; it covers direct-download builds only (MSIX and Mac App Store builds update through their store). **Verified 2026-10-26 against `electron-builder` 26.18.0 / `electron-updater` 6.8.11 / Electron 45.0.0** — re-check with `npm view` before pinning.

## The Architecture (do not improvise)

```
private source repo ── tag v* + CI ──▶ public releases-only repo
  app/                                  app-releases/
  ├─ electron-builder.yml               ├─ latest*.yml      (feed)
  ├─ CHANGELOG.md  (canonical)          ├─ installer + .blockmap
  └─ .github/workflows/release.yml      ├─ CHANGELOG.md      (generated copy)
                                        └─ README.md         (no source)
                                                │
                         electron-updater ──────┘
                         provider: github, no token in the app
```

| Decision | Default | Why |
|---|---|---|
| Updater | `electron-updater` | `update-electron-app` requires a **public source repo**; `electron-updater` does not |
| Source visibility | Private source + **public releases-only repo** | The feed is public; the code never is |
| Feed | GitHub provider → releases-only repo | Free, no bandwidth cap, no token shipped |
| Netlify | Landing/download page only | Not the feed: 15 credits per deploy + 20/GB; GitHub serves the feed and bytes |
| Retention | Current + previous stable, two newest prereleases; prune older | GitHub never expires release assets; clients read only the newest feed |
| Changelog | `CHANGELOG.md` in the source repo | Release body and in-app view are generated copies |
| Signing | Optional on Windows; macOS signing required for auto-update | The OS, not `latest.yml`, is the authenticity boundary; unsigned Windows builds show SmartScreen, and macOS cannot self-update unsigned |
| Update UX | Consent-first; never force restart | Silent restart loses unsaved work |

**Why not `private: true`:** `PrivateGitHubProvider` needs a token **at runtime on the user's machine** (`GH_TOKEN`/`GITHUB_TOKEN` or `publish.token`). A build-time token never ships, and a shipped token is extractable from the ASAR. No token in the app — use the public releases-only repo.

**Why not Netlify as the feed or installer host:** Netlify Free gives 300 credits/month; each production deploy costs 15 and each GB of bandwidth 20 (~15 GB if you never deploy), and when credits run out **all sites pause**. A redirect to `releases/latest/download/...` also 404s for a client holding the previous `latest.yml`, because artifact names contain the version. Use Netlify for the landing/download page and link to the GitHub release; keep the feed on GitHub.

## Platform Contract

| OS | Build target | Feed file | Non-negotiable |
|---|---|---|---|
| Windows | NSIS | `latest.yml` | Per-user install; when signing, the publisher name lives under `azureSignOptions` or `signtoolOptions` and must equal the certificate CN; portable builds cannot self-update |
| macOS | **DMG + ZIP, x64 + arm64** | `latest-mac.yml` | Both targets and both arches; signed + notarized; the updater refuses unsigned apps |
| Linux | AppImage (default), deb, rpm, pacman | `latest-linux.yml` | All four self-update; AppImage needs no root, package installs use the system manager |

Electron's built-in `autoUpdater` has no Linux support and is Squirrel-only. `electron-updater` ships `AppImageUpdater`, `DebUpdater`, `RpmUpdater`, and `PacmanUpdater`, and is the supported path for NSIS, DMG/ZIP, and Linux.

## 1. Build Configuration

`package.json.version` is the only version source. `appId` and `productName` MUST NOT change between releases — changing them installs side-by-side and creates an update loop. `artifactName` MUST contain no spaces or Unicode; update URLs are built from it.

```yaml
# electron-builder.yml
appId: com.example.app
productName: Example
directories: { output: release }
files: [dist/**/*, package.json]
extraResources:
  - { from: CHANGELOG.md, to: CHANGELOG.md }   # bundled "What's new" snapshot
publish:
  provider: github
  owner: example-org
  repo: example-app-releases   # public, artifacts only — NOT the source repo
  private: false               # explicit: no token may ever be embedded
  releaseType: draft           # publish only after every asset verifies
artifactName: ${name}-${version}-${os}-${arch}.${ext}
win:
  target: [nsis]
  azureSignOptions:            # electron-builder 26; v27 moves this to win.sign
    publisherName: Example Ltd # must equal the certificate profile's CN exactly
    endpoint: https://eus.codesigning.azure.net/
    certificateProfileName: example-profile
    codeSigningAccountName: example-signing
  # Legacy .pfx: drop azureSignOptions, set signtoolOptions.publisherName,
  # and provide CSC_LINK / CSC_KEY_PASSWORD.
nsis:
  oneClick: false
  perMachine: false            # per-user: no UAC on update
  allowToChangeInstallationDirectory: true
mac:
  target:
    - { target: dmg, arch: [x64, arm64] }
    - { target: zip, arch: [x64, arm64] }   # ZIP is what the updater downloads
  hardenedRuntime: true
  notarize: true
linux: { target: [AppImage], category: Utility }
```

- `win.publisherName` is a pre-v26 key. In v26 the publisher lives under `win.azureSignOptions` (Azure Trusted Signing) or `win.signtoolOptions` (`.pfx`); v27 alpha replaces both with `win.sign: { type: azure | signtool, ... }`. A name that differs from the certificate CN makes `verifyUpdateCodeSignature` reject every update.
- `macos-latest` builds one architecture by default. Without `arch: [x64, arm64]` (or `universal`), Intel or Apple Silicon Macs never receive updates; build both in the same job.
- NSIS already ships a `.blockmap`; `nsis.differentialPackage` defaults to `true`. Set `'store-asar'` only if you want smaller deltas at the cost of a larger installer.
- `electron-builder` writes `app-update.yml` into the packaged `resources/`; never hand-write or edit it. No `publish` block = no feed.
- Signing is optional: omit `azureSignOptions`/`signtoolOptions` and `CSC_LINK`/`CSC_KEY_PASSWORD` for an unsigned build. Windows then shows SmartScreen and the UI must not claim a verified publisher; macOS still needs a Developer ID for the updater to work.
- Build **all architectures for one OS in one job**. Two jobs that both write `latest.yml` overwrite each other; the last wins and the other arch 404s.
- `dev-app-update.yml` + `autoUpdater.forceDevUpdateConfig = true` are for local tests only; keep both out of the packaged app.

## 2. Main-Process Updater

The updater lives in the main process only. The renderer receives state and asks for actions; it never sees a URL, a token, or `ipcRenderer`.

```ts
// src/main/updater.ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'

type State =
  | { phase: 'idle' | 'checking' }
  | { phase: 'available'; version: string; notes: string }
  | { phase: 'downloading'; percent: number }
  | { phase: 'ready'; version: string }
  | { phase: 'error'; message: string }

let state: State = { phase: 'idle' }
let inFlight: Promise<void> | null = null
let downloading = false
const notesOf = (i: UpdateInfo) => {
  const n = i.releaseNotes
  return !n ? '' : typeof n === 'string' ? n : n.map((x) => x.note ?? '').join('\n')
}
function publish(next: State) {
  state = next
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('updater:state', state)
}
function check(): Promise<void> {
  if (inFlight) return inFlight
  inFlight = autoUpdater.checkForUpdates()
    .then(() => undefined)
    .catch((e: Error) => publish({ phase: 'error', message: e.message }))
    .finally(() => { inFlight = null })
  return inFlight
}

export function initUpdater() {                 // call once after app.whenReady()
  if (!app.isPackaged) return                   // dev builds do not update
  autoUpdater.autoDownload = false              // ask before spending bandwidth
  autoUpdater.autoInstallOnAppQuit = false      // true only after the user chooses "Later"
  autoUpdater.allowDowngrade = false
  autoUpdater.on('error', (e) => publish({ phase: 'error', message: e.message })) // register first
  autoUpdater.on('checking-for-update', () => publish({ phase: 'checking' }))
  autoUpdater.on('update-available', (i) => publish({ phase: 'available', version: i.version, notes: notesOf(i) }))
  autoUpdater.on('update-not-available', () => publish({ phase: 'idle' }))
  autoUpdater.on('download-progress', (p) => publish({ phase: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (i) => publish({ phase: 'ready', version: i.version }))

  ipcMain.handle('updater:get-state', () => state)
  ipcMain.handle('updater:check', () => check())
  ipcMain.handle('updater:download', () => {
    if (downloading) return
    downloading = true
    return autoUpdater.downloadUpdate()
      .then(() => undefined)
      .catch((e: Error) => publish({ phase: 'error', message: e.message }))
      .finally(() => { downloading = false })
  })
  ipcMain.handle('updater:later', () => { autoUpdater.autoInstallOnAppQuit = true })
  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall(false, true)) // v6 signature

  setTimeout(() => void check(), 30_000)        // do not compete with startup
  const every = 4 * 60 * 60 * 1000 + Math.floor(Math.random() * 30 * 60 * 1000)
  setInterval(() => void check(), every)        // 4 h + jitter
}
```

```ts
// src/preload/updater.ts — no argument can become a URL or command
import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('updater', {
  getState: () => ipcRenderer.invoke('updater:get-state'),
  check: () => ipcRenderer.invoke('updater:check'),
  download: () => ipcRenderer.invoke('updater:download'),
  later: () => ipcRenderer.invoke('updater:later'),
  install: () => ipcRenderer.invoke('updater:install'),
  onState: (cb: (s: unknown) => void) => {
    const l = (_: unknown, s: unknown) => cb(s)
    ipcRenderer.on('updater:state', l)
    return () => ipcRenderer.removeListener('updater:state', l)
  },
})
```

**Update UX rules.** Check silently, prepare in the background, let the user choose the restart moment:

- `available`: version + 2–3 user-facing bullets + **Download** / **Later** — never a blocking modal on first launch. `downloading`: non-blocking, accessible progress (`role="progressbar"`).
- `ready`: **Restart & install** / **Later**. "Later" sets `autoInstallOnAppQuit = true` and says "installs when you quit" — only if the quit flow protects unsaved work. Never call `quitAndInstall()` automatically, on a timer, or before the renderer confirms a save.
- The renderer confirms the save before main calls `quitAndInstall()`; `close` / `before-quit` handlers MUST NOT cancel a quit the user already confirmed, or the installer stalls. Test this path explicitly.
- macOS: if `app.isInApplicationsFolder()` is false, offer `moveToApplicationsFolder()`; a DMG-run app cannot update itself. Linux: if `process.env.APPIMAGE` is absent, the app came from deb/rpm/pacman — the updater invokes the system package manager (possibly with a sudo prompt), so say that instead of offering an AppImage-style download.
- Errors: one human sentence, Retry, and a manual download link. Log the stack, never show it, and never log tokens. Route `autoUpdater.logger` to the rotating file logger.
- Follow the app's locale and direction (logical CSS, translated strings, RTL tested per `bidirectional-design-principles.md`); no "Skip this version" for security releases; disclose that a check reveals the user's IP.

## 3. Release Pipeline

One workflow, one tag per release. The tag MUST equal `v` + `package.json.version`; a mismatch fails before any artifact is built.

```yaml
# .github/workflows/release.yml (shape)
on: { push: { tags: ['v*.*.*'] } }
permissions: { contents: read }          # the source-repo token never writes anywhere
concurrency: { group: release, cancel-in-progress: false }
env: { REPO: example-org/example-app-releases }
jobs:
  prepare:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: node scripts/check-version.mjs       # tag = version, and version > published feed
        env: { GH_TOKEN: ${{ secrets.RELEASES_TOKEN }} }
      - run: node scripts/release-notes.mjs > release-notes.md
      - run: gh release create "$GITHUB_REF_NAME" --repo "$REPO" --draft --title "$GITHUB_REF_NAME" --notes-file release-notes.md
        env: { GH_TOKEN: ${{ secrets.RELEASES_TOKEN }} }
  build:
    needs: prepare
    strategy: { fail-fast: false, matrix: { os: [windows-latest, macos-latest, ubuntu-latest] } }
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm test && npm run build
        shell: bash
      - name: Publish to the draft
        run: npx electron-builder --publish always
        env:
          GH_TOKEN: ${{ secrets.RELEASES_TOKEN }}
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          CSC_LINK: ${{ runner.os == 'Windows' && secrets.WIN_CSC_LINK || runner.os == 'macOS' && secrets.MAC_CSC_LINK || '' }}
          CSC_KEY_PASSWORD: ${{ runner.os == 'Windows' && secrets.WIN_CSC_PASSWORD || runner.os == 'macOS' && secrets.MAC_CSC_PASSWORD || '' }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  publish:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: node scripts/verify-release.mjs "$GITHUB_REF_NAME"   # feed + assets before users see them
        env: { GH_TOKEN: ${{ secrets.RELEASES_TOKEN }} }
      - run: gh release edit "$GITHUB_REF_NAME" --repo "$REPO" --draft=false --latest
        env: { GH_TOKEN: ${{ secrets.RELEASES_TOKEN }} }
      - name: Publish the changelog copy + prune old installers
        env: { GH_TOKEN: ${{ secrets.RELEASES_TOKEN }} }
        run: |
          gh auth setup-git
          gh repo clone "$REPO" release-repo
          git -C release-repo config user.name "github-actions[bot]"
          git -C release-repo config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          cp CHANGELOG.md release-repo/CHANGELOG.md
          git -C release-repo add CHANGELOG.md
          git -C release-repo diff --cached --quiet || git -C release-repo commit -m "docs: changelog $GITHUB_REF_NAME"
          git -C release-repo push
          # Keep the two newest stable releases and the two newest prereleases.
          gh release list --repo "$REPO" --limit 100 --exclude-drafts --json tagName,isPrerelease \
            --jq '[.[] | select(.isPrerelease|not)] | .[2:] | .[].tagName' |
            while read -r old; do gh release delete "$old" --repo "$REPO" --yes --cleanup-tag; done
          gh release list --repo "$REPO" --limit 100 --exclude-drafts --json tagName,isPrerelease \
            --jq '[.[] | select(.isPrerelease)] | .[2:] | .[].tagName' |
            while read -r old; do gh release delete "$old" --repo "$REPO" --yes --cleanup-tag; done
```

- `RELEASES_TOKEN` is a **fine-grained PAT** with `Contents: read/write` on the releases repo only. `GITHUB_TOKEN` cannot write to another repository. Store it as an Actions secret; never in the app.
- Draft → verify → publish is the safety gate; without it, a client can check while the release is half-uploaded and 404.
- Keep **at most two stable releases and two prereleases**. The cleanup deletes older releases and tags; the current `latest*.yml`, installer, and `.blockmap` MUST survive. Deleting an old `.blockmap` only costs delta savings — the updater falls back to a full download. Never delete the current feed: a missing `latest.yml` is a permanent outage for every installed copy.
- GitHub does **not** expire release assets (unlike Actions artifacts, which expire and need auth). Immutable releases are compatible with this draft → verify → publish pipeline: a published release can be deleted and its tag deleted (the tag name can never be reused), but its assets and tag are locked while it exists. They are **not** compatible with post-publish `--clobber` edits — stage before publishing.
- Publish in semver order. GitHub's "Latest" is the most recently published non-draft, non-prerelease — not the highest semver. Publish a backport with `gh release edit <tag> --latest=false`; a backported patch that becomes "Latest" stalls newer clients. Verify the feed version after every release.
- Build on tags only and cache npm: GitHub Free gives 2,000 Actions minutes/month on private repos, and Windows/macOS runners consume them faster.
- `GH_TOKEN` is passed per step, never at workflow level: `npm ci` and `npm test` run third-party install scripts that must not read the releases token.
- **Netlify (optional):** host the public landing/download page and link to the GitHub release. Do NOT host the feed or redirect versioned installer names to `releases/latest/download/...`: a client that read the previous `latest.yml` will 404 once a newer release becomes "Latest". Keep `provider: github`.

## 4. Changelog Contract

`CHANGELOG.md` is the canonical, user-facing history. It is **not** the project decision history in `docs/changelog/<YYYY>-Q<n>.md`; keep the two separate.

```md
## [1.4.0] - 2026-10-26
### Added
- Offline mode keeps the last opened project available.
### Fixed
- Windows installer no longer resets the window layout.
### Security
- Updates verify the publisher before installing; affected versions: <1.4.0.
```

1. The release PR updates `CHANGELOG.md`; the `## [x.y.z]` heading MUST equal `package.json.version`.
2. Write for users: no commit hashes, internal refactors, or "misc fixes"; 1–3 bullets per category. Breaking changes first with an **Action required** line; security fixes go under `### Security` and name affected versions.
3. CI extracts the version section and fails if it is missing or empty; it becomes the GitHub release body, exposed as `updateInfo.releaseNotes`.
4. The public repo's `CHANGELOG.md`, the release body, and the app's bundled snapshot are **generated copies** — never hand-edit them. After an update, show the bundled section for `app.getVersion()` (`readFileSync(join(process.resourcesPath, 'CHANGELOG.md'))`); before one, show sanitized `updateInfo.releaseNotes` or link to the release page.

```js
// scripts/release-notes.mjs — fail the release if the version has no notes
import { readFileSync } from 'node:fs'
const version = JSON.parse(readFileSync('package.json', 'utf8')).version
const section = readFileSync('CHANGELOG.md', 'utf8').split(/^## \[/m).find((s) => s.startsWith(`${version}]`))
const body = section?.slice(section.indexOf('\n') + 1).trim()
if (!body) { console.error(`CHANGELOG.md has no non-empty section for ${version}`); process.exit(1) }
process.stdout.write(body + '\n')
```

## 5. Security Requirements (Normative)

1. **No update credential ships in the app.** `app-update.yml` MUST contain no `token` and no `private: true`; the verifier fails the build if either appears. If a private feed is unavoidable, use a fine-grained `Contents: read` token for one repo, accept that it is extractable, document it, and rotate it — never a classic `repo`-scope PAT.
2. **HTTPS only; feed fixed at build time.** Never accept a feed URL from user input, remote config, or any runtime value; never call `setFeedURL()` with dynamic data.
3. **No downgrades.** `allowDowngrade = false`; setting `autoUpdater.channel` silently turns it on — reset it after any channel change.
4. **Keep OS signature verification on.** Windows: `verifyUpdateCodeSignature = true` (default) and the publisher name (under `win.azureSignOptions` or `win.signtoolOptions`) equal to the certificate CN; a mismatch rejects the update. macOS: Developer ID + hardened runtime + notarization, or the updater will not work at all. An unsigned build has no publisher identity for Windows to compare, so the feed's `sha512` is the only integrity check — never represent it as publisher verification.
5. **`sha512` detects corruption, not a compromised feed.** Anyone who compromises the release account can edit `latest.yml`. The authenticity boundary is the code signature; v27's Ed25519-signed manifests (preview, not current stable) close the "edit the manifest" hole — plan for it, do not assume it.
6. **Linux updates depend on the package manager.** AppImage is verified only by the manifest sha512 and needs no root; deb/rpm/pacman install through the system package manager, which may prompt for sudo and may not enforce a signature for local files. Publish a SHA-256 checksum and a GPG signature on the download page. On electron-updater 7 (v27 preview), `allowUnverifiedLinuxPackages` defaults to `true` and bypasses GPG for deb/rpm — set it to `false` if you sign those, knowing dpkg cannot enforce it and bare rpm needs `%_pkgverify_level signature` on the target.
7. **Release repo hygiene.** Artifacts only — no source, no `.env`, no source maps containing secrets. Protect tags; only CI writes. Never point the updater at GitHub Actions artifacts (they expire and require auth) — use Releases.
8. **Treat release notes as remote input.** Render `releaseNotes` as plain text or sanitize with DOMPurify before `dangerouslySetInnerHTML`. Never build a custom "download the exe and run it" updater — it bypasses signature, publisher, and downgrade checks and turns a feed compromise into code execution.

**Signing is optional (2026-10-26).** No free signing path exists for a private commercial app: macOS requires the paid Apple Developer Program; Windows Authenticode is Azure Artifact Signing (~$9.99/month; individuals USA/Canada, organizations USA/Canada/EU/UK) or an OV certificate ($150–300/year). Self-signed blocks public users; EV no longer bypasses SmartScreen (since 2024); SignPath Foundation is free only for qualifying open-source projects. **An unsigned build MAY be published publicly, with no owner decision or ADR requirement.** Windows users will see SmartScreen ("unknown publisher"), and macOS cannot auto-update an unsigned app. Signing is recommended for user trust and required only where the platform enforces it. Because an unsigned build has no publisher signature, TLS plus `sha512` on the feed is the only integrity check — a compromised release account can push code — and the UI MUST NOT claim a verified publisher it does not have.

## 6. Versioning, Channels, Rollout, Rollback

- **Semver; one version per release.** Never reuse or re-upload a version; the updater compares against `app.getVersion()`.
- **Channels:** `latest` (default) and `beta`. Enable `generateUpdatesFilesForAllChannels`, set `allowPrerelease` only for opted-in users, and reset `allowDowngrade` after setting `channel`. Beta users are the honest alternative to staged rollout when there is no adoption telemetry.
- **Staged rollout:** `stagingPercentage: 10` in `latest*.yml` is matched against a persisted per-install id. Edit the asset on the **draft** release (`gh release download` → edit → `gh release upload --clobber`) before publishing; after publication, immutable releases lock the asset and v27 signed manifests invalidate on edit. Do not stage without version-adoption telemetry.
- **Rollback:** publish a **higher** fixed version. Deleting a bad release does not uninstall it from users who already updated, and a build that crashes before the updater starts cannot update itself. Keep a manual download link and a support note. `allowDowngrade` stays false even during an incident.

## 7. Acceptance Checks

| Check | Proof |
|---|---|
| Feed + artifacts complete | `latest*.yml` per OS has `version`, `files[].sha512`, `files[].size`, `path`; installer, `.blockmap`, and feed all return 200 over HTTPS with matching sizes |
| No shipped token | Packaged `resources/app-update.yml` has `provider: github`, `owner`, `repo`; no `token`, no `private: true` |
| Changelog | The version section exists, is non-empty, and equals the GitHub release body |
| Version direction | `package.json.version` > the published `latest.yml`; tag = `v` + version |
| Old→new install | Install the previous release on a clean VM/account; it finds, downloads, and installs the new one; data survives |
| macOS "Later" path | After choosing **Later** and downloading, quitting the app installs the update; a canceled close prompt must not block it |
| Offline / corrupt | No crash offline; a truncated or corrupt download fails with a clear error and no install |
| Code signatures | Signed builds: macOS `codesign --verify --deep --strict`, `spctl -a -vv`, `xcrun stapler validate` pass; Windows `Get-AuthenticodeSignature` reports `Valid` and the publisher matches the certificate CN. Unsigned builds: expect Windows SmartScreen, verify install + update still work, and state the publisher is unverified; macOS auto-update requires a signature |
| Prune safety | After deleting older releases, the current feed + assets still resolve and an N−2 client updates to latest |
| Notes rendering | Prompt shows sanitized notes; after restart "What's new" shows the bundled section |

`scripts/verify-release.mjs` SHOULD automate the feed, asset, signature-identity, and changelog checks. The clean-VM install is the one check a standard CI runner cannot fully prove; schedule it or run it before the first release of each signing/updater change.

## Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| `ERR_UPDATER_CHANNEL_FILE_NOT_FOUND` | `latest.yml` missing, wrong provider, or `--publish never` | Publish to the releases repo; verify the draft asset list |
| 404 even though the repo is private | `private: true` with no runtime token; silent fallback to the public provider | Remove `private`; use the public releases-only repo |
| No update offered | Version not bumped, tag ≠ version, or `appId`/`productName` changed | Version guard in CI; keep identity stable |
| macOS update never applies | Only DMG built, or app unsigned/not notarized | Build DMG **and** ZIP; Developer ID + notarize |
| Windows update rejected / SmartScreen block | Publisher name not under `azureSignOptions`/`signtoolOptions`, unsigned build, or certificate mismatch | Unsigned: SmartScreen is expected — disclose it and verify install. Signed: use the same identity and set the publisher to the certificate CN |
| Linux update button does nothing | Installed from a distro repository or snap, not the release artifact | Install from the release's AppImage/deb/rpm; AppImage needs no root |
| One architecture 404s | Two jobs overwrote `latest.yml` | Build all arches in one OS job |
| Clients stop updating after cleanup | Deleted the current release or its `latest*.yml` | Keep current + previous; prune only older tags |
| Newer clients stall after a backport | GitHub "Latest" points at an older semver | Publish in semver order or use `--latest=false`; verify the feed version |
| Install never starts after "Restart & install" | A `close`/`before-quit` handler cancels the quit | Confirm the save before install; never block a user-confirmed quit |
| `allowDowngrade` turned on by itself | `channel` was set | Reset `allowDowngrade = false` after the assignment |
| v27: manifest signature invalid | `latest*.yml` edited after signing | Inject before signing; never hand-edit signed manifests |

## Anti-Patterns

| Anti-Pattern | Why It Fails / Consequence | Fix |
|---|---|---|
| Making the source repo public so `update-electron-app` works | Leaks source to satisfy a tool | `electron-updater` + public releases-only repo |
| Embedding a GitHub PAT in the app | Extractable from the ASAR; read access to the private repo | No token; public releases-only repo |
| Keeping every installer forever | No auto-expiry; the repo grows without bound | Keep current + previous; prune older releases |
| Deleting the current release or `latest.yml` | Every installed client loses its feed permanently | Prune only older tags; verify the feed after cleanup |
| Editing `latest*.yml` after publishing | Immutable releases reject the upload; v27 signatures invalidate | Edit the draft before publish; never patch a published feed |
| Force restart / install on a timer | Loses unsaved work; users disable updates | Consent-first; install on quit after "Later" |
| Claiming an unsigned build is publisher-verified | Neither `latest.yml` nor `sha512` proves publisher identity; Windows shows "unknown publisher" | State that the build is unsigned; sign it if the warning must disappear |
| Changelog = commit log | Users cannot decide; security fixes buried | `CHANGELOG.md` written for users; generated copies only |
| Checking for updates every minute | Rate limits, battery drain, log noise | 30 s after launch, then 4–6 h + jitter |
| Publishing from a laptop | Unreproducible artifacts, missing assets, leaked secrets | Tag-driven CI with the draft → verify → publish gate |

## Key Takeaways

1. Private source + **public releases-only repo** + the `electron-updater` GitHub provider = free updates with **no token in the app**; `update-electron-app` is disqualified by its public-repo requirement.
2. `latest*.yml` is the contract. Publish the installer, `.blockmap`, and feed together; keep current + previous and prune older ones — GitHub never expires release assets. Netlify is a landing/download page; GitHub serves the feed and bytes.
3. `CHANGELOG.md` is canonical and user-facing; the release body, public copy, and bundled snapshot are generated; CI fails a version without notes.
4. Consent-first UX: check silently, download after consent, install on restart or next quit, never force a restart over unsaved work.
5. Signing is optional on Windows and required on macOS for auto-update; no free signing path exists for a private commercial app. An unsigned build MAY be published publicly — Windows shows SmartScreen and macOS cannot self-update unsigned — so `sha512` plus TLS is the only integrity check and the UI must never claim a verified publisher it does not have. Verify the feed, artifacts, packaged `app-update.yml`, and an old→new install before publishing; roll back with a higher version, never by deleting the bad one.

## Cross-References

- **Depends on:** `security-engineering.md` — secrets, signature verification, remote-input sanitization
- **Depends on:** `ci-cd-philosophy.md` — release gates, green-before-ship, rollback readiness
- **Applied by:** `environment-management.md` — CI secrets and environment separation
- **See also:** `cost-optimization-strategy.md` — free-tier limits and paid-escalation rules
- **See also:** `bidirectional-design-principles.md` — locale and RTL for the update surface
- **See also:** `documentation-strategy.md` — project decision history is not the app changelog
