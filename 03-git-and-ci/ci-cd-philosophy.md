# CI/CD Philosophy — Automating Quality Gates for AI-Generated Code

**Status:** Normative
**Scope:** Global
**Token Tier:** Full (~1,800 tokens)
**Last Updated:** 2026-05-24
**Cross-References:** `git-workflow-strategy.md`, `testing-philosophy.md`

---

## Purpose

Define the CI/CD strategy optimized for AI-assisted development. CI/CD is not optional in vibe coding — it is the automated quality gate that catches AI-generated errors before they reach production. Every AI-generated change must pass automated checks before merge.

---

## Why CI/CD Is Critical for Vibe Coding

AI generates code at high velocity with inconsistent quality. Without automated gates:
- Vulnerabilities reach production because "the AI is smart"
- Regression bugs accumulate because nobody re-ran the test suite
- Code style diverges because each AI session uses different conventions
- Dependencies are added without audit because "AI suggested it"
- Broken builds reach main because nobody ran the app before merging

**Rule:** Every AI-generated PR must pass automated checks before human review. The CI pipeline is the first reviewer.

---

## The Minimum CI Pipeline

Every project must have these gates, in order:

```
PUSH → LINT → TYPE CHECK → TEST → BUILD → SECURITY SCAN → DEPLOY PREVIEW
```

### Gate 1: Lint and Format
**Purpose:** Catch style violations and obvious errors before they waste reviewer time.

```yaml
lint:
  script:
    - eslint . --max-warnings 0
    - prettier --check .
```

**Why for AI:** AI generates inconsistent formatting and violates linting rules constantly. Linting catches this before human review.

### Gate 2: Type Check
**Purpose:** Catch type errors that AI misses.

```yaml
typecheck:
  script:
    - tsc --noEmit
```

**Why for AI:** AI generates type errors even in TypeScript projects — especially when changing APIs or data models.

### Gate 3: Tests
**Purpose:** Verify behavior hasn't regressed.

```yaml
test:
  script:
    - vitest run --coverage
    - playwright test  # E2E for critical flows
```

**Why for AI:** AI generates silent regressions. The test suite is the only reliable detection mechanism.

### Gate 4: Build
**Purpose:** Verify the application compiles and bundles successfully.

```yaml
build:
  script:
    - vite build
```

**Why for AI:** AI generates import errors, missing files, and configuration issues that only surface at build time.

### Gate 5: Security Scan
**Purpose:** Catch known vulnerabilities and secret leaks.

```yaml
security:
  script:
    - npm audit --audit-level=high
    - snyk test
    - git-secrets --scan  # Detect secrets in code
```

**Why for AI:** AI introduces vulnerable dependencies, hardcodes secrets, and generates injection-vulnerable code.

### Gate 6: Deploy Preview (Optional but Recommended)
**Purpose:** Provide a live preview of changes for manual verification.

```yaml
preview:
  script:
    - deploy to staging/preview environment
```

**Why for AI:** Some AI-generated issues only surface when the app is actually running. Preview environments enable visual verification before merge.

---

## Pipeline Design Principles

### 1. Fail Fast
Order gates from fastest to slowest. Linting (seconds) should run before tests (minutes) should run before E2E (minutes to hours). If linting fails, don't waste time running tests.

### 2. Block Merge on Failure
If any gate fails, the PR cannot be merged. No exceptions. No "I'll fix it later."

### 3. Same Pipeline for AI and Human Code
AI-generated code goes through the exact same pipeline as human-written code. There is no "AI shortcut." Quality standards don't change based on who (or what) wrote the code.

### 4. Pipeline as Documentation
The CI pipeline IS the executable definition of "done." When an AI asks "is this ready?", the answer is: "Did the pipeline pass?"

---

## AI-Specific CI Considerations

### Dependency Verification
AI hallucinates package names. Add an explicit dependency check:
```yaml
verify-deps:
  script:
    - npm ls --depth=0  # Lists all installed deps
    # Verify each new dependency exists on npm
    - for pkg in $(git diff main -- package.json | grep '+.*"'); do npm view $pkg; done
```

### AI-Generated Test Validation
AI-generated tests may be tautological. Add test quality checks:
```yaml
test-quality:
  script:
    - vitest run --coverage
    # Fail if coverage drops below threshold
```
Coverage thresholds prevent AI from generating passing but meaningless tests.

### Bundle Size Monitoring
AI adds dependencies without considering bundle impact:
```yaml
bundle-size:
  script:
    - vite build
    - bundlesize  # Fails if bundle exceeds configured limit
```

---

## Deployment Strategy

### Environment Progression
```
Development → Staging → Production
     ↑            ↑          ↑
  Auto-deploy  PR preview  Manual approval
```

- **Development:** Auto-deploy on every push to main. Fast feedback.
- **Staging:** PR preview environments for review. Mirror of production config.
- **Production:** Manual approval required. Never auto-deploy AI-generated changes to production.

### Rollback Readiness
Every deployment must be reversible. AI-generated changes have a higher probability of production issues.

**Requirements:**
- Database migrations must be reversible (down migration exists and tested)
- Rollback procedure documented and tested
- Monitoring alerts configured before deployment
- Rollback can be executed in <5 minutes

---

## Anti-Patterns

| Anti-Pattern | Consequence | Fix |
|---|---|---|
| **No CI pipeline** | Broken code reaches production undetected | Minimum: lint + test + build pipeline |
| **Skipping CI for "small" AI changes** | "Small" changes break builds | Every PR goes through pipeline, no exceptions |
| **Auto-merge without pipeline** | Broken code on main | Require pipeline pass before merge |
| **No security scanning** | Vulnerable dependencies in production | npm audit + Snyk on every PR |
| **Auto-deploy AI code to production** | Untested changes affect users | Manual approval gate before production |
| **Ignoring pipeline failures** | Broken window theory: one failure tolerated → many failures tolerated | Fix or revert immediately |
| **No bundle size monitoring** | Bundle grows 2x from AI-added dependencies | Bundle size budget in CI |

---

## Key Takeaways

1. CI/CD is the automated quality gate. Every AI-generated change passes through it.
2. Minimum pipeline: Lint → Type Check → Test → Build → Security Scan.
3. Same pipeline for AI and human code. No shortcuts.
4. Fail fast. Block merge on failure. No exceptions.
5. Never auto-deploy AI-generated code to production. Manual approval required.
6. Dependency verification catches AI-hallucinated packages.

---

## Cross-References

- **Depends on:** `git-workflow-strategy.md` — branch strategy that CI enforces
- **Depends on:** `testing-philosophy.md` — tests as the core CI gate
- **Applied by:** `environment-management.md` — environment-specific CI configuration
