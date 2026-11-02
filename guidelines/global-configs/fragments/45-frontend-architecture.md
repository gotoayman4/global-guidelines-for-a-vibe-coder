## Frontend Architecture (When Building a Web UI)
<!-- requires: web-ui -->

- **One Source of Truth Per State Type.** When using React Query / SWR, keep server state there and form state in the form library — never duplicate in stores. Centralize tuple query keys `['entity', params] as const`; cap concurrent page fetches at 4.
  → Source: `04-architecture/state-management.md`
- **Stack Conventions (When React).** Data router API only (`createBrowserRouter`, never `<BrowserRouter>`); native `useBlocker`, no custom nav-blocking. Detail: `_guidelines/04-architecture/router-architecture.md`.
  → Source: `04-architecture/router-architecture.md`
