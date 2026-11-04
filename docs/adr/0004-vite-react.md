# 0004. Vite + React for the UI

- Status: Accepted
- Date: 2026-11-04
- Relates to: NFR-3, NFR-5

## Context
We need a fast dev loop, a fully static production build, first-class TypeScript,
and a mature component-testing story. The UI is moderately interactive (roving
focus, popovers, undo/redo, live regions) but small.

## Options considered
1. **Vite + React 19**: the largest ecosystem, best-in-class Testing Library
   support, and the agent knows it best. Its bundle size (~45 kB gz) fits within NFR-3.
2. **Vite + Preact**: smaller, with a mostly React-compatible API, but compat edge cases in tooling.
3. **Vite + SolidJS / Svelte 5**: smaller and faster, with a smaller testing/a11y ecosystem.
4. **Vanilla TS + Web Components (Lit)**: minimal runtime, but more hand-rolled
   state and a11y plumbing.
5. **Next.js / Astro**: SSR/SSG features we don't need. Next adds server
   assumptions.

## Decision
Vite (latest stable) + React 19 with function components and hooks only.
`@vitejs/plugin-react`. No SSR. No CSS-in-JS runtime (see ADR-0006).

## Consequences
- Bundle budget must be watched: CI enforces a size check (`size-limit` or a
  simple gzip-size script) against NFR-3.
- If the budget becomes a problem, Preact via `@preact/preset-vite` aliasing is a
  low-cost escape hatch (that would need a new ADR).
