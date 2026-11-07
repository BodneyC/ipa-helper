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

/** Options for the TIPA serialiser. */
export interface TipaOptions extends DisplayOptions {
  /**
   * FR-24: brace a macro only where a letter follows, and then with a space
   * (`tr\ae p`, `\ae"`), instead of always (`tr\ae{}p`). Default off.
   */
  readonly minimalBraces?: boolean;
}

/** One token's output, plus whether a `{}` goes in front of it. */
interface Piece {
  readonly separated: boolean;
  readonly body: string;
  /** The literal text when the body is a bare literal, for the next boundary check. */
  readonly literal: string | undefined;
  /** The body ends in a bare control word (`\ae`), which a following letter would extend. */
  readonly openControlWord: boolean;
}

const startsWithLetter = (text: string): boolean => /^[a-zA-Z]/.test(text);

/**
 * A piece as written, given what comes next. A space ends a control word and
 * prints nothing. (Only literals follow a `{}` separator, and they come after
 * literals, so a separator never sits right after a control word.)
 */
const written = (piece: Piece, next: Piece | undefined): string =>
  piece.openControlWord && startsWithLetter(next?.body ?? '') ? `${piece.body} ` : piece.body;

const join = (pieces: readonly Piece[]): string =>
  pieces.map((p, i) => (p.separated ? SEPARATOR : '') + written(p, pieces[i + 1])).join('');

/**
 * FR-21, FR-22: the TIPA source that goes inside `\ipa{…}`, e.g. `"TO:nIk` for
 * /ˈθɔːnɪk/.
 *
 * - Macros are always written `\name{}`, so a following letter can't extend the
 *   control word (`\ae{}p`, not `\aep`). With `minimalBraces` (FR-24), a
 *   letters-only macro is written bare, and followed by a space only when a
 *   letter comes next (`\ae p`, `\ae"`, `\ae` at the end). A `command` (`\c{c}`) already ends
 *   in `}`, so it is written as it is (ADR-0012).
 * - Literals get a `{}` between them when they would otherwise merge into a
 *   different shortcut (see {@link needsSeparator}). So `"{}"` is two primary
 *   stresses, never one secondary stress.
 * - A `wrap` encoding (diacritics, M6) encloses the preceding token, as in
 *   `\~{e}`. With no preceding token it wraps an empty group.
 */
export const createTipaSerialiser = (
  { slashes, minimalBraces = false, ...glyphs }: TipaOptions,
  symbols: readonly PhoneSymbol[] = SYMBOLS,
): Serialiser => {
  const resolve = createResolver(symbols);
  const literals = literalsOf(symbols);

  const append = (pieces: readonly Piece[], symbol: PhoneSymbol): readonly Piece[] => {
    const { tipa } = rendering(symbol, glyphs);
    const last = pieces.at(-1);
    switch (tipa.kind) {
      case 'literal': {
        const prev = last?.literal;
        const separated = prev !== undefined && needsSeparator(prev, tipa.text, literals);
        return [
          ...pieces,
          { separated, body: tipa.text, literal: tipa.text, openControlWord: false },
        ];
      }
      case 'macro': {
        // A control symbol (`\'`) could take the next token as an argument, so it keeps `{}`.
        const bare = minimalBraces && /^[a-zA-Z]+$/.test(tipa.name);
        const body = bare ? `\\${tipa.name}` : `\\${tipa.name}{}`;
        return [...pieces, { separated: false, body, literal: undefined, openControlWord: bare }];
      }
      case 'command':
        return [
          ...pieces,
          { separated: false, body: tipa.text, literal: undefined, openControlWord: false },
        ];
      case 'wrap': {
        // The macro's backslash now starts the boundary, so the wrapped token's
        // separator is no longer needed. Inside the group, `}` ends a bare macro.
        const kept = last === undefined ? pieces : pieces.slice(0, -1);
        const body = `\\${tipa.name}{${last === undefined ? '' : written(last, undefined)}}`;
        return [...kept, { separated: false, body, literal: undefined, openControlWord: false }];
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
