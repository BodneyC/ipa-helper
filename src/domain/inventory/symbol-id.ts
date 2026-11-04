import { err, ok } from '../result';
import type { Result } from '../result';

/**
 * Stable identifier of an inventory symbol, e.g. `"esh"`, `"tesh"`, `"i-long"`.
 *
 * Branded so that an arbitrary string (a URL fragment, a pasted value) can't be
 * used where a validated ID is expected. URLs encode words by ID (ADR-0007), so
 * IDs must stay stable even when display glyphs change.
 */
export type SymbolId = string & { readonly __brand: 'SymbolId' };

/** Why a string was rejected as a {@link SymbolId}. */
export interface InvalidSymbolId {
  readonly kind: 'invalid-symbol-id';
  readonly raw: string;
}

/**
 * Lowercase ASCII words joined by single hyphens, starting with a letter. It is
 * URL-safe without escaping, which keeps shared links short and readable.
 */
const SYMBOL_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** True when `raw` has the shape of a {@link SymbolId}. It doesn't check that the symbol exists. */
export const isSymbolId = (raw: string): raw is SymbolId => SYMBOL_ID_PATTERN.test(raw);

/** Validates untrusted input (URL fragments, storage) as a {@link SymbolId}. */
export const parseSymbolId = (raw: string): Result<SymbolId, InvalidSymbolId> =>
  isSymbolId(raw) ? ok(raw) : err({ kind: 'invalid-symbol-id', raw });

/**
 * Brands an ID written in the static inventory data. A malformed ID there is a
 * programming error, not an expected failure, so this throws (when the module
 * loads, which makes any unit test fail) rather than returning a `Result`.
 */
export const symbolId = (raw: string): SymbolId => {
  if (isSymbolId(raw)) return raw;
  throw new Error(`Malformed symbol ID in inventory data: ${JSON.stringify(raw)}`);
};
