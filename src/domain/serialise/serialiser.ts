import { SYMBOLS } from '../inventory';
import { lit } from '../inventory/encoding';
import { symbolId } from '../inventory/symbol-id';
import type { PhoneSymbol, TipaEncoding } from '../inventory/types';
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

/** Options shared by the serialisers that show a transcription. */
export interface DisplayOptions {
  /** Wrap the output in `/…/` (FR-20, Q-2). */
  readonly slashes: boolean;
  readonly rDisplay: RDisplay;
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

/** How `symbol` is written under the display options (Q-3 r-display). */
export const rendering = (symbol: PhoneSymbol, rDisplay: RDisplay): Rendering =>
  rDisplay === 'broad' && symbol.id === TURNED_R ? BROAD_R : symbol;

/** Wraps `text` in slashes when asked to. */
export const withSlashes = (text: string, slashes: boolean): string =>
  slashes ? `/${text}/` : text;
