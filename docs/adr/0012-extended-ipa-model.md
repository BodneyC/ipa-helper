# 0012. Extend the symbol model for the full IPA: commands, diacritics, tie bars and paste

- Status: Proposed
- Date: 2026-11-05
- Relates to: FR-1, FR-3, FR-17, FR-22, FR-30, SPEC §7.2, §7.6, ADR-0007, ADR-0008

## Context
Milestone M6 fills the `extended` inventory (SPEC §7.6): the rest of the
pulmonic chart, the remaining cardinal vowels, the non-pulmonic consonants
and the diacritics. It also adds paste (FR-17) and optional tie bars (§7.2).
The model from ADR-0007/0008 (literal | macro | wrap encodings, five sound
categories) does not cover all of that. Compiling candidate encodings with
`pdflatex` + `tipa` (TeX Live 2023) settled these facts:

- Some symbols need a TIPA command **with an argument**. `ç` is `\c{c}`: TIPA's
  shortcut `C` is `ɕ`, not `ç`. Superscript modifiers are `\super{h}`,
  `\super{\textgamma}`. The tie bar is `\t{tS}`. None of these is a bare
  `\name{}` macro, and a wrap encloses the *preceding* token, not a fixed text.
- Combining diacritics have long-form wrapping macros (`\textsubring{n}`,
  `\textsubbridge{t}`, `\~{e}`). Spacing modifiers (`ʰ ʷ ʲ ˠ ˤ ⁿ ˡ ˞ ʼ`) follow
  their base in both IPA and TIPA.
- TIPA has no glyph for the labiodental flap `ⱱ` (added to the IPA in 2005).
- New single-character literals (`a o y c q r ! '`) don't form TIPA shortcuts
  with their neighbours: `!b` stays ǃb (the implosive composites need `\!b`),
  and `''` is two kerned apostrophes, not a ligature. The font's only
  ligatures are `||` and `""`.
- Non-pulmonic consonants (clicks, implosives) aren't part of the pulmonic
  chart; the IPA chart prints them in a separate table.
- The symbol clips (M4.3) cover the RP sounds only. Extended sounds have none,
  so a play button on them would always fail.

## Options considered
1. **Encode the new cases as macros or literals only.** + No model change.
   − `ç` would need the wrong shortcut (`C` = ɕ) or a raw `\c{c}` written as a
   "macro" named `c{c`, which breaks the `\name{}` rule and the reference
   tokeniser. Superscripts and tie bars can't be expressed at all.
2. **Add a `command` encoding: a complete, self-delimiting TeX fragment.**
   It starts with a control word and ends with `}`, so nothing before or after
   it can merge with it. + Covers `\c{c}`, `\super{…}` and `\t{…}` with one rule.
   + The serialiser treats it like a braced macro. − One more encoding kind
   for every consumer to handle (the switch is exhaustive, so the compiler
   finds them).
3. **Store tie-bar affricates as separate symbols.** + No rendering option.
   − Duplicates every affricate, makes `tʃ` and `t͡ʃ` different words in URLs
   and saved words, and doubles the palette. Spec §7.2 calls it a setting.
4. **Put clicks and implosives in the pulmonic chart as extra rows.** − The
   IPA chart doesn't, and a lateral click needs its own row. A separate group
   matches the chart users know.

## Decision
We will extend the model as follows (options 2 and 4, not 3):

- **`TipaEncoding` gains `{ kind: 'command'; text }`**, a complete TeX
  fragment that starts with `\` + a control word and ends with `}`. The TIPA
  serialiser writes it as is. It counts as a boundary on both sides, like a
  braced macro, so it never needs a separator.
- **Diacritics** are `category: 'diacritic'` tokens in the `extended`
  inventory. A combining diacritic uses a `wrap` encoding (long-form macro, or
  `\~` / `\"` where TIPA has no long name). A spacing modifier uses `command`,
  `macro` or `literal` and simply follows its base. In IPA every diacritic is
  its own code point after the base. Palette keys show diacritics on a dotted
  circle `◌` (U+25CC, added to the IPA font subset).
- **Non-pulmonic consonants** get their own category, `non-pulmonic`
  (manners `click`, `lateral-click`, `implosive`), shown as a separate palette
  group after the affricates. Ejectives are written with the ejective
  diacritic `ʼ` (`'` in TIPA), as the IPA chart's examples are.
- **`ⱱ` is left out** of the inventory until TIPA (or a replacement) can
  typeset it, because FR-22 requires every symbol to compile.
- **Tie bars are a rendering option** (`tieBars`, with `rDisplay`): an
  affricate `XY` renders as `X͡Y` in IPA and as `\t{…}` around its literal in
  TIPA. Words, URLs and saved words don't change.
- **Paste (FR-17)** normalises to NFD, trims surrounding whitespace and a
  surrounding `/…/` or `[…]`, then takes the longest symbol (or alias) that
  matches at each position. Aliases: ASCII `g` → `ɡ`, `:` → `ː`, tied
  affricates → the affricate, and `r` → `ɹ` when the British r is shown broad
  (Q-3). Anything else, including inner spaces, is reported with its position
  and the word isn't changed.
- **Playable symbols**: the `AudioPlayer` port gains `canPlaySymbol(id)`, true
  only for symbols with a clip. Keys without one show no play affordance.
  *Update (#14): every one of the 73 full-IPA-only sounds now has a clip, so
  none is listed as one the voice can't produce. Cori was trained on English,
  so many are approximations. The maintainer chose defaults rather than
  picking each one by ear: schwas either side with a comma (`əçˈə,`) for
  consonants, and stressed with a comma (`ˈy,`) for vowels. Any can be
  re-picked with `pnpm audio:extended`, and one picked NONE there loses its
  clip and is listed here.*

## Consequences
- The serialiser, labels, filter and the TIPA reference tokeniser each handle
  one more encoding kind. The M6.4 compile test covers every `command`.
- Every diacritic and tied affricate goes through the same `pdflatex` job as
  plain symbols, so a wrong macro name fails CI.
- Extended sounds can't be played on their own until clips exist for them
  (backlog). Word audio still tries them; a phoneme the voice lacks fails
  that word with an error rather than a silent skip.
- If the TIPA project, or a successor such as `fontspec` with Unicode IPA,
  gains `ⱱ`, add it then.
