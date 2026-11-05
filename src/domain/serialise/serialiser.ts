import { SYMBOLS } from '../inventory';
import { command, lit } from '../inventory/encoding';
import { symbolId } from '../inventory/symbol-id';
import type { PhoneSymbol, TipaEncoding } from '../inventory/types';
import { assertNever } from '../result';
import type { Word } from '../word/word';

/** Projects a word onto one output notation (ARCHITECTURE §4.1, ADR-0008). */
export interface Serialiser {
  /** Stable name of the notation, e.g. `"ipa"`, `"tipa"`. */
  readonly id: string;
  serialise(word: Word): string;
}

/**
 * How to display the British "r" (Q-3): `narrow` is `ɹ`, as the inventory
 * stores it, and `broad` is `r`, the dictionary convention.
 */
export type RDisplay = 'narrow' | 'broad';

/** How symbols are drawn, wherever they appear: keys, the word, both outputs. */
export interface GlyphOptions {
  readonly rDisplay: RDisplay;
  /** SPEC §7.2 (M6.5): write affricates with a tie bar, `t͡ʃ` and `\t{tS}`. */
  readonly tieBars: boolean;
}

/** Options shared by the serialisers that show a transcription. */
export interface DisplayOptions extends GlyphOptions {
  /** Wrap the output in `/…/` (FR-20, Q-2). */
  readonly slashes: boolean;
}

/** What a serialiser writes for one token. */
export interface Rendering {
  readonly ipa: string;
  readonly tipa: TipaEncoding;
}

const TURNED_R = symbolId('turned-r');

/** How the broad r (Q-3) is written. */
export const BROAD_R: Rendering = { ipa: 'r', tipa: lit('r') };

/**
 * Returns a function that maps a word to its symbols. A word only ever holds
 * known IDs (the URL codec and the palette both validate them), so an unknown
 * ID is a programming error and throws.
 *
 * `symbols` defaults to the whole registry. Tests pass their own fixtures.
 */
export const createResolver = (
  symbols: readonly PhoneSymbol[] = SYMBOLS,
): ((word: Word) => readonly PhoneSymbol[]) => {
  const byId = new Map(symbols.map((s) => [s.id, s]));
  return (word) =>
    word.map(({ symbolId: id }) => {
      const symbol = byId.get(id);
      if (symbol === undefined) throw new Error(`Word holds an unknown symbol ID: ${id}`);
      return symbol;
    });
};

const TIE_BAR = '\u0361';

/** `tʃ` → `t͡ʃ`: a tie bar after the first code point (SPEC §7.2). */
export const tieBarred = (ipa: string): string => ipa.replace(/^(.)/su, `$1${TIE_BAR}`);

/**
 * A TIPA encoding written on its own, e.g. `S`, `\ae{}`, `\c{c}`, or a wrap
 * around nothing, `\~{}`.
 */
export const standalone = (tipa: TipaEncoding): string => {
  switch (tipa.kind) {
    case 'literal':
    case 'command':
      return tipa.text;
    case 'macro':
    case 'wrap':
      return `\\${tipa.name}{}`;
    default:
      return assertNever(tipa);
  }
};

/**
 * How `symbol` is written under the glyph options: the broad r (Q-3), and an
 * affricate under a tie bar (SPEC §7.2), `t͡ʃ` in IPA and `\t{tS}` in TIPA.
 */
export const rendering = (symbol: PhoneSymbol, { rDisplay, tieBars }: GlyphOptions): Rendering => {
  if (rDisplay === 'broad' && symbol.id === TURNED_R) return BROAD_R;
  if (tieBars && symbol.category === 'affricate') {
    return { ipa: tieBarred(symbol.ipa), tipa: command(`\\t{${standalone(symbol.tipa)}}`) };
  }
  return symbol;
};

/** Wraps `text` in slashes when asked to. */
export const withSlashes = (text: string, slashes: boolean): string =>
  slashes ? `/${text}/` : text;
