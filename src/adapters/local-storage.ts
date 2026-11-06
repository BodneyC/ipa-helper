import type { KeyValueStore } from '../domain/ports';

/** `window.localStorage`, or `null` where reading it throws (blocked storage). */
const browserStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Where `storage` events arrive: `window` in the browser. */
type StorageEvents = Pick<Window, 'addEventListener' | 'removeEventListener'>;

/**
 * The KeyValueStore port over Web Storage (FR-42). Private modes, blocked
 * storage and full quotas throw; those failures read as "nothing stored" and
 * writes are dropped, so the app works for the visit either way.
 *
 * `subscribe` listens for the `storage` event, which the browser fires in every
 * other tab of the same origin when one tab writes, so tabs can pick up each
 * other's saved words and settings (#2). A `clear()` (event key `null`) counts as
 * a change to every key.
 */
export const createLocalStore = (
  storage: Storage | null = browserStorage(),
  events: StorageEvents | null = window,
): KeyValueStore => ({
  get: (key) => {
    try {
      return storage?.getItem(key) ?? undefined;
    } catch {
      return undefined;
    }
  },
  set: (key, value) => {
    try {
      storage?.setItem(key, value);
    } catch {
      // Out of quota or blocked: keep the setting for this visit only.
    }
  },
  subscribe: (key, listener) => {
    if (storage === null || events === null) return () => undefined;
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== storage) return;
      if (event.key === key || event.key === null) listener();
    };
    events.addEventListener('storage', onStorage);
    return () => {
      events.removeEventListener('storage', onStorage);
    };
  },
});
