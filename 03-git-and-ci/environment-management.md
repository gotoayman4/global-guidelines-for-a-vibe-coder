# Environment Management — Configuration and Secrets Across Environments

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,500 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `ai-security-governance.md`, `ci-cd-philosophy.md`

---

## Purpose

Define the strategy for managing environments, configuration, and secrets in AI-assisted projects. AI frequently hardcodes configuration, leaks secrets, and confuses environment boundaries. This document provides the guardrails.

---

## Environment Separation

Every project must have at minimum:

| Environment | Purpose | Data | Access |
|---|---|---|---|
| **Development** | Local development | Mock/sample data, local DB | Developer only |
| **Staging** | Pre-production validation | Anonymized prod-like data | Team + CI |
| **Production** | Live user-facing system | Real user data | Restricted, audited |

**Rule:** Development never connects to production services. Staging uses production-like configuration but isolated infrastructure.

---

## Configuration Management

### Environment Variables

All environment-specific configuration lives in environment variables, never in code.

```bash
# .env.development
API_URL=http://localhost:3000
DATABASE_URL=postgres://localhost:5432/dev_db
DEBUG=true

# .env.production
API_URL=https://api.myapp.com
DATABASE_URL=postgres://production-db:5432/prod_db
DEBUG=false
```

### What Belongs in Environment Variables
- Database connection strings
- API keys and secrets
- External service URLs
- Feature flags
- Debug/logging levels
- Rate limit configurations

### What Belongs in Code
- Framework configuration (build tooling, compiler options)
- Business logic constants
- UI configuration (theme, layout)
- Test configuration

---

## Secrets Management

### The Cardinal Rule
**Secrets are NEVER in code.** Not in source files, not in comments, not in test fixtures, not in documentation, not in commit messages.

### Secrets Storage
```
Development:  .env file (in .gitignore, NEVER committed)
CI/CD:        Platform secret manager (GitHub Secrets, GitLab CI Variables, Vercel Env)
Production:   Secret manager (AWS Secrets Manager, HashiCorp , Doppler)
```

### Agent Protection
AI agents must not be able to read secrets:

1. **`.cursorignore` / `.claudeignore`:** Block agents from reading `.env` files
2. **MCP restrictions:** Agents with tool access must not have access to secret management MCPs
3. **No secrets in prompts:** Never paste API keys or connection strings into AI prompts

### Secrets Rotation
- Rotate secrets on a schedule (quarterly minimum)
- Rotate immediately if a secret is accidentally committed
- Rotate immediately if a secret appears in AI training data or conversation logs

### Secrets in CI/CD
```yaml
# GitHub Actions example
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}  # From GitHub Secrets, not hardcoded
  API_KEY: ${{ secrets.API_KEY }}
```

---

## Environment-Specific Configuration

### Development
```
- Debug mode ON
- Verbose logging
- Local database with seed data
- No rate limiting
- CORS allows localhost
- Hot reload enabled
```

### Staging
```
- Debug mode OFF
- Production-like logging
- Anonymized data (no real PII)
- Rate limiting enabled (production config)
- CORS restricted to staging domain
- Monitoring active
```

### Production
```
- Debug mode OFF
- Minimal logging (no PII, no secrets)
- Real user data
- Rate limiting strict
- CORS restricted to production domains
- Full monitoring and alerting
- Database backups automated
```

---

## Preventing Environment Leakage

### Common AI Failures

**AI hardcodes production URLs in development code:**
```typescript
// NEVER ACCEPT:
const API_URL = 'https://api.myapp.com';  // Hardcoded production URL

// ALWAYS REQUIRE:
const API_URL = import.meta.env.VITE_API_URL;  // From environment variable
```

**AI uses development configuration in production prompts:**
When asking AI to generate configuration, always specify the environment:
```
Generate the database configuration for the STAGING environment.
Use environment variables. Do not hardcode any connection strings.
```

**AI suggests different stacks per environment:**
AI sometimes suggests SQLite for dev and PostgreSQL for prod. This is a recipe for environment-specific bugs. **Development and production must use the same database engine.**

---

## Environment Setup Checklist

For every new project or new developer:

```
[ ] .env.example committed with placeholder values (safe to share)
[ ] .env in .gitignore
[ ] .cursorignore blocks .env files from agent access
[ ] CI/CD secrets configured in platform secret manager
[ ] Different API keys for development, staging, production
[ ] Production database credentials never shared with development
[ ] Staging uses isolated database (not a copy of production)
[ ] Pre-commit hook scans for secrets (git-secrets or talisman)
```

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Hardcoded configuration** | Can't change between environments without code change | Environment variables |
| **Committed .env files** | Secrets in git history; can never be fully removed | .gitignore + pre-commit hook |
| **Same secrets across environments** | Dev key leak compromises production | Different keys per environment |
| **Production config in AI prompts** | Secrets leak to AI training data | Never paste production secrets into prompts |
| **Different DB engines per environment** | Environment-specific SQL bugs | Same database engine across all environments |
| **No .cursorignore** | Agents read and potentially expose secrets | Block .env files from agent access |

---

## Key Takeaways

1. Environment variables for everything environment-specific. Never hardcode.
2. Secrets never in code. Not in files, comments, tests, or documentation.
3. Block agents from reading .env files (`.cursorignore`).
4. Different secrets for every environment. Rotate regularly.
5. Development and production use the same technology stack (same DB, same runtime).
6. Pre-commit hooks catch accidental secret commits.

---

## Cross-References

- **Depends on:** `ai-security-governance.md` — secrets management and agent access control
- **Applied by:** `ci-cd-philosophy.md` — CI/CD pipeline needs environment configuration
- **Applied by:** `git-workflow-strategy.md` — `.gitignore` rules for environment files
