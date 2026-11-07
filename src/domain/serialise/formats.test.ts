import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { createEspeakSerialiser, ESPEAK } from './espeak';
import { escapeHtml, FORMAT_IDS, formatSerialiser } from './formats';
import { createKirshenbaumSerialiser, KIRSHENBAUM } from './kirshenbaum';
import { createNotationSerialiser, spellFrom } from './notation';
import type { FormatSerialiser } from './notation';
import { createXsampaSerialiser, XSAMPA } from './xsampa';
import { SYMBOLS, symbolsIn } from '../inventory';
import { symbolId } from '../inventory/symbol-id';
import type { PhoneSymbol } from '../inventory/types';
import { wordFromIds } from '../word/word';

const ids = (...raw: string[]) => wordFromIds(raw.map(symbolId));
const xsampa = createXsampaSerialiser({ tieBars: false });
const kirshenbaum = createKirshenbaumSerialiser();
const espeak = createEspeakSerialiser();
const text = (serialiser: FormatSerialiser, ...raw: string[]) =>
  serialiser.serialise(ids(...raw)).text;

const anyWord = fc
  .array(fc.constantFrom(...SYMBOLS.map((s) => s.id)), { maxLength: 12 })
  .map(wordFromIds);
const rpWord = fc
  .array(fc.constantFrom(...symbolsIn('rp').map((s) => s.id)), { maxLength: 12 })
  .map(wordFromIds);

/** The notations with their code for each symbol, as the serialisers spell them. */
const NOTATIONS = [
  {
    name: 'X-SAMPA',
    serialiser: xsampa,
    codeOf: (s: PhoneSymbol) => spellFrom(XSAMPA)(s.ipa),
    separator: '-',
  },
  {
    name: 'Kirshenbaum',
    serialiser: kirshenbaum,
    codeOf: (s: PhoneSymbol) => spellFrom(KIRSHENBAUM)(s.ipa),
    separator: undefined,
  },
  {
    name: 'eSpeak',
    serialiser: espeak,
    codeOf: (s: PhoneSymbol) => ESPEAK.get(s.id),
    separator: '|',
  },
] as const;

/**
 * Reference reader: reads `text` greedily, longest code first, as a tool would,
 * skipping separators, and returns the IPA it reads as.
 */
const readBack = (
  input: string,
  codes: ReadonlyMap<string, string>,
  separator: string | undefined,
): string => {
  const longestFirst = [...codes.keys()].toSorted((a, b) => b.length - a.length);
  let i = 0;
  let ipa = '';
  while (i < input.length) {
    if (separator !== undefined && input.startsWith(separator, i)) {
      i += separator.length;
      continue;
    }
    const code = longestFirst.find((c) => c !== '' && input.startsWith(c, i));
    if (code === undefined) throw new Error(`Nothing reads at ${String(i)} in ${input}`);
    ipa += codes.get(code) ?? '';
    i += code.length;
  }
  return ipa;
};

describe('X-SAMPA (FR-26)', () => {
  it('writes /ˈflɒɡɪʃ/ and /ˈθɔːnɪk/ as X-SAMPA does', () => {
    expect(
      text(xsampa, 'primary-stress', 'f', 'l', 'turned-script-a', 'g', 'small-cap-i', 'esh'),
    ).toBe('"flQgIS');
    expect(text(xsampa, 'primary-stress', 'theta', 'open-o-long', 'n', 'small-cap-i', 'k')).toBe(
      '"TO:nIk',
    );
    expect(text(xsampa, 'secondary-stress', 'ash', 'syllable-break', 'turned-r', 'length')).toBe(
      '%{.r\\:',
    );
  });

  it('writes diacritics after their base, and ties affricates when asked', () => {
    expect(text(xsampa, 't', 'aspirated', 'e', 'nasalised', 'n', 'syllabic')).toBe('t_he~n=');
    expect(text(xsampa, 'tesh', 'dezh')).toBe('tSdZ');
    const tied = createXsampaSerialiser({ tieBars: true });
    expect(tied.serialise(ids('tesh', 'a')).text).toBe('t_Sa');
  });

  it('separates sounds that would read as one, and reports a mark it would misread', () => {
    // Two dental clicks would read as the lateral click |\|\.
    expect(text(xsampa, 'dental-click', 'dental-click')).toBe('|\\-|\\');
    // ɹ + ˞ would read as r\` (ɻ), so the mark is left out and reported.
    expect(xsampa.serialise(ids('turned-r', 'rhoticity'))).toEqual({
      text: 'r\\',
      unsupported: [symbolId('rhoticity')],
    });
  });

  it('has a code for every symbol in the inventory', () => {
    expect(SYMBOLS.filter((s) => spellFrom(XSAMPA)(s.ipa) === undefined).map((s) => s.id)).toEqual(
      [],
    );
  });

  it('writes the British r as r\\ even when it is shown broad', () => {
    expect(
      formatSerialiser('xsampa', { slashes: false, rDisplay: 'broad', tieBars: false }).serialise(
        ids('turned-r', 'r'),
      ).text,
    ).toBe('r\\r');
  });
});

describe('Kirshenbaum (FR-27)', () => {
  it('writes /ˈflɒɡɪʃ/ and the r sounds as Kirshenbaum does', () => {
    expect(
      text(kirshenbaum, 'primary-stress', 'f', 'l', 'turned-script-a', 'g', 'small-cap-i', 'esh'),
    ).toBe("'flA.gIS");
    expect(text(kirshenbaum, 'turned-r', 'r', 'fish-hook-r', 'ash', 'rev-epsilon')).toBe(
      'rr<trl>*&V"',
    );
    expect(text(kirshenbaum, 'i', 'length')).toBe('i:');
  });

  it('reports what it has no code for, and leaves it out', () => {
    expect(
      kirshenbaum.serialise(ids('k', 'dark-l', 'syllable-break', 'curly-tail-c', 'ash')),
    ).toEqual({
      text: 'k&',
      unsupported: [symbolId('dark-l'), symbolId('syllable-break'), symbolId('curly-tail-c')],
    });
    // V + " would read as V" (ɜ), so a centralised ʌ can't be written.
    expect(kirshenbaum.serialise(ids('turned-v', 'centralised'))).toEqual({
      text: 'V',
      unsupported: [symbolId('centralised')],
    });
  });
});

describe('eSpeak (FR-28)', () => {
  it('writes RP words as eSpeak phoneme input, stress on the vowel', () => {
    expect(
      text(espeak, 'primary-stress', 'f', 'l', 'turned-script-a', 'g', 'small-cap-i', 'esh'),
    ).toBe("[[fl'0gIS]]");
    expect(text(espeak, 'k', 'ash', 't', 'goat', 'cure', 'i')).toBe('[[katoUU@i]]');
    // A stress with no vowel after it stays put.
    expect(text(espeak, 'k', 'primary-stress')).toBe("[[k']]");
  });

  it('separates mnemonics that would read as one', () => {
    expect(text(espeak, 'ash', 'small-cap-i')).toBe('[[a|I]]');
    expect(text(espeak, 'primary-stress', 'primary-stress', 'ash')).toBe("[['|'a]]");
    // i + length reads as i:, the same sound, so needs no separator.
    expect(text(espeak, 'i', 'length')).toBe('[[i:]]');
  });

  it('has a mnemonic for every RP sound, and reports full-IPA ones', () => {
    const rp = symbolsIn('rp').filter((s) => !ESPEAK.has(s.id));
    expect(rp.map((s) => s.id)).toEqual([
      symbolId('u'),
      symbolId('turned-a'),
      symbolId('half-length'),
      symbolId('syllable-break'),
    ]);
    expect(espeak.serialise(ids('k', 'y', 'k'))).toEqual({
      text: '[[kk]]',
      unsupported: [symbolId('y')],
    });
  });
});

describe('HTML (FR-29)', () => {
  const html = (slashes: boolean) =>
    formatSerialiser('html', { slashes, rDisplay: 'narrow', tieBars: false });

  it('tags the IPA as a transcription, following the display options', () => {
    expect(html(true).serialise(ids('primary-stress', 'f', 'l', 'turned-script-a', 'g')).text).toBe(
      '<span lang="und-fonipa">/ˈflɒɡ/</span>',
    );
    expect(html(false).serialise(ids('k')).text).toBe('<span lang="und-fonipa">k</span>');
    expect(html(false).serialise(ids('k')).unsupported).toEqual([]);
  });

  it('escapes HTML', () => {
    expect(escapeHtml('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;');
  });
});

describe('every format (FR-25)', () => {
  it('has a serialiser', () => {
    const options = { slashes: false, rDisplay: 'narrow', tieBars: false } as const;
    expect(FORMAT_IDS.map((id) => formatSerialiser(id, options).serialise(ids('k')).text)).toEqual([
      'k',
      'k',
      '[[k]]',
      '<span lang="und-fonipa">k</span>',
    ]);
  });

  for (const { name, serialiser, codeOf, separator } of NOTATIONS) {
    const codes = new Map<string, string>();
    for (const s of SYMBOLS) {
      const code = codeOf(s);
      if (code !== undefined && !codes.has(code)) codes.set(code, s.ipa);
    }
    const said = (s: PhoneSymbol) => codes.get(codeOf(s) ?? '') ?? '';

    it(`${name} property: writes printable ASCII, and reads back as exactly the sounds it kept`, () => {
      fc.assert(
        fc.property(name === 'eSpeak' ? rpWord : anyWord, (word) => {
          const { text: out, unsupported } = serialiser.serialise(word);
          expect(out).toMatch(/^[\x20-\x7e]*$/);
          expect(new Set(unsupported).size).toBe(unsupported.length);
          // Walk the word against what the text reads as: each symbol is either
          // read next, or reported. (Stress order is checked by the examples.)
          const read = readBack(out.replace(/^\[\[|\]\]$/g, ''), codes, separator);
          const symbols = word.map((t) => SYMBOLS.find((s) => s.id === t.symbolId));
          // eSpeak moves stress, so its walk ignores stress (the examples check where it goes).
          const stressless = (ipa: string) => (name === 'eSpeak' ? ipa.replace(/[ˈˌ]/g, '') : ipa);
          const heard = stressless(read);
          let at = 0;
          const skipped: string[] = [];
          for (const symbol of symbols) {
            if (symbol === undefined) throw new Error('unknown symbol');
            const ipa = stressless(said(symbol));
            if (codeOf(symbol) !== undefined && heard.startsWith(ipa, at)) at += ipa.length;
            else skipped.push(symbol.id);
          }
          expect(at).toBe(heard.length);
          expect(skipped.filter((id) => !unsupported.some((u) => u === id))).toEqual([]);
        }),
      );
    });
  }

  it('reports each unsupported symbol once', () => {
    expect(kirshenbaum.serialise(ids('dark-l', 'dark-l')).unsupported).toEqual([
      symbolId('dark-l'),
    ]);
  });

  it('a notation without a separator reports a sound that would merge', () => {
    const fixtures: readonly PhoneSymbol[] = SYMBOLS.filter((s) =>
      ['ash', 'small-cap-i'].includes(s.id),
    );
    const bare = createNotationSerialiser({ codeOf: (s) => ESPEAK.get(s.id) }, [
      ...fixtures,
      ...SYMBOLS.filter((s) => s.id === 'price'),
    ]);
    expect(bare.serialise(ids('ash', 'small-cap-i'))).toEqual({
      text: 'a',
      unsupported: [symbolId('small-cap-i')],
    });
  });
});
