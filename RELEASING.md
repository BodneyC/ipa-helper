# Releasing

Releases follow [Semantic Versioning](https://semver.org/). The changelog is
built from Conventional Commits (CLAUDE.md §7).

1. Make sure every gate is green on `main`: `pnpm check`, `pnpm test:e2e`, and the
   CI run for the commit you're releasing.
2. Run the manual QA checklist (`docs/qa/CHECKLIST.md`) on iOS Safari and on
   desktop Firefox against the deployed site, and record the run there.
3. Preview the notes: `pnpm changelog <version> --dry-run`.
4. Write them, and bump the version:
   ```sh
   pnpm changelog <version>
   pnpm version <version> --no-git-tag-version
   ```
   Do steps 3–4 on a branch made from an up-to-date `main`:
   `git switch -c chore/release-v<version> origin/main`.
5. Commit as `chore(release): v<version>`, and open a PR with that title (`/pr`).
   Merge it once every required check is green (ADR-0015: `main` only changes through PRs).
6. Tag the merge commit on `main`, and push the tag (tags aren't protected):
   ```sh
   git switch main && git pull --ff-only
   git tag -a v<version> -m "v<version>"
   git push origin v<version>
   ```
   The Pages deploy runs from `main` as usual.
