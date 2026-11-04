import { describe, expect, it } from 'vitest';

import { SYMBOLS, symbolById, symbolsIn } from '.';
import { AFFRICATES, CONSONANTS } from './consonants';
import { DIPHTHONGS } from './diphthongs';
import { SUPRASEGMENTALS } from './suprasegmentals';
import { symbolId } from './symbol-id';
import { VOWELS } from './vowels';

const rp = symbolsIn('rp');
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
    const tipa = Object.fromEntries(
      SYMBOLS.map((s) => [s.ipa, s.tipa.kind === 'literal' ? s.tipa.text : `\\${s.tipa.name}{}`]),
    );
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
    const invalid = SYMBOLS.filter(({ tipa }) =>
      tipa.kind === 'literal' ? !/^[\x21-\x7e]+$/.test(tipa.text) : !/^[a-zA-Z]+$/.test(tipa.name),
    );
    expect(invalid).toEqual([]);
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
    const slots = [...CONSONANTS, ...AFFRICATES].map(
      (s) => `${s.place}/${s.manner}/${String(s.voiced)}/${'secondary' in s ? s.secondary : ''}`,
    );
    expect(duplicates(slots)).toEqual([]);
  });

  it('FR-1: puts at most one vowel at each trapezoid point (height × backness × rounding × length)', () => {
    const points = VOWELS.map(
      (s) => `${s.height}/${s.backness}/${String(s.rounded)}/${String(s.long)}`,
    );
    expect(duplicates(points)).toEqual([]);
  });

  it('marks long vowels with ː, and only long vowels', () => {
    expect(VOWELS.filter((v) => v.ipa.endsWith('ː') !== v.long).map((v) => v.id)).toEqual([]);
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
});

const categoryOrder = ['consonant', 'affricate', 'vowel', 'diphthong', 'suprasegmental'];
