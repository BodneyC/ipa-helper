---
description: Scaffold the ipa-helper project (roadmap milestone M0) from the docs
---

Scaffold **ipa-helper** according to the project documents. This command covers
roadmap tasks **M0.2–M0.7**. Do M0.1 (toolchain) first if `node -v` doesn't
match `.node-version`. In that case, ask the user to run
`! ./scripts/install-toolchain.sh --no-project`.

Read first: `CLAUDE.md`, `docs/ARCHITECTURE.md` (§2, §3, §10, §11), and ADRs
0002, 0003, 0004, 0005, 0006, 0010.

Steps (commit after each, Conventional Commits, citing the task ID):

1. **M0.2** Create the Vite React-TS app *in the repo root* without overwriting the
   docs. Use the latest stable versions (check with `pnpm view <pkg> version`).
   Set `"name": "ipa-helper"`, `"private": true`, `"type": "module"`,
   `packageManager` (`pnpm@<current>`), `engines.node`, and `.npmrc`
   (`engine-strict=true`). Apply the exact tsconfig flags from ADR-0002 with
   project references. Create the `src/` directory skeleton from ARCHITECTURE §3,
   using placeholder modules where useful. No default exports in `src/` except where tooling requires them.
2. **M0.3** ESLint flat config, Prettier, Stylelint and knip as specified in ADR-0005,
   including the domain-boundary rule and the hex-colour ban. Prove each rule
   fires with a temporary bad fixture, then delete the fixture.
3. **M0.4** Vitest (two environments: node for `src/domain`, jsdom for `src/ui`),
   Testing Library, fast-check, v8 coverage with the thresholds from ADR-0005.
   Playwright (chromium, firefox, webkit) against `vite preview`, plus `@axe-core/playwright`.
   Add one sample test at each level.
4. **M0.5** Add every script from ARCHITECTURE §10, `pnpm check`, `lefthook.yml`,
   and a `size-limit` budget per NFR-3.
5. **M0.6** `.github/workflows/ci.yml` (frozen-lockfile install, `pnpm check`,
   e2e matrix, Playwright report artifact) and `.github/workflows/deploy.yml`
   (Pages). Add `.github/dependabot.yml`.
6. **M0.7** `README.md`, `THIRD_PARTY_NOTICES.md`, and `.editorconfig`. For the
   `LICENSE`, ask the user which licence they want (mention the GPL interaction
   in ADR-0009) before writing it.

Finally, run `/check`, tick M0.2–M0.7 in `docs/ROADMAP.md`, and summarise
which versions were installed and anything that differed from the docs. If
something differed, update the relevant doc or ADR.
