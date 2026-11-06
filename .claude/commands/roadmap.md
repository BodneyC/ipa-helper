---
description: Report on or edit the roadmap (status | add <desc> | reorder)
argument-hint: "[status | add <description> | reorder]"
---

Work with `docs/ROADMAP.md`. Argument: `$ARGUMENTS` (default `status`).

- **status**: Parse the roadmap and report per milestone (done/total), the
  next actionable task (first unchecked task with all deps met), and any tasks
  that are blocked and what blocks them. Cross-check against git: for each
  ticked task, confirm a commit references its ID (`git log --oneline --grep`),
  and flag any that don't. Then add an **issues** summary from
  `gh issue list --state open --json number,title,labels`: counts by priority and
  status, every open P0/P1, anything stuck in `status: triage`, and issues that
  have a roadmap ID in their title but no matching task. Keep the output compact (tables).
- **add <description | #issue>**: Only for *scheduled* work. Unscheduled ideas
  go to GitHub Issues (`/issue`), not the roadmap. Decide which milestone the task belongs in,
  give it the next ID in that milestone, and write it in the house style: bold ID,
  imperative summary, `deps:`, `refs:` (spec FR/NFR and ADR IDs), and an `AC:` line
  with verifiable criteria. If it introduces new behaviour, ask whether a spec
  requirement should be added too (`/spec`). When promoting an issue, add `#N` to
  `refs:`, prefix the issue title with the task ID, and set the matching GitHub milestone
  (`gh issue edit N --title "[M8.1] …" --milestone "M8: …"`). Ask first, since this edits the issue.
- **reorder**: Propose a reordering, with reasons (dependencies, risk, value).
  Apply it only after the user confirms. Never renumber IDs that already appear in commits.

Never tick or untick tasks in this command. Ticking happens in `/next`.
