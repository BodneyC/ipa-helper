import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { example } from './example';

describe('example', () => {
  it.each([
    ['**sh**ip', { word: 'ship', highlight: [0, 2] }],
    ['mea**s**ure', { word: 'measure', highlight: [3, 4] }],
    ['si**ng**', { word: 'sing', highlight: [2, 4] }],
    ['**a**', { word: 'a', highlight: [0, 1] }],
  ])('parses %j', (marked, expected) => {
    expect(example(marked)).toEqual(expected);
  });

  it.each(['ship', '**ship', '****ship', '**s**h**i**p', 'sh*i*p', ''])('rejects %j', (marked) => {
    expect(() => example(marked)).toThrow('exactly one **…** span');
  });

  it('highlights exactly the marked letters', () => {
    const plain = fc.stringMatching(/^[a-z]{0,8}$/);
    const marked = fc.stringMatching(/^[a-z]{1,4}$/);
    fc.assert(
      fc.property(plain, marked, plain, (before, middle, after) => {
        const { word, highlight } = example(`${before}**${middle}**${after}`);
        expect(word).toBe(before + middle + after);
        expect(word.slice(...highlight)).toBe(middle);
      }),
    );
  });
});
