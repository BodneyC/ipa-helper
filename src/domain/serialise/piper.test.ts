import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  createPiperSerialiser,
  piperPhonemeIds,
  piperPhonemeSerialiser,
  SHORT_WORD_SOUNDS,
} from './piper';
import { isSounding, SYMBOLS, symbolById } from '../inventory';
import { symbolId } from '../inventory/symbol-id';
import type { PhoneSymbol } from '../inventory/types';
import { ok } from '../result';
import { wordFromIds } from '../word/word';
import type { Word } from '../word/word';

const ids = (...raw: string[]) => wordFromIds(raw.map(symbolId));
const say = (...raw: string[]) => piperPhonemeSerialiser.serialise(ids(...raw));

const symbolOf = (id: string): PhoneSymbol => {
  const symbol = symbolById(symbolId(id));
  if (symbol === undefined) throw new Error(id);
  return symbol;
};

const isStress = (s: PhoneSymbol) => s.id === 'primary-stress' || s.id === 'secondary-stress';
const isNucleus = (s: PhoneSymbol) => s.category === 'vowel' || s.category === 'diphthong';
const STRESS_MARKS = new Set(['ˈ', 'ˌ']);
const NUCLEUS_STARTS = new Set(SYMBOLS.filter(isNucleus).map((s) => Array.from(s.ipa)[0] ?? ''));

const anyWord = fc
  .array(fc.constantFrom(...SYMBOLS.map((s) => s.id)), { maxLength: 14 })
  .map(wordFromIds);
const symbolsOf = (word: Word) => word.map((t) => symbolOf(t.symbolId));
/** The phonemes without the ending: no leading space, no final `!` or `.`. */
const core = (text: string) => text.replace(/^ /, '').slice(0, -1);

describe('Piper phoneme serialiser (M5.1, ADR-0009)', () => {
  it('is the "piper" serialiser', () => {
    expect(piperPhonemeSerialiser.id).toBe('piper');
  });

  it('FR-31: moves stress from the syllable onset to just before the vowel', () => {
    expect(say('primary-stress', 'f', 'l', 'turned-script-a', 'g', 'small-cap-i', 'esh')).toBe(
      ' flˈɒɡɪʃ.',
    );
    expect(
      say('secondary-stress', 's', 't', 'turned-r', 'face', 'primary-stress', 'k', 'schwa'),
    ).toBe(' stɹˌeɪkˈə.');
  });

  it('ends short words in "!" and longer ones in " ….", so the voice stops cleanly', () => {
    expect(say('ash')).toBe('æ!');
    expect(say('primary-stress', 'ash', 't')).toBe('ˈæt!');
    expect(say('k', 'ash', 't', 's')).toBe('kæts!');
    expect(say('k', 'ash', 't', 's', 'schwa')).toBe(' kætsə.');
    // An affricate, diphthong or long vowel is one sound.
    expect(say('tesh', 'face', 'i-long', 'm')).toBe('tʃeɪiːm!');
    expect(SHORT_WORD_SOUNDS).toBe(5);
  });

  it('drops syllable breaks and stress with no vowel after it, and keeps length', () => {
    expect(say('k', 'ash', 'syllable-break', 't', 'primary-stress')).toBe('kæt!');
    expect(say('ash', 'length', 'half-length', 'm')).toBe('æːˑm!');
    expect(say('primary-stress', 'secondary-stress', 'm', 'ash')).toBe('mˈˌæ!');
  });

  it('says nothing for a word with no sound', () => {
    expect(say()).toBe('');
    expect(say('primary-stress', 'syllable-break', 'length')).toBe('');
  });

  it('property: every stress mark ends up just before a vowel or diphthong', () => {
    fc.assert(
      fc.property(anyWord, (word) => {
        const chars = Array.from(core(piperPhonemeSerialiser.serialise(word)));
        chars.forEach((char, i) => {
          if (!STRESS_MARKS.has(char)) return;
          const next = chars.slice(i + 1).find((c) => !STRESS_MARKS.has(c));
          expect(next !== undefined && NUCLEUS_STARTS.has(next)).toBe(true);
        });
      }),
    );
  });

  it('property: keeps every other symbol in order, and every stress that has a vowel after it', () => {
    fc.assert(
      fc.property(anyWord, (word) => {
        const symbols = symbolsOf(word);
        fc.pre(symbols.some(isSounding));
        const text = piperPhonemeSerialiser.serialise(word);
        const kept = symbols.filter((s) => !isStress(s) && s.id !== 'syllable-break');
        const out = Array.from(core(text));
        expect(out.filter((c) => !STRESS_MARKS.has(c)).join('')).toBe(
          kept.map((s) => s.ipa).join(''),
        );
        const voicedStresses = symbols.filter(
          (s, i) => isStress(s) && symbols.slice(i + 1).some(isNucleus),
        ).length;
        expect(out.filter((c) => STRESS_MARKS.has(c))).toHaveLength(voicedStresses);
      }),
    );
  });

  it('property: the ending depends only on how many sounds the word has', () => {
    fc.assert(
      fc.property(anyWord, (word) => {
        const sounds = symbolsOf(word).filter(isSounding).length;
        const text = piperPhonemeSerialiser.serialise(word);
        const ending =
          sounds === 0 ? /^$/u : sounds < SHORT_WORD_SOUNDS ? /^[^ ].*!$/u : /^ .*\.$/u;
        expect(text).toMatch(ending);
      }),
    );
  });

  it('resolves against the symbols it is given', () => {
    const only = [symbolOf('ash')];
    expect(createPiperSerialiser(only).serialise(ids('ash'))).toBe('æ!');
    expect(() => createPiperSerialiser(only).serialise(ids('k'))).toThrow('unknown symbol ID');
  });
});

describe('piperPhonemeIds', () => {
  const map = { '^': [1], _: [0], $: [2], k: [23], æ: [39], '!': [4] };

  it('wraps each codepoint in PAD between BOS and EOS (ADR-0009)', () => {
    expect(piperPhonemeIds('kæ!', map)).toEqual(ok([1, 0, 23, 0, 39, 0, 4, 0, 2]));
  });

  it('fails with every codepoint the voice lacks, control symbols included', () => {
    expect(piperPhonemeIds('kʘæʘ', map)).toEqual({ ok: false, error: ['ʘ', 'ʘ'] });
    expect(piperPhonemeIds('k', { k: [23], _: [0] })).toEqual({ ok: false, error: ['^', '$'] });
  });

  it('property: n codepoints give 2n + 3 IDs, BOS-PAD first, EOS last, PAD after each', () => {
    const lookup = new Map(Object.entries(map));
    const letters = [...lookup.keys()].filter((k) => !['^', '_', '$'].includes(k));
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...letters)), (chars) => {
        const result = piperPhonemeIds(chars.join(''), map);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const out = result.value;
        expect(out).toHaveLength(2 * chars.length + 3);
        expect(out.slice(0, 2)).toEqual([1, 0]);
        expect(out.at(-1)).toBe(2);
        chars.forEach((char, i) => {
          expect(out[2 + 2 * i]).toBe(lookup.get(char)?.[0]);
          expect(out[3 + 2 * i]).toBe(0);
        });
      }),
    );
  });
});
