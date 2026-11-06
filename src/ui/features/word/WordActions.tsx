import styles from './WordActions.module.css';
import { useEditor } from '../../../state/hooks';
import { PlayWordButton } from '../audio/PlayWordButton';

interface WordActionsProps {
  /** Opens the saved words dialog (FR-16). */
  readonly onSaved: () => void;
  /** Opens the paste IPA dialog (FR-17). */
  readonly onPaste: () => void;
  /**
   * Which buttons to show (SPEC §6): `all` in one group (the default), or the
   * small-screen split into the sticky `primary` ones (Play word, Undo, Redo)
   * and the `secondary` ones (Clear, Saved words, Paste IPA).
   */
  readonly part?: 'all' | 'primary' | 'secondary';
}

const GROUP_NAMES = {
  all: 'Word actions',
  primary: 'Word actions',
  secondary: 'More word actions',
} as const;

/**
 * FR-31: Play word (when word audio is available). FR-13, FR-14, FR-16: Undo,
 * Redo and Clear for the word (Clear can itself be undone), and the way into
 * saved words. FR-17: the way into pasting IPA.
 */
export function WordActions({ onSaved, onPaste, part = 'all' }: WordActionsProps) {
  const { state, dispatch } = useEditor();
  const primary = part !== 'secondary';
  const secondary = part !== 'primary';
  return (
    <div className={styles['actions']} role="group" aria-label={GROUP_NAMES[part]}>
      {primary && (
        <>
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
        </>
      )}
      {secondary && (
        <>
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
          <button type="button" className={styles['button']} onClick={onPaste}>
            Paste IPA…
          </button>
        </>
      )}
    </div>
  );
}
