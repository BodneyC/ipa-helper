import styles from './WordActions.module.css';
import { useEditor } from '../../../state/hooks';
import { PlayWordButton } from '../audio/PlayWordButton';

interface WordActionsProps {
  /** Opens the saved words dialog (FR-16). */
  readonly onSaved: () => void;
}

/**
 * FR-31: Play word (when word audio is available). FR-13, FR-14, FR-16: Undo,
 * Redo and Clear for the word (Clear can itself be undone), and the way into
 * saved words.
 */
export function WordActions({ onSaved }: WordActionsProps) {
  const { state, dispatch } = useEditor();
  return (
    <div className={styles['actions']} role="group" aria-label="Word actions">
      <PlayWordButton />
      <button
        type="button"
        className={styles['button']}
        disabled={state.past.length === 0}
        onClick={() => {
          dispatch({ type: 'undo' });
        }}
      >
        Undo
      </button>
      <button
        type="button"
        className={styles['button']}
        disabled={state.future.length === 0}
        onClick={() => {
          dispatch({ type: 'redo' });
        }}
      >
        Redo
      </button>
      <button
        type="button"
        className={`${styles['button'] ?? ''} ${styles['danger'] ?? ''}`}
        disabled={state.word.length === 0}
        onClick={() => {
          dispatch({ type: 'clear' });
        }}
      >
        Clear
      </button>
      <button type="button" className={styles['button']} onClick={onSaved}>
        Saved words…
      </button>
    </div>
  );
}
