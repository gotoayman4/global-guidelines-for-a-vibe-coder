---
status: "Normative"
scope: "Global"
tags: [database, sql, schema]
---

# Database Architecture — Data Modeling and Access Patterns

---

## Directives

1. **Normalize by default (3NF).** Denormalize only with measured performance data — never because AI thinks "it's faster".
2. **Every table:** UUID primary key (`id`, not auto-increment — prevents enumeration) · `created_at`/`updated_at TIMESTAMPTZ DEFAULT NOW()` · explicit constraints: NOT NULL on required fields, UNIQUE on email/username/slug, CHECK for ranges, FOREIGN KEY with explicit ON DELETE behavior.
3. **Soft deletes for user-facing data:** `deleted_at TIMESTAMPTZ DEFAULT NULL`; queries filter `WHERE deleted_at IS NULL`. Hard deletes only for ephemeral data (sessions, logs, tokens).
4. **Indexes are not optional:** lookup fields, sort/filter columns, every foreign key, composite indexes for common query pairs. Full-text/partial/expression indexes only after measurement.
5. **Naming conventions:** tables `snake_case` plural (`users`, `blog_posts`) · FK `[singular]_id` · indexes `idx_[table]_[column]` · unique `uq_[table]_[column]` · booleans `is_*`/`has_*` · event dates `[event]_at`.
6. **Parameterized queries ALWAYS** (`WHERE email = $1`) — string concatenation in SQL is the #1 AI-generated vulnerability. Enforce via lint + review + CI.
7. **All database access through repositories** — no raw queries in routes or services. Transactions wrap multi-step atomic operations (row-lock with `FOR UPDATE` where needed).
8. **Migrations:** reversible (forward AND down), one logical change per migration, staging-tested before production, human approval required before any drop of columns/tables. Naming `YYYYMMDDHHMMSS_name.sql`.
9. **Default database choice: PostgreSQL** (95% of use cases; SQLite for embedded/single-user; Redis for cache/sessions only).

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Missing FK constraints | FK with explicit ON DELETE |
| No indexes | Index lookups, FKs, sorts |
| String-concatenated SQL | Parameterized always |
| `SELECT *` | Explicit column lists |
| Business logic in DB | Logic in services; DB = integrity |
| Irreversible migrations | Tested down migration required |

## Cross-References

`backend-architecture.md` · `supabase-database.md` · `api-design-standards.md`
