# ipa-helper — Roadmap

Tasks are worked **in order** unless a dependency says otherwise. `/next` takes
the first unchecked task whose dependencies are all done. Each task is meant to
fit in one commit or PR. When you finish a task, tick it (`[x]`) and append the
short commit hash: `- [x] **M1.2** … (abc1234)`.

Legend: `deps:` other tasks that must be done first · `refs:` spec/ADR IDs ·
**AC** = acceptance criteria (all must hold, plus all gates green).

---

## M0: Toolchain and scaffold

- [x] **M0.1** Toolchain install script works end to end. refs: ADR-0003
  - AC: `./scripts/install-toolchain.sh` on a clean Ubuntu 24.04 leaves
    `node -v` matching `.node-version` and `pnpm -v` working in a new shell. Re-running it is a no-op.
- [x] **M0.2** Scaffold the Vite + React + TS project (`/bootstrap`). deps: M0.1 · refs: ADR-0002, 0004 (6519917)
  - AC: `package.json` has the `packageManager`, `engines` and `scripts` from ARCHITECTURE §10.
    tsconfig flags match ADR-0002 exactly. `pnpm dev` serves a placeholder page.
- [x] **M0.3** Lint, format, Stylelint and knip configured. deps: M0.2 · refs: ADR-0005 (803d6f5)
  - AC: a deliberately bad fixture (any, enum, hex colour in a module, domain
    importing React) fails lint, and is then removed. `pnpm lint` passes with zero warnings.
- [x] **M0.4** Vitest (unit and component) and Playwright (e2e + axe) configured with
  coverage thresholds. deps: M0.2 · refs: ADR-0005 (8dfbf8b)
  - AC: one sample unit test, one component test and one e2e test with an axe scan pass. Coverage thresholds are enforced.
- [x] **M0.5** `pnpm check` aggregate script, lefthook hooks, size-limit budget. deps: M0.3, M0.4 (b5e8ba8)
- [x] **M0.6** GitHub Actions CI (check + e2e matrix) and Pages deploy workflow. deps: M0.5 · refs: ADR-0010 (a21b7f5)
- [x] **M0.7** `README.md` (usage, dev setup), `LICENSE` (maintainer to choose; see
  ADR-0009 licence note), `THIRD_PARTY_NOTICES.md`. deps: M0.2 (6d8b936)

## M1: Domain core (pure TypeScript)

- [x] **M1.1** Inventory types (`PhoneSymbol` union, `TipaEncoding`, branded `SymbolId`) and the `Result` type. refs: ARCH §4 (23548f2)
- [x] **M1.2** RP inventory data: consonants, affricates, vowels, diphthongs and
  suprasegmentals exactly as in SPEC §7. deps: M1.1 · refs: FR-1, FR-2 (863806d)
  - AC: invariant tests cover unique IDs/IPA, NFC normalisation, `ɡ` U+0261 (not `g`),
    every RP symbol has an example with a valid highlight range, and no chart cell collisions.
- [x] **M1.3** Word model and cursor operations (insert, deleteBackward/Forward, move, clear). deps: M1.1 · refs: FR-10–FR-13, ADR-0007 (a041206)
- [x] **M1.4** IPA serialiser (with or without slashes, r-display option). deps: M1.2, M1.3 · refs: FR-11, FR-20, Q-3 (c94ecfb)
- [x] **M1.5** TIPA serialiser with boundary safety, plus a test-only TIPA tokeniser and
  fast-check round-trip tests. deps: M1.2, M1.3 · refs: FR-21, FR-22, ADR-0008 (1512d21)
  - AC: `/ˈθɔːnɪk/` → `"TO:nIk`; `/træp/` → `tr\ae{}p`; consecutive stresses never merge.
- [x] **M1.6** URL fragment codec (Word ↔ string, symbol-ID based, versioned). deps: M1.3 · refs: FR-15 (de70ac5)
- [x] **M1.7** Editor reducer with undo/redo, and settings schema with a type guard. deps: M1.3 · refs: FR-13, FR-14, FR-42 (32df53f)

## M2: UI MVP

- [x] **M2.1** Design tokens (`tokens.css`, `themes.css`) for gruvbox dark and light, a
  no-flash theme script, and a contrast unit test. refs: FR-40, ADR-0006, NFR-2 (19b6def)
- [x] **M2.2** Fonts: self-hosted Charis SIL subset (IPA glyphs used) and a mono font, with
  `font-display: swap` and preloading. refs: NFR-7 (6aa4e3a)
- [x] **M2.3** App shell: top bar, workbench card, palette area, responsive layout. deps: M2.1 · refs: SPEC §6 (c262080)
- [x] **M2.4** `SymbolKey` component (states, aria-label, tooltip with name, example, TIPA). deps: M2.1, M1.2 · refs: FR-2 (fe378cc)
- [x] **M2.5** Palette groups: `ConsonantChart` (place × manner grid), `KeyGrid`
  (affricates, diphthongs, suprasegmentals) and an initial vowel grid. deps: M2.4 · refs: FR-1 (ddf8b9a)
- [x] **M2.6** `WordDisplay` with token cursor, click-to-place cursor and keyboard editing. deps: M1.7, M2.3 · refs: FR-11–FR-13 (b71e8d7)
- [x] **M2.7** `OutputPanel`: IPA and TIPA rows, copy buttons, full-macro copy, live-region feedback. deps: M1.4, M1.5 · refs: FR-20–FR-23 (6bb3b8f)
- [x] **M2.8** URL hash sync. deps: M1.6, M2.6 · refs: FR-15 (b628b74)
- [x] **M2.9** E2E: build `/ˈθɔːnɪk/` by clicking, check both outputs, copy, reload the shared URL, and run axe. deps: M2.5–M2.8 (c45ed04)
- [ ] **M2.10** First deploy to GitHub Pages. deps: M0.6, M2.9

## M3: Polish and usability

- [x] **M3.1** `VowelTrapezoid` layout replaces the vowel grid (responsive SVG trapezoid). refs: FR-1 (56cf825)
- [x] **M3.2** Roving-tabindex keyboard navigation per group, global shortcuts, and a `?` help dialog. refs: FR-50, FR-51 (1733f8b)
- [x] **M3.3** Inventory switch (RP/Full) and filter box. refs: FR-3, FR-4 (the Full inventory is only populated in M6, so ship the switch disabled until then) (e2d9eac)
- [x] **M3.4** Settings dialog: theme, contrast, macro name, slash option, r-display,
  suggested `\newcommand` snippet. refs: FR-21, FR-40–FR-42, Q-2, Q-3 (8f24c67)
- [x] **M3.5** Collapsible groups, remembered across reloads. refs: FR-5 (cf1aaaf)
- [x] **M3.6** Saved words list (local storage, with gloss). refs: FR-16 (b8cdbec)
- [x] **M3.7** Micro-interactions: just-added pulse, pressed state, reduced-motion support. refs: SPEC §6 (1f87d73)
- [x] **M3.8** Visual regression screenshots (themes × 360/768/1280 px). refs: ADR-0005 (7f322a6)
- [x] **M3.9** Lighthouse CI budget (perf ≥ 95, a11y = 100). refs: NFR-3 (0c2fe82)

## M4: Symbol audio

- [x] **M4.1** **Spike**: evaluate Piper (ONNX Web) and espeak-ng WASM against the ADR-0009 criteria.
  Write findings into ADR-0009 and set its status to Accepted (or supersede it). Throwaway code lives in `spikes/`, and is not merged into `src/`.
- [x] **M4.2** `AudioPlayer` port, `NullAudioPlayer`, and a Web Audio playback adapter. deps: M4.1 · refs: ARCH §8
- [x] **M4.3** Build-time generation of per-symbol clips (Node script, CI-reproducible), with lazy loading and caching. deps: M4.2 · refs: FR-30, FR-33
- [ ] **M4.4** Play affordance on keys, plus the "Sound on select" toggle. deps: M4.3 · refs: FR-30, FR-34
- [x] **M4.5** Licence notices for engine, voice and runtime. refs: NFR-8

## M5: Word audio

- [ ] **M5.1** `piperPhonemeSerialiser`: Word → Piper phoneme IDs, stress moved to the vowel nucleus and a terminal `.` appended (ADR-0009 findings), with fast-check tests. deps: M4.1
- [ ] **M5.2** Worker-based synthesis adapter: lazy model fetch, Cache API, progress UI. deps: M5.1, M4.2 · refs: FR-31, FR-33
- [ ] **M5.3** "Play word" button, loading/error states, and an e2e test with a mocked worker. deps: M5.2

## M6: Extended IPA

- [ ] **M6.1** Full pulmonic consonant chart, remaining cardinal vowels, and non-pulmonic consonants. refs: SPEC §7.6
- [ ] **M6.2** Diacritics as modifier tokens (IPA combining characters, TIPA wrap macros). refs: FR-1, ARCH §4
- [ ] **M6.3** Paste-IPA tokeniser (greedy longest-match, unknown-character reporting). refs: FR-17
- [ ] **M6.4** CI TeX job: generate a `.tex` file covering every symbol, compile it with pdflatex + tipa, and fail on error. refs: FR-22, ADR-0008
- [ ] **M6.5** Optional tie-bar affricates setting (`t͡ʃ` / `\t{tS}`). refs: SPEC §7.2

## M7: Release hardening

- [ ] **M7.1** PWA: manifest, service worker (precache the app shell and fonts), offline e2e. refs: NFR-5
- [ ] **M7.2** Cross-browser manual QA checklist run (Safari iOS touch, Firefox). refs: NFR-4
- [ ] **M7.3** v1.0.0 tag, changelog generated from Conventional Commits.

---

## Backlog (unscheduled ideas)

- More export formats: X-SAMPA, Kirshenbaum, espeak mnemonics, Markdown/HTML snippet.
- Accent switch for audio (General American), e.g. a second Piper voice (ADR-0009).
- Log any words Cori still gets wrong once the terminal `.` (ADR-0009) is in place.
- M5.2: when onnxruntime-web moves to `dependencies`, re-run
  `pnpm licenses list --prod` and add whatever it bundles to `THIRD_PARTY_NOTICES.md`.
- int8 Cori is 19.5 MB vs 63.5 MB but ~60% slower on wasm (ADR-0009). Revisit
  if download size becomes the constraint (M7 PWA precache), or with WebGPU.
- "Minimal braces" TIPA output mode.
- Syllable-structure visualisation (onset/nucleus/coda colouring).
- Import/export saved words as JSON.
- Compact sticky word card on short phone screens: at 360 × 640 the sticky card
  (word, actions, both output rows) covers about 70% of the viewport. Collapse the
  output rows or un-stick below a height threshold.
- Run WebKit e2e locally on WSL: install its system libraries
  (`sudo pnpm exec playwright install-deps webkit`). CI already does this.
- Real favicon/app icon (index.html has an empty `data:,` icon to stop the
  `/favicon.ico` 404); pairs with the M7 PWA icons.
- Visual baselines were made on WSL with pinned fonts. If CI's first `visual`
  run shows anti-aliasing diffs above 1 %, regenerate the baselines from CI's
  uploaded actuals (or in the Playwright Docker image) and commit them.
- Multi-tab sync for settings and saved words (`storage` event); today the last
  tab to write wins.
- Inventory switch: enable "Full IPA" when M6 populates it, and check that the
  5.5 rem select still fits its label.
