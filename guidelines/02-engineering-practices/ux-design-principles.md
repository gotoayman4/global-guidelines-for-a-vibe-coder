# UX Design Principles — Heuristics for Interaction Design

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~2,800 tokens)
**Last Updated:** 2026-05-26
**Cross-References:** `accessibility-standards.md`, `error-handling-philosophy.md`, `frontend-architecture.md`, `bidirectional-design-principles.md`

---

## Purpose

Define the universal interaction design heuristics that guide every UI decision. These principles apply regardless of framework, language direction, or product domain. Based on Nielsen's 10 Usability Heuristics (1994, updated 2024) — the most validated and enduring framework in UX. Every principle includes an adoption path for both **new projects** (full compliance from day one) and **existing projects** (incremental adoption without destabilizing the current codebase).

---

## Principle 1: Visibility of System Status

The design MUST always keep users informed about what is happening through appropriate feedback within a reasonable amount of time.

When users know the current system status, they learn the outcome of prior interactions and determine next steps. Predictable interactions create trust.

**Implementation:**
- Show loading indicators for any operation exceeding 400ms (Doherty Threshold)
- Display confirmation for destructive actions (delete, publish, submit)
- Show progress indicators for multi-step processes (upload, export, import)
- Provide breadcrumbs or step indicators in wizards and multi-page flows
- Use skeleton screens for content that is loading, not blank screens
- Reflect connectivity status for real-time or collaborative features

**Existing projects:** Audit highest-traffic flows first. Add loading/feedback states to any operation where users currently see no response after clicking. This is the lowest-regression, highest-impact starting point.

---

## Principle 2: Match Between System and Real World

The design SHOULD speak the users' language. Use words, phrases, and concepts familiar to the user, rather than internal jargon. Follow real-world conventions, making information appear in a natural and logical order.

**Implementation:**
- Use domain-appropriate terminology (e.g., "Student" not "UserEntity" in an academic app)
- Follow real-world conventions: calendar pickers look like calendars, file trees look like folders
- Natural mapping: controls should correspond spatially to what they affect
- In bilingual apps: Arabic and English UIs MUST each use culturally appropriate conventions, not word-for-word translations

**Existing projects:** Review all user-facing labels. Replace any database column names, API field names, or internal jargon that leaked into the UI. This is a content-only change with zero functional risk.

---

## Principle 3: User Control and Freedom

Users MUST always have a clearly marked way to exit unwanted states or undo accidental actions. Users often perform actions by mistake and need an "emergency exit."

**Implementation:**
- Support Undo/Redo for editorial and data-entry operations
- Every dialog, wizard, and full-screen modal MUST have a visible Cancel or Close action
- Destructive actions MUST present a confirmation step with clear consequences
- Back-button behavior MUST match user expectation (restore previous state, not navigate away)
- Allow users to dismiss non-critical notifications

**Existing projects:** Start with destructive actions — ensure every delete/remove/publish flow has a confirmation step. Add Cancel buttons to any modal or wizard that currently traps users.

---

## Principle 4: Consistency and Standards

Users MUST NOT have to wonder whether different words, situations, or actions mean the same thing. Follow platform and industry conventions. Maintain both internal consistency (within your product) and external consistency (with platform standards).

**Implementation:**
- Identical actions MUST use identical labels everywhere (never "Save" on one page and "Submit" on another for the same action)
- Shared components (StandardTable, PageHeader, etc.) enforce visual and behavioral consistency automatically
- Follow platform conventions: Ctrl+S saves, Esc closes dialogs, Tab navigates between fields
- In bilingual apps: consistency applies across both languages — the same action in Arabic and English must behave identically
- Refer to `design-system-governance.md` for managing consistency at scale

**Existing projects:** Identify the top 5 most-used components in your app. Standardize them first. Run an audit: search for inconsistent button labels, confirmation patterns, or navigation behavior.

---

## Principle 5: Error Prevention

The best designs prevent problems from occurring in the first place. Either eliminate error-prone conditions, or check for them and present users with a confirmation option before they commit to the action.

Error prevention is superior to error handling. An error prevented costs zero user trust. An error recovered costs some. An error unhandled costs the user entirely.

**Implementation:**
- Disable submit buttons until required fields are valid (prevent submission errors)
- Use input masks and constrained inputs (date pickers over free-text date fields, dropdowns over free-text for enumerated values)
- Provide smart defaults based on context (pre-fill known data, default to most common option)
- Warn before leaving a form with unsaved changes (see `form-patterns.md`)
- Validate at blur time, not just on submit — catch errors early
- In Arabic forms: Arabic-Indic vs. Western numeral input MUST be unambiguous; auto-detect or constrain

**Existing projects:** Audit your highest-error-rate forms (support tickets, bug reports, user complaints). Add input constraints and smart defaults to those forms first. These changes are additive and rarely cause regressions.

---

## Principle 6: Recognition Rather Than Recall

Minimize the user's memory load by making elements, actions, and options visible. The user SHOULD NOT have to remember information from one part of the interface to another. Information required to use the design MUST be visible or easily retrievable when needed.

**Implementation:**
- Show field labels persistently (never rely on placeholder text alone)
- Display selected filters and search terms after results load
- Offer autocomplete for fields with known values (user names, categories, tags)
- Show contextual help inline (tooltips, helper text) rather than in a separate manual
- In multi-step flows: show a summary of previous steps, not just the current step
- For tables: column headers remain visible during scroll; row actions are visible without hover
- Use `bdi` elements for user-generated mixed-direction content to prevent bidi confusion

**Existing projects:** Start with the most memory-intensive workflow (typically multi-step forms or complex search filters). Add inline help, persistent labels, and step summaries. Incremental; low regression risk.

---

## Principle 7: Flexibility and Efficiency of Use

The design MUST cater to both inexperienced and experienced users. Provide accelerators — hidden from novice users — that speed up interaction for expert users. Allow users to tailor frequent actions.

**Implementation:**
- Keyboard shortcuts for common actions (Ctrl+S, Ctrl+Z, Ctrl+F, Esc for dismiss)
- Power-user accelerators: batch operations, bulk select, quick-search (Cmd+K pattern)
- Customizable: allow users to pin/bookmark frequent destinations
- Remember user preferences (column visibility in tables, last-used filters, sort order)
- For academic/research UIs: keyboard-first navigation for writing workflows
- RTL-specific: keyboard navigation MUST flow logically in RTL (Tab goes start-to-end, arrows follow visual direction)

**Existing projects:** Add keyboard shortcuts for the top 5 most frequent actions. This is purely additive — existing mouse/touch workflows continue to work unchanged.

---

## Principle 8: Aesthetic and Minimalist Design

Interfaces MUST NOT contain information that is irrelevant or rarely needed. Every extra unit of information competes with the relevant units and diminishes their relative visibility.

This does not mean flat or boring design. It means every element serves a purpose. Visual design MUST support the user's primary goals, not distract from them.

**Implementation:**
- Prioritize content: what does the user need to see right now? Show that. Defer the rest.
- Use progressive disclosure to reveal complexity on demand (accordions, expandable sections, tooltips)
- Remove redundant links, repetitive labels, and decorative elements that don't aid comprehension
- In data-dense interfaces (dashboards, analytics, academic UIs): prefer information density over white space, but organize it with clear visual hierarchy
- See `visual-design-principles.md` for depth, color, and typography rules

**Existing projects:** Audit the busiest page in your app. Remove or collapse any element that fewer than 10% of users interact with. Run a clutter audit: can you remove 20% of visible elements without losing functionality?

---

## Principle 9: Help Users Recognize, Diagnose, and Recover from Errors

Error messages MUST be expressed in plain language (no error codes), precisely indicate the problem, and constructively suggest a solution.

**Implementation:**
- Error messages MUST answer: (1) What went wrong, (2) Why it happened, (3) What to do about it
- Use traditional error visuals: red text, warning icon, but never color alone (accessibility)
- Never expose raw stack traces, SQL errors, or HTTP status codes to users
- For network errors: offer Retry with exponential backoff hint
- For validation errors: highlight the specific field(s) with inline messages, not a generic top-of-form banner
- In bilingual apps: error messages MUST be localized, not machine-translated on the fly

**Existing projects:** Audit your error message strings file. Rewrite any message that doesn't tell the user what to do next. This is a content change with zero code risk.

---

## Principle 10: Help and Documentation

The system SHOULD be usable without documentation. However, when documentation is necessary, it MUST be easy to search, focused on the user's task, and list concrete steps.

**Implementation:**
- Provide contextual help: tooltips on complex fields, inline explanations for unfamiliar concepts
- Searchable help/documentation that answers "How do I..." questions
- Onboarding tooltips for first-time users on key features (with a "Don't show again" option)
- Video or animated demonstrations for complex workflows
- In academic/research UIs: provide citation format guides, search syntax help, keyboard shortcut reference

**Existing projects:** Add contextual tooltips to the 3 most-support-ticketed features. Keep existing documentation in place while you add inline help incrementally.

---

## Additional Principle: Tesler's Law (Conservation of Complexity)

Every application has an inherent amount of irreducible complexity. The only question is who handles it: the user or the system.

**The designer's job is to absorb complexity on behalf of the user.** Shift complexity to the system wherever possible: smart defaults, automatic formatting, intelligent search, pre-computed suggestions.

**Implementation:**
- Auto-format phone numbers, dates, currencies — don't require users to type them in a specific format
- Pre-fill forms with known data (logged-in user's name, email, preferences)
- Auto-save drafts — never lose user work due to timeout or accidental navigation
- Handle time zones, currency conversion, and locale formatting automatically
- In bilingual apps: accept both Arabic-Indic and Western numerals at input time, then normalize internally. UI chrome display defaults to Western Arabic numerals per `rtl-tech-stack.md` numeral policy.

**Existing projects:** Identify one workflow where users currently do manual formatting or data transformation that the system could handle. Automate it. Measurable reduction in user effort per session.

---

## Incremental Adoption Strategy

### For New Projects (Greenfield)
Adopt all 10 heuristics + Tesler's Law from day one. Every PR review checks against these principles. Design reviews MUST reference at least one relevant heuristic.

### For Existing Projects (Brownfield)

| Priority | Heuristics to Adopt First | Why |
|---|---|---|
| **Phase 1** (lowest regression risk) | #1 Visibility, #5 Error Prevention, #9 Error Recovery | Add loading states, prevent common errors, fix error messages. Content and additive changes only. |
| **Phase 2** (moderate risk) | #2 Real World Match, #6 Recognition, #8 Minimalist Design | Rename labels, add contextual help, declutter. UI changes with low logic impact. |
| **Phase 3** (higher effort) | #3 User Control, #4 Consistency, #7 Flexibility, #10 Help | Add undo/redo, keyboard shortcuts, standardized component adoption, searchable help. |
| **Ongoing** | Tesler's Law | Continuously shift complexity from users to the system. Never "done." |

Each phase MUST NOT block feature work. Adopt principles incrementally as you touch each area of the codebase. When a component is refactored or a page is redesigned, bring it to full compliance.

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **Silent failures** (no feedback after user action) | Users click repeatedly, duplicate actions, lose trust | Show loading state + success/error feedback for every action |
| **Database jargon in UI** | Users don't understand labels; need training or support | Use domain language; rename before launch |
| **No escape from modals/screens** | Users refresh the page or close the tab out of frustration | Always provide visible Cancel/Close/Back actions |
| **Inconsistent labels** ("Edit" vs "Modify" vs "Change") | Users hesitate, wonder if actions differ, slow down | Standardize terminology in a shared constants file |
| **Error messages that blame users** ("Invalid input. Try again.") | Users feel incompetent; abandon task or contact support | Explain what's wrong and how to fix it in plain language |
| **Relying on users' memory** (hiding labels, steps, options) | Errors, abandoned workflows, increased support tickets | Show necessary information persistently; use recognition, not recall |
| **Treating error handling as error prevention** | Users still encounter the error; trust erodes over time | Prevent the error at the UX level (input constraints, smart defaults). Server-side error handling (try/catch, null checks, auth failures) remains mandatory regardless, per `error-handling-philosophy.md`. |

---

## Key Takeaways

1. Every action MUST produce visible feedback. No silent operations. No mystery states.
2. Prevent errors before handling them. Validate early, constrain inputs, provide smart defaults.
3. Don't make users remember. Show options, labels, and state persistently.
4. Speak the user's language. Never expose internal jargon, error codes, or stack traces in the UI.
5. Always provide an exit. Every dialog, wizard, and destructive action needs a Cancel or Undo path.
6. Optimize for both novice and expert. Keyboard shortcuts, batch actions, and customization live alongside simple defaults.
7. Shift complexity to the system. If the user is doing work the computer could do, the design is incomplete.

---

## Cross-References

- **Depends on:** `accessibility-standards.md` — error states and feedback must be accessible
- **Extended by:** `frontend-architecture.md` — principled component architecture
- **Extended by:** `bidirectional-design-principles.md` — how these heuristics apply in RTL/bilingual contexts
- **Applied by:** `form-patterns.md`, `dialog-patterns.md`, `notification-patterns.md`, `loading-and-empty-states.md`
- **Applied by:** `error-handling-philosophy.md` — how to implement errors that users can recover from
- **Governed by:** `design-system-governance.md` — consistency enforcement through shared components
