---
status: "Normative"
scope: "Stack (Electron — Windows Outlook)"
tags: [electron, outlook, microsoft-graph, com-automation, powershell, email, calendar, ipc]
control: none
---

# Outlook Integration — Mail and Calendar from a Windows Desktop App

---

## Purpose

Load this when an Electron desktop app on Windows must send official email from the signed-in user's own mailbox, or must create, update, and cancel calendar meetings that appear in that user's Outlook calendar. It assumes a Windows host with classic Outlook installed (or an intent to migrate to Microsoft Graph), an Electron main process, a renderer that never touches the OS directly, and a bilingual or Arabic-facing UI.

Three facts drive every rule in this file:

1. **New Outlook for Windows does not support COM** — no add-ins, no VBA, no Outlook Object Model, no MAPI. Every COM-based provider here is **transitional**; Microsoft Graph is the long-term target for mail and calendar alike.
2. **Mail originates from the user's own mailbox.** There is no server-side sending path, and a sent message must appear in that user's Sent Items. That is what makes the COM and Graph providers acceptable and a shared-mailbox or service-account provider not.
3. **The Outlook Object Model is a hostile input surface.** Outlook is another user's process, running with another user's data, and it may block the call with a modal prompt or a profile dialog. The serialization rules, the serial queue, the timeout, and the "display, never auto-send" default all exist because of that.

The provider model (§1) is the shape of the feature; §2 is the one piece that talks to Outlook; §3–§5 cover mail, calendar, and fallback; §6–§9 cover the boundaries around them — IPC, user-facing messages, configuration, and audit; §10 is the acceptance bar; §11 is the exit from COM.

**Do not invent behavior.** When the product requirement is ambiguous, choose the option that **keeps the user in control** — show the item rather than act silently — and record the open question as a decision (`adr-template.md`), never as a guessed default and never as a placeholder comment in the source.

---

## The Architecture (do not improvise)

```
renderer (UI)
   │  window.outlook.mail.*  /  window.outlook.calendar.*      ← contextBridge
   ▼
main process
   ├─ TemplateService        (admin-managed bilingual templates, placeholder validation)
   ├─ MailService            (validation, provider selection, Email Log)
   │     ├─ GraphMailProvider
   │     ├─ OutlookComMailProvider ─┐
   │     ├─ OwaMailDeeplinkProvider │
   │     └─ MailtoProvider          │
   ├─ CalendarService               │
   │     ├─ GraphCalendarProvider   │
   │     ├─ OutlookCalendarProvider ─┤
   │     ├─ OwaCalendarDeeplinkProvider │
   │     └─ IcsProvider                 │
   ├─ OutlookBridge  ◄─────────────────┘  (single PowerShell script, serial queue, detection)
   ├─ GraphClient                          (MSAL token, fetch wrapper; disabled until consented)
   └─ Store                                (Email Log, meeting refs, audit)
```

- `OutlookBridge` and `GraphClient` are **shared** by mail and calendar. One COM bridge, one Graph client — never two.
- All Outlook, PowerShell, filesystem, and network code runs in the **main process**. The renderer reaches it only through `contextBridge` and IPC (§6).
- The feature is done when the acceptance tests in §10 pass — not when the code compiles.

---

## 1. Provider Model and Priority

### 1.1 Mail providers

| Priority | Provider ID | Mechanism | Classic Outlook | New Outlook (`olk.exe`) | Attachments | HTML/RTL | Delivery tracking | Default flag |
|---|---|---|---|---|---|---|---|---|
| 1 (target) | `mail.graph` | Microsoft Graph `/me/messages` → `/send` | ✅ | ✅ | ✅ | ✅ | Message id and Sent Items | `false` |
| 2 (active now) | `mail.outlookCom` | PowerShell → `Outlook.MailItem` | ✅ | ❌ | ✅ | ✅ | Partial: submitted to Outbox, Sent Items check | `true` |
| 3 (fallback) | `mail.owaDeeplink` | Pre-filled Outlook on the web compose page | via browser | via browser | ❌ | ❌ plain text | ❌ | `true` |
| 4 (last resort) | `mail.mailto` | `mailto:` link opened in the default mail app | depends | depends | ❌ | ❌ plain text | ❌ | `true` |

### 1.2 Calendar providers

| Priority | Provider ID | Mechanism | Classic Outlook | New Outlook | Update/Cancel | Default flag |
|---|---|---|---|---|---|---|
| 1 (target) | `cal.graph` | Microsoft Graph `/me/events` | ✅ | ✅ | ✅ | `false` |
| 2 (active now) | `cal.outlookCom` | PowerShell → `Outlook.AppointmentItem` | ✅ | ❌ | ✅ | `true` |
| 3 (fallback) | `cal.owaDeeplink` | Pre-filled Outlook on the web event page | via browser | via browser | ❌ | `true` |
| 4 (last resort) | `cal.ics` | `.ics` file opened with the default handler | ✅ | ✅ | Partial | `false` (users prefer to avoid this) |

**Key fact the agent MUST respect:** new Outlook for Windows does **not** support COM add-ins, VBA, the Outlook Object Model, or MAPI. Both COM providers are transitional, and both Graph providers stay disabled until IT consents.

### 1.3 The provider interfaces

```ts
export type MailRecipientType = 'to' | 'cc' | 'bcc';

export interface MailAttachment {
  path: string;            // absolute path; MUST be inside an allowed app folder (§6)
  displayName?: string;    // name shown to recipients; defaults to the file name
}

export interface MailPayload {
  messageId: string;       // app-internal UUID (idempotency key)
  caseRef: string;         // business case reference, e.g. "CASE-2026-0142"
  templateId?: string;     // template used, for the Email Log
  subject: string;         // UTF-8, Arabic/English
  bodyHtml: string;        // sanitized HTML, already rendered from the template
  bodyText: string;        // plain-text version, used for the mailto and OWA fallbacks
  direction: 'rtl' | 'ltr';
  recipients: { email: string; name?: string; type: MailRecipientType }[];
  attachments?: MailAttachment[];
  importance?: 'low' | 'normal' | 'high';
  fromAccount?: string;    // SMTP address of the account to send from (COM: SendUsingAccount)
  keepSignature?: boolean; // default true: keep the user's default Outlook signature
  mode: 'display' | 'send' | 'draft';
  // display = open the filled-in Outlook message window; the user reviews it and clicks Send (DEFAULT)
  // send    = send immediately (only after explicit in-app confirmation)
  // draft   = save in the user's Drafts folder without opening it
}

export interface MailRef {
  provider: 'mail.graph' | 'mail.outlookCom' | 'mail.owaDeeplink' | 'mail.mailto';
  graphMessageId?: string;
  outlookEntryId?: string;
}

export type MailStatus =
  | 'sent'                         // Graph: send accepted (202)
  | 'submitted'                    // COM: Send() succeeded, item handed to the Outbox
  | 'submitted_verified'           // COM: copy found in Sent Items
  | 'displayed_pending_user_send'  // window open; the user decides
  | 'draft_saved'
  | 'handed_off'                   // mailto/OWA: the app cannot know the outcome
  | 'failed';

export interface MailResult {
  ok: boolean; status: MailStatus; ref?: MailRef;
  errorCode?: BridgeErrorCode; message?: string;
}

export interface MailProvider {
  id: MailRef['provider'];
  isAvailable(): Promise<{ available: boolean; reason?: BridgeErrorCode }>;
  send(p: MailPayload): Promise<MailResult>;
  supportsAttachments: boolean;
  supportsHtml: boolean;
}
```

```ts
export type AttendeeType = 'required' | 'optional' | 'resource';

export interface MeetingPayload {
  meetingId: string;            // app-internal UUID (idempotency key)
  caseRef: string;
  subject: string;
  bodyText: string;
  location?: string;
  startLocal: string;           // "YYYY-MM-DDTHH:mm:ss", local time of the host
  endLocal: string;
  timeZoneWindows: string;      // Windows time-zone id, e.g. "Arab Standard Time"
  attendees: { email: string; name?: string; type: AttendeeType }[];
  reminderMinutes?: number;     // default 30
  cancelComment?: string;
  mode: 'display' | 'send' | 'saveOnly';
}

export interface MeetingRef {
  provider: 'cal.graph' | 'cal.outlookCom' | 'cal.owaDeeplink' | 'cal.ics';
  graphEventId?: string;
  outlookEntryId?: string;
  outlookGlobalAppointmentId?: string;
  icsSequence?: number;
}

export interface CalendarResult {
  ok: boolean;
  status: 'created' | 'updated' | 'cancelled' | 'displayed_pending_user_send' | 'handed_off' | 'failed';
  ref?: MeetingRef; errorCode?: BridgeErrorCode; message?: string;
}

export interface CalendarProvider {
  id: MeetingRef['provider'];
  isAvailable(): Promise<{ available: boolean; reason?: BridgeErrorCode }>;
  create(p: MeetingPayload): Promise<CalendarResult>;
  update(p: MeetingPayload, ref: MeetingRef): Promise<CalendarResult>;
  cancel(p: MeetingPayload, ref: MeetingRef): Promise<CalendarResult>;
  supportsUpdate: boolean;
}
```

### 1.4 Shared error codes

```ts
export type BridgeErrorCode =
  | 'OUTLOOK_NOT_INSTALLED'
  | 'NEW_OUTLOOK_ACTIVE'
  | 'OUTLOOK_PROFILE_MISSING'
  | 'COM_ELEVATION_MISMATCH'     // HRESULT 0x80080005
  | 'COM_SECURITY_BLOCKED'       // Object Model Guard denied
  | 'ACCOUNT_NOT_FOUND'          // fromAccount not configured in Outlook
  | 'RECIPIENT_UNRESOLVED'
  | 'ATTACHMENT_NOT_ALLOWED'     // path outside allowed folders, or blocked type
  | 'ATTACHMENT_TOO_LARGE'
  | 'ITEM_NOT_FOUND'
  | 'TIMEOUT'
  | 'GRAPH_NOT_CONSENTED'
  | 'GRAPH_AUTH_FAILED'
  | 'GRAPH_HTTP_ERROR'
  | 'VALIDATION_FAILED'
  | 'UNKNOWN';
```

---

## 2. The Classic Outlook Bridge (COM)

### 2.1 Design decisions (MUST)

1. Use one **bundled PowerShell script**, `resources/outlook/outlook-bridge.ps1`, run through `child_process.spawn`. Do **not** add native Node COM modules (`winax`, `edge-js`) — they must be rebuilt for each Electron version.
2. Send the payload as **UTF-8 JSON on stdin**. Never pass user data in command-line arguments. This prevents injection, corrupted Arabic text, and command-length limits.
3. The script writes **one JSON line to stdout**. Exit code `0` means success. Exit code `1` means a handled error, and the JSON carries `errorCode`.
4. Spawn command:
   ```
   powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "<resources>\outlook\outlook-bridge.ps1" -Action <action>
   ```
   Actions: `detect`, `mail.send`, `mail.verifySent`, `cal.create`, `cal.update`, `cal.cancel`.
   Use `windowsHide: true` and a 45 s timeout. When the timeout fires, kill the process and return `TIMEOUT`.
5. Run calls **one at a time** — mail and calendar together — through a single serial queue in the main process.
6. Package the script with `extraResources` (`electron-builder`) and resolve it through `process.resourcesPath`.
7. **MUST NOT** call `Outlook.Application.Quit()`. If the script started Outlook itself, quitting can leave sent mail stuck in the Outbox.

### 2.2 Detection (`isAvailable`), in order

1. **Classic Outlook installed:** the registry key `App Paths\OUTLOOK.EXE` exists under HKLM or HKCU. If not → `OUTLOOK_NOT_INSTALLED`.
2. **New Outlook toggle:** `HKCU\Software\Microsoft\Office\16.0\Outlook\Preferences\UseNewOutlook` = `1` → `NEW_OUTLOOK_ACTIVE`.
3. **COM reachable:** run `-Action detect`. It returns the Outlook version, the default store, and the list of configured accounts (`SmtpAddress`). Map failures:
   - `0x80080005` → `COM_ELEVATION_MISMATCH`. The app and Outlook must run at the same integrity level. Never run the app as administrator.
   - No profile → `OUTLOOK_PROFILE_MISSING`.
4. Cache the result for 60 s. After any failure, check again on the next user action.

### 2.3 Outlook constants used

| Constant | Value |
|---|---|
| `olMailItem` / `olAppointmentItem` | 0 / 1 |
| `olTo` / `olCC` / `olBCC` (mail `Recipient.Type`) | 1 / 2 / 3 |
| `olRequired` / `olOptional` / `olResource` (meeting `Recipient.Type`) | 1 / 2 / 3 |
| `olFormatHTML` (`BodyFormat`) | 2 |
| `olImportanceLow` / `Normal` / `High` | 0 / 1 / 2 |
| `olMeeting` / `olMeetingCanceled` (`MeetingStatus`) | 1 / 5 |
| `olBusy` | 2 |
| `olText` (UserProperty type) | 1 |
| `olFolderSentMail` / `olFolderCalendar` / `olFolderDrafts` | 5 / 9 / 16 |

### 2.4 Reference script (`outlook-bridge.ps1`)

```powershell
param([Parameter(Mandatory)]
      [ValidateSet('detect','mail.send','mail.verifySent','cal.create','cal.update','cal.cancel')]
      [string]$Action)

$ErrorActionPreference = 'Stop'
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $utf8
$AppPropNs = 'http://schemas.microsoft.com/mapi/string/{00020329-0000-0000-C000-000000000046}/'

function Out-Result($obj, [int]$code = 0) {
  [Console]::Out.WriteLine(($obj | ConvertTo-Json -Compress -Depth 6)); exit $code
}
function Fail($codeName, $msg = '') { Out-Result @{ ok=$false; status='failed'; errorCode=$codeName; message=$msg } 1 }
function Map-Error($e) {
  switch ('{0:X8}' -f $e.Exception.HResult) {
    '80080005' { 'COM_ELEVATION_MISMATCH' }
    '80004005' { 'COM_SECURITY_BLOCKED' }
    default    { 'UNKNOWN' }
  }
}

try {
  $reader = [System.IO.StreamReader]::new([Console]::OpenStandardInput(), $utf8)
  $raw = $reader.ReadToEnd()
  $p = if ($raw) { $raw | ConvertFrom-Json } else { $null }

  $ol = New-Object -ComObject Outlook.Application
  $ns = $ol.GetNamespace('MAPI')

  # ---------------- DETECT ----------------
  if ($Action -eq 'detect') {
    $accts = @(); foreach ($a in $ns.Accounts) { $accts += $a.SmtpAddress }
    Out-Result @{ ok=$true; version=$ol.Version; store=$ns.DefaultStore.DisplayName; accounts=$accts }
  }

  # ---------------- MAIL: SEND / DISPLAY / DRAFT ----------------
  if ($Action -eq 'mail.send') {
    $m = $ol.CreateItem(0)

    # Sending account (optional)
    if ($p.fromAccount) {
      $acct = $null
      foreach ($a in $ns.Accounts) { if ($a.SmtpAddress -ieq $p.fromAccount) { $acct = $a } }
      if (-not $acct) { Fail 'ACCOUNT_NOT_FOUND' $p.fromAccount }
      $m.SendUsingAccount = $acct
    }

    $m.Subject = $p.subject
    $m.BodyFormat = 2
    $content = "<div dir=""$($p.direction)"" style=""font-family:Tahoma,Arial;font-size:11pt"">$($p.bodyHtml)</div>"

    $keepSig = ($p.keepSignature -ne $false)
    if ($keepSig) {
      # Display() first so Outlook inserts the default signature, then put the content after <body>
      $m.Display($false)
      $sigHtml = $m.HTMLBody
      $idx = $sigHtml.IndexOf('>', $sigHtml.IndexOf('<body', [StringComparison]::OrdinalIgnoreCase)) + 1
      if ($idx -gt 0) { $m.HTMLBody = $sigHtml.Insert($idx, $content) } else { $m.HTMLBody = $content + $sigHtml }
    } else {
      $m.HTMLBody = "<html><body>$content</body></html>"
    }

    foreach ($r in $p.recipients) {
      $rec = $m.Recipients.Add($r.email)
      $rec.Type = switch ($r.type) { 'cc' {2} 'bcc' {3} default {1} }
    }
    if (-not $m.Recipients.ResolveAll()) {
      $bad = @(); foreach ($rec in $m.Recipients) { if (-not $rec.Resolved) { $bad += $rec.Name } }
      if ($p.mode -eq 'send') { Fail 'RECIPIENT_UNRESOLVED' ($bad -join '; ') }
    }

    foreach ($att in $p.attachments) {
      if (-not (Test-Path -LiteralPath $att.path)) { Fail 'ATTACHMENT_NOT_ALLOWED' $att.path }
      $name = if ($att.displayName) { $att.displayName } else { [IO.Path]::GetFileName($att.path) }
      [void]$m.Attachments.Add($att.path, 1, 1, $name)
    }

    $m.Importance = switch ($p.importance) { 'low' {0} 'high' {2} default {1} }

    # Hidden tracking property (MUST): used for idempotency and the Sent Items check
    $m.PropertyAccessor.SetProperty($AppPropNs + 'AppMessageId', [string]$p.messageId)
    $m.PropertyAccessor.SetProperty($AppPropNs + 'AppCaseRef',   [string]$p.caseRef)

    switch ($p.mode) {
      'send'    { $m.Send()
                  Out-Result @{ ok=$true; status='submitted'; ref=@{ provider='mail.outlookCom' } } }
      'draft'   { $m.Save(); if ($keepSig) { $m.Close(0) }   # 0 = olSave
                  Out-Result @{ ok=$true; status='draft_saved'; ref=@{ provider='mail.outlookCom'; outlookEntryId=$m.EntryID } } }
      default   { if (-not $keepSig) { $m.Display($false) }
                  Out-Result @{ ok=$true; status='displayed_pending_user_send'; ref=@{ provider='mail.outlookCom' } } }
    }
  }

  # ---------------- MAIL: VERIFY IN SENT ITEMS ----------------
  if ($Action -eq 'mail.verifySent') {
    $sent = $ns.GetDefaultFolder(5)
    $id = ($p.messageId -replace "'", "''")
    $hit = $sent.Items.Restrict("@SQL=""$($AppPropNs)AppMessageId"" = '$id'")
    if ($hit.Count -ge 1) {
      $it = $hit.Item(1)
      Out-Result @{ ok=$true; status='submitted_verified'; sentOn=$it.SentOn.ToString('o'); ref=@{ provider='mail.outlookCom'; outlookEntryId=$it.EntryID } }
    }
    Out-Result @{ ok=$true; status='submitted' }
  }

  # ---------------- CALENDAR ----------------
  function Find-Appt($p) {
    if ($p.ref.outlookEntryId) { try { return $ns.GetItemFromID($p.ref.outlookEntryId) } catch {} }
    $cal = $ns.GetDefaultFolder(9)
    $id = ($p.meetingId -replace "'", "''")
    $f = $cal.Items.Restrict("@SQL=""$($AppPropNs)AppMeetingId"" = '$id'")
    if ($f.Count -ge 1) { return $f.Item(1) }
    return $null
  }
  function Apply-Appt($item, $p) {
    $fmt='yyyy-MM-ddTHH:mm:ss'; $ci=[Globalization.CultureInfo]::InvariantCulture
    $item.Subject=$p.subject; $item.Body=$p.bodyText; $item.Location=$p.location
    $item.Start=[datetime]::ParseExact($p.startLocal,$fmt,$ci)
    $item.End  =[datetime]::ParseExact($p.endLocal,$fmt,$ci)
    $item.BusyStatus=2; $item.ReminderSet=$true
    $item.ReminderMinutesBeforeStart = if ($p.reminderMinutes) { [int]$p.reminderMinutes } else { 30 }
  }
  function Set-Attendees($item, $p) {
    for ($i=$item.Recipients.Count; $i -ge 1; $i--) { $item.Recipients.Remove($i) }
    foreach ($a in $p.attendees) {
      $r=$item.Recipients.Add($a.email)
      $r.Type = switch ($a.type) { 'optional' {2} 'resource' {3} default {1} }
    }
    [void]$item.Recipients.ResolveAll()
  }

  if ($Action -eq 'cal.create') {
    $item=$ol.CreateItem(1); Apply-Appt $item $p
    $item.PropertyAccessor.SetProperty($AppPropNs + 'AppMeetingId', [string]$p.meetingId)
    $item.PropertyAccessor.SetProperty($AppPropNs + 'AppCaseRef',   [string]$p.caseRef)
    if ($p.mode -ne 'saveOnly' -and $p.attendees.Count -gt 0) { $item.MeetingStatus=1; Set-Attendees $item $p }
    $item.Save()
    $ref=@{ provider='cal.outlookCom'; outlookEntryId=$item.EntryID; outlookGlobalAppointmentId=$item.GlobalAppointmentID }
    switch ($p.mode) {
      'send'     { $item.Send(); Out-Result @{ ok=$true; status='created'; ref=$ref } }
      'saveOnly' { Out-Result @{ ok=$true; status='created'; ref=$ref } }
      default    { $item.Display($false); Out-Result @{ ok=$true; status='displayed_pending_user_send'; ref=$ref } }
    }
  }
  if ($Action -eq 'cal.update') {
    $item=Find-Appt $p; if (-not $item) { Fail 'ITEM_NOT_FOUND' }
    Apply-Appt $item $p
    if ($item.MeetingStatus -eq 1) { Set-Attendees $item $p }
    $item.Save()
    if ($p.mode -eq 'send' -and $item.MeetingStatus -eq 1) { $item.Send() }
    elseif ($p.mode -eq 'display') { $item.Display($false) }
    Out-Result @{ ok=$true; status='updated'; ref=@{ provider='cal.outlookCom'; outlookEntryId=$item.EntryID; outlookGlobalAppointmentId=$item.GlobalAppointmentID } }
  }
  if ($Action -eq 'cal.cancel') {
    $item=Find-Appt $p; if (-not $item) { Fail 'ITEM_NOT_FOUND' }
    if ($item.MeetingStatus -eq 1) {
      $item.MeetingStatus=5
      if ($p.cancelComment) { $item.Body = $p.cancelComment + "`r`n`r`n" + $item.Body }
      if ($p.mode -eq 'display') { $item.Display($false) } else { $item.Send(); $item.Delete() }
    } else { $item.Delete() }
    Out-Result @{ ok=$true; status='cancelled' }
  }
}
catch { Fail (Map-Error $_) $_.Exception.Message }
```

> **Agent note:** the script stores the app's IDs with `PropertyAccessor` in the `PS_PUBLIC_STRINGS` namespace, so `Restrict` with `@SQL` can find them. Verify on a test machine that the property survives into the Sent Items copy. If it does not, fall back to matching on `Subject` and `SentOn` within ±5 minutes, and record the result as `submitted` rather than `submitted_verified` — never claim `submitted_verified` without the Sent Items hit.

### 2.5 Node side (main process)

```ts
import { spawn } from 'node:child_process';
import path from 'node:path';
import { app } from 'electron';

const scriptPath = app.isPackaged
  ? path.join(process.resourcesPath, 'outlook', 'outlook-bridge.ps1')
  : path.join(__dirname, '..', 'resources', 'outlook', 'outlook-bridge.ps1');

let queue: Promise<unknown> = Promise.resolve();

export function bridge<T = any>(action: string, payload?: object, timeoutMs = 45000): Promise<T> {
  const run = () => new Promise<T>((resolve) => {
    const ps = spawn('powershell.exe',
      ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File', scriptPath, '-Action', action],
      { windowsHide: true });
    let out = '', err = '';
    const timer = setTimeout(() => { ps.kill(); resolve({ ok:false, status:'failed', errorCode:'TIMEOUT' } as T); }, timeoutMs);
    ps.stdout.setEncoding('utf8').on('data', d => out += d);
    ps.stderr.setEncoding('utf8').on('data', d => err += d);
    ps.on('close', () => {
      clearTimeout(timer);
      try { resolve(JSON.parse(out.trim().split(/\r?\n/).pop()!)); }
      catch { resolve({ ok:false, status:'failed', errorCode:'UNKNOWN', message: err || out } as T); }
    });
    ps.stdin.end(payload ? Buffer.from(JSON.stringify(payload), 'utf8') : '');
  });
  const next = queue.then(run, run);   // serial queue for mail and calendar together
  queue = next.catch(() => undefined);
  return next;
}
```

### 2.6 Object Model Guard (security prompts)

- Classic Outlook may show *"A program is trying to send an email on your behalf"* or *"…access email addresses"* when the antivirus status is not recognized as valid.
- The user's answer to the prompt decides the result. If access is denied, return `COM_SECURITY_BLOCKED`.
- **MUST NOT** try to bypass, suppress, or auto-click the prompt, and **MUST NOT** change the Programmatic Access registry settings.
- `display` mode, the default, avoids most of these prompts because the user clicks Send in Outlook.

---

## 3. Mail Providers

### 3.1 Common rules for all mail providers (MUST)

1. **Templates:** message content comes from admin-managed bilingual templates. `TemplateService` replaces **validated placeholder tokens** such as `{{StudentName}}`, `{{ThesisTitle}}`, `{{DefenseDate}}`, and `{{CaseRef}}`. If any token is unknown or still unfilled after rendering → `VALIDATION_FAILED`. Never send with literal `{{...}}` text left in the message.
2. **HTML safety:** sanitize rendered HTML with an allow-list (for example `sanitize-html`): no scripts, no external images, no event attributes, inline styles only. Verify the library's current version before pinning it — a version remembered from training data is not a version.
3. **RTL:** Arabic templates set `direction: 'rtl'`, and the provider wraps the body in `<div dir="rtl">`. Mixed Arabic/English lines **SHOULD** use `<bdi>` around Latin-script names, IDs, and emails. The general RTL rules live in `rtl-tech-stack.md` and `bidirectional-design-principles.md`; this file only adds the email-specific binding.
4. **Always generate `bodyText`** alongside the HTML version — the fallback providers have no other source.
5. **Default `mode` = `display`.** `send` mode needs explicit in-app confirmation showing the subject, the recipient count, and the attachment count. A bulk send (more than one message) shows a single confirmation for the batch.
6. **Idempotency:** never send the same `messageId` twice. Before `send`, check the Email Log. If an entry exists with status `sent`, `submitted`, or `submitted_verified`, block the send and ask the user to confirm a **resend**, which creates a new `messageId` linked to the original.
7. **Bulk sending:** send messages one by one through the serial queue, one message per recipient group. **SHOULD** pause about 1–2 s between messages and stop the batch on the first `COM_SECURITY_BLOCKED`.
8. **Credentials:** temporary passwords are sent separately. **MUST NOT** log a password and **MUST NOT** keep one in the Email Log body snapshot. Store `[REDACTED]` instead.

### 3.2 Provider `mail.graph` — Microsoft Graph (RECOMMENDED, disabled)

Prerequisites: an app registration in the tenant, with the delegated permission **`Mail.Send`** added. Add `Mail.ReadWrite` only if drafts are created.

Flow (draft-then-send, so the app gets a message id):

| Step | HTTP |
|---|---|
| 1. Create draft | `POST /v1.0/me/messages` |
| 2. Add large attachments (> 3 MB) | `POST /v1.0/me/messages/{id}/attachments/createUploadSession` |
| 3. Send | `POST /v1.0/me/messages/{id}/send` → `202 Accepted` |

Simpler alternative when no tracking is needed: `POST /v1.0/me/sendMail` with `{ message, saveToSentItems: true }`. It returns 202 with no id.

Draft body:

```json
{
  "subject": "إشعار بموعد المناقشة — CASE-2026-0142",
  "body": { "contentType": "HTML", "content": "<div dir=\"rtl\">...</div>" },
  "toRecipients": [{ "emailAddress": { "address": "student@example.edu", "name": "..." } }],
  "ccRecipients": [], "bccRecipients": [],
  "importance": "normal",
  "internetMessageHeaders": [
    { "name": "x-app-message-id", "value": "<messageId>" },
    { "name": "x-app-case-ref",   "value": "<caseRef>" }
  ],
  "attachments": [
    { "@odata.type": "#microsoft.graph.fileAttachment", "name": "letter.pdf",
      "contentType": "application/pdf", "contentBytes": "<base64>" }
  ]
}
```

Rules:

- Inline (base64) attachments must be **≤ 3 MB each**. Larger files use an upload session. Reject anything over the configured maximum with `ATTACHMENT_TOO_LARGE`.
- Custom internet headers must start with `x-`.
- Graph has no `display` window. In `display` mode, show an **in-app preview** of the subject, recipients, rendered body, and attachments, and call `send` only when the user clicks Send in the app. In `draft` mode, stop after step 1; the draft appears in Outlook Drafts on every client.
- Status after `202` = `sent`. Persist `graphMessageId`.
- Graph does not insert the Outlook signature. **SHOULD** support an admin-managed signature block in templates instead.

### 3.3 Provider `mail.outlookCom` — Classic Outlook (ACTIVE NOW)

Uses `-Action mail.send` and `-Action mail.verifySent` (§2.4).

- **display (default):** Outlook opens a new message window with the signature, body, recipients, and attachments filled in. Status = `displayed_pending_user_send`. The app **MUST NOT** log the message as sent. Show "Pending send in Outlook", and offer **Check Sent Items** (runs `mail.verifySent`) and **Mark as sent manually**.
- **send:** after `Send()` succeeds, status = `submitted`. About 30 s later, run `mail.verifySent` once automatically. If a match is found → `submitted_verified`, with `SentOn` stored.
- **draft:** the message is saved to Drafts and `EntryID` is stored.
- **Signature:** with `keepSignature: true` (the default), the script calls `Display()` before inserting content so Outlook adds the default signature. In `send` mode with a signature, the window flashes briefly before sending; that is accepted. Set `keepSignature: false` for bulk sends.
- **Sending account:** if the user has several accounts, `fromAccount` selects one through `SendUsingAccount`. If it is not found → `ACCOUNT_NOT_FOUND`. The Settings screen lists the accounts returned by `detect`.
- **Unresolved recipients:** in `send` mode → `RECIPIENT_UNRESOLVED`, listing the addresses. In `display` mode → still open the window; Outlook underlines the bad address.
- **Outbox:** if Outlook was closed, COM starts it in the background and the message may wait in the Outbox until Outlook syncs. Do not quit Outlook (§2.1 rule 7). The UI **SHOULD** recommend keeping Outlook open while sending.

### 3.4 Provider `mail.owaDeeplink` — Outlook on the web (FALLBACK)

- URL: `https://outlook.office.com/mail/deeplink/compose?to=<a;b>&cc=<…>&subject=<…>&body=<…>`. URL-encode every value with `encodeURIComponent`.
- Open it with `shell.openExternal()` only after checking that the URL starts with `https://outlook.office.com/`.
- Limits, which the UI MUST show:
  - Not officially documented, so it may change.
  - Plain text only (`bodyText`), with no RTL formatting.
  - **No attachments:** offer **Open attachments folder** (`shell.showItemInFolder`) so the user can drag them in.
  - Keep the URL under about 2,000 characters. If it is longer, truncate the body, copy the full body to the clipboard, and tell the user.
- Status = `handed_off`. The user can mark the message as sent manually.

### 3.5 Provider `mail.mailto` — default mail app (LAST RESORT)

- `mailto:a@x,b@y?cc=…&bcc=…&subject=…&body=…`. Encode values with `encodeURIComponent`; line breaks are `%0D%0A`.
- Plain text, no attachments, length limit about 2,000 characters. Handle these the same way as in §3.4.
- This opens whichever mail app is the Windows default, which may be new Outlook. The app cannot know the outcome. Status = `handed_off`.

---

## 4. Calendar Providers

### 4.1 Provider `cal.graph` — Microsoft Graph (RECOMMENDED, disabled)

Permission: delegated `Calendars.ReadWrite`.

| Operation | HTTP |
|---|---|
| Create | `POST /v1.0/me/events` |
| Update | `PATCH /v1.0/me/events/{id}` |
| Cancel (notifies attendees) | `POST /v1.0/me/events/{id}/cancel` with `{ "comment": "..." }` |

```json
{
  "subject": "مناقشة رسالة الماجستير — CASE-2026-0142",
  "body": { "contentType": "Text", "content": "..." },
  "start": { "dateTime": "2026-12-10T10:00:00", "timeZone": "Arab Standard Time" },
  "end":   { "dateTime": "2026-12-10T12:00:00", "timeZone": "Arab Standard Time" },
  "location": { "displayName": "Room 101" },
  "attendees": [{ "emailAddress": { "address": "examiner@example.edu" }, "type": "required" }],
  "reminderMinutesBeforeStart": 30,
  "transactionId": "<meetingId>"
}
```

- `transactionId` = `meetingId`, so retries do not create duplicates. Persist `graphEventId`.
- When attendees are included, Exchange sends the invitations from the user's mailbox. `display` mode uses an in-app preview before the call. `saveOnly` creates the event without attendees.
- Optional Teams link: `isOnlineMeeting: true`, `onlineMeetingProvider: "teamsForBusiness"`, controlled by a config flag.

### 4.2 Provider `cal.outlookCom` — Classic Outlook (ACTIVE NOW)

Uses `cal.create`, `cal.update`, and `cal.cancel` (§2.4).

- **Default mode = `display`:** the filled-in meeting window opens and the user clicks Send. Status = `displayed_pending_user_send`.
- `send` mode only after in-app confirmation.
- **Updates** to a sent meeting **MUST** be sent as meeting updates on the same item, never as a new meeting.
- **Cancel MUST** use `MeetingStatus = 5` followed by `Send()`.
- Items are found by `EntryID` first, then by the `AppMeetingId` property.
- A fixed-offset zone (UTC+03:00, no DST) is the easy case; COM interprets times in the machine's local time zone. If Windows is not set to the intended zone, **SHOULD** warn the user before creating.

### 4.3 Provider `cal.owaDeeplink` — Outlook on the web (FALLBACK)

- `https://outlook.office.com/calendar/deeplink/compose?subject=…&body=…&location=…&startdt=2026-12-10T10:00:00+03:00&enddt=…`
- Do not add `/0/` after `/calendar/` — that form has broken before. The URL is not officially documented and does not support recurrence.
- Attendees cannot reliably be pre-filled. Copy them to the clipboard and tell the user to paste them.
- Status = `handed_off`, `supportsUpdate = false`.

### 4.4 Provider `cal.ics` — iCalendar file (LAST RESORT, disabled)

- RFC 5545 with `METHOD:REQUEST`, `UID:<meetingId>@example.edu`, and `SEQUENCE` incremented on each update. Include `ORGANIZER`, `ATTENDEE`, and `DTSTART;TZID=<zone>` with a `VTIMEZONE` block, or use UTC `Z` times.
- Write the file to `app.getPath('temp')`, open it with `shell.openPath()`, and delete it after 10 minutes. Use CRLF line endings and UTF-8, and fold lines longer than 75 octets.
- Cancellation uses the same `UID` with a higher `SEQUENCE`, plus `METHOD:CANCEL` and `STATUS:CANCELLED`.

---

## 5. Provider Selection and Fallback

```ts
async function select<P extends { id: string; isAvailable(): Promise<{available:boolean}> }>(
  order: string[], registry: Record<string, P>, flags: Record<string, boolean>): Promise<P | null> {
  for (const id of order) {
    if (!flags[id]) continue;
    if ((await registry[id].isAvailable()).available) return registry[id];
  }
  return null;
}
// mail:     ['mail.graph','mail.outlookCom','mail.owaDeeplink','mail.mailto']
// calendar: ['cal.graph','cal.outlookCom','cal.owaDeeplink','cal.ics']
```

- **Capability check before fallback:** if the message has attachments or needs HTML, skip providers that do not support them. If none is left, show the limitation (§3.4) and let the user decide to continue without attachments.
- When dropping to a lower provider, **MUST** show the reason (the bilingual message from §7). The user chooses whether to continue.
- **Calendar update and cancel MUST use the provider that created the meeting.** If that provider is unavailable, show a clear message and never create a silent duplicate.
- **Settings screen:** for each feature, show the active provider, the detection result, and the Outlook accounts found, plus **Test connection** and **Send test email to myself** buttons. The test email uses `send` mode and goes to the user's own address.

---

## 6. Electron Security and IPC

- Renderer settings: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- The preload script exposes only:
  ```ts
  contextBridge.exposeInMainWorld('outlook', {
    status: () => ipcRenderer.invoke('outlook:status'),
    mail:     { send: (p) => ipcRenderer.invoke('mail:send', p),
                verify: (messageId) => ipcRenderer.invoke('mail:verify', messageId) },
    calendar: { create: (p) => ipcRenderer.invoke('calendar:create', p),
                update: (p) => ipcRenderer.invoke('calendar:update', p),
                cancel: (p) => ipcRenderer.invoke('calendar:cancel', p) },
  });
  ```
- Main **MUST** validate every payload with a schema library such as `zod`:
  - Emails must be valid; at least one `to` recipient; 100 recipients or fewer.
  - Subject 255 characters or fewer; body 500 KB or less.
  - `endLocal` must be later than `startLocal`.
  - Unknown values for `mode` or `type` are rejected.
- **Attachment paths (MUST):** the renderer may only send attachment **IDs**. Main resolves each ID to a path inside the allowed folders — the app's generated-documents folder and the case archive folder. Main rejects anything else, rejects symlinks that point outside those folders, and blocks executable types (`.exe .bat .cmd .ps1 .js .vbs .msi .lnk`) → `ATTACHMENT_NOT_ALLOWED`. The size limit is configurable, with a default total of 20 MB → `ATTACHMENT_TOO_LARGE`. The general file-handling rules live in `file-upload-security.md`; this is the Outlook-specific binding.
- **MUST NOT** build PowerShell commands from user data. Data goes only through stdin JSON.
- **MUST NOT** run the app elevated.
- Sign the app and the bundled `.ps1` when code signing is available (`electron-auto-update.md` covers the signing path).

---

## 7. User-Facing Messages (bilingual, RTL-aware)

| Code | العربية | English |
|---|---|---|
| `OUTLOOK_NOT_INSTALLED` | لم يُعثر على Outlook الكلاسيكي على هذا الجهاز. | Classic Outlook was not found on this device. |
| `NEW_OUTLOOK_ACTIVE` | يعمل Outlook الجديد حاليًّا، ولا يدعم الربط المباشر. حوِّل إلى Outlook الكلاسيكي من مفتاح «Outlook الجديد»، أو تابع عبر Outlook على الويب. | New Outlook is active and doesn't support direct integration. Switch back to classic Outlook using the "New Outlook" toggle, or continue via Outlook on the web. |
| `OUTLOOK_PROFILE_MISSING` | لم يُضبط حساب بريد في Outlook. | No mail profile is configured in Outlook. |
| `COM_ELEVATION_MISMATCH` | تعذّر الاتصال بـ Outlook؛ لا تشغّل التطبيق «كمسؤول». | Could not connect to Outlook. Don't run the app "as administrator". |
| `COM_SECURITY_BLOCKED` | رُفض الوصول من نافذة أمان Outlook. | Access was denied by Outlook's security prompt. |
| `ACCOUNT_NOT_FOUND` | حساب الإرسال المحدد غير موجود في Outlook. | The selected sending account isn't configured in Outlook. |
| `RECIPIENT_UNRESOLVED` | تعذّر التحقق من بعض عناوين المستلمين: | Some recipient addresses couldn't be resolved: |
| `ATTACHMENT_NOT_ALLOWED` | المرفق غير مسموح به أو غير موجود. | The attachment isn't allowed or wasn't found. |
| `ATTACHMENT_TOO_LARGE` | حجم المرفقات يتجاوز الحد المسموح. | The attachments exceed the allowed size. |
| `ITEM_NOT_FOUND` | لم يُعثر على العنصر في Outlook؛ ربما حُذف يدويًّا. | The item wasn't found in Outlook; it may have been deleted manually. |
| `TIMEOUT` | لم يستجب Outlook في الوقت المحدد؛ تحقّق من عدم وجود نافذة حوار مفتوحة فيه. | Outlook didn't respond in time. Check for an open dialog in Outlook. |
| `GRAPH_NOT_CONSENTED` | الربط عبر Microsoft 365 غير مفعّل بعدُ من إدارة تقنية المعلومات. | Microsoft 365 integration isn't enabled by IT yet. |
| *(fallback notice)* | سيُفتح البريد عبر المتصفح دون مرفقات أو تنسيق؛ أرفق الملفات يدويًّا. | The message will open in the browser without attachments or formatting; attach files manually. |

Show every Arabic string inside the app's RTL container, with Arabic-Indic numerals in Arabic UI text.

---

## 8. Configuration

```json
{
  "outlook": {
    "mail": {
      "providers": { "mail.graph": false, "mail.outlookCom": true, "mail.owaDeeplink": true, "mail.mailto": true },
      "defaultMode": "display",
      "keepSignature": true,
      "defaultFromAccount": "",
      "maxAttachmentsTotalMB": 20,
      "bulkDelayMs": 1500,
      "autoVerifySentAfterMs": 30000
    },
    "calendar": {
      "providers": { "cal.graph": false, "cal.outlookCom": true, "cal.owaDeeplink": true, "cal.ics": false },
      "defaultMode": "display",
      "defaultReminderMinutes": 30,
      "teamsOnlineMeeting": false
    },
    "graph": {
      "clientId": "", "tenantId": "",
      "scopes": ["User.Read", "Calendars.ReadWrite", "Mail.Send", "offline_access"]
    },
    "com": { "timeoutMs": 45000 }
  }
}
```

Admins can edit this file. Turning on any Graph provider requires `clientId` and `tenantId`; without them, `isAvailable()` returns `GRAPH_NOT_CONSENTED`. `clientId` and `tenantId` are deployment configuration — never commit real values to the repository (`environment-management.md`).

---

## 9. Persistence and Audit

### 9.1 Email Log (one record per message attempt)

| Field | Notes |
|---|---|
| `messageId`, `caseRef`, `templateId`, `templateVersion` | |
| `recipients` (to/cc/bcc) | |
| `subject` | |
| `bodySnapshot` | Rendered HTML; secrets replaced with `[REDACTED]` |
| `attachments` | File names and SHA-256 hashes, not the file contents |
| `provider`, `mode`, `fromAccount` | |
| `status` | From `MailStatus` |
| `errorCode`, `message` | Technical message only |
| `createdAt`, `submittedAt`, `verifiedAt`, `sentOn` | |
| `resendOf` | The original `messageId`, if this is a resend |

### 9.2 Meeting record

`meetingId`, `caseRef`, `MeetingRef`, `status`, `lastSyncedAt`, `icsSequence`, and a history array.

### 9.3 Rules

- **MUST NOT** log tokens, passwords, or attachment contents.
- Write an audit log entry for every mail send and every calendar create, update, or cancel attempt.
- The Email Log is an audit artifact, not a second copy of the message: it records what was sent, where, and when — never the credential itself.

---

## 10. Acceptance Tests

### 10.1 Mail

| # | Scenario | Expected |
|---|---|---|
| M1 | Classic Outlook, `display`, bilingual RTL template, 2 To + 1 CC, 1 PDF | Outlook message window opens with signature, RTL body, correct recipients, and the attachment; status `displayed_pending_user_send` |
| M2 | `send` after confirmation | Message delivered; status `submitted`, then `submitted_verified` with `SentOn` |
| M3 | `draft` | Message appears in Drafts; `EntryID` stored |
| M4 | Template with an unfilled `{{DefenseDate}}` | `VALIDATION_FAILED`; nothing sent |
| M5 | Attachment path outside the allowed folders, or a `.exe` | `ATTACHMENT_NOT_ALLOWED` |
| M6 | Attachments totalling 25 MB | `ATTACHMENT_TOO_LARGE` |
| M7 | Invalid recipient in `send` mode | `RECIPIENT_UNRESOLVED` with the address listed |
| M8 | `fromAccount` not in the profile | `ACCOUNT_NOT_FOUND` |
| M9 | The same `messageId` sent twice | Second attempt blocked; a resend needs confirmation and gets a new linked id |
| M10 | Bulk send of 10 messages, guard prompt denied at message 3 | Batch stops at message 3; messages 1–2 logged; `COM_SECURITY_BLOCKED` |
| M11 | `UseNewOutlook = 1` | `NEW_OUTLOOK_ACTIVE`; the OWA/mailto fallback is offered with the limitations notice |
| M12 | Fallback with an attachment | Notice shown; attachments folder opened; status `handed_off` |
| M13 | Credentials email | Password not in the Email Log (`[REDACTED]`) |
| M14 | Subject containing `"; Remove-Item C:\` | Treated as literal text |
| M15 | Graph flag on with consent (future) | Draft created then sent; `graphMessageId` stored; works on new Outlook |

### 10.2 Calendar

| # | Scenario | Expected |
|---|---|---|
| C1 | `display`, 3 attendees, Arabic text | Meeting window filled correctly; `EntryID` stored |
| C2 | `send` | Invitations received; status `created` |
| C3 | `saveOnly` | Appointment only, no invitations |
| C4 | Time changed on a sent meeting | Attendees receive an **update** |
| C5 | `EntryID` invalid | Found through `AppMeetingId`; update succeeds |
| C6 | Cancel | Attendees receive a cancellation |
| C7 | App run elevated | `COM_ELEVATION_MISMATCH` |
| C8 | Outlook blocked by a modal dialog | `TIMEOUT` after 45 s; the queue continues |
| C9 | Mail and calendar actions triggered at the same moment | Run one at a time; both succeed |
| C10 | Meeting created through COM, user later on new Outlook, tries an update | Clear message; no silent duplicate |

---

## 11. Migration Path to Graph (when IT approves)

1. Fill in `clientId` and `tenantId`, and confirm consent for `Calendars.ReadWrite` and `Mail.Send`.
2. Turn on `mail.graph` and `cal.graph`. New items go through Graph automatically, since it is priority 1.
3. Existing COM-created meetings keep `cal.outlookCom` for update and cancel while classic Outlook is available. Optionally, re-link them by finding the Graph event through `iCalUId` / `GlobalAppointmentID` and rewriting `MeetingRef`.
4. Mail has no migration step, because sent messages are final. The Email Log keeps the original provider.
5. Drop the "Outlook installed/running" dependency from the product requirement, and update the feature documentation so the requirement and the implementation describe the same provider model.

---

## Appendix A — Request Text for IT (Graph permission)

> **Subject:** Request for Microsoft Entra app registration — internal desktop app
>
> We request an app registration in the organization's Entra ID tenant for an internal Electron desktop application used by administrative staff.
> - Type: public client (mobile and desktop), redirect URI `http://localhost`
> - **Delegated permissions only:** `User.Read`, `Calendars.ReadWrite`, `Mail.Send`, `offline_access` (optionally `Mail.ReadWrite` for drafts)
> - No application permissions and no client secret; the app acts only as the signed-in user
> - Purpose: send official email from that user's own mailbox, and create, update, and cancel meetings in their own calendar
> - Admin consent requested if user consent is restricted

---

## Appendix B — References

- Microsoft Graph: *Create event* (`POST /me/events`), *Update event*, *event: cancel*
- Microsoft Graph: *Create message* (`POST /me/messages`), *message: send*, *user: sendMail*, *attachment: createUploadSession*
- Microsoft: *Feature comparison between new Outlook and classic Outlook* (COM add-ins, VBA, Outlook Object Model, and MAPI are not supported in new Outlook)
- Outlook Object Model (Microsoft Learn): `MailItem`, `AppointmentItem`, `Recipients`, `Attachments.Add`, `SendUsingAccount`, `PropertyAccessor`, `Items.Restrict`, Object Model Guard

---

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| **Building the PowerShell command from user data** | A subject line becomes an injection vector; Arabic text is corrupted by the command line | Pass UTF-8 JSON on stdin; the action is the only argument (§2.1) |
| **Native Node COM modules (`winax`, `edge-js`)** | A native rebuild for every Electron version, and a build step that breaks on a new release | One bundled `.ps1` spawned with `child_process.spawn` (§2.1) |
| **Two COM bridges — one for mail, one for calendar** | Two queues over one Outlook instance; the second call fails unpredictably | One shared `OutlookBridge` with one serial queue (§The Architecture) |
| **Quitting Outlook after a send** | Sent mail sits in the Outbox, sometimes indefinitely | Never call `Outlook.Application.Quit()` (§2.1 rule 7) |
| **Running the app elevated** | `COM_ELEVATION_MISMATCH` — Outlook and the app must share an integrity level | Never elevate; tell the user to relaunch without elevation (§2.2) |
| **Sending a meeting invitation as a regular email with an attachment** | The meeting is not on the calendar, and the attendee list is unmanaged | Calendar providers own invitations; the mail providers own letters (§1) |
| **Auto-sending, or auto-confirming a bulk batch** | One bad template becomes N bad official emails | Default `mode` = `display`; one explicit confirmation per batch (§3.1) |
| **Treating `submitted` as `sent`** | The Email Log claims a delivery the user never saw | Verify in Sent Items; `submitted_verified` only on the hit (§3.3) |
| **Silently dropping to a provider that cannot carry attachments** | The user believes a letter went out with the file attached | Show the limitation and let the user decide (§5) |
| **Updating a meeting through a different provider than created it** | A duplicate meeting appears, and the attendees get two invites | Update and cancel always use the creating provider (§5) |
| **Logging the body snapshot with a credential in it** | The Email Log becomes a plaintext credential store | Store `[REDACTED]`; never log passwords (§3.1, §9) |
| **Pinning a dependency version from memory** | Training data is stale; the install fails or ships a vulnerable version | Check the current stable version with `npm view` before pinning (§3.1) |
| **Suppressing the Object Model Guard prompt** | It bypasses a security control the user owns, and hides the failure | Report `COM_SECURITY_BLOCKED`; never touch the registry (§2.6) |

---

## Key Takeaways

1. **New Outlook breaks COM.** Every COM provider here is transitional and Graph is the target; the provider flags exist so the app can run on both without a rewrite (§1).
2. **One bridge, one queue.** A single bundled PowerShell script, spawned with the action as its only argument, fed UTF-8 JSON on stdin, answering one JSON line on stdout, serialized across mail and calendar (§2).
3. **The default is `display`, not `send`.** The user reviews the filled-in message in Outlook and clicks Send; the app never sends on its own without an explicit in-app confirmation (§3.1, §4.2).
4. **Never build a command from user data, and never elevate.** Injection and integrity-level mismatch are the two failures that a payload built in the renderer or an elevated shortcut produces (§6).
5. **Submitted is not sent.** Only a Sent Items hit upgrades the status; the log records the real outcome, with credentials redacted (§3.3, §9).
6. **Fallback is a decision, not a silent downgrade.** Every capability loss — attachments, HTML, updates — is shown before the user continues (§5).
7. **Bilingual output is a first-class requirement.** The message catalogue is part of the interface, and the Arabic strings belong in the RTL container (§7).

---

## Cross-References

- **Depends on:** `electron-auto-update.md` — packaging, `extraResources`, code signing for the bundled script
- **Depends on:** `security-engineering.md` — renderer hardening, secrets, sanitization
- **Depends on:** `file-upload-security.md` — file handling, size limits, allow-lists
- **Depends on:** `rtl-tech-stack.md` — RTL containers, Arabic-Indic numerals, bidirectional text
- **Depends on:** `bidirectional-design-principles.md` — `<bdi>` and mixed-script layout
- **Applied by:** `error-handling-philosophy.md` — the `BridgeErrorCode` taxonomy and its user-facing mapping
- **See also:** `testing-patterns.md` — turning §10 into executable acceptance tests
- **See also:** `agent-verification-loop.md` — proving the acceptance bar before declaring the feature done
- **See also:** `typescript-conventions.md` — the provider interfaces and the IPC payload types
- **See also:** `adr-template.md` — recording the provider-model decision instead of guessing in code
- **See also:** `environment-management.md` — keeping `clientId` / `tenantId` out of the repository
