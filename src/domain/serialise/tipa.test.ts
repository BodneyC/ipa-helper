import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { SYMBOLS } from '../inventory';
import { rendering } from './serialiser';
import type { GlyphOptions, RDisplay } from './serialiser';
import { createTipaSerialiser, needsSeparator } from './tipa';
import { symbolId } from '../inventory/symbol-id';
import type { SymbolId } from '../inventory/symbol-id';
import type { DiacriticSymbol, PhoneSymbol, TipaEncoding } from '../inventory/types';
import { idsOf, wordFromIds } from '../word/word';

/** A diacritic fixture for malformed-data tests; the registry has the real ones (M6.2). */
const tilde: DiacriticSymbol = {
  id: symbolId('tilde'),
  ipa: '\u0303',
  tipa: { kind: 'wrap', name: '~' },
  name: 'nasalised',
  inventories: ['extended'],
  category: 'diacritic',
};
const symbols: readonly PhoneSymbol[] = SYMBOLS;

const ids = (...raw: string[]) => wordFromIds(raw.map(symbolId));
const bare = createTipaSerialiser({ slashes: false, rDisplay: 'narrow', tieBars: false }, symbols);

/** A key that identifies an encoding, for mapping tokenised TIPA back to symbols. */
const keyOf = (t: TipaEncoding): string =>
  `${t.kind}:${t.kind === 'literal' || t.kind === 'command' ? t.text : t.name}`;

/**
 * Test-only reference tokeniser for the TIPA subset the serialiser emits
 * (ADR-0008). It reads literals greedily, longest first, as TeX + TIPA does;
 * `{}` as a separator; a known command (`\c{c}`) as itself; `\name{}` as a
 * macro; and `\name{…}` as a wrap around its contents. It returns encoding keys
 * in token order (a wrap after the tokens it encloses), and throws on anything
 * it doesn't recognise. With `minimal` (FR-24) a macro may also be bare, `\ae`,
 * and TeX's rule applies: the control word takes every letter after the
 * backslash, and one space after it is skipped.
 */
const tokenise = (
  tipa: string,
  encodings: readonly TipaEncoding[],
  minimal = false,
): readonly string[] => {
  const longestFirst = (texts: readonly string[]) => texts.toSorted((a, b) => b.length - a.length);
  const literals = longestFirst(encodings.flatMap((e) => (e.kind === 'literal' ? [e.text] : [])));
  const commands = longestFirst(encodings.flatMap((e) => (e.kind === 'command' ? [e.text] : [])));
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
      } else if (commands.some((c) => tipa.startsWith(c, i))) {
        const command = commands.find((c) => tipa.startsWith(c, i)) ?? '';
        i += command.length;
        out.push(`command:${command}`);
      } else if (tipa[i] === '\\') {
        i += 1;
        const word = /^[a-zA-Z]+/.exec(tipa.slice(i))?.[0] ?? tipa.charAt(i);
        i += word.length;
        if (wraps.has(word)) {
          consume('{');
          out.push(...sequence(true), `wrap:${word}`);
          consume('}');
        } else {
          if (tipa.startsWith('{}', i) || !minimal) consume('{}');
          else if (tipa[i] === ' ') i += 1;
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

/**
 * Under the broad display, the British r and the trill r are both written `r`
 * (Q-3), so their TIPA can't tell them apart. Round trips compare against this.
 */
const canonical = (ids: readonly SymbolId[], rDisplay: RDisplay): readonly SymbolId[] =>
  rDisplay === 'broad' ? ids.map((id) => (id === symbolId('turned-r') ? symbolId('r') : id)) : ids;

/** Tokenises serialiser output back to symbol IDs. */
const decode = (
  tipa: string,
  rDisplay: RDisplay,
  tieBars = false,
  minimal = false,
): readonly SymbolId[] => {
  const glyphs: GlyphOptions = { rDisplay, tieBars };
  const rendered = symbols.map((s) => [rendering(s, glyphs).tipa, s.id] as const);
  const byKey = new Map(rendered.map(([t, id]) => [keyOf(t), id]));
  // Every literal the serialiser can write, as it checks boundaries against them all.
  const encodings = [...rendered.map(([t]) => t), ...symbols.map((s) => s.tipa)];
  return tokenise(tipa, encodings, minimal).map((key) => byKey.get(key) ?? symbolId('unknown'));
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
    const broad = createTipaSerialiser({ slashes: false, rDisplay: 'broad', tieBars: false });
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

  it('FR-1, M6.2: wraps the preceding token for a combining diacritic', () => {
    expect(bare.serialise(ids('e', 'nasalised'))).toBe('\\~{e}');
    expect(bare.serialise(ids('t', 'esh', 'nasalised'))).toBe('t\\~{S}');
    expect(bare.serialise(ids('ash', 'nasalised', 'nasalised'))).toBe('\\~{\\~{\\ae{}}}');
    expect(bare.serialise(ids('nasalised', 'p'))).toBe('\\~{}p');
    expect(bare.serialise(ids('n', 'voiceless'))).toBe('\\textsubring{n}');
    expect(bare.serialise(ids('n', 'syllabic', 'voiceless'))).toBe(
      '\\textsubring{\\textsyllabic{n}}',
    );
    expect(bare.serialise(ids('e', 'centralised'))).toBe('\\"{e}');
  });

  it('FR-1, M6.2: writes a spacing diacritic after its base', () => {
    expect(bare.serialise(ids('t', 'aspirated'))).toBe('t\\super{h}');
    expect(bare.serialise(ids('t', 'velarised'))).toBe('t\\super{\\textgamma}');
    expect(bare.serialise(ids('p', 'ejective'))).toBe("p'");
    expect(bare.serialise(ids('p', 'ejective', 'ejective'))).toBe("p''");
    expect(bare.serialise(ids('schwa', 'rhoticity'))).toBe('@\\textrhoticity{}');
    // A diacritic marks the token just before it, as the IPA text does: in
    // `tʰ̥` the ring is under the ʰ.
    expect(bare.serialise(ids('t', 'aspirated', 'voiceless'))).toBe('t\\textsubring{\\super{h}}');
  });

  it('ADR-0012: writes a command as it is, needing no separator either side', () => {
    expect(bare.serialise(ids('c-cedilla'))).toBe('\\c{c}');
    expect(bare.serialise(ids('i', 'c-cedilla', 'a'))).toBe('i\\c{c}a');
    expect(bare.serialise(ids('c-cedilla', 'nasalised'))).toBe('\\~{\\c{c}}');
  });

  it('SPEC §7.2, M6.5: writes affricates under a tie bar when asked', () => {
    const tied = createTipaSerialiser({ slashes: false, rDisplay: 'narrow', tieBars: true });
    expect(tied.serialise(ids('tesh', 'small-cap-i', 'p'))).toBe('\\t{tS}Ip');
    expect(tied.serialise(ids('t', 'esh'))).toBe('t{}S');
    expect(tied.serialise(ids('dezh', 'nasalised'))).toBe('\\~{\\t{dZ}}');
  });

  it('Q-2: can add slashes inside the macro argument', () => {
    const slashed = createTipaSerialiser({ slashes: true, rDisplay: 'narrow', tieBars: false });
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
        const tipa = createTipaSerialiser({ slashes: false, rDisplay, tieBars: false }, symbols);
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
      fc.property(anyWord, anyRDisplay, fc.boolean(), (word, rDisplay, tieBars) => {
        const tipa = createTipaSerialiser({ slashes: false, rDisplay, tieBars }, symbols);
        expect(decode(tipa.serialise(word), rDisplay, tieBars)).toEqual(
          canonical(idsOf(word), rDisplay),
        );
      }),
    );
  });

  it("FR-24: minimal braces writes /træp/ as tr\\ae p, and braces nothing else it needn't", () => {
    const minimal = (rDisplay: RDisplay = 'narrow') =>
      createTipaSerialiser({ slashes: false, rDisplay, tieBars: false, minimalBraces: true });
    expect(minimal('broad').serialise(ids('t', 'turned-r', 'ash', 'p'))).toBe('tr\\ae p');
    // Before a non-letter, at the end, and before another macro, nothing is needed.
    expect(minimal().serialise(ids('ash', 'length'))).toBe('\\ae:');
    expect(minimal().serialise(ids('k', 'ash'))).toBe('k\\ae');
    expect(minimal().serialise(ids('ash', 'turned-r'))).toBe('\\ae\\textturnr');
    expect(minimal().serialise(ids('ash', 'primary-stress', 'k'))).toBe('\\ae"k');
    // A wrap's group ends the macro inside it; literal separators stay `{}`.
    expect(minimal().serialise(ids('ash', 'nasalised', 'p'))).toBe('\\~{\\ae}p');
    expect(minimal().serialise(ids('primary-stress', 'primary-stress'))).toBe('"{}"');
    // Slashes inside the argument (Q-2) end it too.
    const slashed = createTipaSerialiser({
      slashes: true,
      rDisplay: 'narrow',
      tieBars: false,
      minimalBraces: true,
    });
    expect(slashed.serialise(ids('k', 'ash'))).toBe('/k\\ae/');
  });

  it('FR-24: in minimal mode, round-trips through the reference tokeniser to the same symbols', () => {
    fc.assert(
      fc.property(anyWord, anyRDisplay, fc.boolean(), (word, rDisplay, tieBars) => {
        const tipa = createTipaSerialiser({
          slashes: false,
          rDisplay,
          tieBars,
          minimalBraces: true,
        });
        const out = tipa.serialise(word);
        expect(decode(out, rDisplay, tieBars, true)).toEqual(canonical(idsOf(word), rDisplay));
        expect(balanced(out)).toBe(true);
        // Never longer than the default output, which braces every macro.
        const safe = createTipaSerialiser({ slashes: false, rDisplay, tieBars }).serialise(word);
        expect(out.length).toBeLessThanOrEqual(safe.length);
      }),
    );
  });

  it('FR-24: keeps {} after a macro whose name is not a control word', () => {
    const accent: PhoneSymbol = {
      ...tilde,
      id: symbolId('accent'),
      tipa: { kind: 'macro', name: "'" },
    };
    const tipa = createTipaSerialiser(
      { slashes: false, rDisplay: 'narrow', tieBars: false, minimalBraces: true },
      [accent],
    );
    expect(tipa.serialise(ids('accent', 'accent'))).toBe("\\'{}\\'{}");
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
    const tipa = createTipaSerialiser({ slashes: false, rDisplay: 'narrow', tieBars: false }, [
      bogus,
    ]);
    expect(() => tipa.serialise(ids('bogus'))).toThrow('Unexpected value');
  });

  it('rejects malformed input in the reference tokeniser', () => {
    const encodings = symbols.map((s) => s.tipa);
    expect(() => tokenise('\\~{e', encodings)).toThrow('Unclosed group');
    expect(() => tokenise('\\ae', encodings)).toThrow('Expected {}');
    expect(() => tokenise('#', encodings)).toThrow('No literal');
  });
});
