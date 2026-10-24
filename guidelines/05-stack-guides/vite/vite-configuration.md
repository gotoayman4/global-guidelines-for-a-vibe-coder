---
status: "Normative"
scope: "Stack (Vite)"
tags: [vite, build, bundler]
---

# Vite Configuration Guide

**Tags:** `#vite` `#build` `#bundler` `#hmr` `#typescript`
---

## Directives

1. **Scaffold:** `npm create vite@latest my-app -- --template react-ts`.
2. **Path alias `@/` → `./src/`** configured in BOTH `vite.config.ts` (`resolve.alias`) and `tsconfig.json` (`paths`) — clean imports, no `../../` chains. Missing the tsconfig half breaks TS resolution.
3. **Production sourcemaps ON** — essential for debugging production errors.
4. **Manual chunks for caching:** split vendor / MUI / Emotion into separate chunks:
   ```typescript
   build: {
     sourcemap: true,
     rollupOptions: { output: { manualChunks: {
       mui: ['@mui/material', '@mui/icons-material'],
       emotion: ['@emotion/react', '@emotion/styled'],
       vendor: ['react', 'react-dom'],
     } } },
   }
   ```
5. **Env vars:** `VITE_` prefix = bundled into client code — public values only, NEVER secrets. Access via `import.meta.env.VITE_*`, not `process.env`. `.env.local` gitignored; `.env` committed only with safe defaults.
6. **Tree shaking:** named/modular imports — `import Button from '@mui/material/Button'`, never root barrel imports of MUI.
7. **Bundle audit:** run `npx vite-bundle-visualizer` periodically.
8. **RTL needs no Vite config** — handled in app code: inline `<html dir>` script in index.html + Emotion stylis-plugin-rtl cache + theme.direction.
9. **Test-transform cache (measured only):** if Vitest profiling shows repeated module transformation is a material local-feedback cost, consider `fsModuleCache` when supported by the installed Vitest version. Compare cold and warm runs, verify source/config changes invalidate cached transforms, and keep the cache disposable. Caching MUST NOT narrow test selection or ship-boundary verification.

## Anti-Patterns

| Pitfall | Fix |
|---|---|
| Secret with `VITE_` prefix | Backend-only env var |
| Root MUI imports | Modular imports |
| No manual chunks | Split vendor/MUI/emotion |
| Alias missing from tsconfig | Mirror alias in both files |

## Cross-References

`../mui/mui-rtl-bidirectional.md` · `../react/react-performance.md`
