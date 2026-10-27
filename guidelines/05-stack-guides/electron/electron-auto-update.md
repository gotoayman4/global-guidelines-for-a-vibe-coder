---
status: "Normative"
scope: "Stack (Electron)"
tags: [electron, auto-update, release, github-releases, netlify, code-signing, changelog]
control: none
---

# Electron Auto-Update — Private Source, Free Delivery, No Installer Graveyard

---

## Purpose

Load this when an Electron app must update itself after installation, or when choosing its release feed, artifact retention, or signing path. It assumes `electron-builder` + `electron-updater` and a source repository that MUST stay private; it covers direct-download builds only (MSIX and Mac App Store builds update through their store). **Verified 2026-10-26 against `electron-builder` 26.18.0 / `electron-updater` 6.8.11 / Electron 45.0.0** — re-check with `npm view` before pinning. Every claim about what the library does is cited to the pinned dependency's own source, file and line, because its public typing describes the field only as "the release notes" (`builder-util-runtime/out/updateInfo.d.ts`, `releaseNotes?: string | Array<ReleaseNoteInfo> | null`) and never says the string is HTML.

**A fixture does not prove a release pipeline.** This file's §3 rules about line endings, version spelling, draft resolution and the empty target repo came out of a first live release that died ~23 seconds in — before a release object existed — and out of the runner and API facts around it. No unit test could have found any of them, because each one is GitHub or the runner being itself. Budget one failed release for the discovery, then encode it as a guard.

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
import { toPlainText } from './updaterNotes'             // the remote-HTML converter, see below

type State =
  | { phase: 'idle' | 'checking' }
  | { phase: 'available'; version: string; notes: string }
  | { phase: 'downloading'; percent: number }
  | { phase: 'ready'; version: string }
  | { phase: 'error'; message: string }

let state: State = { phase: 'idle' }
let inFlight: Promise<void> | null = null
let downloading = false
// `releaseNotes` is GitHub's rendered HTML for the release body, not markdown and not plain text:
// see "Release notes are remote HTML" below. Convert here, in main, before the IPC boundary.
const notesOf = (i: UpdateInfo) => {
  const n = i.releaseNotes
  return toPlainText(!n ? '' : typeof n === 'string' ? n : n.map((x) => x.note ?? '').join('\n'))
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
  autoUpdater.disableWebInstaller = true        // else every download logs a warning: see §2 notes
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

**Release notes are remote HTML.** `updateInfo.releaseNotes` is neither markdown nor plain text. Verified in the pinned dependency: `providers/GitHubProvider.js:43` requests `${owner}/${repo}/releases.atom`, and `:150-151` fills `releaseNotes` from that entry — so the field carries **GitHub's rendered HTML body**, and by default (`fullChangelog = false`) only the newest release's. `computeReleaseNotes` (`:193-225`) additionally returns `null` when it cannot parse a semver tag out of the entry's link, so the UI MUST tolerate absent notes.

**The converter contract — in main, before the IPC boundary.** The notice is a security surface: its text comes from an account that can be compromised. The renderer receives plain text and renders it as text.

- **Decode the entities.** GitHub emits `&#39;`, `&quot;`, `&amp;`, `&mdash;`, `&rdquo;` and numeric refs. A surviving `&#39;` in a visible notice is a defect the user can see, not a style choice.
- **Keep structure as text markers, not markup.** `<h1>`–`<h6>` → `#`–`######`, `<li>` → `- ` (ordered → `1. `), `<script>`/`<style>` content dropped. Re-emitting the markers is what makes the live feed body and the bundled `CHANGELOG.md` snapshot read identically — and it is what the locale split keys on.
- **`<br>` is a space, not a newline.** A markdown bullet wraps across source lines in the published body; a converter that treats each rendered line break as a paragraph turns one bullet into three.
- **Prove it against the published body, not a fixture.** Fetch the live `.atom` entry, pass it through the shipped converter and assert the expected bullets. That is the only check that catches the provider returning HTML; a unit test written against markdown input passes while the app shows `<li>` tags.

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
- **Notes are folded by default**, behind a disclosure keyed to the version (`aria-expanded` / `aria-controls`, the list `hidden` when closed), so a returning user is not reading the same wall again. The fold MUST NOT gate **Download** or **Later**: a user who never opens the notice still gets the update. Expanding on click is the only acceptable reveal.
- **Pick the note language by the app's language, not the OS locale** — a coordinator running an Arabic UI on an English Windows install is the normal case, and keying to `app.getLocale()` shows them English. When the body carries no block for the app's language, show the whole body, or the only language present, rather than nothing: an empty notice reads as "no news", not as "no translation".
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

- `RELEASES_TOKEN` is a **fine-grained PAT** with `Contents: read/write` on the releases repo only. `GITHUB_TOKEN` cannot write to another repository. Store it as an Actions secret; never in the app. **Read the secret back before calling the release compliant:** the rule is what stops an over-broad credential, and a machine's ambient `gh` OAuth token (`gho_…`, `repo` + `workflow`) satisfies every step of the workflow while violating it. A release that works proves the token *works*, not that it is *scoped*.
- Draft → verify → publish is the safety gate; without it, a client can check while the release is half-uploaded and 404.
- Keep **at most two stable releases and two prereleases**. The cleanup deletes older releases and tags; the current `latest*.yml`, installer, and `.blockmap` MUST survive. Deleting an old `.blockmap` only costs delta savings — the updater falls back to a full download. Never delete the current feed: a missing `latest.yml` is a permanent outage for every installed copy.
- GitHub does **not** expire release assets (unlike Actions artifacts, which expire and need auth). Immutable releases are compatible with this draft → verify → publish pipeline: a published release can be deleted and its tag deleted (the tag name can never be reused), but its assets and tag are locked while it exists. They are **not** compatible with post-publish `--clobber` edits — stage before publishing.
- Publish in semver order. GitHub's "Latest" is the most recently published non-draft, non-prerelease — not the highest semver. Publish a backport with `gh release edit <tag> --latest=false`; a backported patch that becomes "Latest" stalls newer clients. Verify the feed version after every release.
- Build on tags only and cache npm: GitHub Free gives 2,000 Actions minutes/month on private repos, and Windows/macOS runners consume them faster.
- `GH_TOKEN` is passed per step, never at workflow level: `npm ci` and `npm test` run third-party install scripts that must not read the releases token.
- **Netlify (optional):** host the public landing/download page and link to the GitHub release. Do NOT host the feed or redirect versioned installer names to `releases/latest/download/...`: a client that read the previous `latest.yml` will 404 once a newer release becomes "Latest". Keep `provider: github`.

**What only a first live release teaches.** Each rule below came out of standing up this pipeline for real, and none is visible to a fixture:

- **A Windows runner checks out CRLF.** A guard that splits a repo file on `\n` and anchors a regex to line ends dies on `\r`, and it dies *before* anything is published. In the reference implementation the first live release failed ~23 s in, at `prepare`, with no release object created. Every release script that parses a checked-out file MUST normalize line endings first, and its test MUST assert both `\n` and `\r\n` spellings.
- **One `canonicalVersion()`, shared by every consumer.** The tag reads `v1.4.0`; `package.json` reads `1.4.0`; `gh` prints neither or both depending on the field. A version guard that compares the raw strings fails a correct release — and the failure looks like "CHANGELOG has no section for 1.4.0" when the section exists. Normalize once, in one function the guard, the notes extractor and the CLI wrapper all call.
- **A release is not a tag.** The tag is pushed to the *source* repo to trigger the workflow; the release object lives in the *releases* repo, and the two are only equal by convention. So a step that asks the releases repo for its tags cannot see the draft it is supposed to verify. Resolve "the current release" by release — `gh release view <tag> --json isDraft,assets,tagName` (the CLI has no `--draft` flag; the state is a `--json` field) — or read the feed. Never a tag list.
- **The artifacts-only repo needs exactly one commit.** GitHub cannot create a release — and therefore a tag — in a repository with no commits, so a brand-new empty releases repo fails the first `prepare`. "Artifacts-only" is a content rule, not an emptiness rule: seed one README commit.
- **The flip is the release act, and CI flipping it is not an approval.** A draft → latest step that runs in the same workflow as the build approves nothing. If a human decision is wanted, add required reviewers to the repository's `release` environment and run the publish job in it; if it is not, say plainly that the flip is automatic. Do not describe an auto-advance as a review gate.
- **Measured cost, for the minutes budget:** one release of a ~115 MiB NSIS installer ran prepare 37 s → build (Windows) 4 m 34 s → publish 39 s. That is ~6 minutes of a 2,000-minute/month private-repo allowance per release, so release cadence is a spend decision as well as a feed decision.

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
2. Write for users: no commit hashes, internal refactors, or "misc fixes"; 1–3 bullets per category. Breaking changes first with an **Action required** line; security fixes go under `### Security` and name affected versions. **Headings and bullets only** — a table, an image or a hard-wrapped paragraph does not survive the note conversion (§2), and the release body is the app's notice, so anything the converter cannot express is a feature the user never sees.
3. CI extracts the version section and fails if it is missing or empty; it becomes the GitHub release body, exposed as `updateInfo.releaseNotes`.
4. The public repo's `CHANGELOG.md`, the release body, and the app's bundled snapshot are **generated copies** — never hand-edit them. After an update, show the bundled section for `app.getVersion()` (`readFileSync(join(process.resourcesPath, 'CHANGELOG.md'))`); before one, show sanitized `updateInfo.releaseNotes` or link to the release page.
5. **A bilingual app writes a bilingual body.** Give each language its own heading inside the version section — `### ar — …` and `### en — …` — because the notes arrive as converted text and the renderer selects the block for the app's language (§2). The heading is then load-bearing, so use a real `###`: bold text survives as a paragraph and cannot be split. The bundled snapshot and the published body carry the same headings, so the two sources read identically whichever one the app shows.

```js
// scripts/release-notes.mjs — fail the release if the version has no notes
import { readFileSync } from 'node:fs'
const version = JSON.parse(readFileSync('package.json', 'utf8')).version
// Normalize first: on a Windows checkout these lines end \r\n, and an un-normalized regex either
// misses the section or carries a stray \r into the published release body.
const changelog = readFileSync('CHANGELOG.md', 'utf8').replace(/\r\n/g, '\n')
const section = changelog.split(/^## \[/m).find((s) => s.startsWith(`${version}]`))
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
8. **Treat release notes as remote HTML, converted in main.** `releaseNotes` is GitHub's rendered release body (§2), so it is remote input on every single update. Convert it to plain text in the **main process, before the IPC boundary**, and render it as text: the renderer then never receives markup, and a compromised release account cannot place a link, an image or a script inside a notice. DOMPurify + `dangerouslySetInnerHTML` is the floor for an app that must render rich notes, not the default. Never build a custom "download the exe and run it" updater — it bypasses signature, publisher, and downgrade checks and turns a feed compromise into code execution.

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
| Old→new install | Install the previous release on a clean VM/account; it finds, downloads, and installs the new one; data survives. **Measure** the installed version where the installer records it (Windows: the NSIS uninstall key's `DisplayVersion`) — a recollection of which build was installed is not evidence. The first published version can only arrive by hand: no older copy carries the feed, so a bridge install is the plan, not an oversight |
| macOS "Later" path | After choosing **Later** and downloading, quitting the app installs the update; a canceled close prompt must not block it |
| Offline / corrupt | No crash offline; a truncated or corrupt download fails with a clear error and no install |
| Code signatures | Signed builds: macOS `codesign --verify --deep --strict`, `spctl -a -vv`, `xcrun stapler validate` pass; Windows `Get-AuthenticodeSignature` reports `Valid` and the publisher matches the certificate CN. Unsigned builds: expect Windows SmartScreen, verify install + update still work, and state the publisher is unverified; macOS auto-update requires a signature |
| Prune safety | After deleting older releases, the current feed + assets still resolve and an N−2 client updates to latest. The **previous** release's `.blockmap` should survive the prune: with it gone every client silently falls back to the full installer, so the byte cost of "cleanup" is measured in downloads, not in repo size |
| Notes rendering | Prompt shows plain text — folded by default, expandable, with **Download** reachable without expanding it; after restart "What's new" shows the bundled section |
| Notes as delivered | Fetch the **published** `.atom` entry, pass it through the shipped converter, assert the expected bullets in each app language. No tag (`<li>`), entity (`&#39;`) or leftover markup in the visible text — and the Arabic build shows the Arabic block. A fixture written against markdown cannot catch this: the provider returns HTML |
| Release scripts on Windows | Every version/changelog guard runs green against a CRLF checkout, and its test asserts both `\n` and `\r\n` — not one of them |
| Feed identity | The packaged `app-update.yml` names the releases-only repo and nothing can change it at runtime: no `setFeedURL()` call, no renderer-supplied feed or channel |

`scripts/verify-release.mjs` SHOULD automate the feed, asset, signature-identity, and changelog checks. It must resolve the release **by release, not by git tag**, so it can run against the draft before the flip (§3). The clean-VM install is the one check a standard CI runner cannot fully prove; schedule it or run it before the first release of each signing/updater change.

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
| Release job dies in seconds, before a release object exists | A CI guard anchored to `\n` on a CRLF Windows checkout, or the releases repo has zero commits so `gh release create` cannot run | Normalize line endings in every parser and test both spellings; seed the releases repo with one README commit |
| "CHANGELOG has no section for 1.4.0" while the section exists | `v1.4.0` from the tag compared raw against `1.4.0` from `package.json` | One shared `canonicalVersion()` used by the guard, the extractor and the CLI |
| Verifier finds nothing to verify | It listed the releases repo's git tags while the release it must check is still a draft | Resolve the release by release, not by tag, and run the verifier on the draft |
| Notice shows `<li>`, `###` or `&#39;` | GitHub's rendered HTML crossed the IPC boundary unconverted | Convert to plain text in main (§2); prove it against the published body |
| Arabic build shows English notes | The split keyed to the OS locale, or the body carries no `### ar` block | Key the split to the app's language and write the locale headings; fall back to the whole body, never to silence |
| No notes at all, feed otherwise healthy | `computeReleaseNotes` returns `null` when it cannot parse a semver tag from the entry's link (`GitHubProvider.js:193-225`) | Keep release tag names plain semver (`vX.Y.Z`); render "see the release page" when notes are absent |
| Every update downloads the whole installer | The previous release's `.blockmap` was pruned, or `disableDifferentialDownload` is on | Keep current **and** previous with their blockmaps; delta savings live in the older one |
| A warning logged on every download: `disableWebInstaller is set to false…` | NSIS full installer, and `disableWebInstaller` still defaults to `false` (`AppUpdater.js:147`; warning at `NsisUpdater.js:45`) | Set `autoUpdater.disableWebInstaller = true` — the library itself says the default flips in a future version |
| The first release updates nobody | No installed copy carries the feed yet | Expected, not a defect: hand-install the bridge version, then prove the update path |
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
| Rendering `releaseNotes` as markup because it "is markdown" | It is GitHub's rendered HTML from an account that can be compromised; the notice becomes an injection surface | Convert to plain text in main; the renderer renders text |
| Testing notes against a hand-written markdown fixture | The provider serves HTML, so the fixture is green while the app shows `<li>` and `&#39;` | Pass the published `.atom` body through the shipped converter and assert the text |
| Keying the note language to the OS locale | The app's language is the user's choice and is independent of the OS install | Split on the locale headings by app language; fall back to the whole body |
| The whole changelog inside the update notice | **Download** / **Later** fall below the fold; the user dismisses the dialog rather than deciding | 2–3 bullets, folded by default, the actions never gated by the fold |
| Treating a green local build as proof the release pipeline works | The pipeline's guards have never met a CRLF checkout, an empty target repo or a draft release — and those fail only in CI | Run each release script against the real `gh` CLI before the tag; assume one failed first release |
| Calling an in-workflow draft → latest flip an approval gate | Nothing was approved; a human never pressed anything | Add required reviewers to the `release` environment, or state that the flip is automatic |
| Recording a token as scoped because the workflow succeeded | A machine's ambient OAuth token with `repo` scope passes every step and violates least privilege | Read the secret's class and scope back before writing "compliant" anywhere |

## Key Takeaways

1. Private source + **public releases-only repo** + the `electron-updater` GitHub provider = free updates with **no token in the app**; `update-electron-app` is disqualified by its public-repo requirement.
2. `latest*.yml` is the contract. Publish the installer, `.blockmap`, and feed together; keep current + previous and prune older ones — GitHub never expires release assets. Netlify is a landing/download page; GitHub serves the feed and bytes.
3. `CHANGELOG.md` is canonical and user-facing; the release body, public copy, and bundled snapshot are generated; CI fails a version without notes. The body reaches the app as **rendered HTML**, so convert it to plain text in main, and write it with per-language headings if the app has more than one language.
4. Consent-first UX: check silently, download after consent, install on restart or next quit, never force a restart over unsaved work. Notes are folded by default, in the app's own language, and the fold never gates **Download**.
5. Signing is optional on Windows and required on macOS for auto-update; no free signing path exists for a private commercial app. An unsigned build MAY be published publicly — Windows shows SmartScreen and macOS cannot self-update unsigned — so `sha512` plus TLS is the only integrity check and the UI must never claim a verified publisher it does not have. Verify the feed, artifacts, packaged `app-update.yml`, and an old→new install before publishing; roll back with a higher version, never by deleting the bad one.
6. **A release pipeline is proven by releasing, not by testing.** CRLF checkouts, a zero-commit releases repo, a draft that no tag list can see, and `v1.4.0` against `1.4.0` are all invisible to a fixture and all fatal in CI. Normalize line endings and versions in one shared place, seed the releases repo with one commit, run every release script against the real `gh` CLI before the first tag, and measure the installed version from the key the installer writes rather than remembering which build was used.

## Cross-References

- **Depends on:** `security-engineering.md` — secrets, signature verification, remote-input sanitization
- **Depends on:** `ci-cd-philosophy.md` — release gates, green-before-ship, rollback readiness
- **Applied by:** `environment-management.md` — CI secrets and environment separation
- **See also:** `cost-optimization-strategy.md` — free-tier limits and paid-escalation rules
- **See also:** `bidirectional-design-principles.md` — locale and RTL for the update surface
- **See also:** `documentation-strategy.md` — project decision history is not the app changelog
