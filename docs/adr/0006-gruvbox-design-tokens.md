# 0006. Gruvbox theming via CSS design tokens

- Status: Accepted
- Date: 2026-11-04
- Relates to: FR-40, FR-41, NFR-2, SPEC §6

## Context
The app must be themed in Gruvbox, look modern and sleek, support dark and light
modes, and stay accessible. Ad-hoc colours drift quickly.

## Options considered
1. **CSS custom properties + CSS Modules**: zero runtime, native theming via
   attribute selectors, scoped class names, works with any framework.
2. **Tailwind**: fast to build with, but a utility soup at odds with the
   "semantic tokens only" rule, and its theme extension duplicates tokens.
3. **CSS-in-JS (styled-components, emotion)**: runtime cost, and it complicates SSR-less static builds.
4. **vanilla-extract**: typed tokens, but more build complexity than needed.

## Decision
Three token tiers:

1. **Palette** (`src/styles/tokens.css`, the only file with hex values). These are
   the canonical Gruvbox values from morhetz/gruvbox:

   | Token | Hex | Token | Hex |
   | --- | --- | --- | --- |
   | `--gb-dark0-hard` | `#1d2021` | `--gb-light0-hard` | `#f9f5d7` |
   | `--gb-dark0` | `#282828` | `--gb-light0` | `#fbf1c7` |
   | `--gb-dark0-soft` | `#32302f` | `--gb-light0-soft` | `#f2e5bc` |
   | `--gb-dark1` | `#3c3836` | `--gb-light1` | `#ebdbb2` |
   | `--gb-dark2` | `#504945` | `--gb-light2` | `#d5c4a1` |
   | `--gb-dark3` | `#665c54` | `--gb-light3` | `#bdae93` |
   | `--gb-dark4` | `#7c6f64` | `--gb-light4` | `#a89984` |
   | `--gb-gray` | `#928374` | | |

   | Accent | bright (dark theme) | neutral | faded (light theme) |
   | --- | --- | --- | --- |
   | red | `#fb4934` | `#cc241d` | `#9d0006` |
   | green | `#b8bb26` | `#98971a` | `#79740e` |
   | yellow | `#fabd2f` | `#d79921` | `#b57614` |
   | blue | `#83a598` | `#458588` | `#076678` |
   | purple | `#d3869b` | `#b16286` | `#8f3f71` |
   | aqua | `#8ec07c` | `#689d6a` | `#427b58` |
   | orange | `#fe8019` | `#d65d0e` | `#af3a03` |

2. **Semantic** (`src/styles/themes.css`): `--color-bg`, `--color-surface`,
   `--color-surface-raised`, `--color-border`, `--color-text`,
   `--color-text-muted`, `--color-focus`, `--color-danger`,
   `--color-accent-{consonant,affricate,vowel,diphthong,supra,diacritic}`, set
   per `[data-theme]` × `[data-contrast]`. Contrast changes `--color-bg` only
   (hard/medium/soft = `dark0-hard`/`dark0`/`dark0-soft`, and the light equivalents).
3. **Component**: optional local custom properties in CSS Modules derived from
   semantic tokens (e.g. `--key-bg: var(--color-surface)`).

Also tokenised: spacing scale (4 px base), radii (6/12/16 px), font stacks
(`--font-ipa: "Charis SIL", "Doulos SIL", "Noto Serif", serif`, `--font-ui`,
`--font-mono`), motion durations (zeroed under `prefers-reduced-motion`).

## Consequences
- Lint (Stylelint) bans colour literals outside `tokens.css`.
- A unit test asserts that every semantic text/surface pair in both themes meets WCAG AA.
  Some Gruvbox combinations fail (e.g. `gray` on `light0`), so those pairings are
  simply not used for text.
