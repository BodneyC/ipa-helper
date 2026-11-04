# 0011. Pin the toolchain to versions the lint stack supports

- Status: Proposed
- Date: 2026-11-04
- Relates to: NFR-1, ADR-0002, ADR-0003, ADR-0005

## Context
At bootstrap (M0.2–M0.7) the "latest stable" version of several tools clashed
with other choices already made in ADRs 0002, 0003 and 0005:

- **TypeScript 7.0** (the native Go port) is `latest` on npm, but it has no JS
  compiler API. typescript-eslint's `strictTypeChecked` (ADR-0005) needs that API
  and declares `typescript >=4.8.4 <6.1.0`.
- **ESLint 10** is current. ESLint 9 is marked *no longer supported* on npm. But
  `eslint-plugin-react` 7.37 and `eslint-plugin-jsx-a11y` 6.10 (both required by
  ADR-0005) declare `eslint ^9` at most, and `eslint-plugin-react` crashes on
  ESLint 10 (it calls context methods that ESLint 10 removed).
  `@types/eslint-plugin-jsx-a11y` hard-depends on ESLint 9.
- **Stylelint 18.0.0** was younger than pnpm's default `minimumReleaseAge`
  supply-chain window, so pnpm would only install it after writing an exclusion. Its
  `stylelint-config-css-modules` companion doesn't support it yet either.
- **pnpm 12** no longer reads general settings such as `engine-strict` from
  `.npmrc` (ADR-0003 says to put it there). It reads them from `pnpm-workspace.yaml`.
  pnpm also blocks dependency install scripts by default, which includes lefthook's
  postinstall.

## Options considered
1. **Bleeding edge everywhere** (TS 7, ESLint 10, Stylelint 18): newest, but
   type-aware linting would break and supply-chain exclusions would be needed. − Breaks NFR-1.
2. **Hold everything back** (TS 6, ESLint 9, Stylelint 17): every peer range
   satisfied. − ESLint 9 no longer gets security or bug fixes.
3. **Newest version each constraint allows** (TS 6.0, ESLint 10 with
   `@eslint/compat` shims, Stylelint 17): a supported linter with working rules, and no
   supply-chain exclusions. − Two declared peer mismatches to maintain.

## Decision
Option 3:

| Tool | Version | Why not the newest |
| --- | --- | --- |
| TypeScript | 6.0.x | TS 7 has no JS API for typescript-eslint. Dependabot ignores `>=6.1`. |
| ESLint | 10.x | — (`eslint-plugin-react` and `jsx-a11y` are wrapped with `fixupPluginRules` from `@eslint/compat`; `peerDependencyRules.allowedVersions` in `pnpm-workspace.yaml` records the mismatch) |
| jsx-a11y types | local `types/eslint-plugin-jsx-a11y.d.ts` | `@types/eslint-plugin-jsx-a11y` pulls in ESLint 9 |
| Stylelint | 17.x | 18.0.0 fell inside pnpm's release-age window and has no CSS Modules config yet |
| pnpm | 12.x | — |
| Node engine | `>=24` | — |

pnpm settings live in `pnpm-workspace.yaml` (`engineStrict: true`,
`peerDependencyRules`, `allowBuilds`). `.npmrc` keeps `engine-strict=true` for
npm-compatible tools and as the contract ADR-0003 names. Dependency install scripts
stay blocked (`allowBuilds: { lefthook: false }`), and the root `prepare` script
runs `lefthook install`. Dependabot uses a 7-day cooldown, in line with pnpm's
release-age policy.

## Consequences
- Revisit when typescript-eslint supports TS 7 (drop the Dependabot ignore, then
  bump), or when `eslint-plugin-react`/`jsx-a11y` declare ESLint 10 (remove the
  `fixupPluginRules` wrappers and the `peerDependencyRules` entries). Moving to
  `@eslint-react/eslint-plugin` is the alternative if `eslint-plugin-react` stalls.
- Each lint rule was proven with a fixture under ESLint 10 at bootstrap. A
  silent shim failure would show up as rules that no longer fire, so re-run the
  M0.3 fixture exercise after major lint upgrades.
