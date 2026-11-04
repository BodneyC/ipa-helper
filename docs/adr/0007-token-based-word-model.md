# 0007. Words are token lists, not strings

- Status: Accepted
- Date: 2026-11-04
- Relates to: FR-10–FR-15, FR-22

## Context
IPA symbols are often multi-codepoint (`tʃ`, `eɪ`, `iː`, combining diacritics).
TIPA encodings aren't a codepoint-level mapping (`æ` → `\ae{}`, `ˌ` → `""`). If
the word were stored as a string, deleting "one symbol" would mean grapheme
segmentation heuristics, and producing TIPA would mean re-tokenising the IPA
ambiguously (is `tʃ` one affricate or `t` + `ʃ`?).

## Decision
The canonical word is `readonly Token[]`, where each token references a `SymbolId`.
All editing operations work on tokens. Every output (IPA, TIPA, URL, audio
phonemes) is a **projection** of the token list via a serialiser. Parsing a
string into tokens (paste, M6) is a separate, explicitly lossy-aware operation
that returns `Result`.

## Consequences
- Cursor and deletion semantics are trivial and correct.
- `t`+`ʃ` and `tʃ` are distinct words that render identically in IPA. This is
  deliberate: TIPA output and audio may differ. The UI can show token boundaries
  on hover.
- URL encoding uses symbol IDs, not IPA text, so links stay stable even if
  display glyphs change (e.g. the r-display setting).
