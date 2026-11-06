---
description: Triage open GitHub issues (labels, priority, acceptance criteria)
argument-hint: "[#issue … | all]"
---

Triage GitHub issues for ipa-helper, following `docs/WORKFLOW.md`.

Scope: `$ARGUMENTS`. If this is empty, triage every open issue labelled
`status: triage` and every open issue missing a `type:`, `priority:` or
`status:` label: `gh issue list --state open --limit 200 --json number,title,labels,assignees,createdAt,updatedAt,body`.
`all` also re-checks every open issue (stale priorities, stale `in-progress` issues with no
activity for 14 days, and `needs-info` issues older than 30 days).

For each issue:

1. Read it, its comments (`gh issue view N --comments`), and the code and spec
   sections involved.
2. **Duplicate?** Search open and closed issues and the roadmap. If it's a duplicate,
   propose closing it as not planned with `resolution: duplicate` and a `Duplicate of #M` comment.
3. **Reproduce** bugs where you cheaply can: a unit test, or the share URL in the
   app (`/run`). Note the result.
4. Propose the labels: `type:`, `priority:` (one sentence of justification
   against the WORKFLOW §2 definitions), `area:`, `size:`, and flags. Then propose
   the next `status:`: `ready` only if the acceptance criteria are testable, otherwise
   `needs-info`, with the question to ask the reporter.
5. If the acceptance criteria are missing or vague, draft them.
6. Flag anything that needs a spec change (`/spec`), an ADR (`/adr`), or
   promotion to the roadmap (`/roadmap add … refs: #N`).

Present every proposal as one compact table (issue, title, proposed labels, status,
action), plus a draft triage comment for each. **Wait for confirmation**, then apply
it with `gh issue edit N --add-label … --remove-label …`, `gh issue comment`, and
`gh issue close N --reason "not planned"` where agreed. Never change an issue's
priority without saying why in the comment.
