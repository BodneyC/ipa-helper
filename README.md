# ipa-helper

Build phonetic (IPA) transcriptions of made-up words by clicking symbols, and get
the matching TIPA LaTeX string for `\ipa{…}`. Gruvbox-themed. British English
audio is planned.

> **Status:** pre-scaffold. The repo currently holds the design documents that
> drive development with Claude Code.

## Getting started

```sh
./scripts/install-toolchain.sh   # fnm → Node (.node-version) → pnpm → deps → browsers
exec $SHELL                      # pick up fnm in your shell
claude                           # then run /bootstrap
```

Run `./scripts/install-toolchain.sh --help` to see the options (`--with-tex`, `--no-browsers`, …).

## Documents

- [Specification](docs/SPECIFICATION.md): what it does
- [Architecture](docs/ARCHITECTURE.md): how it's built
- [ADRs](docs/adr/README.md): why
- [Roadmap](docs/ROADMAP.md): what's next

## Claude Code commands

`/bootstrap` · `/next [task]` · `/check` · `/adr <title>` · `/roadmap [status|add|reorder]` ·
`/spec <change>` · `/review`. See [CLAUDE.md](CLAUDE.md).
