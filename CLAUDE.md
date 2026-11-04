# CLAUDE.md — ipa-helper

`ipa-helper` is a static web app for building phonetic transcriptions of made-up
words by clicking IPA symbols. It shows the result as dictionary-style IPA
(`/ˈflɒɡɪʃ/`) and as the TIPA LaTeX string that goes inside `\ipa{…}`. It is
themed in Gruvbox. Later it will speak symbols and words aloud in British English.

## Read these before you do anything

| Document | Purpose |
| --- | --- |
| `docs/SPECIFICATION.md` | **What** the app does. The source of truth for behaviour. |
| `docs/ARCHITECTURE.md` | **How** it is built: layers, modules, data flow, conventions. |
| `docs/adr/` | **Why** it is built that way. One file per decision. |
| `docs/ROADMAP.md` | **When**: ordered milestones with task IDs and acceptance criteria. |

When these documents disagree with the code, the documents win, unless an ADR
supersedes them. If you need to deviate, write or amend an ADR **first**
(`/adr`), then change the code.

## Commands (slash commands in `.claude/commands/`)

| Command | Use |
| --- | --- |
| `/bootstrap` | One-off: scaffold the project (roadmap milestone M0). |
| `/next [task-id]` | Implement the next unchecked roadmap task, or the one named. |
| `/check` | Run every quality gate and fix failures. |
| `/adr <title>` | Write a new Architecture Decision Record. |
| `/roadmap [status\|add\|reorder]` | Report on or edit the roadmap. |
| `/spec <change>` | Propose and apply a change to the specification. |
| `/review` | Review the working tree against the spec, architecture and standards. |

## Toolchain

Install everything with `./scripts/install-toolchain.sh` (fnm → Node from
`.node-version` → pnpm → dependencies → Playwright browsers). **Use `pnpm`
only.** Never use `npm`/`yarn`, and never commit `package-lock.json` or `yarn.lock`.

## Non-negotiable standards

1. **TypeScript strict, and stricter.** Follow the `tsconfig` flags in ADR-0002. Don't use
   `any`, `as` casts (except `as const`), `@ts-ignore`, or non-null `!` assertions.
   Use `@ts-expect-error` only in tests, and always with a reason.
2. **Every gate is green before a task is done:** `pnpm check` (typecheck, lint,
   format check, unit tests with coverage thresholds, build) and `pnpm test:e2e`.
3. **Tests come with the code.** The domain layer (`src/domain`) needs 100% line and
   branch coverage. Use property-based tests (fast-check) for serialisers.
   Every user-visible behaviour in the spec gets an e2e test.
4. **The domain is pure.** `src/domain` must not import React, the DOM or any
   browser API. ESLint enforces this boundary.
5. **Accessibility is part of the definition of done.** Everything must be
   keyboard-operable, have visible focus and correct ARIA roles, and pass axe with
   zero violations in e2e.
6. **Theme only through tokens.** Colours come from Gruvbox CSS custom
   properties (ADR-0006). Hex literals outside `src/styles/tokens.css` fail lint.
7. **Make small, conventional commits** (`feat:`, `fix:`, `test:`, `docs:`,
   `refactor:`, `chore:`), one roadmap task per commit or PR where practical.
   Reference the task ID, e.g. `feat(palette): grouped consonant grid [M2.3]`.
8. **Don't add dependencies casually.** A new runtime dependency needs a line in
   the PR or commit body explaining why. A significant one needs an ADR.

## Working loop

1. Read the roadmap task and the spec sections it cites.
2. Write or extend tests first where practical.
3. Implement in the layer the architecture assigns.
4. Run `/check`.
5. Tick the task in `docs/ROADMAP.md`, and update the spec or architecture if
   reality changed.
6. Commit.
