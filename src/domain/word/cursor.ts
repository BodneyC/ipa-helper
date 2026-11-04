import { EMPTY_WORD, freshKey } from './word';
import type { Word } from './word';
import type { SymbolId } from '../inventory/symbol-id';

/**
 * A word plus a token cursor (FR-12). The cursor is a gap index: `0` is before
 * the first token and `word.length` is after the last.
 *
 * Every operation is pure. One that changes nothing returns its input object
 * unchanged, so callers can use `===` to skip undo entries for no-op edits.
 */
export interface CursorWord {
  readonly word: Word;
  readonly cursor: number;
}

/** An empty word with the cursor at 0. */
export const EMPTY: CursorWord = { word: EMPTY_WORD, cursor: 0 };

const clamp = (word: Word, position: number): number =>
  Math.min(Math.max(Math.trunc(position), 0), word.length);

/** Puts `word` under a cursor, by default at the end (where typing continues). */
export const withCursor = (word: Word, cursor: number = word.length): CursorWord => ({
  word,
  cursor: clamp(word, cursor),
});

/** FR-10: inserts a token for `symbolId` at the cursor and moves the cursor past it. */
export const insert = ({ word, cursor }: CursorWord, symbolId: SymbolId): CursorWord => ({
  word: [...word.slice(0, cursor), { key: freshKey(word), symbolId }, ...word.slice(cursor)],
  cursor: cursor + 1,
});

/** FR-13: Backspace deletes the token before the cursor. */
export const deleteBackward = (state: CursorWord): CursorWord => {
  const { word, cursor } = state;
  if (cursor === 0) return state;
  return { word: word.toSpliced(cursor - 1, 1), cursor: cursor - 1 };
};

/** FR-13: Delete deletes the token after the cursor. */
export const deleteForward = (state: CursorWord): CursorWord => {
  const { word, cursor } = state;
  if (cursor === word.length) return state;
  return { word: word.toSpliced(cursor, 1), cursor };
};

/** FR-12: moves the cursor by `delta` gaps (← is −1, → is +1), stopping at the ends. */
export const moveCursor = (state: CursorWord, delta: number): CursorWord =>
  setCursor(state, state.cursor + delta);

/** FR-12: puts the cursor at `position` (e.g. a click between tokens), clamped to the word. */
export const setCursor = (state: CursorWord, position: number): CursorWord => {
  const cursor = clamp(state.word, position);
  return cursor === state.cursor ? state : { word: state.word, cursor };
};

/** FR-13: Clear empties the word. */
export const clear = (state: CursorWord): CursorWord =>
  state.word.length === 0 && state.cursor === 0 ? state : EMPTY;
