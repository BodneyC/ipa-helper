import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { EMPTY_WORD, freshKey, idsOf, wordFromIds } from './word';
import type { Token } from './word';
import { symbolId } from '../inventory/symbol-id';

const ids = [symbolId('p'), symbolId('ash'), symbolId('t')];

describe('Word', () => {
  it('is built from symbol IDs with keys 0…n−1', () => {
    expect(wordFromIds(ids)).toEqual([
      { key: 0, symbolId: ids[0] },
      { key: 1, symbolId: ids[1] },
      { key: 2, symbolId: ids[2] },
    ]);
    expect(idsOf(wordFromIds(ids))).toEqual(ids);
    expect(wordFromIds([])).toEqual(EMPTY_WORD);
  });

  it('finds a fresh key not used by any token', () => {
    expect(freshKey(EMPTY_WORD)).toBe(0);
    expect(freshKey([{ key: 7, symbolId: symbolId('p') }])).toBe(8);
    fc.assert(
      fc.property(fc.uniqueArray(fc.nat({ max: 1000 })), (keys) => {
        const word = keys.map((key): Token => ({ key, symbolId: symbolId('p') }));
        expect(keys).not.toContain(freshKey(word));
      }),
    );
  });
});
