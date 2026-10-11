---
status: "Normative"
scope: "Global"
tags: [verification, non-coder, evidence]
---

# Verification for Non-Coders — How to Confirm AI Output Without Reading Code

---

## Purpose

Vibe coders who cannot read code still MUST verify that AI output works correctly. This guide provides concrete verification techniques that rely on visual observation, behavioral testing, and AI-assisted explanation — not code reading.

Every guideline in this repository that says "verify" or "review" is telling you to do it. This document tells you HOW to do it when you can't read the code.

---

## The Verification Mindset

You don't need to read code to catch most problems. You need to:

1. **See** — Does it look right in the browser?
2. **Click** — Does it behave correctly when you interact with it?
3. **Break** — What happens when you do something wrong?
4. **Compare** — Does it match what you described in your prompt?

---

## Visual Verification Checklist

### For Every Feature

| Check | How | What to Look For |
|---|---|---|
| Page loads | Open in browser, navigate to the page | No blank screen, no error messages |
| Text displays correctly | Read all visible text | No placeholder text (lorem ipsum), no typos, no missing translations |
| Images and icons render | Look at the page | No broken image icons, icons display correctly |
| Layout looks correct | Compare to your description | Spacing, alignment, and sizing match what you asked for |
| Colors match design | Compare to reference | No random colors, uses the project's color scheme |
| Buttons and links work | Click each one | Correct navigation, correct actions, no dead buttons |

### For Bilingual (RTL/LTR) Apps

| Check | How | What to Look For |
|---|---|---|
| LTR (English) layout | View in English | Normal left-to-right layout |
| RTL (Arabic) layout | View in Arabic | Everything mirrors correctly, text is right-aligned |
| Number formatting | Check all numbers | Western Arabic numerals (0-9), NOT Hindi numerals |
| Date/currency formatting | Check dates and prices | Correct locale formatting in both languages |
| Bidirectional text | Look at mixed text | No text ordering errors, no garbled display |

### For Forms

| Check | How | What to Look For |
|---|---|---|
| Required field validation | Submit form empty | Error messages appear, form doesn't submit |
| Invalid input validation | Enter wrong data (letters in number fields, bad email) | Clear error messages, form rejects bad input |
| Successful submission | Fill form correctly and submit | Success message, data saved, redirect works |
| Unsaved changes warning | Fill form, try to navigate away | Warning dialog appears before leaving |

### For Lists and Tables

| Check | How | What to Look For |
|---|---|---|
| Pagination | Navigate between pages | Correct items per page, page numbers work |
| Empty state | View with no data | Friendly empty message (not a blank page or error) |
| Loading state | Refresh and watch the load | Skeleton/spinner appears, then data loads |
| Sorting | Click column headers | Data reorders correctly |

---

## Behavioral Verification (Without Seeing Code)

### The "Describe Your Changes" Technique

After the AI makes changes, always ask:

> "Describe what you changed in plain language. Which files did you modify? What should I check in the browser?"

The AI MUST respond with:
- What behavior changed
- Which file(s) were modified
- What to verify in the browser
- What edge cases to test

If the AI can't explain changes in plain language, the changes are too complex. Break them into smaller pieces.

### The "Show Me" Technique

Ask the AI to demonstrate behavior:

> "Show me a screenshot walkthrough of the login flow. What happens when I enter valid credentials? What happens with invalid ones?"

### The "What Could Go Wrong" Technique

After each feature, ask the AI:

> "List 3-5 things that could go wrong with this feature. For each, tell me how to test it."

---

## Browser DevTools for Non-Coders

You don't need to read code in DevTools. Use these tabs:

| Tab | What to Check | Non-Coder Action |
|---|---|---|
| **Console** | Red error messages | If you see red text, copy it and give it to your AI tool |
| **Network** | Failed requests (red rows) | Click red rows — copy the error message to your AI tool |
| **Application > Storage** | Data saved correctly | Check if form submissions saved data you expected |

**How to open DevTools:** Press F12 or right-click → "Inspect"

**Key rule:** If you see red text in the Console tab, something is broken. Copy the exact text and tell your AI.

---

## Forced Error Testing

Don't just test the happy path. Deliberately try to break your app:

| Test | Action | Expected Result |
|---|---|---|
| Empty submit | Submit a form with all fields blank | Error messages, no data saved |
| Wrong data type | Enter text in a number field | Error message or field rejects input |
| Very long input | Paste 10,000 characters into a text field | Field handles it gracefully (truncation or error) |
| Special characters | Enter `<script>alert('test')</script>` in fields | Text is displayed safely, no script execution |
| Navigation away | Fill a form, click browser back button | Warning about unsaved changes |
| Network offline | Turn off internet, try an action | Appropriate error message, no blank spin forever |
| Duplicate action | Click "Submit" button twice quickly | No duplicate records created |

---

## Verification Logging

Keep a simple log of what you tested:

```
Date: 2026-05-25
Feature: Login page
- [x] Page loads correctly
- [x] Valid login redirects to dashboard
- [x] Invalid login shows error message
- [x] Empty submit shows validation errors
- [x] RTL mode displays correctly
- [ ] Network offline handling — NEEDS FIX: shows blank spinner forever
```

This log helps you communicate with AI tools and track what's verified vs. what needs fixing.

---

## Anti-Patterns

| Anti-Pattern | Why It's Dangerous |
|---|---|
| Skipping visual verification | AI-generated code that compiles can still be completely wrong |
| Only testing the happy path | Most bugs hide in error states, empty states, and edge cases |
| Trusting "it works on my machine" | Your machine is one environment. Test in the browser, not just the AI's preview |
| Ignoring the Console tab | Red errors in the Console tab mean something is broken, even if the page looks fine |
| Accepting AI's "I tested it" | AI cannot test its own output in your running application. Only YOU can verify visually |
| Skipping RTL/LTR testing for bilingual apps | RTL layout issues are invisible in LTR mode and vice versa |

---

## Key Takeaways

1. You don't need to read code to verify it. Use your eyes, your clicks, and DevTools Console.
2. Always ask AI to describe changes in plain language — not show code.
3. Test the happy path, error paths, empty states, and RTL/LTR modes for every feature.
4. Red text in the browser Console means something is broken. Copy it to your AI tool.
5. Keep a verification log of what you tested and what still needs fixing.
6. Forced error testing (try to break things) catches bugs the happy path misses.

---

## Cross-References

- **Companion to:** `beginner-vibe-coder-guide.md` — the simplified development loop
- **Extends:** `testing-philosophy.md` — the full testing philosophy (non-coder accessible subset)
- **Alternative to:** `code-review-workflow.md` — code-level review (requires reading code)