import { SYMBOLS } from '../inventory';
import { assertNever } from '../result';
import { BROAD_R, createResolver, rendering, withSlashes } from './serialiser';
import type { DisplayOptions, Serialiser } from './serialiser';
import type { PhoneSymbol } from '../inventory/types';

/** Breaks up TIPA input characters that would otherwise be read together. */
const SEPARATOR = '{}';

/**
 * True when writing literal `next` straight after literal `prev` would let TIPA
 * read a different shortcut across the boundary (FR-22, ADR-0008). That happens
 * when some literal in `literals` starts with a suffix of `prev` and continues
 * into `next`: `"` + `"` reads as `""` (secondary stress), `t` + `S` as the
 * affricate `tS`, and `i` + `:` as `i:`.
 *
 * It is conservative: a literal that would run past `next` also counts, even
 * though the token after `next` might not continue it.
 */
export const needsSeparator = (prev: string, next: string, literals: readonly string[]): boolean =>
  literals.some((literal) => {
    for (let split = 1; split < literal.length; split++) {
      const head = literal.slice(0, split);
      const tail = literal.slice(split);
      if (prev.endsWith(head) && (next.startsWith(tail) || tail.startsWith(next))) return true;
    }
    return false;
  });

/** Every literal TIPA text the serialiser can write, broad r included. */
const literalsOf = (symbols: readonly PhoneSymbol[]): readonly string[] =>
  [...symbols.map((s) => s.tipa), BROAD_R.tipa].flatMap((t) =>
    t.kind === 'literal' ? [t.text] : [],
  );

/** One token's output, plus whether a `{}` goes in front of it. */
interface Piece {
  readonly separated: boolean;
  readonly body: string;
  /** The literal text when the body is a bare literal, for the next boundary check. */
  readonly literal: string | undefined;
}

const join = (pieces: readonly Piece[]): string =>
  pieces.map((p) => (p.separated ? SEPARATOR + p.body : p.body)).join('');

/**
 * FR-21, FR-22: the TIPA source that goes inside `\ipa{…}`, e.g. `"TO:nIk` for
 * /ˈθɔːnɪk/.
 *
 * - Macros are always written `\name{}`, so a following letter can't extend the
 *   control word (`\ae{}p`, not `\aep`).
 * - Literals get a `{}` between them when they would otherwise merge into a
 *   different shortcut (see {@link needsSeparator}). So `"{}"` is two primary
 *   stresses, never one secondary stress.
 * - A `wrap` encoding (diacritics, M6) encloses the preceding token, as in
 *   `\~{e}`. With no preceding token it wraps an empty group.
 */
export const createTipaSerialiser = (
  { slashes, rDisplay }: DisplayOptions,
  symbols: readonly PhoneSymbol[] = SYMBOLS,
): Serialiser => {
  const resolve = createResolver(symbols);
  const literals = literalsOf(symbols);

  const append = (pieces: readonly Piece[], symbol: PhoneSymbol): readonly Piece[] => {
    const { tipa } = rendering(symbol, rDisplay);
    const last = pieces.at(-1);
    switch (tipa.kind) {
      case 'literal': {
        const prev = last?.literal;
        const separated = prev !== undefined && needsSeparator(prev, tipa.text, literals);
        return [...pieces, { separated, body: tipa.text, literal: tipa.text }];
      }
      case 'macro':
        return [...pieces, { separated: false, body: `\\${tipa.name}{}`, literal: undefined }];
      case 'wrap': {
        // The macro's backslash now starts the boundary, so the wrapped token's
        // separator is no longer needed.
        const kept = last === undefined ? pieces : pieces.slice(0, -1);
        const body = `\\${tipa.name}{${last?.body ?? ''}}`;
        return [...kept, { separated: false, body, literal: undefined }];
      }
      default:
        return assertNever(tipa);
    }
  };

  return {
    id: 'tipa',
    serialise: (word) => withSlashes(join(resolve(word).reduce(append, [])), slashes),
  };
};
