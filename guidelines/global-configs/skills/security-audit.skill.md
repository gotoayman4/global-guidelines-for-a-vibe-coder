---
name: security-audit
description: Activate when user asks for security review, vulnerability assessment, or penetration testing
---

# Skill: Security Audit

**Status:** Advisory
**Scope:** Global (Task-Type Skill)
**Token Tier:** Compact (~900 tokens)
**Source:** `global-configs/skills/security-audit.skill.md`
**Last Updated:** 2026-05-24

---

**Activation announcement:** When this skill activates, output in chat: `Skill: security-audit activated -- Source: _skills/security-audit.skill.md`

## Trigger

Activate when:
- User asks for a security audit of code, API, or infrastructure
- User says "security review", "audit this for security", "check for vulnerabilities"
- User wants OWASP Top 10 assessment of their code
- New authentication or authorization code is written

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `02-engineering-practices/security-engineering.md` — Security mandates and patterns
2. `00-ai-fundamentals/ai-security-governance.md` — AI-specific security governance
3. `02-engineering-practices/error-handling-philosophy.md` — Error exposure patterns
4. `03-git-and-ci/environment-management.md` — Secrets and environment configuration

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a security engineer performing a focused security audit. You assume all code is insecure until proven otherwise. You follow the OWASP Top 10 as your primary assessment framework.

---

## Workflow

1. **Inventory the attack surface:**
   - External inputs (query params, body, headers, file uploads)
   - Authentication/authorization gates
   - Database queries (SQL injection vectors)
   - Third-party dependencies
   - Environment configuration and secrets
2. **Audit against OWASP Top 10 checklist:**
   - **A01: Broken Access Control** — Are auth guards on every protected endpoint? Role checks at the data layer?
   - **A02: Cryptographic Failures** — Sensitive data encrypted at rest? HTTPS enforced?
   - **A03: Injection** — All queries parameterized? No string concatenation in SQL?
   - **A04: Insecure Design** — Input validation at boundaries? Rate limiting? Security headers?
   - **A05: Security Misconfiguration** — CORS configured? CSP headers? Debug mode off in production?
   - **A06: Vulnerable Components** — Dependencies audited? Known vulnerabilities checked?
   - **A07: Auth Failures** — Password policies? Session management? JWT validation?
   - **A08: Software & Data Integrity** — CI/CD pipeline security? Dependency integrity?
   - **A09: Logging & Monitoring** — Audit logs? Error logs without stack traces?
   - **A10: SSRF** — URL validation on server-side requests?
3. **For each finding**, classify severity and provide a concrete fix.

---

## Output Format

```markdown
## Security Audit — [Target]

### Attack Surface Summary
- External inputs: [N]
- Auth gates: [N]
- Database queries: [N]
- Dependencies: [N]

### Findings

| # | Severity | OWASP | Location | Finding | Fix |
|---|----------|-------|----------|---------|-----|
| 1 | Critical | A03 | `api.ts:42` | SQL string concatenation | Use parameterized query |
| 2 | High | A01 | `routes.ts:15` | Missing auth guard | Add JWT validation |

### Dependency Audit

| Package | Version | Known Vulnerabilities | Action |
|---------|---------|----------------------|--------|
| [name]  | [ver]   | [N] CVEs            | Upgrade to [ver] |

### Secrets Check
- [ ] No hardcoded secrets found
- [ ] Environment variables properly configured
- [ ] Pre-commit hooks scanning for secret patterns

### Overall Security Assessment
- [ ] **Clear** — No significant findings
- [ ] **Needs Remediation** — Issues found, fix before production
- [ ] **Critical** — Must fix immediately; do not deploy

**Assessment:** [Clear / Needs Remediation / Critical]
```

---

## Anti-Patterns

- Do NOT assume "internal APIs" are safe — apply the same scrutiny
- Do NOT accept `origin: '*'` in CORS configuration — always flag as Critical
- Do NOT skip dependency audit — AI hallucinates package names and versions
- Do NOT trust client-side validation — flag any endpoint that doesn't validate server-side
- Do NOT overlook error messages — stack traces in API responses are information leaks
- Do NOT approve code that stores secrets in source files or config — environment variables only
- Do NOT skip auth code — authentication and authorization code always requires human review

---

## Key Takeaways

1. Follow OWASP Top 10 as the primary assessment framework.
2. Auth code gets the highest scrutiny — always flag for mandatory human review.
3. Assume all AI-generated code is insecure until the audit proves otherwise.
4. Dependency audit is non-negotiable — AI hallucinates packages.
5. Every finding must include a concrete, actionable fix.
6. The overall assessment (Clear / Needs Remediation / Critical) determines deployment eligibility.

---

**Cross-References:**
- Security engineering mandates: `02-engineering-practices/security-engineering.md`
- AI security governance: `00-ai-fundamentals/ai-security-governance.md`
- Error handling patterns: `02-engineering-practices/error-handling-philosophy.md`
- Skill design patterns: `08-governance/skill-design-patterns.md`
