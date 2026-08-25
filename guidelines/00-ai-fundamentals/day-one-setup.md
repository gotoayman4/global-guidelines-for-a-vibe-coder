# Day One Setup — From Zero to First Working Feature

**Status:** Normative
**Scope:** Global
**Token Tier:** Compact (~1,200 tokens)
**Last Updated:** 2026-05-25
**Cross-References:** `beginner-vibe-coder-guide.md`, `cost-optimization-strategy.md`, `git-workflow-strategy.md`

---

## Purpose

A step-by-step guide for setting up everything needed to start vibe coding on a new project. This guide assumes you have zero coding experience and takes you from "I just installed my OS" to "I committed my first working feature."

---

## Prerequisites Checklist

Before starting, you need:

- [ ] A computer running Windows, macOS, or Linux
- [ ] An internet connection
- [ ] A GitHub account (free at github.com)
- [ ] An AI tool account (GitHub Copilot, OpenAI, Anthropic, or other)

---

## Step 1: Install Core Tools

### Node.js (JavaScript/TypeScript Runtime)

1. Go to nodejs.org
2. Download the **LTS** version (Long Term Support — not "Current")
3. Run the installer with default settings
4. Verify: open a terminal (see Step 2) and type `node --version` — you should see a version number

### Git (Version Control)

1. Go to git-scm.com
2. Download and install with default settings
3. Verify: open a terminal and type `git --version` — you should see a version number
4. Configure your identity:
   ```
   git config --global user.name "Your Name"
   git config --global user.email "your-email@example.com"
   ```

### Visual Studio Code (Code Editor)

1. Go to code.visualstudio.com
2. Download and install with default settings
3. Install the **GitHub Copilot** extension from the Extensions panel (Ctrl+Shift+X)
4. Sign into GitHub Copilot when prompted

### AI Tools (Choose Your Primary)

| Tool | Purpose | Setup |
|---|---|---|
| **GitHub Copilot** (in VS Code) | Code suggestions, chat, inline generation | Install Copilot extension in VS Code → Sign in |
| **Qoder** | Project-level AI assistance | Follow vendor setup guide |
| **OpenCode** | Terminal-based AI coding | Follow vendor setup guide |
| **Antigravity** | Multi-agent orchestration | Follow vendor setup guide |
| **Codex** | Autonomous coding agent | Follow vendor setup guide |

---

## Step 2: Learn Your Terminal

The terminal (also called "command line" or "shell") is how you give instructions to your computer with text instead of clicking. You MUST learn these commands:

| Command | What It Does | Non-Coder Analogy |
|---|---|---|
| `cd folder-name` | Go into a folder | Opening a folder |
| `cd ..` | Go up one folder | Going back |
| `ls` (Mac/Linux) or `dir` (Windows) | List files in current folder | Looking at what's inside |
| `pwd` | Show which folder you're in | Checking your current location |
| `mkdir folder-name` | Create a new folder | Making a new folder |
| `clear` | Clear the terminal screen | Wiping the whiteboard |

**To open the terminal in VS Code:** Press `` Ctrl+` `` (backtick) or go to Terminal → New Terminal.

---

## Step 3: Create Your Project

Run these commands one at a time in your terminal:

```bash
# 1. Navigate to where you want your project
cd Documents

# 2. Create a new project using Vite (the recommended build tool)
npm create vite@latest my-project -- --template react-ts

# 3. Go into the project folder
cd my-project

# 4. Install all required packages
npm install

# 5. Start the development server
npm run dev
```

You should see a message like: `Local: http://localhost:5173/`. Open that URL in your browser. You should see the Vite + React starter page.

---

## Step 4: Initialize Git and Make Your First Commit

```bash
# 1. Initialize Git in your project
git init

# 2. Create a .gitignore file (tells Git which files to skip)
# The Vite template already includes a .gitignore file

# 3. Add all files to Git
git add .

# 4. Make your first commit (save point)
git commit -m "feat: initial project setup"
```

---

## Step 5: Create Your Project Constitution

Copy the appropriate starter template to your project root:

| Template | Copy To | For |
|---|---|---|
| `global-configs/templates/AGENTS.starter.md` | `AGENTS.md` | Universal (works with all AI tools, including Claude Code) |
| `global-configs/templates/copilot-instructions.starter.md` | `.github/copilot-instructions.md` | GitHub Copilot |
| `global-configs/templates/WORLD.starter.md` | `WORLD.md` | Product intent guardrail |

Fill in all `[FILL]` placeholders with your project's details. Commit this file.

---

## Step 6: Connect to GitHub (Remote Backup)

```bash
# 1. Create a repository on github.com (do NOT initialize with README)

# 2. Link your local project to GitHub
git remote add origin https://github.com/YOUR-USERNAME/my-project.git

# 3. Push your code
git push -u origin main
```

---

## Step 7: Create Your First Feature (The Loop)

Now follow the simplified vibe coder loop:

1. **DESCRIBE:** Tell your AI tool what you want in plain language
2. **GENERATE:** Let the AI build it
3. **RUN & VERIFY:** Run `npm run dev`, open browser, check visually
4. **COMMIT:** Save progress with `git add . && git commit -m "feat: what you built"`
5. **ITERATE:** Move to the next feature

**Your first feature should be small.** Example: "Add a page that shows a list of items with their names and dates."

---

## Common Problems and Fixes

| Problem | Fix |
|---|---|
| `node --version` says "command not found" | Node.js was not installed correctly. Reinstall from nodejs.org, restart terminal. |
| `npm create vite` fails with permission error | On Mac/Linux: prefix with `sudo`. On Windows: run terminal as Administrator. |
| `npm run dev` shows errors in red | Copy the error message exactly and paste it to your AI tool. Describe what you were trying to do. |
| Browser shows blank page | Check the terminal for errors. Copy-paste any errors to your AI tool. |
| `git push` asks for credentials | Install GitHub CLI (`gh auth login`) or set up SSH keys. Your AI tool can explain how. |
| AI suggests installing a paid service | Challenge it. Ask: "Can we do this with the free tier?" Refer to `cost-optimization-strategy.md`. |
| AI gives conflicting suggestions or ignores rules | Rule conflicts. Clear out unnecessary instructions, ensure you only load relevant stack guides, and standardise your global configs (`AGENTS.md` / `CLAUDE.md`). |
| AI stops editing mid-file or context limit reached | Context window exhaustion. Start a fresh chat session, only provide the direct files needed, and avoid pasting giant files or keeping 100+ message threads. |
| VS Code highlights normal lines with red squiggles | False IDE lint errors. Run `npm run type-check` or `npm run lint` in the terminal to see if they are real. If the terminal passes, restart VS Code to refresh its language server. |

---

## Anti-Patterns

| Anti-Pattern | Why It's Dangerous |
|---|---|
| Skipping Git setup | Without Git, you have no undo button. One bad AI change can erase hours of work. |
| Not committing after each feature | If the next AI change breaks something, you can't easily go back. |
| Installing many VS Code extensions on day one | Extension conflicts cause confusing errors. Start with Copilot only. Add others when needed. |
| Starting with a complex feature | The first feature MUST be simple. Build one small thing that works end-to-end. |
| Copying code from Stack Overflow without understanding it | You can't verify what you don't understand. Ask AI to explain any code it gives you. |
| Using multiple AI tools simultaneously on day one | Master one tool first. Add Qoder, OpenCode, Antigravity, or Codex only after you're comfortable. |

---

## Key Takeaways

1. Install Node.js, Git, and VS Code before anything else. These are non-negotiable.
2. Learn 6 terminal commands: `cd`, `cd ..`, `ls`/`dir`, `pwd`, `mkdir`, `clear`.
3. Create your project with `npm create vite@latest` — not from scratch.
4. Initialize Git and make your first commit before writing any code.
5. Copy starter templates (AGENTS.md, WORLD.md) and fill in all `[FILL]` fields.
6. Push to GitHub for remote backup.
7. Build one small feature first. A working app with 1 feature beats a broken app with 10.
8. When something breaks, copy the error message and give it to your AI tool.

---

## Cross-References

- **Prerequisite for:** `beginner-vibe-coder-guide.md` — the simplified development loop
- **Extended by:** `git-workflow-strategy.md` — detailed Git workflow
- **Extended by:** `cost-optimization-strategy.md` — free-tier-first tool selection
- **Companion:** `verification-for-non-coders.md` — how to verify without reading code