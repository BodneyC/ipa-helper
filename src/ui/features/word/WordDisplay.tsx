import { useId } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';

import styles from './WordDisplay.module.css';
import { symbolById } from '../../../domain/inventory';
import { labelsOf } from '../../../domain/serialise/labels';
import type { EditorAction } from '../../../state/editor';
import { useEditor, useSettings } from '../../../state/hooks';

/** Maps a key press to an editor action (FR-12–FR-14), or `undefined` to let it through. */
const actionFor = (event: KeyboardEvent, length: number): EditorAction | undefined => {
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (mod && key === 'z') return event.shiftKey ? { type: 'redo' } : { type: 'undo' };
  if (mod && key === 'y') return { type: 'redo' };
  if (mod || event.altKey) return undefined;
  switch (event.key) {
    case 'ArrowLeft':
      return { type: 'moveCursor', delta: -1 };
    case 'ArrowRight':
      return { type: 'moveCursor', delta: 1 };
    case 'Home':
      return { type: 'setCursor', position: 0 };
    case 'End':
      return { type: 'setCursor', position: length };
    case 'Backspace':
      return { type: 'deleteBackward' };
    case 'Delete':
      return { type: 'deleteForward' };
    default:
      return undefined;
  }
};

/**
 * FR-11–FR-14: the word between slashes, with a token cursor. Focus it to edit
 * with the keyboard; click a token to put the cursor on the nearer side of it.
 * Palette keys insert at the cursor.
 */
export function WordDisplay() {
  const { state, dispatch } = useEditor();
  const { settings } = useSettings();
  const hintId = useId();
  const { word, cursor } = state;

  const glyphs = word.map((token) => {
    const symbol = symbolById(token.symbolId);
    return symbol === undefined ? '?' : labelsOf(symbol, settings.rDisplay).ipa;
  });

  const onKeyDown = (event: KeyboardEvent) => {
    const action = actionFor(event, word.length);
    if (action === undefined) return;
    event.preventDefault();
    dispatch(action);
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const index = Number(target.closest<HTMLElement>('[data-index]')?.dataset['index']);
    if (Number.isNaN(index)) {
      dispatch({ type: 'setCursor', position: word.length });
      return;
    }
    const box = target.getBoundingClientRect();
    const after = event.clientX > box.left + box.width / 2;
    dispatch({ type: 'setCursor', position: after ? index + 1 : index });
  };

  const caret = <span key="caret" className={styles['caret']} aria-hidden="true" />;
  const content = word.flatMap((token, index) => {
    const glyph = (
      <span key={token.key} className={styles['token']} data-index={index}>
        {glyphs[index]}
      </span>
    );
    return index === cursor ? [caret, glyph] : [glyph];
  });
  if (cursor === word.length) content.push(caret);

  return (
    <div className={styles['wrap']}>
      <div
        role="textbox"
        tabIndex={0}
        aria-label="Word"
        aria-readonly="false"
        aria-describedby={hintId}
        className={styles['display']}
        onKeyDown={onKeyDown}
        onClick={onClick}
      >
        <span className={styles['slash']} aria-hidden="true">
          /
        </span>
        {word.length === 0 ? (
          <>
            {caret}
            <span className={styles['placeholder']}>…</span>
          </>
        ) : (
          content
        )}
        <span className={styles['slash']} aria-hidden="true">
          /
        </span>
      </div>
      <p id={hintId} className={styles['hint']}>
        Click symbols below to add them. ← → move, Backspace and Delete remove, Ctrl+Z undoes.
      </p>
    </div>
  );
}
