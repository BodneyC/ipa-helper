# Cross-browser manual QA checklist (M7.2, NFR-4)

Run this against the **deployed** site (GitHub Pages), not `pnpm dev`, before each
release. Automated e2e already covers Chromium, Firefox and WebKit on desktop
(`pnpm test:e2e`). This list is for what automation can't judge: real touch,
real speakers, real installs, on-screen keyboards, and how things look.

Record each run as a new section under **Runs**: date, commit, device, OS,
browser and version, and who ran it. Mark each item ✅, ❌ (link an issue) or
➖ (not applicable). A release needs every item ✅ or ➖ on both targets.

Targets (NFR-4):

- **iOS**: Safari, latest iOS, on a phone (touch only, no keyboard).
- **Firefox**: latest release, on a desktop (mouse and keyboard).

## A. Load and layout

| # | Check | Ref |
| --- | --- | --- |
| A1 | First load shows the palette and an empty word, with no layout jump once fonts arrive. | NFR-3, NFR-7 |
| A2 | IPA glyphs render in the IPA font (ɐ ɘ ʢ ǂ ɓ look serif, never boxes or fallback shapes). | NFR-7 |
| A3 | At phone width, nothing scrolls sideways. The word card stays in view while the palette scrolls. | NFR-4, SPEC §6 |
| A4 | Rotating the phone reflows the layout without losing the word. | NFR-4 |
| A5 | Dark and light themes both look right. On iOS the browser chrome matches the theme. | FR-40, FR-60 |

## B. Building a word by touch (iOS) or mouse (Firefox)

| # | Check | Ref |
| --- | --- | --- |
| B1 | Tapping a key adds its symbol once. A quick double tap adds it twice and doesn't zoom. | FR-10, NFR-4 |
| B2 | Every key, button and toggle is easy to hit with a thumb (≥ 44 px), and neighbours don't steal taps. | NFR-4 |
| B3 | Tapping in the word moves the cursor. Backspace in the word actions deletes the token before it. | FR-12, FR-13 |
| B4 | The on-screen keyboard doesn't open unless a text field (filter, paste) is tapped, and it doesn't cover the word card while you type in the filter. | FR-4 |
| B5 | Long-pressing a key shows its name and example (or nothing), never the system text-selection menu. | FR-2 |
| B6 | Tooltips close when you tap elsewhere and don't stay stuck on screen after a tap. | FR-2 |
| B7 | Collapsing and expanding a group works by tap and is remembered after a reload. | FR-5 |
| B8 | The filter narrows the palette as you type, including with iOS autocorrect and predictive text. | FR-4 |
| B9 | Undo and redo (buttons, and Ctrl+Z / Ctrl+Shift+Z in Firefox) cover every edit. | FR-14 |

## C. Output and sharing

| # | Check | Ref |
| --- | --- | --- |
| C1 | Copy IPA and Copy TIPA put the right text on the clipboard. Paste into Notes (iOS) or a text editor (Firefox) to check. | FR-20, FR-21 |
| C2 | A "Copied" confirmation appears after each copy. With VoiceOver (iOS), it is read aloud. | FR-23 |
| C3 | Sharing the URL (iOS share sheet, or copy the address) and opening it elsewhere restores the word. | FR-15 |
| C4 | Paste IPA accepts text pasted from another app and reports unknown characters. | FR-17 |
| C5 | Saved words survive closing and reopening the browser. | FR-16 |

## D. Audio (real speakers or headphones)

| # | Check | Ref |
| --- | --- | --- |
| D1 | iOS: with the ring/silent switch **on**, a symbol's play button makes sound on the first tap. | FR-30 |
| D2 | Symbol clips sound like British English and aren't clipped at the start or end. | FR-30 |
| D3 | Play word shows loading progress the first time, then speaks the word. A second word plays without the wait. | FR-31, FR-33 |
| D4 | "Sound on select" plays each symbol as it is added, and stays off by default. | FR-34 |
| D5 | Quickly tapping several play buttons cuts the earlier sound off instead of overlapping. | FR-30 |

## E. Install and offline

| # | Check | Ref |
| --- | --- | --- |
| E1 | iOS: Share → Add to Home Screen shows the schwa icon and the name "ipa-helper", and the installed app opens full screen. Firefox: ➖ unless it offers to install. | FR-60 |
| E2 | After one visit, switch on Airplane Mode (iOS) or Work Offline / disconnect (Firefox) and reload: the app loads and works. | FR-61 |
| E3 | Offline, a symbol you played earlier still plays. Offline, a word you played earlier still speaks. | FR-61, FR-33 |
| E4 | After a new deploy, the open app shows "A new version of ipa-helper is ready". Reload switches to it, and Later hides the notice. | FR-62 |
| E5 | Settings, saved words and the theme are kept after switching versions. | FR-42, FR-62 |

## F. Settings, accessibility and privacy

| # | Check | Ref |
| --- | --- | --- |
| F1 | Theme, contrast, inventory, r display, tie bars and "Sound on select" all apply at once and are remembered. | FR-40 – FR-42 |
| F2 | iOS: with VoiceOver on, keys read as "symbol, name", and dialogs trap and return focus. | NFR-2 |
| F3 | Firefox: the whole app works with the keyboard alone, with focus visible at every step. Shortcuts behave as the `?` help dialog says. | FR-50, FR-51 |
| F4 | iOS: Settings → Accessibility → Display & Text Size → Larger Text doesn't clip or overlap anything. | NFR-2 |
| F5 | Reduce Motion (iOS) or `prefers-reduced-motion` (Firefox) removes the movement animations. | NFR-2 |
| F6 | Firefox's network panel shows no request to any other origin, even after playing audio. | NFR-6 |

## Runs

<!--
### YYYY-MM-DD · <commit> · <device>, <OS> · <browser> <version> · <tester>

| A1 | A2 | A3 | … |
| --- | --- | --- | --- |
| ✅ | ✅ | ❌ #12 | … |

Notes: …
-->

### 2026-11-05 · bd32f3d · automated only (no manual run yet)

`pnpm test:e2e --project=chromium --project=firefox`: 132 passed, including
`pwa.spec.ts` (FR-60 – FR-62) on Firefox. That covers parts of A, B (mouse and
keyboard), C1–C5, E2 and E4 on desktop Firefox in Playwright. It is **not** the
manual run M7.2 needs. The iOS Safari touch run and the Firefox desktop run
above are still to do.
