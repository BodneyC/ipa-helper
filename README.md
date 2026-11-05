# ipa-helper

Build phonetic (IPA) transcriptions of made-up words by clicking symbols, and get
the matching TIPA LaTeX string for `\ipa{…}`. For example, clicking θ, ɔː, n, ɪ, k
with primary stress gives `/ˈθɔːnɪk/` and `"TO:nIk`. Gruvbox-themed, keyboard-friendly,
and fully static: nothing leaves your browser. British English audio is planned.

> **Status:** scaffolded (roadmap milestone M0). The domain core (M1) and the UI (M2)
> are next. See the [roadmap](docs/ROADMAP.md).

## Using it

Once deployed, the app runs on GitHub Pages; no install or sign-up is needed. Using the
TIPA output in LaTeX:

```latex
\usepackage{tipa}
\newcommand{\ipa}[1]{\textipa{/#1/}}  % the macro adds the slashes
% …
The word \ipa{"TO:nIk} is stressed on the first syllable.  % → /ˈθɔːnɪk/
```

## Development

### Prerequisites

Linux (including WSL2) or macOS, with `curl`, `unzip` and `git`. Everything else is
installed user-locally by one script:

```sh
./scripts/install-toolchain.sh   # fnm → Node (.node-version) → pnpm → deps → Playwright browsers
exec $SHELL                      # pick up fnm in your shell
```

Run `./scripts/install-toolchain.sh --help` for the options (`--with-tex`, `--no-browsers`,
`--no-system-deps`, …). Use **pnpm only**; npm and yarn lockfiles are rejected.

### Everyday commands

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server with hot reload |
| `pnpm build` / `pnpm preview` | Production build into `dist/`, then serve it |
| `pnpm check` | **All gates:** typecheck → lint → format:check → knip → test:coverage → build → size |
| `pnpm test` / `pnpm test:watch` | Unit and component tests (Vitest) |
| `pnpm test:coverage` | Tests with coverage thresholds (domain 100 %, overall ≥ 90 %) |
| `pnpm test:e2e` | Playwright e2e and axe accessibility scans (`--project=chromium` for speed) |
| `pnpm lint` / `pnpm lint:fix` | ESLint and Stylelint, zero warnings |
| `pnpm format` | Prettier |
| `pnpm knip` | Unused files, exports and dependencies |
| `pnpm size` | Initial JS bundle budget (≤ 100 kB gzipped) |
| `pnpm tex:check` | Compiles every symbol's TIPA with pdflatex + tipa (install with `--with-tex`) |

Git hooks (lefthook) are installed by `pnpm install`. They lint staged files on commit,
enforce [Conventional Commits](https://www.conventionalcommits.org/), and run
`pnpm check` before push.

On Linux, WebKit e2e tests need extra system libraries. Install them once with
`pnpm exec playwright install-deps webkit` (uses sudo).

### Project layout

```text
src/domain    pure TypeScript: IPA inventory, word model, IPA/TIPA serialisers
src/state     reducers (editor, settings)
src/adapters  browser side effects: clipboard, storage, URL hash, audio
src/ui        React components
src/app       layout and providers; src/main.tsx is the composition root
src/styles    Gruvbox design tokens and themes
tests/e2e     Playwright specs
```

The layer rules (`ui → state → domain`, `adapters → domain`) are enforced by lint. See
[ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documents

- [Specification](docs/SPECIFICATION.md): what it does
- [Architecture](docs/ARCHITECTURE.md): how it's built
- [ADRs](docs/adr/README.md): why
- [Roadmap](docs/ROADMAP.md): what's next

### Working with Claude Code

`/next [task]` · `/check` · `/adr <title>` · `/roadmap [status|add|reorder]` ·
`/spec <change>` · `/review`. See [CLAUDE.md](CLAUDE.md).

## Licence

ipa-helper is free software: you can redistribute it and/or modify it under the terms
of the [GNU General Public License](LICENSE), version 3 or (at your option) any later
version. Third-party components and their licences are listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
