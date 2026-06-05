# Vite Configuration Guide

**Status:** Normative  
**Scope:** Stack (Vite)  
**Token Tier:** Low (~1,200 tokens)  
**Tags:** `#vite` `#build` `#bundler` `#hmr` `#typescript`

---

## Purpose

This guide defines the Vite configuration standards for React + TypeScript frontend applications. It covers project setup, build optimization, environment variables, path aliases, and RTL integration.

---

## Why Vite

- Ultra-fast dev HMR (Hot Module Replacement)
- Fast production builds via Rollup
- First-class TypeScript support
- Simple configuration surface
- Native ESM dev server — no bundling during development

---

## Project Setup

### Quick Scaffold

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
```

### Recommended Dependencies

```
react, react-dom
typescript
@mui/material, @mui/icons-material
@emotion/react, @emotion/styled
@mui/stylis-plugin-rtl
i18next, react-i18next
```

---

## Configuration Standards

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          mui: ['@mui/material', '@mui/icons-material'],
          emotion: ['@emotion/react', '@emotion/styled'],
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

### Key Configuration Decisions

| Option | Recommendation | Rationale |
|---|---|---|
| `@` path alias | `@/` → `./src/` | Clean imports, no `../../` chains |
| Sourcemaps in build | `true` | Essential for debugging production errors |
| Manual chunks | Split MUI, Emotion, React | Smaller parallel downloads, better caching |
| Dev server port | Standardize per project | Consistent local development |

---

## Path Aliases

### vite.config.ts

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### tsconfig.json (matching)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Usage

```typescript
// ✅ Clean and refactorable
import { PageHeader } from '@/components/PageHeader';
import { useSnackbar } from '@/hooks/useSnackbar';

// ❌ Avoid
import { PageHeader } from '../../../components/PageHeader';
```

---

## Environment Variables

### Naming Convention

- Use `VITE_` prefix for client-exposed variables: `VITE_API_URL`, `VITE_SUPABASE_URL`
- Never prefix sensitive keys with `VITE_` — they get bundled into client code.
- Access via `import.meta.env.VITE_API_URL` — not `process.env`.

### `.env` Files

```
.env                 # Default, committed with safe defaults
.env.local           # Local overrides, gitignored
.env.development     # Dev-specific
.env.production      # Prod-specific
```

---

## RTL & Emotion Integration

For RTL support, Vite needs no special configuration. The RTL setup is handled in application code:

1. `index.html` — inline script sets `<html dir>` before first paint
2. Emotion cache — uses `stylis-plugin-rtl` for RTL CSS mirroring
3. Theme provider — sets `theme.direction` dynamically

Vite's fast HMR works correctly with Emotion's runtime CSS injection.

---

## Build Optimization

### Chunk Splitting

Split large dependencies into separate chunks for better caching:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        mui: ['@mui/material', '@mui/icons-material'],
        emotion: ['@emotion/react', '@emotion/styled'],
        vendor: ['react', 'react-dom'],
      },
    },
  },
},
```

### Tree Shaking

- Use ES module imports — named imports enable tree shaking.
- Avoid barrel imports from MUI: `import Button from '@mui/material/Button'` instead of importing the whole library.

### Bundle Analysis

Periodically analyze bundle size:

```bash
npx vite-bundle-visualizer
```

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| Sensitive keys with `VITE_` prefix | Use backend-only env vars, never expose secrets |
| Importing all of MUI | Use modular imports: `@mui/material/Button` |
| No manual chunks | Large vendor bundle, poor caching |
| Missing `@` path alias in tsconfig | TypeScript can't resolve `@/` imports |
| HMR not working with certain files | Check that files are inside the `src` directory |

---

## Key Takeaways

1. **`@/` path alias** — clean imports, no relative path chains.
2. **`VITE_` prefix only for public env vars** — never expose secrets.
3. **Modular MUI imports** — reduce bundle size significantly.
4. **Manual chunks for caching** — split vendor, MUI, and Emotion bundles.
5. **Sourcemaps in production** — essential for debugging.
6. **No special Vite config for RTL** — RTL is handled in app code.

---

## Cross-References

- [MUI RTL & Bidirectional](../mui/mui-rtl-bidirectional.md) — RTL setup in app code
- [MUI Styling Guide](../mui/mui-styling.md) — Emotion and styling patterns
- [React Architecture](../react/react-architecture.md) — component organization
- [React Performance](../react/react-performance.md) — bundle optimization
