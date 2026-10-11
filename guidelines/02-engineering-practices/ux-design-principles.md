---
status: "Normative"
scope: "Global"
tags: [ux, heuristics, cognition, nielsen]
---

# UX Design Principles — Heuristics for Interaction Design

---

Nielsen's 10 heuristics + Tesler's Law govern every UI decision. Every principle below is a MUST unless stated otherwise.

## Directives

1. **Visibility of system status:** every action produces visible feedback — loading indicators >400ms, confirmations on destructive actions, progress on multi-step ops, skeletons (never blank screens), breadcrumbs in wizards.
2. **Match the real world:** domain terminology ("Student", never "UserEntity"); real-world conventions; bilingual UIs use culturally appropriate conventions, not literal translations.
3. **User control & freedom:** Undo/Redo for editorial ops; visible Cancel/Close on every dialog, wizard, modal; confirmation with clear consequences before destructive actions; dismissible non-critical notifications.
4. **Consistency & standards:** identical actions = identical labels everywhere; shared components enforce consistency; platform conventions respected; identical behavior in Arabic and English.
5. **Error prevention over error handling:** constrain inputs (pickers over free text, dropdowns for enums); smart defaults; validate at blur; warn before leaving dirty forms; disable submit until valid.
6. **Recognition over recall:** persistent field labels (never placeholder-only); show selected filters after results load; autocomplete where values are known; inline help; step summaries in multi-step flows; column headers visible during scroll.
7. **Flexibility & efficiency:** keyboard shortcuts for frequent actions; batch/bulk operations; Cmd+K quick-search; remember user preferences (column visibility, filters, sort). RTL: Tab flows start-to-end, arrows follow visual direction.
8. **Aesthetic & minimalist:** no irrelevant information; progressive disclosure for complexity; data-dense interfaces prefer organized density over white space.
9. **Error recovery:** messages MUST answer what went wrong / why / what to do — plain language, no codes or stack traces; highlight specific fields inline; offer Retry on network errors; localized, not machine-translated.
10. **Help & documentation:** contextual tooltips and searchable task-focused help; onboarding hints with "don't show again".
11. **Tesler's Law:** shift complexity to the system — auto-format phone/date/currency, pre-fill known data, auto-save drafts, handle timezones/locales automatically. Accept both numeral systems at input; display per `rtl-tech-stack.md` numeral policy.

## Adoption

New projects: full compliance day one; PR reviews check against these principles. Existing projects adopt incrementally in risk order: ① feedback states + error prevention + error messages (additive) → ② labels + help + decluttering → ③ undo, shortcuts, standardization. Adoption must never block feature work.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Silent failures | Feedback for every action |
| Database jargon in UI | Domain language |
| Modal traps | Visible Cancel/Close/Back always |
| Inconsistent labels ("Edit"/"Modify") | Shared constants file |
| Blaming error messages | What happened + how to fix |
| Relying on user memory | Persistent info display |
| UX-level prevention skipping server-side handling | Both mandatory — see `error-handling-philosophy.md` |

## Cross-References

- **Depends on:** `accessibility-standards.md`
- **Extended by:** `frontend-architecture.md`, `bidirectional-design-principles.md`
- **Applied by:** `form-patterns.md`, `dialog-patterns.md`, `notification-patterns.md`, `loading-and-empty-states.md`, `error-handling-philosophy.md`
- **Governed by:** `design-system-governance.md`
