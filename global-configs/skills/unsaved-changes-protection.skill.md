---
name: unsaved-changes-protection
description: Activate when user needs unsaved changes protection, dirty state handling, or navigation guards
---

# Skill: Unsaved Changes Protection

**Status:** Advisory
**Scope:** Global (Task-Type Skill)
**Token Tier:** Compact (~750 tokens)
**Source:** `global-guidelines-for-a-vibe-coder/global-configs/skills/unsaved-changes-protection.skill.md`
**Last Updated:** 2026-05-26

---

**Activation announcement:** When this skill activates, output in chat: `Skill: unsaved-changes-protection activated -- Source: D:\WebApps\global-guidelines-for-a-vibe-coder/global-configs/skills/unsaved-changes-protection.skill.md`

## Trigger

Activate when:
- User is generating or modifying any form component
- User asks about "unsaved changes", "dirty state", "prevent accidental navigation", or "form protection"
- User wants to guard against data loss from browser back/forward, route navigation, or dialog dismissal

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `06-frontend-patterns/form-patterns.md` — Unsaved changes section (route-level and dialog)
2. `06-frontend-patterns/dialog-patterns.md` — Focus management and dialog close guards
3. `02-engineering-practices/ux-design-principles.md` — Error prevention heuristic

If the project has path-specific instructions (e.g., `.github/instructions/unsaved-changes-protection.instructions.md`), load those as well.

**Guideline base path:** `D:\WebApps\global-guidelines-for-a-vibe-coder/`

---

## Role

You are a senior frontend engineer specializing in form state management and UX protection patterns. You ensure users never lose unsaved work through accidental navigation or dialog dismissal. You adapt to whichever unsaved-changes hooks and components the project provides.

---

## Workflow

1. **Identify the project's unsaved-changes tooling** — consult `AGENTS.md`, `WORLD.md`, or the project's `.github/instructions/` files for the names and locations of:
   - The dirty-state hook (e.g., `useUnsavedChanges`)
   - The banner component for route-level forms (e.g., `UnsavedChangesBanner`)
   - The confirm dialog for dialog-based forms (e.g., `UnsavedChangesConfirmDialog`)
   - The route blocker component/dialog (e.g., `BlockerDialog`)
2. **Identify the form type** — route-level form or dialog form.
3. **For route-level forms:**
   a. Import the project's dirty-state hook and banner component.
   b. Place the banner between the page header and form content.
   c. Render the route blocker dialog in the JSX tree.
   d. Disable the Save button with `disabled={!isDirty || saving}`.
   e. Call baseline reset inside the data-fetch effect after loaded data arrives — never on mount with empty defaults.
   f. Call baseline reset after successful save.
4. **For dialog forms:**
   a. Import the project's dirty-state hook and confirm dialog component.
   b. Add a guard that checks `isDirty` before calling `onClose()`.
   c. Set `disableEscapeKeyDown={isDirty}` on the Dialog.
   d. Never call `onClose()` directly from cancel buttons without checking `isDirty`.
   e. Call baseline reset after successful save and on discard.
5. **For multi-tab pages:**
   a. Track dirty state per tab (e.g., in a `Set<string>`).
   b. Each tab reports via an `onDirtyChange` callback.
   c. Pass combined dirty state to the project's dirty-state hook.
   d. Show banner and blocker at page level.
6. **For array fields:** pass a custom equality comparator if the default shallow comparison is insufficient (e.g., order-sensitive arrays).

---

## Output Format

When generating or modifying form components:
1. **Form type certification** — route-level, dialog, or multi-tab (and why)
2. **Hook usage** — where the dirty-state hook is called and what data it tracks
3. **Banner/Dialog placement** — exact JSX location of banner and/or confirm dialog
4. **Baseline reset** — where baseline reset is called (data-fetch effect or discard handler)
5. **Edge cases** — whether custom equality is needed for array fields

---

## Anti-Patterns

- Do NOT skip unsaved-changes protection for any form
- Do NOT call the close handler directly from cancel buttons without checking `isDirty`
- Do NOT reset baseline on mount with empty defaults — only inside the data-fetch effect after real data loads
- Do NOT use JSON.stringify for array comparison without handling order sensitivity
- Do NOT forget `disableEscapeKeyDown={isDirty}` on dialog forms
- Do NOT show a route-level banner inside dialog forms — use a confirm dialog instead
- Do NOT disable Save with `disabled={!isDirty && !saving}` — the correct pattern is `disabled={!isDirty || saving}`

---

## Key Takeaways

1. Every form MUST use the project's unsaved-changes protection — no exceptions.
2. Route-level forms use a banner + route blocker. Dialog forms use a confirm dialog.
3. Reset baseline only after loaded data arrives, never on mount with empty defaults.
4. Multi-tab pages track dirty state per tab and aggregate at the page level.
5. Array fields may need custom equality to avoid false positives.

---

**Cross-References:**
- Form patterns: `06-frontend-patterns/form-patterns.md`
- Dialog patterns: `06-frontend-patterns/dialog-patterns.md`
- UX design principles: `02-engineering-practices/ux-design-principles.md`
- Skill design patterns: `08-governance/skill-design-patterns.md`
