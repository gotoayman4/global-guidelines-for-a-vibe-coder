# Database Architecture — Data Modeling and Access Patterns

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,000 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `backend-architecture.md`, `api-design-standards.md`

---

## Purpose

Define database design principles and access patterns optimized for AI-assisted development. AI generates inconsistent schemas, misses constraints, and creates N+1 queries. This document establishes the enforceable standards.

---

## Schema Design Principles

### 1. Normalize by Default, Denormalize with Justification

Start with normalized schemas (3NF). Denormalize only when you have measured performance data proving it's necessary. AI loves to denormalize because "it's faster" — without evidence.

### 2. Every Table Has a Primary Key

- Use UUIDs for primary keys (not auto-incrementing integers) unless you have a specific reason
- UUIDs prevent ID enumeration attacks and enable distributed systems later
- Consistent naming: `id` as the primary key column name

### 3. Timestamps on Every Table

Every table must include:
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### 4. Explicit Constraints

AI often omits constraints. Explicitly require:
```sql
-- Required constraints:
NOT NULL on all required fields
UNIQUE on email, username, slug fields
CHECK for value ranges (age >= 0, price > 0)
FOREIGN KEY with explicit ON DELETE behavior (CASCADE, SET NULL, RESTRICT)
```

### 5. Soft Deletes vs Hard Deletes

Default to soft deletes for user-facing data:
```sql
deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
```

Queries must filter `WHERE deleted_at IS NULL` (or use a database view). Hard deletes only for ephemeral data (sessions, logs, tokens).

### 6. Index Strategy

Indexes are NOT optional. AI generates queries without considering performance:
```sql
-- Indexes to always include:
CREATE INDEX idx_users_email ON users(email);              -- Lookup fields
CREATE INDEX idx_users_created_at ON users(created_at);    -- Sort/filter fields
CREATE INDEX idx_posts_user_id ON posts(user_id);          -- Foreign keys
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at);  -- Composite for common queries
```

**Not needed until measured:** Full-text search indexes, partial indexes, expression indexes.

---

## Naming Conventions

Consistent naming is critical for AI to generate correct queries:

| Concept | Convention | Example |
|---|---|---|
| Tables | `snake_case`, plural | `users`, `blog_posts`, `order_items` |
| Primary keys | `id` | `users.id` |
| Foreign keys | `[table_singular]_id` | `user_id`, `post_id` |
| Indexes | `idx_[table]_[column]` | `idx_users_email` |
| Unique constraints | `uq_[table]_[column]` | `uq_users_email` |
| Timestamps | `created_at`, `updated_at`, `deleted_at` | |
| Boolean columns | `is_[adjective]` or `has_[noun]` | `is_active`, `has_subscription` |
| Date columns | `[event]_at` | `verified_at`, `expires_at` |

---

## Migration Strategy

### Rules for AI-Generated Migrations

1. **Every migration must be reversible.** AI generates forward migrations without down migrations. Require BOTH.
2. **One migration per logical change.** Don't combine "add users table" with "add posts table" in one migration.
3. **No data loss migrations.** Dropping columns or tables requires explicit human approval.
4. **Test migrations on staging first.** Never run AI-generated migrations on production without staging verification.

### Migration Naming
```
YYYYMMDDHHMMSS_descriptive_name.sql
20260524143000_add_users_table.sql
20260524150000_add_email_verification_to_users.sql
```

---

## Query Patterns

### Parameterized Queries (Non-Negotiable)

```typescript
// ALWAYS:
const result = await db.query(
  'SELECT * FROM users WHERE email = $1 AND is_active = $2',
  [email, true]
);

// NEVER:
const result = await db.query(
  `SELECT * FROM users WHERE email = '${email}'`  // SQL injection
);
```

**Rule:** This is the #1 AI-generated vulnerability. Enforce with ESLint rules, code review, and CI checks.

### Query Through Repositories

Never write raw queries in route handlers or services. All database access goes through repository classes:

```typescript
class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return db.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
  }
  
  async create(data: CreateUserInput): Promise<User> {
    return db.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
      [data.email, data.passwordHash, data.name]
    );
  }
}
```

### Transaction Safety

Multi-step operations that must be atomic use transactions:

```typescript
async transferFunds(fromId: string, toId: string, amount: number) {
  return db.transaction(async (tx) => {
    const from = await tx.query('SELECT balance FROM accounts WHERE id = $1 FOR UPDATE', [fromId]);
    if (from.balance < amount) throw new Error('Insufficient funds');
    await tx.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await tx.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
  });
}
```

---

## Database Choice Guidance

| Database | Best For | Avoid For |
|---|---|---|
| **PostgreSQL** | General purpose, complex queries, JSON data, full-text search, geospatial | Ultra-simple key-value storage |
| **SQLite** | Embedded apps, mobile, single-user desktop apps | Multi-user web applications |
| **MongoDB** | Document-centric data with flexible schema | Relational data with complex joins |
| **Redis** | Caching, sessions, rate limiting, real-time data | Primary data store (unless ephemeral) |

**Default choice:** PostgreSQL. It handles 95% of use cases and AI knows it well.

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Missing foreign keys** | Orphaned records; data inconsistency | FK constraints with explicit ON DELETE |
| **No indexes** | Full table scans on every query | Index lookup columns, foreign keys, sort columns |
| **String concatenation in queries** | SQL injection | Parameterized queries always |
| **Select *** in production code** | Unnecessary data transfer; breaks when schema changes | Explicit column lists |
| **Business logic in database** | Logic split across app and DB; hard to test | Business logic in services; DB for data integrity only |
| **No migration reversibility** | Can't rollback broken deployments | Every migration has a tested down migration |
| **Missing NOT NULL** | Application crashes on null values | NOT NULL constraints on required fields |

---

## Key Takeaways

1. Normalize by default. Denormalize only with performance data.
2. UUID primary keys. Timestamps on every table. NOT NULL on required fields.
3. Index lookup columns, foreign keys, and sort columns.
4. Parameterized queries. Always. No exceptions.
5. Database access through repositories. Transactions for atomic operations.
6. Every migration is reversible and tested on staging first.

---

## Cross-References

- **Depends on:** `backend-architecture.md` — database as a layer in backend architecture
- **Extended by:** `supabase-database.md` — Supabase/PostgreSQL-specific patterns including RLS
- **Applied by:** `api-design-standards.md` — API endpoints that query the database
