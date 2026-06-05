---
name: deploy-production
description: Activate when user wants to deploy, ship, publish, or release to production
---

# Skill: Deploy to Production

**Status:** Advisory
**Scope:** Global (Task-Type Skill)
**Token Tier:** Compact (~650 tokens)
**Source:** `global-guidelines-for-a-vibe-coder/global-configs/skills/deploy-production.skill.md`
**Last Updated:** 2026-05-25

---

**Activation announcement:** When this skill activates, output in chat: `Skill: deploy-production activated -- Source: D:\WebApps\global-guidelines-for-a-vibe-coder/global-configs/skills/deploy-production.skill.md`

## Trigger

Activate when:
- User says "deploy", "ship to production", "go live", "publish", "release"
- User wants to push their application to a live hosting environment
- User asks about deploying to Vercel, Netlify, or other hosting platforms
- User has completed a feature and wants to make it available to real users

---

## Load Guidelines

Load compact extracts (Key Takeaways + Anti-Patterns) from:

1. `03-git-and-ci/git-workflow-strategy.md` — Branch protection, commit before deploy
2. `03-git-and-ci/ci-cd-philosophy.md` — CI pipeline gates
3. `02-engineering-practices/security-engineering.md` — Pre-deploy security checklist
4. `02-engineering-practices/cost-optimization-strategy.md` — Free-tier hosting options

**Guideline base path:** `D:\WebApps\global-guidelines-for-a-vibe-coder/`

---

## Role

You are a deployment specialist. You guide vibe coders through the process of making their application available to real users for the first time, using free-tier hosting by default. You prioritize safety, simplicity, and verification.

---

## Workflow

1. **Pre-deploy checklist:** Verify all items before deploying:
   - All features tested in browser (happy path, error path, RTL/LTR)
   - No `console.log` statements in production code
   - No hardcoded secrets or API keys
   - No TODO/FIXME comments remaining
   - Build succeeds locally (`npm run build`)
   - Environment variables configured for production
   - AGENTS.md and WORLD.md are committed and up to date
2. **Choose hosting platform:** Default to free-tier options:
   - **Vercel** — Best for React/Next.js. Free tier: 100GB bandwidth, serverless functions
   - **Netlify** — Alternative for static sites and SPAs. Free tier: 100GB bandwidth
   - **Cloudflare Pages** — Good for static sites. Free tier: unlimited bandwidth
3. **Configure environment:** Set production environment variables on the hosting platform (never in code). Database URL, API keys, auth secrets.
4. **Build and deploy:** Run `npm run build` → push to hosting platform. Verify the build output.
5. **Smoke test on production:** Visit the live URL. Test: page loads, login works, data displays, RTL mode works, no console errors.
6. **Monitor:** Check hosting platform dashboard for errors in the first 24 hours.
7. **Document:** Note the deployment URL, environment variables used, and any issues encountered.

---

## Output Format

```markdown
## Production Deployment — [App Name]

### Pre-Deploy Checklist
- [ ] All features tested in browser
- [ ] No console.log in production code
- [ ] No hardcoded secrets
- [ ] No TODO/FIXME remaining
- [ ] Build succeeds (npm run build)
- [ ] Environment variables configured
- [ ] AGENTS.md and WORLD.md committed

### Deployment Details
| Property | Value |
|----------|-------|
| Platform | [Vercel/Netlify/Cloudflare] |
| URL | [production URL] |
| Branch | [main/production] |
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
- Do NOT hardcode environment variables — use the hosting platform's environment variable settings
- Do NOT deploy on a Friday or before a weekend — deploy Monday-Thursday so you're available to fix issues
- Do NOT skip the smoke test — always verify the live URL after deploying
- Do NOT deploy the main branch directly without testing — use a preview/branch deployment first
- Do NOT forget to set environment variables on the hosting platform — the app will crash without them
- Do NOT ignore hosting platform error logs — check them in the first 24 hours after deployment

---

## Key Takeaways

1. Pre-deploy checklist is non-negotiable. Deploy only after all items pass.
2. Default to free-tier hosting: Vercel, Netlify, or Cloudflare Pages.
3. Environment variables go on the hosting platform, never in code.
4. Always smoke test the live URL after deploying — local success ≠ production success.
5. Build locally before deploying to catch errors early.
6. Monitor error logs for the first 24 hours after deployment.

---

**Cross-References:**
- Git workflow: `03-git-and-ci/git-workflow-strategy.md`
- CI/CD philosophy: `03-git-and-ci/ci-cd-philosophy.md`
- Security engineering: `02-engineering-practices/security-engineering.md`
- Cost optimization: `02-engineering-practices/cost-optimization-strategy.md`
- Skill design patterns: `08-governance/skill-design-patterns.md`
