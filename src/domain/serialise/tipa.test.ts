import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { SYMBOLS } from '../inventory';
import { BROAD_R } from './serialiser';
import type { RDisplay } from './serialiser';
import { createTipaSerialiser, needsSeparator } from './tipa';
import { symbolId } from '../inventory/symbol-id';
import type { SymbolId } from '../inventory/symbol-id';
import type { DiacriticSymbol, PhoneSymbol, TipaEncoding } from '../inventory/types';
import { idsOf, wordFromIds } from '../word/word';

/** A diacritic fixture, so the `wrap` encoding is covered before M6 adds real ones. */
const tilde: DiacriticSymbol = {
  id: symbolId('tilde'),
  ipa: '̃',
  tipa: { kind: 'wrap', name: '~' },
  name: 'nasalised',
  inventories: ['extended'],
  category: 'diacritic',
};
const symbols: readonly PhoneSymbol[] = [...SYMBOLS, tilde];

const ids = (...raw: string[]) => wordFromIds(raw.map(symbolId));
const bare = createTipaSerialiser({ slashes: false, rDisplay: 'narrow' }, symbols);

/** A key that identifies an encoding, for mapping tokenised TIPA back to symbols. */
const keyOf = (t: TipaEncoding): string => `${t.kind}:${t.kind === 'literal' ? t.text : t.name}`;

/**
 * Test-only reference tokeniser for the TIPA subset the serialiser emits
 * (ADR-0008). It reads literals greedily, longest first, as TeX + TIPA does;
 * `{}` as a separator; `\name{}` as a macro; and `\name{…}` as a wrap around
 * its contents. It returns encoding keys in token order (a wrap after the
 * tokens it encloses), and throws on anything it doesn't recognise.
 */
const tokenise = (tipa: string, encodings: readonly TipaEncoding[]): readonly string[] => {
  const literals = encodings
    .flatMap((e) => (e.kind === 'literal' ? [e.text] : []))
    .toSorted((a, b) => b.length - a.length);
  const wraps = new Set(encodings.flatMap((e) => (e.kind === 'wrap' ? [e.name] : [])));
  let i = 0;

  const consume = (text: string) => {
    if (!tipa.startsWith(text, i)) throw new Error(`Expected ${text} at ${String(i)} in ${tipa}`);
    i += text.length;
  };

  const sequence = (insideGroup: boolean): string[] => {
    const out: string[] = [];
    while (i < tipa.length) {
      if (tipa.startsWith('{}', i)) {
        i += 2;
      } else if (tipa[i] === '}' && insideGroup) {
        return out;
      } else if (tipa[i] === '\\') {
        i += 1;
        const word = /^[a-zA-Z]+/.exec(tipa.slice(i))?.[0] ?? tipa.charAt(i);
        i += word.length;
        if (wraps.has(word)) {
          consume('{');
          out.push(...sequence(true), `wrap:${word}`);
          consume('}');
        } else {
          consume('{}');
          out.push(`macro:${word}`);
        }
      } else {
        const literal = literals.find((l) => tipa.startsWith(l, i));
        if (literal === undefined) throw new Error(`No literal at ${String(i)} in ${tipa}`);
        i += literal.length;
        out.push(`literal:${literal}`);
      }
    }
    if (insideGroup) throw new Error(`Unclosed group in ${tipa}`);
    return out;
  };

  return sequence(false);
};

/** Tokenises serialiser output back to symbol IDs. */
const decode = (tipa: string, rDisplay: RDisplay): readonly SymbolId[] => {
  const turnedR = symbolId('turned-r');
  const entries = symbols.map((s): [string, SymbolId] => [
    keyOf(rDisplay === 'broad' && s.id === turnedR ? BROAD_R.tipa : s.tipa),
    s.id,
  ]);
  const byKey = new Map(entries);
  const encodings = [...symbols.map((s) => s.tipa), BROAD_R.tipa];
  return tokenise(tipa, encodings).map((key) => byKey.get(key) ?? symbolId('unknown'));
};

const anyId = fc.constantFrom(...symbols.map((s) => s.id));
const anyWord = fc.array(anyId, { maxLength: 16 }).map(wordFromIds);
const anyRDisplay = fc.constantFrom<RDisplay>('narrow', 'broad');
const stresses = fc.constantFrom(symbolId('primary-stress'), symbolId('secondary-stress'));

const balanced = (text: string): boolean => {
  let depth = 0;
  for (const c of text) {
    depth += c === '{' ? 1 : c === '}' ? -1 : 0;
    if (depth < 0) return false;
  }
  return depth === 0;
};

describe('TIPA serialiser', () => {
  it('FR-21: writes /ˈθɔːnɪk/ as "TO:nIk', () => {
    expect(bare.id).toBe('tipa');
    expect(
      bare.serialise(ids('primary-stress', 'theta', 'open-o-long', 'n', 'small-cap-i', 'k')),
    ).toBe('"TO:nIk');
  });

  it('FR-22: braces macros, so /træp/ is tr\\ae{}p (broad r)', () => {
    const broad = createTipaSerialiser({ slashes: false, rDisplay: 'broad' });
    expect(broad.serialise(ids('t', 'turned-r', 'ash', 'p'))).toBe('tr\\ae{}p');
  });

  it('Q-3: writes the narrow British r as \\textturnr{}', () => {
    expect(bare.serialise(ids('t', 'turned-r', 'ash', 'p'))).toBe('t\\textturnr{}\\ae{}p');
  });

  it('FR-22: keeps consecutive primary stresses from merging into ""', () => {
    expect(bare.serialise(ids('primary-stress', 'primary-stress'))).toBe('"{}"');
    expect(bare.serialise(ids('primary-stress', 'secondary-stress'))).toBe('"{}""');
  });

  it('FR-22: keeps separate tokens from reading as one symbol (t+ʃ, i+ː, e+ɪ)', () => {
    expect(bare.serialise(ids('t', 'esh'))).toBe('t{}S');
    expect(bare.serialise(ids('tesh'))).toBe('tS');
    expect(bare.serialise(ids('i', 'length'))).toBe('i{}:');
    expect(bare.serialise(ids('e', 'small-cap-i'))).toBe('e{}I');
    expect(bare.serialise(ids('face'))).toBe('eI');
  });

  it('wraps the preceding token for a diacritic', () => {
    expect(bare.serialise(ids('e', 'tilde'))).toBe('\\~{e}');
    expect(bare.serialise(ids('t', 'esh', 'tilde'))).toBe('t\\~{S}');
    expect(bare.serialise(ids('ash', 'tilde', 'tilde'))).toBe('\\~{\\~{\\ae{}}}');
    expect(bare.serialise(ids('tilde', 'p'))).toBe('\\~{}p');
  });

  it('Q-2: can add slashes inside the macro argument', () => {
    const slashed = createTipaSerialiser({ slashes: true, rDisplay: 'narrow' });
    expect(slashed.serialise(ids('esh'))).toBe('/S/');
  });

  it('only adds separators where a shortcut could straddle the boundary', () => {
    const literals = ['"', '""', 't', 'S', 'tS', 'i', ':', 'i:', 'k'];
    expect(needsSeparator('"', '"', literals)).toBe(true);
    expect(needsSeparator('"', '""', literals)).toBe(true);
    expect(needsSeparator('t', 'S', literals)).toBe(true);
    expect(needsSeparator('i', ':', literals)).toBe(true);
    expect(needsSeparator('k', 'S', literals)).toBe(false);
    expect(needsSeparator('S', 't', literals)).toBe(false);
    expect(needsSeparator('i:', 'k', literals)).toBe(false);
  });

  it('is deterministic and writes only printable ASCII', () => {
    fc.assert(
      fc.property(anyWord, anyRDisplay, (word, rDisplay) => {
        const tipa = createTipaSerialiser({ slashes: false, rDisplay }, symbols);
        const out = tipa.serialise(word);
        expect(tipa.serialise(word)).toBe(out);
        expect(out).toMatch(/^[\x20-\x7e]*$/);
      }),
    );
  });

  it('never writes unbalanced braces', () => {
    fc.assert(
      fc.property(anyWord, (word) => {
        expect(balanced(bare.serialise(word))).toBe(true);
      }),
    );
  });

  it('FR-22: round-trips through the reference tokeniser to the same symbols', () => {
    fc.assert(
      fc.property(anyWord, anyRDisplay, (word, rDisplay) => {
        const tipa = createTipaSerialiser({ slashes: false, rDisplay }, symbols);
        expect(decode(tipa.serialise(word), rDisplay)).toEqual(idsOf(word));
      }),
    );
  });

  it('FR-22: never merges any run of stress marks', () => {
    fc.assert(
      fc.property(fc.array(stresses, { minLength: 1, maxLength: 8 }), (run) => {
        expect(decode(bare.serialise(wordFromIds(run)), 'narrow')).toEqual(run);
      }),
    );
  });

  it('throws on an encoding kind it does not know, as untyped data could carry', () => {
    const bogus: PhoneSymbol = {
      ...tilde,
      id: symbolId('bogus'),
      // @ts-expect-error: deliberately not a TipaEncoding kind.
      tipa: { kind: 'bogus', name: 'x' },
    };
    const tipa = createTipaSerialiser({ slashes: false, rDisplay: 'narrow' }, [bogus]);
    expect(() => tipa.serialise(ids('bogus'))).toThrow('Unexpected value');
  });

  it('rejects malformed input in the reference tokeniser', () => {
    const encodings = symbols.map((s) => s.tipa);
    expect(() => tokenise('\\~{e', encodings)).toThrow('Unclosed group');
    expect(() => tokenise('\\ae', encodings)).toThrow('Expected {}');
    expect(() => tokenise('#', encodings)).toThrow('No literal');
  });
});
