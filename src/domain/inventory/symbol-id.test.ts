import fc from 'fast-check';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { err, ok } from '../result';
import { isSymbolId, parseSymbolId, symbolId } from './symbol-id';
import type { SymbolId } from './symbol-id';

/** Widens a literal to `string`, as untyped input would be. */
const unvalidated = (raw: string): string => raw;

const wellFormed = fc.stringMatching(/^[a-z][a-z0-9]{0,5}(?:-[a-z0-9]{1,6}){0,3}$/);

describe('SymbolId', () => {
  it.each(['esh', 'tesh', 'i-long', 'turned-r', 'schwa', 'a-i', 'r1'])('accepts %j', (raw) => {
    expect(isSymbolId(raw)).toBe(true);
    expect(parseSymbolId(raw)).toEqual(ok(raw));
    expect(symbolId(raw)).toBe(raw);
  });

  it.each(['', 'Esh', '1st', '-esh', 'esh-', 'i--long', 'i_long', 'ʃ', 'e sh', 'tʃ', 'esh\n'])(
    'rejects %j',
    (raw) => {
      expect(isSymbolId(raw)).toBe(false);
      expect(parseSymbolId(raw)).toEqual(err({ kind: 'invalid-symbol-id', raw }));
      expect(() => symbolId(raw)).toThrow('Malformed symbol ID in inventory data');
    },
  );

  it('accepts every hyphen-joined lowercase ASCII ID that starts with a letter', () => {
    fc.assert(
      fc.property(wellFormed, (raw) => {
        expect(parseSymbolId(raw)).toEqual(ok(raw));
      }),
    );
  });

  it('only accepts URL-safe IDs that survive encodeURIComponent unchanged', () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        expect(!isSymbolId(raw) || encodeURIComponent(raw) === raw).toBe(true);
      }),
    );
  });

  it('is a brand that a plain string does not satisfy', () => {
    expectTypeOf(symbolId('esh')).toEqualTypeOf<SymbolId>();
    expectTypeOf<SymbolId>().toExtend<string>();
    expectTypeOf<string>().not.toExtend<SymbolId>();

    const raw = unvalidated('esh');
    // @ts-expect-error: an unvalidated string must not pass as a SymbolId.
    const unchecked: SymbolId = raw;
    expect(unchecked).toBe('esh');

    if (isSymbolId(raw)) expectTypeOf(raw).toEqualTypeOf<SymbolId>();
  });
});
