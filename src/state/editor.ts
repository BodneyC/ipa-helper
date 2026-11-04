import type { SymbolId } from '../domain/inventory/symbol-id';
import { assertNever } from '../domain/result';
import {
  clear,
  deleteBackward,
  deleteForward,
  insert,
  moveCursor,
  setCursor,
  withCursor,
} from '../domain/word/cursor';
import type { CursorWord } from '../domain/word/cursor';
import { EMPTY_WORD } from '../domain/word/word';
import type { Word } from '../domain/word/word';

/**
 * The word being edited, its cursor, and undo/redo history (ARCHITECTURE §5).
 * History holds `{ word, cursor }` snapshots, so undo puts the cursor back too.
 */
export interface EditorState extends CursorWord {
  readonly past: readonly CursorWord[];
  readonly future: readonly CursorWord[];
}

/** Everything that can happen to the editor. */
export type EditorAction =
  | { readonly type: 'insert'; readonly symbolId: SymbolId }
  | { readonly type: 'deleteBackward' }
  | { readonly type: 'deleteForward' }
  | { readonly type: 'moveCursor'; readonly delta: number }
  | { readonly type: 'setCursor'; readonly position: number }
  | { readonly type: 'clear' }
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  | { readonly type: 'replace'; readonly word: Word };

/** Undo steps kept. Older ones are dropped. */
export const HISTORY_LIMIT = 100;

/** A fresh editor, e.g. for a word decoded from the URL. The cursor goes at the end. */
export const initialEditorState = (word: Word = EMPTY_WORD): EditorState => ({
  ...withCursor(word),
  past: [],
  future: [],
});

const snapshot = ({ word, cursor }: CursorWord): CursorWord => ({ word, cursor });

/**
 * Applies a word edit (FR-14: every edit can be undone). An edit that changes
 * nothing returns `state` itself, which leaves no undo entry.
 */
const edit = (state: EditorState, next: CursorWord): EditorState =>
  next === state
    ? state
    : {
        ...snapshot(next),
        past: [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
        future: [],
      };

/** Moves the cursor. Cursor moves aren't edits, so they leave no undo entry. */
const move = (state: EditorState, next: CursorWord): EditorState =>
  next === state ? state : { ...state, cursor: next.cursor };

/** The pure editor reducer, for `useReducer` (ARCHITECTURE §5). */
export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'insert':
      return edit(state, insert(state, action.symbolId));
    case 'deleteBackward':
      return edit(state, deleteBackward(state));
    case 'deleteForward':
      return edit(state, deleteForward(state));
    case 'clear':
      return edit(state, clear(state));
    case 'replace':
      return edit(state, withCursor(action.word));
    case 'moveCursor':
      return move(state, moveCursor(state, action.delta));
    case 'setCursor':
      return move(state, setCursor(state, action.position));
    case 'undo': {
      const previous = state.past.at(-1);
      if (previous === undefined) return state;
      return {
        ...previous,
        past: state.past.slice(0, -1),
        future: [snapshot(state), ...state.future],
      };
    }
    case 'redo': {
      const [next, ...rest] = state.future;
      if (next === undefined) return state;
      return { ...next, past: [...state.past, snapshot(state)], future: rest };
    }
    default:
      return assertNever(action);
  }
};
