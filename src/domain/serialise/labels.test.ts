import { describe, expect, it } from 'vitest';

import { symbolById } from '../inventory';
import { labelsOf } from './labels';
import { symbolId } from '../inventory/symbol-id';
import type { PhoneSymbol } from '../inventory/types';

const get = (id: string): PhoneSymbol => {
  const symbol = symbolById(symbolId(id));
  if (symbol === undefined) throw new Error(id);
  return symbol;
};

describe('labelsOf', () => {
  it('FR-2: gives the glyph and TIPA code of literal and macro symbols', () => {
    expect(labelsOf(get('esh'), { rDisplay: 'narrow', tieBars: false })).toEqual({
      ipa: 'ʃ',
      glyph: 'ʃ',
      tipa: 'S',
    });
    expect(labelsOf(get('ash'), { rDisplay: 'narrow', tieBars: false })).toEqual({
      ipa: 'æ',
      glyph: 'æ',
      tipa: '\\ae{}',
    });
    expect(labelsOf(get('secondary-stress'), { rDisplay: 'narrow', tieBars: false })).toEqual({
      ipa: 'ˌ',
      glyph: 'ˌ',
      tipa: '""',
    });
    expect(labelsOf(get('c-cedilla'), { rDisplay: 'narrow', tieBars: false }).tipa).toBe('\\c{c}');
  });

  it('Q-3: applies the r-display setting', () => {
    expect(labelsOf(get('turned-r'), { rDisplay: 'narrow', tieBars: false })).toMatchObject({
      ipa: 'ɹ',
      tipa: '\\textturnr{}',
    });
    expect(labelsOf(get('turned-r'), { rDisplay: 'broad', tieBars: false })).toEqual({
      ipa: 'r',
      glyph: 'r',
      tipa: 'r',
    });
  });

  it('M6.2: shows a diacritic on a dotted circle, and a wrap as its macro around nothing', () => {
    expect(labelsOf(get('nasalised'), { rDisplay: 'narrow', tieBars: false })).toEqual({
      ipa: '\u0303',
      glyph: '\u25cc\u0303',
      tipa: '\\~{}',
    });
    expect(labelsOf(get('aspirated'), { rDisplay: 'narrow', tieBars: false })).toEqual({
      ipa: 'ʰ',
      glyph: '◌ʰ',
      tipa: '\\super{h}',
    });
  });

  it('throws on an encoding kind it does not know, as untyped data could carry', () => {
    // @ts-expect-error: deliberately not a TipaEncoding kind.
    const bogus: PhoneSymbol = { ...get('esh'), tipa: { kind: 'bogus' } };
    expect(() => labelsOf(bogus, { rDisplay: 'narrow', tieBars: false })).toThrow(
      'Unexpected value',
    );
  });
});
