## Architecture (Load for New Features)

- **File Size Limit.** Files SHOULD NOT exceed 400 lines — plan for ~300. At 400, record as debt and split before the NEXT feature touches the file; do not stall the current change.
  → Source: `02-engineering-practices/file-organization.md`
- **Layer Separation.** NEVER put business logic in UI components — API calls, transforms, and state live in services/hooks layers.
  → Source: `04-architecture/backend-architecture.md`
- **Pagination for Lists.** Every list endpoint MUST support pagination — no exceptions past 50 items.
  → Source: `04-architecture/api-design-standards.md`
- **Comments Add Context, Not Narration.** Headers and JSDoc only where purpose, constraints, or a public contract are not inferable from the name or signature. NEVER restate what the code does.
  → Source: `02-engineering-practices/ai-code-documentation.md`
- **One Source of Truth Per State Type.** Server state in the data-fetching library (React Query / SWR), form state in the form library — NEVER duplicated across stores. Query keys are raw tuples `['entity', params] as const`; centralize key constants. Cap concurrent page fetches at 4.
  → Source: `04-architecture/state-management.md`
- **Error Responses with Machine-Readable Codes.** Responses MUST include a machine-readable `code` field. NEVER expose stack traces in API responses.
  → Source: `04-architecture/api-design-standards.md`
- **Vertical Slice Development.** Build one complete feature UI → API → Database before starting the next; never by horizontal layers.
  → Source: `01-workflow-methodology/development-workflow.md`
- **Stack Conventions (React).** Data router API only — `createBrowserRouter`, never `<BrowserRouter>`; native `useBlocker`, no custom nav-blocking. Detail: `_guidelines/04-architecture/router-architecture.md`.
  → Source: `04-architecture/router-architecture.md`
- **Code Duplication Detection.** Same mapping/validation/transformation in 2+ files → extract to a shared utility in the same iteration.
  → Source: `02-engineering-practices/code-duplication-prevention.md`
