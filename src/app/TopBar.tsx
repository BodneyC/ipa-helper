import type { RefObject } from 'react';

import styles from './TopBar.module.css';
import { useSettings } from '../state/hooks';

interface TopBarProps {
  /** The palette filter text (FR-4). */
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  /** So that `/` can focus the filter (FR-51). */
  readonly filterRef: RefObject<HTMLInputElement | null>;
  /** Opens the keyboard shortcuts dialog (FR-51). */
  readonly onHelp: () => void;
}

/**
 * The sticky top bar (SPEC §6): the title, then the inventory switch (FR-3),
 * the filter (FR-4) and the shortcuts button.
 */
export function TopBar({ query, onQueryChange, filterRef, onHelp }: TopBarProps) {
  const { settings, dispatch } = useSettings();
  return (
    <header className={styles['bar']}>
      <div className={styles['inner']}>
        <h1 className={styles['title']}>
          ipa<span className={styles['dash']}>-</span>helper
        </h1>
        <p className={styles['tagline']}>Click sounds, get IPA and TIPA.</p>
        <div className={styles['controls']}>
          <label className={styles['field']}>
            <span className="visuallyHidden">Inventory</span>
            <select
              className={styles['select']}
              value={settings.inventory}
              onChange={(event) => {
                const inventory = event.target.value;
                if (inventory === 'rp' || inventory === 'extended') {
                  dispatch({ type: 'update', patch: { inventory } });
                }
              }}
            >
              <option value="rp">RP</option>
              {/* FR-3: the Full inventory is populated in M6. */}
              <option value="extended" disabled>
                Full IPA (coming soon)
              </option>
            </select>
          </label>
          <label className={styles['field']}>
            <span className="visuallyHidden">Filter symbols</span>
            <input
              ref={filterRef}
              className={styles['filter']}
              type="search"
              placeholder="Filter  /"
              aria-keyshortcuts="/"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => {
                onQueryChange(event.target.value);
              }}
            />
          </label>
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
