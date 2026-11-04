import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  EMPTY,
  clear,
  deleteBackward,
  deleteForward,
  insert,
  moveCursor,
  setCursor,
  withCursor,
} from './cursor';
import type { CursorWord } from './cursor';
import { idsOf, wordFromIds } from './word';
import type { SymbolId } from '../inventory/symbol-id';
import { symbolId } from '../inventory/symbol-id';

const [p, a, t] = [symbolId('p'), symbolId('ash'), symbolId('t')];
const pat = withCursor(wordFromIds([p, a, t]));

const anyId = fc.constantFrom(p, a, t, symbolId('esh'), symbolId('primary-stress'));
const anyState: fc.Arbitrary<CursorWord> = fc
  .array(anyId, { maxLength: 12 })
  .chain((ids) =>
    fc.nat({ max: ids.length }).map((cursor) => withCursor(wordFromIds(ids), cursor)),
  );

type Op = (s: CursorWord) => CursorWord;
const anyOp: fc.Arbitrary<Op> = fc.oneof(
  anyId.map(
    (id): Op =>
      (s) =>
        insert(s, id),
  ),
  fc.constant<Op>(deleteBackward),
  fc.constant<Op>(deleteForward),
  fc.integer({ min: -3, max: 3 }).map(
    (d): Op =>
      (s) =>
        moveCursor(s, d),
  ),
  fc.integer({ min: -3, max: 15 }).map(
    (n): Op =>
      (s) =>
        setCursor(s, n),
  ),
  fc.constant<Op>(clear),
);

const ids = (s: CursorWord): readonly SymbolId[] => idsOf(s.word);

describe('cursor operations', () => {
  it('withCursor defaults to the end and clamps', () => {
    expect(pat.cursor).toBe(3);
    expect(withCursor(pat.word, -2).cursor).toBe(0);
    expect(withCursor(pat.word, 9).cursor).toBe(3);
    expect(EMPTY).toEqual({ word: [], cursor: 0 });
  });

  it('FR-10: inserts at the cursor and moves past the new token', () => {
    const s = insert(withCursor(pat.word, 1), symbolId('esh'));
    expect(ids(s)).toEqual([p, symbolId('esh'), a, t]);
    expect(s.cursor).toBe(2);
  });

  it('FR-13: Backspace deletes the token before the cursor', () => {
    const s = deleteBackward(withCursor(pat.word, 2));
    expect(ids(s)).toEqual([p, t]);
    expect(s.cursor).toBe(1);
  });

  it('FR-13: Backspace at the start changes nothing', () => {
    const s = withCursor(pat.word, 0);
    expect(deleteBackward(s)).toBe(s);
  });

  it('FR-13: Delete deletes the token after the cursor', () => {
    const s = deleteForward(withCursor(pat.word, 1));
    expect(ids(s)).toEqual([p, t]);
    expect(s.cursor).toBe(1);
  });

  it('FR-13: Delete at the end changes nothing', () => {
    expect(deleteForward(pat)).toBe(pat);
  });

  it('FR-12: arrows move one token and stop at the ends', () => {
    expect(moveCursor(pat, -1).cursor).toBe(2);
    expect(moveCursor(pat, 1)).toBe(pat);
    expect(moveCursor(withCursor(pat.word, 0), -1).cursor).toBe(0);
  });

  it('FR-12: setCursor places the cursor in a gap, clamped and whole', () => {
    expect(setCursor(pat, 1).cursor).toBe(1);
    expect(setCursor(pat, 1.7).cursor).toBe(1);
    expect(setCursor(pat, 99)).toBe(pat);
    expect(setCursor(pat, -5).cursor).toBe(0);
  });

  it('FR-13: Clear empties the word, and does nothing to an empty word', () => {
    expect(clear(pat)).toEqual(EMPTY);
    expect(clear(EMPTY)).toBe(EMPTY);
    const emptyButMoved = { word: [], cursor: 0 };
    expect(clear(emptyButMoved)).toBe(emptyButMoved);
  });

  it('deletes a multi-codepoint symbol (tʃ) as one token', () => {
    const s = deleteBackward(withCursor(wordFromIds([symbolId('tesh')])));
    expect(s).toEqual(EMPTY);
  });

  it('keeps the cursor in range and token keys unique under any sequence of edits', () => {
    fc.assert(
      fc.property(anyState, fc.array(anyOp, { maxLength: 20 }), (start, ops) => {
        const end = ops.reduce((s, op) => op(s), start);
        expect(end.cursor).toBeGreaterThanOrEqual(0);
        expect(end.cursor).toBeLessThanOrEqual(end.word.length);
        expect(new Set(end.word.map((tok) => tok.key)).size).toBe(end.word.length);
      }),
    );
  });

  it('Backspace undoes an insert', () => {
    fc.assert(
      fc.property(anyState, anyId, (s, id) => {
        const back = deleteBackward(insert(s, id));
        expect(back.word).toEqual(s.word);
        expect(back.cursor).toBe(s.cursor);
      }),
    );
  });

  it('Delete after a step left also undoes an insert', () => {
    fc.assert(
      fc.property(anyState, anyId, (s, id) => {
        const back = deleteForward(moveCursor(insert(s, id), -1));
        expect(ids(back)).toEqual(ids(s));
      }),
    );
  });
});
