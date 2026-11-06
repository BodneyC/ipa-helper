---
description: Ship the current work through a branch and PR, and get CI green
argument-hint: "[#issue] [--draft]"
---

Get the current change onto a pull request with green CI (ADR-0015, `docs/WORKFLOW.md` §6).
Arguments: `$ARGUMENTS`: an optional issue (`#N`) and `--draft`.

**Never commit to `main`.** The ruleset rejects direct pushes anyway.

1. **Branch.** If you're on `main`, run `git fetch origin` and create a branch from
   `origin/main` named `<type>/<id>-<slug>`, where `<id>` is the issue number or
   roadmap task (`fix/3-resume-timeout`, `feat/m8.1-accent-switch`, `docs/adr-0016-…`).
   Uncommitted changes move with you. If you're on a branch that is behind
   `origin/main`, rebase it (`git rebase origin/main`).
2. **Gate locally.** `pnpm check` and `pnpm test:e2e --project=chromium` (or
   `/check`). Don't push something you know is red. The lefthook `pre-push` hook
   runs `pnpm check` again. Never bypass it with `--no-verify` or `LEFTHOOK=0`.
3. **Commit.** Use Conventional Commits with the task ID and/or issue in the subject. Use one
   logical change per commit; fix-ups can be separate commits, because the PR is
   squashed.
4. **Push.** `git push -u origin HEAD`. After a rebase use `--force-with-lease`,
   never `--force`. Pushing your own feature branch needs no confirmation.
5. **Open or update the PR.** If `gh pr view` finds none, write the body from
   `.github/pull_request_template.md` to a scratchpad file and run
   `gh pr create --base main --title "<conventional subject>" --body-file <file> [--draft]`.
   - The **title** becomes the squash commit on `main` and the changelog entry. Write
     it for users, e.g. `fix(audio): time out AudioContext.resume() (#3)`.
   - The **body** says `Closes #N` (or `Refs #N`), lists how each acceptance criterion was
     verified, fills in the checklist, and gives the reason for any new dependency.
   - Add the issue's `type:` and `area:` labels to the PR. Move the issue to `status: in-review`.
6. **Watch CI.** `gh pr checks --watch`. For each failing check: read
   `gh run view <run-id> --log-failed`, reproduce it locally, fix the root cause on the
   same branch, push, and watch again. The `/check` rules apply: never skip,
   weaken or disable a gate. `visual (reviewed)` is advisory. If it fails, download the
   `visual-diffs` artifact, look at it, and report what changed rather than
   re-baselining blindly.
7. **Stay current.** If the PR is behind `main` (the ruleset requires an up-to-date
   branch), `gh pr update-branch --rebase`, then watch again.
8. **Report** the PR URL and a table of the checks. **Don't merge** unless the user
   says to. When they do: `gh pr merge --squash --auto`, which merges once the
   checks pass and deletes the branch. Afterwards: `git switch main && git pull --ff-only`,
   and delete the local branch.
