import type { KeyValueStore } from '../domain/ports';

/** `window.localStorage`, or `null` where reading it throws (blocked storage). */
const browserStorage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * The KeyValueStore port over Web Storage (FR-42). Private modes, blocked
 * storage and full quotas throw; those failures read as "nothing stored" and
 * writes are dropped, so the app works for the visit either way.
 */
export const createLocalStore = (storage: Storage | null = browserStorage()): KeyValueStore => ({
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
});
