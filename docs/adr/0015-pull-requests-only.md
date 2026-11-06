# 0015. Change `main` only through pull requests with required checks

- Status: Accepted
- Date: 2026-11-06
- Relates to: ADR-0005, ADR-0010, ADR-0014

## Context
Until now commits went straight to `main`, and CI ran only after they landed.
`main` deploys to the live site (ADR-0010), so a commit that breaks a gate was
already public by the time CI caught it. ADR-0014 moved tracking into GitHub
Issues, and it said only that most work *should* go through a PR. Nothing
enforced it, and docs-only changes were exempt. The lefthook `pre-push`
`pnpm check` can be skipped (`--no-verify`, `LEFTHOOK=0`), and it never runs e2e
in three browsers, the TeX compile or Lighthouse.

## Options considered
1. **Direct commits, CI afterwards.** + quickest · − broken commits reach the
   live site, and "all gates green" is a convention, not a guarantee.
2. **PRs by convention only.** + no repository settings to maintain · − easy to
   forget, especially for agents across sessions; nothing stops a direct push.
3. **PRs enforced by a repository ruleset**, with required status checks,
   squash-only merges, and a linted PR title. + every change is tested in CI before it
   reaches `main`, and history stays one Conventional Commit per PR · − a little
   ceremony for one-line docs fixes, and the required-check list must be kept in
   step with the CI job names.

## Decision
We will use option 3:

- `main` is protected by the ruleset in `.github/rulesets/main.json`, applied with
  `scripts/github/protect-main.sh`. It blocks direct pushes, force pushes and
  deletion. It requires a PR, a linear history, and these checks passing on a
  branch that is up to date with `main`: `pnpm check`, `e2e (chromium)`,
  `e2e (firefox)`, `e2e (webkit)`, `TeX compile (pdflatex + tipa)`,
  `lighthouse budget` and `PR title`. `visual (reviewed)` stays advisory
  (ADR-0005).
- Merges are squash-only. The squash commit takes the PR title and body, so the
  PR title must be a Conventional Commit. The `PR title` workflow checks it with the same
  pattern as the lefthook `commit-msg` hook. Head branches are deleted on merge.
- No review approval is required, because the project has one maintainer. An agent never
  merges without the user's go-ahead. Pushing a branch and opening a PR need no
  separate confirmation.
- Releases also go through a PR (`chore(release): vX.Y.Z`). The tag is then made
  on the merge commit.

## Consequences
- Every change, including docs, takes one CI run (about 10–15 minutes) before merge.
- Renaming a CI job silently blocks every PR until the ruleset is updated. A
  rename must change `.github/rulesets/main.json` in the same PR, and the script must then be re-run.
- Emergencies: an admin can disable the ruleset temporarily in the repository settings.
  Any such change is recorded in the PR that follows it.
- Roadmap tasks record their PR number (`(#42)`) rather than a commit hash,
  because the squash hash isn't known until merge.
