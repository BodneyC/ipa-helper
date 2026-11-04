import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { HISTORY_LIMIT, editorReducer, initialEditorState } from './editor';
import type { EditorAction, EditorState } from './editor';
import { symbolId } from '../domain/inventory/symbol-id';
import { idsOf, wordFromIds } from '../domain/word/word';

const [p, a, t] = [symbolId('p'), symbolId('ash'), symbolId('t')];
const run = (actions: readonly EditorAction[], start: EditorState = initialEditorState()) =>
  actions.reduce(editorReducer, start);
const ids = (s: EditorState) => idsOf(s.word);

const typed = run([
  { type: 'insert', symbolId: p },
  { type: 'insert', symbolId: a },
  { type: 'insert', symbolId: t },
]);

const anyAction: fc.Arbitrary<EditorAction> = fc.oneof(
  fc.constantFrom(p, a, t).map((id): EditorAction => ({ type: 'insert', symbolId: id })),
  fc.constantFrom<EditorAction>(
    { type: 'deleteBackward' },
    { type: 'deleteForward' },
    { type: 'clear' },
    { type: 'undo' },
    { type: 'redo' },
  ),
  fc.integer({ min: -2, max: 2 }).map((delta): EditorAction => ({ type: 'moveCursor', delta })),
  fc.nat({ max: 6 }).map((position): EditorAction => ({ type: 'setCursor', position })),
  fc
    .array(fc.constantFrom(p, a, t), { maxLength: 4 })
    .map((w): EditorAction => ({ type: 'replace', word: wordFromIds(w) })),
);

describe('editor reducer', () => {
  it('starts empty, or with a given word and the cursor at its end', () => {
    expect(initialEditorState()).toEqual({ word: [], cursor: 0, past: [], future: [] });
    const fromUrl = initialEditorState(wordFromIds([p, a]));
    expect(fromUrl.cursor).toBe(2);
  });

  it('FR-10: inserts at the cursor', () => {
    expect(ids(typed)).toEqual([p, a, t]);
    const s = run(
      [
        { type: 'setCursor', position: 1 },
        { type: 'insert', symbolId: t },
      ],
      typed,
    );
    expect(ids(s)).toEqual([p, t, a, t]);
    expect(s.cursor).toBe(2);
  });

  it('FR-12/FR-13: moves the cursor and deletes either side of it', () => {
    const s = run([{ type: 'moveCursor', delta: -1 }, { type: 'deleteBackward' }], typed);
    expect(ids(s)).toEqual([p, t]);
    const s2 = run([{ type: 'deleteForward' }], s);
    expect(ids(s2)).toEqual([p]);
  });

  it('FR-13/FR-14: Clear can be undone', () => {
    const cleared = run([{ type: 'clear' }], typed);
    expect(cleared.word).toEqual([]);
    const restored = run([{ type: 'undo' }], cleared);
    expect(ids(restored)).toEqual([p, a, t]);
    expect(restored.cursor).toBe(3);
  });

  it('FR-14: undo and redo walk the history, restoring the cursor', () => {
    const moved = run([{ type: 'setCursor', position: 1 }, { type: 'deleteBackward' }], typed);
    const undone = run([{ type: 'undo' }], moved);
    expect(ids(undone)).toEqual([p, a, t]);
    expect(undone.cursor).toBe(1);
    const redone = run([{ type: 'redo' }], undone);
    expect(ids(redone)).toEqual([a, t]);
    expect(redone.cursor).toBe(0);
    expect(
      run([{ type: 'undo' }, { type: 'undo' }, { type: 'undo' }, { type: 'undo' }], typed).word,
    ).toEqual([]);
  });

  it('FR-14: a new edit clears the redo stack', () => {
    const s = run([{ type: 'undo' }, { type: 'insert', symbolId: p }], typed);
    expect(s.future).toEqual([]);
    expect(run([{ type: 'redo' }], s)).toBe(s);
  });

  it('does nothing, and records nothing, for no-op actions', () => {
    const empty = initialEditorState();
    for (const action of [
      { type: 'deleteBackward' },
      { type: 'deleteForward' },
      { type: 'clear' },
      { type: 'undo' },
      { type: 'redo' },
      { type: 'moveCursor', delta: -1 },
      { type: 'setCursor', position: 4 },
    ] as const) {
      expect(editorReducer(empty, action)).toBe(empty);
    }
  });

  it('records cursor moves without making them undo steps', () => {
    const s = run([{ type: 'moveCursor', delta: -2 }], typed);
    expect(s.cursor).toBe(1);
    expect(s.past).toBe(typed.past);
  });

  it('FR-15/FR-17: replace swaps in a whole word as one undoable edit', () => {
    const s = run([{ type: 'replace', word: wordFromIds([t, t]) }], typed);
    expect(ids(s)).toEqual([t, t]);
    expect(s.cursor).toBe(2);
    expect(ids(run([{ type: 'undo' }], s))).toEqual([p, a, t]);
  });

  it(`keeps at most ${String(HISTORY_LIMIT)} undo steps`, () => {
    const many = Array.from({ length: HISTORY_LIMIT + 5 }, (): EditorAction => ({
      type: 'insert',
      symbolId: p,
    }));
    const s = run(many);
    expect(s.past).toHaveLength(HISTORY_LIMIT);
    const allUndone = run(
      Array.from({ length: HISTORY_LIMIT + 5 }, () => ({ type: 'undo' }) as const),
      s,
    );
    expect(allUndone.word).toHaveLength(5);
  });

  it('throws on an unknown action, as untyped data could carry', () => {
    // @ts-expect-error: deliberately not an EditorAction.
    expect(() => editorReducer(typed, { type: 'bogus' })).toThrow('Unexpected value');
  });

  it('FR-14: undo after any edit restores the state before it', () => {
    fc.assert(
      fc.property(fc.array(anyAction, { maxLength: 15 }), anyAction, (setup, action) => {
        const before = run(setup);
        const after = editorReducer(before, action);
        fc.pre(after.past !== before.past && after.future.length === 0);
        const undone = editorReducer(after, { type: 'undo' });
        expect(undone.word).toEqual(before.word);
        expect(undone.cursor).toBe(before.cursor);
      }),
    );
  });

  it('keeps the cursor in range, and undo then redo is a no-op when there is history', () => {
    fc.assert(
      fc.property(fc.array(anyAction, { maxLength: 25 }), (actions) => {
        const s = run(actions);
        expect(s.cursor).toBeGreaterThanOrEqual(0);
        expect(s.cursor).toBeLessThanOrEqual(s.word.length);
        fc.pre(s.past.length > 0);
        const roundTrip = run([{ type: 'undo' }, { type: 'redo' }], s);
        expect(roundTrip.word).toEqual(s.word);
      }),
    );
  });
});
