---
name: outlook-integration
description: Sending email and managing Outlook calendar meetings from an Electron desktop app on Windows — classic Outlook through COM, Microsoft Graph, and the browser/mailto fallbacks. Activate when an app must send official mail from the signed-in user's own mailbox, create/update/cancel Outlook meetings with invitations, when choosing between Graph and COM, when bridging to Outlook through a bundled PowerShell script, or when a send fails with elevation, Object Model Guard, timeout, unresolved-recipient, or "submitted but never verified" symptoms. Triggers on "Outlook", "send email from the app", "calendar invite", "meeting invitation", "Microsoft Graph", "COM automation", "outlook bridge", "Sent Items".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: [skill, electron, outlook, microsoft-graph, com-automation, powershell, email, calendar]
  appliesTo: electron
---

# Skill: Outlook Integration — Mail and Calendar from a Windows Desktop App

---

## Trigger

Activate when:
- The app must send official email from the signed-in user's own mailbox — no server-side sending, no service account, and the message must appear in that user's Sent Items
- The app must create, update, or cancel Outlook meetings and send invitations to attendees
- The implementation choice is open: Microsoft Graph vs classic Outlook COM vs Outlook-on-the-web deeplink vs `mailto:` vs an `.ics` file
- Outlook is reached through a bundled PowerShell script, and the bridge design, its timeout, its serialization, or its error mapping is in question
- A send "failed" or half-worked: elevation mismatch, Object Model Guard prompt, `TIMEOUT`, `RECIPIENT_UNRESOLVED`, `ACCOUNT_NOT_FOUND`, mail stuck in the Outbox, or a status that says `submitted` but was never verified in Sent Items
- A fallback is being chosen that silently drops attachments, HTML/RTL, or update/cancel support
- Do NOT activate for reading or processing incoming mail, free/busy lookup, room booking, or shared-mailbox sending — those are a different feature with a different threat model

---

## Load

The implementation contract is the guideline — read it in full before writing code:

`05-stack-guides/electron/outlook-integration.md`

Companion guidelines, only when the task touches their area:
- `02-engineering-practices/security-engineering.md` — renderer hardening, secrets, sanitization
- `02-engineering-practices/file-upload-security.md` — attachment allow-lists, size limits, blocked types
- `05-stack-guides/rtl-tech-stack.md` — the Arabic/RTL body and its container
- `02-engineering-practices/bidirectional-design-principles.md` — `<bdi>` wrapping for mixed-script lines
- `02-engineering-practices/error-handling-philosophy.md` — the `BridgeErrorCode` taxonomy and its user-facing mapping
- `05-stack-guides/electron/electron-auto-update.md` — packaging the bundled `.ps1` through `extraResources`, and code signing

On demand, not at activation: `references/com-error-triage.md` — symptom-first triage for a failing send or meeting, with the evidence to capture before changing anything.

**Guideline base path:** use `_guidelines/` if the project mirror exists; otherwise the central repo path from the global agent config.

---

## Workflow

1. **Confirm the shape** from §1: one shared bridge, one Graph client, and two provider chains (mail, calendar) over the same interface. Decide Graph-vs-COM **now**, because new Outlook does not support COM — a COM-only design fails on any machine that has already switched. Stop if the plan sends from a service account, or if the renderer is allowed to touch Outlook.
2. **Pick the providers and their flags** from §1: `display` is the default mode for both features, and the Graph providers ship disabled until IT consents. Every provider's capability set is declared — that is what the fallback check reads.
3. **Build the bridge** from §2: one bundled `.ps1`, spawned with the action as its only argument, payload as UTF-8 JSON on stdin, one JSON line back on stdout, a 45 s timeout, and one serial queue shared by mail and calendar. Never call `Outlook.Application.Quit()`.
4. **Implement the mail path** from §3: templates with validated placeholder tokens, sanitized HTML, `bodyText` always generated, idempotency by `messageId`, bulk batches stopped on the first `COM_SECURITY_BLOCKED`, credentials redacted.
5. **Implement the calendar path** from §4: `transactionId` / `AppMeetingId` for idempotency, updates sent as updates on the same item, and cancel through `MeetingStatus = 5` followed by `Send()`.
6. **Wire selection and fallback** from §5: capability check before falling back, the reason shown to the user, and update/cancel always on the provider that created the meeting.
7. **Lock the boundaries** from §6–§9: `contextIsolation` and `sandbox`, a narrow preload surface, main-side schema validation, attachment IDs resolved by main, no user data in a command line, no elevation, the bilingual message catalogue, and the Email Log with secrets redacted.
8. **Prove it** with §10: the acceptance table, including the two that catch real bugs — `display` fills the window with the right signature, RTL body, recipients, and attachment; and the same `messageId` sent twice is blocked.

---

## Non-negotiables

- Never build a PowerShell command from user data. The action is the only argument; the payload rides on stdin as JSON.
- Never run the app elevated. Outlook and the app must share an integrity level, and elevation is `COM_ELEVATION_MISMATCH`.
- Never let the app send on its own. The default mode is `display`; `send` needs an explicit in-app confirmation, and a bulk batch gets one confirmation for the whole batch.
- Never claim a message was sent when it was only `submitted`. `submitted_verified` requires a Sent Items hit; the log records what actually happened.
- Never fall back silently to a provider that drops attachments, HTML, or update/cancel support. Show the loss and let the user decide.
- Never update or cancel a meeting through a different provider than the one that created it — that is how duplicate meetings appear.
- Never quit Outlook, never suppress the Object Model Guard prompt, and never touch the Programmatic Access registry settings.
- Never log a password, a token, or attachment contents. The Email Log stores `[REDACTED]`.
- Never let a placeholder token (`{{DefenseDate}}`) reach a recipient. An unknown or unfilled token is `VALIDATION_FAILED`.

---

## Done when

The §10 acceptance table passes — the display window, the send, the draft, the blocked duplicate, the denied guard prompt, the elevated app, the modal dialog, and the meeting created through COM and then updated after a switch to new Outlook. The Email Log shows the real status of every attempt, and the UI shows the same thing to the user.

---

## Cross-References

- Primary guideline: `05-stack-guides/electron/outlook-integration.md`
- Security: `02-engineering-practices/security-engineering.md`
- File handling: `02-engineering-practices/file-upload-security.md`
- RTL: `05-stack-guides/rtl-tech-stack.md`
- Bidirectional design: `02-engineering-practices/bidirectional-design-principles.md`
- Error taxonomy: `02-engineering-practices/error-handling-philosophy.md`
- Packaging: `05-stack-guides/electron/electron-auto-update.md`
