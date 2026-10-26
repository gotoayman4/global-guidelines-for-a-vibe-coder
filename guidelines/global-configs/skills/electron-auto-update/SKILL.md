---
name: electron-auto-update
description: Electron auto-update and desktop release. Activate when an Electron app must update itself from GitHub Releases or Netlify, when the source repository must stay private while installers are public, when old release assets must be pruned, or when adding a changelog-driven release pipeline. Triggers on "electron auto-update", "electron-updater", "latest.yml", "update feed", "code signing", "prune old releases".
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

1. **Confirm the shape:** private source repo → public releases-only repo; GitHub serves the bytes; Netlify is an optional manifest/redirect layer only. Stop if the plan makes the source public or ships a token.
2. **Scaffold the build** from §1: NSIS per-user, DMG + ZIP, AppImage; `publish` points at the releases repo with `private: false`; bundle `CHANGELOG.md`.
3. **Implement the updater** from §2: main process only, consent-first (`autoDownload = false`), narrow preload bridge, delayed check + 4 h jitter.
4. **Add the release pipeline** from §3: tag-driven, draft → verify → publish, prune to current + previous.
5. **Wire the changelog** from §4: canonical `CHANGELOG.md`; CI fails a version without notes.
6. **Prove it** with §7: feed/asset/signature checks and an old→new install on a clean VM.

## Non-negotiables

- Never make the source repo public to satisfy `update-electron-app`.
- Never embed a GitHub token in the app; `private: true` without a runtime token silently falls back and 404s.
- Never delete the current release or its `latest*.yml`; prune only older tags.
- Never ship unsigned builds: macOS refuses them, Windows SmartScreen blocks them. There is no free signing path for a private commercial app.
- Never force a restart over unsaved work.
- Keep `allowDowngrade = false`; roll back by publishing a higher version.

## Done when

The §7 acceptance table passes, including a clean-VM initial install that updates to the new release with data intact.

---

## Cross-References

- Primary guideline: `05-stack-guides/electron/electron-auto-update.md`
- Security: `02-engineering-practices/security-engineering.md`
- CI/CD: `03-git-and-ci/ci-cd-philosophy.md`
- Environment: `03-git-and-ci/environment-management.md`
- Cost: `02-engineering-practices/cost-optimization-strategy.md`
