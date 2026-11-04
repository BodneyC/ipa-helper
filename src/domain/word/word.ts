import type { SymbolId } from '../inventory/symbol-id';

/**
 * One occurrence of a symbol in a word (ADR-0007). `key` is unique within its
 * word and never reused while the token exists, so React can use it as list
 * identity when tokens move.
 */
export interface Token {
  readonly key: number;
  readonly symbolId: SymbolId;
}

/** A word: an ordered list of tokens, not a string (ADR-0007). */
export type Word = readonly Token[];

/** The word with no tokens. */
export const EMPTY_WORD: Word = [];

/** Builds a word from symbol IDs, with keys 0…n−1 (from a URL or a paste). */
export const wordFromIds = (ids: readonly SymbolId[]): Word =>
  ids.map((symbolId, key) => ({ key, symbolId }));

/** The symbol IDs of a word's tokens, in order. */
export const idsOf = (word: Word): readonly SymbolId[] => word.map((t) => t.symbolId);

/** A key that no token in `word` uses. */
export const freshKey = (word: Word): number =>
  word.reduce((max, token) => Math.max(max, token.key), -1) + 1;
