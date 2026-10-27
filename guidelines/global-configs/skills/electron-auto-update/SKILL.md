---
name: electron-auto-update
description: Electron auto-update and desktop release. Activate when an Electron app must update itself from GitHub Releases or Netlify, when the source repository must stay private while installers are public, when old release assets must be pruned, when a tag-driven release workflow or release-notes feed must be built, or when update notes show HTML, wrong language, or unbilled full-installer downloads. Triggers on "electron auto-update", "electron-updater", "latest.yml", "update feed", "release notes", "code signing", "prune old releases".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, electron, auto-update, release, github-releases, code-signing
  appliesTo: electron
---

# Skill: Electron Auto-Update — Private Source, Public Feed

---

**Activation announcement:** When this skill activates, output in chat: `Skill: electron-auto-update activated -- Source: _skills/electron-auto-update/SKILL.md`

## Trigger

Activate when:
- The user asks to add auto-update to an Electron app, or names `electron-updater`, `latest.yml`, or an update feed
- The source repo must stay private but installers must be downloadable
- Old `.exe` / `.dmg` / `.AppImage` assets must be pruned from GitHub Releases
- A release workflow, code-signing path, or in-app "What's new" view is being designed
- The update notice shows markup, the wrong language, or a wall of text the user must scroll to reach **Download**
- A tag-driven pipeline is about to run for the first time — its guards fail on runner facts no fixture reproduces
- Not for MSIX or Mac App Store builds — those update through their store

---

## Load

The implementation contract is the guideline — read it in full before writing code:

`05-stack-guides/electron/electron-auto-update.md`

Companion guidelines, only when the task touches their area:
- `02-engineering-practices/security-engineering.md` — tokens, signatures, remote input
- `03-git-and-ci/ci-cd-philosophy.md` — release gates and rollback
- `03-git-and-ci/environment-management.md` — CI secrets and per-OS credentials
- `02-engineering-practices/cost-optimization-strategy.md` — free-tier limits

**Guideline base path:** use `_guidelines/` if the project mirror exists; otherwise the central repo path from the global agent config.

---

## Workflow

1. **Confirm the shape:** private source repo → public releases-only repo; GitHub serves both the feed and the bytes; Netlify is a landing/download page only. Seed the releases repo with exactly one commit — GitHub cannot create a release in a repo with none. Stop if the plan makes the source public or ships a token.
2. **Scaffold the build** from §1: NSIS per-user, DMG + ZIP, AppImage; `publish` points at the releases repo with `private: false`; bundle `CHANGELOG.md`.
3. **Implement the updater** from §2: main process only, consent-first (`autoDownload = false`), narrow preload bridge, delayed check + 4 h jitter. Convert `releaseNotes` from GitHub's rendered HTML to plain text here, before the IPC boundary.
4. **Add the release pipeline** from §3: tag-driven, draft → verify → publish, prune to current + previous (the previous `.blockmap` included — dropping it makes every update a full download). Resolve a draft by release, not by git tag.
5. **Wire the changelog** from §4: canonical `CHANGELOG.md`; CI fails a version without notes; per-language headings if the app is bilingual, because the renderer splits on them. Normalize line endings and versions in one shared place, so a CRLF checkout and a `v`-prefixed tag cannot break the guards.
6. **Prove it** with §7: feed/asset/signature checks, an old→new install on a clean VM with the version measured from the store the installer writes, and the notes run through the shipped converter against the **published** feed body — not a fixture.

## Non-negotiables

- Never make the source repo public to satisfy `update-electron-app`.
- Never embed a GitHub token in the app; `private: true` without a runtime token silently falls back and 404s.
- Never delete the current release or its `latest*.yml`; prune only older tags.
- Unsigned builds MAY be published publicly; no owner decision or ADR is required. Windows users see SmartScreen, macOS cannot auto-update an unsigned app, and `sha512` proves integrity, not publisher identity — disclose the unknown publisher and never claim a verified publisher the build does not have.
- Never force a restart over unsaved work.
- Keep `allowDowngrade = false`; roll back by publishing a higher version.
- Never let release notes cross the IPC boundary as markup. `releaseNotes` is GitHub's rendered HTML for the release body: convert it to plain text in main and render it as text. A visible `<li>`, `###` or `&#39;` in the notice is a conversion defect.
- Never gate **Download** on the notes. Fold them by default, expand on click, and pick the language by the app's own setting — not the OS locale — falling back to the whole body rather than to silence.
- Never compare a raw git tag with a raw package version, and never parse a checked-out file before normalizing `\r\n`: a Windows runner fails the first release on both, before anything is published.
- Never call an in-workflow draft → latest flip an approval, and never record a release token as scoped without reading its class and scope back.

## Done when

The §7 acceptance table passes, including a clean-VM (or clean-account) initial install that updates to the new release with data intact — the installed version **measured** from the store the installer writes, and the update notes proven against the published feed body in the app's own language. The very first published version can only arrive by hand: plan a bridge install rather than concluding the updater is broken.

---

## Cross-References

- Primary guideline: `05-stack-guides/electron/electron-auto-update.md`
- Security: `02-engineering-practices/security-engineering.md`
- CI/CD: `03-git-and-ci/ci-cd-philosophy.md`
- Environment: `03-git-and-ci/environment-management.md`
- Cost: `02-engineering-practices/cost-optimization-strategy.md`
