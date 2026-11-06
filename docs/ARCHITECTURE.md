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

### Offline and install (M7.1, ADR-0013)

The build emits a hand-written service worker, `sw.js`, at the root of the base
path, plus `manifest.webmanifest`. On install the worker precaches the app shell:
`index.html`, the entry JS and CSS, fonts, icons and the manifest. It caches
other fingerprinted `assets/` files (the synthesis worker, the `.wasm` and the
voice config) the first time they are fetched, and leaves the rest to the
browser. Symbol clips and the voice model stay in the audio adapters' own
`ipa-helper-audio-v1` cache (§8). A new version waits until the user chooses
**Reload** in the update notice (FR-62). `src/sw` is a separate entry: it and the
app never import each other, so Rolldown can't split a shared chunk that a
classic-script worker couldn't load. The build fails if `sw.js` contains
`import` or `export`. Playwright blocks service workers by default, and
`tests/e2e/pwa.spec.ts` opts back in.

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
| Audio | In-browser neural TTS from phonemes: Piper `en_GB-cori-medium` on onnxruntime-web (wasm, one thread), self-hosted | 0009 |

## 3. Source layout

```
ipa-helper/
├─ .claude/commands/          # Slash commands for working on this repo
├─ docs/                      # Spec, architecture, ADRs, roadmap; qa/CHECKLIST.md (manual cross-browser QA, M7.2)
├─ scripts/
│  ├─ install-toolchain.sh    # Installs fnm, Node, pnpm, deps, browsers
│  ├─ subset-fonts.sh         # Rebuilds public/fonts (pinned downloads + fontTools in a temp venv)
│  ├─ tex/                    # M6.4: symbols-tex.ts (pure: the compile fixture), write-tex.ts (entry point)
│  ├─ ci/                     # images.test.ts: CI's Playwright image matches @playwright/test
│  ├─ release/                # M7.3: changelog.ts (pure: Conventional Commits → release notes), write-changelog.ts
│  ├─ pwa/                    # M7.1, ADR-0013: plugin.ts (Vite: emits sw.js, writes the manifest, injects the
│  │                          #   precache list; a preview-only "next deploy" hook for e2e), palette.ts (reads
│  │                          #   tokens.css), render-icons.ts (draws public/icons with Playwright's Chromium)
│  └─ audio/                  # Symbol clips (M4.3) and voice:fetch (M5.2), ADR-0009: clips.ts (pure: frames, picks),
│                             #   voice.ts (pinned Cori download + onnxruntime-web + ffmpeg-static Opus),
│                             #   candidates.ts / select.ts (entry points), listen-page.ts
├─ public/
│  ├─ icons/                  # PWA icons (FR-60), written by `pnpm icons:render`; committed
│  └─ fonts/                  # Charis SIL subset renamed "ipa-helper IPA" (OFL RFN), JetBrains Mono subset; built by scripts/subset-fonts.sh
├─ src/
│  ├─ main.tsx                # Composition root: wires adapters → providers → <App/>
│  ├─ app/
│  │  ├─ App.tsx              # Page layout
│  │  └─ providers.tsx        # Context providers (services, settings)
│  ├─ domain/                 # PURE. No React, no DOM, no globals.
│  │  ├─ inventory/
│  │  │  ├─ types.ts          # PhoneSymbol, Category, articulatory features
│  │  │  ├─ symbol-id.ts      # branded SymbolId: guard, Result parser, data constructor
│  │  │  ├─ consonants.ts     # data incl. affricates (as const satisfies readonly ConsonantSymbol[])
│  │  │  ├─ example.ts        # example('**sh**ip') → { word, highlight } (SPEC §7 notation)
│  │  │  ├─ encoding.ts       # lit('S') / macro('ae') TipaEncoding helpers
│  │  │  ├─ vowels.ts
│  │  │  ├─ non-pulmonic.ts   # M6: clicks and implosives (ADR-0012)
│  │  │  ├─ diphthongs.ts
│  │  │  ├─ suprasegmentals.ts
│  │  │  ├─ diacritics.ts     # M6.2: combining marks (TIPA wrap) and spacing modifiers (ADR-0012)
│  │  │  └─ index.ts          # registry: byId, inventories, groups
│  │  ├─ word/
│  │  │  ├─ word.ts           # Word = readonly Token[]; pure ops (insert, delete…)
│  │  │  └─ cursor.ts         # CursorWord = { word, cursor }; ops return the input object on no-op
│  │  ├─ serialise/
│  │  │  ├─ serialiser.ts     # interface Serialiser { serialise(word): string }
│  │  │  ├─ ipa.ts
│  │  │  ├─ tipa.ts           # boundary-safe joining (FR-22)
│  │  │  ├─ labels.ts         # a key's glyph (diacritics on ◌) and TIPA code (FR-2, Q-3)
│  │  │  └─ filter.ts         # matchesFilter: the palette filter's matching rule (FR-4)
│  │  ├─ parse/
│  │  │  └─ ipa-tokeniser.ts  # M6.3: NFD + greedy longest-match IPA → Result<Word, UnknownCharacter[]>
│  │  ├─ codec/
│  │  │  └─ url.ts            # Word ↔ URL fragment: `w=1:id.id.id`, decode → Result
│  │  ├─ ports.ts             # Clipboard, FragmentStore, KeyValueStore, DocumentTheme, AudioPlayer, AppUpdates interfaces
│  │  └─ result.ts            # Result<T, E> type and helpers
│  ├─ state/
│  │  ├─ editor.ts            # reducer: word, cursor, undo/redo stacks
│  │  ├─ settings.ts          # reducer and schema for persisted settings
│  │  ├─ saved-words.ts       # FR-16: saved list reducer, validation, load/save
│  │  └─ hooks.ts             # EditorContext/SettingsContext + useEditor, useSettings (providers in app/providers.tsx)
│  ├─ adapters/
│  │  ├─ clipboard.ts         # navigator.clipboard implementation of the Clipboard port
│  │  ├─ local-storage.ts     # KeyValueStore over localStorage; blocked storage reads as empty
│  │  ├─ document-theme.ts    # DocumentTheme: <html data-theme data-contrast>, follows the system live
│  │  ├─ url-hash.ts          # sync editor ↔ location.hash
│  │  ├─ service-worker.ts    # AppUpdates: registers sw.js (production only), reports a waiting version (FR-62)
│  │  └─ audio/               # web-audio-output (AudioContext playback), audio-player (port over clip sources),
│  │                          #   symbol-clips (lazy fetch + Cache API), cache, voice (pin + config parser),
│  │                          #   word-source + synth-protocol + synth-engine + synth.worker (M5.2)
│  ├─ sw/                     # The service worker (ADR-0013), a separate classic-script entry: rules.ts (pure:
│  │                          #   precache selection, routing), shell-worker.ts (event handlers over injected
│  │                          #   caches/fetch), sw.ts (wires them to `self`). Imports nothing outside src/sw.
│  ├─ ui/
│  │  ├─ components/          # Generic: Button, IconButton, Tooltip, Dialog, Toggle…
│  │  └─ features/
│  │     ├─ palette/          # SymbolKey, ConsonantChart, VowelTrapezoid (domain: chart.ts vowelTrapezoid), KeyGrid…
│  │     ├─ word/             # WordDisplay, WordActions, UrlSync, PasteDialog (FR-17)
│  │     ├─ output/           # OutputPanel, CopyRow
│  │     ├─ audio/            # use-audio: useAudioStatus, usePlaySymbol (FR-30, FR-34)
│     ├─ settings/         # SettingsDialog (FR-42), suggested \newcommand
│  │     ├─ saved/            # SavedWordsDialog (FR-16)
│  │     ├─ update/           # UpdateNotice: "A new version… Reload / Later" (FR-62)
│  │     └─ help/
│  ├─ assets/audio/symbols/   # <symbol id>.opus clips + manifest.json, written by `pnpm audio:select`
│  ├─ assets/voice/           # the pinned Cori .onnx.json (byte for byte; the model itself is fetched)
│  └─ styles/
│     ├─ tokens.css           # THE ONLY place hex colours may appear
│     ├─ themes.css           # [data-theme] → semantic tokens
│     └─ global.css
├─ tests/
│  ├─ e2e/                    # Playwright specs, one per spec section
│  └─ tex/out/                # M6.4: generated symbols.tex/.pdf (gitignored), compiled by `pnpm tex:check`
└─ (config files: tsconfig*.json, vite.config.ts, vitest.config.ts,
    playwright.config.ts, eslint.config.ts, .prettierrc, knip.json, lefthook.yml)
```

Unit tests sit next to the code they test (`foo.ts` + `foo.test.ts`).

## 4. Domain model

```ts
// src/domain/inventory/symbol-id.ts
export type SymbolId = string & { readonly __brand: 'SymbolId' };
// Lowercase ASCII words joined by hyphens (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/), URL-safe.
// isSymbolId (guard) · parseSymbolId → Result (untrusted input) · symbolId (static data; throws)

// src/domain/inventory/types.ts (illustrative, binding in spirit)
// Feature vocabularies are `as const` tuples in chart order (PLACES, MANNERS,
// HEIGHTS, BACKNESSES, …); each union type is derived from its tuple.

export type Category =
  | 'consonant' | 'affricate' | 'non-pulmonic' | 'vowel' | 'diphthong'
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
  readonly category: 'consonant' | 'affricate' | 'non-pulmonic';   // clicks, implosives (ADR-0012)
  readonly place: Place; readonly manner: Manner; readonly voiced: boolean;
  readonly secondary?: SecondaryArticulation;   // e.g. ɫ = velarised l, keeps chart cells distinct
}
export interface VowelSymbol extends BaseSymbol {
  readonly category: 'vowel';
  readonly height: Height; readonly backness: Backness;
  readonly rounded: boolean; readonly long: boolean;
}
export interface DiphthongSymbol extends BaseSymbol { readonly category: 'diphthong'; readonly glide: 'closing' | 'centring' }
export interface SuprasegmentalSymbol extends BaseSymbol { readonly category: 'suprasegmental'; readonly role: SuprasegmentalRole }
export interface DiacriticSymbol extends BaseSymbol { readonly category: 'diacritic' }
export type PhoneSymbol =
  ConsonantSymbol | VowelSymbol | DiphthongSymbol | SuprasegmentalSymbol | DiacriticSymbol;

export type TipaEncoding =
  | { readonly kind: 'literal'; readonly text: string }   // "S", "tS", "i:"
  | { readonly kind: 'macro'; readonly name: string }     // "textturnr" → \textturnr{}
  | { readonly kind: 'wrap'; readonly name: string }      // diacritic: \~{…}
  | { readonly kind: 'command'; readonly text: string };  // self-delimiting: \c{c}, \super{h} (ADR-0012)

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
  unique IPA strings, NFC-normalised strings, every RP sound has an example
  (suprasegmentals are marks, not sounds, so they have none), and neither
  consonant chart cells nor vowel trapezoid points collide.
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

Serialisers are built by factories that take the display options
(`{ slashes, rDisplay, tieBars }`; `GlyphOptions` is the last two, which
`labelsOf`, `matchesFilter` and the palette take too) and, optionally, the symbol set (defaults to the
registry; tests inject fixtures): `createIpaSerialiser(options, symbols?)`,
`createTipaSerialiser(options, symbols?)`. Q-3's broad `r` is a rendering of the
`turned-r` symbol, applied in both serialisers so the TIPA row shows the same glyphs (FR-22). Tie bars (M6.5) are a rendering too: an affricate becomes `t͡ʃ` and a
`\t{tS}` command (ADR-0012).

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
  past: CursorWord[], future: CursorWord[] }`. History holds `{ word, cursor }`
  snapshots, so undo restores the cursor too. Edits that change nothing, and cursor
  moves, leave no undo entry. History is capped at 100 steps. Actions: `insert`, `deleteBackward`,
  `deleteForward`, `moveCursor`, `setCursor`, `clear`, `undo`, `redo`,
  `replace` (from URL or paste). The reducer is pure and fully unit-tested, with
  exhaustive `switch` statements guarded by `assertNever`.
- **Settings store**: theme, contrast, inventory, macro name, slash option,
  collapsed groups, r-display, tie bars, sound-on-select, word details open. Persisted through the
  `KeyValueStore` port under a versioned key (`ipa-helper:settings:v1`) and
  validated on load with a hand-written type guard. No `JSON.parse` result is
  trusted without validation. `parseSettings` validates field by field: an invalid
  or missing field falls back to its default (or, in the reducer, its current
  value) without discarding the valid ones. Fields: `theme` (system|dark|light),
  `contrast`, `inventory`, `macroName` (letters only), `ipaSlashes` (FR-20),
  `tipaSlashes` (Q-2), `rDisplay`, `tieBars` (M6.5), `collapsedGroups` (categories), `soundOnSelect`,
  `hoverableTooltips` (FR-2, ADR-0016), `wordDetailsOpen` (#4).
  `main.tsx` reads them with `loadSettings(store)` before the first render;
  `<SettingsSync>` writes them back with `saveSettings` on every change.
- **Several tabs** (#2): tabs share local storage but not memory. The
  `KeyValueStore` port's `subscribe(key, listener)` reports another tab's write
  (the `storage` event; this tab's own writes don't fire it). `<SettingsSync>`
  loads the stored settings when told, and merges every write with what is
  stored (`mergeSettings`): a field that changed in storage since this tab last
  looked keeps the stored value, and the rest take this tab's. Storage that drops
  writes therefore never rolls back this tab's changes. Saved words treat
  storage as the source of truth instead: each action is applied to the freshly
  read list and written back (`updateSavedWords`), so adds, renames and removes
  from different tabs merge by entry ID.
- **URL sync**: the editor word is mirrored to `location.hash`
  (`history.replaceState`, debounced 250 ms) through the `FragmentStore` port
  (`adapters/url-hash.ts`). On load, `main.tsx` decodes the hash through
  `domain/codec/url.ts` into the initial word, so loading adds no undo step. The
  `<UrlSync>` component writes edits back, loads user-changed fragments
  (`hashchange`) as one undoable `replace`, and shows a dismissible notice for an
  invalid fragment. The adapter listens from creation and hands a change made
  before anything subscribed to the first subscriber, because the first render
  is a transition (below).
- **First render** (NFR-3): `main.tsx` calls `root.render` inside
  `startTransition`, so React renders the palette's hundred-odd keys in short
  slices instead of one long task. That took Total Blocking Time at 8× CPU from
  ~230 ms to ~25 ms with the same LCP, which keeps Lighthouse on CI's slower
  runners above the budget. The app is on screen a moment after `load`, so e2e
  tests that measure the palette wait for it first.
- **Saved words** (FR-16, `src/state/saved-words.ts`): a newest-first list of
  `{ id, fragment, gloss, savedAt }` under `ipa-helper:saved-words:v1`. The word
  is stored as its URL-codec fragment (ADR-0007), so it is versioned and
  re-validated on load; entries whose word no longer decodes are dropped. The
  `<SavedWordsDialog>` holds a copy of the stored list, applies each change
  through `updateSavedWords` (above), reloads it on a `storage` event, and loads
  a word into the editor as one undoable `replace`.
- No global state library. If one becomes necessary, write an ADR.

## 6. UI composition

- `<App>` layout: `<TopBar>` · `<Workbench>` (`<WordDisplay>`,
  `<OutputPanel>`, word actions) · `<Palette>` (group cards).
- `<Workbench>` (`src/app/Workbench.tsx`, SPEC §6, #4) reads `useMediaQuery(SMALL_SCREEN)`
  (`(width < 768px), (height < 500px)`) during render. A large screen gets one
  card. A small one gets two siblings of `<main>`: a sticky word strip (the word,
  `<WordActions part="primary">` and the More disclosure) and the details
  (`part="secondary"` and `<OutputPanel>`), which scroll away. They must be
  siblings, because a sticky element can't outlive its parent's box. More stores
  `wordDetailsOpen` in the settings. The CSS media queries for the small layout
  repeat the `SMALL_SCREEN` query.
- `<Palette>` renders groups from the inventory registry, filtered by the
  inventory setting and the filter text. Each group picks a layout component:
  `ConsonantChart` (CSS grid: place × manner), `VowelTrapezoid` (absolutely
  positioned keys in an SVG-backed trapezoid, scaling to its container), and
  `KeyGrid` for the rest. In the full IPA (M6.1) the consonant chart uses all
  twelve place columns and scrolls inside its card, the non-pulmonic group is a
  `KeyGrid`, and the trapezoid takes the full row and widens
  (`data-widest="wide"`) because some points hold three vowels.
- `<SymbolKey>`: a `<button>` with `aria-label` "ʃ, voiceless postalveolar
  fricative, as in ship". A tooltip/popover shows details. Roving tabindex is
  managed per group by `useRovingFocus` (`ui/components/roving-focus.ts`):
  ←/→ follow DOM order, ↑/↓ follow the rendered layout, and navigation keys are
  always `preventDefault`ed inside a group.
- Symbol audio (FR-30, FR-34, M4.4): `<PaletteWithAudio>` sits inside the
  announcer and wires `<Palette>` to the audio player via `usePlaySymbol`
  (`ui/features/audio/use-audio.ts`). That hook returns a `SymbolPlayer`
  (`canPlay`, `play`), or `undefined` when the symbol channel is unsupported,
  so no play affordance renders, and it announces any failed play. A key the
  player can play (`isSounding` in the domain registry, and a clip) plays on Alt+click, Alt+Enter or a touch long-press. It also has a
  24 px speaker button on its corner, shown while the key is hovered or
  focused. The speaker is a pointer convenience only (`tabIndex=-1`,
  `aria-hidden`); keyboard and screen reader users get Alt+Enter, which is
  listed in the tooltip and the help dialog. "Sound on select" plays after
  each insert, and its checkbox in Settings is disabled when Web Audio is
  missing.
- Word audio (FR-31, M5.3): `<PlayWordButton>` (`ui/features/audio/`) is the
  first item in `<WordActions>`. It reads `status.words` and `progress.words`
  through `useAudioStatus` and `useAudioProgress`. While the channel loads,
  the button is `aria-disabled` rather than `disabled`, so it keeps focus,
  and a native `<progress>` bar shows the download (indeterminate when the
  fraction is unknown). An error message is tied to the button with
  `aria-describedby` and announced. The e2e spec routes `synth.worker-*.js` to
  a fake worker that the test releases or fails on command, so it never needs
  the model.
- `<GlobalShortcuts>` (`ui/features/help/`) listens on `document` for FR-51 and
  skips events a widget already handled (`defaultPrevented`), text inputs and
  anything inside a `<dialog>`. Copy shortcuts share `useOutputs` and `useCopy`
  with the output panel.
- Dialogs use the native `<dialog>` with `showModal()` (`ui/components/Dialog.tsx`),
  so the browser handles inertness and Escape. Focus returns to the opener.
- Collapsible groups (FR-5): `<Card collapse>` makes the heading a disclosure
  button (`aria-expanded`/`aria-controls`) and hides the body. The state is
  `settings.collapsedGroups`, so it persists. While a filter is active, groups
  show their matches expanded and drop the toggle.
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
- Motion (SPEC §6): durations are tokens, and `prefers-reduced-motion` zeroes
  `--duration-fast`/`--duration-medium`. Nothing moves under reduced motion: no
  hover lift or press scale (press shows by border), a steady cursor, and the
  "just added" pulse only fades (`--duration-pulse` stays, as fading isn't motion).
  Tooltips keep clear of sticky chrome marked `data-tooltip-ceiling`.
- Theme is applied with `data-theme="dark|light"` and `data-contrast="soft|medium|hard"`
  on `<html>`, set before first paint by a tiny inline script to avoid a flash.
  After that, `<SettingsSync>` (`app/`) applies settings through the
  `DocumentTheme` port (`adapters/document-theme.ts`), which also follows
  `prefers-color-scheme` live while the theme is `system`.

## 8. Audio (M4–M5, ADR-0009)

- Port (`src/domain/ports.ts`): `interface AudioPlayer { readonly status:
  Record<'symbols' | 'words', AudioStatus>; subscribe(listener): unsubscribe;
  canPlaySymbol(id): boolean; playSymbol(id): Promise<Result<void, AudioError>>;
  playWord(word): … }`. `canPlaySymbol` is true only for symbols with a clip
  (`SYMBOL_CLIP_IDS`, the sounding RP symbols), so the palette offers no play
  affordance for full-IPA sounds (ADR-0012).
  Each channel has its own status (`unsupported | idle | loading | ready`),
  because symbol clips and the word voice load independently. `status` is an
  immutable snapshot that is replaced on change, so the UI can read it with
  `useSyncExternalStore`. A failed first load goes back to `idle` so that the
  next request retries. `AudioError.kind` is one of `audio-unsupported`,
  `audio-load-failed` or `audio-playback-failed`.
- Adapters (`src/adapters/audio/`): `createWebAudioOutput` plays one
  `AudioClip` (encoded bytes, or PCM samples) at a time, and a new clip cuts
  off the old one. It creates the `AudioContext` on the first play (inside a
  user gesture, which satisfies autoplay policy), resumes it if the browser
  suspended it, and decodes a copy of encoded data so that cached clips stay
  playable. `createAudioPlayer({ output, symbols?, words? })` combines the
  output with one `ClipSource` per channel: the M4.3 clip loader and the M5.2
  worker. A channel without a source reports `unsupported`.
- Symbol clips (M4.3) are committed Ogg Opus files, one for each sounding RP
  symbol. Vite fingerprints them, and the bundle carries only their URLs
  (`?url&no-inline`). `createSymbolClipSource` fetches a clip on its first
  play, keeps it in memory for the rest of the visit, and stores it in the
  Cache API (`ipa-helper-audio-v1`) so it works offline. Each clip's frame,
  for example `əpˈə!` for /p/, is recorded in `manifest.json`.
- The adapter runs synthesis in a **Web Worker** so the UI thread never blocks,
  lazy-loads its model/WASM on first use, caches it with the Cache API, and plays
  through Web Audio (`AudioContext`).
- Word synthesis takes the Word through `piperPhonemeSerialiser` (domain, pure)
  (`src/domain/serialise/piper.ts`), so stress and length carry through. It
  moves each stress mark from the syllable onset to just before the stressed
  vowel, which is how the voice was trained, and drops syllable breaks. It ends
  a word of 1–4 sounds in `!`, and writes a longer word as ` X.` with a
  leading space, which stops the voice running on (ADR-0009, "Word endings").
  `piperPhonemeIds(text, phoneme_id_map)` turns that text into the voice's
  input IDs; the clip scripts and the synthesis worker share it. The UI never
  handles raw synthesis strings.
- **Word synthesis (M5.2).** These pieces live in `src/adapters/audio/`:
  - `word-source.ts` is the main-thread `ClipSource<Word>`. It serialises the
    word and starts `synth.worker.ts` on the first word (a module worker,
    bundled as its own chunk). It matches each reply to its request by ID. If
    the worker crashes, every waiting word fails and the next word starts a
    new worker.
  - `synth-protocol.ts` defines the messages and validates them on both sides.
  - `synth-engine.ts` is the worker-side logic, with its dependencies injected
    so it can be unit-tested. On the first request it fetches the committed
    voice config (`src/assets/voice/`, bundled as a `?url` asset). It reads the
    model from the Cache API, or streams it from
    `<base>voice/en_GB-cori-medium.<sha8>.onnx` while reporting progress
    against the model's known size, then stores it in the cache. A failed load
    is forgotten, so the next word retries.
  - `synth.worker.ts` is the thin wrapper that connects onnxruntime-web to the
    engine. It imports the wasm-only build, `onnxruntime-web/wasm`
    (`ort.wasm.bundle.min.mjs`, with the glue code inlined, one thread). The
    default entry expects the WebGPU-capable `.jsep.wasm` binary and hangs if
    given the plain one. The wasm binary is self-hosted through the
    `onnxruntime-web-dist` alias in `vite.config.ts`.
    `scripts/ci/onnxruntime.test.ts` checks that the bundle and the binary match.
  - The model is never committed: `pnpm voice:fetch` puts the SHA-256-checked
    file into `public/voice/` (gitignored), and the deploy workflow runs it
    with an `actions/cache` cache.
  - Cold start, measured on a local build in Chromium and Firefox: about
    2.75 s for the first word, including fetching the model from localhost,
    creating the session and synthesising. Warm words take 96–123 ms.
- **Progress.** `AudioPlayer.progress` holds a per-channel 0–1 snapshot while
  a channel loads. A `ClipSource` reports it through an optional `onProgress`
  callback, and the player clamps it and clears it once the channel is ready.
- `NULL_AUDIO` (the null player, named like the other null ports) is the
  default in `<Providers>` and tests.

## 9. Testing strategy (ADR-0005)

| Level | Tool | Scope | Gate |
| --- | --- | --- | --- |
| Unit | Vitest | domain, state reducers, codecs | 100 % lines/branches for `src/domain`, ≥ 90 % overall |
| Property | fast-check (in Vitest) | serialisers, tokeniser, URL codec | must pass, 1 000 runs by default |
| Component | Vitest + Testing Library + user-event | each UI component's behaviour and ARIA | included in coverage |
| E2E | Playwright (Chromium, Firefox, WebKit) | each spec FR, keyboard flows, URL sharing, offline and updates (service workers blocked except in `pwa.spec.ts`) | all green |
| A11y | @axe-core/playwright | every page state in e2e | 0 violations |
| Visual | Playwright screenshots, `visual` project (`tests/visual`, Chromium) | dark/light × 360/768/1280 px | reviewed diffs (non-blocking CI job) |

In CI, the e2e, visual and Lighthouse jobs run in Playwright's Docker image
(`mcr.microsoft.com/playwright`), which already has the browsers and their
system packages; the TeX job runs in `texlive/texlive:latest-small`. Neither
depends on Ubuntu's apt mirror, which once stalled jobs for 20 minutes. The
image tag must equal `@playwright/test`'s version; `scripts/ci/images.test.ts`
fails `pnpm check` until it does. The Firefox job adds a PulseAudio null sink,
since Firefox's `AudioContext` never starts without an output device.
| Performance | Lighthouse CI (`lighthouserc.json`), median of 3 runs | NFR-3 on simulated Fast 4G (60 ms RTT, 9 Mbps down, 1.5 Mbps up, 4× CPU) | perf ≥ 95, a11y = 100, LCP ≤ 1.5 s |
| TeX | `pdflatex` + `tipa` in CI (M6.4), `tex` job | every symbol, the broad r, every diacritic on a base and stacked, every ordered pair of symbols, both macro forms (Q-2); the PDF is uploaded | compiles with `-halt-on-error` |

Visual baselines live in `tests/visual/__screenshots__/` with no OS suffix. To
keep them machine-independent, the visual tests pin the UI font to the
self-hosted face, emulate reduced motion, and allow a 1 % pixel difference for
anti-aliasing. They check layout, colour and spacing, not the system font.
Accept intentional changes with `pnpm test:visual --update-snapshots`.

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
| `pnpm test:visual` | Playwright screenshot comparison (`visual` project) |
| `pnpm lighthouse` | Build, then Lighthouse CI against `dist/` with Playwright's Chromium: performance ≥ 95, accessibility = 100, LCP ≤ 1.5 s (NFR-3); reports in `.lighthouseci/` |
| `pnpm knip` | Unused files, exports and dependencies |
| `pnpm size` | size-limit: initial JS ≤ 100 kB gzipped (NFR-3), measured on `dist/` |
| `pnpm audio:candidates [--only id,…]` | Renders candidate symbol clips and a listening page into `.cache/symbol-clips/` (M4.3) |
| `pnpm audio:select <picks.json>` | Copies the picked renders to `src/assets/audio/symbols/` and writes `manifest.json` |
| `pnpm tex:generate` | Writes `tests/tex/out/symbols.tex` from the inventory and the TIPA serialiser (M6.4) |
| `pnpm tex:check` | Generates the fixture, then compiles it with `pdflatex` (needs TeX Live with `tipa`; CI runs it in the `texlive/texlive:latest-small` image) |
| `pnpm changelog <version> [--dry-run]` | Prepends release notes built from Conventional Commits since the last `v*` tag to `CHANGELOG.md` (M7.3; see `RELEASING.md`) |
| `pnpm icons:render` | Draws the PWA icons into `public/icons/` from the IPA font and tokens.css (M7.1); commit the PNGs |
| `pnpm voice:fetch` | Downloads the pinned voice model (SHA-256 checked) into `public/voice/` for word synthesis (M5.2); the deploy runs it |
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
