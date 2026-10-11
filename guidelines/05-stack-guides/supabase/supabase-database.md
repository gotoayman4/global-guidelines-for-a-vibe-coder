---
status: "Normative"
scope: "Stack (Supabase / PostgreSQL)"
tags: [supabase, postgresql, rls, grants, postgrest]
---

# Supabase Database Patterns

**Tags:** `#supabase` `#postgresql` `#rls` `#migrations` `#transactions` `#schema` `#grants` `#postgrest`
---

> **⚠️ Breaking Change:** Since **2026-05-30**, new Supabase projects do NOT expose new `public` tables to the Data API by default; enforced on ALL projects **2026-10-30**. Explicit `GRANT` statements are now required for every new table (three-step pattern below). Direct Postgres connections, non-public schemas, and pre-existing tables are unaffected.

## Directives

1. **PostgreSQL is the source of truth.** Relational integrity first: FK/UNIQUE/CHECK constraints aggressively; database constraints for invariants; service layer + transactions only for cross-row rules.
2. **UUID primary keys** (`gen_random_uuid()`) — never sequential ints on public-facing IDs. Every table gets `created_at`/`updated_at TIMESTAMPTZ`.
3. **Bilingual columns** as separate fields (`title_ar`, `title_en`) — never mixed rich-text blobs.
4. **All schema changes via versioned migrations** — `{timestamp}_{name}.sql`, reversible, idempotent where possible. NEVER dashboard edits. High-risk migrations: staging first → backup → rollback notes → deprecation period before any drop.
5. **Three-step pattern MANDATORY for every new `public` table** (one migration): ① explicit GRANTs per role (`anon`: SELECT only · `authenticated`: CRUD · `service_role`: CRUD) → ② `ENABLE ROW LEVEL SECURITY` → ③ `CREATE POLICY`. Missing grant = PostgREST `42501`; the error hint names the missing GRANT.
6. **Grants and RLS are separate layers:** grants gate table access; RLS filters rows. RLS mandatory on all user-owned/role-scoped data; policies use `auth.uid()` ownership checks; least privilege (default DENY); test with role simulation before deploy; comment each policy's intent.
7. **Transactions for all multi-table writes:** workflow transitions, audit-log insertion, approvals, imports, version snapshots. Any failure → roll back everything + structured error + correlation ID.
8. **Optimistic concurrency** on workflow/draft tables: integer `version_no`; update includes `WHERE version_no = :clientVersion`; no rows updated → return `409 Conflict`.
9. **Versioned entities:** approved rows are immutable — structural changes create a new draft/revision capturing reason, author, timestamps.
10. **Audit logs append-only** (never UPDATE/DELETE), same transaction as the state change, capture actor/entity/action/before/after/timestamp/correlation ID; no secrets or large blobs.
11. **Query performance:** index all FK and WHERE/ORDER BY/JOIN columns; explicit column lists (no `SELECT *`); paginate every list query; set-based operations not row loops; `EXPLAIN ANALYZE` large-table queries.
12. **Connections:** pooled endpoint (Supavisor) for runtime API traffic; direct connections only for migrations/admin/debugging.

---

## Canonical Pattern

```sql
-- 1. Grants
GRANT SELECT ON public.your_table TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO service_role;
-- 2. RLS
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;
-- 3. Policies
CREATE POLICY "users can read their own rows"
  ON public.your_table FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

---

## Operational Checklist

pooled runtime connection · migrations committed · explicit GRANTs per new table · transactional writes for workflow/version/audit · constraints applied · stale-draft 409s · import validates before commit · immutability enforced · audit append-only.

---

## Cross-References

`supabase-auth.md` · `../../04-architecture/database-architecture.md` · `../nestjs/nestjs-architecture.md` · `../../02-engineering-practices/security-engineering.md`
