---
description: Report on or edit the roadmap (status | add <desc> | reorder)
argument-hint: "[status | add <description> | reorder]"
---

Work with `docs/ROADMAP.md`. Argument: `$ARGUMENTS` (default `status`).

- **status**: Parse the roadmap and report per milestone (done/total), the
  next actionable task (first unchecked task with all deps met), and any tasks
  that are blocked and what blocks them. Cross-check against git: for each
  ticked task, confirm a commit references its ID (`git log --oneline --grep`),
  and flag any that don't. Keep the output compact (a table).
- **add <description>**: Decide which milestone the task belongs in (or the Backlog),
  give it the next ID in that milestone, and write it in the house style: bold ID,
  imperative summary, `deps:`, `refs:` (spec FR/NFR and ADR IDs), and an `AC:` line
  with verifiable criteria. If it introduces new behaviour, ask whether a spec
  requirement should be added too (`/spec`).
- **reorder**: Propose a reordering, with reasons (dependencies, risk, value).
  Apply it only after the user confirms. Never renumber IDs that already appear in commits.

Never tick or untick tasks in this command. Ticking happens in `/next`.
