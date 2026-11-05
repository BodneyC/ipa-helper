import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import styles from './UpdateNotice.module.css';
import { useServices } from '../../../state/hooks';
import { useAnnounce } from '../../components/Announcer';

const MESSAGE = 'A new version of ipa-helper is ready';

/**
 * Offers a newly deployed version (FR-62). It never takes focus: it appears at
 * the foot of the page, is announced politely, and comes after everything else
 * in tab order. **Later** hides it for this visit.
 */
export function UpdateNotice() {
  const { updates } = useServices();
  const announce = useAnnounce();
  const subscribe = useCallback((listener: () => void) => updates.subscribe(listener), [updates]);
  const available = useSyncExternalStore(subscribe, () => updates.available());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (available) announce(MESSAGE);
  }, [available, announce]);

  if (!available || dismissed) return null;
  return (
    <section className={styles['notice']} aria-label="Update">
      <p className={styles['text']}>{MESSAGE}.</p>
      <div className={styles['actions']}>
        <button
          type="button"
          className={styles['button']}
          onClick={() => {
            updates.apply();
          }}
        >
          Reload
        </button>
        <button
          type="button"
          className={styles['button']}
          onClick={() => {
            setDismissed(true);
          }}
        >
          Later
        </button>
      </div>
    </section>
  );
}
