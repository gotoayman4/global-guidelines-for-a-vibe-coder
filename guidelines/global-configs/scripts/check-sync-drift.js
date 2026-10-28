#!/usr/bin/env node

/**
 * check-sync-drift.js — Is every project's DELIVERED COPY current, and is every required
 * guard DISCOVERABLE in its configuration?
 *
 * WHAT THIS DOES NOT PROVE. It reads files: it cannot tell whether a guard ever ran, or whether
 * it passed. A `package.json` script that names a guard is evidence of wiring, not of execution;
 * only a gate receipt (or another recorded run) is evidence of execution, and this check reads
 * none. The report names that limit on every green run, because "all projects are running the
 * current rules" was a sentence this script printed while checking neither delivery of skills nor
 * execution of guards — and a control whose output overstates its evidence trains the operator to
 * stop believing it. Execution evidence lives in `docs/gate-receipts/` per `local-ci-strategy.md`.
 *
 * INTENT: A mirror under `_guidelines/` is a COPY, and a copy that nothing compares drifts
 * silently. Measured on 2026-10-11: all 105 guideline files differed from the mirror in a
 * dependent project, the mirror was 19 days old, and `sync-projects.json` asserted a
 * `lastSynced` date the filesystem contradicted — while the project's own template said
 * "skip if the mirror exists". A date is a claim; a content hash is a control
 * (documentation-strategy.md §One Home Per Fact, applied to delivery).
 *
 * CONSTRAINT: the comparison is the MIRROR against the SOURCE, not the mirror against a
 * remembered number. A recorded hash that has drifted from both is reported as a stale
 * record, never as "in sync". EOL is normalised before hashing so a CRLF checkout is not
 * mistaken for a content difference.
 *
 * DECISION: this runs from the central repo, where the source of truth lives — a project
 * cannot verify itself against a source it does not have. `--record` is what the sync writes;
 * nothing else may write a hash, or the record stops meaning "this content was delivered".
 *
 * TWO SUBJECTS, ONE QUESTION. The mirror answers "does the project HAVE the current rules?"; the
 * controls pass answers "does its configuration NAME them?" A mirror in sync whose guard files are
 * never invoked is the failure the first check cannot see: the file arrives, the tier is declared,
 * and nothing reads either — and a guard named in `package.json` may still never have run, which
 * only a receipt can answer. The required set is declared in `sync-manifest.json` §guards rather
 * than derived from the guards' own `@tier`, because a tier says WHEN a guard runs, not WHERE it
 * is meaningful. It is matched by FILE and not by script name — the doctrine maps each step to the
 * project's own names, so requiring a name would impose a convention this check has no business
 * imposing.
 *
 * AND A THIRD ARTIFACT, ADDED 2026-10-12. `_skills/` is the one thing a project receives that
 * INSTRUCTS the agent rather than informing it, and until this pass existed nothing verified it:
 * the hash covered `_guidelines/` alone, `guards.required` named no skill-related guard, and
 * `_skills/` is gitignored, so a missing or stale copy was invisible in every direction at once.
 * The skills mirror is derived from the manifest (`§skills` names the source glob and the
 * destination) for the same reason the ignore entries are: a second hand-kept list is the defect.
 * Its verdict is the PLAN's, not a hash equality — `_skills/` is FILTERED by stack fit, so it is
 * compared against `plan-skills.js`'s output rather than the whole corpus. See `compareSkills`.
 *
 * Usage:
 *   node check-sync-drift.js                 # report every project in sync-projects.json
 *   node check-sync-drift.js --record <path> # record the current source hash for one project
 *   node check-sync-drift.js --quiet         # exit code only
 *
 * Exit codes: 0 = every delivered copy is current and every required guard is referenced in the
 *               project's npm scripts (execution NOT verified);
 *             1 = drift, a missing mirror/skills copy, or a required guard not referenced;
 *             2 = corpus error (no source tree, unreadable registry).
 *
 * @tier standard+ — a parity guard between a project's mirror and this source of truth; it runs
 *   from the central repo, which a `vibe` slice in a project cannot do.
 *
 * Source: global-configs/scripts/check-sync-drift.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
// The one home for "which skills this project receives". Imported, never re-implemented: a second
// copy of the selection rule would drift from the first exactly on the project whose Stack table was
// just edited — the case this guard exists to catch.
const { planSkills } = require('./lib/plan-skills.js');
const { skillPayload, listFiles, listSkills } = require('./lib/skill-files.js');
// The inventory verifier lives with the writer that produces the inventory, so the guard and the
// sync cannot disagree about what "the block names every delivered skill" means. Importing the
// injector is safe: it runs `main()` only when it IS the entry point.
const { verifyInventory, skillsSectionBody, markedSpan } = require('./inject-skills-block.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
// Overridable so the CLI's exit-code contract can be exercised against a fixture instead of
// the live fleet. The first version of that test asserted the live fleet's state, so it passed
// only while the fleet was broken and failed the moment `sync:all` fixed it (2026-10-11).
const SOURCE = process.env.SYNC_DRIFT_SOURCE || path.join(REPO_ROOT, 'guidelines');
const REGISTRY = process.env.SYNC_DRIFT_REGISTRY || path.join(REPO_ROOT, 'sync-projects.json');
const MIRROR_NAME = '_guidelines';
// Overridable for the same reason as SOURCE: a test must drive the controls check with a fixture,
// never with the live manifest.
const MANIFEST = process.env.SYNC_DRIFT_MANIFEST || path.join(REPO_ROOT, 'guidelines', 'global-configs', 'sync-manifest.json');

/**
 * sha256 over every file's normalised path + LF-normalised content, in sorted order.
 *
 * `glob` restricts the walk to filenames ending in that suffix, and exists because a mirror is not
 * always "the whole directory". `_skills/` receives only the skill files (the manifest's
 * `skills.source` is a glob, not a directory), so hashing the source skills directory unfiltered
 * would count `INDEX.md` — a file the sync deliberately does not copy — and report permanent drift.
 * The filter is derived from the manifest, never typed here.
 */
function hashTree(root, glob = null) {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (!glob || e.name.endsWith(glob)) files.push(p);
    }
  };
  walk(root);
  const h = crypto.createHash('sha256');
  for (const f of files) {
    h.update(path.relative(root, f).replace(/\\/g, '/'));
    h.update('\0');
    h.update(fs.readFileSync(f).toString('utf8').replace(/\r\n/g, '\n'));
    h.update('\0');
  }
  return { hash: h.digest('hex'), count: files.length };
}

function readRegistry() {
  if (!fs.existsSync(REGISTRY)) {
    console.error(`❌ check-sync-drift cannot read ${REGISTRY}`);
    process.exit(2);
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error('not an array');
    return parsed;
  } catch (err) {
    console.error(`❌ sync-projects.json is not a project array: ${err.message}`);
    process.exit(2);
  }
}

function writeRegistry(projects) {
  fs.writeFileSync(REGISTRY, `${JSON.stringify(projects, null, 4)}\n`, 'utf8');
}

/**
 * The skills mirror a project is expected to carry, derived from the manifest that declares it.
 *
 * DERIVED, NEVER A LITERAL. `sync-manifest.json` §skills already names the source
 * (`global-configs/skills/<name>/SKILL.md`), the destination (`_skills`) and the ignore entry. What did
 * not exist until 2026-10-12 was anything that compared them: this guard hashed `_guidelines/` and
 * nothing else, so a `_skills/` directory could be missing, half-written, or a year stale in every
 * project while `npm run sync:drift` reported that all projects run the current rules. The skills
 * were the only delivered artifact with no verification at all — and the only one that instructs the
 * agent how to behave.
 *
 * The source resolves against the SOURCE tree, not the repo root, so pointing this check at a
 * fixture (`SYNC_DRIFT_SOURCE`) points the skills comparison there too. Resolving against the repo
 * root made the hermetic tests read the live skills directory — the exact dependence those tests
 * exist to remove.
 *
 * @returns {{target: string, source: string, glob: string|null, hash: string, count: number}|null}
 *          null when the manifest declares no skills, or the source does not exist. "There is
 *          nothing to compare" is not drift, and failing it would fail a repo that ships no skills.
 */
function skillsMirror(sourceRoot, manifestPath = MANIFEST) {
  if (!fs.existsSync(manifestPath)) return null;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
  const declaredSource = manifest?.skills?.source;
  const target = manifest?.skills?.target;
  if (!declaredSource || !target) return null;

  const rel = String(declaredSource).replace(/\\/g, '/');
  const base = path.basename(rel);
  const star = base.indexOf('*');
  // The suffix a copied file must end with, taken from the manifest's own glob — never typed here.
  // `*.skill.md` → `.skill.md` (the legacy flat layout); `*/SKILL.md` → `SKILL.md` (the Agent Skills
  // standard, where the star is in the DIRECTORY segment so the basename carries none); a bare
  // directory name carries no extension and hashes everything. Without the no-star branch the
  // standard layout would resolve to `null` and every project would report permanent drift, because
  // the source's own `INDEX.md` — which no sync copies — would be counted on one side only.
  const glob = star !== -1 ? base.slice(star + 1) : (base.includes('.') ? base : null);
  // The directory the glob lives in: drop any segment that carries a star, so `skills/*/SKILL.md`
  // resolves to `skills/` rather than to a literal `skills/*` path that exists nowhere. `path.dirname`
  // alone left the star in place, so the whole skills comparison silently returned null for the
  // standard layout — a control that reported "not declared" while the manifest declared it.
  const relDir = path.dirname(rel).split('/').filter((seg) => !seg.includes('*')).join('/');
  const source = path.join(sourceRoot, relDir);
  if (!fs.existsSync(source)) return null;

  const hashed = hashTree(source, glob);
  return { target, source, glob, hash: hashed.hash, count: hashed.count };
}

/**
 * Byte equality after EOL normalisation — the same rule `hashTree` applies, so a CRLF checkout is
 * not mistaken for an edit.
 */
function sameContent(a, b) {
  const read = (p) => fs.readFileSync(p).toString('utf8').replace(/\r\n/g, '\n');
  return read(a) === read(b);
}

/**
 * Compare one project's `_skills/` against what the selector says it must carry.
 *
 * THE CONTRACT IS THE PLAN, NOT AN EQUALITY WITH THE SOURCE. `_skills/` is a FILTERED mirror: the
 * sync writes only the skills that fit this project's stack (a filtered subset of the pool), so hashing
 * the project's directory and comparing it to the source's whole-corpus hash is a contract no project
 * can ever satisfy. Measured 2026-10-13: that equality reported all 7 projects as drifted the moment
 * the filter was applied — while every one of them was in fact correct. A false red on the one
 * control whose whole job is to be believed is worse than no control, because it teaches the operator
 * to ignore it.
 *
 * So the expected set is DERIVED BY CALLING `plan-skills.js` — the one home for "which skills this
 * project receives" — never by re-implementing the rule here. What is verified, file by file:
 *
 *   - MISSING      — a planned skill file the project does not carry (an interrupted sync, a hand delete).
 *   - STALE        — a planned skill file whose bytes differ from the source (edited centrally, not
 *                    re-synced), or one left in the legacy flat layout a conformant loader never reads.
 *   - NOT SELECTED — a file present that the plan does not name (a leftover from a changed stack, or
 *                    a companion renamed/removed in the source).
 *
 * THE PAYLOAD IS THE WHOLE SKILL DIRECTORY, not `SKILL.md`. A skill's `references/`, `scripts/` and
 * `assets/` are instructed to load on demand; before this check covered them, a project could pass
 * with a current entry file and a missing reference the skill told the agent to read.
 *
 * A project carrying exactly the planned files, byte for byte, is in sync — however many of the 20
 * that is. The legacy flat name is caught for free: the plan always expects `<name>/SKILL.md`, so a
 * `<name>.skill.md` on disk is reported NOT SELECTED while its standard counterpart reads MISSING —
 * which is exactly the "this project has not been re-synced since the layout migration" verdict.
 *
 * @returns {{target: string, state: 'sync'|'drift'|'no-mirror', mirrorFiles?: number, expectedFiles?: number, missing?: string[], stale?: string[], extra?: string[]}|null}
 */
function compareSkills(projectPath, skills) {
  if (!skills) return null;
  const dir = path.join(projectPath, skills.target);
  if (!fs.existsSync(dir)) return { target: skills.target, state: 'no-mirror' };

  const plan = planSkills(projectPath, skills.source);
  const expected = new Map();
  for (const row of plan.copy) {
    const srcAbs = path.join(skills.source, row.file);
    for (const item of skillPayload(srcAbs)) {
      expected.set(`${row.name}/${item.rel}`, item.from);
    }
  }
  const present = new Map(listFiles(dir).map((rel) => [rel, path.join(dir, rel)]));

  const missing = [];
  const stale = [];
  for (const [rel, srcAbs] of expected) {
    const destAbs = present.get(rel);
    if (!destAbs) missing.push(rel);
    else if (!sameContent(destAbs, srcAbs)) stale.push(rel);
  }
  const extra = [...present.keys()].filter((rel) => !expected.has(rel));

  return {
    target: skills.target,
    state: missing.length || stale.length || extra.length ? 'drift' : 'sync',
    mirrorFiles: present.size,
    expectedFiles: expected.size,
    missing,
    stale,
    extra,
  };
}

/**
 * Does the project's `## Skills` section NAME every skill it was delivered?
 *
 * THE THIRD QUESTION, and the one that was missing. The guard already asked whether the delivered
 * bytes are current. It did not ask whether the INVENTORY that points the agent at those bytes
 * mentions them — and the two can diverge completely, because the inventory is written into
 * `AGENTS.md`, which is the project's own file, and the sync refuses to overwrite a hand-written
 * `## Skills` section.
 *
 * WHY THAT REFUSAL IS RIGHT AND WHY IT NEEDED A COMPANION. `AGENTS.md` is the project's
 * constitution; a generator that overwrote a project's own rule would be worse than a stale one.
 * But the refusal had no companion check, so the state it created was indistinguishable from
 * "up to date". Measured 2026-10-19 across the seven registered projects: three carry a hand-written
 * section, and two of them named at most five of the twelve-to-seventeen skills they had been
 * delivered — an agent following those sections was told to "load a skill when its trigger matches"
 * while being given almost no triggers, and no control anywhere said so.
 *
 * The verdict therefore has SIX states, and the two that matter are the ones that used to be
 * invisible:
 *   - `managed-complete`    — the generated block, and it names everything.
 *   - `unmanaged-complete`  — a hand-written block that names everything. Allowed: it is the
 *                             project's own constitution, and the sync will not touch it.
 *   - `unmanaged-incomplete`— a hand-written block that omits delivered skills. This is the defect
 *                             this pass exists to name.
 *
 * @returns {{state: string, delivered: number, referenced: number, missing: string[]}}
 */
function skillsBlockVerdict(projectPath, skills) {
  const agentsPath = path.join(projectPath, 'AGENTS.md');
  const dir = path.join(projectPath, skills ? skills.target : '_skills');
  // A project that was delivered NO skills has no inventory to write, so a missing `## Skills`
  // section is not a defect for it — the absence of skills is the mirror check's business, not
  // this one's. Only a project that HAS skills can have an inventory that fails to reach them.
  const delivered = listSkills(dir);
  if (!delivered.length) return { state: 'not-required', delivered: 0, referenced: 0, missing: [] };
  if (!fs.existsSync(agentsPath)) return { state: 'no-agents', delivered: delivered.length, referenced: 0, missing: [] };
  const doc = fs.readFileSync(agentsPath, 'utf8');
  const body = skillsSectionBody(doc);
  if (!body.trim()) return { state: 'missing', delivered: delivered.length, referenced: 0, missing: [] };
  const managed = Boolean(markedSpan(doc.replace(/\r\n/g, '\n')));
  const inventory = verifyInventory(body, dir);
  const complete = inventory.state !== 'incomplete';
  return {
    state: `${managed ? 'managed' : 'unmanaged'}-${complete ? 'complete' : 'incomplete'}`,
    managed,
    delivered: inventory.delivered,
    referenced: inventory.referenced,
    missing: inventory.missing,
  };
}

/**
 * The skill stores a project carries OTHER than the one the sync delivers to.
 *
 * WHY THIS IS REPORTED AND NOT RESOLVED. A native Agent Skills loader scans a known set of
 * directories (`.agents/skills`, `.claude/skills`, `.cursor/skills`, `.qoder/skills`, …). When a
 * project keeps its skills in one of those, the upstream mirror delivered to `_skills/` is a SECOND
 * copy — and the same skill name can exist in both with different content. Measured 2026-10-19:
 * alsael1 carries `firebase-firestore-practices` and `firestore-cost-optimization` in `.agents/skills/`
 * whose bytes differ from the upstream corpus, and PCMS declares `.qoder/skills/` its "canonical
 * skill store" while the sync keeps delivering thirteen skills to `_skills/`, eleven of which exist
 * nowhere else.
 *
 * Which copy an agent opens is decided by path priority, not by policy — so the collision is
 * reported here, by name, instead of being resolved by guessing which store the project meant.
 * Deleting a project's own skills to make one store win would be a destructive act taken on an
 * inference; this pass makes the situation visible and leaves the decision to the owner.
 *
 * A GENERATED ADAPTER is the one exception, not a second copy. Some tools (opencode, for one)
 * scan a fixed native directory and cannot be pointed at `_skills/`. The skills block's own rule
 * allows a generated adapter for exactly that case: build output refreshed by a tracked script,
 * never edited by hand. Such a store declares itself with a `.*-skill-sync.json` marker that names
 * the delivered source and the exact names it generated. When the marker resolves to this project's
 * delivered skills directory and its name list matches what the store holds, the store is reported
 * as an adapter and its content is still compared file by file — it follows upstream rather than
 * shadowing it. A marker that does not match, or content that differs, remains a warning/failure.
 *
 * @returns {Array<{path: string, target: string, skills: number, collisions: string[], divergent: string[], adapter: boolean}>}
 */
const NATIVE_SKILL_STORES = [
  '.agents/skills',
  '.claude/skills',
  '.cursor/skills',
  '.github/skills',
  '.opencode/skill',
  '.opencode/skills',
  '.qoder/skills',
  '.kiro/skills',
];

function generatedAdapter(storeDir, projectPath, skillsTarget) {
  let entries;
  try {
    entries = fs.readdirSync(storeDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const marker = entries.find((e) => e.isFile() && /^\..*-skill-sync\.json$/.test(e.name));
  if (!marker) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(storeDir, marker.name), 'utf8'));
    if (!Array.isArray(manifest.names) || typeof manifest.source !== 'string') return null;
    const declared = path.resolve(manifest.source);
    const delivered = path.resolve(projectPath, skillsTarget);
    // Windows paths are case-insensitive; comparing raw strings would misread the same directory
    // written with different casing as a foreign source.
    return declared.toLowerCase() === delivered.toLowerCase() ? manifest : null;
  } catch {
    return null;
  }
}

function competingStores(projectPath, skillsTarget = '_skills') {
  const out = [];
  const deliveredDir = path.join(projectPath, skillsTarget);
  const delivered = new Map(listSkills(deliveredDir).map((s) => [s.name, s.abs]));
  for (const rel of NATIVE_SKILL_STORES) {
    const dir = path.join(projectPath, rel);
    const found = listSkills(dir);
    if (!found.length) continue;
    const collisions = [];
    const divergent = [];
    for (const skill of found) {
      const upstream = delivered.get(skill.name);
      if (!upstream) continue;
      collisions.push(skill.name);
      if (!sameContent(upstream, skill.abs)) divergent.push(skill.name);
    }
    const manifest = generatedAdapter(dir, projectPath, skillsTarget);
    const names = new Set(found.map((s) => s.name));
    const adapter = Boolean(manifest)
      && manifest.names.length === names.size
      && manifest.names.every((name) => names.has(name));
    out.push({ path: rel, target: skillsTarget, skills: found.length, collisions, divergent, adapter });
  }
  return out;
}

/**
 * Compare each project's mirror against the source. Pure over its inputs, so the test can
 * drive it with fixtures instead of the live fleet.
 *
 * `skills` is optional: a caller that passes nothing gets the guidelines verdict alone, which is
 * what the tests that predate the skills pass assert. When it is passed, each row also carries a
 * `skills` sub-verdict — a project can have a current `_guidelines/` mirror and a stale `_skills/`,
 * and collapsing the two into one flag would hide exactly the case this pass was added for.
 *
 * @returns {Array<{name: string, state: 'sync'|'drift'|'no-mirror', mirrorHash?: string, mirrorFiles?: number, recorded: string, lastSynced?: string, skills?: object|null}>}
 */
function compareProjects(sourceDir, source, projects, skills = null) {
  return projects.map((project) => {
    const name = project.name || project.path;
    const mirror = path.join(project.path, MIRROR_NAME);
    const recorded = project.contentHash ? project.contentHash.slice(0, 12) : 'never recorded';
    const skillsVerdict = compareSkills(project.path, skills);
    const blockVerdict = skillsBlockVerdict(project.path, skills);
    const stores = competingStores(project.path, skills ? skills.target : '_skills');
    if (!fs.existsSync(mirror)) {
      return { name, path: project.path, state: 'no-mirror', recorded, lastSynced: project.lastSynced, skills: skillsVerdict, skillsBlock: blockVerdict, competingStores: stores };
    }
    const theirs = hashTree(mirror);
    return {
      name,
      path: project.path,
      state: theirs.hash === source.hash ? 'sync' : 'drift',
      mirrorHash: theirs.hash,
      mirrorFiles: theirs.count,
      recorded,
      lastSynced: project.lastSynced,
      skills: skillsVerdict,
      skillsBlock: blockVerdict,
      competingStores: stores,
    };
  });
}

/**
 * The guard files a project must expose, read from the manifest that declares them. Null when the
 * manifest is absent or declares none — a repo that has not adopted the tier control is not drift,
 * it is a repo that has not adopted the tier control.
 */
function requiredGuards(manifestPath = MANIFEST) {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const required = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))?.guards?.required;
    return Array.isArray(required) && required.length > 0 ? required : null;
  } catch {
    return null;
  }
}

/**
 * Is every required guard file named by at least one npm script?
 *
 * DISCOVERY, NOT EXECUTION. A hit means some script's command string contains the guard's file
 * name; it does not mean that script has ever run, that it passes, or that it is reachable from a
 * gate. The verdict is therefore `referenced` / `unreferenced`, never "enforced" — execution is
 * proved by a receipt, not by a string match.
 *
 * BY FILE, NOT BY SCRIPT NAME. The doctrine has each project map a step to its own script names,
 * so requiring a name would impose a convention this guard has no business imposing; requiring the
 * FILE is the contract. A project with no `package.json` is not a Node project and cannot expose
 * npm scripts at all — reported, never failed, because the alternative is failing correct work.
 *
 * @returns {{state: 'referenced'|'unreferenced'|'unreadable'|'not-a-node-project', missing: string[]}}
 */
function controlsOf(projectPath, required) {
  const pkg = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkg)) return { state: 'not-a-node-project', missing: [] };
  let scripts;
  try {
    scripts = JSON.parse(fs.readFileSync(pkg, 'utf8')).scripts || {};
  } catch {
    return { state: 'unreadable', missing: required.slice() };
  }
  const commands = Object.values(scripts).join('\n');
  const missing = required.filter((file) => !commands.includes(file));
  return { state: missing.length === 0 ? 'referenced' : 'unreferenced', missing };
}

function main() {
  const argv = process.argv.slice(2);
  const quiet = argv.includes('--quiet');
  const recordIdx = argv.indexOf('--record');
  const recordPath = recordIdx === -1 ? null : argv[recordIdx + 1];
  if (recordIdx !== -1 && !recordPath) {
    console.error('❌ --record requires a project path');
    process.exit(2);
  }

  if (!fs.existsSync(SOURCE)) {
    console.error(`❌ source tree missing: ${SOURCE}`);
    process.exit(2);
  }
  const source = hashTree(SOURCE);
  // Derived from the manifest; null when the manifest declares no skills or the source is absent.
  const skills = skillsMirror(SOURCE);
  const projects = readRegistry();

  if (recordPath) {
    const resolved = path.resolve(recordPath);
    const entry = projects.find((p) => path.resolve(p.path) === resolved);
    if (!entry) {
      console.error(`❌ --record: ${resolved} is not in sync-projects.json`);
      process.exit(2);
    }
    entry.contentHash = source.hash;
    entry.hashFiles = source.count;
    // Recorded separately, and only here. A single hash covering both artifacts could not say WHICH
    // one drifted, and the two have different refresh costs (the mirror is a tree, the skills are 20
    // files) — one number would make the report name a project without naming the fix.
    //
    // NOTE: this is the SOURCE corpus hash, a "what the skills looked like when this project was last
    // synced" marker. It is deliberately NOT compared against the project's `_skills/`, because that
    // mirror is FILTERED by stack fit and so hashes differently in every project by design — the
    // per-project verdict is the plan-based `compareSkills` above, not this number.
    if (skills) {
      entry.skillsHash = skills.hash;
      entry.skillsFiles = skills.count;
    }
    writeRegistry(projects);
    const skillNote = skills ? ` and ${skills.count} skill(s) ${skills.hash.slice(0, 12)}` : '';
    console.log(`✅ recorded source hash ${source.hash.slice(0, 12)} (${source.count} files)${skillNote} for ${entry.name}`);
    process.exit(0);
  }

  const required = requiredGuards();

  if (!quiet) {
    console.log('═══════════════════════════════════════════');
    console.log('  Delivery check — copies vs source of truth');
    console.log(`  source:   ${source.hash.slice(0, 12)} · ${source.count} files`);
    console.log(`  skills:   ${skills ? `${skills.count} source skill(s) → ${skills.target}/ (filtered per project by stack fit)` : 'NOT DERIVED — the manifest declares no skills, or their source directory is absent'}`);
    console.log(`  controls: ${required ? `${required.length} guard file(s) must be referenced in each project's npm scripts (discovery only)` : 'not declared'}`);
    console.log('  execution: NOT VERIFIED — this check reads no gate receipt');
    console.log('═══════════════════════════════════════════\n');
  }

  // A Set, not a counter: a project can fail both the mirror check and the controls check, and it
  // is still ONE project failing the delivery check.
  const drifted = new Set();
  const controlsTally = { referenced: 0, notApplicable: 0 };
  for (const row of compareProjects(SOURCE, source, projects, skills)) {
    if (row.state === 'no-mirror') {
      drifted.add(row.name);
      if (!quiet) console.log(`  ❌ ${row.name}: no ${MIRROR_NAME}/ mirror — the project has no rules at all`);
    } else if (row.state === 'sync') {
      if (!quiet) console.log(`  ✅ ${row.name}: guidelines mirror in sync (${row.mirrorFiles} files)`);
    } else {
      drifted.add(row.name);
      if (!quiet) {
        console.log(`  ❌ ${row.name}: DRIFT — mirror ${row.mirrorHash.slice(0, 12)} (${row.mirrorFiles} files) ≠ source ${source.hash.slice(0, 12)} (${source.count} files)`);
        console.log(`       recorded: ${row.recorded}${row.lastSynced ? ` · lastSynced: ${row.lastSynced}` : ''}`);
        // The mirror is local: sync-guidelines.ps1 writes `_guidelines/` AND adds it to the
        // project's .gitignore, so a refresh needs no commit. Saying "re-commit the project"
        // sent the operator looking for a change that does not exist in git.
        console.log('       → run `npm run sync:all` to refresh the mirror (`_guidelines/` is gitignored — nothing to commit)');
      }
    }

    // The skills copy: the same question, asked of the artifact that INSTRUCTS the agent rather
    // than the one it consults. A current mirror says the project has the current rules; it says
    // nothing about whether the pointer in AGENTS.md resolves.
    if (row.skills) {
      const s = row.skills;
      if (s.state === 'no-mirror') {
        drifted.add(row.name);
        if (!quiet) {
          console.log(`  ❌ ${row.name}: no ${s.target}/ directory — the skills are missing entirely`);
          console.log(`       → run \`npm run sync:all\`; the \`## Skills\` section in AGENTS.md points at nothing`);
        }
      } else if (s.state === 'drift') {
        drifted.add(row.name);
        if (!quiet) {
          // Name what differs, not just the counts: "3 missing" tells the operator to re-sync, but
          // "rtl-shadcn-setup/SKILL.md is not selected" tells them the stack filter changed.
          const reasons = [];
          if (s.missing.length) reasons.push(`${s.missing.length} missing`);
          if (s.stale.length) reasons.push(`${s.stale.length} stale`);
          if (s.extra.length) reasons.push(`${s.extra.length} not selected`);
          console.log(`  ❌ ${row.name}: ${s.target}/ DRIFT — ${s.mirrorFiles} of ${s.expectedFiles} planned skill(s) (${reasons.join(', ')})`);
          for (const file of [...s.missing, ...s.stale, ...s.extra].slice(0, 6)) console.log(`       ${file}`);
          console.log('       → run `npm run sync:all`; the selector decides this set, and the sync writes it');
        }
      } else if (!quiet && row.state === 'sync') {
        console.log(`       ✅ ${s.mirrorFiles} skill file(s) in sync`);
      }
    }

    // THE INVENTORY VERDICT. The bytes above are current; this asks whether the agent is even told
    // they exist. A hand-written `## Skills` section is the project's own constitution and the sync
    // will not overwrite it — but it used to be reported as "up to date" while naming a fraction of
    // the skills the project had been delivered.
    if (row.skillsBlock) {
      const b = row.skillsBlock;
      if (b.state === 'unmanaged-incomplete') {
        drifted.add(row.name);
        if (!quiet) {
          console.log(`  ❌ ${row.name}: the hand-written ## Skills section names ${b.referenced} of ${b.delivered} delivered skill(s) — ${b.missing.length} missing`);
          console.log(`       missing: ${b.missing.slice(0, 8).join(', ')}${b.missing.length > 8 ? ', …' : ''}`);
          console.log('       → add the missing skills to the section, or let the sync manage it (the section is hand-written, so the sync leaves it alone)');
        }
      } else if (b.state === 'missing' || b.state === 'no-agents') {
        drifted.add(row.name);
        if (!quiet) {
          console.log(`  ❌ ${row.name}: no ## Skills section in AGENTS.md — the delivered skills are unreachable`);
          console.log('       → run `npm run sync:all`; the sync writes the inventory the agent needs');
        }
      } else if (!quiet && b.state !== 'not-required') {
        const note = b.managed ? 'generated' : 'hand-written';
        console.log(`       ✅ ## Skills section is ${note} and names ${b.referenced}/${b.delivered} skill(s)`);
      }
    }

    // A SECOND COPY of the same skill is a decision nobody made on purpose. Report the collision by
    // name; do not resolve it by deleting a project's own store.
    if (row.competingStores && row.competingStores.length) {
      for (const store of row.competingStores) {
        if (store.divergent.length) {
          drifted.add(row.name);
          if (!quiet) {
            const detail = `${store.collisions.length} same-named skill(s), ${store.divergent.length} with DIFFERENT content (${store.divergent.slice(0, 4).join(', ')})`;
            console.log(`  ⚠️  ${row.name}: also carries a skill store at ${store.path}/ — ${store.skills} skill(s), ${detail}`);
          }
        } else if (store.adapter) {
          if (!quiet) {
            console.log(`       ✅ generated adapter at ${store.path}/ — ${store.skills} skill(s) match ${store.target}/`);
          }
        } else if (!quiet) {
          const detail = store.collisions.length
            ? `${store.collisions.length} same-named skill(s)`
            : 'no name collisions with the delivered set';
          console.log(`  ⚠️  ${row.name}: also carries a skill store at ${store.path}/ — ${store.skills} skill(s), ${detail}`);
        }
      }
    }

    // A project with no mirror at all has been reported once already; a second complaint about the
    // same absence is how a report stops being read.
    if (row.state === 'no-mirror') continue;

    // Controls travel with the mirror — but a guard file nobody runs is not a control. A mirror
    // that is in sync and a guard that is never invoked is exactly the gap this pass exists for:
    // the file arrives, the tier is declared, and nothing ever reads either. And a guard that IS
    // invoked may still never have run: this pass stops at discovery.
    if (!required) continue;
    const controls = controlsOf(row.path, required);
    if (controls.state === 'unreferenced') {
      drifted.add(row.name);
      if (!quiet) {
        // "mirror is current" is only true when the mirror IS in sync. A project can fail both
        // checks, and the first version of this line asserted the mirror was fine in that case —
        // a report that contradicts the line above it is worse than a shorter one.
        const lead = row.state === 'sync' ? 'mirror is current but' : 'and';
        console.log(`  ❌ ${row.name}: ${lead} ${controls.missing.length} guard(s) are not referenced in package.json — ${controls.missing.join(', ')}`);
        console.log('       → add an npm script that runs each file (`sync-manifest.json` §guards declares the set)');
      }
    } else if (controls.state === 'unreadable') {
      drifted.add(row.name);
      if (!quiet) console.log(`  ❌ ${row.name}: package.json is unreadable — the required guards cannot be verified`);
    } else if (controls.state === 'not-a-node-project') {
      controlsTally.notApplicable++;
      if (!quiet) console.log(`  ℹ️  ${row.name}: no package.json — npm-script controls do not apply`);
    } else {
      controlsTally.referenced++;
      if (!quiet && row.state === 'sync') {
        console.log(`       ✅ all ${required.length} required guard(s) referenced in package.json (execution not verified)`);
      }
    }
  }

  if (drifted.size > 0) {
    if (!quiet) console.log(`\n❌ ${drifted.size} of ${projects.length} project(s) failed the delivery check (mirror, skills, or guard discovery).\n`);
    process.exit(1);
  }
  if (!quiet) {
    console.log(`\n✅ delivered copies are current for all ${projects.length} project(s) (guidelines + skills).`);
    if (!required) {
      console.log('   controls: not declared — nothing to discover.');
    } else {
      const parts = [`${controlsTally.referenced} reference all ${required.length} required guard(s)`];
      if (controlsTally.notApplicable) parts.push(`${controlsTally.notApplicable} not a Node project`);
      console.log(`   controls: ${parts.join('; ')}.`);
      console.log('   execution: NOT VERIFIED — a referenced guard may never have run; see `docs/gate-receipts/`.');
    }
    console.log('   skills: every project carries a `## Skills` inventory that names the skills it was delivered.');
    console.log('');
  }
  process.exit(0);
}

if (require.main === module) main();

module.exports = { hashTree, compareProjects, compareSkills, skillsMirror, requiredGuards, controlsOf, skillsBlockVerdict, competingStores, NATIVE_SKILL_STORES, MIRROR_NAME };
