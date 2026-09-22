# Glossary — Global Guidelines for Vibe Coders

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~5,100 tokens — measured with `measure-boot-budget.js`, not estimated)
**Last Updated:** 2026-09-22

## 💡 Top 10 Essential Terms (Quick Anchor)

If you are a beginner, memorize these ten key concepts to instantly understand all instructions and talk to your AI like a pro:

1. **Vibe Coding:** Building software by describing what you want in plain language while directing AI agents.
2. **Behavioral Contract:** A test that verifies **what** your app does visually and functionally, rather than how its code is written.
3. **Context Window:** The maximum "whiteboard" space an AI model has to remember your conversation before it starts forgetting older parts.
4. **Token:** The word counter of AI text processing (~4 characters). Guideline files are measured in tokens to keep costs low.
5. **Vertical Slice:** Building one complete, working feature spanning all layers (UI → API → Database) before starting any other feature.
6. **Normative:** A binding rule that **must** be strictly followed. Advisory guidelines are recommended but flexible.
7. **Design Token:** A named variable (e.g., `theme.colors.primary`) representing colors, font, or spacing. You must use these instead of hardcoded raw values.
8. **Logical CSS Properties:** CSS commands (e.g., `margin-inline-start`) that automatically flip layouts when switching between English and Arabic.
9. **Portal Components:** Overlays like Dialogs or Menus that sit outside the normal page structure. They **must** be given explicit directions (`dir="rtl"`) to avoid rendering issues.
10. **Silent Regression:** A hidden bug introduced by changes that compiles successfully but breaks other undocumented behaviors.

---

## Purpose

Standardize terminology across all guideline documents so AI agents and humans share a consistent vocabulary. Each definition includes a non-coder analogy for vibe coders with zero programming experience.

---

## Core Terms

| Term | Definition | Non-Coder Analogy |
|---|---|---|
| **Vibe Coding** | AI-assisted software development where natural language instructions drive code generation, with the human acting as orchestrator and quality gate. | You're the architect who describes the house; the AI is the construction crew that builds it. |
| **Behavioral Contract** | A test that verifies WHAT the system does (inputs → outputs), not HOW it's implemented internally. | Like a vending machine contract: you put in money and press B4, you get a soda. You don't need to know how the gears work inside. |
| **Context Window** | The maximum token capacity an AI model can process in a single conversation turn. | Like a whiteboard — only so much fits before old notes get erased to make room for new ones. |
| **Token** | The atomic unit of AI text processing (~4 characters in English). Guidelines are measured in tokens to estimate context cost. | Like a word counter for AI. 100 tokens ≈ 75 English words. |
| **Vertical Slice** | A complete, working feature spanning all layers (UI → API → Database) built before moving to the next feature. | Like building one complete room (walls, floor, ceiling, door, furniture) before starting the next room. |
| **Normative** | Binding guidance that MUST be followed. Violations are errors. | Like a traffic red light — you must stop. |
| **Advisory** | Recommended patterns that SHOULD be followed but can be adapted. Violations are warnings. | Like a yellow speed sign — slow down, but you can adjust based on conditions. |
| **Archived** | Retained for historical reference only. MUST NOT be used as implementation guidance. | Like expired medicine — keep it for reference but don't use it. |
| **Rule Extraction** | The process of deriving concise, deterministic instruction files from long-form educational guideline documents. | Like making cliff notes from a textbook — keep only the rules you must follow. |
| **Skill** | A specialized, on-demand AI capability loaded only when relevant to the current task. | Like calling a plumber only when you have a plumbing problem, not keeping one on staff. |
| **Instruction File** | A concise, path-scoped file that enforces binding rules for AI code generation in specific file patterns. | Like a posted sign in a workshop saying "wear safety goggles in this area." |
| **Authority Hierarchy** | The precedence chain for resolving conflicts: Requirements → Instructions → Guidelines → Skills → IDE defaults. | Like a legal system: the constitution beats state law, which beats local ordinance, which beats house rules. |
| **Progressive Disclosure** | Loading guidelines in stages: index first → primary files → secondary files → deep dives. Minimizes upfront token cost. | Like getting directions: first the highway, then the exit, then the street, then the driveway — not the entire GPS map at once. |
| **Silent Regression** | A bug introduced by AI-generated code that passes all existing tests but breaks undocumented behavioral expectations. | Like a renovation that passes building inspection but the shower doesn't drain — the inspector didn't check for that. |
| **Architectural Entropy** | The gradual degradation of codebase structure when AI makes incremental changes without holistic architectural awareness. | Like a kitchen where every cook adds ingredients without a recipe — eventually it's a mess nobody can cook in. |
| **False Confidence** | The dangerous assumption that AI-generated code is correct because it compiles and looks plausible. All AI output must be verified. | Like assuming a car drives well because it has a fresh paint job and the engine starts. |
| **Agent Orchestration** | Coordinating multiple AI agents working in parallel or sequence on different aspects of a task. | Like assigning an electrician, plumber, and painter to work on different rooms of a house simultaneously. |
| **MCP (Model Context Protocol)** | A protocol for connecting AI assistants to external tools, APIs, and data sources. | Like giving your architect access to the hardware store catalog so they can order materials directly. |
| **RAG (Retrieval-Augmented Generation)** | A technique where AI retrieves relevant documents before generating responses. | Like asking someone to read the manual before answering your question. |
| **Golden Rule of Vibe Coding** | "The AI is a junior engineer with infinite speed and zero judgment. You are the senior engineer. Own every decision." | You're the boss. The AI is a fast intern who never sleeps but needs constant supervision. |
| **Cognitive Load** | The total amount of mental effort required to use an interface. Designers MUST minimize extraneous cognitive load (visual clutter, unnecessary decisions) while preserving intrinsic load (the information users came for). | Like a desk — if the desk is covered in papers, sticky notes, and empty coffee cups, you can't find the one document you need. A clean desk with only the essential items makes work easy. |
| **Tesler's Law (Conservation of Complexity)** | Every application has an inherent amount of irreducible complexity. The question is who handles it: the user or the system. Good design shifts complexity to the system. | Like a tax accountant — you could learn tax law and fill out the forms yourself (complexity on you), or they handle it behind the scenes (complexity on them). |
| **Visual Hierarchy** | The arrangement of elements to guide the user's eye to the most important information first, using contrast, size, spacing, and position. | Like a newspaper front page — the headline is big and bold, the subtitle is smaller, and the body text is smallest. You know what to read first without being told. |
| **Design Token** | A named variable that stores a visual design value (color, spacing, typography, shadow). Tokens are the single source of truth — components reference tokens, never raw values. | Like a paint swatch book — "Ocean Blue" always means the same color, and if you decide to change it to a darker shade, you update one swatch, not every wall. |
| **Logical Property (CSS)** | A CSS property that adapts to the writing direction (RTL or LTR) automatically. `margin-inline-start` is start-side margin in both directions. The alternative is "physical properties" like `margin-left` which are direction-biased. | Like a reversible jacket — you can wear it either way, and the pockets are always in the right place regardless of which side faces out. |
| **Mirroring (RTL context)** | The deliberate flipping of interface elements when the UI direction changes from LTR to RTL. Navigation, pagination, and progress indicators mirror. Logos, numbers, and non-directional icons do not. | Like a mirror image of a car — the steering wheel switches sides, but the pedals (brake, accelerator) stay in the same order. |
| **Bidirectional (Bidi)** | Text that contains both RTL (Arabic, Hebrew) and LTR (English, numbers) content. Bidirectional support means the UI gracefully handles mixed-direction text without rendering errors. | Like a street with two-way traffic — cars go in both directions without crashing, each following the rules of their lane. |

---

## Technical Terms for Vibe Coders

| Term | Definition | Non-Coder Analogy |
|---|---|---|
| **Component** | A reusable piece of UI — a button, a form, a table — that combines appearance and behavior. | Like a LEGO piece: it has a specific shape and function, and you snap pieces together to build something bigger. |
| **Hook** | A function that lets a component use state or side effects without writing a class. | Like a power outlet on the wall — plug into it to get electricity (data) without wiring it yourself. |
| **State** | Data that changes over time and affects what the UI displays. | Like a light switch — it's either on or off, and the whole room changes based on its position. |
| **Middleware** | Code that runs between a request and a response, like checking if someone is logged in before showing a page. | Like the bouncer at a club door — they check your ID before letting you in. |
| **Repository (pattern)** | A layer that handles data storage and retrieval, keeping database details away from business logic. | Like a librarian — you ask for a book by title, they find it in the stacks. You don't need to know where the stacks are. |
| **Schema** | The structure of your data — what tables exist, what columns they have, and how they relate. | Like the floor plan of a building — it shows where rooms are and how they connect. |
| **Migration** | A tracked, reversible change to the database schema. Like adding a new column or table. | Like a renovation permit — you record what you changed so you can undo it if needed. |
| **Endpoint** | A URL that your app can send requests to or receive data from. | Like a reception desk — you go there with a question, they give you an answer. |
| **Payload** | The data sent in a request or received in a response. | Like the contents of a package — the box (request) is how it's sent, the payload is what's inside. |
| **Route** | A URL path that maps to a specific page or API function. | Like a street address — each address leads to a specific building (page). |
| **Service** | A layer that contains business logic and data processing, separate from UI and database. | Like a kitchen in a restaurant — the logic of cooking happens there, not at your table or in the pantry. |
| **Controller** | A function that receives a request, calls the right service, and returns a response. | Like a waiter — takes your order, tells the kitchen, brings your food back. |
| **Props** | Data passed from a parent component to a child component. | Like passing a note to someone — the note (data) comes from you, the other person reads it. |
| **Render** | The process of turning component code into what the user sees on the screen. | Like a printer — it takes digital content and turns it into something you can see. |
| **DOM** | The browser's internal representation of the page. React updates a virtual copy (Virtual DOM) and applies changes efficiently. | Like a puppet's strings — React pulls the right strings to make the puppet (webpage) move. |
| **SSR (Server-Side Rendering)** | Generating the HTML on the server before sending it to the browser. | Like a restaurant where the kitchen prepares your entire plate before bringing it out. |
| **SPA (Single Page Application)** | An app that loads once and then updates content without full page reloads. | Like a buffet where you stay at your table and the server brings you new dishes — you never leave your seat. |
| **Environment Variable** | A configuration value stored outside the code, usually in a `.env` file. Like API keys and database URLs. | Like the address on an envelope — the letter (code) is the same, but the address (env variable) changes per delivery. |
| **API Key** | A secret token that identifies your application to an external service. | Like a membership card — it proves you're allowed in, so don't share it. |
| **CORS** | A browser security mechanism that controls which websites can access your API. | Like a VIP list at a party — only listed guests (domains) can talk to your server. |
| **CSP (Content Security Policy)** | A security header that tells browsers which sources of content are allowed. | Like a guest list for deliveries — only approved senders can load scripts, styles, or images. |
| **XSS** | A vulnerability where an attacker injects malicious scripts into your web pages. | Like someone slipping a fake note into your mailbox that looks like an official letter. |
| **SQL Injection** | A vulnerability where an attacker inserts malicious SQL commands through user input. | Like someone filling out a form with fake instructions that the database accidentally runs. |
| **Parameterized Query** | A database query where user input is treated as data, not code. Prevents SQL injection. | Like using a labeled envelope — the contents stay safely inside instead of being read as instructions. |
| **Lint** | An automated tool that checks code for style errors and potential bugs. | Like a spell checker for code — it catches mistakes before they cause problems. |
| **Type Check** | Verifying that data types match what's expected (e.g., a number where a number is required). | Like checking that you plugged the right cable into the right port. |
| **Build** | The process of converting source code into a deployable application. | Like compiling a recipe book — you gather all the instructions and package them for the kitchen. |
| **Bundle** | The combined JavaScript/CSS files sent to the browser. Smaller bundles mean faster loading. | Like a suitcase — the more you pack in it, the heavier it is. Pack light, travel fast. |
| **Deploy** | Making your application available on the internet for users to access. | Like opening your restaurant doors — your app is now live and people can visit. |
| **Production** | The live environment where real users access the application. | Like the dining room — real customers are here. Mistakes are visible. |
| **Staging** | A pre-production environment that mirrors production for testing. | Like the rehearsal dinner — practice before the real event, catch problems early. |
| **Commit** | A saved snapshot of your project's current state in Git. | Like saving your game — you can always go back to this save point. |
| **Branch** | A parallel version of your project where you can work on features independently. | Like a side road — you can explore without affecting the main highway. |
| **Merge** | Combining changes from one branch into another. | Like two streams joining into one river. |
| **Pull Request (PR)** | A request to merge your branch's changes into the main branch, usually reviewed first. | Like submitting your homework — the teacher reviews it before accepting. |
| **Local CI** | Running all CI quality gates on your own machine via Git hooks instead of a paid cloud CI service. See `03-git-and-ci/local-ci-strategy.md`. | Like doing your own quality inspection at home before shipping a package, instead of paying a factory to check it. |
| **Pre-Push Gate** | A Git hook that runs the full quality pipeline (lint, type check, tests, build) before every push; the push is blocked if anything fails. | Like a final walkthrough of your house before handing over the keys — nothing leaves until everything checks out. |
| **Fast Loop** (`gate:fast`) | The seconds-long check an agent runs between edits: lint, type check, and only the tests the diff touched. It is a convenience, never proof. | Like tasting the sauce while you cook — it is not the health inspector's visit. |
| **Gate Receipt** | A file a command writes (`docs/gate-receipts/…`) recording each gate step's exit code and key figures, so documents can cite evidence by path instead of copying numbers. | Like a printed thermometer reading instead of "it felt fine." |
| **Path-Aware Step** | A gate step that runs only when the files it protects changed, keeping a slow suite in the gate without paying for it on every push. | Like checking the tires before a long trip, not every time you get into the car. |
| **Boot Chain** | The set of steering documents a session must read before it can work; its size is a tax paid by every session, so it gets a measured budget. | Like the safety briefing before every flight — necessary, and it still has to stay short. |
| **Dated Archive** | A quarterly change-log file (`docs/changelog/…`) that holds a working document's history so the document itself stays instruction-only. | Like a hospital's archived records room — the ward keeps only the current chart. |
| **act** | An optional open-source tool that runs GitHub Actions workflow files locally inside Docker, without spending cloud minutes. | Like a flight simulator for your automation scripts — practice on the ground before paying for the flight. |
| **N+1 Query** | A performance problem where the app makes N+1 database queries instead of 1, causing slowness. | Like calling the pizza place 50 times to order 50 toppings one at a time instead of ordering once. |
| **Debounce** | Delaying execution until the user stops typing, to avoid processing every keystroke. | Like waiting until someone finishes talking before you start responding. |
| **Memo** | Caching a computation so it doesn't recalculate unnecessarily. | Like writing down a phone number instead of looking it up every time. |
| **Hydration** | The process of attaching JavaScript behavior to server-rendered HTML, making the page interactive. | Like adding batteries to a toy — it looks complete on the shelf, but batteries (JavaScript) make it work. |
| **Dependency** | An external library or package your project uses. | Like ingredients you buy from the store instead of making from scratch. |
| **Package Manager** | A tool that installs and manages external dependencies (npm, yarn, pnpm). | Like a grocery delivery service — you tell it what you need, it gets it for you. |
| **IDE** | Integrated Development Environment — the program where you write code (e.g., VS Code). | Like a workshop — it has all the tools you need in one place. |
| **CLI** | Command Line Interface — typing commands instead of clicking buttons. | Like giving instructions over the phone instead of pressing buttons on a remote. |
| **Framework** | A pre-built structure that provides common functionality so you don't start from scratch. | Like a house frame — the structure is there, you add the walls, plumbing, and furniture. |

---

## Classification Prefixes

| Prefix | Meaning |
|---|---|
| `00-` | AI fundamentals and collaboration philosophy |
| `01-` | Development workflow and methodology |
| `02-` | Universal engineering practices |
| `03-` | Version control and CI/CD |
| `04-` | System and software architecture |
| `05-` | Stack-specific technical guides |
| `06-` | Universal frontend UI patterns |
| `07-` | Documentation and knowledge management |
| `08-` | AI governance and rules system |
| `_index/` | Meta-documentation (indexes, retrieval rules) |
| `_archive/` | Deprecated and superseded content |

---

## Cross-References

- **Referenced by:** All guideline documents
- **See also:** `MASTER_INDEX.md`, `../../docs/repo-meta/classification-system.md`