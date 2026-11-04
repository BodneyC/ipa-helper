# ipa-helper — Architecture

Status: **Draft v1** · Companion to `SPECIFICATION.md` · Decisions in `docs/adr/`

## 1. Overview

ipa-helper is a **static, client-only single-page app**. There is no server
at runtime. The build produces HTML/CSS/JS plus fonts (and, later, audio assets),
deployed to a static host.

```
┌────────────────────────────────────────────────────────────────────┐
│                           Browser                                  │
│                                                                    │
│  ┌──────────────┐   actions    ┌──────────────┐   reads   ┌──────┐ │
│  │  UI (React)  │ ───────────▶ │  App state   │ ────────▶ │ UI   │ │
│  │  src/ui      │              │  src/state   │           │      │ │
│  └──────┬───────┘              └──────┬───────┘           └──────┘ │
│         │ calls (pure)                │ uses (pure)                │
│         ▼                             ▼                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 Domain (pure TypeScript)  src/domain         │  │
│  │  inventory · word model · serialisers (IPA, TIPA) · parser   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│         ▲ ports (interfaces)                                       │
│  ┌──────┴──────────────────────────────────────────────────────┐   │
│  │        Adapters  src/adapters  (browser side effects)       │   │
│  │  clipboard · storage · url-hash · audio (worker/assets)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

**Dependency rule:** `ui → state → domain` and `adapters → domain`
(adapters implement domain-defined ports). `domain` imports nothing outside
itself. `ui` reaches adapters only through the composition root
(`src/main.tsx` / `src/app/providers.tsx`). Lint enforces this with
`eslint-plugin-boundaries` (or `import/no-restricted-paths`).

## 2. Technology stack

| Concern | Choice | ADR |
| --- | --- | --- |
| Language | TypeScript (strict+) | 0002 |
| Runtime / package manager | Node LTS via fnm, pnpm | 0003 |
| Build / dev server | Vite | 0004 |
| UI | React 19 (function components and hooks only) | 0004 |
| Styling | CSS Modules + CSS custom-property design tokens (Gruvbox) | 0006 |
| Unit / component tests | Vitest + @testing-library/react + jsdom, fast-check | 0005 |
| E2E / a11y | Playwright + @axe-core/playwright | 0005 |
| Lint / format | ESLint (flat config, typescript-eslint strictTypeChecked) + Prettier | 0005 |
| Dead code / deps | knip | 0005 |
| Git hooks | lefthook (pre-commit: lint-staged equivalents; pre-push: `pnpm check`) | 0005 |
| CI / deploy | GitHub Actions → GitHub Pages | 0010 |
| Audio | **Proposed**: in-browser neural TTS from phonemes (Piper/ONNX) with an espeak-ng WASM fallback | 0009 |

## 3. Source layout

```
ipa-helper/
├─ .claude/commands/          # Slash commands for working on this repo
├─ docs/                      # Spec, architecture, ADRs, roadmap
├─ scripts/
│  └─ install-toolchain.sh    # Installs fnm, Node, pnpm, deps, browsers
├─ public/
│  └─ fonts/                  # Charis SIL (subset woff2), mono font
├─ src/
│  ├─ main.tsx                # Composition root: wires adapters → providers → <App/>
│  ├─ app/
│  │  ├─ App.tsx              # Page layout
│  │  └─ providers.tsx        # Context providers (services, settings)
│  ├─ domain/                 # PURE. No React, no DOM, no globals.
│  │  ├─ inventory/
│  │  │  ├─ types.ts          # PhoneSymbol, Category, articulatory features
│  │  │  ├─ consonants.ts     # data (as const satisfies readonly PhoneSymbol[])
│  │  │  ├─ vowels.ts
│  │  │  ├─ diphthongs.ts
│  │  │  ├─ suprasegmentals.ts
│  │  │  ├─ diacritics.ts     # M6
│  │  │  └─ index.ts          # registry: byId, inventories, groups
│  │  ├─ word/
│  │  │  ├─ word.ts           # Word = readonly Token[]; pure ops (insert, delete…)
│  │  │  └─ cursor.ts
│  │  ├─ serialise/
│  │  │  ├─ serialiser.ts     # interface Serialiser { serialise(word): string }
│  │  │  ├─ ipa.ts
│  │  │  └─ tipa.ts           # boundary-safe joining (FR-22)
│  │  ├─ parse/
│  │  │  └─ ipa-tokeniser.ts  # M6: greedy longest-match IPA → Word
│  │  ├─ codec/
│  │  │  └─ url.ts            # Word ↔ URL fragment
│  │  ├─ ports.ts             # Clipboard, KeyValueStore, AudioPlayer interfaces
│  │  └─ result.ts            # Result<T, E> type and helpers
│  ├─ state/
│  │  ├─ editor.ts            # reducer: word, cursor, undo/redo stacks
│  │  ├─ settings.ts          # reducer and schema for persisted settings
│  │  └─ hooks.ts             # useEditor, useSettings, useServices
│  ├─ adapters/
│  │  ├─ clipboard.ts         # navigator.clipboard implementation of the Clipboard port
│  │  ├─ local-storage.ts     # KeyValueStore over localStorage (with a versioned schema)
│  │  ├─ url-hash.ts          # sync editor ↔ location.hash
│  │  └─ audio/               # M4+: AudioPlayer implementations, Web Worker entry
│  ├─ ui/
│  │  ├─ components/          # Generic: Button, IconButton, Tooltip, Dialog, Toggle…
│  │  └─ features/
│  │     ├─ palette/          # SymbolKey, ConsonantChart, VowelTrapezoid, Group…
│  │     ├─ word/             # WordDisplay, TokenCursor
│  │     ├─ output/           # OutputPanel, CopyRow
│  │     ├─ settings/
│  │     └─ help/
│  └─ styles/
│     ├─ tokens.css           # THE ONLY place hex colours may appear
│     ├─ themes.css           # [data-theme] → semantic tokens
│     └─ global.css
├─ tests/
│  ├─ e2e/                    # Playwright specs, one per spec section
│  └─ tex/                    # M6: LaTeX compile fixtures for TIPA output
└─ (config files: tsconfig*.json, vite.config.ts, vitest.config.ts,
    playwright.config.ts, eslint.config.ts, .prettierrc, knip.json, lefthook.yml)
```

Unit tests sit next to the code they test (`foo.ts` + `foo.test.ts`).

## 4. Domain model

```ts
// src/domain/inventory/types.ts (illustrative, binding in spirit)
export type SymbolId = string & { readonly __brand: 'SymbolId' };

export type Category =
  | 'consonant' | 'affricate' | 'vowel' | 'diphthong'
  | 'suprasegmental' | 'diacritic';

export type InventoryId = 'rp' | 'extended';

export interface Example {
  readonly word: string;                       // "ship"
  readonly highlight: readonly [start: number, end: number]; // [0, 2] → "sh"
}

interface BaseSymbol {
  readonly id: SymbolId;                        // stable, ASCII, e.g. "esh", "tesh", "i-long"
  readonly ipa: string;                         // "ʃ" (NFC-normalised)
  readonly tipa: TipaEncoding;                  // see below
  readonly name: string;                        // "voiceless postalveolar fricative"
  readonly inventories: readonly InventoryId[];
  readonly example?: Example;
  readonly audioKey?: string;                   // M4: asset lookup key
}

export interface ConsonantSymbol extends BaseSymbol {
  readonly category: 'consonant' | 'affricate';
  readonly place: Place; readonly manner: Manner; readonly voiced: boolean;
}
export interface VowelSymbol extends BaseSymbol {
  readonly category: 'vowel';
  readonly height: Height; readonly backness: Backness;
  readonly rounded: boolean; readonly long: boolean;
}
// … DiphthongSymbol, SuprasegmentalSymbol, DiacriticSymbol
export type PhoneSymbol = ConsonantSymbol | VowelSymbol | /* … */;

export type TipaEncoding =
  | { readonly kind: 'literal'; readonly text: string }   // "S", "tS", "i:"
  | { readonly kind: 'macro'; readonly name: string }     // "textturnr" → \textturnr{}
  | { readonly kind: 'wrap'; readonly name: string };     // diacritic: \~{…}

export interface Token { readonly key: number; readonly symbolId: SymbolId } // key: React list identity
export type Word = readonly Token[];
```

Key points:

- **A word is a list of tokens, not a string (ADR-0007).** Serialisers map each
  token separately, so the TIPA output never has to reverse-engineer IPA
  codepoints. Cursor movement and deletion work on whole symbols (deleting
  `tʃ` removes it in one step).
- **Inventory data is `as const satisfies readonly PhoneSymbol[]`**, so the data is
  type-checked and stays literal. Unit tests enforce invariants: unique IDs,
  unique IPA strings, NFC-normalised strings, every RP symbol has an example, and
  consonant chart cells don't collide.
- **Diacritics** (M6) are tokens with `category: 'diacritic'` that the serialisers
  attach to the *preceding* base token: combining characters in IPA, a
  wrapping macro in TIPA.
- **Errors** use `Result<T, E>` (discriminated union) in the domain. The
  domain never throws for expected failures (bad URL fragment, unknown
  characters on paste).

### 4.1 Serialisers (ADR-0008)

```ts
export interface Serialiser { readonly id: string; serialise(word: Word): string }
```

- `ipaSerialiser`: concatenates `symbol.ipa`. A slashes option adds `/…/`.
- `tipaSerialiser`: concatenates encodings and applies a **boundary-safety
  rule**: after a control word (`\ae`, `\textturnr`) emit `{}` whenever the
  next character is a letter, or always (simpler, and the default). Also check
  multi-character shortcut collisions: TIPA reads `""` as secondary stress, so two
  primary-stress tokens in a row must be separated (`"{}"`). Property-based tests
  (fast-check) generate random words and assert:
  1. the output is deterministic and only uses the allowed charset,
  2. tokenising the TIPA output with a reference TIPA tokeniser (test-only)
     gives back the original symbol sequence (round trip),
  3. no unbalanced braces.
- Future serialisers (X-SAMPA, Kirshenbaum, espeak phoneme mnemonics for audio)
  plug in behind the same interface.

## 5. State management

- `useReducer`-based **editor store** (`src/state/editor.ts`): `{ word, cursor,
  past: Word[], future: Word[] }`. Actions: `insert`, `deleteBackward`,
  `deleteForward`, `moveCursor`, `setCursor`, `clear`, `undo`, `redo`,
  `replace` (from URL or paste). The reducer is pure and fully unit-tested, with
  exhaustive `switch` statements guarded by `assertNever`.
- **Settings store**: theme, contrast, inventory, macro name, slash option,
  collapsed groups, r-display, sound-on-select. Persisted through the
  `KeyValueStore` port under a versioned key (`ipa-helper:settings:v1`) and
  validated on load with a hand-written type guard. No `JSON.parse` result is
  trusted without validation.
- **URL sync**: the editor word is mirrored to `location.hash`
  (`history.replaceState`, debounced). On load, the hash is decoded through
  `domain/codec/url.ts`.
- No global state library. If one becomes necessary, write an ADR.

## 6. UI composition

- `<App>` layout: `<TopBar>` · `<WorkbenchCard>` (`<WordDisplay>`,
  `<OutputPanel>`, word actions) · `<Palette>` (group cards).
- `<Palette>` renders groups from the inventory registry, filtered by the
  inventory setting and the filter text. Each group picks a layout component:
  `ConsonantChart` (CSS grid: place × manner), `VowelTrapezoid` (absolutely
  positioned keys in an SVG-backed trapezoid, scaling to its container), and
  `KeyGrid` for the rest.
- `<SymbolKey>`: a `<button>` with `aria-label` "ʃ, voiceless postalveolar
  fricative, as in ship". A tooltip/popover shows details. Roving tabindex is
  managed per group by a `useRovingFocus` hook.
- Live region: one app-level `<Announcer>` for "Added ʃ", "Copied TIPA", and so on.
- Components stay presentational where possible. Feature containers connect to state
  via hooks.

## 7. Styling and theming (ADR-0006)

- `tokens.css` defines the raw Gruvbox palette once (`--gb-dark0-hard`, …,
  `--gb-bright-aqua`, `--gb-neutral-aqua`, `--gb-faded-aqua`, …).
- `themes.css` maps raw tokens to **semantic tokens** per theme:
  `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-border`,
  `--color-text`, `--color-text-muted`, `--color-accent-consonant`, … Dark
  themes use *bright* accents, light themes use *faded* accents (Gruvbox
  convention, better contrast).
- Components use **only semantic tokens**. Stylelint (or a custom ESLint
  rule plus a unit test that scans CSS modules) bans hex/rgb literals outside `tokens.css`.
- A contrast test computes WCAG ratios for every (text token, surface token)
  pair declared in `src/styles/contrast-pairs.ts`, in both themes.
- Theme is applied with `data-theme="dark|light"` and `data-contrast="soft|medium|hard"`
  on `<html>`, set before first paint by a tiny inline script to avoid a flash.

## 8. Audio (M4–M5, ADR-0009 — Proposed)

- Port: `interface AudioPlayer { playSymbol(id): Promise<Result<void, AudioError>>;
  playWord(word): Promise<Result<void, AudioError>>; readonly status: … }`.
- The adapter runs synthesis in a **Web Worker** so the UI thread never blocks,
  lazy-loads its model/WASM on first use, caches it with the Cache API, and plays
  through Web Audio (`AudioContext`).
- Word synthesis takes the Word through a dedicated serialiser (e.g.
  `piperPhonemeSerialiser` or `espeakMnemonicSerialiser`) so stress and length
  carry through. The UI never handles raw synthesis strings.
- A `NullAudioPlayer` is used in tests and when audio is unsupported.

## 9. Testing strategy (ADR-0005)

| Level | Tool | Scope | Gate |
| --- | --- | --- | --- |
| Unit | Vitest | domain, state reducers, codecs | 100 % lines/branches for `src/domain`, ≥ 90 % overall |
| Property | fast-check (in Vitest) | serialisers, tokeniser, URL codec | must pass, 1 000 runs by default |
| Component | Vitest + Testing Library + user-event | each UI component's behaviour and ARIA | included in coverage |
| E2E | Playwright (Chromium, Firefox, WebKit) | each spec FR, keyboard flows, URL sharing | all green |
| A11y | @axe-core/playwright | every page state in e2e | 0 violations |
| Visual | Playwright screenshots (M3+) | themes × breakpoints | reviewed diffs |
| TeX | `pdflatex` in CI (M6.4) | TIPA output for every symbol compiles | all compile |

Test names cite requirement IDs where applicable: `it('FR-13: Backspace deletes the token before the cursor')`.

## 10. Scripts (package.json contract)

| Script | Does |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm preview` | Serve the production build |
| `pnpm typecheck` | `tsc -b --noEmit` (or `tsc -p … --noEmit` for each project) |
| `pnpm lint` / `lint:fix` | ESLint, then Stylelint on `src/**/*.css`, with zero warnings allowed (`--max-warnings=0`) |
| `pnpm format` / `format:check` | Prettier |
| `pnpm test` / `test:watch` / `test:coverage` | Vitest |
| `pnpm test:e2e` | Playwright |
| `pnpm knip` | Unused files, exports and dependencies |
| `pnpm size` | size-limit: initial JS ≤ 100 kB gzipped (NFR-3), measured on `dist/` |
| `pnpm check` | typecheck → lint → format:check → knip → test:coverage → build → size |
| `pnpm prepare` | Installs the lefthook git hooks (runs automatically on `pnpm install`) |

## 11. Conventions

- File names: `kebab-case.ts`. React components: `PascalCase.tsx`, one exported
  component per file. Named exports only (no default exports, except where a
  config file requires one).
- No `enum`. Use string-literal unions plus `as const` objects.
- Exhaustiveness: `switch` on discriminants with `assertNever(x)` in `default`.
- Readonly everywhere in the domain (`readonly` props, `ReadonlyArray`).
- No barrel files except `src/domain/inventory/index.ts` (the registry).
- Comments explain *why*. TSDoc on every exported domain symbol.
