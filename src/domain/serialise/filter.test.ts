import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { matchesFilter } from './filter';
import { SYMBOLS, symbolById, symbolsIn } from '../inventory';
import { symbolId } from '../inventory/symbol-id';
import type { PhoneSymbol } from '../inventory/types';

/** Filters the RP palette, as the default view does (FR-3). */
const find = (query: string, rDisplay: 'narrow' | 'broad' = 'narrow') =>
  symbolsIn('rp')
    .filter((s) => matchesFilter(s, query, rDisplay))
    .map((s) => s.ipa);

const sym = (id: string): PhoneSymbol => {
  const s = symbolById(symbolId(id));
  if (s === undefined) throw new Error(id);
  return s;
};

describe('matchesFilter (FR-4)', () => {
  it('FR-4: "fric" and "S" both find ʃ', () => {
    expect(find('fric')).toContain('ʃ');
    expect(find('S')).toContain('ʃ');
    expect(find('fric').every((ipa) => ipa !== 'p')).toBe(true);
  });

  it('matches by glyph', () => {
    expect(find('ʃ')).toEqual(['ʃ', 'tʃ']);
    expect(find('ː')).toEqual(expect.arrayContaining(['iː', 'uː', 'ɑː', 'ː']));
  });

  it('matches TIPA case-sensitively', () => {
    expect(matchesFilter(sym('esh'), 'S', 'narrow')).toBe(true);
    expect(matchesFilter(sym('ash'), '\\ae', 'narrow')).toBe(true);
    expect(matchesFilter(sym('turned-v'), '2', 'narrow')).toBe(true);
    expect(find('2')).toEqual(['ʌ']);
  });

  it('matches name and example words by prefix, ignoring case, all query words required', () => {
    expect(find('voiceless fric')).toEqual(['f', 'θ', 's', 'ʃ', 'x', 'h']);
    expect(find('Close-Mid')).toEqual(['e']);
    expect(find('SHIP')).toEqual(['ʃ']);
    expect(find('ricative')).toEqual([]);
  });

  it('matches suprasegmentals, which have no example word', () => {
    expect(find('stress')).toEqual(['ˈ', 'ˌ']);
  });

  it('follows the r-display setting (Q-3)', () => {
    expect(find('ɹ')).toEqual(['ɹ']);
    expect(find('ɹ', 'broad')).toEqual([]);
    expect(find('r', 'broad')).toContain('ɹ');
  });

  it('matches everything for a blank query', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\s*$/), (blank) => {
        expect(SYMBOLS.every((s) => matchesFilter(s, blank, 'narrow'))).toBe(true);
      }),
    );
  });

  it('every symbol is found by its own glyph and by its own name', () => {
    for (const s of SYMBOLS) {
      expect(matchesFilter(s, s.ipa, 'narrow')).toBe(true);
      expect(matchesFilter(s, s.name, 'narrow')).toBe(true);
    }
  });
});
