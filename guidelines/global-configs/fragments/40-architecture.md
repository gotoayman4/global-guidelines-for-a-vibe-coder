## Architecture (Load for New Features)

- **File Size Limit.** Files MUST NOT exceed 400 lines — plan new files for ~300. When a file reaches 400, refactor it down to under 300 (not merely under 400) before proceeding. Enforced by ESLint `max-lines`. Applies to source code only; docs, config, and generated files are excluded.
  → Source: `02-engineering-practices/file-organization.md`
- **Layer Separation.** NEVER put business logic in UI components. API calls, data transformations, and state management belong in services/hooks layers.
  → Source: `04-architecture/backend-architecture.md`
- **Pagination for Lists.** Every list endpoint MUST support pagination. No exceptions for lists that could exceed 50 items.
  → Source: `04-architecture/api-design-standards.md`
- **AI-Readable Code Documentation.** Code comments serve the NEXT AI session. Use ICDC: INTENT (what should this do), CONSTRAINT (what it must NOT violate), DECISION (why this approach, when non-obvious), CAVEAT (surprising edge cases). Every file starts with a file-level context comment; every exported function has JSDoc/TSDoc. NEVER restate what the code does — comments add CONTEXT the code cannot express.
  → Source: `02-engineering-practices/ai-code-documentation.md`
- **One Source of Truth Per State Type.** Server state lives in the data-fetching library (React Query / SWR), form state in the form library. NEVER duplicate state across stores.
  → Source: `04-architecture/state-management.md`
- **Error Responses with Machine-Readable Codes.** Error responses MUST include a machine-readable `code` field. NEVER expose stack traces in API responses.
  → Source: `04-architecture/api-design-standards.md`
- **Vertical Slice Development.** Build one complete feature UI → API → Database before starting the next. Never build by horizontal layers. The first increment is a working end-to-end feature, however thin.
  → Source: `01-workflow-methodology/development-workflow.md`
- **SWR / React Query Key Convention — Raw Tuples Only.** ALL query keys, mutations, and cache invalidations use raw tuple format: `['entity', params] as const`. NEVER stringified JSON, path strings, or loose arrays. Centralize key constants in a shared file.
  → Source: `04-architecture/state-management.md`
- **Router API — Data Router Only.** Use the framework's data router API exclusively (`createBrowserRouter` for React Router, never `<BrowserRouter>`) — required for native `useBlocker`, loaders, and actions. Custom navigation-blocking workarounds are forbidden.
  → Source: `04-architecture/router-architecture.md`
- **Batch Fetch Parallelism Cap.** When fetching paginated data across pages concurrently, cap parallelism at 4 simultaneous requests. Extract a shared `fetchAllPages<T>()` utility.
  → Source: `02-engineering-practices/performance-optimization.md`
- **Import Hygiene ESLint Rules.** ESLint MUST enforce `import-x/no-duplicates` and `import-x/order`. Use inline `type` for type-only imports from the same package. Fix violations immediately.
  → Source: `02-engineering-practices/file-organization.md`
- **Code Duplication Detection.** When the same mapping, validation, or transformation logic appears in 2+ files, extract to a shared utility in the same iteration — do not wait for a refactoring pass.
  → Source: `02-engineering-practices/code-duplication-prevention.md`
