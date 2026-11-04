# 0002. TypeScript with maximal strictness

- Status: Accepted
- Date: 2026-11-04
- Relates to: NFR-1

## Context
The project must be "fully typed" and of the highest quality. Raw JavaScript is
ruled out. Phonetic data has many near-identical variants (e.g. `ɡ` U+0261 vs
`g` U+0067), and types plus invariant tests catch mix-ups early.

## Options considered
1. **TypeScript, strict**: the industry standard, with excellent tooling and React support.
2. **ReScript / Elm / PureScript**: stronger guarantees, but a smaller ecosystem
   and a steeper path for contributors and the agent.
3. **Rust → WASM (Leptos/Yew)**: excellent types, but heavy for a small static UI.

## Decision
TypeScript (latest stable 5.x/6.x at bootstrap time), with these `compilerOptions`
on top of `"strict": true`:

```jsonc
{
  "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler",
  "lib": ["ES2023", "DOM", "DOM.Iterable", "WebWorker"],
  "jsx": "react-jsx",
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noPropertyAccessFromIndexSignature": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "useUnknownInCatchVariables": true,
  "verbatimModuleSyntax": true,
  "isolatedModules": true,
  "forceConsistentCasingInFileNames": true,
  "skipLibCheck": true
}
```

Use project references: `tsconfig.app.json` (src), `tsconfig.node.json`
(config files) and `tsconfig.test.json` (tests, adding vitest/playwright types).

Banned (enforced by lint): `any` (explicit or implicit), non-`const` type
assertions, non-null assertions, `@ts-ignore`/`@ts-nocheck`, and `enum`. Use
branded types for identifiers (`SymbolId`).

## Consequences
- Some verbosity around indexed access (`arr[i]` is `T | undefined`), which is
  intended: it forces correct handling at cursor and array boundaries.
- Runtime validation is still needed at I/O boundaries (storage, URL, clipboard
  paste). Use hand-written type guards, or add a small schema library through an ADR if they become unwieldy.
