---
status: "Normative"
scope: "Global"
tags: [cost, hosting, tokens, free-tier]
---

# Cost Optimization Strategy — Maximizing Value, Minimizing Spend

---

Every dollar on tools/hosting/tokens is a dollar not spent building. Default to free; justify every expense.

## Directives

1. **Free-tier-first stack:** Vite+React+shadcn/Tailwind (SPA) · + Express/Hono + SQLite→Supabase (full-stack) · Astro+Cloudflare Pages (content) · question whether real-time is needed at all.
2. **Free alternatives before paid:** shadcn/ui vs premium UI kits · Supabase Auth/Lucia vs Auth0/Clerk · React Query + Zustand vs Redux paid ecosystems · Cloudflare Pages/R2 · **local CI (pre-commit + pre-push hooks — zero cost, zero quota, see `../03-git-and-ci/local-ci-strategy.md`)** · DevTools before Datadog.
3. **Hosting hierarchy — lowest tier that works:** Vercel Hobby (100GB) / Cloudflare Pages (unlimited bandwidth) / Netlify Starter / Supabase free (500MB DB) / R2 storage. Paid tiers ($20–25/mo) only when a measurable free-tier limit is hit; VPS (~$5–20/mo) as last resort. NEVER pre-pay for capacity you don't need — scale comes after users. Cloud CI minutes are never purchased — the local machine runs all gates for free.
4. **Subscription justification rule** for every paid service: which measurable free-tier limit was hit · monthly cost · what the paid tier actually unlocks. "We'll need it at scale" is rejected.
5. **Cost monitoring:** spending alerts on every paid service · monthly review of unused/under-used services · prune database data before upgrading tiers.
6. **AI token & reasoning-tier costs:** compact guideline extracts by default (see `context-management-strategy.md`) · route both model tier and reasoning effort by task risk and speed mode — lightweight/low-reasoning tier for boilerplate, formatting, and simple `vibe` tasks · mid/standard-reasoning tier for steady `standard` feature slices and bug fixes · frontier/high-reasoning tier (fresh session) for architecture, auth/security (`guarded`), cross-cutting refactors, and regeneration after **2 failed fixes** · track monthly spend against a cap.
7. **An operation-billed backend (Firestore, DynamoDB, serverless functions) gets a stated ceiling AND a failing check.** Here the risk is a *code shape*, not a traffic spike, so the three shapes worth banning statically are: an unbounded collection read (no `limit`, no recorded exception), a realtime listener where a one-shot read serves (it keeps spending after the tab closes), and per-row client deletes. **Rule 17 of `security-engineering.md` applies to spend exactly as it applies to auth: a ceiling no gate step can turn red is documentation**, so each ban names the step that enforces it (`lint`, `test` — prefer a check on a step that already runs over a new audit tool), and the rule states **what it does not cover** (write/delete volume, download bytes, the %-of-quota headroom) instead of letting a green gate imply total control. Quota figures are read from the live project (Console/CLI, with a date and the edition) at the moment they are used — a hand-transcribed number goes stale silently and nothing detects it.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Pre-paying "for scale" | Upgrade on measured limits only |
| Premium services with free equivalents | Free-first stack table |
| No spending alerts | Alerts on every paid service |
| Expensive model for routine generation | Cost-tier routing |
| A cost rule that nothing can violate red | The two or three biggest bans become static checks on a step that already runs (`lint`, `test`); the rest is labelled advisory |
| Quota numbers copied from a document or a template | Re-read them from the live project when they are used, with the edition and the date |

## Cross-References

`context-management-strategy.md` · `multi-tool-workflows.md` · `../03-git-and-ci/local-ci-strategy.md`
