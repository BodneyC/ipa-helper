---
description: Create a new Architecture Decision Record
argument-hint: "<decision title>"
---

Create a new ADR for: **$ARGUMENTS**

1. Read `docs/adr/README.md` (template and index) and skim the existing ADRs, so
   you don't duplicate one and can spot any this decision supersedes or relates to.
2. Choose the next number (zero-padded, 4 digits). Use a kebab-case file name:
   `docs/adr/NNNN-short-title.md`.
3. Fill in the template properly: real context (cite FR/NFR IDs), at least two
   genuinely considered options with pros and cons, one clear decision, and its consequences.
   Status is `Proposed` unless the user has already made the decision, in which case use `Accepted`.
   Use today's date.
4. If it supersedes an ADR, change only that ADR's status line to
   `Superseded by [NNNN](NNNN-….md)`.
5. Add the row to the index table in `docs/adr/README.md`.
6. Update `docs/ARCHITECTURE.md` (and the stack table) if the decision changes it, and
   add any roadmap tasks it implies to `docs/ROADMAP.md`.
7. Show the user the decision section and ask whether to mark it Accepted.
