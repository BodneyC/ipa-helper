---
description: Review the working tree against spec, architecture and standards
argument-hint: "[path or git range, default: uncommitted + last commit]"
---

Review the ipa-helper changes in `$ARGUMENTS` (default: `git diff HEAD~1` plus any
uncommitted changes) as a strict senior reviewer.

Check, citing `file:line` for each finding:

1. **Spec conformance**: does the behaviour match the cited FR/NFR exactly? Are any
   requirements implemented but untested?
2. **Architecture**: layer boundaries (domain purity), files in the right place,
   naming conventions (ARCHITECTURE §11), no new global state.
3. **Types**: any escape hatches (`as`, `!`, `any`, `@ts-*`), weak types where a
   union or brand would fit, missing exhaustiveness.
4. **Tests**: meaningful assertions (not snapshots of everything), requirement IDs in
   names, property tests for serialisers and codecs, e2e plus axe for UI behaviour.
5. **Accessibility**: roles, names, focus management, live regions, contrast,
   reduced motion.
6. **Theming**: only semantic tokens, no colour literals, works in both themes.
7. **Dependencies**: anything new? Is it justified, and does its licence fit NFR-8?
8. **Docs**: roadmap ticked, ADR or spec updates needed?
9. **Tracking**: if the work is for an issue, does every acceptance criterion in it
   hold? Does the commit or PR use a Conventional subject with the task ID or `(#N)`
   and `Closes #N`? Are there out-of-scope follow-ups that should be filed with `/issue`?

Output the findings ranked by severity (blocker / should-fix / nit), then a one-line
verdict. Don't edit files unless the user asks you to fix the findings.
