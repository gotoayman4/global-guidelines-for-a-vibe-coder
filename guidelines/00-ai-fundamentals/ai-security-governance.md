# AI Security Governance — Securing AI-Assisted Development

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,100 tokens)
**Last Updated:** 2026-05-26
**Cross-References:** `ai-collaboration-mindset.md`, `ai-agent-orchestration.md`

---

## Purpose

Define the security risks unique to AI-assisted development and establish governance practices that prevent AI-generated vulnerabilities from reaching production. AI models prioritize "working code" over "secure code" — this document is the counterbalance.

---

## The Fundamental Problem

AI models, regardless of capability level, consistently produce code with security vulnerabilities. Research confirms that when given a choice between secure and insecure implementations, models choose insecure nearly half the time. The most dangerous assumption in vibe coding is: "modern AI knows security."

**It doesn't.** AI training data contains far more insecure code examples than secure ones. The model's objective is to produce plausible, functional output — not secure output. Security is always your responsibility.

---

## The AI Security Attack Surface

AI-assisted development introduces security risks at three levels:

### Level 1: Code-Level Vulnerabilities
The AI generates code that contains OWASP Top 10 vulnerabilities:
- SQL injection (unparameterized queries)
- XSS (unsanitized user input rendered in DOM)
- Broken authentication (weak password hashing, missing rate limiting)
- Sensitive data exposure (hardcoded secrets, stack traces in production)
- Broken access control (missing authorization checks on endpoints)

### Level 2: Dependency Supply Chain
The AI suggests packages that:
- Don't exist ("slopsquatting" — hallucinated package names)
- Are outdated versions with known CVEs
- Are typosquatted malicious packages
- Have excessive permissions or suspicious maintainers

### Level 3: Tool and Agent Access (MCP)
As of 2026, agents connect to databases, APIs, and services via Model Context Protocol (MCP). Unrestricted MCP access means:
- A background agent can drop your production database while "fixing a bug"
- An agent with Slack MCP access can post messages as you
- An agent with GitHub MCP access can push unreviewed code to main

---

## Mandatory Security Practices

### 1. Never Trust AI-Generated Auth Code

AI-generated authentication looks correct superficially but fails under real scrutiny. Every auth route must be manually reviewed for:
- Password hashing (bcrypt/argon2, never MD5/SHA1)
- Rate limiting on login endpoints
- Session management (secure, httpOnly, SameSite cookies)
- JWT implementation (proper signing, expiration, refresh token rotation)
- OAuth flow correctness (state parameter, redirect URI validation)

**Rule:** Auth code gets 100% human review. No exceptions. No "the tests pass, so it's fine."

### 2. Parameterize All Database Queries

The #1 AI-generated vulnerability is SQL injection via string concatenation or template literals.

```
// NEVER ACCEPT THIS FROM AI:
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ALWAYS REQUIRE THIS:
const query = 'SELECT * FROM users WHERE email = $1';
```

**Rule:** Explicitly require parameterized queries in every backend prompt. Include in rules files: "All database queries MUST use parameterized statements. String concatenation in queries is forbidden."

### 3. Validate All Inputs — Server-Side

AI-generated code often validates inputs on the client side only, or uses weak validation. Require:

- Server-side validation using a schema library (Zod, Joi, Yup)
- Input sanitization for HTML/script injection
- Type coercion rejection (don't accept "123" where a number is expected unless explicitly intended)
- File upload validation (type, size, content scanning)

### 4. CORS and CSP Enforcement

AI defaults to permissive configurations because they "just work":

```
// NEVER ACCEPT:
cors({ origin: '*', credentials: true })
helmet({ contentSecurityPolicy: false })

// ALWAYS REQUIRE:
cors({ origin: ['https://myapp.com'], credentials: true })
helmet({ contentSecurityPolicy: { directives: { ... } } })
```

**Rule:** CORS origins must be explicit whitelists. CSP must be enabled. Never accept `origin: '*'` in production.

### 5. Secrets Management

AI will happily hardcode API keys, database URLs, and JWT secrets into source code. Require:
- All secrets in environment variables (`.env` — which is in `.gitignore`)
- No secrets in code, comments, test fixtures, or documentation
- `.cursorignore` or equivalent to prevent agents from reading `.env` files
- CI/CD secrets via platform secret managers (GitHub Secrets, Vercel Env, etc.)

### 6. Dependency Audit on Every AI-Generated PR

Run these checks before merging any AI-generated code:
```bash
npm audit          # Known vulnerabilities in dependencies
npx snyk test      # Deeper vulnerability scanning
npm ls [package]   # Verify package actually exists (AI hallucination check)
```

**Rule:** Unreviewed dependencies are the #1 supply chain risk. AI suggests packages that don't exist or have known CVEs.

### 6a. Latest Stable Version Mandate (Non-Negotiable)

AI training data is inherently stale. Model knowledge of package versions is frozen at the training cutoff date. Relying on AI-suggested version numbers without verification guarantees outdated — and potentially vulnerable — dependencies.

**Before installing or pinning any package version, the AI MUST:**
1. Search the web or npm registry (`npm view <package> version`) for the current latest stable version
2. Cross-reference with the package's documentation and changelog for breaking changes
3. Document the version and the verification source (npm registry, official docs, GitHub releases)

**Rule:** Never accept an AI-suggested package version without web/documentation verification. "The AI said version X is latest" is not acceptable — training data is stale by definition.

**Exceptions — Pinning to older major versions is acceptable when:**
| Reason | Example |
|---|---|
| **Stack compatibility** | A peer dependency requires a specific major version range |
| **Arabic RTL regressions** | The latest version has documented Arabic/BiDi rendering bugs or breaks logical property support |
| **Undocumented breaking changes** | Major version jump has no migration guide, changelog, or community adoption yet — AI has zero training data on the new API |
| **Platform constraint** | Electron version must match a specific Chromium version for a required native module |
| **Proven ecosystem lag** | Key plugins/extensions for the stack component have not yet updated to the latest major |

**Decision must be documented** in the project's Architecture Decision Records (ADRs). The exception reason becomes part of the project's permanent rationale so future AI sessions do not override it.

---

## MCP and Tool Access Governance

Model Context Protocol (MCP) is the most dangerous new attack surface. Governance rules:

### Principle of Least Privilege for Agents

| Environment | Agent Access | Rationale |
|---|---|---|
| **Development** | Local DB, staging APIs, test services | Full access for development speed |
| **Staging** | Read-only staging DB, staging APIs | Prevent data loss during testing |
| **Production** | Read-only logs and metrics ONLY | Never allow agents to write to production |

### MCP Whitelist, Not Blacklist

Use `--allowedTools` (Claude Code) or Cursor's permission settings to explicitly define what each agent can touch. Never grant "all tools." Specify the exact MCP servers and operations allowed.

### Review MCP Tool Calls

Before approving an agent action, verify:
- Is this the right tool for this operation?
- Are the parameters correct and scoped appropriately?
- Could this action have unintended side effects?

A background agent tasked with "clean up old data" running `DELETE FROM users WHERE created_at < '2024-01-01'` against production has destroyed your business.

---

## Environment Isolation

### Prevent Agent Secrets Access

1. **`.cursorignore` / `.claudeignore`:** Block agents from reading `.env`, `.env.local`, `credentials/`, `secrets/`
2. **Separate MCPs by environment:** Development MCP credentials must never match production credentials
3. **No shared sessions between environments:** A session connected to staging should never also have production access

### Git Hygiene for Secrets

- Pre-commit hooks to scan for secrets (e.g., `git-secrets`, `talisman`)
- CI/CD pipeline scans all commits for secret patterns
- If a secret is committed: rotate it immediately, don't just remove it from git history

---

## Security Review Checklist for AI-Generated Code

Before merging any AI-generated change, verify:

```
[ ] Authentication: Are auth checks present on every protected route?
[ ] Authorization: Are role/permission checks applied correctly?
[ ] Input Validation: Are all user inputs validated server-side?
[ ] SQL/DB Queries: Are all queries parameterized?
[ ] XSS: Is user-generated content sanitized before rendering?
[ ] CORS/CSP: Are security headers properly configured?
[ ] Secrets: Are there any hardcoded keys, tokens, or passwords?
[ ] Dependencies: Have new dependencies been audited (npm audit, existence check)?
[ ] Error Handling: Do error responses leak stack traces or internal details?
[ ] File Uploads: Are uploads validated for type, size, and content?
[ ] Rate Limiting: Are sensitive endpoints rate-limited?
```

---

## Anti-Patterns in AI Security

| Anti-Pattern | Why It's Dangerous | Fix |
|---|---|---|
| **"The AI is smart enough for security"** | AI has no security judgment | Assume all AI code is insecure until proven otherwise |
| **Accepting `origin: '*'` "for now"** | "For now" ships to production | Explicit CORS whitelist from day one |
| **Skipping dependency audit** | AI hallucinates package names | `npm audit` + existence verification on every AI PR |
| **Unrestricted MCP access** | Agent can destroy production data | Whitelist tools per agent; no production write access |
| **Hardcoding secrets "temporarily"** | Temporary becomes permanent | `.env` files from day one; pre-commit hooks |
| **Trusting AI-generated tests for security** | AI tests happy paths, not attack vectors | Manually review auth and permission test coverage |
| **Running AI security fixes without review** | AI can introduce new vulnerabilities while "fixing" old ones | Review every security-related change manually |

---

## Key Takeaways

1. AI does not understand security. It generates plausible code — secure or not.
2. Auth code gets 100% human review. No exceptions.
3. All queries parameterized. All inputs validated server-side.
4. Dependencies audited on every AI PR. AI hallucinates package names.
5. MCP access governed by least privilege. Never give agents production write access.
6. Environment isolation: agents cannot read `.env` files. Secrets are never in code.
7. Security review checklist applied to every AI-generated change before merge.

---

## Cross-References

- **Depends on:** `ai-collaboration-mindset.md` — the "False Confidence" risk and verification culture
- **Applied by:** `ai-agent-orchestration.md` — MCP governance in multi-agent workflows
- **Extended by:** `security-engineering.md` (02-engineering-practices) — detailed security implementation patterns
- **Extended by:** `ai-governance-framework.md` (08-governance) — authority hierarchy and agent permission models
