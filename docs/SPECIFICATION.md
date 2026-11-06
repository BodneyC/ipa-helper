# ipa-helper — Specification

Status: **Draft v1** · Owner: repository maintainer · Last updated: 2026-11-05

Requirement IDs (`FR-x`, `NFR-x`) are stable. Roadmap tasks and tests refer to
them. Don't renumber them. Mark withdrawn requirements as *Withdrawn* instead
of deleting them.

---

## 1. Purpose

People who invent words (for conlangs, fiction, games, brand names, tabletop
settings) often know how a word should *sound* but can't easily write it
down in the International Phonetic Alphabet (IPA). Typing IPA is awkward,
and typesetting it in LaTeX with TIPA means learning yet another ASCII
encoding.

**ipa-helper** lets a user build a transcription by clicking symbols. It shows,
live:

- the IPA transcription as a dictionary prints it, between slashes: `/ˈθɔːnɪk/`
- the TIPA source for that transcription, i.e. what goes between `\ipa{` and `}`:
  `"TO:nIk`

Later versions will also let the user hear each symbol, and the whole word,
pronounced in British English, at no cost and without signing up for anything.

## 2. Users and scenarios

| Persona | Scenario |
| --- | --- |
| Writer / conlanger | Has a word in their head and wants a canonical IPA spelling to put in a glossary. |
| Academic / LaTeX user | Needs the TIPA string for a paper or thesis without looking up `tipaman.pdf`. |
| Curious learner | Explores which sound each symbol stands for, using example words and (later) audio. |

## 3. Glossary

- **Symbol**: one selectable unit in the palette. It may be more than one
  codepoint (for example the affricate `tʃ`, the diphthong `eɪ`, or the long vowel `iː`).
- **Token**: one occurrence of a symbol in the word being built.
- **Word**: an ordered list of tokens. A word is a list of tokens, **not** a
  string (see ADR-0007).
- **Inventory**: a named set of symbols. `rp` is the British English set (Received
  Pronunciation / Standard Southern British). `extended` is the wider IPA.
- **TIPA string**: the ASCII/macro encoding understood by the LaTeX `tipa` package
  inside `\textipa{…}` (and therefore inside a user macro such as `\ipa{…}`).

## 4. Functional requirements

### 4.1 Symbol palette

- **FR-1** The app shows a palette of IPA symbols, grouped so related
  sounds sit together. The groups, in display order, are:
  1. **Consonants**: laid out like the IPA pulmonic chart. Columns are place of
     articulation, rows are manner, and voiceless/voiced pairs share a cell
     (voiceless on the left). Cells that are empty or physically impossible are shown as such.
  2. **Affricates**: `tʃ dʒ` (plus `ts dz` in `extended`).
  3. **Non-pulmonic consonants** (`extended` only): clicks and implosives, as
     in the IPA chart's separate table.
  4. **Vowels (monophthongs)**: shown on a **vowel trapezoid** (front–central–back
     × close–open), with rounded/unrounded pairs side by side. Long variants (`iː`, `ɑː`,
     `ɔː`, `uː`, `ɜː`) are offered next to their short counterparts.
  5. **Diphthongs**: `eɪ aɪ ɔɪ əʊ aʊ ɪə eə ʊə` (British set).
  6. **Suprasegmentals**: primary stress `ˈ`, secondary stress `ˌ`, length `ː`,
     half-length `ˑ`, syllable break `.`.
  7. **Diacritics** (`extended` only, milestone M6): syllabic, nasalised,
     voiceless, aspirated, and so on. *As built (M6.2): each is a token of its
     own that marks the token just before it (so in `tʰ̥` the ring is under
     the ʰ). Keys show the mark on a dotted circle, `◌̃`.*
- **FR-2** Each symbol key shows the glyph prominently, with a small secondary
  label. On hover, focus or long-press it shows a tooltip/popover with:
  the IPA name (e.g. "voiceless postalveolar fricative"), a British example word with
  the relevant letters highlighted (e.g. "**sh**ip"), and the TIPA encoding.
  *As built: the secondary label is the example word. Marks show their name
  instead. Sounds without a British example (most of the `extended` inventory)
  show no secondary label, because their chart position already says what they
  are. Their name is still in the tooltip and the accessible name.
  "Focus" means keyboard focus (`:focus-visible`): focus from a click or tap
  doesn't open the tooltip, so it never stays open after the pointer leaves (#21).*
- **FR-3** An inventory switch chooses between **British English (RP)**, the
  default, and **Full IPA**. The RP view hides symbols outside the inventory. It does
  not just grey them out. *As built (M6.1): the choice is remembered. Full IPA
  sounds that have no recorded clip (FR-30) have no play affordance.*
- **FR-4** A filter box narrows the palette by symbol, name, example word or
  TIPA code (e.g. typing `fric` or `S` finds `ʃ`).
  Glyphs and TIPA codes match as case-sensitive substrings (`S` finds `ʃ`, `s`
  finds `s`). Name and example words match by word prefix, ignoring case, and
  every query word must match (`voiceless fric`). The palette says how many
  symbols match, and hides groups with none.
- **FR-5** Users can collapse and expand palette groups. The app remembers which
  groups are collapsed across reloads. While a filter is active (FR-4), matching groups
  show expanded, so no match is hidden.

### 4.2 Building a word

- **FR-10** Activating a symbol key (click, tap, Enter or Space) appends that symbol
  as a token at the cursor position in the word.
- **FR-11** The word display shows the transcription between slashes, e.g.
  `/ˈflɒɡɪʃ/`, in a large IPA-capable font. When the word is empty it shows a
  placeholder (`/…/`).
- **FR-12** The word display has a **token cursor**. The user can move it with
  ←/→ or by clicking between tokens. Insertion happens at the cursor.
- **FR-13** Editing actions: **Backspace** deletes the token before the cursor,
  **Delete** the token after it, and **Clear** empties the word. Clear can be undone.
- **FR-14** Undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) cover every word edit.
- **FR-15** The current word is encoded in the URL fragment as versioned
  symbol IDs (e.g. `#w=1:primary-stress.f.l.turned-script-a.g.small-cap-i.esh`
  for `/ˈflɒɡɪʃ/`, see ADR-0007), so a shared link restores it.
  Invalid fragments are ignored and the app shows a non-blocking notice.
- **FR-16** *(M3)* **Saved words**: the user can save the current word with
  an optional gloss/label to a local list (browser storage), then reload,
  rename or delete entries. There is no account. Tabs of the app share the
  list: a change in one tab shows in the others, and never overwrites theirs.
- **FR-17** *(M6)* **Paste IPA**: the user pastes an IPA string and the app
  tokenises it into known symbols using greedy longest-match. Unknown characters
  are reported, not silently dropped. *As built (M6.3): a "Paste IPA…" word
  action opens a dialog. As you type or paste, it shows how the text reads, or
  names each unknown character and its position. "Use as word" replaces the
  word in one undoable step. Every symbol is recognised whichever inventory is
  shown. Surrounding `/…/` or `[…]` are ignored. The text is decomposed (NFD),
  so `ẽ` reads as `e` + nasalised. ASCII `g` and `:` and tie-bar affricates are
  accepted. When the British r is shown broad (Q-3), `r` reads as `ɹ`
  (ADR-0012).*

### 4.3 Output

- **FR-20** Output panel row 1, **IPA**: the transcription with slashes and a copy
  button. A toggle chooses whether the slashes are included in the copied text
  (default: included).
- **FR-21** Output panel row 2, **TIPA**: the string that goes between `\ipa{` and
  `}`, with a copy button. A secondary copy action copies the full macro call,
  e.g. `\ipa{"TO:nIk}`. The macro name can be configured (default `ipa`) and is
  remembered across reloads.
  - Note: `\ipa` is not defined by the `tipa` package itself. We assume the user
    has a macro along the lines of `\newcommand{\ipa}[1]{\textipa{/#1/}}`. The
    settings panel shows a suggested definition the user can copy.
- **FR-22** The TIPA serialiser must produce output that compiles under
  `pdflatex` with `\usepackage{tipa}` and renders the same glyphs as the IPA row.
  Where the encoding is ambiguous, the serialiser emits braces or a separating
  space (e.g. `\ae{}` before a letter, or `\textturnr{}`) so that adjacent tokens
  can't merge into a different macro or shortcut. *As built (M6.4): the CI
  `tex` job compiles every symbol, every diacritic and every ordered pair of
  symbols (`pnpm tex:check`), and uploads the PDF so the glyphs can be checked
  by eye.*
- **FR-23** Copy actions show transient feedback ("Copied") that screen
  readers also announce (ARIA live region).

### 4.4 Audio (milestones M4–M5)

- **FR-30** Every symbol key has a "play" affordance (a separate small button,
  or a modifier: Alt+click / long-press, with the plain click still appending). Playing
  pronounces the sound in a British English voice. *As built (M4.4): both. A
  speaker button appears on a key's corner while it is hovered or focused, and
  Alt+click, Alt+Enter or a touch long-press also play the sound. Suprasegmental
  marks have no sound, so they have no play affordance.*
- **FR-31** A "Play word" button pronounces the whole built word in British English.
  Stress marks and length must audibly change the output. *As built (M5.3): the
  button is the first word action. It is disabled until the word has a sound,
  and is absent where the browser can't run the voice. The first play
  downloads the voice; until it's ready the button reads "Loading voice…" and a
  progress bar shows the download. A failure is shown under the button and
  announced, and the next click retries.*
- **FR-32** Audio must be **free and require no sign-up, API key or account**,
  for both the user and the maintainer. Prefer approaches that run entirely in the
  browser or use static assets (see ADR-0009).
- **FR-33** Audio assets and models are loaded lazily, only when the user first
  asks for audio, and cached for offline reuse. The app works fully without them.
- **FR-34** A global "Sound on select" toggle (default off) plays each
  symbol as it is appended.

### 4.5 Theming and settings

- **FR-40** The Gruvbox palette is used throughout. There is a **dark** theme
  (default: gruvbox dark, medium contrast) and a **light** theme (gruvbox
  light). On first visit the app follows `prefers-color-scheme`. A toggle overrides
  it, and the override is remembered.
- **FR-41** *(M3)* A contrast option (soft / medium / hard) maps to Gruvbox's
  background variants.
- **FR-42** All settings live in one settings panel/dialog and are stored locally.
  A setting changed in one tab applies at once in the app's other open tabs.

### 4.6 Keyboard

- **FR-50** The whole app can be used with a keyboard. The palette is a set
  of composite widgets (roving tabindex per group: arrow keys move within a group,
  Tab moves between groups).
- **FR-51** Global shortcuts (shown in a `?` help dialog): Backspace/Delete/←/→
  act on the word whenever focus isn't in a text input. `/` focuses the filter,
  `Ctrl+Shift+C` copies the IPA, `Ctrl+Shift+L` copies the TIPA, and `Escape` closes dialogs.
  Inside a palette group, ←/→ move between keys (FR-50) rather than the word
  cursor; Backspace and Delete still edit the word. No shortcut fires while a
  dialog is open.

### 4.7 Install and offline (M7, ADR-0013)

- **FR-60** The app can be installed as a PWA. It has a web app manifest with its
  name, standalone display, Gruvbox theme and background colours, and icons at
  192 and 512 px (one maskable). This works whether it is served from the root
  or from a sub-path.
- **FR-61** After one online visit, the app works offline, including after a
  reload: the page, scripts, styles, fonts and icons. Nothing else downloads
  ahead of time. Sounds and the word voice are cached the first time they're
  used (FR-33), so anything played once also plays offline.
- **FR-62** When a new version has been deployed, the open app keeps running the
  version it started with and shows a notice: "A new version of ipa-helper is
  ready" with **Reload** and **Later**. Reload switches to the new version.
  Later hides the notice for this visit. The new version also takes over by
  itself once every tab running the old one has closed.

## 5. Non-functional requirements

- **NFR-1 Quality**: TypeScript strict (ADR-0002); lint, format, tests and
  coverage gates as in ADR-0005. Merging is blocked if any gate fails.
- **NFR-2 Accessibility**: WCAG 2.2 AA. axe-core reports zero violations in
  e2e. Every Gruvbox token pairing used for text meets ≥ 4.5:1 contrast (≥ 3:1 for
  large text and UI boundaries). A unit test verifies this.
- **NFR-3 Performance**: the initial JS is ≤ 100 kB gzipped, excluding fonts and
  audio. Lighthouse performance ≥ 95 and LCP < 1.5 s on simulated "Fast 4G". Symbol
  clicks update the display within one frame.
- **NFR-4 Compatibility**: the latest two versions of Chrome, Firefox, Safari and Edge.
  Responsive from 360 px wide upwards. Touch-friendly targets (≥ 44×44 CSS px).
- **NFR-5 Offline / hosting**: a fully static build that deploys to any static host
  (GitHub Pages by default, ADR-0010). *(M7)* Installable PWA that works offline
  (FR-60 to FR-62, ADR-0013).
- **NFR-6 Privacy**: no analytics, no cookies, no third-party requests at runtime.
  Audio models and runtime files are served from the app's own host (ADR-0009).
  All state stays on the device.
- **NFR-7 Typography**: IPA renders in a font with full IPA coverage (Charis SIL,
  self-hosted, subset to the symbols used). The UI text font is a modern sans.
- **NFR-8 Licensing**: the licence of every bundled asset (fonts, audio, voice
  models) is recorded in `THIRD_PARTY_NOTICES.md` and must be compatible with the
  project licence.

## 6. Visual design direction

"Modern and sleek Gruvbox". Gruvbox's warm retro palette, used with
restraint, on a clean, spacious layout:

- **Layout (desktop)**: a sticky top bar (title, inventory switch, filter, theme,
  settings). Below it, the **word display + output panel** sits as a prominent card
  at the top of the page, with the palette in a responsive grid of group cards
  underneath. On small screens (narrower than 768 px, or shorter than 500 px,
  which includes a phone in landscape) the card splits in two (#4):
  - a compact **word strip** stays sticky under the top bar while the palette
    scrolls: the word, Play word, Undo and Redo, and a **More** disclosure button
    (`aria-expanded`). It covers no more than 40% of the viewport height at
    360 × 640 or 844 × 390. The word's usage hint is kept for screen readers only.
  - the **details** below it (Clear, Saved words, Paste IPA, and the IPA/TIPA
    output rows) scroll away with the page. More shows or hides them; they start
    shown, and the choice is remembered with the settings (FR-42).
- **Surfaces**: `bg0` page and `bg1` cards, with 12–16 px radius, soft 1 px `bg2`
  borders and no heavy shadows. Use a subtle elevation shadow only on popovers.
- **Accent colour coding by group** (from the Gruvbox accent set, used for a
  thin top border on group cards and the key focus ring, never for large fills):
  consonants `aqua`, affricates `blue`, vowels `yellow`, diphthongs `orange`,
  suprasegmentals `purple`, diacritics `green`. `red` is reserved for
  destructive actions and errors.
- **Keys**: square-ish tiles with the glyph at ~1.5 rem and a micro-label underneath
  (example word). States: hover (lift and `bg2` fill), active/pressed (scale 0.96),
  focus-visible (2 px accent ring with offset), and "just added" (a brief accent pulse).
  Respect `prefers-reduced-motion`.
- **Word display**: a large serif IPA glyph run (Charis SIL) with slashes in
  `fg4`, a blinking token cursor in the accent colour, and tokens that highlight on hover.
- **Output rows**: monospace (JetBrains Mono or system mono) for TIPA, with a label
  chip (`IPA`, `TIPA`) and an icon copy button.

## 7. Symbol inventory (RP baseline)

The canonical data lives in `src/domain/inventory/` (see ARCHITECTURE.md). This
table is the **acceptance baseline** for milestone M1. TIPA encodings must be
verified against the TIPA manual (`texdoc tipa`) and the compile test (M6.4).
Encodings marked † use a long-form macro on purpose, for clarity and safety.

### 7.1 Consonants

| IPA | TIPA | Example (BrE) | | IPA | TIPA | Example (BrE) |
| --- | --- | --- | --- | --- | --- | --- |
| p | `p` | **p**in | | b | `b` | **b**in |
| t | `t` | **t**in | | d | `d` | **d**in |
| k | `k` | **c**at | | ɡ | `g` | **g**ap |
| ʔ | `P` | bu**tt**er (glottal) | | m | `m` | **m**ap |
| n | `n` | **n**ap | | ŋ | `N` | si**ng** |
| f | `f` | **f**an | | v | `v` | **v**an |
| θ | `T` | **th**in | | ð | `D` | **th**is |
| s | `s` | **s**ip | | z | `z` | **z**ip |
| ʃ | `S` | **sh**ip | | ʒ | `Z` | mea**s**ure |
| x | `x` | lo**ch** | | h | `h` | **h**at |
| l | `l` | **l**eg | | ɫ | `\textltilde{}`† (verify) | fee**l** |
| ɹ | `\textturnr{}`† | **r**ed | | j | `j` | **y**es |
| w | `w` | **w**et | | | | |

### 7.2 Affricates

| IPA | TIPA | Example |
| --- | --- | --- |
| tʃ | `tS` | **ch**urch |
| dʒ | `dZ` | **j**udge |

The tie-bar forms (`t͡ʃ` → `\t{tS}`) are offered as a setting in M6. *As
built (M6.5): "Affricates: write with a tie bar" in Settings, off by default.
It redraws every affricate on the keys, in the word and in both outputs. The
word itself, its URL and saved words are unchanged, and pasted tie-bar forms
always read as the affricate (ADR-0012).*

### 7.3 Vowels

| IPA | TIPA | Example | | IPA | TIPA | Example |
| --- | --- | --- | --- | --- | --- | --- |
| ɪ | `I` | k**i**t | | iː | `i:` | fl**ee**ce |
| e | `e` | dr**e**ss | | æ | `\ae{}`† | tr**a**p |
| ʌ | `2` | str**u**t | | ɑː | `A:` | p**al**m |
| ɒ | `6` | l**o**t | | ɔː | `O:` | th**ough**t |
| ʊ | `U` | f**oo**t | | uː | `u:` | g**oo**se |
| ə | `@` | **a**bout | | ɜː | `3:` | n**ur**se |
| i | `i` | happ**y** | | u | `u` | infl**u**ence |
| ɛ | `E` | (SSB variant of dress) | | ɐ | `5` | (SSB variant of strut) |

### 7.4 Diphthongs

| IPA | TIPA | Example | | IPA | TIPA | Example |
| --- | --- | --- | --- | --- | --- | --- |
| eɪ | `eI` | f**a**ce | | aɪ | `aI` | pr**i**ce |
| ɔɪ | `OI` | ch**oi**ce | | əʊ | `@U` | g**oa**t |
| aʊ | `aU` | m**ou**th | | ɪə | `I@` | n**ea**r |
| eə | `e@` | squ**a**re | | ʊə | `U@` | c**u**re |

### 7.5 Suprasegmentals

| IPA | TIPA | Meaning |
| --- | --- | --- |
| ˈ | `"` | primary stress |
| ˌ | `""` | secondary stress |
| ː | `:` | long |
| ˑ | `;` | half-long |
| . | `.` | syllable break |

Suprasegmentals are marks, not sounds, so they have no example word. Their
tooltip shows the meaning instead.

### 7.6 Extended inventory (M6)

This adds the rest of the IPA pulmonic consonants, the remaining cardinal
vowels, the non-pulmonic consonants and the diacritics. For anything outside TIPA's
single-character shortcuts, prefer the **long-form macros** (`\textturnh`,
`\textbeltl`, `\textrtailn`, …). Every entry needs a compile test.

Extended symbols have no example word (the examples are British). The model
details are in ADR-0012. TIPA can't typeset the labiodental flap `ⱱ`, so it is
left out. `ç` is `\c{c}`, because TIPA's shortcut `C` is `ɕ`.

**Pulmonic consonants** added to §7.1:

| IPA | TIPA | | IPA | TIPA | | IPA | TIPA | | IPA | TIPA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ʈ | `\textrtailt{}` | | ɖ | `\textrtaild{}` | | c | `c` | | ɟ | `\textbardotlessj{}` |
| q | `q` | | ɢ | `\textscg{}` | | ɱ | `\textltailm{}` | | ɳ | `\textrtailn{}` |
| ɲ | `\textltailn{}` | | ɴ | `\textscn{}` | | ʙ | `\textscb{}` | | r | `r` |
| ʀ | `\textscr{}` | | ɾ | `\textfishhookr{}` | | ɽ | `\textrtailr{}` | | ɸ | `\textphi{}` |
| β | `\textbeta{}` | | ʂ | `\textrtails{}` | | ʐ | `\textrtailz{}` | | ç | `\c{c}` |
| ʝ | `\textctj{}` | | ʍ | `\textturnw{}` | | ɣ | `\textgamma{}` | | χ | `\textchi{}` |
| ʁ | `\textinvscr{}` | | ħ | `\textcrh{}` | | ʕ | `\textrevglotstop{}` | | ɦ | `\texthth{}` |
| ɬ | `\textbeltl{}` | | ɮ | `\textlyoghlig{}` | | ʋ | `\textscriptv{}` | | ɻ | `\textturnrrtail{}` |
| ɰ | `\textturnmrleg{}` | | ɭ | `\textrtaill{}` | | ʎ | `\textturny{}` | | ʟ | `\textscl{}` |

**Affricates** added to §7.2: `ts` (`ts`), `dz` (`dz`).

**Non-pulmonic consonants**:

| IPA | TIPA | Name | | IPA | TIPA | Name |
| --- | --- | --- | --- | --- | --- | --- |
| ʘ | `\textbullseye{}` | bilabial click | | ɓ | `\texthtb{}` | bilabial implosive |
| ǀ | `\textpipe{}` | dental click | | ɗ | `\texthtd{}` | alveolar implosive |
| ǃ | `!` | postalveolar click | | ʄ | `\texthtbardotlessj{}` | palatal implosive |
| ǂ | `\textdoublebarpipe{}` | palatoalveolar click | | ɠ | `\texthtg{}` | velar implosive |
| ǁ | `\textdoublepipe{}` | alveolar lateral click | | ʛ | `\texthtscg{}` | uvular implosive |

Ejectives are written with the ejective diacritic `ʼ` (`'`), e.g. `pʼ`.

**Vowels** added to §7.3:

| IPA | TIPA | | IPA | TIPA | | IPA | TIPA | | IPA | TIPA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| y | `y` | | ɨ | `\textbari{}` | | ʉ | `\textbaru{}` | | ɯ | `\textturnm{}` |
| ʏ | `\textscy{}` | | ø | `\o{}` | | ɘ | `\textreve{}` | | ɵ | `\textbaro{}` |
| ɤ | `\textramshorns{}` | | o | `o` | | œ | `\oe{}` | | ɜ | `\textrevepsilon{}` |
| ɞ | `\textcloserevepsilon{}` | | ɔ | `\textopeno{}` | | a | `a` | | ɶ | `\OE{}` |
| ɑ | `\textscripta{}` | | | | | | | | | |

**Diacritics** (M6.2), in the IPA chart's order. Combining marks wrap the
preceding token in TIPA (`\textsubring{n}`); spacing ones follow it (`t\super{h}`).

| IPA | Name | TIPA | | IPA | Name | TIPA |
| --- | --- | --- | --- | --- | --- | --- |
| ◌̥ | voiceless | `\textsubring{…}` | | ◌̬ | voiced | `\textsubwedge{…}` |
| ◌ʰ | aspirated | `\super{h}` | | ◌̹ | more rounded | `\textsubrhalfring{…}` |
| ◌̜ | less rounded | `\textsublhalfring{…}` | | ◌̟ | advanced | `\textsubplus{…}` |
| ◌̠ | retracted | `\textsubbar{…}` | | ◌̈ | centralised | `\"{…}` |
| ◌̽ | mid-centralised | `\textovercross{…}` | | ◌̩ | syllabic | `\textsyllabic{…}` |
| ◌̯ | non-syllabic | `\textsubarch{…}` | | ◌˞ | rhoticity | `\textrhoticity{}` |
| ◌̤ | breathy voiced | `\textsubumlaut{…}` | | ◌̰ | creaky voiced | `\textsubtilde{…}` |
| ◌̼ | linguolabial | `\textseagull{…}` | | ◌ʷ | labialised | `\super{w}` |
| ◌ʲ | palatalised | `\super{j}` | | ◌ˠ | velarised | `\super{\textgamma}` |
| ◌ˤ | pharyngealised | `\super{\textrevglotstop}` | | ◌̴ | velarised or pharyngealised | `\textsuperimposetilde{…}` |
| ◌̝ | raised | `\textraising{…}` | | ◌̞ | lowered | `\textlowering{…}` |
| ◌̘ | advanced tongue root | `\textadvancing{…}` | | ◌̙ | retracted tongue root | `\textretracting{…}` |
| ◌̪ | dental | `\textsubbridge{…}` | | ◌̺ | apical | `\textinvsubbridge{…}` |
| ◌̻ | laminal | `\textsubsquare{…}` | | ◌̃ | nasalised | `\~{…}` |
| ◌ⁿ | nasal release | `\super{n}` | | ◌ˡ | lateral release | `\super{l}` |
| ◌̚ | no audible release | `\textcorner{}` | | ◌ʼ | ejective | `'` |

The word voice (FR-31) knows only some of these marks (ʰ ʲ ˤ ˞ and the
syllabic, non-syllabic, dental, apical, laminal and nasalised marks). A word
with any other diacritic can't be spoken, and Play word says so.

## 8. Out of scope (v1)

- User accounts, cloud sync, or any back end.
- Automatic grapheme-to-phoneme ("type a spelling, get the IPA").
- Accents other than British English for audio. The data model must not
  *preclude* adding them later.
- Exporting formats other than IPA text and TIPA (e.g. X-SAMPA, Kirshenbaum).
  These are candidates for later because the serialiser design allows them (ADR-0008).

## 9. Open questions

| ID | Question | Resolution path |
| --- | --- | --- |
| Q-1 | Which in-browser TTS engine gives acceptable British audio from IPA input? | **Resolved** (M4.1): Piper `en_GB-cori-medium`, ADR-0009 Accepted. |
| Q-2 | Should the copied `\ipa{}` include slashes inside the braces? | Default: no (the macro adds them). Configurable. |
| Q-3 | Display `ɹ` or `r` for the British "r"? | Default `ɹ` (narrow), with a setting to display `r` (broad, dictionary convention). |
