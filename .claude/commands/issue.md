---
description: Draft and file a GitHub issue, labelled per docs/WORKFLOW.md
argument-hint: "<what's wrong or wanted>"
---

File a GitHub issue for: **$ARGUMENTS**

1. Read `docs/WORKFLOW.md` §2 and §5 (labels and how to write an issue).
2. **Check for duplicates**: `gh issue list --state all --search "<keywords>"`
   with two or three different phrasings, and check the roadmap
   (`docs/ROADMAP.md`) for a task that already covers it. If you find a match, show it and stop,
   or offer to comment on it instead.
3. **Investigate briefly** so the issue is useful. For a bug, find the code
   path and the requirement it breaks (`FR-x`/`NFR-x`), and reproduce it if you
   cheaply can (a failing test is ideal; mention it but don't commit it). For a feature,
   find the spec sections it touches.
4. Draft the issue following the matching template in `.github/ISSUE_TEMPLATE/`:
   imperative title, body sections, and testable acceptance criteria as a
   `- [ ]` checklist, with `refs:`.
5. Propose labels: one `type:`, one `priority:` (justify it in one line against
   the definitions), one or more `area:`, `size:` if clear, and flags (`accessibility`,
   `regression`, `needs: human`, `needs: decision`). If the issue is fully specified,
   use `status: ready`, otherwise `status: triage`.
6. Show the draft (title, labels, body) and **wait for confirmation**. Filing an issue is public.
7. On confirmation: write the body to a scratchpad file and run
   `gh issue create --title … --body-file … --label … [--milestone …]`.
   Report the URL.

If labels are missing on the repository, ask the user to run
`! ./scripts/github/sync-labels.sh` first.
