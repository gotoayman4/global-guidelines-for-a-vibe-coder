# Firebase Hosting Cache, Fonts & Audit Report Template

Reference companion for `firestore-cost-optimization`.

---

## Hosting Download & Cache Rules

1. **Whose bandwidth pays?** Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) is served by Google's CDN and is **never billed to Firebase Hosting**. Self-hosting fonts *adds* bytes to Hosting quota (only justified for offline Electron, privacy/CSP, or subsetting control).
2. **The lever is the cache header, not the origin.** Firebase Hosting defaults static assets to `Cache-Control: max-age=3600` (1 hour) — it does **not** infer `immutable` from Vite content hashes.
3. **Verify rules match real output.** Do not count a `**/*.@(woff2|woff|ttf)` rule as an optimization if the build outputs no font files.
4. **Match request paths with a leading catch-all.** Under an SPA rewrite (`**` → `/index.html`), `{"source": "index.html"}` misses `/` and deep routes (`/jobs/123`). Declare `{"source": "**", "headers": [{"key": "Cache-Control", "value": "no-store"}]}` **first**, then override with asset rules after it (Firebase Hosting applies rules in declaration order).
5. **Scope `immutable` strictly to hashed bundler output (`**/assets/*`), never `**/*.@(js|css)`.** Unhashed files in `public/` (e.g. `public/theme-init.js`) would be pinned for a year. Route fonts through `src/assets/` or `@fontsource`.
6. **Measure vendor splits before refactoring.** A monolithic `vendor-firebase` chunk may exist because `firebase/auth` and `firebase/firestore` are both needed at first paint; check brotli surface sizes before claiming chunk splitting cuts critical-path bytes.
7. Paste-ready block set: `global-configs/templates/firebase-hosting-headers.json.template`.

---

## Output Format Template

```markdown
## Firestore Cost Audit — [Scope]

### Quota Baseline  (verify live — Spark reference numbers below are 2026-08)
- Reads/day: [X] / 50,000 — [%]
- Writes/day: [X] / 20,000 — [%]
- Deletes/day: [X] / 20,000 — [%]
- Hosting download/day: [X] MB / 360 MB — [%]

### Data Flows

| # | Flow | Type | Ops/day | Est. Cost | Verdict | Fix |
|---|------|------|---------|-----------|---------|-----|
| 1 | [flow] | listener/one-shot/write/delete | [N] | [$0 / ~$x] | ✅/⚠️/❌ | [action] |

### Recommendations
- [ ] Single unified listener instead of N nested listeners
- [ ] Replace polling with adaptive backoff / pause when hidden
- [ ] Counters via `FieldValue.increment`
- [ ] Batch writes / scheduled batched deletes
- [ ] Long `immutable` cache-control on hashed assets (`**/assets/*`) + `no-store` catch-all shell
```
