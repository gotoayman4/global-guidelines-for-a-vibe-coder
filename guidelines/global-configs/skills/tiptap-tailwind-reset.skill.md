---
name: tiptap-tailwind-reset
description: Activate when user needs to reset or customize TipTap editor styles with Tailwind
---

# Skill: Fix Tiptap v3 + Tailwind CSS v4 Rich Text Formatting

**Status:** Advisory
**Scope:** Global (Task-Type Skill)
**Token Tier:** Compact (~700 tokens)
**Source:** `global-configs/skills/tiptap-tailwind-reset.skill.md`
**Last Updated:** 2026-05-27

---

**Activation announcement:** When this skill activates, output in chat: `Skill: tiptap-tailwind-reset activated -- Source: _skills/tiptap-tailwind-reset.skill.md`

## Trigger

Activate when:
- User says "editor formatting not showing", "block commands invisible", "headings look like plain text", "lists not rendering"
- User says "Tiptap commands don't work", "ProseMirror content has no styles", "bold works but heading/blockquote don't"
- User is setting up Tiptap v3 in a Tailwind CSS v4 project
- User says "rich text editor has no visual formatting", "content CSS missing", "editor looks unstyled"
- User mentions `prose prose-sm max-w-none` in Tiptap editorProps

Do NOT activate when:
- Issue is clearly about Tiptap extensions not loading (check console for missing extension errors)
- Issue is about ProseMirror schema or transform errors
- User is using Tailwind CSS v3 (no CSS reset issue)

---

## Load Guidelines

1. `06-frontend-patterns/visual-design-principles.md` — Typography conventions (compact extract)

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are a rich text editor specialist for Tiptap v3 + ProseMirror + Tailwind CSS v4. You understand that Tailwind CSS v4's `@import "tailwindcss"` includes a full CSS reset (`preflight`) that strips all browser default styles — headings become `font-size: inherit; font-weight: inherit;`, lists lose their markers, links lose color and underline. You know that Tiptap block commands (heading, bulletList, orderedList, blockquote, codeBlock) work correctly at the HTML level but appear invisible without explicit content CSS.

---

## Workflow

1. **Diagnose:** Open DevTools Elements panel and inspect `<h1>`, `<ul>`, `<blockquote>` elements inside `.ProseMirror`. If the HTML tags are correct but computed styles show `font-size: inherit` / `list-style: none` / `color: inherit`, the issue is Tailwind v4 CSS reset stripping defaults.

2. **Add ProseMirror content CSS** in the project's global CSS file (e.g., `globals.css`):
   ```css
   /* ProseMirror editor content styling — Tailwind CSS v4 resets all browser defaults */
   .ProseMirror h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; }
   .ProseMirror h2 { font-size: 1.5em; font-weight: 600; margin: 0.75em 0; }
   .ProseMirror h3 { font-size: 1.17em; font-weight: 600; margin: 0.83em 0; }
   .ProseMirror ul { list-style: disc; padding-inline-start: 1.5em; }
   .ProseMirror ol { list-style: decimal; padding-inline-start: 1.5em; }
   .ProseMirror li { margin: 0.25em 0; }
   .ProseMirror blockquote {
     border-inline-start: 3px solid hsl(var(--muted-foreground));
     padding-inline-start: 1em;
     font-style: italic;
     color: hsl(var(--muted-foreground));
     margin: 1em 0;
   }
   .ProseMirror a {
     color: hsl(var(--primary));
     text-decoration: underline;
     cursor: pointer;
   }
   .ProseMirror pre { ... }
   .ProseMirror code { ... }
   .ProseMirror table { ... }
   .ProseMirror img { ... }
   ```

3. **Remove no-op `prose` classes** from `editorProps.attributes.class` — `prose prose-sm max-w-none` does nothing without `@tailwindcss/typography` plugin installed. If you want the typography plugin, install it separately and test compatibility with ProseMirror.

4. **Memoize `useEditor` options** — Tiptap v3's `useEditor` detects new object references on every render cycle and destroys/recreates the editor (resetting all ProseMirror state). Wrap extensions and editorProps in `useMemo`, wrap onUpdate in `useCallback`:
   ```tsx
   const extensions = useMemo(() => [
     StarterKit.configure({ ... }),
     TextAlign.configure({ ... }),
   ], []);
   const editorProps = useMemo(() => ({ ... }), []);
   const onUpdate = useCallback(({ editor }: { editor: Editor }) => { ... }, [deps]);
   ```

5. **Verify:** Test each block command (Heading 1-3, Bullet List, Ordered List, Blockquote, Code Block) and inline commands (Bold, Italic, Underline, Link). Confirm visible changes in the editor output.

---

## Output Format

```markdown
## Tiptap v3 + Tailwind CSS v4 Formatting Fix — [Project Name]

### Diagnosis
- [ ] Confirmed: HTML tags correct but CSS reset strips defaults
- [ ] Confirmed: Bold/Italic/Underline work (browser default rendering)
- [ ] Confirmed: `prose` classes absent or typography plugin not installed

### Fix Applied
- [ ] ProseMirror content CSS added for: headings, lists, blockquotes, links, tables, code
- [ ] `prose prose-sm max-w-none` removed from editorProps (if present)
- [ ] `useEditor` options memoized with `useMemo`/`useCallback`

### Verification
- [ ] Heading 1-3 visually distinct from paragraph text
- [ ] Bullet list shows disc markers, ordered list shows decimal numbers
- [ ] Blockquote has left border + italic style
- [ ] Links are colored + underlined
- [ ] No editor state reset on re-render
```

---

## Anti-Patterns

- Do NOT install `@tailwindcss/typography` plugin just for editor content — the `prose` classes are designed for static HTML content (blogs, docs) and may conflict with ProseMirror's live editing DOM
- Do NOT add `prose prose-sm max-w-none` to `editorProps.attributes.class` without the typography plugin — these classes are meaningless without it
- Do NOT write editor CSS in Tailwind utility classes via `@apply` in the CSS file — use regular CSS selectors for `.ProseMirror` children
- Do NOT add `all: revert` or `all: initial` on `.ProseMirror` — this breaks ProseMirror's internal layout
- Do NOT skip `useEditor` memoization — Tiptap v3 destroys and recreates the editor instance on every render if options are fresh objects, causing content loss and cursor reset
- Do NOT apply `tracking-*` or `word-break: break-all` on Arabic text inside ProseMirror (disconnects cursive letters)

---

## Key Takeaways

1. Tailwind CSS v4's `@import "tailwindcss"` includes a full CSS reset that strips all browser defaults from ProseMirror content.
2. Tiptap block commands (heading, list, blockquote) work correctly — the HTML changes — but appear invisible without explicit content CSS.
3. Bold/Italic/Underline appear to work because browsers render `<strong>` and `<em>` regardless of resets.
4. Content CSS must use `.ProseMirror` as ancestor selector to scope styles to editor content only.
5. `prose prose-sm max-w-none` classes do nothing without `@tailwindcss/typography` plugin — remove them or install the plugin.
6. `useEditor` options must be memoized (`useMemo`/`useCallback`) — fresh object references cause Tiptap v3 to destroy and recreate the editor on every render.
7. Always use logical CSS properties (`padding-inline-start`, `border-inline-start`) in ProseMirror CSS to support RTL.

---

**Cross-References:**
- Tiptap v3 docs: https://tiptap.dev/docs/editor/guide/configuration
- Tailwind CSS v4 preflight: https://tailwindcss.com/docs/preflight
- Visual design principles: `06-frontend-patterns/visual-design-principles.md`
- Skill design patterns: `08-governance/skill-design-patterns.md`
