# Supabase Database Patterns

**Status:** Normative  
**Scope:** Stack (Supabase / PostgreSQL)  
**Token Tier:** Medium (~2,200 tokens)  
**Tags:** `#supabase` `#postgresql` `#rls` `#migrations` `#transactions` `#schema` `#grants` `#postgrest`
**Last Updated:** 2026-08-26  

---

> **⚠️ Breaking Change — Effective May 30, 2026**
> Starting **May 30, 2026**, new Supabase projects will not expose tables in the `public` schema to the Data API (PostgREST, GraphQL, supabase-js) by default.
> On **October 30, 2026**, this behavior is enforced on all existing projects.
> Explicit `GRANT` statements are now required for new tables — see the [Data API Access — Explicit GRANTs Required](#data-api-access--explicit-grants-required) section below.
> Full announcement: [Supabase Changelog #45329](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

---

## Purpose

This guide defines recommended PostgreSQL + Supabase patterns for schema design, migrations, transactions, optimistic concurrency, versioned entities, audit logging, and operational safety. It ensures the codebase is consistent in how it handles data integrity, performance, and historical accuracy.

---

## Core Principles

1. **PostgreSQL is the source of truth** — all institutional data, workflow state, and audit history live in PostgreSQL.
2. **Relational integrity first** — use foreign keys, unique constraints, check constraints, and transactions aggressively.
3. **Application writes must be transactional** — especially for workflow, versioning, imports, approvals, and audit logs.
4. **Pool runtime connections** — use pooled connections for normal API traffic.
5. **Protect historical integrity** — approved versions must remain reproducible.
6. **Prefer explicit schemas and migrations** — avoid ad-hoc table changes without migration history.

---

## Connection Strategy

### Runtime Traffic

Use the **pooled connection endpoint** for API runtime:

- Pooled URL on its designated port (Supavisor or equivalent)
- Suitable for normal web/API workloads
- Aligns with connection limits of the database plan

### Direct Connections

Use direct PostgreSQL connections only when necessary:
- Schema migrations
- Admin maintenance
- Debugging under controlled conditions

Avoid using direct connections for routine API traffic.

---

## Schema Design Conventions

### Naming

- Use plural table names consistently (e.g., users, blog_posts) — aligns with global database-architecture standards
- `snake_case` for columns
- `*_id` for foreign keys
- `*_at` for timestamps
- `*_ar` and `*_en` for bilingual fields

### Recommended Shared Columns

For most domain tables:

| Column | Type | Purpose |
|---|---|---|
| `id` | `UUID DEFAULT gen_random_uuid()` | Primary key |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | Record creation |
| `updated_at` | `TIMESTAMPTZ DEFAULT now()` | Last modification |
| `created_by` | `UUID REFERENCES users(id)` | Creator tracking |
| `updated_by` | `UUID REFERENCES users(id)` | Modifier tracking |
| `status` | `TEXT` | Lifecycle state |

- Always use UUID primary keys — never sequential integers for public-facing IDs.
- Always include `created_at` and `updated_at` on every table.

### Bilingual Data

For user-visible text requiring Arabic + English:

- Store separate columns: `title_ar`, `title_en`, `description_ar`, `description_en`
- Never store mixed rich-text blobs

---

## Constraint Patterns

### Database-Level Enforcement

Use database constraints for invariant rules:

| Constraint | When to Use |
|---|---|
| `PRIMARY KEY` | Every table |
| `FOREIGN KEY` | Every relationship |
| `UNIQUE` | Business uniqueness rules |
| `CHECK` | Enum-like status values, range validations |
| Partial unique indexes | Conditional uniqueness (e.g., active entity) |

### Service-Layer Checks

Some rules span multiple rows or entities and must be enforced in the service layer with transaction support:

- Assessment/weight totals must equal 100%
- No approval if required sections are incomplete
- Workflow chain sequencing
- Cross-entity business rules

---

## Migrations Policy

### Rules

1. All schema changes must go through versioned migration files.
2. Never apply ad-hoc changes via database dashboards.
3. Migration filenames: `{timestamp}_{descriptive_name}.sql`
4. Every migration must be reversible.
5. Migrations must be idempotent where possible (use `IF NOT EXISTS`, `IF EXISTS`).

### Safe Migration Practice

For high-risk migrations:
- Apply in staging first
- Verify data integrity
- Back up before production run
- Include rollback notes in deployment plan
- Never drop columns or tables without a deprecation period migration preceding it

### Migration Categories

Maintain clear separation between:
- Schema migrations
- Seed/reference data migrations
- One-time backfill scripts

---

## Data API Access — Explicit GRANTs Required

> **This section is new as of May 2026.** Every project must adopt this pattern before October 30, 2026.

### Background

Previously, every new table in the `public` schema was automatically granted `SELECT`, `INSERT`, `UPDATE`, `DELETE` to the `anon`, `authenticated`, and `service_role` roles — making it reachable via the Data API (PostgREST, GraphQL, supabase-js) on creation.

Starting **May 30, 2026**, new Supabase projects ship with these default grants **removed**. From **October 30, 2026**, the same applies to all existing projects. New tables in `public` now require explicit `GRANT` statements before the Data API can see them.

**This does NOT affect:**
- Direct Postgres connections (psql, ORMs, app servers using a connection string)
- Tables in `storage`, `auth`, `realtime`, or custom schemas
- Existing tables in your project (they keep their current grants)

### The Three-Step Pattern

Treat these three steps as a single unit during table creation. If the grant is missing, Postgres rejects the query before RLS comes into play:

```sql
-- 1. Grant the privileges the role needs
GRANT SELECT ON public.your_table TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO service_role;

-- 2. Enable RLS
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- 3. Add the policies you need
CREATE POLICY "users can read their own rows"
  ON public.your_table
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Grant Granularity per Role

Explicit grants give you per-role control that was invisible under the old defaults:

| Role | Typical Grants | When to Use |
|---|---|---|
| `anon` | `SELECT` only | Public read-only access (e.g., public pages) |
| `authenticated` | `SELECT, INSERT, UPDATE, DELETE` | Signed-in user access |
| `service_role` | `SELECT, INSERT, UPDATE, DELETE` | Server-side privileged operations (bypasses RLS) |

If a grant is missing, PostgREST returns a clear error with a hint showing which role needs which privilege:

```json
{
  "code": "42501",
  "message": "permission denied for table your_table",
  "hint": "Grant the required privileges to the current role with: GRANT SELECT ON public.your_table TO anon;"
}
```

### Migration Integration

All migration files that create tables in `public` MUST include:
1. `CREATE TABLE`
2. Explicit `GRANT` statements (per role)
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
4. `CREATE POLICY` statements

This sequence is now mandatory — grants are no longer implicit. Bundling them in the same migration ensures atomicity.

### Error Recovery

If the Data API returns a `42501` error for a new table, the hint tells you exactly which `GRANT` is missing. Add the grant and re-run the migration.

### Rollout Timeline

| Date | Milestone | Action Required |
|---|---|---|
| **2026-05-30** | New default for all **new** projects | New-project workflows must include explicit `GRANT` statements |
| **2026-10-30** | Enforced on **all existing projects** | Migration must be complete; tables without grants stop being reachable via the Data API |

### Opting in Early on Existing Projects

To adopt the new behavior before October 30, run in the SQL Editor:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM anon, authenticated, service_role;
```

This only affects **future** tables — existing tables keep their grants.

---

## Row-Level Security (RLS)

### Relationship to Grants

Grants and RLS are **separate layers**:
- **Grants** control whether a role can access a table at all (gate at the schema/table level)
- **RLS** controls which rows that role can see (filter at the row level)

Both must be correctly configured. A grant provides table-level access; RLS restricts within that access.

### Mandatory RLS Rules

- Enable RLS on all tables that contain user-owned or role-scoped data.
- RLS policies must use the authenticated user ID for ownership checks.
- Apply the principle of least privilege — default `DENY`, then grant minimal `SELECT`/`INSERT`/`UPDATE`/`DELETE` per role.
- Always test RLS policies with role simulation before deploying — never assume they are correct without verification.
- Document each policy's intent in a comment above the `CREATE POLICY` statement.

---

## Transaction Patterns

### Always Use Transactions For

- Workflow state transitions
- Workflow action insertion
- Audit-log insertion tied to business changes
- Approval record creation/update
- Import commit
- Version snapshot creation
- Revision creation from approved entities

### Transaction Rule

If any required write fails:
- Roll back everything
- Return structured error
- Log with correlation ID

---

## Optimistic Concurrency Pattern

For conflict-safe edits on workflow-governed and draft-heavy tables:

1. Add an integer version field: `version_no` or `row_version`
2. On update, include version in WHERE clause: `WHERE id = :id AND version_no = :clientVersion`
3. If no rows updated → stale state conflict → return `409 Conflict`

Apply this especially to:
- Workflow items
- Draft versions of entities
- Editable documents where concurrent editing is possible

---

## Versioned Entity Patterns

### Immutability

For entities that undergo approval:
- Draft rows remain mutable
- Approved rows become **immutable**
- Structural change creates a new draft/revision row — never mutate an approved row

### Change Rationale

Every structural revision should capture:
- Reason for change
- Author
- Timestamps

---

## Audit Log Patterns

### What to Capture

- Actor (user ID)
- Entity type and ID
- Action type (CREATE, UPDATE, APPROVE, REJECT, etc.)
- Before snapshot (where relevant)
- After snapshot (where relevant)
- Timestamp
- Request/correlation ID

### Rules

- Keep audit logging **append-only** — never UPDATE or DELETE audit rows
- Tie audit creation to the same transaction as the state change
- Avoid logging secrets or unnecessarily large blobs

---

## Query Design & Performance

### Do

- Index all foreign key columns
- Index columns appearing in `WHERE`, `ORDER BY`, or `JOIN` conditions
- Use explicit selected columns (avoid `SELECT *`)
- Paginate all list queries
- Use `EXPLAIN ANALYZE` for queries on large tables before committing

### Avoid

- N+1 query patterns in nested workflows/reports
- Repeated existence checks outside transactions for write-critical operations
- Row-by-row cursor loops — prefer set-based operations

---

## Operational Safety Checklist

Before shipping database-related features, verify:

- [ ] Runtime uses pooled connection
- [ ] Migrations are committed to source control
- [ ] **Explicit `GRANT` statements included for every new table** (three-step pattern: GRANT → ENABLE RLS → CREATE POLICY)
- [ ] Transactional writes exist for workflow/version/audit changes
- [ ] Unique and check constraints are applied where feasible
- [ ] Stale draft conflicts return safe `409` responses
- [ ] Import flow validates before commit
- [ ] Immutable version rules are enforced
- [ ] Audit logging is append-only and correlated

---

## Key Takeaways

1. **PostgreSQL is the source of truth** — not the application layer.
2. **Transactions for all multi-table writes** — no partial updates allowed.
3. **Explicit GRANTs before RLS** — grants are the table-level gate; RLS is row-level filtering. Both required.
4. **RLS as second line of defense** — app auth + DB auth both must hold.
5. **UUIDs, not sequential IDs** — avoid enumeration attacks and merge conflicts.
6. **Migrations, not dashboard edits** — schema changes must be version-controlled.
7. **Approved = immutable** — create new versions, never mutate history.
8. **Pooled connections for runtime** — respect connection limits.

---

## Cross-References

- [Supabase Auth](supabase-auth.md) — authentication integration
- [Database Architecture](../../04-architecture/database-architecture.md) — general database philosophy
- [Backend Architecture](../../04-architecture/backend-architecture.md) — service-to-database patterns
- [NestJS Architecture](../nestjs/nestjs-architecture.md) — backend integration
- [Security Engineering](../../02-engineering-practices/security-engineering.md) — RLS and access control
- [API Design Standards](../../04-architecture/api-design-standards.md) — pagination patterns
