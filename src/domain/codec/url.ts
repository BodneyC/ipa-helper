import { SYMBOLS } from '../inventory';
import { parseSymbolId } from '../inventory/symbol-id';
import type { SymbolId } from '../inventory/symbol-id';
import type { PhoneSymbol } from '../inventory/types';
import { err, ok } from '../result';
import type { Result } from '../result';
import { EMPTY_WORD, idsOf, wordFromIds } from '../word/word';
import type { Word } from '../word/word';

/**
 * FR-15: a word in the URL fragment, e.g. `#w=1:primary-stress.theta.n`.
 *
 * - It holds symbol IDs, not IPA, so links survive glyph changes (ADR-0007).
 *   IDs are URL-safe, so they need no escaping.
 * - `1:` is the format version. A future format bumps it, and old links still
 *   decode (or fail with `unsupported-version`).
 * - Other `&`-separated parameters are ignored, so the fragment can grow.
 */
const PARAM = 'w';
const VERSION = '1';

/** Why a fragment could not be decoded. The app ignores it and shows a notice (FR-15). */
export type FragmentError =
  | { readonly kind: 'malformed'; readonly fragment: string }
  | { readonly kind: 'unsupported-version'; readonly version: string }
  | { readonly kind: 'unknown-symbol'; readonly id: string };

/** Encodes a word as a fragment, without the `#`. The empty word encodes as `""`. */
export const encodeWord = (word: Word): string =>
  word.length === 0 ? '' : `${PARAM}=${VERSION}:${idsOf(word).join('.')}`;

const decodeComponent = (text: string): string | undefined => {
  try {
    return decodeURIComponent(text);
  } catch {
    return undefined;
  }
};

/**
 * Decodes a fragment (with or without its `#`). A fragment with no word in it
 * decodes to the empty word. `symbols` defaults to the registry; IDs it doesn't
 * know are rejected.
 */
export const decodeWord = (
  fragment: string,
  symbols: readonly PhoneSymbol[] = SYMBOLS,
): Result<Word, FragmentError> => {
  const params = fragment.replace(/^#/, '').split('&');
  const raw = params.find((p) => p.startsWith(`${PARAM}=`))?.slice(PARAM.length + 1);
  if (raw === undefined) return ok(EMPTY_WORD);

  const value = decodeComponent(raw);
  const match = value === undefined ? null : /^(\d+):(.*)$/.exec(value);
  if (match === null) return err({ kind: 'malformed', fragment });
  const [, version = '', body = ''] = match;
  if (version !== VERSION) return err({ kind: 'unsupported-version', version });
  if (body === '') return ok(EMPTY_WORD);

  const known = new Set(symbols.map((s) => s.id));
  const ids: SymbolId[] = [];
  for (const part of body.split('.')) {
    const id = parseSymbolId(part);
    if (!id.ok || !known.has(id.value)) return err({ kind: 'unknown-symbol', id: part });
    ids.push(id.value);
  }
  return ok(wordFromIds(ids));
};
