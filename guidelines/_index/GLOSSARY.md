---
status: "Normative"
scope: "Global"
tags: [glossary, terminology, reference]
---

# Glossary — Global Guidelines for Vibe Coders

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
9. **Portal Components:** Overlays like Dialogs or Menus that sit outside the normal page structure. They escape the React parent; they still inherit `direction` from `<html>` when the app owns it there — give them explicit `dir` only where direction must differ from the document, or where the stack keeps direction in a React context only.
10. **Silent Regression:** A hidden bug introduced by changes that compiles successfully but breaks other undocumented behaviors.

---

## Speed Modes (Vibe / Standard / Guarded)

| Term | Definition | Non-Coder Analogy |
|---|---|---|
| **Vibe mode** | Fastest process tier: minimal context, plan, test, steering and gate ceremony. Not a lifecycle stage — a `vibe` project MAY ship pilots and production releases; only the boundary and the release class deepen. Security, honesty, and ship-boundary rules never relax. See `01-workflow-methodology/speed-tiered-workflow.md`. | Sketching on a napkin — quick and loose, but you still don't lie about measurements. |
| **Standard mode** | Default process tier, and the assumed mode when a project declares none: feature plans for non-trivial work, tests with code, evidence-by-change-type verification, trigger-table docs. | A normal workday with a checklist — steady, not heavy. |
| **Guarded mode** | Heaviest process tier for high-risk work: architecture review, full test pyramid, ADRs for irreversible decisions. | Surgery protocol — slow on purpose because mistakes cost a lot. |
| **Speed Mode (WORLD.md)** | The project field declaring the current mode — a loop-speed setting, not a lifecycle stage; commit messages record steady-state changes, and a release exit escalates through an override the gate reads rather than editing the field. | A thermostat setting — you can see what it is set to now; history stays outside the device. |
| **Release class** | The depth a ship boundary runs, recorded per release and never in `WORLD.md`: `pilot` (live testing, demo, internal/beta) owes the full pipeline + critical-flow checks LTR/RTL; `production` (final launch) adds the ship-tier E2E matrix, path extras and rollback readiness. | A building inspection tier — a pre-pilot walkthrough versus the final handover inspection; neither changes the thermostat. |
| **Ship boundary** | The point where a loose inner loop hardens: the full pipeline + critical-flow verification (LTR and RTL) before any release or milestone exit — automated and dated, never assumed. The **release class** sets its extra depth; the declared mode does not change. | Handing over the keys — the renovation mess is fine during work, not at walkthrough. |
| **Ceremony** | The process overhead (reading, plans, tests, steering writes, verification depth, gate scope) that modes scale up or down — never security or honesty. | Safety gear amount for the job: hard hat for framing, full harness for steelwork. |

---

## Purpose

Standardize terminology across all guideline documents so AI agents and humans share a consistent vocabulary. Each definition includes a non-coder analogy for vibe coders with zero programming experience.

---

## Core Terms

| Term | Definition | Non-Coder Analogy |
|---|---|---|
| **Vibe Coding** | AI-assisted software development where natural language instructions drive code generation, with the developer acting as orchestrator and specification author. | You're the architect who describes the house; the AI is the construction crew that builds it. |
| **Behavioral Contract** | A test that verifies WHAT the system does (inputs → outputs), not HOW it's implemented internally. | Like a vending machine contract: you put in money and press B4, you get a soda. You don't need to know how the gears work inside. |
| **Context Window** | The maximum token capacity an AI model can process in a single conversation turn. | Like a whiteboard — only so much fits before old notes get erased to make room for new ones. |
| **Token** | The atomic unit of AI text processing (~4 characters in English). Guidelines are measured in tokens to estimate context cost. | Like a word counter for AI. 100 tokens ≈ 75 English words. |
| **Vertical Slice** | A complete, working feature spanning all layers (UI → API → Database) built before moving to the next feature. | Like building one complete room (walls, floor, ceiling, door, furniture) before starting the next room. |
| **Normative** | Binding guidance that MUST be followed. Violations are errors. | Like a traffic red light — you must stop. |
| **Advisory** | Recommended patterns that SHOULD be followed but can be adapted. Violations are warnings. | Like a yellow speed sign — slow down, but you can adjust based on conditions. |
| **Archived** | Retained for historical reference only. MUST NOT be used as implementation guidance. | Like expired medicine — keep it for reference but don't use it. |
| **Rule Extraction** | The process of deriving concise, deterministic instruction files from long-form educational guideline documents. | Like making cliff notes from a textbook — keep only the rules you must follow. |
| **Skill** | A specialized, on-demand AI capability loaded only when relevant to the current task. | Like calling a plumber only when you have a plumbing problem, not keeping one on staff. |
| **Stack-Agnostic Skill** | A skill whose scope names no technology token, so it cannot contradict any project's constitution; delivered once per machine to the user-level Agent Skills directories. | Like first aid — the same instructions apply in every workshop, so you learn them once, not per site. |
| **Global Skill Pool** | The machine-global delivery of the stack-agnostic skills into `~/.agents/skills`, `~/.claude/skills` and `~/.zcode/skills`, where native loaders scan without being told. | Like a tool belt you wear to every job, instead of unpacking the same pliers onto every workbench. |
| **Generated Adapter** | A per-project, marker-stamped native skill store (`.agents/skills`, `.claude/skills`) built from `_skills/` by the sync and verified byte-for-byte against it — as opposed to a hand-maintained copy, which shadows the mirror and cannot follow upstream. | Like a printed copy of the site rules regenerated by the office — versus a photocopy someone edited by hand. |
| **Marker-Scoped Store** | A skill store whose ownership is defined by a `.*-skill-sync.json` marker listing the exact names the sync delivered: only those names are written or pruned, and every foreign skill — same name included — is skipped and reported, never overwritten. | Like a shared fridge with labeled shelves: you may replace your own labeled items, never touch anyone else's. |
| **Instruction File** | A concise, path-scoped file that enforces binding rules for AI code generation in specific file patterns. | Like a posted sign in a workshop saying "wear safety goggles in this area." |
| **Authority Hierarchy** | The precedence chain for resolving conflicts: Requirements → Instructions → Guidelines → Skills → IDE defaults. | Like a legal system: the constitution beats state law, which beats local ordinance, which beats house rules. |
| **Progressive Disclosure** | Loading guidelines in stages: `AGENTS.md` + `WORLD.md` first, then only the files the task names, then deep dives. `MASTER_INDEX.md` is a lookup for when you cannot name a file — never a stage. Minimizes upfront token cost. | Like getting directions: first the highway, then the exit, then the street, then the driveway — not the entire GPS map at once. |
| **Silent Regression** | A bug introduced by AI-generated code that passes all existing tests but breaks undocumented behavioral expectations. | Like a renovation that passes building inspection but the shower doesn't drain — the inspector didn't check for that. |
| **Update Feed** | The small manifest (`latest.yml` / `latest-mac.yml` / `latest-linux.yml`) that names the newest version, its installer files, their hashes, and its release notes. | Like a restaurant's menu board — it lists today's dish; the kitchen (installer) is behind it. |
| **Release Channel** | A named stream of releases — `latest` for stable users, `beta` for opted-in users — that an installed app follows. | Like a radio station: you tune to one frequency and hear its current broadcast. |
| **Differential Update** | Downloading only the changed blocks of the new installer (using its `.blockmap`) instead of the whole file. | Like patching a jacket instead of buying a new one. |
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
| **Pre-Push Gate** | A Git hook that runs the declared mode's share of the quality pipeline before every push (every mode: the `always` guard tier, the dependency audit and the clean-tree check; vibe adds `gate:fast`; standard the full suite too; guarded the build and path extras); the push is blocked if anything fails, and the full pipeline runs at the ship boundary. | Like a final walkthrough of your house before handing over the keys — nothing leaves until everything checks out. |
| **Fast Loop** (`gate:fast`) | The seconds-long check an agent runs between edits: lint, type check, and only the tests the diff touched. It is a convenience, never proof. | Like tasting the sauce while you cook — it is not the health inspector's visit. |
| **Gate Receipt** | A file a command writes (`docs/gate-receipts/…`) recording the release class, the commit and each gate step's result, so documents can cite evidence by path instead of copying numbers. On a release push the `ship`-tier `check-ship-receipt.js` requires a passing one for the code being shipped. | Like a printed thermometer reading instead of "it felt fine." |
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
| **OpenType Shaping** | The process that selects the correct visual form of each Arabic letter (isolated, initial, medial, final) and applies ligatures and mark positioning before glyphs are drawn. | Like cursive handwriting — the same letter looks different depending on which letters sit beside it. |
| **UAX #9 (Bidi Algorithm)** | The Unicode standard that decides the visual order of mixed right-to-left and left-to-right text, including numbers and punctuation. | Like traffic rules for a two-way street — both directions share the road without colliding. |
| **Presentation Forms** | Legacy Unicode blocks (U+FB50–FDFF, U+FE70–FEFF) that store pre-shaped Arabic glyphs. They bypass shaping and break ligatures, search and copy — never emit them. | Like a photograph of a word instead of the word — it looks right but you cannot edit, search or read it aloud. |
| **ToUnicode Map (CMap)** | A table inside a PDF that maps embedded glyph IDs back to Unicode characters, which is what makes text selectable and searchable. | Like an index at the back of a book — it tells you which real word a printed symbol stands for. |
| **PDF/A** | An ISO-standard PDF profile for long-term archiving: all fonts embedded, colour described explicitly, no external dependencies. | Like sealing a document in archival plastic — it will still be readable years later. |
| **Tagged PDF / PDF/UA** | A PDF carrying a structure tree (headings, tables, reading order, language) used by assistive technology. PDF/UA is the accessibility conformance profile. | Like adding invisible labels to every part of a document so a screen reader can describe its structure. |
| **Paged Media** | CSS features that describe printed pages: `@page`, margins, running headers, page breaks, footnotes. Browsers implement a subset; Paged.js and Vivliostyle fill the gaps. | Like page-layout rules for a print shop — where the margins, headers and page breaks go. |

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