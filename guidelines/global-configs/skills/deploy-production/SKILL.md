---
name: deploy-production
description: Production deployment to free-tier hosting (Vercel, Netlify, Cloudflare Pages). Use when shipping, releasing or going live, including the pre-deploy checklist and the post-deploy smoke test. Triggers on "deploy", "ship to production", "go live", "publish".
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, deploy, production, hosting
---

# Skill: Deploy to Production

---

## Trigger

Activate when:
- User says "deploy", "ship to production", "go live", "publish", "release"
- User wants to push their application to a live hosting environment
- User asks about deploying to Vercel, Netlify, or other hosting platforms
- User has completed a feature and wants to make it available to real users
- **The deploy target has an operation-billed backend or a download-billed host:** fire
  `firestore-cost-optimization` **before shipping**, not after the invoice. Two setup-time facts are
  verified at this moment, once: cache headers on content-hashed assets (long `max-age` + `immutable`) and
  the shipped bundle size — and a backend the emulator created for you locally must be confirmed to exist
  in the live project (see `security-engineering.md` rule 17, written from a first deploy where the
  emulator-only backend did not exist live).

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `03-git-and-ci/git-workflow-strategy.md` — Branch protection, commit before deploy
2. `03-git-and-ci/ci-cd-philosophy.md` — CI pipeline gates
3. `03-git-and-ci/local-ci-strategy.md` — Local pre-push gate (the CI that must be green before deploy)
4. `02-engineering-practices/security-engineering.md` — Pre-deploy security checklist
5. `02-engineering-practices/cost-optimization-strategy.md` — Free-tier hosting options

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a deployment specialist. You guide vibe coders through making their application available to real users — the first pilot and every release after it — using free-tier hosting by default. You prioritize safety, simplicity, and verification. **Shipping does not change the project's declared mode** (`speed-tiered-workflow.md` §Release Classes): the release class decides how hard the boundary checks.

---

## Workflow

1. **Classify the release — before the checklist:**
   - **`pilot`** — live testing, a demo, an internal/beta release: real users, non-final stakes.
   - **`production`** — the final/public launch users depend on.
   Record the class in the release tag or the deploy commit message. It does not edit `WORLD.md`.
2. **Pre-deploy checklist:** Verify all items before deploying:
   - All features tested in browser (happy path, error path, RTL/LTR)
   - No `console.log` statements in production code
   - No hardcoded secrets or API keys
   - No TODO/FIXME comments remaining
   - Build succeeds locally (`npm run build`) — the release boundary builds in **every** mode, even when the project's per-push gate deferred it (`standard`)
   - The release boundary chain is green: lint → type check → full test suite → build (see `03-git-and-ci/local-ci-strategy.md`). A `pilot` also passes the critical-flow checks (LTR and RTL) on the flows it exposes; a `production` release runs every `ship`-tier guard (the full critical-flow E2E matrix), the path-aware extras and a tested rollback.
   - Environment variables configured for production
   - AGENTS.md and WORLD.md are committed and up to date
3. **Choose hosting platform:** Default to free-tier options:
   - **Vercel** — Best for React/Next.js. Free tier: 100GB bandwidth, serverless functions
   - **Netlify** — Alternative for static sites and SPAs. Free tier: 100GB bandwidth
   - **Cloudflare Pages** — Good for static sites. Free tier: unlimited bandwidth
4. **Configure environment:** Set production environment variables on the hosting platform (never in code). Database URL, API keys, auth secrets.
5. **Build and deploy:** Run `npm run build` → push to hosting platform. Verify the build output.
6. **Smoke test on production:** Visit the live URL. Test: page loads, login works, data displays, RTL mode works, no console errors.
7. **Monitor:** Check hosting platform dashboard for errors in the first 24 hours.
8. **Document:** Note the release class, the deployment URL, environment variables used, and any issues encountered.

---

## Output Format

```markdown
## Production Deployment — [App Name]

### Pre-Deploy Checklist
- [ ] Release class recorded (`pilot` / `production`)
- [ ] All features tested in browser
- [ ] No console.log in production code
- [ ] No hardcoded secrets
- [ ] No TODO/FIXME remaining
- [ ] Build succeeds (npm run build)
- [ ] Release boundary green (lint → type check → full suite → build; production adds the ship-tier E2E + path extras + rollback)
- [ ] Environment variables configured
- [ ] AGENTS.md and WORLD.md committed

### Deployment Details
| Property | Value |
|----------|-------|
| Platform | [Vercel/Netlify/Cloudflare] |
| URL | [production URL] |
| Branch | [main/production] |
| Release class | [pilot/production] |
| Build command | npm run build |
| Output directory | [dist/build] |

### Post-Deploy Smoke Test
- [ ] Landing page loads
- [ ] Login works
- [ ] Data displays correctly
- [ ] RTL mode works
- [ ] No console errors
- [ ] Mobile responsive layout

### Environment Variables
| Variable | Set on Platform? | Notes |
|----------|-----------------|-------|
| DATABASE_URL | [Yes/No] | Set via hosting dashboard |
| API_KEY | [Yes/No] | Never in code |
| AUTH_SECRET | [Yes/No] | Never in code |

### Known Issues
- [List any issues found during smoke testing]
```

---

## Anti-Patterns

- Do NOT deploy without running `npm run build` locally first — if the build fails locally, it will fail on the server
- Do NOT deploy with a red or skipped release boundary — the full pipeline must be green before any deploy, whatever the loop's mode
- Do NOT escalate the declared mode just to deploy — classify the release (`pilot` / `production`) and run the boundary at that depth
- Do NOT hardcode environment variables — use the hosting platform's environment variable settings
- Do NOT deploy on a Friday or before a weekend — deploy Monday-Thursday so you're available to fix issues
- Do NOT skip the smoke test — always verify the live URL after deploying
- Do NOT deploy the main branch directly without testing — use a preview/branch deployment first
- Do NOT forget to set environment variables on the hosting platform — the app will crash without them
- Do NOT ignore hosting platform error logs — check them in the first 24 hours after deployment

---

## Key Takeaways

1. Pre-deploy checklist is non-negotiable. Deploy only after all items pass.
2. Classify the release first — `pilot` or `production` — and never edit the declared mode to ship.
3. Default to free-tier hosting: Vercel, Netlify, or Cloudflare Pages.
4. Environment variables go on the hosting platform, never in code.
5. Always smoke test the live URL after deploying — local success ≠ production success.
6. Build locally before deploying to catch errors early.
7. Monitor error logs for the first 24 hours after deployment.

---

## Cross-References

- Git workflow: `03-git-and-ci/git-workflow-strategy.md`
- CI/CD philosophy: `03-git-and-ci/ci-cd-philosophy.md`
- Local CI strategy: `03-git-and-ci/local-ci-strategy.md`
- Security engineering: `02-engineering-practices/security-engineering.md`
- Cost optimization: `02-engineering-practices/cost-optimization-strategy.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md` (central repository only; not delivered with this skill)
