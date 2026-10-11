---
status: "Normative"
scope: "Global"
tags: [prompts, templates, beginner]
---

# Plain-Language Prompts — Prompt Templates for Vibe Coders

---

## Purpose

Prompt engineering patterns (see `prompt-engineering-patterns.md`) use developer terminology that assumes coding knowledge. This document provides the same patterns in plain language that a vibe coder with zero programming experience can use immediately.

Each template has two forms:
- **Plain Language:** Write this to your AI tool
- **Technical Translation:** What a developer would call it (for reference only)

---

## Pattern 1: Constraint-First (Plain Language)

**When to use:** Every time you ask AI to build something. Always state what you DON'T want before what you DO want.

### Template

```
I need [feature description].

DO NOT:
- [constraint 1]
- [constraint 2]
- [constraint 3]

INSTEAD, IT SHOULD:
- [behavior 1]
- [behavior 2]
- [behavior 3]

SUCCESS MEANS:
- [specific verifiable condition 1]
- [specific verifiable condition 2]

FAILURE WOULD MEAN:
- [specific failure condition 1]
- [specific failure condition 2]
```

### Example

```
I need a login page for my app.

DO NOT:
- Use any animations or transitions
- Create a separate "forgot password" page
- Use placeholder text — all text must be in both English and Arabic

INSTEAD, IT SHOULD:
- Show a form with email and password fields
- Show a "Login" button
- Switch between English and Arabic layout for RTL

SUCCESS MEANS:
- Entering valid credentials takes the user to the dashboard
- Entering invalid credentials shows a clear error message
- The page looks correct in both LTR and RTL modes

FAILURE WOULD MEAN:
- The page shows a blank screen after loading
- Error messages appear only in English
- The form submits even when fields are empty
```

**Technical Translation:** Constraint-First Prompting with Acceptance Criteria

---

## Pattern 2: Reference Existing (Plain Language)

**When to use:** Always. Point AI at existing files so it matches your project's style.

### Template

```
Look at how [existing thing] is built in [file/path].

Build [new thing] using the same approach:
- Same visual style as [existing component]
- Same data pattern as [existing feature]
- Same naming as [existing patterns]

The new [thing] should fit naturally next to [existing thing].
```

### Example

```
Look at how the StudentsList.jsx component works.

Build a CoursesList component using the same approach:
- Same table layout as StudentsList
- Same pagination (20 items per page)
- Same search bar style
- Same Arabic/English toggle

The new CoursesList should look like it belongs next to StudentsList.
```

**Technical Translation:** Reference Existing Conventions Pattern

---

## Pattern 3: One Feature at a Time (Plain Language)

**When to use:** Always. Never ask for multiple features in one prompt.

### Template

```
This is feature [N] only. Do not build anything else.

RIGHT NOW, build only:
[exact description of one feature]

I will ask for the next feature after this one works and is committed.
```

### Example

```
This is feature 1 only. Do not build anything else.

RIGHT NOW, build only:
A page that shows a list of departments with their names and code numbers.
Each department row should have an "Edit" button that opens a simple edit form.

I will ask for the next feature after this one works and is committed.
```

**Technical Translation:** Incremental Scope / 1-Feature Rule

---

## Pattern 4: Describe the Problem, Not the Solution (Plain Language)

**When to use:** When you don't know the technical approach. Describe what you see and what you want.

### Template

```
PROBLEM:
[Describe what's happening now in plain language]

WHAT I WANT:
[Describe the desired outcome in plain language]

WHAT I'VE TRIED:
[Describe what you already attempted]

CONSTRAINTS:
[Things that must not change or must be included]
```

### Example

```
PROBLEM:
When I click the "Save" button, nothing happens. The form stays on the screen
with the same data and I don't see any success message.

WHAT I WANT:
After clicking "Save", I should see a green success message saying
"Department saved successfully" and the form should close and go back
to the departments list.

WHAT I'VE TRIED:
I clicked the button 3 times. Each time nothing happens.

CONSTRAINTS:
The save action must work in both English and Arabic modes.
```

**Technical Translation:** Problem-Solution Prompting with Constraints

---

## Pattern 5: Verification Prompt (Plain Language)

**When to use:** After AI makes changes. Always verify visually.

### Template

```
I just saw these changes in the browser:
[Describe what you see — what looks right, what looks wrong]

Questions:
1. Did you change any files I didn't ask about? List all modified files.
2. What should I test in the browser to make sure this works?
3. What could go wrong that I should try?
4. Did you add any TODO or placeholder code?
```

### Example

```
I just saw these changes in the browser:
The login form appears correctly in English. In Arabic mode, the "Email"
label is still in English (not translated), and the password field icon
overlaps with the Arabic text.

Questions:
1. Did you change any files I didn't ask about? List all modified files.
2. What should I test to make sure the login works?
3. What could go wrong that I should try?
4. Did you add any TODO or placeholder code?
```

**Technical Translation:** Verification / Diff-Review Prompting

---

## Pattern 6: Debugging Prompt (Plain Language)

**When to use:** When something is broken and you need AI to fix it.

### Template

```
SOMETHING IS BROKEN:

What I did: [exact steps, e.g., "I clicked the Save button"]
What I expected: [e.g., "The item should appear in the list"]
What actually happened: [e.g., "The page showed an error in red text"]

EXACT ERROR MESSAGE (copied from browser console):
[paste the exact error text here — do not paraphrase]

SCREENSHOT DESCRIPTION:
[describe what the screen looks like]

Please fix this. Do NOT rewrite the entire file — only change what's needed.
```

### Example

```
SOMETHING IS BROKEN:

What I did: I clicked the "Delete" button on a student record
What I expected: The student should disappear from the list and a success
message should appear
What actually happened: The student is still in the list, and a red error
appeared at the top of the page

EXACT ERROR MESSAGE (copied from browser console):
"TypeError: Cannot read properties of undefined (reading 'id')"

SCREENSHOT DESCRIPTION:
The list still shows the student. At the top there's a red banner that says
"Something went wrong".

Please fix this. Do NOT rewrite the entire file — only change what's needed.
```

**Technical Translation:** Rubber Duck Debugging with Exact Error Reproduction

---

## Pattern 7: Refactoring Prompt (Plain Language)

**When to use:** When a feature works but the code needs cleanup (AI suggested this, or the file is too long).

### Template

```
The [feature name] works correctly, but:

[Structured problem description]:
- File X has grown to [N] lines and is hard for you to manage
- [Specific issue, e.g., "the same code appears in 3 places"]

Please reorganize without changing any behavior:
- What the feature does now must be exactly the same after reorganization
- I will test visually after reorganization — if anything looks different,
  that's a bug
- Commit before reorganizing so I can undo if something breaks
```

**Technical Translation:** Behavioral Refactoring with Rollback Point

---

## Pattern 8: Security Check Prompt (Plain Language)

**When to use:** After building any feature that handles user input, authentication, or data.

### Template

```
SECURITY CHECK for [feature name]:

Please verify:
1. No one can access this feature without logging in
2. No one can see or edit other people's data
3. All user input is checked before being used (no special characters can
   break the app)
4. No passwords, keys, or secret tokens are visible in the code
5. The feature works correctly in both English and Arabic

If any of these fail, fix them before I test.
```

---

## Anti-Patterns (What NOT to Write)

| Don't Write This | Why | Write This Instead |
|---|---|---|
| "Build the whole app" | Too much at once — guaranteed to break | "Build feature 1: the login page. Only this feature." |
| "Make it look nice" | Undefined — AI will invent | "Make it look like the StudentsList page with the same colors and spacing" |
| "Fix it" | No description of the problem | Exact error message + what you did + what you expected + what happened |
| "Add security" | Too vague | "Check that no one can access this without logging in, and all input is validated" |
| "Do whatever you think is best" | AI has no judgment about YOUR business | Specific requirements with acceptance criteria |
| Technical jargon you don't understand | You can't verify it | Plain language description of behavior you can see |

---

## Key Takeaways

1. Always start with constraints (what NOT to do) before describing what you want.
2. Point AI at existing files as style references — "make it look like X."
3. One feature per prompt. Never ask for multiple features at once.
4. Describe problems, not solutions — let AI figure out the how.
5. Always include verification questions after changes.
6. Copy exact error messages — never paraphrase them.
7. Use the security check prompt for any feature that handles data or auth.

---

## Cross-References

- **Technical version:** `prompt-engineering-patterns.md` — the same patterns in developer terminology
- **Companion to:** `beginner-vibe-coder-guide.md` — the simplified development loop
- **Companion to:** `verification-for-non-coders.md` — how to verify without reading code