import { describe, expect, it } from 'vitest';

import { isSounding, SYMBOLS, symbolById, symbolsIn } from '.';
import { AFFRICATES, CONSONANTS, EXTENDED_AFFRICATES, EXTENDED_CONSONANTS } from './consonants';
import { DIACRITICS } from './diacritics';
import { DIPHTHONGS } from './diphthongs';
import { NON_PULMONIC } from './non-pulmonic';
import { SUPRASEGMENTALS } from './suprasegmentals';
import { symbolId } from './symbol-id';
import type { TipaEncoding } from './types';
import { EXTENDED_VOWELS, VOWELS } from './vowels';

const rp = symbolsIn('rp');
const extended = symbolsIn('extended');
/** How an encoding reads on its own, as SPEC §7 writes it. */
const written = (t: TipaEncoding): string =>
  t.kind === 'literal' ? t.text : t.kind === 'command' ? t.text : `\\${t.name}{}`;
const ipaOf = (symbols: readonly { readonly ipa: string }[]) => symbols.map((s) => s.ipa);
const duplicates = (values: readonly string[]) =>
  values.filter((value, index) => values.indexOf(value) !== index);

describe('RP inventory (SPEC §7)', () => {
  it('FR-1: holds exactly the SPEC §7.1 consonants', () => {
    // prettier-ignore
    expect(ipaOf(CONSONANTS).toSorted()).toEqual(
      [
        'p', 'b', 't', 'd', 'k', 'ɡ', 'ʔ', 'm', 'n', 'ŋ', 'f', 'v', 'θ', 'ð', 's', 'z',
        'ʃ', 'ʒ', 'x', 'h', 'l', 'ɫ', 'ɹ', 'j', 'w',
      ].toSorted(),
    );
  });

  it('FR-1: holds exactly the SPEC §7.2 affricates', () => {
    expect(ipaOf(AFFRICATES)).toEqual(['tʃ', 'dʒ']);
  });

  it('FR-1: holds exactly the SPEC §7.3 vowels', () => {
    expect(ipaOf(VOWELS).toSorted()).toEqual(
      [
        'ɪ',
        'iː',
        'e',
        'æ',
        'ʌ',
        'ɑː',
        'ɒ',
        'ɔː',
        'ʊ',
        'uː',
        'ə',
        'ɜː',
        'i',
        'u',
        'ɛ',
        'ɐ',
      ].toSorted(),
    );
  });

  it('FR-1: holds exactly the SPEC §7.4 diphthongs, in display order', () => {
    expect(ipaOf(DIPHTHONGS)).toEqual(['eɪ', 'aɪ', 'ɔɪ', 'əʊ', 'aʊ', 'ɪə', 'eə', 'ʊə']);
  });

  it('FR-1: holds exactly the SPEC §7.5 suprasegmentals, in display order', () => {
    expect(ipaOf(SUPRASEGMENTALS)).toEqual(['ˈ', 'ˌ', 'ː', 'ˑ', '.']);
  });

  it('matches the SPEC §7 TIPA encodings', () => {
    const tipa = Object.fromEntries(rp.map((s) => [s.ipa, written(s.tipa)]));
    // prettier-ignore
    expect(tipa).toEqual({
      p: 'p', b: 'b', t: 't', d: 'd', k: 'k', 'ɡ': 'g', ʔ: 'P', m: 'm', n: 'n', ŋ: 'N',
      f: 'f', v: 'v', θ: 'T', ð: 'D', s: 's', z: 'z', ʃ: 'S', ʒ: 'Z', x: 'x', h: 'h', l: 'l',
      ɫ: '\\textltilde{}', ɹ: '\\textturnr{}', j: 'j', w: 'w',
      tʃ: 'tS', dʒ: 'dZ',
      ɪ: 'I', iː: 'i:', e: 'e', æ: '\\ae{}', ʌ: '2', ɑː: 'A:', ɒ: '6', ɔː: 'O:', ʊ: 'U',
      uː: 'u:', ə: '@', ɜː: '3:', i: 'i', u: 'u', ɛ: 'E', ɐ: '5',
      eɪ: 'eI', aɪ: 'aI', ɔɪ: 'OI', əʊ: '@U', aʊ: 'aU', ɪə: 'I@', eə: 'e@', ʊə: 'U@',
      ˈ: '"', ˌ: '""', ː: ':', ˑ: ';', '.': '.',
    });
  });

  it('has unique IDs and unique IPA strings', () => {
    expect(duplicates(SYMBOLS.map((s) => s.id))).toEqual([]);
    expect(duplicates(ipaOf(SYMBOLS))).toEqual([]);
  });

  it('stores every string NFC-normalised', () => {
    const texts = SYMBOLS.flatMap((s) => [s.ipa, s.name, s.example?.word ?? '']);
    expect(texts.filter((text) => text !== text.normalize('NFC'))).toEqual([]);
  });

  it('uses ɡ U+0261 for the voiced velar plosive, never ASCII g', () => {
    expect(symbolById(symbolId('g'))?.ipa).toBe('ɡ');
    expect(SYMBOLS.filter((s) => s.ipa.includes('g'))).toEqual([]);
  });

  it('writes TIPA in printable ASCII, with macro names TeX can read as control words', () => {
    const valid = (tipa: TipaEncoding): boolean => {
      switch (tipa.kind) {
        case 'literal':
          return /^[\x21-\x7e]+$/.test(tipa.text);
        case 'macro':
          return /^[a-zA-Z]+$/.test(tipa.name);
        case 'wrap':
          // A control word, or one of the accent control symbols \~ and \".
          return /^(?:[a-zA-Z]+|[~"])$/.test(tipa.name);
        case 'command':
          // ADR-0012: a control word, then braced groups (one level of nesting).
          return /^\\[a-zA-Z]+(?:\{(?:[^{}\\]|\\[a-zA-Z]+)*\})+$/.test(tipa.text);
      }
    };
    expect(SYMBOLS.filter((s) => !valid(s.tipa)).map((s) => s.id)).toEqual([]);
  });

  it('FR-2: gives every RP sound an example word with a valid highlight range', () => {
    const sounds = rp.filter((s) => s.category !== 'suprasegmental');
    expect(sounds.length).toBeGreaterThan(0);
    const invalid = sounds.filter(({ example }) => {
      if (example === undefined) return true;
      const [start, end] = example.highlight;
      return (
        !(Number.isInteger(start) && Number.isInteger(end)) ||
        !(0 <= start && start < end && end <= example.word.length)
      );
    });
    expect(invalid.map((s) => s.id)).toEqual([]);
  });

  it('FR-1: puts at most one consonant in each chart slot (place × manner × voicing)', () => {
    const slots = [
      ...CONSONANTS,
      ...EXTENDED_CONSONANTS,
      ...AFFRICATES,
      ...EXTENDED_AFFRICATES,
    ].map(
      (s) => `${s.place}/${s.manner}/${String(s.voiced)}/${'secondary' in s ? s.secondary : ''}`,
    );
    expect(duplicates(slots)).toEqual([]);
  });

  it('FR-1: puts at most one vowel at each trapezoid point (height × backness × rounding × length)', () => {
    const points = [...VOWELS, ...EXTENDED_VOWELS].map(
      (s) => `${s.height}/${s.backness}/${String(s.rounded)}/${String(s.long)}`,
    );
    expect(duplicates(points)).toEqual([]);
  });

  it('marks long vowels with ː, and only long vowels', () => {
    const all = [...VOWELS, ...EXTENDED_VOWELS];
    expect(all.filter((v) => v.ipa.endsWith('ː') !== v.long).map((v) => v.id)).toEqual([]);
  });
});

describe('extended inventory (SPEC §7.6)', () => {
  it('FR-3: is a superset of RP', () => {
    expect(rp.every((s) => extended.includes(s))).toBe(true);
  });

  it('FR-1: completes the IPA pulmonic chart, except ⱱ, which TIPA lacks (ADR-0012)', () => {
    // prettier-ignore
    const pulmonic = [
      'p', 'b', 't', 'd', 'ʈ', 'ɖ', 'c', 'ɟ', 'k', 'ɡ', 'q', 'ɢ', 'ʔ',
      'm', 'ɱ', 'n', 'ɳ', 'ɲ', 'ŋ', 'ɴ',
      'ʙ', 'r', 'ʀ',
      'ɾ', 'ɽ',
      'ɸ', 'β', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'ʂ', 'ʐ', 'ç', 'ʝ', 'x', 'ɣ', 'χ', 'ʁ',
      'ħ', 'ʕ', 'h', 'ɦ',
      'ɬ', 'ɮ',
      'ʋ', 'ɹ', 'ɻ', 'j', 'ɰ',
      'l', 'ɭ', 'ʎ', 'ʟ',
    ];
    const consonants = ipaOf(extended.filter((s) => s.category === 'consonant'));
    expect(pulmonic.filter((ipa) => !consonants.includes(ipa))).toEqual([]);
    expect(consonants).not.toContain('ⱱ');
    expect(ipaOf(EXTENDED_CONSONANTS)).toContain('ʍ');
  });

  it('FR-1: adds ts and dz to the affricates', () => {
    expect(ipaOf(extended.filter((s) => s.category === 'affricate'))).toEqual([
      'tʃ',
      'dʒ',
      'ts',
      'dz',
    ]);
  });

  it('FR-1: holds the clicks and implosives of the non-pulmonic table', () => {
    expect(ipaOf(NON_PULMONIC)).toEqual(['ʘ', 'ǀ', 'ǃ', 'ǂ', 'ǁ', 'ɓ', 'ɗ', 'ʄ', 'ɠ', 'ʛ']);
  });

  it('FR-1: has every vowel of the IPA chart', () => {
    // prettier-ignore
    const chart = [
      'i', 'y', 'ɨ', 'ʉ', 'ɯ', 'u', 'ɪ', 'ʏ', 'ʊ', 'e', 'ø', 'ɘ', 'ɵ', 'ɤ', 'o', 'ə',
      'ɛ', 'œ', 'ɜ', 'ɞ', 'ʌ', 'ɔ', 'æ', 'ɐ', 'a', 'ɶ', 'ɑ', 'ɒ',
    ];
    const vowels = ipaOf(extended.filter((s) => s.category === 'vowel'));
    expect(chart.filter((ipa) => !vowels.includes(ipa))).toEqual([]);
  });

  it('keeps the additions out of RP', () => {
    const added = [
      ...EXTENDED_CONSONANTS,
      ...EXTENDED_AFFRICATES,
      ...NON_PULMONIC,
      ...EXTENDED_VOWELS,
    ];
    expect(added.filter((s) => rp.includes(s))).toEqual([]);
    expect(added.length).toBeGreaterThan(60);
  });

  it('FR-1, M6.2: has the IPA chart diacritics, each a single mark that is no sound itself', () => {
    expect(DIACRITICS).toHaveLength(32);
    expect(extended.filter((s) => s.category === 'diacritic')).toEqual(DIACRITICS);
    expect(DIACRITICS.filter((d) => !/^.$/su.test(d.ipa)).map((d) => d.id)).toEqual([]);
    expect(DIACRITICS.filter(isSounding)).toEqual([]);
    // Combining marks wrap their base in TIPA; spacing ones follow it (ADR-0012).
    const combining = (d: (typeof DIACRITICS)[number]) => /^\p{M}$/u.test(d.ipa);
    expect(
      DIACRITICS.filter((d) => combining(d) !== (d.tipa.kind === 'wrap')).map((d) => d.id),
    ).toEqual(['no-audible-release']);
  });

  it('FR-1: puts at most one sound at each non-pulmonic place × manner', () => {
    expect(duplicates(NON_PULMONIC.map((s) => `${s.place}/${s.manner}`))).toEqual([]);
  });
});

describe('registry', () => {
  it('looks symbols up by ID', () => {
    expect(symbolById(symbolId('esh'))?.ipa).toBe('ʃ');
    expect(symbolById(symbolId('no-such-symbol'))).toBeUndefined();
  });

  it('FR-3: filters by inventory, keeping palette group order', () => {
    expect(rp).toEqual(SYMBOLS.filter((s) => s.inventories.includes('rp')));
    expect(rp.map((s) => s.category)).toEqual(
      [...rp.map((s) => s.category)].sort(
        (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
      ),
    );
    expect(rp).toHaveLength(56);
  });

  it('FR-3: keeps palette group order in the extended inventory too', () => {
    const order = extended.map((s) => categoryOrder.indexOf(s.category));
    expect(order).toEqual(order.toSorted((a, b) => a - b));
  });
});

const categoryOrder = [
  'consonant',
  'affricate',
  'non-pulmonic',
  'vowel',
  'diphthong',
  'suprasegmental',
  'diacritic',
];

describe('isSounding', () => {
  it('FR-30: every RP sound can be played, and no suprasegmental mark', () => {
    const sounding = rp.filter(isSounding);
    expect(sounding).toHaveLength(51);
    expect(sounding.every((s) => s.category !== 'suprasegmental')).toBe(true);
    expect(rp.filter((s) => !isSounding(s)).map((s) => s.category)).toEqual(
      Array.from({ length: 5 }, () => 'suprasegmental'),
    );
  });

  it('M6: a diacritic only modifies a sound, so it is not sounding', () => {
    const tilde = {
      id: symbolId('tilde'),
      ipa: '\u0303',
      tipa: { kind: 'wrap', name: '~' },
      name: 'nasalised',
      inventories: ['extended'],
      category: 'diacritic',
    } as const;
    expect(isSounding(tilde)).toBe(false);
  });
});
