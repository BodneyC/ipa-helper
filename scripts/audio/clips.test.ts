import { describe, expect, it } from 'vitest';

import {
  candidates,
  frameText,
  parseRendered,
  phonemeIds,
  resolvePicks,
  SLOW_LENGTH_SCALE,
  soundingSymbols,
} from './clips';
import { symbolsIn } from '../../src/domain/inventory/index';

describe('symbol clip candidates (M4.3)', () => {
  it('covers every RP sound and no suprasegmental mark', () => {
    const sounding = soundingSymbols().map((s) => s.id);
    const rp = symbolsIn('rp');
    expect(sounding).toHaveLength(rp.filter((s) => s.category !== 'suprasegmental').length);
    expect(new Set(candidates().map((c) => c.id))).toEqual(new Set(sounding));
  });

  it('offers vowels stressed, slowed and bare, and consonants with schwa frames', () => {
    const forId = (id: string) => candidates().filter((c) => c.id === id);
    expect(forId('ash')).toEqual([
      { id: 'ash', frame: 'stressed', text: 'ˈæ!', lengthScale: 1 },
      { id: 'ash', frame: 'stressed-slow', text: 'ˈæ!', lengthScale: SLOW_LENGTH_SCALE },
      { id: 'ash', frame: 'isolated', text: 'æ!', lengthScale: 1 },
    ]);
    expect(forId('p').map((c) => c.text)).toEqual(['p!', 'pə!', 'əp!', 'əpˈə!']);
  });

  it('ends every text in "!" and stresses only just before a vowel', () => {
    for (const c of candidates()) expect(c.text.endsWith('!')).toBe(true);
    expect(frameText('tʃ', 'schwa-both')).toBe('ətʃˈə!');
  });
});

describe('phonemeIds', () => {
  const map = { '^': [1], _: [0], $: [2], p: [10], ə: [20], '!': [4] };

  it('wraps each codepoint in PAD between BOS and EOS (ADR-0009)', () => {
    expect(phonemeIds('pə!', map)).toEqual({ ok: true, ids: [1, 0, 10, 0, 20, 0, 4, 0, 2] });
  });

  it('reports codepoints the voice lacks', () => {
    expect(phonemeIds('pʘə', map)).toEqual({ ok: false, missing: ['ʘ'] });
  });

  it('reports a map without its control symbols', () => {
    expect(phonemeIds('p', { p: [10], _: [0] })).toEqual({ ok: false, missing: ['^', '$'] });
  });
});

describe('resolvePicks', () => {
  const all = candidates();
  const fullPicks = (): Record<string, string | undefined> =>
    Object.fromEntries(
      [...new Set(all.map((c) => c.id))].map((id) => [id, all.find((c) => c.id === id)?.frame]),
    );

  it('accepts one valid frame per sounding symbol', () => {
    const result = resolvePicks(fullPicks(), all);
    expect(result.ok && result.chosen.length).toBe(soundingSymbols().length);
  });

  it('reports missing, invalid and unknown picks together', () => {
    const picks = Object.fromEntries(
      Object.entries({ ...fullPicks(), p: 'stressed', 'primary-stress': 'isolated' }).filter(
        ([id]) => id !== 'esh',
      ),
    );
    expect(resolvePicks(picks, all)).toEqual({
      ok: false,
      problems: [
        'p: "stressed" is not one of its frames',
        'esh: no pick',
        'primary-stress: not a sounding RP symbol',
      ],
    });
  });

  it('rejects anything but an object', () => {
    for (const bad of [null, [], 'x']) expect(resolvePicks(bad, all).ok).toBe(false);
  });
});

describe('parseRendered', () => {
  const row = {
    id: 'p',
    frame: 'isolated',
    text: 'p!',
    lengthScale: 1,
    file: 'p/isolated.opus',
    seconds: 0.4,
    sha256: 'ab',
  };

  it('accepts well-formed rows and rejects anything else', () => {
    expect(parseRendered([row])).toEqual([row]);
    expect(() => parseRendered([{ ...row, frame: 'shouted' }])).toThrow('malformed');
    expect(() => parseRendered({})).toThrow('malformed');
    expect(() => parseRendered([null])).toThrow('malformed');
  });
});
