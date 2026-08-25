# Dialog Patterns

**Status:** Normative  
**Scope:** Global  
**Token Tier:** Low (~1,500 tokens)  
**Last Updated:** 2026-05-24
**Cross-References:** `form-patterns.md`, `notification-patterns.md`, `accessibility-standards.md`, `react-architecture.md`

---

## Purpose

This guide defines dialog/modal patterns for React + MUI applications. It covers focus management, dialog types (confirmation, form, detail), unsaved changes protection, portal behavior, and accessibility — ensuring dialogs are predictable, safe, and accessible.

---

## Dialog Types

| Type | Use Case | Example |
|---|---|---|
| **Confirmation** | Destructive or irreversible actions | Delete, discard changes, approve |
| **Form** | Create/edit entities within a dialog | Add course, edit program details |
| **Detail** | View full entity details | View syllabus, show workflow history |
| **Multi-Step** | Complex creation flows | Multi-step wizard in a dialog |

---

## Focus Management

### The Problem

MUI `Dialog` opens a portal and calls `ariaHideOthers()`, setting `aria-hidden="true"` on `#root`. If the focused trigger element is still inside `#root`, the browser warns: *"Blocked aria-hidden on an element because its descendant retained focus"*.

### The Solution

Capture and restore focus safely:

```typescript
function MyComponent() {
  const triggerRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  const openDialog = () => {
    triggerRef.current = document.activeElement as HTMLElement;
    setOpen(true);
  };

  return (
    <>
      <Button onClick={openDialog}>Open Dialog</Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        disableRestoreFocus
        TransitionProps={{
          onExited: () => {
            triggerRef.current?.focus();
            triggerRef.current = null;
          },
        }}
      >
        {/* Dialog content */}
      </Dialog>
    </>
  );
}
```

**Key rules:**
1. Capture the trigger element before opening: `triggerRef.current = document.activeElement`.
2. Set `disableRestoreFocus` on `<Dialog>`.
3. Restore focus in `TransitionProps.onExited` (after close animation completes), not during `onClose`.

---

## Unsaved Changes in Form Dialogs

When a dialog contains an editable form:

```typescript
function CreateDialog({ open, onClose }) {
  const { isDirty, resetBaseline } = useUnsavedChanges({ ...formFields });
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowConfirmClose(true); // Show "Discard changes?" confirmation
    } else {
      resetBaseline();
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseAttempt}
      disableEscapeKeyDown={isDirty} // Prevent Escape while dirty
    >
      <DialogTitle>Create Item</DialogTitle>
      <DialogContent>{/* Form fields */}</DialogContent>
      <DialogActions>
        <Button onClick={handleCloseAttempt}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isDirty || saving}>
          Create
        </Button>
      </DialogActions>

      <UnsavedChangesConfirmDialog
        open={showConfirmClose}
        onDiscard={() => { setShowConfirmClose(false); resetBaseline(); onClose(); }}
        onKeep={() => setShowConfirmClose(false)}
      />
    </Dialog>
  );
}
```

**Rules:**
- Intercept close attempts — never let a dirty form close silently.
- Disable Escape key while dirty: `disableEscapeKeyDown={isDirty}`.
- Show a confirmation sub-dialog before discarding.
- On discard, reset the baseline before closing.

---

## Confirmation Dialogs

For destructive or irreversible actions, use a confirmation dialog:

```typescript
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  severity?: 'error' | 'warning';
}
```

**Rules:**
- Confirm button uses `severity` color: red for delete, orange for warning.
- Dialog title describes the action: "Delete Program?" not "Are you sure?".
- Message explains consequences: "This will permanently delete the program and all associated data."
- Cancel is always the default action (Escape closes safely).

---

## MUI `Select` Inside Dialogs

MUI `Select` renders its dropdown via a `Menu → Popover → Modal` chain, which triggers `ariaHideOthers()`. Inside a `Dialog`, this creates a second `Modal` that conflicts.

**Fix:** Add `MenuProps={{ disablePortal: true }}` to every `<Select>` inside a `Dialog` or `Drawer`:

```tsx
<Select
  value={value}
  onChange={handleChange}
  MenuProps={{ disablePortal: true }}
>
  <MenuItem value="option1">Option 1</MenuItem>
</Select>
```

This keeps the dropdown inside the dialog's DOM scope and prevents portal conflicts.

---

## Accessibility

- Dialogs must trap focus — Tab cycles through elements inside the dialog only.
- `aria-labelledby` on the dialog points to the dialog title.
- `aria-describedby` on the dialog points to the main content (for screen readers).
- Close button must have an accessible label: `aria-label="Close dialog"`.
- On open, focus the first focusable element (or the most logical one based on context).

---

## Common Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Multiple stacked dialogs | Nest at most 2 levels (main dialog + confirmation) |
| No focus restoration | Use `triggerRef + disableRestoreFocus + onExited` |
| Dirty form closes silently | Show unsaved changes confirmation |
| `Select` without `disablePortal` in dialogs | Add `MenuProps={{ disablePortal: true }}` |
| Closing on backdrop click with unsaved data | Intercept `onClose` with dirty check |
| Confirmation with vague messages | Describe consequences explicitly |
| Dialog without `aria-labelledby` | Point to dialog title |

---

## Key Takeaways

1. **Safe focus restoration** — `triggerRef` + `disableRestoreFocus` + `onExited`.
2. **Unsaved changes protection** — never close a dirty form silently.
3. **disablePortal for Selects in Dialogs** — prevents aria-hidden conflicts.
4. **Confirmation dialogs describe consequences** — not just "Are you sure?".
5. **At most 2 dialog levels** — main dialog + confirmation sub-dialog.
6. **Accessible by default** — labels, descriptions, focus trapping.

---

## Cross-References

- [Form Patterns](./form-patterns.md) — form dialogs and unsaved changes
- [Notification Patterns](./notification-patterns.md) — success/error feedback after dialog actions
- [Accessibility Standards](../02-engineering-practices/accessibility-standards.md) — WCAG dialog requirements
- [React Architecture](../05-stack-guides/react/react-architecture.md) — component organization
