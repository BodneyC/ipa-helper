import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { SYMBOLS, symbolById } from '../inventory';
import { createIpaSerialiser } from './ipa';
import { symbolId } from '../inventory/symbol-id';
import { wordFromIds } from '../word/word';

const ids = (...raw: string[]) => wordFromIds(raw.map(symbolId));
const thornic = ids('primary-stress', 'theta', 'open-o-long', 'n', 'small-cap-i', 'k');
const trap = ids('t', 'turned-r', 'ash', 'p');

const narrow = createIpaSerialiser({ slashes: true, rDisplay: 'narrow' });
const bare = createIpaSerialiser({ slashes: false, rDisplay: 'narrow' });
const broad = createIpaSerialiser({ slashes: true, rDisplay: 'broad' });

const anyWord = fc.array(fc.constantFrom(...SYMBOLS.map((s) => s.id))).map(wordFromIds);

describe('IPA serialiser', () => {
  it('FR-11: writes the transcription between slashes', () => {
    expect(narrow.id).toBe('ipa');
    expect(narrow.serialise(thornic)).toBe('/ˈθɔːnɪk/');
    expect(narrow.serialise(ids('f', 'l', 'turned-script-a', 'g', 'small-cap-i', 'esh'))).toBe(
      '/flɒɡɪʃ/',
    );
  });

  it('FR-20: can leave the slashes out', () => {
    expect(bare.serialise(thornic)).toBe('ˈθɔːnɪk');
    expect(bare.serialise([])).toBe('');
    expect(narrow.serialise([])).toBe('//');
  });

  it('Q-3: shows the British r as ɹ by default, or as broad r', () => {
    expect(narrow.serialise(trap)).toBe('/tɹæp/');
    expect(broad.serialise(trap)).toBe('/træp/');
  });

  it('keeps multi-codepoint symbols intact (tʃ, eɪ, iː)', () => {
    expect(bare.serialise(ids('tesh', 'face', 'i-long'))).toBe('tʃeɪiː');
  });

  it('M6.2: puts each diacritic straight after its base, as Unicode expects', () => {
    expect(bare.serialise(ids('t', 'aspirated'))).toBe('tʰ');
    expect(bare.serialise(ids('e', 'nasalised'))).toBe('e\u0303');
    expect(bare.serialise(ids('n', 'voiceless', 'syllabic'))).toBe('n\u0325\u0329');
    expect(bare.serialise(ids('p', 'ejective'))).toBe('pʼ');
  });

  it('concatenates each token’s IPA, and broad r only changes ɹ', () => {
    fc.assert(
      fc.property(anyWord, (word) => {
        const expected = word.map((t) => symbolById(t.symbolId)?.ipa ?? '').join('');
        expect(narrow.serialise(word)).toBe(`/${expected}/`);
        expect(broad.serialise(word)).toBe(`/${expected.replaceAll('ɹ', 'r')}/`);
      }),
    );
  });

  it('throws on a symbol ID that no inventory defines', () => {
    expect(() => narrow.serialise(ids('no-such-symbol'))).toThrow('unknown symbol ID');
  });

  it('accepts its own symbol set', () => {
    const ezh = symbolById(symbolId('ezh'));
    const custom = createIpaSerialiser({ slashes: false, rDisplay: 'narrow' }, ezh ? [ezh] : []);
    expect(custom.serialise(ids('ezh'))).toBe('ʒ');
    expect(() => custom.serialise(ids('esh'))).toThrow('unknown symbol ID: esh');
  });
});
