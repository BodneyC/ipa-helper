---
description: Implement the next roadmap task (or the one given) end to end
argument-hint: "[task-id e.g. M1.5]"
---

Implement a roadmap task for ipa-helper.

Task: `$ARGUMENTS`. If this is empty, pick the **first unchecked task in
`docs/ROADMAP.md` whose `deps` are all checked**. State which task you picked
and why before you start.

Procedure:

1. Read `CLAUDE.md`, the task's entry in `docs/ROADMAP.md`, every spec section
   and ADR in its `refs`, and the relevant parts of `docs/ARCHITECTURE.md`.
   Read the existing code you'll touch.
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
8. Tick the task in `docs/ROADMAP.md` and commit using Conventional Commits,
   with the task ID in the subject.
9. Report: what was done, how each AC was verified, and any follow-ups (add them
   to the roadmap backlog if they're new).

Only do one task per invocation, unless the user asks for more.
