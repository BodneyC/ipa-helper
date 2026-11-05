import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { createIpaTokeniser } from './ipa-tokeniser';
import { SYMBOLS } from '../inventory';
import { symbolId } from '../inventory/symbol-id';
import type { SymbolId } from '../inventory/symbol-id';
import { err, mapResult } from '../result';
import { createIpaSerialiser } from '../serialise/ipa';
import type { RDisplay } from '../serialise/serialiser';
import { idsOf, wordFromIds } from '../word/word';

const narrow = createIpaTokeniser({ rDisplay: 'narrow' });
const broad = createIpaTokeniser({ rDisplay: 'broad' });

/** The symbol IDs a paste reads as, or the unknown characters. */
const read = (text: string, tokenise = narrow) => mapResult(tokenise(text), idsOf);
const ids = (...raw: string[]): readonly SymbolId[] => raw.map(symbolId);

const anyWord = fc.array(fc.constantFrom(...SYMBOLS.map((s) => s.id))).map(wordFromIds);
const anyRDisplay = fc.constantFrom<RDisplay>('narrow', 'broad');

/** Characters no symbol spelling uses. */
const strangers = fc.constantFrom('5', 'Q', '#', ' ', '\u0328', '😀', 'ⱱ');

describe('IPA tokeniser (FR-17)', () => {
  it('FR-17: reads a dictionary transcription into symbols', () => {
    expect(read('ˈflɒɡɪʃ')).toEqual({
      ok: true,
      value: ids('primary-stress', 'f', 'l', 'turned-script-a', 'g', 'small-cap-i', 'esh'),
    });
  });

  it('FR-17: takes the longest symbol at each position (tʃ, iː, eɪ)', () => {
    expect(read('tʃiːz')).toEqual({ ok: true, value: ids('tesh', 'i-long', 'z') });
    expect(read('feɪs')).toEqual({ ok: true, value: ids('f', 'face', 's') });
    expect(read('ɪə')).toEqual({ ok: true, value: ids('near') });
  });

  it('ignores surrounding whitespace and one pair of /…/ or […]', () => {
    const tʃɪp = { ok: true, value: ids('tesh', 'small-cap-i', 'p') };
    expect(read('  /tʃɪp/ ')).toEqual(tʃɪp);
    expect(read('[ tʃɪp ]')).toEqual(tʃɪp);
    expect(read('/tʃɪp')).toEqual(err([{ text: '/', index: 0 }]));
    expect(read('')).toEqual({ ok: true, value: [] });
    expect(read(' / / ')).toEqual({ ok: true, value: [] });
  });

  it('ADR-0012: decomposes, so a precomposed ẽ is e + nasalised and ç still reads as ç', () => {
    expect(read('ẽ')).toEqual({ ok: true, value: ids('e', 'nasalised') });
    expect(read('ç')).toEqual({ ok: true, value: ids('c-cedilla') });
    expect(read('c\u0327')).toEqual({ ok: true, value: ids('c-cedilla') });
  });

  it('ADR-0012: accepts ASCII g and :, and tie-bar affricates', () => {
    expect(read('gi:')).toEqual({ ok: true, value: ids('g', 'i-long') });
    expect(read('a:')).toEqual({ ok: true, value: ids('a', 'length') });
    expect(read('t͡ʃ d͡ʒ t͡s')).toEqual(
      err([
        { text: ' ', index: 3 },
        { text: ' ', index: 7 },
      ]),
    );
    expect(read('t͡ʃd͡ʒt͡s')).toEqual({ ok: true, value: ids('tesh', 'dezh', 'ts') });
  });

  it('Q-3: reads r as the trill, or as the British ɹ when r is shown broad', () => {
    expect(read('rɛd')).toEqual({ ok: true, value: ids('r', 'epsilon', 'd') });
    expect(read('rɛd', broad)).toEqual({ ok: true, value: ids('turned-r', 'epsilon', 'd') });
    expect(read('ɹ', broad)).toEqual({ ok: true, value: ids('turned-r') });
  });

  it('FR-17: reports every unknown character with its position, never dropping it', () => {
    expect(read('ab5 c')).toEqual(
      err([
        { text: '5', index: 2 },
        { text: ' ', index: 3 },
      ]),
    );
    // Positions count code points, so an astral character counts once.
    expect(read('😀a😀')).toEqual(
      err([
        { text: '😀', index: 0 },
        { text: '😀', index: 2 },
      ]),
    );
  });

  it('uses the symbols it is given', () => {
    const only = createIpaTokeniser(
      { rDisplay: 'broad' },
      SYMBOLS.filter((s) => s.id !== 'r'),
    );
    expect(read('r', only)).toEqual({ ok: true, value: ids('turned-r') });
    const noR = createIpaTokeniser(
      { rDisplay: 'broad' },
      SYMBOLS.filter((s) => s.ipa !== 'ɹ' && s.ipa !== 'r'),
    );
    expect(read('r', noR)).toEqual(err([{ text: 'r', index: 0 }]));
  });

  it('FR-17: reads back any IPA the app writes, to canonically the same IPA', () => {
    // Decomposing puts stacked combining marks in canonical order (by combining
    // class), so ◌̞ + ◌̴ can come back as ◌̴ + ◌̞: the same text to Unicode.
    const nfd = (text: string) => text.normalize('NFD');
    fc.assert(
      fc.property(anyWord, anyRDisplay, fc.boolean(), (word, rDisplay, slashes) => {
        const ipa = createIpaSerialiser({ slashes, rDisplay });
        const text = ipa.serialise(word);
        const back = createIpaTokeniser({ rDisplay })(text);
        expect(mapResult(back, (w) => nfd(ipa.serialise(w)))).toEqual({
          ok: true,
          value: nfd(text),
        });
      }),
    );
  });

  it('ADR-0012: keeps stacked marks in canonical order', () => {
    expect(read('n\u031e\u0334')).toEqual({
      ok: true,
      value: ids('n', 'velarised-or-pharyngealised', 'lowered'),
    });
  });

  it('FR-17: never drops a character it does not know', () => {
    fc.assert(
      fc.property(anyWord, strangers, fc.nat(), (word, stranger, at) => {
        const text = createIpaSerialiser({ slashes: false, rDisplay: 'narrow' }).serialise(word);
        const chars = Array.from(text);
        const position = at % (chars.length + 1);
        const pasted = [...chars.slice(0, position), stranger, ...chars.slice(position)].join('');
        const result = narrow(`x${pasted}x`); // x keeps surrounding spaces from being trimmed
        const reported = result.ok ? [] : result.error.map((u) => u.text);
        expect(reported).toContain(stranger);
      }),
    );
  });
});
