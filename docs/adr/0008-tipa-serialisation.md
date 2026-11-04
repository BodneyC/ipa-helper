# 0008. TIPA output via per-token encodings and a pluggable serialiser

- Status: Accepted
- Date: 2026-11-04
- Relates to: FR-21, FR-22, SPEC §7

## Context
Users need the string to put inside `\ipa{…}` (assumed to wrap `\textipa`).
TIPA has single-character shortcuts (`S`=ʃ, `N`=ŋ, `@`=ə, `"`=ˈ) and long-form
macros (`\textturnr`, `\ae`). Naive concatenation breaks in two ways:
- `\ae` followed by a letter becomes a different, undefined control word (`\aen`).
- Shortcut sequences merge: two `"` tokens become `""` (secondary stress).

## Decision
- Each symbol carries a typed `TipaEncoding` (`literal` | `macro` | `wrap`).
- `tipaSerialiser` emits macros as `\name{}` (always braced, which is the simplest
  rule that is always correct), and inserts `{}` between literal tokens whose
  concatenation would form a different TIPA shortcut. The list of colliding pairs
  is generated from the inventory and unit-tested.
- Prefer long-form macros over obscure shortcuts for anything beyond the common
  set (SPEC §7, entries marked †). Readability beats terseness for users who
  may hand-edit the output.
- A test-only reference tokeniser for the TIPA subset we emit makes round-trip
  property tests possible.
- M6.4 adds a CI job that compiles a generated `.tex` with every symbol, using
  `pdflatex` + `tipa`. It is the source of truth for "the encoding is correct".
- The `Serialiser` interface allows X-SAMPA, Kirshenbaum and synthesis-phoneme
  serialisers later without touching the UI.

## Consequences
- Output can include `{}` that a human wouldn't write. That is acceptable and
  correct. An optional "minimal braces" mode can come later if users ask.
- Separate tokens whose literals would read as one symbol are kept apart too:
  `t`+`ʃ` is `t{}S` (the affricate `tʃ` is `tS`), `i`+`ː` is `i{}:`. The
  glyphs are the same, but the TIPA round-trips to the same tokens (ADR-0007).
  The check (`needsSeparator`) is conservative: it also separates when a
  literal could run past the next token.
