# Cost Optimization Strategy — Maximizing Value, Minimizing Spend

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,000 tokens)
**Last Updated:** 2026-05-25
**Cross-References:** `context-management-strategy.md`, `development-workflow.md`

---

## Purpose

Define strategies for minimizing costs across all dimensions of vibe coding: tech stack selection, hosting and deployment, AI token consumption, and subscription management. Default to free. Justify every expense.

---

## Core Principle

**Every dollar spent on tools, hosting, or tokens is a dollar not spent on building your product.** Cost optimization is not optional — it's survival discipline for independent vibe coders.

---

## Tech Stack Selection — Free and Open-Source First

### The Cost-Conscious Stack Decision Tree

```
What are you building?
├── Simple SPA (dashboard, form-driven app)
│   → Vite + React + shadcn/ui + Tailwind CSS = $0
├── Full-stack app with auth
│   → Vite + React + Express/Hono + SQLite (MVP) → Supabase (scale) = $0
├── Content-heavy app (blog, docs, marketing)
│   → Astro + Tailwind CSS + Cloudflare Pages = $0
└── Real-time app (chat, collaboration)
    → Evaluate: do you NEED real-time? Most apps don't. If yes: Supabase Realtime free tier.
```

### Library Cost Comparison

| Component | Paid/Premium | Free Alternative |
|---|---|---|
| UI Library | MUI (free for basic, paid for advanced) | shadcn/ui (free, open-source) |
| Auth | Auth0, Clerk (paid tiers) | Supabase Auth free tier, Lucia Auth (free) |
| State Management | Redux toolkit | React Query (server state) + Zustand (UI state) |
| Hosting | Vercel Pro, AWS | Vercel free tier, Cloudflare Pages free tier |
| Database | PlanetScale, Neon paid | Supabase free tier, SQLite |
| CDN | CloudFront, Fastly | Cloudflare free tier |
| Monitoring | Datadog, New Relic | Console logs + browser DevTools |
| CI/CD | CircleCI, Buildkite | GitHub Actions free tier |

### Subscription Justification Rule
Every paid service in the stack MUST have a documented justification:
- What is the measurable limit being hit on the free tier?
- What is the monthly cost?
- What does the paid tier unlock that the project actually needs?

**Anti-pattern:** "We'll need it at scale" — scale comes after users, not before.

---

## Hosting and Deployment — Default to Free Tiers

### Hosting Cost Hierarchy (use lowest that works)

| Tier | Provider | Limits | Monthly Cost |
|---|---|---|---|
| **Free** | Vercel Hobby | 100GB bandwidth, 6000 build minutes | $0 |
| **Free** | Cloudflare Pages | Unlimited bandwidth, 500 builds/month | $0 |
| **Free** | Netlify Starter | 100GB bandwidth, 300 build minutes | $0 |
| **Free** | Supabase | 500MB database, 5GB bandwidth, 50K users | $0 |
| **Free** | Cloudflare R2 | 10GB storage, unlimited egress | $0 |
| **Free** | GitHub Actions | 2000 minutes/month (private repos) | $0 |
| **Paid** | Vercel Pro | When hitting hobby limits | $20/month |
| **Paid** | Supabase Pro | When hitting 500MB database limit | $25/month |
| **Self-Host** | VPS (Hetzner, DigitalOcean) | When free tiers exhausted | ~$5-20/month |

**Rule:** Start on free tiers. Upgrade only when you hit a measurable limit. Never pre-pay for capacity you don't need.

### Cost Monitoring Checklist
- [ ] All services on free tiers by default
- [ ] Spending alerts configured for every paid service
- [ ] Monthly cost review: are any services unused or under-used?
- [ ] Can any paid service be replaced with a free alternative?
- [ ] Database size tracked — prune unused data before upgrading

---

## AI Token Cost Management

### Token Cost ≠ Context Window
Context window size is a technical limit. Token cost is a financial concern. Treat them separately.

### Model Selection by Task Cost

| Task Complexity | Recommended Model | Est. Cost/Task |
|---|---|---|
| Boilerplate, formatting, renaming | Local (Ollama, LM Studio) | $0.00 |
| Simple features, UI changes | Claude Haiku, GPT-4o-mini, Gemini Flash | < $0.02 |
| Feature implementation, testing | Claude Sonnet, GPT-4o | < $0.15 |
| Architecture design, debugging | Claude Opus, GPT-4, DeepSeek | < $1.00 |
| Security review (always human-verified) | Claude Opus | < $0.50 |

### Cost-Aware Token Budget Tiers

| Tier | Token Limit | Est. Cost/Task | Use For |
|---|---|---|---|
| **Free** | < 5K (local model) | $0.00 | Quick fixes, formatting |
| **Budget** | 5-15K (Haiku/Flash) | < $0.05 | Routine features |
| **Standard** | 15-50K (Sonnet/GPT-4o) | < $0.25 | Complex features |
| **Premium** | > 50K (Opus/GPT-4) | < $1.00 | Architecture reviews |

### Token Waste Reduction Strategies

1. **Use compact guideline extracts aggressively** — full guidelines cost 3-5x more tokens than their compact versions
2. **Minimize code in chat** — the developer does not read code; describing changes in plain language saves output tokens
3. **Fresh sessions per feature** — long threads degrade quality and burn tokens on redundant context
4. **Route to cheaper models** — build a habit: "Is this task complex enough to warrant Sonnet, or can Haiku handle it?"
5. **Avoid re-reading unchanged files** — reference file paths, don't paste entire files back into context
6. **Cache common queries** — save successful prompts as templates, don't re-derive the same patterns

### Monthly AI Spend Discipline
- Set a monthly AI spend cap (suggested starting: $20-50/month)
- Track spending by feature: "The dashboard feature cost $3.40 in AI tokens"
- If a feature's AI token cost exceeds its value, simplify the approach
- Use free/local models for all exploratory/prototype work

---

## Database and Storage Costs

| Strategy | Savings |
|---|---|
| SQLite for MVPs and prototypes | Zero hosting cost, zero config |
| Prune test data monthly | Prevents unnecessary storage growth |
| Use Supabase free tier until 500MB | Covers most early-stage projects |
| Archive old data, don't keep it live | Reduces query costs and storage |
| Column-level access (don't SELECT *) | Reduces bandwidth and query cost |

---

## Anti-Patterns in Cost Management

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Pre-paying for scale** | Wasting money on unused capacity | Start free, upgrade when limits are hit |
| **Using Opus/GPT-4 for everything** | $100+/month for boilerplate work | Route simple tasks to Haiku/Flash/local |
| **No spending cap** | Surprise bills, budget overruns | Set monthly caps on every AI service |
| **Ignoring free tiers** | $20/month for services that are free at current scale | Audit all services quarterly |
| **Loading full guidelines for every task** | 3-5x token waste per task | Use compact extracts; load full only when needed |
| **Echoing code blocks in chat responses** | Wasted output tokens, no value to non-coder | Describe changes in plain language |
| **One massive AI session for entire project** | Degraded quality + high token burn | Fresh session per feature |
| **"We need it for production" before launch** | Paying for prod infrastructure with no users | Free tiers handle pre-launch traffic |

---

## Key Takeaways

1. Default to free-tier everything. Justify every paid service with a measurable need.
2. Route AI tasks to appropriately priced models: Haiku/Flash for routine, Opus for architecture.
3. Minimize token waste: compact extracts, no code blocks in chat, fresh sessions per feature.
4. Set monthly AI spend caps. Track spend per feature.
5. SQLite for MVPs, Supabase free tier for scale. Never pre-pay for capacity.
6. Audit all services quarterly: can anything be moved to free or cancelled?
7. Cost optimization is ongoing discipline, not a one-time setup.

---

## Cross-References

- **Depends on:** `context-management-strategy.md` — token budget tiers
- **Applied by:** `beginner-vibe-coder-guide.md` — cost awareness for new coders
- **Applied by:** `development-workflow.md` — efficient development loop
- **Extended by:** `rtl-tech-stack.md` — cost-effective RTL tech choices
