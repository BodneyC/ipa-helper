# 0003. Toolchain: fnm, Node LTS, pnpm

- Status: Accepted
- Date: 2026-11-04

## Context
The maintainer's machine (Ubuntu 24.04 on WSL2) has an outdated distro Node
(v18, end-of-life). We need a reproducible, per-project toolchain that installs
from one script without root, except for optional browser system libraries.

## Options considered
1. **fnm + pnpm**: fnm is a fast, single-binary Node version manager that reads
   `.node-version`. pnpm is strict (no phantom dependencies) and fast, with a
   content-addressed store.
2. **mise/asdf**: polyglot, but more moving parts than a JS-only repo needs.
3. **nvm**: slow shell-function-based; poor non-interactive scripting.
4. **Volta**: good, but its pnpm support has historically been experimental.
5. **Bun / Deno**: attractive, but Vite/Playwright/ESLint parity under Node is the
   safest bet for the "highest quality" toolchain.

## Decision
- `.node-version` pins the Node major (an LTS line). fnm installs and selects it.
- pnpm is the only package manager. Its version is pinned with the `packageManager`
  field in `package.json` (set at bootstrap), and activated with Corepack where
  Node bundles it, falling back to `npm i -g pnpm@<ver>`.
- `scripts/install-toolchain.sh` is the single entry point. It is idempotent and
  safe to re-run, and it configures the user's shell (`zsh`/`bash`) for fnm's
  `--use-on-cd`.
- `package.json` declares `"engines": { "node": ">=<major>" }` and
  `.npmrc` sets `engine-strict=true`.

## Consequences
- Contributors run one script. CI uses `actions/setup-node` with
  `node-version-file: .node-version` and `pnpm/action-setup`.
- Bumping Node means editing `.node-version` (plus CI picks it up).
