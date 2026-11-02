## API Design (When Exposing Endpoints)
<!-- requires: api -->

- **Pagination & Error Responses.** List endpoints MUST paginate (no exceptions past 50 items). Error responses MUST include a machine-readable `code` field and NEVER expose stack traces.
  → Source: `04-architecture/api-design-standards.md`
