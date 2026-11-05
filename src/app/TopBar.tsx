import type { RefObject } from 'react';

import styles from './TopBar.module.css';
import { useSettings } from '../state/hooks';
import { TOOLTIP_CEILING } from '../ui/components/Tooltip';

interface TopBarProps {
  /** The palette filter text (FR-4). */
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  /** So that `/` can focus the filter (FR-51). */
  readonly filterRef: RefObject<HTMLInputElement | null>;
  /** Opens the keyboard shortcuts dialog (FR-51). */
  readonly onHelp: () => void;
  /** Opens the settings dialog (FR-42). */
  readonly onSettings: () => void;
}

/**
 * The sticky top bar (SPEC §6): the title, then the inventory switch (FR-3),
 * the filter (FR-4), the shortcuts button and settings (FR-42). On a phone the
 * shortcuts button gives way; the settings dialog links to the shortcuts too.
 */
export function TopBar({ query, onQueryChange, filterRef, onHelp, onSettings }: TopBarProps) {
  const { settings, dispatch } = useSettings();
  return (
    <header className={styles['bar']} {...{ [TOOLTIP_CEILING]: '' }}>
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
              <option value="extended">Full IPA</option>
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
            className={`${styles['iconButton'] ?? ''} ${styles['help'] ?? ''}`}
            aria-keyshortcuts="?"
            onClick={onHelp}
          >
            <span aria-hidden="true">?</span>
            <span className="visuallyHidden">Keyboard shortcuts</span>
          </button>
          <button type="button" className={styles['iconButton']} onClick={onSettings}>
            <svg
              className={styles['icon']}
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
              <circle cx="16" cy="6" r="2" />
              <circle cx="10" cy="12" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
            <span className="visuallyHidden">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
