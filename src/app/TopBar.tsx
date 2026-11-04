import styles from './TopBar.module.css';

/**
 * The sticky top bar (SPEC §6). M3 adds the inventory switch, filter, theme and
 * settings controls on the right.
 */
export function TopBar() {
  return (
    <header className={styles['bar']}>
      <div className={styles['inner']}>
        <h1 className={styles['title']}>
          ipa<span className={styles['dash']}>-</span>helper
        </h1>
        <p className={styles['tagline']}>Click sounds, get IPA and TIPA.</p>
      </div>
    </header>
  );
}
