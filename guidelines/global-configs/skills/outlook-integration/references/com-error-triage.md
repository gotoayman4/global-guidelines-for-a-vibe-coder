# COM / Graph triage — what the user sees, and what it means

Read this when a send or a meeting operation failed, hung, or half-worked. The guideline holds the
rule; this file holds the triage. Work down the table: find the symptom, take the action, then read
the guideline section named in the last column before changing any code.

## Triage

| What the user sees | Error code | What actually happened | Action | Rule |
|---|---|---|---|---|
| "Could not connect to Outlook. Don't run the app 'as administrator'." | `COM_ELEVATION_MISMATCH` | The app and Outlook run at different integrity levels, and COM refuses to cross that boundary | Relaunch the app without elevation; never ship a "run as administrator" shortcut | §2.2 |
| The status is `submitted`, the mail never arrived, and Outlook shows nothing in Sent Items | — (the status is honest) | `Send()` handed the item to the Outbox; Outlook was closed or offline and the item is still waiting | Run `mail.verifySent` later, and keep Outlook open while sending; never quit Outlook from the script | §2.1 rule 7, §3.3 |
| The status says `submitted_verified` but the user says nothing was sent | — | The Sent Items hit matched a different message — a non-unique tracking property | Make `AppMessageId` unique per message, and confirm the property survives into the Sent Items copy | §2.4 agent note |
| A dialog in Outlook says *"A program is trying to send an email on your behalf"*, and the send failed | `COM_SECURITY_BLOCKED` | The Object Model Guard denied access | Do not suppress it and do not touch the registry; move that flow to `display` mode so the user clicks Send in Outlook | §2.6, §3.1 |
| Nothing happens for 45 s, then the call returns | `TIMEOUT` | Outlook is blocked by a modal dialog, or the profile is still loading | Close the Outlook dialog; the serial queue continues with the next call | §2.1 rule 4, §10 C8 |
| "Some recipient addresses couldn't be resolved: …" | `RECIPIENT_UNRESOLVED` | An address is not in the Outlook address book and the mode was `send` | Fix the address, or send in `display` mode and let Outlook underline the bad one | §3.3 |
| "The selected sending account isn't configured in Outlook." | `ACCOUNT_NOT_FOUND` | `fromAccount` matches no account's `SmtpAddress` | Choose from the accounts returned by `detect` (Settings screen) | §3.3 |
| "Classic Outlook was not found on this device." | `OUTLOOK_NOT_INSTALLED` | `App Paths\OUTLOOK.EXE` is absent under HKLM and HKCU | Install classic Outlook, or fall back to the OWA/mailto chain with its limitations shown | §2.2 |
| "New Outlook is active and doesn't support direct integration." | `NEW_OUTLOOK_ACTIVE` | `UseNewOutlook = 1`; new Outlook has no COM, no VBA, no MAPI | Fall back to OWA/mailto, or move to Graph once IT consents | §1.2, §2.2 |
| "No mail profile is configured in Outlook." | `OUTLOOK_PROFILE_MISSING` | Outlook has no account configured at all | Configure the account — the app cannot send from a mailbox that does not exist | §2.2 |
| "The attachment isn't allowed or wasn't found." | `ATTACHMENT_NOT_ALLOWED` | The renderer sent a path outside the allowed folders, or a blocked extension | The renderer sends attachment **IDs**; main resolves them and applies the allow-list | §6 |
| "The attachments exceed the allowed size." | `ATTACHMENT_TOO_LARGE` | The total is over the configured limit (default 20 MB) | Reduce the batch, or raise `maxAttachmentsTotalMB` deliberately | §6, §8 |
| "Pending send in Outlook" and the user is unsure whether it went | `displayed_pending_user_send` | The window is open and the user has not clicked Send | Offer **Check Sent Items** and **Mark as sent manually** | §3.3 |
| The message opened in a browser, with no attachment and no formatting | `handed_off` | The OWA/mailto fallback: no attachments, plain text, no RTL | Attach manually — the app cannot know the outcome, and must not pretend it does | §3.4, §3.5 |
| The meeting exists twice | — | Update or cancel went through a different provider than the one that created it | Update and cancel always on the creating provider; if it is unavailable, say so | §5 |
| A `{{Token}}` reached the message body | `VALIDATION_FAILED` | The token was unknown, or still unfilled after rendering | Fix the template or the renderer; never send literal `{{...}}` text | §3.1 |
| A Graph call returns 401 or 403 | `GRAPH_AUTH_FAILED` / `GRAPH_NOT_CONSENTED` | No consent, no token, or a missing delegated scope | IT consent first; the Graph providers stay disabled until then | §11 |

## Evidence to capture before changing anything

1. **The status and the error code** the app recorded — not what the user believes happened. `submitted` and `submitted_verified` are different facts.
2. **Whether a window is open in Outlook right now.** A modal dialog in Outlook is the cause of most `TIMEOUT` reports, and the user can see it faster than a log can.
3. **The Outlook version and the account list** from `detect`. New Outlook and classic Outlook produce the same symptom for different reasons.
4. **The mode that was requested** — `display`, `send`, or `draft`. Most "it didn't send" reports are a `display` that the user did not complete.
5. **Whether the app was launched elevated.** One launch flag explains a whole class of failures.

## The two silent failures worth testing for

- **Submitted is not sent.** A status that stops at `submitted` is not a bug; a status that claims `submitted_verified` without a Sent Items hit is. Only the second one lies.
- **A duplicated `messageId` sends twice.** The idempotency check lives in the Email Log, not in Outlook, so a second attempt is blocked only if the log was written before the send. Test the second attempt explicitly, not by reading the code.

## Do not

- Do not suppress, auto-click, or pre-empt the Object Model Guard prompt, and do not edit the Programmatic Access registry settings.
- Do not call `Outlook.Application.Quit()` — sent mail can then sit in the Outbox with no explanation.
- Do not suppress a `TIMEOUT` by raising the budget without reading the Outlook window first; the timeout is reporting a dialog, not being slow.
- Do not "fix" a `RECIPIENT_UNRESOLVED` by skipping resolution — the address is unverified, and skipping the check just moves the failure to the recipient.
- Do not fall back to a provider that drops attachments or HTML without telling the user what was dropped.
