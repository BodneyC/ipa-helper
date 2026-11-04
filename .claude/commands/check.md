---
description: Run all quality gates and fix failures
argument-hint: "[--all-browsers]"
---

Run the full ipa-helper quality gate and get it green.

1. Run `pnpm check` (typecheck → lint → format:check → knip → test:coverage → build).
2. Run `pnpm test:e2e --project=chromium`. If `$ARGUMENTS` contains `--all-browsers`,
   run `pnpm test:e2e` for all three browsers.
3. For each failure, find the root cause and fix it properly. Rules:
   - Don't add `eslint-disable`, `@ts-expect-error`, `/* v8 ignore */`, lower
     coverage thresholds, or skip or `.only` tests, unless there's an
     explicit, commented justification that the user approves.
   - Format issues: run `pnpm format`, then re-check.
4. Re-run until everything passes, then report a concise table: each gate and its result,
   plus coverage numbers for `src/domain` and overall.

If the project hasn't been scaffolded yet (no `package.json`), say so and
suggest `/bootstrap`.
