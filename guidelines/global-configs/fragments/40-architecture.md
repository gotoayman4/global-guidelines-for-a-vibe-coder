## Architecture (Load for New Features)

- **File Size Limit.** Files MUST NOT exceed 400 lines — plan for ~300; at 400, refactor down under 300 before proceeding. ESLint `max-lines`; source only (docs/config/generated excluded).
  → Source: `02-engineering-practices/file-organization.md`
- **Layer Separation.** NEVER put business logic in UI components — API calls, transforms, and state live in services/hooks layers.
  → Source: `04-architecture/backend-architecture.md`
- **Pagination for Lists.** Every list endpoint MUST support pagination — no exceptions past 50 items.
  → Source: `04-architecture/api-design-standards.md`
- **AI-Readable Code Documentation (ICDC).** Every file starts with a file-level context comment; every exported symbol has JSDoc/TSDoc. Non-trivial code carries INTENT / CONSTRAINT / DECISION / CAVEAT as needed. NEVER restate what the code does — comments add CONTEXT only.
  → Source: `02-engineering-practices/ai-code-documentation.md`
- **One Source of Truth Per State Type.** Server state in the data-fetching library (React Query / SWR), form state in the form library — NEVER duplicate across stores. Query keys are raw tuples `['entity', params] as const` — never stringified JSON or path strings; centralize key constants.
  → Source: `04-architecture/state-management.md`
- **Error Responses with Machine-Readable Codes.** Responses MUST include a machine-readable `code` field. NEVER expose stack traces in API responses.
  → Source: `04-architecture/api-design-standards.md`
- **Vertical Slice Development.** Build one complete feature UI → API → Database before starting the next. Never build by horizontal layers; the first increment is a working end-to-end feature, however thin.
  → Source: `01-workflow-methodology/development-workflow.md`
- **Stack Conventions (React projects).** Data router API only (`createBrowserRouter`, never `<BrowserRouter>`; native `useBlocker`, no custom navigation-blocking workarounds). Cap concurrent page fetches at 4 (`fetchAllPages<T>()` shared utility). ESLint enforces `import-x/no-duplicates` and `import-x/order`; inline `type` for type-only imports. Detail: `_guidelines/04-architecture/router-architecture.md`, `_guidelines/02-engineering-practices/performance-optimization.md`.
  → Source: `04-architecture/router-architecture.md`
- **Code Duplication Detection.** Same mapping/validation/transformation in 2+ files → extract to a shared utility in the same iteration; never wait for a refactoring pass.
  → Source: `02-engineering-practices/code-duplication-prevention.md`
