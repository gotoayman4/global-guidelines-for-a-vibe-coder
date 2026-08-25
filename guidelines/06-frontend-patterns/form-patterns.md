# Form Patterns

**Status:** Normative  
**Scope:** Global  
**Token Tier:** Medium (~2,200 tokens)  
**Last Updated:** 2026-05-24
**Cross-References:** `react-architecture.md`, `typescript-conventions.md`, `error-handling-philosophy.md`, `accessibility-standards.md`, `notification-patterns.md`, `../02-engineering-practices/ux-design-principles.md`

---

## Purpose

This guide defines form implementation patterns for React applications. It covers form library choices, validation strategies, multi-step forms, conditional logic, unsaved changes protection, and accessibility — establishing consistent form behavior across the application.

---

## Form Stack

| Layer | Tool | Purpose |
|---|---|---|
| Form state | React Hook Form | Performant form state management |
| Validation | Zod | Schema-based validation with TypeScript inference |
| UI | MUI components | Consistent, accessible form inputs |
| Persistence | localStorage / sessionStorage | Multi-step form state preservation |

---

## Component Structure

### One Field = One Component

Extract form fields into reusable components:

```typescript
// ✅ Reusable field component
interface TextFieldProps {
  name: string;
  label: string;
  required?: boolean;
  helperText?: string;
}

function FormTextField({ name, label, required, helperText }: TextFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name];

  return (
    <TextField
      {...register(name)}
      label={label}
      required={required}
      helperText={error ? String(error.message) : helperText}
      error={!!error}
      fullWidth
    />
  );
}
```

### Numeric Fields

For editable numeric fields, use a spinner-less number input instead of raw `<TextField type="number">`. This preserves numeric semantics while removing spinner controls and blocking accidental mouse-wheel changes.

---

## Validation

### Zod Schemas

Co-locate validation schemas with form components:

```typescript
import { z } from 'zod';

const projectSchema = z.object({
  nameAr: z.string().min(1, "Arabic name is required"),
  nameEn: z.string().min(1, "English name is required"),
  budget: z.number().int().min(0).max(1000000),
});

type ProjectForm = z.infer<typeof projectSchema>;
```

### Rules

- **Server-side validation is authoritative** — client validation is a UX convenience, not a security boundary.
- Mirror backend DTOs in frontend validation schemas.
- Use Zod's `.refine()` for cross-field validation (e.g., "end date must be after start date").
- For conditionally required fields, use Zod's `.optional()` with `.refine()` at the schema level.

---

## Multi-Step Forms

### State Preservation

Multi-step forms must preserve state across steps without re-fetching completed data:

```typescript
// Use a context or parent component to hold all step data
function MultiStepForm() {
  const [stepData, setStepData] = useState<Partial<FormData>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const updateStepData = (step: number, data: Partial<FormData>) => {
    setStepData(prev => ({ ...prev, ...data }));
  };
}
```

### Conditional Steps

Filter the steps array dynamically based on form values:

```typescript
const steps = [
  { id: "basic", label: "Basic Info", component: <BasicInfoStep /> },
  { id: "references", label: "References", component: <ReferencesStep /> },
  { id: "summary", label: "Review", component: <SummaryStep /> },
];

const hasReferences = getValues("hasReferences");
const activeSteps = hasReferences
  ? steps
  : steps.filter(step => step.id !== "references");
```

### Conditional Fields (Within a Step)

Use `useWatch()` from React Hook Form for real-time field visibility:

```typescript
const hasExperience = useWatch({ control, name: "hasExperience" });

return (
  <>
    <FormCheckbox name="hasExperience" label="Has experience?" />
    {hasExperience && (
      <FormTextField name="yearsOfExperience" label="Years of experience" />
    )}
  </>
);
```

**Best practices for conditional logic:**
- Keep conditions declarative — avoid nested ternaries.
- Place conditional logic in the corresponding step component.
- Use Zod schema refinement or `.optional()` for conditionally required inputs.
- Minimize re-renders: use `useWatch()` instead of `watch()`.

---

## Unsaved Changes Protection

Every form — whether full-page or dialog-based — must protect against accidental data loss.

### Route-Level Forms

```typescript
function ProjectForm() {
  const { isDirty, resetBaseline, BlockerDialog } = useUnsavedChanges({
    code: form.code,
    nameAr: form.nameAr,
    nameEn: form.nameEn,
  });

  // In edit mode: call resetBaseline AFTER data loads, not on mount
  useEffect(() => {
    if (project) {
      const loaded = mapProject(project);
      setForm(loaded);
      resetBaseline(loaded); // ← here, not on mount with defaults
    }
  }, [project]);

  const handleSave = async () => {
    if (!isDirty) return;
    await saveProject(form);
    resetBaseline(); // snapshots current state after save
  };

  return (
    <>
      <UnsavedChangesBanner show={isDirty} />
      <Button variant="contained" onClick={handleSave} disabled={!isDirty || saving}>
        {saving ? "Saving..." : "Save"}
      </Button>
      {BlockerDialog}
    </>
  );
}
```

### Dialog-Based Forms

- Capture close attempts: show confirmation dialog when `isDirty` is true.
- Prevent Escape-key dismissal while dirty: `disableEscapeKeyDown={isDirty}`.
- On discard: reset baseline before closing.

### Critical Rules

| Rule | Correct | Wrong |
|---|---|---|
| Save button | `disabled={!isDirty \|\| saving}` | `disabled={!isDirty && !saving}` |
| Edit-mode baseline | Call `resetBaseline(loaded)` inside `useEffect` after fetch | Call on mount with empty defaults |
| Banner | Only on route-level forms | On dialog forms (use confirm dialog instead) |
| Dialog close | `handleCloseAttempt` checks `isDirty` | Direct call to `onClose()` |

---

## Accessibility

- Every form control has a programmatic label via `<label for>` or `aria-label`.
- Required fields: visual indicator (`*`) + `aria-required="true"`.
- Error messages: use `aria-invalid="true"` on invalid fields + `aria-describedby` pointing to the error message element.
- On submit with validation errors, focus the first invalid control.
- Do not disable submit buttons solely to prevent submission — show errors instead.

---

## Common Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| `useState` for every field | Use React Hook Form |
| Client-only validation | Mirror backend DTOs with Zod |
| Inline `onChange` handlers for every field | Use `register()` |
| `useEffect` + `fetch` for form data | Use SWR/React Query at the route level |
| Self-closing snackbar on save | Use standardized notification hook |
| Number spinners | Use spinner-less number input |
| Losing multi-step data on navigation | Preserve state in parent context or localStorage |

---

## Key Takeaways

1. **React Hook Form + Zod** — the standard stack for performant, type-safe forms.
2. **Server validation is authoritative** — client validation is UX, not security.
3. **Preserve multi-step state** — never lose completed step data.
4. **Unsaved changes protection on every form** — prevent accidental data loss.
5. **Accessible error handling** — `aria-invalid` + `aria-describedby` + focus management.
6. **Conditional logic via `useWatch()`** — efficient, declarative, testable.

---

## Cross-References

- [React Architecture](../05-stack-guides/react/react-architecture.md) — component patterns
- [TypeScript Conventions](../05-stack-guides/typescript/typescript-conventions.md) — type-safe forms
- [Error Handling Philosophy](../02-engineering-practices/error-handling-philosophy.md) — validation and error display
- [Accessibility Standards](../02-engineering-practices/accessibility-standards.md) — form accessibility
- [Notification Patterns](./notification-patterns.md) — success/error feedback
