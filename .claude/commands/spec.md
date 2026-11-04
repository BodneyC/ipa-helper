---
description: Propose and apply a change to the specification
argument-hint: "<what should change>"
---

The user wants this behaviour change: **$ARGUMENTS**

1. Read `docs/SPECIFICATION.md` in full, and the ADRs that touch the area.
2. Draft the change:
   - New requirement: next free ID in the right section (`FR-x`/`NFR-x`). Never reuse IDs.
   - Changed requirement: edit it in place, keeping the ID.
   - Removed requirement: mark it *Withdrawn (YYYY-MM-DD): reason* and keep the ID.
   - Requirements must be testable. Avoid "should be nice". Say what observable
     behaviour proves it.
3. Find the knock-on effects: architecture sections, ADRs that need superseding
   (`/adr`), roadmap tasks to add or amend, and existing tests that now encode
   old behaviour.
4. Show the user a short diff summary and the list of knock-on effects, and wait for
   confirmation.
5. On confirmation, apply the spec edit, bump "Last updated", and make the
   roadmap and architecture updates. Commit as `docs(spec): …`.
