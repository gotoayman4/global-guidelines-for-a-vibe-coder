# Notification Patterns

**Status:** Normative  
**Scope:** Global  
**Token Tier:** Low (~1,500 tokens)  
**Last Updated:** 2026-05-24
**Cross-References:** `form-patterns.md`, `error-handling-philosophy.md`, `accessibility-standards.md`, `mui-styling.md`

---

## Purpose

This guide defines the standardized notification/snackbar pattern for providing user feedback across the application. It establishes a consistent API, styling, timing, accessibility, and internationalization strategy — so every notification behaves predictably.

---

## Architecture

### Two Components

1. **Notification Hook** — manages snackbar state, provides typed helper methods per severity level.
2. **Global Notification Component** — standardized renderer with consistent styling, timing, and transitions.

### Usage Pattern

```typescript
function MyPage() {
  const { snack, showSuccess, showError, showWarning, showInfo, hideSnackbar } = useSnackbar();

  const handleSave = async () => {
    try {
      await saveData();
      showSuccess('common.saveSuccess');
    } catch {
      showError('common.saveError');
    }
  };

  return (
    <Box>
      {/* Page content */}
      <GlobalSnackbar state={snack} onClose={hideSnackbar} />
    </Box>
  );
}
```

---

## Hook API

| Method | Purpose |
|---|---|
| `showSuccess(key, params?)` | Successful operation |
| `showError(key, params?)` | Operation failed |
| `showWarning(key, params?)` | Non-blocking warning |
| `showInfo(key, params?)` | Neutral information |
| `hideSnackbar()` | Dismiss the current notification |

### State Shape

```typescript
interface SnackbarState {
  open: boolean;
  messageKey: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  params?: Record<string, unknown>;
}
```

### Interpolation

For dynamic values in messages:

```typescript
showSuccess('translations.syncSuccess', { arCount: 10, enCount: 15 });

// i18n key:
// "syncSuccess": "Synced {{arCount}} Arabic and {{enCount}} English translations"
```

---

## Configuration Standards

### Timing

- **Auto-hide duration:** 4,000ms (4 seconds)
- **Transition timeout:** 300ms
- **Rationale:** Sufficient time to read without being intrusive.

### Styling

- **Variant:** `filled` (solid background)
- **Position:** Bottom center (`{ vertical: 'bottom', horizontal: 'center' }`)
- **Width:** Full width (responsive)
- **Elevation:** Theme shadow, elevated appearance

### Accessibility

- **ARIA role:** `role="status"` (via Alert component)
- **ARIA live:** `aria-live="polite"` (non-intrusive announcements)
- **Keyboard:** Close button is focusable and activatable
- **Color contrast:** Theme ensures WCAG AA compliance for all severity colors
- **Screen reader:** Message text announced automatically

### Internationalization

- **All messages use translation keys** — never hardcoded strings.
- Interpolation supported via the `params` argument.
- Fallback: if a translation key is missing, i18next returns the key itself (visible signal to fix).

---

## Best Practices

### DO

- Use the notification hook in every page/component that needs feedback.
- Use translation keys for all messages.
- Choose the appropriate severity level for the context.
- Use interpolation for dynamic values.
- Call `hideSnackbar` in the `onClose` prop.

### DON'T

- Import `Snackbar` or `Alert` from MUI directly for page-level notifications.
- Hardcode message strings in components.
- Create local snackbar state with `useState`.
- Use different `autoHideDuration` values across pages.
- Bypass the hook to manipulate state directly.

---

## Severity Guidelines

| Severity | When to Use | Example |
|---|---|---|
| `success` | Operation completed successfully | "Program saved", "Import complete" |
| `error` | Operation failed | "Save failed", "Network error" |
| `warning` | Non-critical issue | "Unsaved changes", "Approval required" |
| `info` | Neutral status update | "Processing...", "Scan complete" |

---

## When NOT to Use Notifications

- **Inline validation errors** — show next to the form field, not as a snackbar.
- **Persistent status indicators** — use banners or status badges, not auto-dismissing snackbars.
- **Critical blocking alerts** — use a confirmation dialog or full-page alert, not a dismissible snackbar.

---

## Common Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Direct MUI `Snackbar`/`Alert` in pages | Use the shared hook and component |
| Hardcoded message strings | Use i18n keys |
| Different timing per page | Use standardized 4-second duration |
| No close button | Always provide a way to dismiss |
| Multiple simultaneous notifications | Queue them — show one at a time |
| Error messages without error codes | Include machine-readable codes for debugging |

---

## Key Takeaways

1. **One hook, one component** — consistent notification behavior everywhere.
2. **i18n keys, not hardcoded strings** — translatable, maintainable.
3. **Standardized timing and styling** — predictable user experience.
4. **Appropriate severity** — success, error, warning, info each signal different things.
5. **Accessible by default** — `role="status"`, `aria-live`, keyboard close.
6. **Notifications ≠ inline validation** — use the right pattern for the right context.

---

## Cross-References

- [Form Patterns](./form-patterns.md) — inline validation errors vs notifications
- [Error Handling Philosophy](../../02-engineering-practices/error-handling-philosophy.md) — error taxonomy
- [Accessibility Standards](../../02-engineering-practices/accessibility-standards.md) — WCAG notification requirements
- [MUI Styling Guide](../../05-stack-guides/mui/mui-styling.md) — theme and styling
