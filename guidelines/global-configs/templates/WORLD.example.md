# WORLD.md — Product Intent Guardrail (Example)

**Purpose:** This is a completed example of WORLD.md for a fictional SaaS task-management system. Use this as a reference when filling in your own WORLD.starter.md.

**Source:** `global-configs/templates/WORLD.example.md`
**Last Updated:** 2026-10-26

---

## Speed Mode

- **mode:** `vibe` — `vibe | standard | guarded` per `_guidelines/01-workflow-methodology/speed-tiered-workflow.md`
- **Set:** 2026-05-26 — bootstrapped on the fast track; the pilot release that followed did not change this line, because the mode is a loop-speed setting, not a lifecycle stage. Revisit at every milestone.
- **Escalation:** a release/milestone exit runs the full chain on a **release override** the gate reads (`GS_RELEASE_GATE=1` or the gitignored `.release-override`), and records its **release class** — `pilot` (live testing, demo, beta) or `production` (final launch) — in the release tag or commit message; this file changes only when the steady state changes. Record the reason in the commit message — no separate transition log.

---

## What This Project Is

TaskFlow is a bilingual (English/Arabic) web application for small and medium teams to manage projects, tasks, and deadlines. The system supports Kanban boards, Gantt timelines, role-based access (admin, manager, contributor, viewer), and real-time notifications. It replaces scattered email threads and spreadsheets with a centralized, structured workflow.

The primary value proposition is giving teams visibility into who is doing what, when it is due, and what is blocked — in both English and Arabic — without requiring technical expertise to set up.

---

## Core Domains (What We Build)

- **Project & Workspace Management** — Create workspaces, invite members, set roles and permissions
- **Task & Board Management** — Kanban boards, task assignments, due dates, priorities, labels
- **Timeline & Scheduling** — Gantt-style views, calendar integration, milestone tracking
- **Notifications & Activity Feed** — In-app notifications, mention system, email digests
- **Reporting** — Burndown charts, workload distribution, overdue task summaries
- **User Management** — Role-based access control, profile settings, workspace switching

---

## What This Project Is NOT (Guardrails)

### NOT: A General-Purpose Chat or Communication Platform
- No real-time chat rooms, direct messaging, or video calls
- No file sharing outside of task attachments
- Notifications are task-centric, not social

### NOT: An Accounting or Invoicing System
- No billing, invoicing, expense tracking, or payment processing
- No integration with accounting software
- User roles are workspace roles, not financial roles

### NOT: A Mobile-Native Application
- This is a responsive web application only
- No React Native, no mobile app store distribution
- Mobile-responsive layouts are required, but no native app features

### NOT: A Public Marketplace
- No public-facing project listings, no freelancer marketplace
- No client portal or external guest access without explicit invitation

---

## Explicitly Out-of-Scope Features

| Feature | Reason for Rejection | Date Decided |
|----------|----------------------|--------------|
| Real-time collaborative editing | High complexity, low ROI for this user segment | 2026-01 |
| AI-generated task descriptions | Outside core value proposition; adds cost and complexity | 2026-02 |
| Custom domain / white-label | Not requested by target users; adds infrastructure burden | 2026-01 |
| Student/EDU pricing tier | B2B focus; EDU contracts require separate sales cycle | 2026-03 |
| Internationalization beyond EN/AR | Only English and Arabic are required by current market | 2026-01 |

---

## Target Users

| Role | Description | Primary Needs |
|------|-------------|---------------|
| Workspace Admin | Creates workspace, manages billing and members | Invite users, set roles, configure workspace settings |
| Project Manager | Oversees multiple projects and deadlines | Create projects, assign tasks, monitor timelines, run reports |
| Team Contributor | Executes assigned tasks and updates status | View assigned tasks, update progress, add comments, attach files |
| Viewer | Stakeholder who needs visibility without editing rights | View boards and timelines, export reports, receive updates |

---

## Non-Functional Priorities (Ranked)

1. **Data Integrity** — No task or project data loss under any circumstances. Every change is tracked.
2. **Accessibility** — WCAG 2.1 AA compliance for both RTL (Arabic) and LTR (English)
3. **Performance** — Sub-2.5s LCP, sub-200KB initial bundle, API p95 < 500ms
4. **Security** — Role-based access control, parameterized queries, no hardcoded secrets
5. **Bilingual UX** — Every page must work correctly in both English and Arabic, no exceptions

---

## Scale Expectations

| Metric | Current | 12-Month Projection | 24-Month Projection |
|--------|---------|---------------------|--------------------|
| Active users | 200 | 1,000 | 5,000 |
| Workspaces | 50 | 250 | 1,200 |
| Tasks | 10,000 | 50,000 | 250,000 |
| Requests/day | 5,000 | 25,000 | 125,000 |

---

## Technology Constraints (Non-Negotiable)

- Frontend: React 19+ with TypeScript, MUI 7+, Vite
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Hosting: Vercel (free tier initially)
- Database: Supabase PostgreSQL — no MongoDB, no Firestore
- Must support both RTL (Arabic) and LTR (English) on every page
- Must deploy on Vercel free tier until usage exceeds free limits

---

## Maintenance

- **When:** Update WORLD.md when product scope changes, new out-of-scope decisions are made, or scale expectations change.
- **Who:** The product owner / lead developer, or an AI agent acting on their instruction.
- **Review:** Quarterly alongside guideline review.
- **How AI uses this:** Before suggesting any feature, AI checks WORLD.md for guardrail violations. Features that cross NOT boundaries are rejected automatically.

---

**Cross-References:**
- Product intent guardrail specification: `01-workflow-methodology/planning-and-scoping.md`
- Governance framework: `08-governance/ai-governance-framework.md`
- Starter template: `global-configs/templates/WORLD.starter.md`
- Bidirectional design principles: `02-engineering-practices/bidirectional-design-principles.md`
- UX design principles: `02-engineering-practices/ux-design-principles.md`
