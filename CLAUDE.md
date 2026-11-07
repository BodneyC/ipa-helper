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
| `docs/WORKFLOW.md` | **Who/what next**: GitHub issues, labels, priorities, branches and PRs. |

When these documents disagree with the code, the documents win, unless an ADR
supersedes them. If you need to deviate, write or amend an ADR **first**
(`/adr`), then change the code.

## Commands (slash commands in `.claude/commands/`)

| Command | Use |
| --- | --- |
| `/bootstrap` | One-off: scaffold the project (roadmap milestone M0). |
| `/next [task-id\|#issue]` | Implement the next item (P0/P1 issues, then the roadmap), or the one named. |
| `/issue <description>` | Check for duplicates, draft, label and file a GitHub issue. |
| `/triage [#n…\|all]` | Label, prioritise and write acceptance criteria for open issues. |
| `/check` | Run every quality gate and fix failures. |
| `/adr <title>` | Write a new Architecture Decision Record. |
| `/roadmap [status\|add\|reorder]` | Report on or edit the roadmap (status includes open issues). |
| `/spec <change>` | Propose and apply a change to the specification. |
| `/review [#pr\|range]` | Review a branch or PR against the spec, architecture and standards. |
| `/pr [#issue] [--draft]` | Branch, commit, push, open or update the PR, and get CI green. |

## Toolchain

Install everything with `./scripts/install-toolchain.sh` (fnm → Node from
`.node-version` → pnpm → dependencies → Playwright browsers → voice model). **Use `pnpm`
only.** Never use `npm`/`yarn`, and never commit `package-lock.json` or `yarn.lock`.

## Non-negotiable standards

1. **TypeScript strict, and stricter.** Follow the `tsconfig` flags in ADR-0002. Don't use
   `any`, `as` casts (except `as const`), `@ts-ignore`, or non-null `!` assertions.
   Use `@ts-expect-error` only in tests, and always with a reason.
2. **Every gate is green before a task is done:** `pnpm check` (typecheck, lint,
   format check, unit tests with coverage thresholds, build) and `pnpm test:e2e`
   locally, and then every required CI check on the PR.
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
   `refactor:`, `chore:`), one roadmap task or issue per PR.
   Reference the task ID and/or issue, e.g. `feat(palette): grouped consonant grid [M2.3]`
   or `fix(audio): time out resume() (#57)`. The PR title follows the same rules,
   because it becomes the squash commit.
8. **Don't add dependencies casually.** A new runtime dependency needs a line in
   the PR or commit body explaining why. A significant one needs an ADR.
9. **Never commit or push to `main`.** Every change, docs included, goes on a
   branch from `origin/main` and through a PR whose required CI checks pass
   (ADR-0015). `main` is protected: squash merges only, branch up to date. Never bypass
   the git hooks (`--no-verify`, `LEFTHOOK=0`). Never merge without the user's go-ahead.

## Issues, labels and priorities

Full rules are in `docs/WORKFLOW.md`. The essentials:

- **The roadmap is the plan; GitHub Issues are the intake.** Bugs, requests and
  unscheduled ideas are issues (`/issue`). The roadmap has no backlog list; don't start one.
  Follow-ups you discover mid-task are filed as issues, not fixed silently in the same change.
- **Labels are scoped.** A triaged open issue has exactly one `type:`, one
  `priority:`, one `status:`, and at least one `area:`. Labels are defined in
  `scripts/github/sync-labels.sh`. Never invent labels ad hoc.
- **Priority is user impact:** `P0` critical (site broken, data loss, wrong copied
  output, a11y blocker; drop everything), `P1` high (before the next roadmap task),
  `P2` planned, `P3` someday.
- **Status flow:** `triage → ready → in-progress → in-review → closed`, with
  `needs-info` and `blocked` as side states. Update the label when you start work,
  open a PR, or stop.
- **What next:** P0 issues → ready P1 issues → next roadmap task → ready P2 issues.
  Skip `needs: human`, `needs: decision`, blocked, and other people's issues.
- **Branches and PRs:** `<type>/<issue-or-task>-<slug>`; the PR body says `Closes #N`; the
  title is a Conventional Commit with `[Mx.y]` and/or `(#N)`. See `/pr`.
- **What needs confirmation:** pushing your own branch, opening or updating a PR, and
  moving `status:` labels as work progresses are routine, so just do them. Creating,
  closing or re-prioritising issues, and **merging**, need the user's go-ahead.

## Working loop

1. Read the roadmap task or issue, and the spec sections it cites.
2. Create a branch from an up-to-date `origin/main` (and claim the issue).
3. Write or extend tests first where practical.
4. Implement in the layer the architecture assigns.
5. Run `/check`.
6. Tick the task in `docs/ROADMAP.md` with the PR number, and update the spec or
   architecture if reality changed.
7. Commit, push, open the PR, and get every required check green (`/pr`). Then
   stop and report. The user decides when to merge.
