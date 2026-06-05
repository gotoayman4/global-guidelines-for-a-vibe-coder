# Planning and Scoping — Building the Right Thing

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,100 tokens)
**Last Updated:** 2026-05-26
**Cross-References:** `development-workflow.md`, `ai-collaboration-mindset.md`

---

## Purpose

Define the methodology for planning features and scoping work before AI generates any code. The single most expensive mistake in vibe coding is building the wrong thing very quickly. Good planning prevents this.

---

## The Planning Hierarchy

Planning operates at five levels of abstraction. Start at the top and descend only as needed.

| Level | Artifact | Time Horizon | Review Cadence |
|---|---|---|---|
| **Vertical Slice** | Identify the thinnest complete end-to-end feature | Minutes | Per iteration |
| **Vision** | WORLD.md / Product Intent File | Lifetime of project | Quarterly |
| **Roadmap** | Feature list with priorities | 1-3 months | Monthly |
| **Feature Plan** | Implementation plan for one feature | Days to 1 week | Per feature |
| **Task Plan** | Single iteration scope | 15-60 minutes | Per iteration |

---

## Level 0: The Vertical Slice — Smallest Working Feature

Before any other planning, identify the thinnest possible vertical slice — one feature that works end-to-end through all layers (UI → API → Database). This becomes the first iteration. Every plan must answer: "What is the smallest complete feature I can implement and verify right now?"

**Anti-pattern:** Planning all models, then all services, then all UI pages. This horizontal approach guarantees nothing works until the final integration step. Always plan and build vertically.

---

## Level 1: Vision — The WORLD.md

Every project needs a single file that defines what the project exists to do and — critically — what it must NOT become. Without this, AI agents fill gaps with generic defaults from training data.

**WORLD.md template:**
```markdown
# [Project Name] — Product Intent

## Sovereign Purpose
What this project exists to do and who it serves.

## Style / Vibe
Minimal, fast, private, text-first, etc.

## Boundaries (Out of Scope)
- No real-time chat in v1
- No analytics dashboard
- No social features
- [Explicitly list what you're NOT building]

## Core Data Model
[Key entities and relationships]

## Technology Stack
[Exact versions, no ranges]
```

**Rule:** Reference WORLD.md in every major prompt. When using multiple AI agents or tools, include WORLD.md context in every session. The file prevents scope creep when agents suggest "nice-to-have" features while working autonomously.

---

## Level 2: Roadmap — Prioritized Feature List

Maintain a prioritized list of features. This prevents the most common planning failure: building features in random order based on what seems interesting.

**Roadmap format:**
```
P0 (Must have for MVP):
- [ ] User registration and login
- [ ] Core CRUD for [primary entity]
- [ ] [Critical workflow]

P1 (Should have for launch):
- [ ] Password reset
- [ ] Email notifications
- [ ] Basic admin panel

P2 (Nice to have):
- [ ] Dark mode
- [ ] Export to CSV
- [ ] Advanced search

WON'T DO (Explicitly rejected):
- [ ] Real-time chat
- [ ] Mobile app
```

**Rule:** Never start a P1 feature while P0 features are incomplete. AI generates code fast enough that building in priority order costs nothing and prevents the "80% of features 20% done" trap.

---

## Level 3: Feature Plan — Architecture Before Code

Before writing code for any non-trivial feature, produce an architecture plan. This is the highest-leverage 15 minutes in the development cycle.

**Feature plan template:**
```markdown
# Feature: [Name]

## User Story
As a [user type], I want to [action] so that [outcome].

## Acceptance Criteria
- [ ] [Verifiable condition 1]
- [ ] [Verifiable condition 2]
- [ ] [Verifiable condition 3]

## Architecture Approach
[Chosen approach with rationale]

## Affected Files
- Create: [file paths]
- Modify: [file paths]
- Delete: [file paths]

## Data Model Changes
[Schema additions/modifications]

## API Changes
[New endpoints, modified endpoints]

## UI Changes
[New components, modified components]

## Testing Strategy
- Unit: [what to unit test]
- Integration: [what to integration test]
- E2E: [what user flows to test]

## Risks
- [Risk 1] → Mitigation: [how to handle]
- [Risk 2] → Mitigation: [how to handle]

## Rollback Plan
[How to undo this feature if it goes wrong]
```

**Plan review:**
1. AI proposes the plan (or multiple approaches)
2. Human reviews for: simplicity, convention compliance, hidden complexity
3. Human approves or requests changes
4. Only then does AI write code

**Anti-pattern:** "Just build it and we'll figure out the architecture later." This produces an unmaintainable codebase within 3-4 features.

---

## Level 4: Task Plan — One Iteration Scope

Each iteration in the development loop targets exactly one small, well-defined task. This is the unit of work in vibe coding.

**Task plan checklist:**
- [ ] Single, clearly defined objective (one sentence)
- [ ] Files that will be created or modified (explicit list)
- [ ] Files that must be read first for context
- [ ] Constraints and forbidden approaches
- [ ] Acceptance criteria (verifiable conditions)
- [ ] Estimated time: 15-60 minutes

---

## The Vertical Slice Principle

Always plan and build in complete vertical slices, not horizontal layers.

**Wrong (horizontal layering):**
1. Plan all models → Build all models
2. Plan all services → Build all services
3. Plan all UI → Build all UI
4. Integrate everything → Discover nothing works

**Right (vertical slicing):**
1. Plan login feature → Build login (UI → service → model → DB) → Verify login works
2. Plan dashboard feature → Build dashboard → Verify dashboard works
3. Plan settings feature → Build settings → Verify settings works

**Why vertical slices win:**
- Integration problems surface immediately, not after weeks of building
- You have working software at every step
- Each slice validates architectural assumptions before the next one locks them in
- AI agents work better on bounded, complete features than broad, incomplete layers

---

## Prefer Boring Technology

When planning the technology stack, default to mainstream, heavily documented stacks. AI performs dramatically better on technologies it has seen millions of times in training data.

**Recommended defaults:**
- Frontend: React + Vite or Next.js
- Backend: Express (Node) or FastAPI (Python)
- Database: PostgreSQL
- ORM: Prisma or TypeORM
- Styling: Tailwind or MUI
- Testing: Playwright (E2E) + Vitest (unit)

**Avoid:**
- Frameworks released in the last 3 months (AI doesn't know them yet)
- Niche languages with small training corpuses
- Bleeding-edge everything (you'll debug AI hallucinations instead of your code)
- Mixing 4+ UI frameworks in one project (agents get confused)

---

## Prefer Latest Stable — Verify Versions, Don't Guess

AI training data is frozen at the model's training cutoff date. Any version number an AI suggests is inherently stale — sometimes by months, sometimes by years. Accepting AI-suggested versions without verification installs outdated code that may contain known vulnerabilities, miss critical bug fixes, or use deprecated APIs that the latest stable has already replaced.

**Rule: Before installing or pinning any package, the AI MUST search the web or package registry for the current latest stable version.**

Exceptions to latest stable — pin to an older version only when:
- **Compatibility constraint:** A peer dependency or framework requires a specific major version range
- **Arabic RTL regression:** The latest has documented RTL/BiDi bugs or breaks logical property/CSS support
- **Unadopted major release:** A new major version has no migration guide, changelog, or community adoption yet — AI training data is zero, making safe generation impossible
- **Platform lock-in:** Electron or a native module requires a specific Chromium/Node.js version
- **Ecosystem lag:** Critical plugins, extensions, or integrations have not been updated for the latest major

If an older version is pinned, the reason MUST be documented in the project's Architecture Decision Records (ADRs). This prevents future AI sessions from "upgrading" to a broken version.

---

## Delay Complexity

Do not introduce architectural complexity until it's proven necessary. AI tends to over-engineer because enterprise patterns dominate training data.

**Delay until proven necessary:**
- Microservices (start monolithic)
- Advanced caching layers (start simple)
- CQRS / Event Sourcing
- Plugin systems
- Elaborate abstraction layers

**Principle:** Simple systems are easier for AI to reason about, modify safely, and debug. Add complexity only when the simple approach demonstrably fails.

---

## Anti-Patterns in Planning

| Anti-Pattern | Why It Fails | Fix |
|---|---|---|
| **No WORLD.md** | AI fills gaps with generic defaults; scope creeps uncontrollably | Create WORLD.md before writing any code |
| **Building P1 before P0** | Core functionality incomplete; can't ship | Strict priority ordering; never skip P0 |
| **Skipping the plan phase** | Architecture mistakes discovered after code is written | Plan → Review → Approve → THEN implement |
| **Horizontal layering** | Nothing integrates; "90% done" for weeks | Vertical slices: one complete feature at a time |
| **Exotic technology choices** | AI hallucinates APIs; can't debug | Boring, popular stacks only |
| **Over-engineering from day one** | Microservices for a todo app | Start simple; add complexity only when needed |

---

## Key Takeaways

1. WORLD.md is the project constitution. Create it before anything else.
2. Four planning levels: Vision → Roadmap → Feature Plan → Task Plan.
3. Architecture plans are cheap; rewrites are expensive. Plan before code.
4. Vertical slices beat horizontal layers every time.
5. Boring technology produces better AI output.
6. Delay complexity. Simple systems are AI-friendly systems.

---

## Cross-References

- **Depends on:** `development-workflow.md` — the Plan phase in the standard loop
- **Applied by:** `ai-collaboration-mindset.md` — "Own the Specification" and "Build in Vertical Slices" principles
- **Extended by:** `frontend-architecture.md`, `backend-architecture.md` — technology-specific planning considerations
