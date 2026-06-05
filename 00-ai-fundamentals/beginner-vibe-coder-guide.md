# Beginner Vibe Coder Guide — Zero Coding Experience, Maximum Results

**Status:** Normative
**Scope:** Global
**Token Tier:** Compact (~1,400 tokens)
**Last Updated:** 2026-05-25
**Cross-References:** `ai-collaboration-mindset.md`, `development-workflow.md`, `cost-optimization-strategy.md`

---

## Purpose

This guide is for vibe coders with zero or near-zero coding experience. You do not read or write code — you describe what you want in plain language, and AI builds it. This guide teaches you how to be effective without understanding programming.

---

## The Golden Rule for Beginners

**You are the brain. The AI is your hands.** You decide WHAT to build. The AI figures out HOW to build it. Your job is to be specific about what you want and to verify that the AI delivered it correctly.

---

## Simplified Vibe Coder Loop (5 Phases, Not 10)

The full development workflow has 10 phases. As a beginner who doesn't code, use this simplified version:

```
DESCRIBE  →  GENERATE  →  RUN & VERIFY  →  COMMIT  →  ITERATE
    ↑                                                         ↓
    └─────────────────────────────────────────────────────────┘
```

### Phase 1: DESCRIBE (Write Clear Intent)
- Describe what you want the feature to do, in plain language
- Describe who will use it
- Describe what success looks like: "The app should show a login form, and after entering email/password, redirect to a dashboard page"
- Include constraints: "Use MUI 7+ components, RTL Arabic support, the same colors as the rest of the app"

### Phase 2: GENERATE (Let AI Build)
- Point the AI at 1-2 existing files as examples of the style to follow
- Let the AI generate all the code
- Do NOT ask to see the code — you can't read it. Ask for a summary of changes instead

### Phase 3: RUN & VERIFY (Visual Check)
- Run the app: `npm run dev`
- Open the browser and navigate to the new feature
- Take screenshots of: the happy path (everything works), the error state (what happens when things go wrong), the empty state (what happens with no data)
- Compare screenshots against what you described in Phase 1
- If something looks wrong, describe the difference to the AI in plain language

### Phase 4: COMMIT (Save Your Progress)
- If the feature works correctly, commit it to Git immediately
- Use a descriptive message: "feat: add login page with email/password"
- Commit after every working increment — commits are your undo button

### Phase 5: ITERATE (Refine and Continue)
- Start the loop again for the next feature or refinement
- Each iteration should be small — one feature at a time

---

## How to Verify Without Reading Code

Since you cannot read code, use these visual verification techniques:

| Method | How |
|---|---|
| **Manual Testing** | Run the app, click through the feature, try edge cases |
| **Screenshots** | Take before/after screenshots to compare |
| **Behavior Description** | Tell the AI: "I clicked X and expected Y, but Z happened instead" |
| **Mobile/Desktop Check** | Open the app on different screen sizes |
| **RTL Check** | Switch to Arabic mode and verify layout flips correctly |
| **Network Tab** | Ask the AI: "Are there any errors in the browser console?" |

---

## Safety Nets for Beginners

### ALWAYS Do This:
1. **Commit before every AI change** — if the AI breaks things, you can undo in one click
2. **Test the happy path manually** — at minimum, verify the main feature works by using it
3. **Run the app after every change** — never let the AI make 5 changes without testing
4. **Keep one feature per branch** — isolation means you can abandon a branch without affecting working code

### NEVER Do This:
- Let AI delete a working feature to "improve" it without a commit first
- Accept "it compiled, so it works" as proof of correctness
- Skip running the app because "the AI said it's done"
- Let the AI make changes to more than 5 files in a single operation

---

## Red Flags — Stop and Ask for Help

If any of these happen, STOP and re-assess:

| Red Flag | What It Means |
|---|---|
| AI says "this is correct" or "looks good" without running tests | AI is guessing. Demand verification. |
| AI generates TODO, FIXME, or HACK comments in code | Feature is incomplete. AI should state gaps openly, not hide them. |
| App crashes on startup after a change | The change is broken. Revert to last commit immediately. |
| AI makes changes to files you didn't ask about | Scope creep. Tell AI to revert and only change what was requested. |
| AI suggests adding paid services or new subscriptions | Challenge the suggestion. Default to free alternatives. |
| AI fails twice on the same problem | AI must search the web/docs before a 3rd attempt. |

---

## Token Budget for Beginners

Beginners should default to compact guideline extracts to minimize AI token costs:

| Task | Guideline Loading |
|---|---|
| Quick fix or small feature | MASTER_INDEX.md + compact primary file only |
| Complex feature | Full primary + compact secondary |
| Architecture review | Full guidelines as needed |
| **Default mode** | Compact extracts always. Only load full guidelines when stuck. |

---

## Cost Awareness from Day One

- Default to free-tier everything: Vercel hosting, Supabase database, Cloudflare CDN
- Let the AI use cheaper models for routine tasks (boilerplate, styling, simple pages)
- Reserve expensive AI models for architecture decisions and security reviews
- Track your monthly AI spend — set a cap and review it monthly
- Every paid service must earn its place: "Why can't we do this with the free tier?"

---

## The Most Important Advice

**Ship something small that works, then improve it.** The #1 beginner mistake is trying to build everything at once. Build one feature end-to-end, verify it works, commit it. Then move to the next feature. A half-working app with 10 features is worthless. A fully working app with 1 feature is progress.

---

## Key Takeaways

1. You don't need to know how to code. You need to know how to describe what you want.
2. Simplified loop: DESCRIBE → GENERATE → RUN & VERIFY → COMMIT → ITERATE.
3. Visual verification is your superpower — screenshots, browser testing, behavioral descriptions.
4. Commit before every AI change. Commits are your undo button.
5. One working feature > ten broken features. Build vertically, not horizontally.
6. Default to free-tier everything. Upgrade only when measurably needed.
7. If the AI fails twice, it must search the web before trying again.

---

## Cross-References

- **Depends on:** `ai-collaboration-mindset.md` — core principles of AI collaboration
- **Applied by:** `development-workflow.md` — the full 10-phase loop (simplified here for beginners)
- **Extended by:** `cost-optimization-strategy.md` — detailed cost guidance
- **Extended by:** `rtl-tech-stack.md` — RTL Arabic support guidance
