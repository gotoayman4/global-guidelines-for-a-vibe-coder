# Cost Optimization Strategy — Maximizing Value, Minimizing Spend

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~700 tokens)
**Last Updated:** 2026-08-28
**Cross-References:** `context-management-strategy.md`, `multi-tool-workflows.md`, `development-workflow.md`, `../03-git-and-ci/local-ci-strategy.md`

---

Every dollar on tools/hosting/tokens is a dollar not spent building. Default to free; justify every expense.

## Directives

1. **Free-tier-first stack:** Vite+React+shadcn/Tailwind (SPA) · + Express/Hono + SQLite→Supabase (full-stack) · Astro+Cloudflare Pages (content) · question whether real-time is needed at all.
2. **Free alternatives before paid:** shadcn/ui vs premium UI kits · Supabase Auth/Lucia vs Auth0/Clerk · React Query + Zustand vs Redux paid ecosystems · Cloudflare Pages/R2 · **local CI (pre-commit + pre-push hooks — zero cost, zero quota, see `../03-git-and-ci/local-ci-strategy.md`)** · DevTools before Datadog.
3. **Hosting hierarchy — lowest tier that works:** Vercel Hobby (100GB) / Cloudflare Pages (unlimited bandwidth) / Netlify Starter / Supabase free (500MB DB) / R2 storage. Paid tiers ($20–25/mo) only when a measurable free-tier limit is hit; VPS (~$5–20/mo) as last resort. NEVER pre-pay for capacity you don't need — scale comes after users. Cloud CI minutes are never purchased — the local machine runs all gates for free.
4. **Subscription justification rule** for every paid service: which measurable free-tier limit was hit · monthly cost · what the paid tier actually unlocks. "We'll need it at scale" is rejected.
5. **Cost monitoring:** spending alerts on every paid service · monthly review of unused/under-used services · prune database data before upgrading tiers.
6. **AI token costs:** compact guideline extracts by default (see `context-management-strategy.md`) · cheap models for routine tasks (boilerplate, styling) · expensive models reserved for architecture and security review · track monthly spend against a cap.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Pre-paying "for scale" | Upgrade on measured limits only |
| Premium services with free equivalents | Free-first stack table |
| No spending alerts | Alerts on every paid service |
| Expensive model for routine generation | Cost-tier routing |

## Cross-References

`context-management-strategy.md` · `multi-tool-workflows.md` · `../03-git-and-ci/local-ci-strategy.md`
