import { SYMBOLS } from '../inventory';
import type { SymbolId } from '../inventory/symbol-id';
import type { PhoneSymbol } from '../inventory/types';
import { err, ok } from '../result';
import type { Result } from '../result';
import type { RDisplay } from '../serialise/serialiser';
import { wordFromIds } from '../word/word';
import type { Word } from '../word/word';

/** A character the tokeniser doesn't know (FR-17). */
export interface UnknownCharacter {
  /** The character: one code point, decomposed (NFD). */
  readonly text: string;
  /** Its position in the trimmed, decomposed input, counted in code points from 0. */
  readonly index: number;
}

/** What the tokeniser needs to know about the display (Q-3). */
interface TokeniserOptions {
  /** With `broad`, a plain `r` is the British r `ɹ`, as the app displays it. */
  readonly rDisplay: RDisplay;
}

const TIE_BAR = '͡';

/**
 * ASCII stand-ins people type for IPA characters: `g` for `ɡ` and `:` for `ː`,
 * so `i:` reads as `iː` (ADR-0012).
 */
const asciiVariant = (ipa: string): string => ipa.replaceAll('ɡ', 'g').replaceAll('ː', ':');

/** An affricate written with a tie bar, `t͡ʃ`, or `undefined` if it isn't two code points. */
const tied = (symbol: PhoneSymbol): string | undefined => {
  const [first, second, ...rest] = Array.from(symbol.ipa);
  return symbol.category === 'affricate' &&
    first !== undefined &&
    second !== undefined &&
    rest.length === 0
    ? first + TIE_BAR + second
    : undefined;
};

/** Every spelling the tokeniser accepts, decomposed, mapped to its symbol. */
const spellings = (
  symbols: readonly PhoneSymbol[],
  { rDisplay }: TokeniserOptions,
): ReadonlyMap<string, SymbolId> => {
  const map = new Map<string, SymbolId>();
  const add = (text: string | undefined, id: SymbolId, override = false) => {
    if (text === undefined) return;
    const key = text.normalize('NFD');
    if (override || !map.has(key)) map.set(key, id);
  };
  // Real spellings first, so an alias never hides one.
  for (const s of symbols) add(s.ipa, s.id, true);
  for (const s of symbols) {
    add(asciiVariant(s.ipa), s.id);
    add(tied(s), s.id);
  }
  // Q-3: the broad display writes ɹ as r, so read r back as ɹ.
  const turnedR = symbols.find((s) => s.ipa === 'ɹ');
  if (rDisplay === 'broad' && turnedR !== undefined) add('r', turnedR.id, true);
  return map;
};

/** Strips surrounding whitespace, then one pair of enclosing `/…/` or `[…]`. */
const unwrap = (text: string): string => {
  const trimmed = text.trim();
  const enclosed =
    trimmed.length >= 2 &&
    ((trimmed.startsWith('/') && trimmed.endsWith('/')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']')));
  return enclosed ? trimmed.slice(1, -1).trim() : trimmed;
};

/**
 * FR-17: reads pasted IPA into a word (ADR-0007, ADR-0012). The text is
 * decomposed (NFD), so a precomposed `ẽ` reads as `e` + nasalised. Surrounding
 * whitespace and one pair of `/…/` or `[…]` are ignored. At each position the
 * longest known spelling wins, so `tʃ` is the affricate and `iː` the long vowel.
 *
 * Fails with every character it doesn't know, inner spaces included, rather
 * than dropping them. `symbols` defaults to the whole registry.
 */
export const createIpaTokeniser = (
  options: TokeniserOptions,
  symbols: readonly PhoneSymbol[] = SYMBOLS,
): ((text: string) => Result<Word, readonly UnknownCharacter[]>) => {
  const known = spellings(symbols, options);
  /** The longest spelling, in code points. */
  const longest = Math.max(0, ...[...known.keys()].map((k) => Array.from(k).length));
  return (text) => {
    const chars = Array.from(unwrap(text.normalize('NFD')));
    /** The longest known spelling starting at `index`, as [code points, symbol]. */
    const matchAt = (index: number): readonly [number, SymbolId] | undefined => {
      for (let length = Math.min(longest, chars.length - index); length > 0; length--) {
        const id = known.get(chars.slice(index, index + length).join(''));
        if (id !== undefined) return [length, id];
      }
      return undefined;
    };
    const ids: SymbolId[] = [];
    const unknown: UnknownCharacter[] = [];
    let index = 0;
    while (index < chars.length) {
      const match = matchAt(index);
      if (match === undefined) {
        unknown.push({ text: chars.slice(index, index + 1).join(''), index });
        index += 1;
      } else {
        ids.push(match[1]);
        index += match[0];
      }
    }
    return unknown.length > 0 ? err(unknown) : ok(wordFromIds(ids));
  };
};
