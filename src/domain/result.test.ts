import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { assertNever, err, mapResult, ok } from './result';

describe('Result', () => {
  it('maps over success values', () => {
    expect(mapResult(ok(2), (n) => n * 3)).toEqual(ok(6));
  });

  it('passes failures through mapResult unchanged', () => {
    const failure = err('bad fragment');
    expect(mapResult(failure, (n: number) => n * 3)).toBe(failure);
  });

  it('obeys the functor identity and composition laws', () => {
    const result = fc.oneof(fc.integer().map(ok), fc.string().map(err));
    const f = (n: number) => n + 1;
    const g = (n: number) => n * 2;
    fc.assert(
      fc.property(result, (r) => {
        expect(mapResult(r, (x) => x)).toEqual(r);
        expect(mapResult(mapResult(r, f), g)).toEqual(mapResult(r, (x) => g(f(x))));
      }),
    );
  });
});

describe('assertNever', () => {
  it('throws when reached at runtime', () => {
    // @ts-expect-error: deliberately pass a value that is not `never`, as untyped data would.
    expect(() => assertNever('unexpected')).toThrow('Unexpected value: "unexpected"');
  });
});
