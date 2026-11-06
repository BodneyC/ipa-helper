# 0014. Track unscheduled work in GitHub Issues with scoped labels and a P0–P3 priority

- Status: Accepted
- Date: 2026-11-06
- Relates to: ADR-0001, ADR-0005, ADR-0010

## Context
Until now all work lived in `docs/ROADMAP.md`. That works for planned milestones,
but the project is live (ADR-0010), so bugs and requests now come from people
using it, and the roadmap's Backlog section has grown into a list of loosely
worded bullets with no priority, owner or state. Agents working across sessions
(ADR-0001) need a reliable way to answer "what is the most important thing to do
next?" and "is anyone already working on this?". People reporting bugs need
somewhere to report them that isn't a Markdown file.

## Options considered
1. **Roadmap only.** Keep everything in `ROADMAP.md`, and add priority markers to backlog bullets.
   + one place, versioned with the code · − no way for users to report, no
   discussion, no state ("in progress", "blocked"), and no link to PRs.
2. **Issues only.** Move every roadmap task into GitHub Issues and milestones, and delete the roadmap.
   + one tracker, native PR linking · − loses the ordered, dependency-aware plan
   that `/next` relies on, and agents can't read or edit it offline; a lot of churn.
3. **Roadmap for the plan, issues for intake.** Planned milestone tasks stay in the
   roadmap. Bugs, requests and unscheduled ideas are issues, with a small scoped
   label set (`type:`, `priority:`, `status:`, `area:`, `size:`, flags) and
   templates. An issue is promoted into the roadmap when it is scheduled.
   + keeps the plan, adds intake, state and PR linking · − two places to look,
   so the rules for which goes where must be explicit.

## Decision
We will use option 3, as specified in `docs/WORKFLOW.md`:

- Labels are scoped (`scope: value`) and defined in one script,
  `scripts/github/sync-labels.sh`, which is idempotent and uses only `gh`.
- Priority is `P0`–`P3`, defined by user impact rather than effort. P0 and P1
  issues take precedence over the roadmap. P2 and P3 issues wait their turn.
- Every open, triaged issue has exactly one `type:`, `priority:` and `status:`.
  A small workflow clears `status:` labels on close.
- Issue forms (with blank issues disabled) and a PR template make reports
  reproducible and PRs link back with `Closes #N`.
- Agents skip anything labelled `needs: human` or `needs: decision`.

We'll use GitHub's built-in features (labels, milestones, sub-issues) rather
than a Projects board, a bot, or a third-party label-sync action. That avoids
new dependencies and keeps the setup reproducible from the repository.

## Consequences
- New slash commands, `/issue` and `/triage`. `/next` also takes an issue number
  and checks P0/P1 issues before the roadmap.
- The roadmap's Backlog section is frozen. Its items are to be migrated into
  issues, labelled `priority: P3` unless triage decides otherwise.
- A little labelling overhead on every issue. If labels drift from the script,
  or most issues sit in `status: triage`, the scheme is too heavy and should be
  simplified by a superseding ADR.
