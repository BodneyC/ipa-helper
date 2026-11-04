import styles from './WordActions.module.css';
import { useEditor } from '../../../state/hooks';

/** FR-13, FR-14: Undo, Redo and Clear for the word. Clear can itself be undone. */
export function WordActions() {
  const { state, dispatch } = useEditor();
  return (
    <div className={styles['actions']} role="group" aria-label="Word actions">
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
    </div>
  );
}
