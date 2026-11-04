import styles from './TopBar.module.css';

interface TopBarProps {
  /** Opens the keyboard shortcuts dialog (FR-51). */
  readonly onHelp: () => void;
}

/**
 * The sticky top bar (SPEC §6): the title, then the controls on the right. M3
 * adds the inventory switch, filter and settings.
 */
export function TopBar({ onHelp }: TopBarProps) {
  return (
    <header className={styles['bar']}>
      <div className={styles['inner']}>
        <h1 className={styles['title']}>
          ipa<span className={styles['dash']}>-</span>helper
        </h1>
        <p className={styles['tagline']}>Click sounds, get IPA and TIPA.</p>
        <div className={styles['controls']}>
          <button
            type="button"
            className={styles['iconButton']}
            aria-keyshortcuts="?"
            onClick={onHelp}
          >
            <span aria-hidden="true">?</span>
            <span className="visuallyHidden">Keyboard shortcuts</span>
          </button>
        </div>
      </div>
    </header>
  );
}
