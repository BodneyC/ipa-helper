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
5. Commit as `chore(release): v<version>`, then make an annotated tag:
   `git tag -a v<version> -m "v<version>"`.
6. Push the commit and the tag: `git push && git push origin v<version>`. The
   Pages deploy runs from `main` as usual.
