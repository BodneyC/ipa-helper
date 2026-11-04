# 0005. Quality gates: lint, format, tests, coverage

- Status: Accepted
- Date: 2026-11-04
- Relates to: NFR-1, NFR-2

## Decision

**Lint: ESLint flat config (`eslint.config.ts`)**
- `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` with
  `parserOptions.projectService: true`.
- `eslint-plugin-react`, `eslint-plugin-react-hooks` (recommended, including the
  compiler-aware rules), `eslint-plugin-jsx-a11y` (strict).
- `eslint-plugin-import-x` (or `eslint-plugin-boundaries`) to enforce the
  layer rule in ARCHITECTURE §1: `src/domain/**` may not import from `react`,
  `src/ui`, `src/state`, `src/adapters`, or reference `window`/`document`
  (also `no-restricted-globals` scoped to the domain).
- `eslint-plugin-vitest`, `eslint-plugin-playwright` for test files.
- Extra rules: `@typescript-eslint/switch-exhaustiveness-check`,
  `@typescript-eslint/consistent-type-imports`, `no-restricted-syntax` banning
  `TSEnumDeclaration` and default exports in `src/`, `eqeqeq`.
- Run with `--max-warnings=0`.

**Format: Prettier.** Single config, `prettier --check` in CI, `eslint-config-prettier`
to avoid conflicts.

**CSS lint: Stylelint** (`stylelint-config-standard`, plus `color-no-hex` and
`color-named: never` everywhere except `src/styles/tokens.css`).

**Unit/component tests: Vitest** (jsdom environment for `src/ui`, node for
`src/domain`), with `@testing-library/react`, `@testing-library/user-event`,
`@testing-library/jest-dom`, and `fast-check` for property tests.
Coverage provider is `v8`, with thresholds:
`src/domain/**` 100 % lines/branches/functions/statements, global ≥ 90 %.

**E2E: Playwright** on Chromium, Firefox and WebKit against `vite preview`.
`@axe-core/playwright` scan in every spec, asserting zero violations.

**Hygiene:** `knip` (unused files/exports/deps), `size-limit` (bundle budget),
and `lefthook` git hooks (pre-commit: eslint + prettier + stylelint on staged
files; pre-push: `pnpm check`). Conventional Commits.

**CI: GitHub Actions** runs `pnpm install --frozen-lockfile`, `pnpm check`, then
`pnpm test:e2e` on PRs and `main`. Renovate or Dependabot handles dependency updates.

## Consequences
- The bar is high, and slow gates (e2e on three browsers) run on CI. Locally,
  `pnpm test:e2e --project=chromium` is enough during development.
- Coverage of 100 % on the domain is realistic because it is pure and small. Don't
  game it with `/* v8 ignore */` without a written justification.
