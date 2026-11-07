# 0017. Put the IPA's remaining "other symbols" in a group of their own

- Status: Accepted
- Date: 2026-11-07
- Relates to: FR-1, FR-17, FR-22, SPEC §7.6, ADR-0012, #16

## Context
The full inventory (M6.1) lacks eight consonants that the IPA chart lists
under "Other symbols": ɥ ʜ ʢ ʡ ɕ ʑ ɺ ɧ (#16). The labiodental flap ⱱ is also
missing, but TIPA can't typeset it, so it stays out (ADR-0012).

Two of the chart's other symbols are already in the app, as consonants with a
place and manner: w and ʍ, in a `labial-velar` column. The eight
left do not fit that way:

- ɕ ʑ (alveolo-palatal), ɥ (labial-palatal) and ʜ ʢ ʡ (epiglottal) would each need a new
  chart column that the IPA's own pulmonic chart doesn't have. Some
  columns would hold one symbol.
- ɺ (alveolar lateral flap) would need a new row.
- ɧ is "simultaneous ʃ and x", which has no single place.

## Options considered
1. **Add columns and rows to the consonant chart.** + every consonant has a
   place × manner · − the chart stops matching the IPA chart, it widens on a
   phone where it already scrolls, and ɧ still needs a made-up place.
2. **A grid group, "Other symbols", as on the IPA chart.** + matches the chart
   people learn from · + no invented places · − these symbols carry no place or
   manner, only a name.

## Decision
We will use option 2. A new category, `other`, holds ɥ ʜ ʢ ʡ ɕ ʑ ɺ ɧ in the IPA
chart's order. It is in the `extended` inventory only. The palette shows it as an "Other
symbols" `KeyGrid` after the non-pulmonic consonants, in the consonant
accent. Its symbols are an `OtherSymbol` variant of `PhoneSymbol` with no
place, manner or voicing: the IPA name ("voiceless epiglottal fricative",
"simultaneous ʃ and x") says what each one is. w and ʍ stay where they are in
the chart.

The TIPA encodings are the long-form macros (SPEC §7.6): `\textturnh`,
`\textsch`, `\textbarrevglotstop`, `\textbarglotstop`, `\textctc`, `\textctz`,
`\textturnlonglegr`, `\texththeng`. The voice has a phoneme ID for each of them,
so they can be spoken.

## Consequences
- Every symbol needs the same tests as the others: the inventory invariants,
  the TeX compile of each symbol and each ordered pair, the font-coverage
  test, and the paste tokeniser. Nothing new is needed for these, because all of them read
  from `SYMBOLS`, and the letters are in IPA Extensions, which the Charis
  subset already includes.
- IDs are additive, so existing share URLs (ADR-0007) keep working.
- Stored collapsed-group settings are validated per value, so the new group
  starts expanded.
- ⱱ is still missing. It can go in this group once something can typeset it.
