---
status: "Normative"
scope: "Global"
tags: [notifications, toast, snackbar]
---

# Notification Patterns

---

## Architecture

ONE notification hook + ONE global snackbar component — never raw MUI `Snackbar`/`Alert` in pages, never local `useState` snackbars.

```typescript
const { showSuccess, showError, showWarning, showInfo, hideSnackbar } = useSnackbar();
try { await saveData(); showSuccess('common.saveSuccess'); }
catch { showError('common.saveError'); }
```

## Directives

1. **Hook API:** `showSuccess` · `showError` · `showWarning` · `showInfo` · `hideSnackbar`. State shape: `{ open, messageKey, severity, params? }`.
2. **All messages are i18n keys** with interpolation (`showSuccess('sync', { count: 10 })`) — never hardcoded strings. Missing keys render the key itself (visible signal to fix).
3. **Standardized config everywhere:** auto-hide 4000ms · transition 300ms · `filled` variant · bottom-center position · theme elevation. Never vary timing per page.
4. **Severity semantics:** `success` operation completed · `error` operation failed · `warning` non-critical issue (unsaved changes) · `info` neutral status.
5. **Accessibility:** `role="status"` + `aria-live="polite"` · focusable close button · WCAG AA contrast via theme · queued one-at-a-time.
6. **Notifications are NOT for everything:** inline field validation errors stay next to the field · persistent statuses use banners/badges, not auto-dismissing snackbars · critical blocking alerts use confirmation dialogs.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Direct Snackbar/Alert in pages | Shared hook + component |
| Hardcoded message strings | i18n keys |
| Varying durations per page | Standard 4s |
| No dismiss option | Close always available |
| Simultaneous stacked notifications | Queue |

## Cross-References

`form-patterns.md` · `error-handling-philosophy.md` · `dialog-patterns.md`
