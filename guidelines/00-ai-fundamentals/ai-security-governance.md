# AI Security Governance — Securing AI-Assisted Development

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~900 tokens)
**Last Updated:** 2026-08-26
**Cross-References:** `ai-collaboration-mindset.md`, `ai-agent-orchestration.md`, `security-engineering.md`

---

**Premise:** "Modern AI knows security" is the most dangerous assumption in vibe coding. Models produce plausible, functional output — not secure output. Implementation-level security standards live in `security-engineering.md`; this document covers AI-specific attack surfaces: supply chain, agent/MCP access, and governance.

## Directives

1. **Three-level attack surface of AI development:** ① code vulnerabilities (OWASP Top 10 — covered by `security-engineering.md`), ② dependency supply chain, ③ tool/agent access (MCP). All three require active defense.
2. **Dependency audit on every AI-generated PR:** `npm audit` + existence verification (`npm ls <pkg>`) + deeper scanning (`npx snyk test`) for high-risk changes. AI hallucinates package names ("slopsquatting") and suggests CVE-laden or typosquatted packages.
3. **Latest-stable-version mandate:** before installing/pinning any package, verify current latest stable via web/npm (`npm view <pkg> version`) and cross-check changelog. Never accept an AI-suggested version number without verification.
4. **Older-major pins allowed ONLY with documented ADR reason:** peer-dependency constraint · Arabic RTL regression in latest · undocumented breaking change with no migration guide · platform constraint (e.g., Electron/Chromium match) · proven ecosystem lag. The ADR prevents future sessions from overriding the decision.
5. **MCP least privilege by environment:** development = full local access · staging = read-only DB · **production = read-only logs/metrics, never write**. Whitelist tools per agent (`--allowedTools` / permission settings) — never "all tools". Review each MCP call: right tool? correct scoped parameters? side effects?
6. **Agent secrets isolation:** block agents from `.env`/`credentials/` via ignore files; separate MCP credentials per environment (dev creds never match production); no shared sessions across environments.
7. **Git hygiene:** pre-commit secret scanning (git-secrets/talisman) + CI commit scanning; a committed secret is ROTATED immediately, not just deleted from history.
8. **Security review checklist applies to every AI-generated change before merge** (see consolidated checklist in `security-engineering.md`).
9. **AI security fixes get manual review too** — AI can introduce new vulnerabilities while fixing old ones.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| "The AI is smart enough for security" | Assume all AI code insecure until reviewed |
| Accepting `origin: '*'` "temporarily" | Explicit whitelist from day one |
| Unrestricted MCP access | Per-agent whitelist; no production writes |
| Trusting AI tests to cover attacks | Manual auth/permission test review |
| Skipping dependency verification | Audit + version check every PR |
| Removing committed secret from history only | Rotate immediately |

## Cross-References

- **Depends on:** `ai-collaboration-mindset.md`
- **Applied by:** `ai-agent-orchestration.md`
- **Extended by:** `security-engineering.md`, `../08-governance/ai-governance-framework.md`
