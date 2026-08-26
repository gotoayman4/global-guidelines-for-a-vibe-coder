# Dialog Patterns

**Status:** Normative
**Scope:** Global
**Token Tier:** Low (~600 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `form-patterns.md`, `accessibility-standards.md`

---

Dialog types: Confirmation (destructive/irreversible) · Form (create/edit in dialog) · Detail (view entity) · Multi-step wizard. Max 2 nesting levels (main + confirmation sub-dialog).

## Directives

1. **Safe focus restoration** — MUI Dialog portals set `aria-hidden` on `#root`, so capture the trigger first and restore after close animation:
   ```typescript
   const openDialog = () => { triggerRef.current = document.activeElement as HTMLElement; setOpen(true); };
   <Dialog disableRestoreFocus TransitionProps={{ onExited: () => { triggerRef.current?.focus(); triggerRef.current = null; } }}>
   ```
2. **Unsaved changes protection in form dialogs:** intercept ALL close attempts (`handleCloseAttempt` checks `isDirty`) · `disableEscapeKeyDown={isDirty}` · "Discard changes?" confirmation sub-dialog before losing work · reset baseline before closing on discard.
3. **Confirmation dialogs describe consequences:** title names the action ("Delete Program?", not "Are you sure?") · message states what is lost ("permanently deletes the program and all associated data") · confirm button colored by severity (red delete / orange warning) · Cancel is the safe default (Escape closes safely).
4. **MUI Select inside Dialog needs `MenuProps={{ disablePortal: true }}`** — Select's Menu→Popover→Modal chain triggers a second `ariaHideOthers()` that conflicts with the Dialog's.
5. **Accessibility:** focus trapped while open · `aria-labelledby` → dialog title · `aria-describedby` → main content · close button has `aria-label` · focus goes to the first/most logical element on open.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Dirty form closes silently | Dirty check + confirm sub-dialog |
| No focus restoration | triggerRef + disableRestoreFocus + onExited |
| Select without disablePortal in dialogs | MenuProps disablePortal |
| Vague confirmations | Describe consequences |
| 3+ stacked dialogs | Max 2 levels |

## Cross-References

`form-patterns.md` · `notification-patterns.md` · `accessibility-standards.md`
