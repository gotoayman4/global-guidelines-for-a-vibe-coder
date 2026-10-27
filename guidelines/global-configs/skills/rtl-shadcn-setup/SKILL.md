---
name: rtl-shadcn-setup
description: RTL/Arabic-first project setup with shadcn/ui and Tailwind CSS v4 — DirectionProvider, CSS logical properties, Arabic typography, i18n, and dual-direction testing. Use when starting an Arabic or bilingual application on shadcn/ui.
metadata:
  status: Advisory
  scope: Global (Task-Type Skill)
  tags: skill, rtl, shadcn, tailwind, setup, arabic
  appliesTo: shadcn, tailwind
---

# Skill: RTL App Setup with shadcn/ui + Tailwind

---

**Activation announcement:** When this skill activates, output in chat: `Skill: rtl-shadcn-setup activated -- Source: _skills/rtl-shadcn-setup/SKILL.md`

## Trigger

Activate when:
- User asks to "set up an Arabic app", "create an RTL app", "start a bilingual project"
- User says "use shadcn/ui for RTL", "Tailwind RTL project", "setup Arabic-first UI"
- User asks about "shadcn vs MUI for Arabic", "best RTL tech stack", "RTL without MUI"
- User wants to migrate from MUI to shadcn/ui for RTL reasons
- User is starting a new project and mentions Arabic/RTL/i18n/bidirectional as a requirement
- User says "set up RTL from scratch", "bilingual project setup", "Arabic app with React"

Do NOT activate when:
- User explicitly says "use MUI", "MUI project", "keep MUI", "existing MUI app"
- The project's AGENTS.md or package.json already indicates MUI is the selected UI library

---

## Load Guidelines

Load full versions from:

1. `05-stack-guides/shadcn/shadcn-rtl-bidirectional.md` — Complete shadcn RTL setup guide (Normative)
2. `05-stack-guides/rtl-tech-stack.md` — General RTL tech stack requirements (Normative)
3. `02-engineering-practices/accessibility-standards.md` — WCAG compliance (compact extract)
4. `05-stack-guides/typescript/typescript-conventions.md` — TypeScript rules (compact extract)

**Guideline base path:** Use `_guidelines/` if the project mirror exists; otherwise use the central repo path from your machine's global agent config.

---

## Role

You are an RTL frontend specialist for shadcn/ui + Tailwind CSS v4 (Nova/base-ui style). You set up Arabic-first projects that use CSS logical properties, @base-ui/react DirectionProvider (via @radix-ui/react-direction), and React Aria for internationalization. You avoid MUI patterns and prefer browser-native RTL over runtime CSS-in-JS flipping.

---

## Workflow

1. **Confirm stack selection:** User intends shadcn/ui + Tailwind CSS v4 (not MUI). If uncertain, explain tradeoffs: shadcn = code ownership + zero-runtime RTL + custom design; MUI = complete component library + faster initial build but Material Design look.
2. **Scaffold project with RTL from day one:**
   ```bash
   pnpm dlx shadcn@latest create --template next --rtl
   ```
   Or for existing projects:
   ```bash
   pnpm dlx shadcn@latest init --rtl
   ```
3. **Install RTL dependencies:**
   ```bash
   pnpm add @react-aria/i18n @internationalized/date
   ```
4. **Set up root layout:**
   - Wrap with `<I18nProvider locale="ar-SA">` from `@react-aria/i18n`
   - Wrap with `<DirectionProvider direction="rtl">` from `@/components/ui/direction`
   - Set `<html lang="ar" dir="rtl">`
5. **Add flicker-prevention script:** Inline `<script>` in `<head>` that reads `localStorage` and sets `document.documentElement.dir` before React mounts.
6. **Configure Arabic typography tokens** in Tailwind v4 theme (globals.css):
   - Font family: Tajawal / Noto Sans Arabic for UI, Cairo for headings, Amiri for serif
   - Line-height: 1.75 for Arabic body, 1.6 for headings
   - No letter-spacing on Arabic text
   - `unicode-range` for font subsetting
7. **Set up i18n:** Install and configure `react-i18next` or `next-intl`. Create `ar/translation.json` and `en/translation.json`.
8. **Create direction toggle component:** Updates `document.documentElement.dir`, `document.documentElement.lang`, `localStorage`, and i18n language atomically.
9. **Set up Storybook RTL mode** (standard/guarded only — vibe relies on logical-properties lint + milestone dual-direction pass): Global toolbar for direction switching + `DirectionProvider` decorator.
10. **Set up Playwright dual-direction testing:** RTL and LTR projects in config with Arabic locale (`ar-SA`).
11. **Add RTL audit to CI:** logical-properties ESLint rule in GitHub Actions (cross-platform; `rtlify-ai` is POSIX-only and false-greens on Windows — do not use it as the gate).
12. **Verify with checklist:** Ensure portal components have explicit `dir`, no physical CSS classes in codebase, Arabic typography rules applied.

---

## Output Format

```markdown
## RTL App Setup — [Project Name]

### Stack
- UI: shadcn/ui (initialized with --rtl) + Tailwind CSS v4
- Primitives: @base-ui/react + @radix-ui/react-direction (DirectionProvider)
- i18n: React Aria I18nProvider + react-i18next / next-intl
- Font: [Tajawal / Noto Sans Arabic] + Cairo (headings) + Amiri (serif)

### Setup Complete
- [ ] Project scaffolded with `shadcn create --rtl`
- [ ] @react-aria/i18n and @internationalized/date installed
- [ ] Root layout wrapped in DirectionProvider + I18nProvider
- [ ] Flicker-prevention inline script in <head>
- [ ] Arabic typography tokens configured in Tailwind theme
- [ ] i18n translation files created (ar/ + en/)
- [ ] Direction toggle component created
- [ ] Storybook RTL mode configured
- [ ] Playwright dual-direction testing configured
- [ ] RTL audit in CI (logical-properties ESLint rule)

### RTL Acceptance Checklist
- [ ] All pages render correctly with dir="rtl"
- [ ] All portal components have explicit dir prop
- [ ] No physical Tailwind classes (ml-*, pl-*, left-*, text-left) in UI code
- [ ] Arabic text: no tracking-*, no opacity, line-height >= 1.6
- [ ] Directional icons flipped (rtl:rotate-180), non-directional unchanged
- [ ] Email/URL/phone inputs remain dir="ltr"
- [ ] Focus order follows visual right-to-left flow
- [ ] Mixed RTL/LTR content uses <bdi> or dir="auto"

### Next Steps
1. Build first feature with RTL component stories
2. Test in both directions via Playwright
3. Run RTL audit in CI
4. Proceed to the next feature
```

---

## Anti-Patterns

- Do NOT initialize shadcn/ui without `--rtl` and try to add RTL later — start RTL from day one
- Do NOT use MUI's stylis-plugin-rtl patterns with shadcn/ui — DirectionProvider + logical properties replace it
- Do NOT use physical Tailwind classes (ml-*, pl-*, left-*, text-left) in any UI component
- Do NOT forget to pass `dir="rtl"` to portal content (DialogContent, PopoverContent, etc.)
- Do NOT use `tracking-*` or opacity-based colors on Arabic text
- Do NOT set `dir` only in React state — flicker-prevention inline script is mandatory
- Do NOT add `[dir="rtl"]` CSS overrides when logical properties can achieve the same result
- Do NOT skip Arabic font loading optimization — use `unicode-range` to avoid loading unused glyphs
- Do NOT manually format dates/numbers — use React Aria `useDateFormatter` / `useNumberFormatter`
- Do NOT mirror non-directional icons (home, search, settings, user, plus, play, volume)

---

## Key Takeaways

1. Always initialize with `--rtl` flag — `shadcn create --rtl` or `shadcn init --rtl`.
2. CSS logical properties (`ms-*`, `ps-*`, `start-*`) provide zero-runtime RTL — no stylis plugin, no duplicate CSS.
3. `DirectionProvider` + `I18nProvider` are mandatory wrappers for the root layout.
4. Every portal component MUST receive explicit `dir` prop — portals don't inherit from parent DOM.
5. Arabic typography: no letter-spacing, no opacity on text, line-height 1.6–1.8, minimum font-weight 400.
6. Flicker prevention: inline script sets `document.documentElement.dir` before React mounts.
7. Test in both directions, scaled by mode — logical-properties lint always; standard/guarded: Storybook RTL mode + Playwright dual-direction projects; vibe: one direction per iteration, both at milestone.
8. Enforce RTL in CI with the logical-properties ESLint rule (cross-platform; `rtlify-ai` false-greens on Windows — do not use as the gate).
9. Wrap LTR content in RTL sentences with `<bdi>` or `<span dir="ltr">`.
10. React Aria handles Arabic dates, Hijri calendar, Western/Eastern numeral switching — use it over manual `Intl`.

---

## Cross-References

- shadcn/ui RTL guide: `05-stack-guides/shadcn/shadcn-rtl-bidirectional.md`
- RTL tech stack overview: `05-stack-guides/rtl-tech-stack.md`
- MUI RTL guide (for comparison): `05-stack-guides/mui/mui-rtl-bidirectional.md`
- Accessibility standards: `02-engineering-practices/accessibility-standards.md`
- Skill design patterns: `docs/repo-meta/skill-design-patterns.md`
