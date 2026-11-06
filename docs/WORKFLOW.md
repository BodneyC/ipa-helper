# ipa-helper — Issue and delivery workflow

How work gets from an idea or a bug report to a merged change. This document is
the source of truth for labels, priorities and the issue lifecycle. The "why" is
in [ADR-0014](adr/0014-github-issues-workflow.md).

## 1. Where work lives

| Kind of work | Lives in | Identified by |
| --- | --- | --- |
| Planned milestone work | `docs/ROADMAP.md` | Task ID, e.g. `M7.2` |
| Bugs, feature requests, unscheduled ideas, chores | GitHub Issues | `#42` |
| Decisions | `docs/adr/` | `ADR-0014` |
| Required behaviour | `docs/SPECIFICATION.md` | `FR-13`, `NFR-3` |

- **The roadmap is the plan; issues are the intake.** Anything not already a
  roadmap task starts as an issue (`/issue`). The roadmap has no list
  of unscheduled ideas; its Backlog section only points here.
- An issue is **promoted** to the roadmap when it is scheduled into a milestone:
  `/roadmap add` gives it a task ID with `refs: #42`, the issue gets the matching
  GitHub milestone, and its title gains the ID: `[M8.1] Accent switch for audio`.
- A roadmap task doesn't need an issue. Create one only when the task needs
  discussion or is handed to someone else.
- Use the repository's GitHub milestones to mirror roadmap milestones, named the
  same way: `M7: Release hardening`.

## 2. Labels

Labels are scoped as `scope: value`. The canonical list, with colours (Gruvbox),
is in [`scripts/github/sync-labels.sh`](../scripts/github/sync-labels.sh). Run it
to create or update them; don't edit labels by hand in the GitHub UI.

Every **triaged open issue** has exactly one `type:`, one `priority:`, one
`status:`, and at least one `area:`. `size:` and the flags are optional.

### `type:` (what kind of work) — exactly one

| Label | Meaning | Commit type |
| --- | --- | --- |
| `type: bug` | Behaviour differs from the spec, or something breaks | `fix:` |
| `type: feature` | New or changed user-visible behaviour (needs a spec change) | `feat:` |
| `type: task` | Engineering work with no visible behaviour change | `refactor:`, `test:`, `perf:` |
| `type: docs` | Documentation only | `docs:` |
| `type: chore` | Tooling, dependencies, CI, housekeeping | `chore:`, `ci:`, `build:` |
| `type: spike` | Time-boxed investigation; the output is an ADR or findings, not `src/` code | `docs:` |
| `type: question` | Needs an answer, not a change | none |

### `priority:` (how soon) — exactly one once triaged

| Label | Meaning | Expectation |
| --- | --- | --- |
| `priority: P0` | **Critical.** The live site is broken or unusable, saved words are lost, output that people copy is silently wrong (e.g. invalid TIPA), an accessibility blocker, or a security issue. | Stop other work. Fix, release and deploy now. |
| `priority: P1` | **High.** A significant bug with a workaround, a regression, or the feature that comes next. | Goes before the next roadmap task. |
| `priority: P2` | **Medium.** The default. Worth doing, and planned. | Worked in roadmap order, or after the roadmap's current milestone. |
| `priority: P3` | **Low.** Nice to have, or someday. | Only when promoted, or when someone asks. |

Rules of thumb:

- Severity is about the user, not about how hard the fix is. A one-line fix to
  wrong TIPA output is still P0.
- Something that breaks a spec requirement (`FR-x`, `NFR-x`) is at least P2.
  Something that breaks an accessibility requirement or loses user data is P0 or P1.
- If you aren't sure, choose the higher priority and say why in the triage
  comment. Downgrading later is cheap.
- Re-check priorities when a milestone closes. P1s that aged without being
  started are either P2s or a sign the plan is wrong.

### `status:` (where it is) — exactly one on open issues

| Label | Meaning | Who moves it on |
| --- | --- | --- |
| `status: triage` | New. Not yet labelled or prioritised. Templates add this. | Triager |
| `status: needs-info` | Waiting for the reporter. Close after 30 days without an answer. | Reporter |
| `status: ready` | Triaged, understood, with clear acceptance criteria. Can be picked up. | Whoever starts it |
| `status: in-progress` | Someone is working on it. The issue has an assignee. | Assignee |
| `status: in-review` | A PR is open and linked (`Closes #N`). | Reviewer |
| `status: blocked` | Can't proceed. The issue says what blocks it (`Blocked by #N`). | Whoever unblocks it |

Closed issues carry no `status:` label. The issue-hygiene workflow removes them
on close and adds `status: triage` back if an issue is reopened.

### `area:` (which part) — one or more

| Label | Covers |
| --- | --- |
| `area: inventory` | Symbol data: RP and full IPA inventories, diacritics (`src/domain/inventory`) |
| `area: serialise` | IPA, TIPA and Piper serialisers, URL codec, paste parser (`src/domain/serialise`, `codec`, `parse`) |
| `area: editor` | Word model, cursor, undo/redo, saved words (`src/domain/word`, `src/state`) |
| `area: palette` | Consonant chart, vowel trapezoid, key grids, filter, inventory switch |
| `area: output` | Word display, IPA/TIPA output rows, copy |
| `area: audio` | Symbol clips, word synthesis, the voice model (`src/adapters/audio`, `scripts/audio`) |
| `area: theme` | Gruvbox tokens, themes, fonts, layout |
| `area: pwa` | Manifest, service worker, offline behaviour |
| `area: ci` | GitHub Actions, deploy, Lighthouse, visual baselines, TeX job |
| `area: deps` | Dependency updates (Dependabot applies this) |
| `area: docs` | Spec, architecture, ADRs, README |

### `size:` (rough effort) — optional

| Label | Meaning |
| --- | --- |
| `size: S` | Under an hour; one file or two |
| `size: M` | One sitting; one commit or PR |
| `size: L` | More than one PR. **Split it** into sub-issues before starting. |

### Flags — any number

| Label | Meaning |
| --- | --- |
| `accessibility` | Affects people using assistive technology, the keyboard, or high contrast. Never lower than P2. |
| `regression` | It used to work. Name the commit or release in the issue if known. Usually P1 or above. |
| `needs: human` | Needs a person: a real device, manual QA, an account, a judgement call. Agents don't pick these up. |
| `needs: decision` | Blocked on the maintainer choosing between options. Often leads to an ADR. |
| `good first issue` | Small, well-described, low risk. |
| `help wanted` | The maintainer would welcome a contribution. |

### `resolution:` (why it was closed without a fix) — on closed issues only

`resolution: duplicate` (comment `Duplicate of #N`), `resolution: wontfix`
(comment why; link the ADR if there is one), `resolution: invalid` (not a bug,
or can't be reproduced). Close these as **not planned**.

## 3. Lifecycle

```text
                    ┌──────────────► needs-info ──(answer)──┐
                    │                    │ 30 days           │
new ──► triage ─────┼──────────────► closed (not planned)    │
                    │                                        ▼
                    └──────────────────────────────────────► ready ──► in-progress ──► in-review ──► closed (merged)
                                                               ▲            │               │
                                                               └── blocked ◄┘◄──────────────┘
```

1. **Open.** Use an issue template (blank issues are disabled). The template
   adds `type:` and `status: triage`.
2. **Triage** (`/triage`). Check for duplicates. Reproduce bugs, ideally from
   the live site with a share URL. Then add `priority:`, `area:` and, if useful,
   `size:` and flags. Make sure there are acceptance criteria. Move to
   `status: ready`, `needs-info` or `blocked`, or close with a `resolution:`.
   Leave a short triage comment explaining the priority.
3. **Start.** Assign yourself. Move to `status: in-progress`. Create a branch
   from an up-to-date `origin/main`, named `<type>/<issue>-<slug>`, e.g.
   `fix/57-firefox-resume-timeout` or `feat/61-xsampa-export` (§6).
4. **Build.** Follow the working loop in `CLAUDE.md`. A `type: feature` issue
   needs a spec change (`/spec`) before code. A design choice needs an ADR
   (`/adr`) before code.
5. **Review.** Open a PR using the template, with `Closes #N` in the body. Move
   the issue to `status: in-review`. Every required check must be green (§6).
6. **Merge.** The maintainer squash-merges it. The PR title becomes the commit. GitHub
   closes the issue and deletes the branch, and the hygiene workflow clears the
   issue's status label.

If work stops partway, move the issue back to `status: ready`, unassign, and
leave a comment saying where it got to and what is left.

## 4. Choosing what to work on next

In this order:

1. `priority: P0` issues. Oldest first.
2. `priority: P1` issues that are `status: ready`. Oldest first.
3. The first unchecked roadmap task whose `deps` are all done.
4. `priority: P2` issues that are `status: ready`, when the current milestone
   has nothing actionable.

Skip anything that is `needs: human`, `needs: decision`, `status: blocked` or
`status: needs-info`, or that is assigned to someone else.

## 5. Writing an issue

A good issue lets someone who wasn't there do the work.

- **Title:** imperative and specific. "Time out `AudioContext.resume()` in
  Firefox", not "audio broken". Prefix it with the roadmap ID once promoted.
- **Bugs:** steps, expected, actual, browser and OS, and the share URL (the URL
  hash reproduces the word, FR-15). Cite the requirement it breaks (`FR-33`).
- **Features:** the problem first, then the proposal. Cite the spec sections it
  touches. Say which new requirement IDs it needs, if any.
- **Acceptance criteria:** a checklist of observable facts, in the same style as
  the roadmap's `AC:` lines. Every criterion should be testable.
- **Links:** `Blocked by #N`, `Relates to #N`, `refs: FR-x, ADR-NNNN`. Use
  task lists (`- [ ] #N`) or GitHub sub-issues to split `size: L` work.

## 6. Branches, pull requests and CI

`main` changes **only** through pull requests (ADR-0015). The `main` ruleset
(`.github/rulesets/main.json`, applied by `scripts/github/protect-main.sh`)
rejects direct pushes, force pushes and merge commits. This applies to
everyone, for every change, including one-line docs fixes.

### Branches

- Always branch from an up-to-date `origin/main`:
  `git fetch origin && git switch -c <branch> origin/main`.
- Name it `<type>/<id>-<slug>`. `<type>` is the Conventional Commit type, and `<id>`
  is the issue number or the roadmap task in lower case. Leave out `<id>` if there is
  neither: `fix/3-resume-timeout`, `feat/m8.1-accent-switch`, `docs/pr-only-workflow`.
- One issue or one roadmap task per branch. Keep branches short-lived, and rebase
  onto `origin/main` rather than merging it in. Push with `--force-with-lease`
  after a rebase.

### Pull requests

- Open one as soon as the branch is pushed. Use a **draft** while work is
  incomplete, and mark it ready when you would merge it.
- **Title:** a Conventional Commit, e.g. `fix(audio): time out AudioContext.resume() (#3)`
  or `feat(output): X-SAMPA export [M8.2] (#7)`. It becomes the squash commit on
  `main` and the changelog entry. The `PR title` check enforces the format.
- **Body:** from the template. Include `Closes #N` (or `Refs #N` for partial work),
  how each acceptance criterion was verified, and the reason for any new dependency.
- Give the PR the issue's `type:` and `area:` labels. Move the issue to `status: in-review`.
- Commits inside the PR can be as granular as you like, because they are squashed. Each
  still needs a Conventional subject (the `commit-msg` hook checks it).

### CI

Every PR runs the full pipeline. These checks are **required** and must pass on a
branch that is up to date with `main`:

| Check | What it runs |
| --- | --- |
| `pnpm check` | Typecheck, lint, format, knip, unit tests with coverage, build, size budget |
| `e2e (chromium)`, `e2e (firefox)`, `e2e (webkit)` | Playwright + axe in each browser |
| `TeX compile (pdflatex + tipa)` | Every symbol and pair compiles (FR-22) |
| `lighthouse budget` | Performance ≥ 95, accessibility = 100 (NFR-3) |
| `PR title` | The title is a Conventional Commit |

`visual (reviewed)` also runs, but only as advice: look at its diffs, and re-baseline
on purpose in the same PR if the change is intended.

- Run `pnpm check` and `pnpm test:e2e --project=chromium` locally before pushing.
  The `pre-push` hook runs `pnpm check`. Never bypass the hooks.
- When a check fails, read the log (`gh run view <id> --log-failed`), reproduce it
  locally, and fix it on the branch. Never re-run a failure until it happens to pass without
  understanding it. If a check is flaky, file a `type: bug`, `area: ci` issue.
- If `main` has moved on, update the branch (`gh pr update-branch --rebase`) and let CI run again.
- If a CI job is renamed, update `.github/rulesets/main.json` in the same PR, and
  re-run `protect-main.sh` after merging. `scripts/ci/ruleset.test.ts` fails if they drift.

### Merging

- Squash-merge only. The maintainer decides when; agents never merge on their own.
  `gh pr merge --squash --auto` merges once the checks pass, and the branch is deleted.
- The squash commit takes the PR title and body. So the body's `Closes #N` closes the
  issue, and its attribution lines are kept.
- After merging: `git switch main && git pull --ff-only`, and delete the local branch.
- Dependabot PRs follow the same rules. They are labelled `type: chore` and
  `area: deps`. Merge them once green, unless they touch a pin explained in an ADR
  (for example ADR-0011).

## 7. Releases

Follow `RELEASING.md`. The changelog is generated from Conventional Commits, so
the commit subject is what users see: write it for them. Before tagging, there
must be no open `priority: P0` issues, and every open `regression` must be
fixed or consciously deferred in the release notes.
