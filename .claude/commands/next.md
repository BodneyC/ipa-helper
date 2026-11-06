---
description: Implement the next roadmap task or issue (or the one given) end to end
argument-hint: "[task-id e.g. M1.5 | #issue]"
---

Implement a roadmap task or GitHub issue for ipa-helper.

Task: `$ARGUMENTS`. A roadmap ID (`M1.5`) or an issue (`#57`). If this is empty, pick
using the order in `docs/WORKFLOW.md` §4:

1. open `priority: P0` issues, then
2. `priority: P1` issues that are `status: ready`, then
3. the first unchecked task in `docs/ROADMAP.md` whose `deps` are all checked, then
4. `priority: P2` issues that are `status: ready`.

Use `gh issue list --state open --label "priority: P0"` (and so on), and skip
anything labelled `needs: human`, `needs: decision`, `status: blocked` or
`status: needs-info`, or assigned to someone else. If `gh` isn't available or
authenticated, say so and fall back to the roadmap. State which item you picked
and why before you start.

Procedure:

1. Read `CLAUDE.md`, the task's entry in `docs/ROADMAP.md` (or the issue and its
   comments, `gh issue view N --comments`), every spec section and ADR in its `refs`,
   and the relevant parts of `docs/ARCHITECTURE.md`. Read the existing code you'll touch.
   For an issue, the acceptance criteria are its `- [ ]` checklist. If it has none, or it
   is still `status: triage`, triage it first (`/triage #N`).
   - **Claim it**: `gh issue edit N --add-assignee @me --add-label "status: in-progress" --remove-label "status: ready"`,
     and create a branch named `<type>/<N>-<slug>` (WORKFLOW §3).
2. If the task is ambiguous or conflicts with the docs, stop and ask, or write an ADR
   with `/adr` when it is a design decision. Don't guess silently.
3. Plan briefly: the files to add or change, the tests to write, and how each AC will be shown to hold.
4. Write tests first where practical. Name tests with requirement IDs
   (`FR-13: …`). Domain code needs 100% coverage, and serialisers/codecs need fast-check properties.
   User-visible behaviour needs a Playwright test with an axe scan.
5. Implement in the correct layer (ARCHITECTURE §1). Keep the domain pure.
6. Run `pnpm check` and `pnpm test:e2e --project=chromium`. Fix every failure.
   Never weaken a lint rule, threshold or type to make it pass. If a rule is
   truly wrong, propose an ADR amendment instead.
7. Update docs if reality changed (spec, architecture, ADR status).
8. Tick the task in `docs/ROADMAP.md` (if it is one) and commit using Conventional
   Commits, with the task ID and/or issue in the subject
   (`fix(audio): time out resume() (#57)`) and `Closes #N` in the body.
9. **For an issue**, ask before pushing (unless the user has already said to), then push the
   branch and open a PR from `.github/pull_request_template.md`:
   `gh pr create --title "<conventional subject>" --body-file <scratchpad file>`. Move the issue to
   `status: in-review`. If you stop before finishing, move it back to `status: ready`, unassign,
   and comment on what's left.
10. Report: what was done, how each AC was verified, and any follow-ups. File new
    follow-ups as issues (`/issue`), not as roadmap backlog bullets.

Only do one task per invocation, unless the user asks for more.
