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
    expect(labelsOf(get('esh'), 'narrow')).toEqual({ ipa: 'ʃ', tipa: 'S' });
    expect(labelsOf(get('ash'), 'narrow')).toEqual({ ipa: 'æ', tipa: '\\ae{}' });
    expect(labelsOf(get('secondary-stress'), 'narrow')).toEqual({ ipa: 'ˌ', tipa: '""' });
  });

  it('Q-3: applies the r-display setting', () => {
    expect(labelsOf(get('turned-r'), 'narrow')).toEqual({ ipa: 'ɹ', tipa: '\\textturnr{}' });
    expect(labelsOf(get('turned-r'), 'broad')).toEqual({ ipa: 'r', tipa: 'r' });
  });

  it('shows a wrap diacritic as its macro with an empty argument', () => {
    const tilde: PhoneSymbol = {
      id: symbolId('tilde'),
      ipa: '̃',
      tipa: { kind: 'wrap', name: '~' },
      name: 'nasalised',
      inventories: ['extended'],
      category: 'diacritic',
    };
    expect(labelsOf(tilde, 'narrow').tipa).toBe('\\~{}');
  });

  it('throws on an encoding kind it does not know, as untyped data could carry', () => {
    // @ts-expect-error: deliberately not a TipaEncoding kind.
    const bogus: PhoneSymbol = { ...get('esh'), tipa: { kind: 'bogus' } };
    expect(() => labelsOf(bogus, 'narrow')).toThrow('Unexpected value');
  });
});
