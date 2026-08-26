# Form Patterns

**Status:** Normative
**Scope:** Global
**Token Tier:** Medium (~1,300 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `react-architecture.md`, `typescript-conventions.md`, `error-handling-philosophy.md`, `accessibility-standards.md`, `notification-patterns.md`

---

## Form Stack (standard, no substitutions)

React Hook Form (state) · Zod (validation) · MUI inputs (UI) · localStorage/sessionStorage (multi-step persistence).

## Directives

1. React Hook Form + Zod for every form. NEVER per-field `useState`. NEVER `useEffect` + fetch for form data (use SWR/React Query at route level).
2. Zod schemas co-located with form components; mirror backend DTOs. `.refine()` for cross-field rules; `.optional()` + refine for conditionally required fields.
3. Server-side validation is authoritative — client validation is UX only.
4. One field = one reusable component consuming `useFormContext()` + `register()`.
5. Multi-step forms preserve state across steps (parent context or storage) — never lose completed step data. Conditional steps filtered dynamically; conditional fields via `useWatch()` (not `watch()`).
6. Unsaved-changes protection on EVERY form: route-level → dirty banner + route blocker; dialogs → confirm on close attempt + `disableEscapeKeyDown={isDirty}`.
7. Save button: `disabled={!isDirty || saving}`. Edit mode: call `resetBaseline(loaded)` AFTER data loads, not on mount.
8. Numeric editable fields: spinner-less number input — no accidental wheel changes.
9. Accessibility: programmatic labels; `aria-required` on required fields; `aria-invalid` + `aria-describedby` on errors; focus first invalid control on failed submit; don't disable submit to prevent bad submits — validate and show errors instead.

---

## Canonical Patterns

Field component:

```typescript
function FormTextField({ name, label, required, helperText }: TextFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name];
  return (
    <TextField {...register(name)} label={label} required={required}
      helperText={error ? String(error.message) : helperText} error={!!error} fullWidth />
  );
}
```

Schema:

```typescript
const projectSchema = z.object({
  nameAr: z.string().min(1, "Arabic name is required"),
  budget: z.number().int().min(0).max(1000000),
});
type ProjectForm = z.infer<typeof projectSchema>;
```

---

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| `useState` per field | React Hook Form |
| Client-only validation | Zod mirroring backend DTOs |
| Inline `onChange` everywhere | `register()` |
| Self-closing snackbar on save | Standardized notification hook |
| Number spinners | Spinner-less number input |
| Losing multi-step data on navigation | Parent context / storage |

---

## Cross-References

`react-architecture.md` · `typescript-conventions.md` · `error-handling-philosophy.md` · `accessibility-standards.md` · `notification-patterns.md`
